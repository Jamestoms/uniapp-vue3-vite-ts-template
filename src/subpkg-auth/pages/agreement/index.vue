<template>
  <view class="agreement-page">
    <view class="section">
      <text class="section-title">一、总则</text>
      <text class="section-content">欢迎您使用本小程序。请您在使用前仔细阅读并充分理解本协议全部条款，一旦您勾选同意并完成登录，即视为您已接受本协议的全部约定。</text>
    </view>
    <view class="section">
      <text class="section-title">二、账号与登录</text>
      <text class="section-content">1. 您可通过微信授权的手机号快速验证方式注册并登录本小程序，登录即代表您同意我们获取您的微信手机号用于创建和识别账号。</text>
      <text class="section-content">2. 您应妥善保管您的账号，任何通过您的账号进行的操作均视为您本人行为。</text>
    </view>
    <view class="section">
      <text class="section-title">三、用户隐私与数据安全</text>
      <text class="section-content">1. 我们将依照相关法律法规收集、存储和使用您的个人信息，仅用于向您提供产品与服务。</text>
      <text class="section-content">2. 未经您的授权同意，我们不会向任何第三方泄露您的个人信息，法律法规另有规定的除外。</text>
      <text class="section-content">3. 您可以在"我的-设置"中申请注销账号，账号注销后我们将删除或匿名化处理您的个人信息。</text>
    </view>
    <view class="section">
      <text class="section-title">四、用户行为规范</text>
      <text class="section-content">您在使用本小程序过程中，不得从事以下行为：利用小程序从事违法违规活动；发布、传播违法违规信息；干扰小程序正常运营；以及其他损害他人合法权益的行为。</text>
    </view>
    <view class="section">
      <text class="section-title">五、协议变更</text>
      <text class="section-content">我们可能适时对本协议进行修订，修订后的协议将通过页面公告等方式通知您。若您继续使用本小程序，即视为接受修订后的协议。</text>
    </view>
    <view class="section">
      <text class="section-title">六、联系方式</text>
      <text class="section-content">如您对本协议有任何疑问，可通过"我的-关于我们"页面中的联系方式与我们取得联系。</text>
    </view>
  </view>
</template>

<script setup lang="ts">
// 静态协议页，内容按实际业务法务要求替换
</script>

<style lang="scss" scoped>
.agreement-page {
  padding: 32rpx;
  background: #ffffff;
  min-height: 100vh;
}

.section {
  margin-bottom: 32rpx;

  .section-title {
    display: block;
    font-size: 30rpx;
    font-weight: 600;
    color: #303133;
    margin-bottom: 12rpx;
  }

  .section-content {
    display: block;
    font-size: 26rpx;
    line-height: 1.8;
    color: #606266;
    margin-bottom: 8rpx;
    text-align: justify;
  }
}
</style>
