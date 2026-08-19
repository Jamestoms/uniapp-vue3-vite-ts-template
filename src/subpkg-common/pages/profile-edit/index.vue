<template>
  <view class="page">
    <up-form ref="formRef" :model="form" :rules="rules" labelWidth="90" errorType="message">
      <!-- 头像：点击从相册选图，本地预览，提交时上传对象存储 -->
      <up-form-item label="头像" prop="avatar">
        <view class="avatar-row" @click="onChooseAvatar">
          <up-avatar
            v-if="displayAvatar"
            :src="displayAvatar"
            :size="56"
            shape="circle"
            mode="aspectFill"
            bgColor="#2979ff"
          ></up-avatar>
          <up-avatar v-else :text="maskedPhone.slice(0, 1)" :size="56" shape="circle" bgColor="#2979ff"></up-avatar>
        </view>
      </up-form-item>

      <up-form-item label="昵称" prop="nickname">
        <up-input v-model="form.nickname" placeholder="2-20 个字符" clearable :maxlength="20" />
      </up-form-item>

      <up-form-item label="性别" prop="gender">
        <up-radio-group v-model="form.gender">
          <up-radio :name="1" label="男" :customStyle="radioStyle"></up-radio>
          <up-radio :name="2" label="女" :customStyle="radioStyle"></up-radio>
          <up-radio :name="0" label="保密"></up-radio>
        </up-radio-group>
      </up-form-item>

      <up-form-item label="手机号" prop="phone">
        <up-input v-model="form.phone" placeholder="请输入手机号" type="number" :maxlength="11" clearable />
      </up-form-item>
    </up-form>

    <up-button
      type="primary"
      text="保存修改"
      :loading="submitting"
      :customStyle="submitStyle"
      @click="onSubmit"
    ></up-button>
  </view>
</template>

<script setup lang="ts">
import { reactive, ref, computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { storeToRefs } from 'pinia'
import { updateUserInfo, uploadAvatar } from '@/api/user'
import { useUserStore } from '@/stores/user'
import { validators, minLenRule, maxLenRule } from '@/utils/validate'

const userStore = useUserStore()
const { userInfo, maskedPhone, isLoggedIn } = storeToRefs(userStore)

/** 表单数据（onShow 时从 store 初始化） */
const form = reactive({
  nickname: '',
  gender: 0 as 0 | 1 | 2,
  phone: '',
})

/** 新选的本地头像路径（提交时才上传，避免用户取消编辑浪费存储请求） */
const avatarLocal = ref('')
/** 头像展示：优先新选的本地图，其次已保存头像 */
const displayAvatar = computed(() => avatarLocal.value || userInfo.value?.avatar || '')

const rules = {
  nickname: [
    { required: true, message: '请输入昵称', trigger: ['blur', 'change'] },
    { validator: minLenRule(2, '昵称至少 2 个字符'), trigger: ['blur'] },
    { validator: maxLenRule(20, '昵称最多 20 个字符'), trigger: ['blur'] },
  ],
  phone: [
    { required: true, message: '请输入手机号', trigger: ['blur', 'change'] },
    { validator: validators.mobile, trigger: ['blur'] },
  ],
}

const formRef = ref()
const submitting = ref(false)
const radioStyle = { marginRight: '24rpx' }
const submitStyle = { marginTop: '48rpx' }

/** 从相册选择头像（本地预览，提交时经 uploadAvatar 直传对象存储） */
const onChooseAvatar = () => {
  uni.chooseImage({
    count: 1,
    sizeType: ['compressed'],
    success: (res) => {
      avatarLocal.value = res.tempFilePaths[0]
    },
  })
}

/** 提交修改：校验 → 上传新头像（如有）→ updateUserInfo → 同步 store */
const onSubmit = async () => {
  const valid = await formRef.value
    ?.validate()
    .then(() => true)
    .catch(() => false)
  if (!valid) {
    return
  }
  submitting.value = true
  try {
    let avatar = userInfo.value?.avatar
    if (avatarLocal.value) {
      avatar = await uploadAvatar(avatarLocal.value)
    }
    const info = await updateUserInfo({
      nickname: form.nickname.trim(),
      gender: form.gender,
      avatar,
      phone: form.phone.trim(),
    })
    userStore.setUserInfo(info)
    // 手机号是登录态字段，同步更新（否则“我的”页仍展示旧手机号）
    userStore.setPhone(form.phone.trim())
    avatarLocal.value = ''
    uni.showToast({ title: '保存成功', icon: 'success' })
    setTimeout(() => {
      uni.navigateBack({ fail: () => uni.switchTab({ url: '/pages/mine/index' }) })
    }, 600)
  } catch {
    // 错误已由 request.ts / uploadAvatar 统一 toast
  } finally {
    submitting.value = false
  }
}

onShow(() => {
  // 防御：未登录（如直链进入）送回首页
  if (!isLoggedIn.value) {
    uni.showToast({ title: '请先登录', icon: 'none' })
    setTimeout(() => {
      uni.switchTab({ url: '/pages/index/index' })
    }, 600)
    return
  }
  // 从 store 初始化表单（store 为空时保持默认值，由用户填写）
  form.nickname = userInfo.value?.nickname || ''
  form.gender = userInfo.value?.gender ?? 0
  form.phone = userInfo.value?.phone || userStore.phone
})
</script>

<style lang="scss" scoped>
.page {
  padding: 24rpx 30rpx;
}

.avatar-row {
  display: flex;
  flex: 1;
  justify-content: flex-start;
  padding: 12rpx 0;
}
</style>
