import { ref, type Ref } from 'vue'
import wsManager from '@/utils/ws-manager'
import type { WsOptions, WsState } from '@/utils/uni-websocket'

/** 连接状态响应式数据 */
export interface UseWebSocketReturn {
  /** 是否已连接 */
  isConnected: Ref<boolean>
  /** 是否正在重连 */
  isReconnecting: Ref<boolean>
  /** 当前重连次数 */
  reconnectAttempts: Ref<number>
  /** 连接状态快照 */
  state: Ref<WsState | null>
  /** 最近收到的消息 */
  lastMessage: Ref<string | ArrayBuffer | null>
  /** 发送消息 */
  send: (data: string | Record<string, unknown>) => void
  /** 手动重连 */
  reconnect: () => void
  /** 关闭连接并移除 */
  close: () => void
}

/**
 * Vue3 组合式函数：在组件中使用 WebSocket
 * @param name - 连接名称（唯一标识）
 * @param options - WebSocket 配置项
 */
export function useWebSocket(name: string, options: WsOptions): UseWebSocketReturn {
  const isConnected = ref(false)
  const isReconnecting = ref(false)
  const reconnectAttempts = ref(0)
  const state = ref<WsState | null>(null)
  const lastMessage = ref<string | ArrayBuffer | null>(null)

  // 包装原始回调，同时更新响应式状态
  const originalOnOpen = options.onOpen
  const originalOnMessage = options.onMessage
  const originalOnClose = options.onClose
  const originalOnError = options.onError
  const originalOnReconnect = options.onReconnect

  const wrappedOptions: WsOptions = {
    ...options,
    onOpen: () => {
      isConnected.value = true
      isReconnecting.value = false
      reconnectAttempts.value = 0
      _updateState()
      originalOnOpen?.()
    },
    onMessage: (data: string | ArrayBuffer) => {
      lastMessage.value = data
      originalOnMessage?.(data)
    },
    onClose: (res: UniApp.OnSocketCloseOptions) => {
      isConnected.value = false
      _updateState()
      originalOnClose?.(res)
    },
    onError: (err: UniApp.GeneralCallbackResult) => {
      isConnected.value = false
      _updateState()
      originalOnError?.(err)
    },
    onReconnect: (info) => {
      isReconnecting.value = info.status === 'reconnecting'
      reconnectAttempts.value = info.attempts
      _updateState()
      originalOnReconnect?.(info)
    },
  }

  // 创建或获取连接实例
  let ws = wsManager.get(name)
  if (!ws) {
    ws = wsManager.create(name, wrappedOptions)
    ws.connect()
  }

  /** 更新状态快照 */
  function _updateState(): void {
    state.value = wsManager.getState(name)
  }

  /** 发送消息 */
  function send(data: string | Record<string, unknown>): void {
    wsManager.send(name, data)
  }

  /** 手动重连 */
  function reconnect(): void {
    const instance = wsManager.get(name)
    if (instance) {
      instance.reconnect()
    }
  }

  /** 关闭连接并移除 */
  function close(): void {
    wsManager.remove(name)
    isConnected.value = false
    isReconnecting.value = false
    reconnectAttempts.value = 0
    state.value = null
  }

  // 初始状态
  _updateState()

  return {
    isConnected,
    isReconnecting,
    reconnectAttempts,
    state,
    lastMessage,
    send,
    reconnect,
    close,
  }
}


// vue 文件内使用示例

// <template>
//   <view class="container">
//     <!-- 连接状态指示器 -->
//     <view class="status-bar" :class="statusClass">
//       <text class="status-dot">●</text>
//       <text class="status-text">{{ statusText }}</text>
//       <text v-if="isReconnecting" class="reconnect-tip">
//         第 {{ reconnectAttempts }} 次重连中...
//       </text>
//     </view>

//     <!-- 消息列表 -->
//     <scroll-view class="message-list" scroll-y :scroll-top="scrollTop">
//       <view
//         v-for="(msg, index) in messages"
//         :key="index"
//         class="message-item"
//         :class="{ 'is-self': msg.isSelf }"
//       >
//         <text class="message-content">{{ msg.content }}</text>
//         <text class="message-time">{{ msg.time }}</text>
//       </view>
//     </scroll-view>

