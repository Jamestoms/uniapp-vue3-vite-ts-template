<template>
  <view class="page">
    <scroll-view class="msg-list" scroll-y :scroll-top="scrollTop" scroll-with-animation>
      <view
        v-for="msg in messages"
        :key="msg.id"
        class="msg-row"
        :class="msg.role === 'user' ? 'msg-row-user' : 'msg-row-ai'"
      >
        <view v-if="msg.role === 'ai'" class="avatar">昭</view>
        <view class="bubble" :class="msg.role === 'user' ? 'bubble-user' : 'bubble-ai'">
          <text class="bubble-text" :class="msg.role === 'user' ? 'bubble-text-user' : ''">{{ msg.content }}</text>
          <text v-if="msg.streaming" class="cursor"></text>
        </view>
      </view>
      <view id="msg-bottom" class="bottom-anchor"></view>
    </scroll-view>

    <view class="ai-notice">
      <text>内容由 AI 生成，仅供参考</text>
    </view>

    <view class="input-bar">
      <up-textarea
        v-model="inputText"
        class="input-textarea"
        placeholder="有什么想问小昭的？"
        :autoHeight="true"
        :maxlength="500"
        :disabled="streaming"
        :height="40"
      ></up-textarea>
      <up-button
        v-if="!streaming"
        class="send-btn"
        type="primary"
        size="small"
        :disabled="!inputText.trim()"
        :customStyle="{ width: '120rpx', borderRadius: '36rpx' }"
        @click="onSend"
      >
        发送
      </up-button>
      <up-button
        v-else
        class="send-btn"
        type="info"
        plain
        size="small"
        :customStyle="{ width: '120rpx', borderRadius: '36rpx' }"
        @click="onStop"
      >
        停止
      </up-button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { onLoad, onUnload } from '@dcloudio/uni-app'
import { AI_USE_MOCK } from '@/api/ai'
import type { AiMessage } from '@/api/ai'
import { streamChat } from '@/utils/ai-stream'
import type { StreamChatHandle } from '@/utils/ai-stream'
import { useUserStore } from '@/stores/user'
import { navigateToNeedLogin } from '@/utils/router'

/** 渲染节流间隔（ms）：delta 高频到达，批量 append 避免低端机卡顿 */
const FLUSH_INTERVAL = 150

let msgId = 0
/** 当前流式句柄（生成中可停止） */
let streamHandle: StreamChatHandle | null = null
/** 节流缓冲：累积的未渲染增量 */
let pendingText = ''
let flushTimer: ReturnType<typeof setTimeout> | null = null

const messages = ref<AiMessage[]>([])
const inputText = ref('')
const streaming = ref(false)
/** 持续递增的滚动位置：保证流式期间每次更新都触发滚到底部 */
const scrollTop = ref(0)

onLoad(() => {
  messages.value.push({
    id: ++msgId,
    role: 'ai',
    content: '你好，我是 AI 小昭～你可以问我平台业务的相关问题，或者随便聊聊。试试发送「你能做什么」吧！',
  })
})

onUnload(() => {
  streamHandle?.abort()
  if (flushTimer !== null) {
    clearTimeout(flushTimer)
    flushTimer = null
  }
})

/** 立即渲染缓冲的增量并滚动到底部 */
function flushNow() {
  if (flushTimer !== null) {
    clearTimeout(flushTimer)
    flushTimer = null
  }
  if (pendingText) {
    appendToLastMessage(pendingText)
    pendingText = ''
  }
}

/** 追加文本到最后一条 AI 消息并滚动到底部 */
function appendToLastMessage(text: string) {
  const last = messages.value[messages.value.length - 1]
  if (last && last.role === 'ai') {
    last.content += text
  }
  scrollTop.value += 10000
}

/** delta 到达：进缓冲，按节流间隔批量渲染 */
function bufferDelta(text: string) {
  pendingText += text
  if (flushTimer === null) {
    flushTimer = setTimeout(() => {
      flushTimer = null
      if (pendingText) {
        appendToLastMessage(pendingText)
        pendingText = ''
      }
    }, FLUSH_INTERVAL)
  }
}

/** 单轮对话结束（正常/停止/异常共用的收尾） */
function finishStream() {
  flushNow()
  const last = messages.value[messages.value.length - 1]
  if (last && last.role === 'ai') {
    last.streaming = false
    if (!last.content) {
      last.content = '（本轮未生成内容）'
    }
  }
  streaming.value = false
  streamHandle = null
}

function onSend() {
  const content = inputText.value.trim()
  if (!content || streaming.value) {
    return
  }
  // 登录拦截：问答记录归属用户（mock 模式无后端，跳过以保证可测试）
  if (!AI_USE_MOCK && !useUserStore().isLoggedIn) {
    const pages = getCurrentPages()
    const current = pages[pages.length - 1]
    navigateToNeedLogin(`/${current.route}`)
    return
  }

  inputText.value = ''
  messages.value.push({ id: ++msgId, role: 'user', content })
  messages.value.push({ id: ++msgId, role: 'ai', content: '', streaming: true })
  streaming.value = true
  scrollTop.value += 10000

  streamHandle = streamChat(
    { content },
    {
      onDelta: bufferDelta,
      onDone: finishStream,
      onError(err) {
        uni.showToast({ title: err.message || '生成失败，请稍后重试', icon: 'none' })
        finishStream()
      },
    },
  )
}

/** 停止生成：保留已接收内容 */
function onStop() {
  streamHandle?.abort()
}
</script>

<style lang="scss" scoped>
.page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  box-sizing: border-box;
}

.msg-list {
  flex: 1;
  min-height: 0;
  padding: 24rpx 24rpx 0;
  box-sizing: border-box;
}

.msg-row {
  display: flex;
  margin-bottom: 24rpx;

  .avatar {
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    width: 64rpx;
    height: 64rpx;
    margin-right: 16rpx;
    font-size: 28rpx;
    color: #ffffff;
    background: linear-gradient(135deg, #2979ff, #00d2ff);
    border-radius: 50%;
  }
}

.msg-row-ai {
  justify-content: flex-start;
}

.msg-row-user {
  justify-content: flex-end;
}

.bubble {
  max-width: 78%;
  padding: 20rpx 24rpx;
  border-radius: 16rpx;
  word-break: break-all;
}

.bubble-ai {
  background: #ffffff;
  border-top-left-radius: 4rpx;
}

.bubble-user {
  background: #2979ff;
  border-top-right-radius: 4rpx;
}

.bubble-text {
  font-size: 28rpx;
  line-height: 1.6;
  color: #303133;
  white-space: pre-wrap;
}

.bubble-text-user {
  color: #ffffff;
}

.cursor {
  display: inline-block;
  width: 4rpx;
  height: 30rpx;
  margin-left: 6rpx;
  vertical-align: middle;
  background: #2979ff;
  animation: cursor-blink 0.8s infinite;
}

.bottom-anchor {
  height: 2rpx;
}

@keyframes cursor-blink {
  0%,
  100% {
    opacity: 1;
  }

  50% {
    opacity: 0;
  }
}

.ai-notice {
  padding: 12rpx 24rpx;
  font-size: 22rpx;
  color: #909399;
  text-align: center;
}

.input-bar {
  display: flex;
  align-items: flex-end;
  padding: 16rpx 24rpx;
  padding-bottom: calc(16rpx + env(safe-area-inset-bottom));
  background: #ffffff;
  border-top: 1rpx solid #f0f0f0;

  .input-textarea {
    flex: 1;
    min-width: 0;
  }

  .send-btn {
    margin-left: 16rpx;
  }
}
</style>
