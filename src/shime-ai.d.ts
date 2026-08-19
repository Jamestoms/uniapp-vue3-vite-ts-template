/**
 * uni.request RequestTask 类型补充
 *
 * @dcloudio/types 的 RequestTask 接口只声明了 abort()/onHeadersReceived()，
 * 缺少 onChunkReceived()（运行时存在，需微信基础库 ≥ 2.20.1 且开启 enableChunked）。
 * 通过声明合并补充，供 utils/ai-stream.ts 流式响应使用。
 */
declare global {
  namespace UniNamespace {
    interface RequestTask {
      /** 监听 Transfer-Encoding Chunk Response 响应块接收事件 */
      onChunkReceived(callback: (result: { data: ArrayBuffer }) => void): void
    }
  }
}

export {}
