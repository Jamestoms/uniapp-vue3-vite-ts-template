<template>
  <view class="login-page">
    <view class="logo-area">
      <image class="logo" src="/static/logo.png" mode="aspectFit" />
      <text class="app-name">欢迎使用小程序</text>
      <text class="app-desc">登录后可同步您的数据，享受更多服务</text>
    </view>

    <view class="btn-area">
      <!-- #ifdef MP-WEIXIN -->
      <!-- 微信手机号快速验证：button open-type，授权后回调携带动态令牌 code，交由后端换取手机号 -->
      <up-button
        type="primary"
        text="手机号一键登录"
        open-type="getPhoneNumber"
        :loading="loading"
        @getphonenumber="onGetPhoneNumber"
      ></up-button>
      <!-- #endif -->
      <!-- #ifndef MP-WEIXIN -->
      <!-- 非微信端（如 H5 预览）open-type 不可用，提供演示入口 -->
      <up-button
        type="primary"
        text="手机号一键登录（演示）"
        :loading="loading"
        @click="onMockLogin"
      ></up-button>
      <!-- #endif -->
      <up-button
        text="暂不登录"
        plain
        :customStyle="skipStyle"
        @click="goBack"
      ></up-button>
    </view>

    <view class="agreement">
      <view class="agreement-check" @click="toggleAgreed">
        <view class="checkbox" :class="{ checked: agreed }">
          <up-icon v-if="agreed" name="checkbox-mark" color="#ffffff" :size="12"></up-icon>
        </view>
      </view>
      <text class="agreement-text">已阅读并同意</text>
      <text class="agreement-link" @click="goAgreement">《用户协议》</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { wxMobileLogin, type WxMobileLoginParams } from '@/api/user'
import { useUserStore } from '@/stores/user'

/** 微信 getPhoneNumber 回调事件结构（新版返回动态令牌 code） */
interface GetPhoneNumberEvent {
  detail: {
    code?: string
    errMsg: string
  }
}

const userStore = useUserStore()
const agreed = ref(false)
const loading = ref(false)
const skipStyle = { marginTop: '24rpx' }
/** 登录拦截携带的原页面地址（navigateToNeedLogin 传入），登录后回跳 */
let redirectUrl = ''

onLoad((query) => {
  if (query?.redirect) {
    redirectUrl = decodeURIComponent(query.redirect)
  }
})

const toggleAgreed = () => {
  agreed.value = !agreed.value
}

/** 前置校验：必须勾选用户协议 */
const ensureAgreed = (): boolean => {
  if (!agreed.value) {
    uni.showToast({ title: '请先阅读并勾选《用户协议》', icon: 'none' })
    return false
  }
  return true
}

/** 换取登录态并落地缓存（经 user store，storage 由 store 持久化） */
const doLogin = async (params: WxMobileLoginParams) => {
  loading.value = true
  try {
    const result = await wxMobileLogin(params)
    userStore.setLoginInfo(result.token, result.phone)
    uni.showToast({ title: '登录成功', icon: 'success' })
    setTimeout(() => {
      // 有拦截来源则回跳原页面，否则返回上一页
      if (redirectUrl) {
        uni.redirectTo({ url: redirectUrl, fail: () => uni.switchTab({ url: '/pages/mine/index' }) })
      } else {
        uni.navigateBack({ fail: () => uni.switchTab({ url: '/pages/mine/index' }) })
      }
    }, 800)
  } catch {
    // 错误已由 request.ts 统一 toast，这里无需重复处理
  } finally {
    loading.value = false
  }
}

/** 微信手机号快速验证回调 */
const onGetPhoneNumber = async (e: GetPhoneNumberEvent) => {
  if (!ensureAgreed()) {
    return
  }
  const phoneCode = e.detail?.code
  if (!phoneCode) {
    // 用户拒绝授权，或小程序无手机号快速验证权限（需企业认证并开通该能力）
    uni.showToast({ title: '已取消手机号授权', icon: 'none' })
    return
  }
  // wx.login 获取登录凭证，与手机号令牌一并交由后端换取 openid + 手机号
  const loginRes = await uni.login({ provider: 'weixin' })
  await doLogin({ loginCode: loginRes.code, phoneCode })
}

/** 非微信端演示登录（占位凭证，后端 mock 场景使用） */
const onMockLogin = async () => {
  if (!ensureAgreed()) {
    return
  }
  await doLogin({ loginCode: 'mock-login-code', phoneCode: 'mock-phone-code' })
}

const goAgreement = () => {
  uni.navigateTo({ url: '/subpkg-auth/pages/agreement/index' })
}

const goBack = () => {
  uni.navigateBack({ fail: () => uni.switchTab({ url: '/pages/index/index' }) })
}
</script>

<style lang="scss" scoped>
.login-page {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0 60rpx;
  min-height: 100vh;
  background: #ffffff;
}

.logo-area {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-top: 140rpx;

  .logo {
    width: 160rpx;
    height: 160rpx;
    border-radius: 32rpx;
  }

  .app-name {
    margin-top: 32rpx;
    font-size: 40rpx;
    font-weight: 600;
    color: #303133;
  }

  .app-desc {
    margin-top: 16rpx;
    font-size: 26rpx;
    color: #909399;
  }
}

.btn-area {
  width: 100%;
  margin-top: 120rpx;
}

.agreement {
  display: flex;
  align-items: center;
  margin-top: 40rpx;

  .agreement-check {
    padding: 8rpx;
  }

  .checkbox {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 34rpx;
    height: 34rpx;
    border: 2rpx solid #c0c4cc;
    border-radius: 50%;
    box-sizing: border-box;
    transition: all 0.2s;

    &.checked {
      background: #2979ff;
      border-color: #2979ff;
    }
  }

  .agreement-text {
    font-size: 24rpx;
    color: #909399;
  }

  .agreement-link {
    font-size: 24rpx;
    color: #2979ff;
  }
}
</style>
