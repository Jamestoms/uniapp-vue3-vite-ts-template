/**
 * AI 小昭模块接口定义
 *
 * 会话/历史等常规接口待后端契约确定后补充（走 http 封装）；
 * 流式问答由 utils/ai-stream.ts 实现（一次性 Promise 模型不适合流式），
 * 本文件只提供类型契约与 URL 常量。
 */

/** 聊天消息角色 */
export type AiChatRole = "user" | "ai";

/** 单条聊天消息 */
export interface AiMessage {
  id: number;
  role: AiChatRole;
  content: string;
  /** 是否正在流式生成中（控制光标/停止按钮） */
  streaming?: boolean;
}

/** 流式问答请求参数（sessionId 为空表示新会话，由后端创建） */
export interface StreamChatPayload {
  sessionId?: string;
  content: string;
}

/** SSE 增量帧结构：data: {"delta":"文本增量"} */
export interface ChatChunk {
  delta: string;
}

/** 流式问答接口（响应 text/event-stream） */
export const AI_STREAM_URL = "/ai/chat/stream";

/**
 * AI 模块 mock 开关（编译期常量）
 *
 * 后端未接入期间置 true：utils/ai-stream.ts 会在字节层模拟流式响应
 * （含中文多字节截断场景），走与真实请求完全相同的解码管线，便于提前验证；
 * 接入真实后端后改为 false 即可，页面代码无需改动。
 */
export const AI_USE_MOCK = true;

/** mock 语料：关键词匹配 */
interface MockRule {
  keywords: string[];
  answer: string;
}

const MOCK_RULES: MockRule[] = [
  {
    keywords: ["你好", "您好", "hi", "hello", "嗨"],
    answer:
      "你好呀，我是 AI 小昭～很高兴见到你！\n\n我可以陪你聊天、答疑解惑。随着平台的酒店住宿、赛事预约、餐饮、租赁、商城等服务陆续上线，我还能帮你查信息、给建议。现在有什么想聊的吗？",
  },
  {
    keywords: ["酒店", "住宿", "房间"],
    answer:
      "酒店住宿服务正在筹备中，预计不久后就会和大家见面。\n\n届时我可以帮你：\n1. 按目的地、日期、价位筛选酒店；\n2. 对比不同房型的设施与价格；\n3. 解答入住政策、发票开具等问题。\n\n在这之前，有任何其他疑问我都在哦～",
  },
  {
    keywords: ["赛事", "比赛", "预约", "场馆"],
    answer:
      "赛事预约功能正在建设中！上线后你可以在这里：\n\n· 浏览附近的场馆与正在报名的赛事；\n· 查看赛程、组别与报名费用；\n· 一键报名并收到开赛提醒。\n\n想先了解哪类运动呢？跑步、羽毛球还是游泳？",
  },
  {
    keywords: ["餐饮", "美食", "吃", "外卖"],
    answer:
      "民以食为天～餐饮服务正在筹备中。\n\n上线后支持：门店点餐、排队叫号、优惠套餐推荐。你可以说「我想吃辣的」或「附近有什么火锅」，我来帮你找。\n\n现在我也可以陪你聊聊各地美食，想聊哪座城市？",
  },
  {
    keywords: ["租赁", "租"],
    answer:
      "租赁服务正在建设中，规划支持设备租赁、场地租借等场景。\n\n上线后可以按时间（小时/天/月）灵活下单，信用好的用户还能免押金。\n\n如果你有具体想租的物品，可以先告诉我，我记下来啦～",
  },
  {
    keywords: ["商城", "购物", "买", "商品"],
    answer:
      "商城正在装修中，很快开业！\n\n届时首页的「热门推荐」会接入真实商品，支持搜索、领券、下单、查询订单全流程。\n\n现在首页的宫格和商品只是框架演示数据，不要太当真哦。",
  },
  {
    keywords: ["你是谁", "介绍", "你能做什么", "帮助", "help"],
    answer:
      "我是 AI 小昭，本小程序的智能助手。\n\n我能做的：\n1. 日常问答与闲聊；\n2. 平台各业务（酒店/赛事/餐饮/租赁/商城）的咨询与引导；\n3. 后续会接入更多业务数据，提供更专业的建议。\n\n注意：我的回答由 AI 生成，仅供参考。",
  },
];

/** mock 默认回答（未命中关键词时） */
const MOCK_DEFAULT_ANSWER =
  "收到你的消息啦！我正在学习中，暂时还不能给出特别准确的回答。\n\n目前平台的基础功能（登录、个人资料）已经就绪，酒店住宿、赛事预约、餐饮、租赁、商城等业务正在规划开发中。\n\n你可以问我「你能做什么」了解我的能力，或者随便聊聊天也可以～";

/** 按用户输入挑选 mock 回答（关键词优先，默认兜底） */
export function pickMockAnswer(content: string): string {
  const text = content.toLowerCase();
  for (const rule of MOCK_RULES) {
    if (rule.keywords.some((keyword) => text.includes(keyword.toLowerCase()))) {
      return rule.answer;
    }
  }
  return MOCK_DEFAULT_ANSWER;
}
