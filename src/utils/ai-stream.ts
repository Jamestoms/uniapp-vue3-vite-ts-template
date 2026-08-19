/**
 * AI 流式请求工具
 *
 * 基于 uni.request 的 enableChunked + RequestTask.onChunkReceived 实现 SSE 流式接收，
 * 内置 UTF-8 编解码（中文 3 字节可能被 chunk 切断）与 SSE 分帧缓冲：
 * 优先使用运行时原生 TextEncoder/TextDecoder（较新基础库提供，stream 模式自动处理跨 chunk 截断），
 * 不支持时回退手写状态机实现（旧基础库真机）。
 *
 * mock 模式（api/ai.ts 的 AI_USE_MOCK）：在字节层模拟后端流式响应——
 * 把语料编码为 UTF-8 SSE 帧后按随机字节块切开（故意制造多字节截断），
 * 喂给与真实请求完全相同的解码管线，测试覆盖真实代码路径。
 *
 * 用法（回调风格拿 task 句柄，勿用 await Promise 写法）：
 *   const handle = streamChat({ content }, {
 *     onDelta(text) { ... },
 *     onDone() { ... },
 *     onError(err) { ... },
 *   });
 *   handle.abort(); // 停止生成：保留已接收内容，触发 onDone 而非 onError
 */
import { AI_STREAM_URL, AI_USE_MOCK, pickMockAnswer } from "@/api/ai";
import type { StreamChatPayload } from "@/api/ai";
import { envConfig } from "@/config";
import { useUserStore } from "@/stores/user";

/** 流式回调集合 */
export interface StreamChatHandlers {
  /** 收到一段文本增量（页面层自行做渲染节流） */
  onDelta(text: string): void;
  /** 流结束（正常结束 / 收到 [DONE] / 用户主动停止） */
  onDone(): void;
  /** 流异常（网络错误、超时等） */
  onError(err: Error): void;
}

/** 流式请求句柄 */
export interface StreamChatHandle {
  /** 停止生成 */
  abort(): void;
}

/** SSE 结束帧标记 */
const SSE_DONE = "[DONE]";

/* -------------------------------------------------------------------------- */
/* 运行时能力探测：原生 TextEncoder/TextDecoder 优先，缺失时回退手写实现          */
/* -------------------------------------------------------------------------- */

/** 较新微信基础库（及开发者工具）提供原生 TextDecoder；旧基础库真机可能缺失 */
const hasTextDecoder = typeof TextDecoder !== "undefined";
if (!hasTextDecoder) {
  console.log("TextDecoder 未定义，将使用手写实现");
} else {
  console.log("TextDecoder 存在，将使用原生实现");
}
/** 同上，TextEncoder 一般随 TextDecoder 一并提供 */
const hasTextEncoder = typeof TextEncoder !== "undefined";

/* -------------------------------------------------------------------------- */
/* UTF-8 解码器（原生 TextDecoder 优先，手写状态机回退）                         */
/* -------------------------------------------------------------------------- */

/** 码点转字符串（>0xFFFF 的 4 字节字符需转 UTF-16 代理对，如 emoji） */
function codePointToString(cp: number): string {
  if (cp <= 0xffff) {
    return String.fromCharCode(cp);
  }
  cp -= 0x10000;
  const high = 0xd800 + (cp >> 10);
  const low = 0xdc00 + (cp & 0x3ff);
  return String.fromCharCode(high, low);
}

/**
 * 带跨 chunk 缓冲的 UTF-8 解码器
 *
 * push() 每次喂入一个 chunk 的字节（ArrayBuffer 或 Uint8Array），
 * 返回本 chunk 中能完整解码出的文本；尾部不完整的多字节序列缓存到下个 chunk。
 */
