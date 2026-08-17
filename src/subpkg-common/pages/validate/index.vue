<template>
  <view class="form-page">
    <up-form
      ref="formRef"
      :model="form"
      :rules="rules"
      labelWidth="90"
      errorType="message"
    >
      <up-form-item label="姓名" prop="realName">
        <up-input v-model="form.realName" placeholder="2-20 位中文" />
      </up-form-item>
      <up-form-item label="手机号" prop="mobile">
        <up-input v-model="form.mobile" placeholder="请输入手机号" />
      </up-form-item>
      <up-form-item label="身份证号" prop="idCard">
        <up-input v-model="form.idCard" placeholder="15 或 18 位" />
      </up-form-item>
      <up-form-item label="座机/手机" prop="phone">
        <up-input v-model="form.phone" placeholder="座机号或手机号" />
      </up-form-item>
      <up-form-item label="数量" prop="count">
        <up-input v-model="form.count" placeholder="正整数" type="number" />
      </up-form-item>
      <up-form-item label="价格" prop="price">
        <up-input v-model="form.price" placeholder="小数，最多 2 位" />
      </up-form-item>
      <up-form-item label="备注" prop="remark">
        <up-input v-model="form.remark" placeholder="5-20 个字符" />
      </up-form-item>
    </up-form>
    <up-button type="primary" text="提交校验" :customStyle="submitStyle" @click="submit"></up-button>
  </view>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import { validators, minLenRule, maxLenRule, decimalRule } from '@/utils/validate'

/** 表单数据 */
const form = reactive({
  realName: '',
  mobile: '',
  idCard: '',
  phone: '',
  count: '',
  price: '',
  remark: '',
})

/** 校验规则：validators 为预置规则，xxxRule 为参数化规则 */
const rules = {
  realName: [
    { required: true, message: '请输入姓名', trigger: ['blur', 'change'] },
    { validator: validators.chineseName, trigger: ['blur'] },
  ],
  mobile: [
    { required: true, message: '请输入手机号', trigger: ['blur', 'change'] },
    { validator: validators.mobile, trigger: ['blur'] },
  ],
  idCard: [
    { required: true, message: '请输入身份证号', trigger: ['blur', 'change'] },
    { validator: validators.idCard, trigger: ['blur'] },
  ],
  phone: [{ validator: validators.phone, trigger: ['blur'] }],
  count: [{ validator: validators.positiveInteger, trigger: ['blur'] }],
  price: [{ validator: decimalRule(2), trigger: ['blur'] }],
  remark: [
    { validator: minLenRule(5), trigger: ['blur'] },
    { validator: maxLenRule(20), trigger: ['blur'] },
  ],
}

const formRef = ref()
const submitStyle = { marginTop: '40rpx' }

const submit = () => {
  formRef.value
    ?.validate()
    .then(() => {
      uni.showToast({ title: '校验通过', icon: 'success' })
      console.log('表单数据', form)
    })
    .catch((errors: unknown) => {
      console.log('校验失败', errors)
    })
}
</script>

<style>
.form-page {
  padding: 30rpx;
}
</style>
