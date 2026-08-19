<template>
  <view class="page">
    <!-- 用户卡：点击头像/昵称/手机号区域 —— 未登录去登录，已登录去编辑资料 -->
    <view class="user-card" @click="onUserCardClick">
      <up-avatar
        v-if="isLoggedIn && userInfo?.avatar"
        :src="userInfo.avatar"
        :size="72"
        shape="circle"
        mode="aspectFill"
      ></up-avatar>
      <up-avatar
        v-else
        :text="isLoggedIn ? maskedPhone.slice(0, 1) : '未'"
        :size="72"
        shape="circle"
        bgColor="#ffffff"
        color="#2979ff"
      ></up-avatar>
      <view class="user-info">
        <view class="user-name-row">
          <text class="user-name">{{ isLoggedIn ? (userInfo?.nickname || maskedPhone) : '未登录' }}</text>
          <up-icon name="arrow-right" color="#ffffff" size="16"></up-icon>
        </view>
        <text class="user-tip">{{ isLoggedIn ? maskedPhone : '点击登录，享受更多服务' }}</text>
      </view>
    </view>

    <view class="stats-bar">
      <view class="stat-item">
        <text class="stat-num">0</text>
        <text class="stat-label">收藏</text>
      </view>
      <view class="stat-item">
        <text class="stat-num">0</text>
        <text class="stat-label">足迹</text>
      </view>
      <view class="stat-item">
        <text class="stat-num">0</text>
        <text class="stat-label">优惠券</text>
      </view>
    </view>

    <up-cell-group :border="false" class="menu-group">
      <up-cell icon="shopping-cart" title="我的订单" value="查看全部" isLink @click="onMenu('订单')"></up-cell>
      <up-cell icon="heart" title="我的收藏" isLink @click="onMenu('收藏')"></up-cell>
      <up-cell icon="setting" title="设置" isLink @click="onMenu('设置')"></up-cell>
      <up-cell icon="level" title="关于我们" isLink @click="onMenu('关于')"></up-cell>
    </up-cell-group>

    <up-button
      v-if="isLoggedIn"
      text="退出登录"
      type="error"
      plain
      :customStyle="logoutStyle"
      @click="logout"
    ></up-button>
  </view>
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { onShow } from '@dcloudio/uni-app'
import { getUserInfo } from '@/api/user'
import { useUserStore } from '@/stores/user'
import { navigateToNeedLogin } from '@/utils/router'

const userStore = useUserStore()
const { isLoggedIn, maskedPhone, userInfo } = storeToRefs(userStore)

const onUserCardClick = () => {
  if (!isLoggedIn.value) {
    uni.navigateTo({ url: '/subpkg-auth/pages/login/index' })
    return
  }
  navigateToNeedLogin('/subpkg-common/pages/profile-edit/index')
}

onShow(() => {
  // 已登录但无用户信息缓存时拉取（静默，失败不打扰；编辑页提交后会刷新 store）
  if (isLoggedIn.value && !userInfo.value) {
    getUserInfo({ showError: false })
      .then((info) => userStore.setUserInfo(info))
      .catch(() => {})
  }
})

const onMenu = (name: string) => {
  if (!isLoggedIn.value) {
    uni.showToast({ title: '请先登录', icon: 'none' })
    return
  }
  uni.showToast({ title: `「${name}」开发中`, icon: 'none' })
}

const logout = () => {
  uni.showModal({
    title: '提示',
    content: '确定退出登录吗？',
    success: (res) => {
      if (res.confirm) {
        userStore.clearLogin()
        uni.showToast({ title: '已退出登录', icon: 'none' })
      }
    },
  })
}

const logoutStyle = { marginTop: '48rpx' }
</script>

<style lang="scss" scoped>
.page {
  padding: 20rpx;
}

.user-card {
  display: flex;
  align-items: center;
  padding: 48rpx 32rpx;
  background: linear-gradient(135deg, #2979ff, #00b0ff);
  border-radius: 16rpx;
}

.user-info {
  display: flex;
  flex: 1;
  flex-direction: column;
  margin-left: 24rpx;

  .user-name-row {
    display: flex;
    align-items: center;
  }

  .user-name {
    margin-right: 8rpx;
    font-size: 34rpx;
    font-weight: 600;
    color: #ffffff;
  }

  .user-tip {
    margin-top: 8rpx;
    font-size: 24rpx;
    color: rgba(255, 255, 255, 0.8);
  }
}

.stats-bar {
  display: flex;
  margin-top: 20rpx;
  padding: 28rpx 0;
  background: #ffffff;
  border-radius: 16rpx;
}

.stat-item {
  display: flex;
  flex: 1;
  flex-direction: column;
  align-items: center;

  .stat-num {
    font-size: 34rpx;
    font-weight: 600;
    color: #303133;
  }

  .stat-label {
    margin-top: 6rpx;
    font-size: 24rpx;
    color: #909399;
  }
}

.menu-group {
  margin-top: 20rpx;
  border-radius: 16rpx;
  overflow: hidden;
}
</style>