function createUtf8Decoder() {
  if (hasTextDecoder) {
    // 原生 TextDecoder：stream 模式自动缓存不完整的多字节序列，天然处理中文跨 chunk 截断
    const nativeDecoder = new TextDecoder("utf-8");
    return {
      push(data: ArrayBuffer | Uint8Array): string {
        const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
        return nativeDecoder.decode(bytes, { stream: true });
      },
    };
  }

  /** 上个 chunk 遗留的不完整字节序列 */
  let pending: number[] = [];

  return {
    push(data: ArrayBuffer | Uint8Array): string {
      const incoming = data instanceof Uint8Array ? Array.from(data) : Array.from(new Uint8Array(data));
      const bytes = pending.concat(incoming);
      pending = [];

      let result = "";
      let i = 0;
      while (i < bytes.length) {
        const b0 = bytes[i];
        let length: number;
        let cp: number;
        if (b0 < 0x80) {
          length = 1;
          cp = b0;
        } else if ((b0 & 0xe0) === 0xc0) {
          length = 2;
          cp = b0 & 0x1f;
        } else if ((b0 & 0xf0) === 0xe0) {
          length = 3;
          cp = b0 & 0x0f;
        } else if ((b0 & 0xf8) === 0xf0) {
          length = 4;
          cp = b0 & 0x07;
        } else {
          // 非法首字节，跳过（容错，避免死循环）
          i += 1;
          continue;
        }

        if (i + length > bytes.length) {
          // 序列不完整：缓存等待下个 chunk（中文截断场景的关键处理）
          pending = bytes.slice(i);
          break;
        }

        let valid = true;
        for (let j = 1; j < length; j += 1) {
          const bj = bytes[i + j];
          if ((bj & 0xc0) !== 0x80) {
            valid = false;
            break;
          }
          cp = (cp << 6) | (bj & 0x3f);
        }
        if (!valid) {
          // 后续字节非法：丢弃首字节继续
          i += 1;
          continue;
        }

        result += codePointToString(cp);
        i += length;
      }
      return result;
    },
  };
}

/* -------------------------------------------------------------------------- */
/* SSE 分帧解析器（data: 帧可能跨 chunk，需缓冲拼接）                            */
/* -------------------------------------------------------------------------- */

function createSseParser() {
  /** 跨 chunk 的帧缓冲 */
  let buffer = "";
  let done = false;

  return {
    get done() {
      return done;
    },
    /** 喂入本 chunk 解码出的文本，返回其中的 delta 增量列表 */
    push(text: string): string[] {
      buffer += text;
      const deltas: string[] = [];

      let separatorIndex = buffer.indexOf("\n\n");
      while (separatorIndex !== -1) {
        const frame = buffer.slice(0, separatorIndex);
        buffer = buffer.slice(separatorIndex + 2);

        for (const line of frame.split("\n")) {
          if (!line.startsWith("data:")) {
            continue;
          }
          const data = line.slice(5).trim();
          if (data === SSE_DONE) {
            done = true;
            continue;
          }
          try {
            const chunk = JSON.parse(data) as { delta?: string };
            if (typeof chunk.delta === "string") {
              deltas.push(chunk.delta);
            }
          } catch {
            // 非 JSON 帧忽略（如后端的注释行/心跳帧）
          }
        }

        separatorIndex = buffer.indexOf("\n\n");
      }
      return deltas;
    },
  };
}

/* -------------------------------------------------------------------------- */
/* mock 流（字节层模拟：走真实解码管线，故意制造多字节截断）                      */
/* -------------------------------------------------------------------------- */

/** 字符串转 UTF-8 字节数组（原生 TextEncoder 优先，手写回退） */
function encodeUtf8(text: string): Uint8Array {
  if (hasTextEncoder) {
    return new TextEncoder().encode(text);
  }

  const bytes: number[] = [];
  for (let i = 0; i < text.length; i += 1) {
    const code = text.codePointAt(i)!;
    if (code <= 0x7f) {
      bytes.push(code);
    } else if (code <= 0x7ff) {
      bytes.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f));
    } else if (code <= 0xffff) {
      bytes.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f));
    } else {
      bytes.push(
        0xf0 | (code >> 18),
        0x80 | ((code >> 12) & 0x3f),
        0x80 | ((code >> 6) & 0x3f),
        0x80 | (code & 0x3f),
      );
      // 代理对占两个 char 位，codePointAt 已消费完整码点，跳过低位代理
      i += 1;
    }
  }
  return new Uint8Array(bytes);
}

