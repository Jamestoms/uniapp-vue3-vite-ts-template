<template>
  <view class="page">
    <view class="custom-navbar">
      <view class="navbar-status" :style="{ height: statusBarHeight + 'px' }"></view>
      <view class="navbar-content" :style="{ height: navBarHeight + 'px' }">
        <up-search
          class="navbar-search"
          placeholder="搜索商品"
          :showAction="false"
          bgColor="#f5f6f8"
          @search="onSearch"
        ></up-search>
      </view>
    </view>

    <swiper class="banner" indicator-dots autoplay circular :interval="4000">
      <swiper-item v-for="item in banners" :key="item.id">
        <view class="banner-item" :style="{ background: item.color }">
          <text class="banner-title">{{ item.title }}</text>
        </view>
      </swiper-item>
    </swiper>

    <view class="grid">
      <view v-for="item in entrances" :key="item.name" class="grid-item" @click="onEntrance(item)">
        <up-icon :name="item.icon" size="28" color="#2979ff"></up-icon>
        <text class="grid-text">{{ item.name }}</text>
      </view>
    </view>

    <view class="section">
      <text class="section-title">热门推荐</text>
      <view class="goods-list">
        <view v-for="goods in goodsList" :key="goods.id" class="goods-card">
          <view class="goods-cover" :style="{ background: goods.color }"></view>
          <view class="goods-info">
            <text class="goods-name">{{ goods.name }}</text>
            <view class="goods-bottom">
              <text class="goods-price">¥{{ goods.price }}</text>
              <up-tag v-if="goods.tag" :text="goods.tag" type="warning" size="mini"></up-tag>
            </view>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'

interface Banner {
  id: number
  title: string
  color: string
}

interface Entrance {
  name: string
  icon: string
}

interface Goods {
  id: number
  name: string
  price: string
  tag?: string
  color: string
}

/** 自定义导航：状态栏高度（H5 端为 0）+ 导航栏内容高度（微信标准 44px） */
const systemInfo = uni.getSystemInfoSync()
const statusBarHeight = ref(systemInfo.statusBarHeight ?? 0)
const navBarHeight = 44

const banners = ref<Banner[]>([
  { id: 1, title: '新人专享礼包', color: 'linear-gradient(135deg, #2979ff, #00d2ff)' },
  { id: 2, title: '限时秒杀', color: 'linear-gradient(135deg, #ff9a44, #ff5f4e)' },
  { id: 3, title: '品牌钜惠', color: 'linear-gradient(135deg, #a18cd1, #fbc2eb)' },
])

const entrances = ref<Entrance[]>([
  { name: '新品首发', icon: 'photo' },
  { name: '限时秒杀', icon: 'star' },
  { name: '购物车', icon: 'shopping-cart' },
  { name: '收藏夹', icon: 'heart' },
  { name: '领券中心', icon: 'coupon' },
  { name: '会员中心', icon: 'level' },
  { name: '客服咨询', icon: 'server-man' },
  { name: 'AI 小昭', icon: 'chat' },
])

/** AI 小昭聊天页路径（subpkg-ai 分包） */
const AI_CHAT_PAGE = '/subpkg-ai/pages/chat/index'

const goodsList = ref<Goods[]>([
  { id: 1, name: 'ttt1', price: '59.00', tag: '热卖', color: '#d3e9ff' },
  { id: 2, name: 'ttt2', price: '199.00', color: '#ffe3c9' },
  { id: 3, name: 'ttt3', price: '89.00', color: '#d9f2e3' },
  { id: 4, name: 'ttt4', price: '129.00', tag: '新品', color: '#eee3ff' },
])

const onSearch = (keyword: string) => {
  if (!keyword.trim()) {
    return
  }
  uni.showToast({ title: `搜索「${keyword}」开发中`, icon: 'none' })
}

const onEntrance = (item: Entrance) => {
  if (item.name === 'AI 小昭') {
    uni.navigateTo({ url: AI_CHAT_PAGE })
    return
  }
  uni.showToast({ title: `「${item.name}」开发中`, icon: 'none' })
}
</script>

<style lang="scss" scoped>
.page {
  padding: 0 20rpx 20rpx;
}

.custom-navbar {
  position: sticky;
  top: 0;
  z-index: 10;
  margin: 0 -20rpx;
  background: #ffffff;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.04);

  .navbar-content {
    display: flex;
    align-items: center;
    padding: 0 24rpx;
  }
}

.banner {
  height: 240rpx;
  margin-top: 20rpx;
  border-radius: 16rpx;
  overflow: hidden;

  .banner-item {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
  }

  .banner-title {
    color: #ffffff;
    font-size: 36rpx;
    font-weight: 600;
  }
}

.grid {
  display: flex;
  flex-wrap: wrap;
  margin-top: 24rpx;
  padding: 20rpx 0;
  background: #ffffff;
  border-radius: 16rpx;

  .grid-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 25%;
    padding: 16rpx 0;
  }

  .grid-text {
    margin-top: 10rpx;
    font-size: 24rpx;
    color: #606266;
  }
}

.section {
  margin-top: 24rpx;

  .section-title {
    font-size: 32rpx;
    font-weight: 600;
    color: #303133;
  }
}

.goods-list {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  margin-top: 16rpx;
}

.goods-card {
  width: 48.5%;
  margin-bottom: 20rpx;
  background: #ffffff;
  border-radius: 16rpx;
  overflow: hidden;

  .goods-cover {
    height: 220rpx;
  }

  .goods-info {
    padding: 16rpx;
  }

  .goods-name {
    font-size: 26rpx;
    color: #303133;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .goods-bottom {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-top: 12rpx;
  }

  .goods-price {
    font-size: 30rpx;
    font-weight: 600;
    color: #fa3534;
  }
}
</style>