//     <!-- 输入区域 -->
//     <view class="input-bar">
//       <input
//         class="input-field"
//         v-model="inputText"
//         placeholder="输入消息..."
//         confirm-type="send"
//         @confirm="handleSend"
//       />
//       <button class="send-btn" :disabled="!isConnected" @click="handleSend">
//         发送
//       </button>
//     </view>
//   </view>
// </template>

// <script setup lang="ts">
// import { ref, computed, onUnmounted } from 'vue'
// import { useWebSocket } from '@/composables/useWebSocket'

// /** 消息类型 */
// interface ChatMessage {
//   content: string
//   time: string
//   isSelf: boolean
// }

// // ==================== 响应式数据 ====================
// const inputText = ref('')
// const messages = ref<ChatMessage[]>([])
// const scrollTop = ref(0)

// // ==================== WebSocket 连接 ====================
// const {
//   isConnected,
//   isReconnecting,
//   reconnectAttempts,
//   state,
//   lastMessage,
//   send,
//   close,
// } = useWebSocket('chat', {
//   url: 'wss://your-server.com/ws/chat',
//   header: {
//     Authorization: 'Bearer YOUR_TOKEN',
//   },
//   heartbeatInterval: 30000,
//   heartbeatTimeout: 5000,
//   heartbeatMessage: 'ping',
//   heartbeatResponse: 'pong',
//   maxReconnectAttempts: 10,
//   reconnectBaseDelay: 1000,
//   reconnectMaxDelay: 30000,
//   idleTimeout: 10 * 60 * 1000, // 10分钟无活动自动清理
//   onMessage: (data) => {
//     handleServerMessage(data)
//   },
// })

// // ==================== 计算属性 ====================
// const statusClass = computed(() => {
//   if (isReconnecting.value) return 'status-reconnecting'
//   return isConnected.value ? 'status-connected' : 'status-disconnected'
// })

// const statusText = computed(() => {
//   if (isReconnecting.value) return `重连中 (${reconnectAttempts.value})`
//   return isConnected.value ? '已连接' : '未连接'
// })

// // ==================== 方法 ====================

// /** 处理服务端推送的消息 */
// function handleServerMessage(data: string | ArrayBuffer): void {
//   if (typeof data !== 'string') return

//   try {
//     const parsed = JSON.parse(data)

//     // 过滤心跳响应
//     if (data === 'pong') return

//     // 根据业务协议处理消息
//     const chatMsg: ChatMessage = {
//       content: parsed.content || parsed.text || data,
//       time: formatTime(new Date()),
//       isSelf: false,
//     }

//     messages.value.push(chatMsg)
//     scrollToBottom()
//   } catch (e) {
//     // 非 JSON 消息，直接展示
//     messages.value.push({
//       content: data,
//       time: formatTime(new Date()),
//       isSelf: false,
//     })
//     scrollToBottom()
//   }
// }

// /** 发送消息 */
// function handleSend(): void {
//   const text = inputText.value.trim()
//   if (!text || !isConnected.value) return

//   // 发送消息到服务端
//   send({
//     type: 'message',
//     content: text,
//     timestamp: Date.now(),
//   })

//   // 添加到本地消息列表
//   messages.value.push({
//     content: text,
//     time: formatTime(new Date()),
//     isSelf: true,
//   })

//   inputText.value = ''
//   scrollToBottom()
// }

// /** 滚动到底部 */
// function scrollToBottom(): void {
//   setTimeout(() => {
//     scrollTop.value = messages.value.length * 100
//   }, 50)
// }

// /** 格式化时间 */
// function formatTime(date: Date): string {
//   const h = date.getHours().toString().padStart(2, '0')
//   const m = date.getMinutes().toString().padStart(2, '0')
//   return `${h}:${m}`
// }

// // ==================== 生命周期 ====================
// onUnmounted(() => {
//   // 页面销毁时关闭连接
//   close()
// })
// </script>