/** 把完整回答组装成 SSE 帧文本（delta 粒度切分模拟逐段生成） */
function buildSseText(answer: string): string {
  const frames: string[] = [];
  // 按标点优先切分（段落感），每段再按 2~5 字切成增量
  const segments = answer.split(/(\n)/);
  for (const segment of segments) {
    let rest = segment;
    while (rest.length > 0) {
      const size = Math.min(rest.length, 2 + Math.floor(Math.random() * 4));
      frames.push(`data: ${JSON.stringify({ delta: rest.slice(0, size) })}\n\n`);
      rest = rest.slice(size);
    }
  }
  frames.push(`data: ${SSE_DONE}\n\n`);
  return frames.join("");
}

function createMockStream(payload: StreamChatPayload, handlers: StreamChatHandlers): StreamChatHandle {
  const sseBytes = encodeUtf8(buildSseText(pickMockAnswer(payload.content)));

  // 按随机 1~7 字节切块：中文 3 字节序列必然出现跨块截断，用于检验解码器
  const chunks: ArrayBuffer[] = [];
  for (let i = 0; i < sseBytes.length; ) {
    const size = Math.min(1 + Math.floor(Math.random() * 7), sseBytes.length - i);
    chunks.push(sseBytes.slice(i, i + size).buffer);
    i += size;
  }

  const decoder = createUtf8Decoder();
  const parser = createSseParser();
  let finished = false;
  let aborted = false;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let cursor = 0;

  const finish = () => {
    if (finished) {
      return;
    }
    finished = true;
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
    handlers.onDone();
  };

  const feedNext = () => {
    if (finished || aborted) {
      return;
    }
    const text = decoder.push(chunks[cursor]);
    for (const delta of parser.push(text)) {
      handlers.onDelta(delta);
    }
    if (parser.done) {
      finish();
      return;
    }
    cursor += 1;
    if (cursor >= chunks.length) {
      finish();
      return;
    }
    // 30~90ms 的到达间隔模拟真实网络节奏
    timer = setTimeout(feedNext, 30 + Math.random() * 60);
  };

  // 首帧延迟模拟模型首字延迟
  timer = setTimeout(feedNext, 300);

  return {
    abort() {
      aborted = true;
      // 用户主动停止：保留已接收内容，按正常结束处理
      finish();
    },
  };
}

/* -------------------------------------------------------------------------- */
/* 真实流（uni.request enableChunked，需微信基础库 ≥ 2.20.1）                    */
/* -------------------------------------------------------------------------- */

function createRealStream(payload: StreamChatPayload, handlers: StreamChatHandlers): StreamChatHandle {
  const decoder = createUtf8Decoder();
  const parser = createSseParser();
  let finished = false;
  let aborted = false;

  const finish = () => {
    if (finished) {
      return;
    }
    finished = true;
    handlers.onDone();
  };

  const task = uni.request({
    url: `${envConfig.baseUrl}${AI_STREAM_URL}`,
    method: "POST",
    // 开启分块传输（SSE 流式关键参数）
    enableChunked: true,
    // timeout 是整个请求的总时长：长回答生成可能超默认 60s，显式调大
    timeout: 120000,
    header: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${useUserStore().token}`,
    },
    data: payload as unknown as string | Record<string, unknown>,
    success: () => {
      // 整个响应结束（[DONE] 未触发时的兜底结束信号）
      finish();
    },
    fail: (err) => {
      if (finished) {
        return;
      }
      if (aborted || err.errMsg?.includes("abort")) {
        // 用户主动停止：保留已接收内容，按正常结束处理
        finish();
        return;
      }
      finished = true;
      handlers.onError(new Error(err.errMsg || "网络异常，请稍后重试"));
    },
  });

  task.onChunkReceived((res) => {
    if (finished) {
      return;
    }
    const text = decoder.push(res.data);
    for (const delta of parser.push(text)) {
      handlers.onDelta(delta);
    }
    if (parser.done) {
      finish();
    }
  });

  return {
    abort() {
      aborted = true;
      task.abort();
    },
  };
}

/* -------------------------------------------------------------------------- */
/* 对外入口                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * 发起流式问答
 *
 * @param payload 问答参数（sessionId 为空表示新会话）
 * @param handlers 流式回调
 * @returns 句柄（abort 停止生成）
 */
export function streamChat(payload: StreamChatPayload, handlers: StreamChatHandlers): StreamChatHandle {
  if (AI_USE_MOCK) {
    return createMockStream(payload, handlers);
  }
  return createRealStream(payload, handlers);
}
