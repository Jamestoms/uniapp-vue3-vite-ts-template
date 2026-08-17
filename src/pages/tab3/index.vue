<template>
  <view class="page">
    <view class="placeholder">
      <up-icon name="eye" size="56" color="#c0c4cc"></up-icon>
      <text class="placeholder-title">发现</text>
      <text class="placeholder-desc">页面建设规划中，敬请期待</text>
    </view>
  </view>
</template>

<script setup lang="ts">
// 发现页占位：后续按业务需求开发
</script>

<style lang="scss" scoped>
.page {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100vh;
}

.placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;

  .placeholder-title {
    margin-top: 24rpx;
    font-size: 32rpx;
    font-weight: 600;
    color: #606266;
  }

  .placeholder-desc {
    margin-top: 12rpx;
    font-size: 26rpx;
    color: #909399;
  }
}
</style>
