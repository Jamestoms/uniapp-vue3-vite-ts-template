/**
 * 常用表单验证规则
 *
 * 两种使用方式：
 * 1. 直接调用断言函数（返回 boolean）：
 *    import { isIdCard } from '@/utils/validate'
 *    if (isIdCard(value)) { ... }
 *
 * 2. 配合 uview-plus（up-form）的 rules validator 使用：
 *    import { validators, minLenRule, decimalRule } from '@/utils/validate'
 *    const rules = {
 *      realName: [
 *        { required: true, message: '请输入姓名', trigger: ['blur', 'change'] },
 *        { validator: validators.chineseName, trigger: ['blur'] }
 *      ],
 *      remark: [{ validator: maxLenRule(200), trigger: ['change'] }],
 *      price: [{ validator: decimalRule(2), trigger: ['blur'] }]
 *    }
 *
 * 说明：所有规则只做格式校验，"是否必填"交给 async-validator 的 required 规则处理
 * （up-form 中非 required 且为空时不会触发 validator）。
 */

/** async-validator 风格的 validator：通过 callback() 放行，callback(new Error(msg)) 报错 */
export type UpValidator = (
  rule: unknown,
  value: unknown,
  callback: (error?: Error) => void
) => void;

/** 断言函数：入参任意，返回 boolean */
export type AssertFn = (value: unknown) => boolean;

/* ============================== 基础断言函数 ============================== */

/**
 * 中文姓名：2-20 位中文，支持少数民族姓名中的间隔符 ·（如 买买提·艾力）
 */
export function isChineseName(value: unknown): boolean {
  return /^[\u4e00-\u9fa5][\u4e00-\u9fa5·]{1,19}$/.test(String(value ?? '').trim());
}

/**
 * 手机号：国内 11 位，1 开头第二位 3-9
 */
export function isMobile(value: unknown): boolean {
  return /^1[3-9]\d{9}$/.test(String(value ?? '').trim());
}

/**
 * 座机电话：可选区号（3-4 位）+ 7-8 位号码 + 可选分机号
 * 如 010-12345678、057112345678、021-12345678-1234
 */
export function isTelPhone(value: unknown): boolean {
  return /^(0\d{2,3}-?)?\d{7,8}(-\d{1,5})?$/.test(String(value ?? '').trim());
}

/**
 * 座机号或手机号
 */
export function isPhone(value: unknown): boolean {
  return isMobile(value) || isTelPhone(value);
}

/**
 * 身份证号：支持 15 位（旧）与 18 位（新，含出生日期与校验码验证）
 */
export function isIdCard(value: unknown): boolean {
  const id = String(value ?? '').trim().toUpperCase();

  // 15 位旧身份证：6 位地址码 + 出生年月日（yyMMdd，视为 19xx）+ 3 位顺序码
  if (/^\d{15}$/.test(id)) {
    return /^\d{8}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])\d{3}$/.test(id);
  }

  // 18 位：6 位地址码 + 出生日期（yyyyMMdd）+ 3 位顺序码 + 校验码
  if (!/^\d{6}(18|19|20)\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])\d{3}[\dX]$/.test(id)) {
    return false;
  }

  // GB 11643-1999 校验码算法：前 17 位加权求和模 11，查表得校验位
  const weights = [7, 9, 10, 5, 8, 4, 2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2];
  const checkCodes = ['1', '0', 'X', '9', '8', '7', '6', '5', '4', '3', '2'];
  const sum = weights.reduce((acc, weight, i) => acc + Number(id[i]) * weight, 0);
  return checkCodes[sum % 11] === id[17];
}

/**
 * 整数（支持负号），如 0、-12、100
 */
export function isInteger(value: unknown): boolean {
  return /^-?\d+$/.test(String(value ?? '').trim());
}

/**
 * 正整数（大于 0，不含 0）
 */
export function isPositiveInteger(value: unknown): boolean {
  return /^[1-9]\d*$/.test(String(value ?? '').trim());
}

/**
 * 小数（必须含小数部分，支持负号）
 * @param places 最多小数位数；不传则不限位数。如 isDecimal(v, 2) 允许 12.3、12.34
 */
export function isDecimal(value: unknown, places?: number): boolean {
  const str = String(value ?? '').trim();
  if (places === undefined) {
    return /^-?\d+\.\d+$/.test(str);
  }
  return new RegExp(`^-?\\d+\\.\\d{1,${Number(places)}}$`).test(str);
}

/**
 * 金额：非负数字，整数或最多两位小数，首位非 0（0 除外），如 0、12、12.5、12.34
 */
export function isAmount(value: unknown): boolean {
  return /^(?:0|[1-9]\d*)(?:\.\d{1,2})?$/.test(String(value ?? '').trim());
}

/**
 * 最小长度校验（字符数，一个中文按 1 个字符计）
 * @param len 最小字符数
 */
export function minLength(value: unknown, len: number): boolean {
  return String(value ?? '').trim().length >= Number(len);
}

/**
 * 最大长度校验（字符数，一个中文按 1 个字符计）
 * @param len 最大字符数
 */
export function maxLength(value: unknown, len: number): boolean {
  return String(value ?? '').trim().length <= Number(len);
}

/**
 * 邮箱
 */
export function isEmail(value: unknown): boolean {
  return /^[\w.-]+@[\w-]+(\.[\w-]+)+$/.test(String(value ?? '').trim());
}

/**
 * 邮政编码：6 位数字
 */
export function isPostalCode(value: unknown): boolean {
  return /^\d{6}$/.test(String(value ?? '').trim());
}

/**
 * 车牌号：普通车牌 + 新能源 8 位车牌（不含教练车/港澳等特殊前缀的极端情况）
 */
export function isCarNo(value: unknown): boolean {
  const str = String(value ?? '').trim().toUpperCase();
  const provinces =
    '京津沪渝冀豫云辽黑湘皖鲁新苏浙赣鄂桂甘晋蒙陕吉闽贵粤青藏川宁琼使领';
  const normal = new RegExp(
    `^[${provinces}][A-HJ-NP-Z][A-HJ-NP-Z0-9]{4}[A-HJ-NP-Z0-9挂学警港澳]$`
  );
  // 新能源：第 3 位为字母 D/F（纯电动/插电混动），共 8 位
  const newEnergy = new RegExp(
    `^[${provinces}][A-HJ-NP-Z](?:[DF][A-HJ-NP-Z0-9]\\d{4}|\\d{5}[DF])$`
  );
  return normal.test(str) || newEnergy.test(str);
}

/**
 * 微信号：6-20 位，字母开头，可含字母、数字、下划线、减号
 */
export function isWeChat(value: unknown): boolean {
  return /^[a-zA-Z][a-zA-Z0-9_-]{5,19}$/.test(String(value ?? '').trim());
}

/**
 * QQ 号：5-11 位数字，首位非 0
 */
export function isQQ(value: unknown): boolean {
  return /^[1-9]\d{4,10}$/.test(String(value ?? '').trim());
}

/* ========================= uview-plus validator 适配 ========================= */

/**
 * 将断言函数包装为 uview-plus（async-validator）的 validator
 * @param validateFn 断言函数
 * @param message 校验失败时的提示文案
 */
export function makeValidator(validateFn: AssertFn, message: string): UpValidator {
  return (rule, value, callback) => {
    if (validateFn(value)) {
      callback();
    } else {
      callback(new Error(message));
    }
  };
}

/** 预置 validator：直接用于 up-form 的 rules */
export const validators = {
  /** 中文姓名 */
  chineseName: makeValidator(isChineseName, '请输入正确的中文姓名'),
  /** 手机号 */
  mobile: makeValidator(isMobile, '请输入正确的手机号'),
  /** 座机电话 */
  telPhone: makeValidator(isTelPhone, '请输入正确的座机电话'),
  /** 座机号或手机号 */
  phone: makeValidator(isPhone, '请输入正确的电话号码'),
  /** 身份证号 */
  idCard: makeValidator(isIdCard, '请输入正确的身份证号'),
  /** 整数 */
  integer: makeValidator(isInteger, '请输入整数'),
  /** 正整数 */
  positiveInteger: makeValidator(isPositiveInteger, '请输入大于 0 的整数'),
  /** 小数 */
  decimal: makeValidator((v) => isDecimal(v), '请输入正确的小数'),
  /** 金额（最多两位小数） */
  amount: makeValidator(isAmount, '请输入正确的金额'),
  /** 邮箱 */
  email: makeValidator(isEmail, '请输入正确的邮箱地址'),
  /** 邮政编码 */
  postalCode: makeValidator(isPostalCode, '请输入正确的邮政编码'),
  /** 车牌号 */
  carNo: makeValidator(isCarNo, '请输入正确的车牌号'),
  /** 微信号 */
  weChat: makeValidator(isWeChat, '请输入正确的微信号'),
  /** QQ 号 */
  qq: makeValidator(isQQ, '请输入正确的 QQ 号'),
};

/** 参数化规则工厂：生成带参数的 validator */

/**
 * 最小长度规则
 * @param len 最小字符数
 * @param message 自定义提示文案
 */
export function minLenRule(len: number, message?: string): UpValidator {
  return makeValidator((v) => minLength(v, len), message ?? `不能少于 ${len} 个字符`);
}

/**
 * 最大长度规则
 * @param len 最大字符数
 * @param message 自定义提示文案
 */
export function maxLenRule(len: number, message?: string): UpValidator {
  return makeValidator((v) => maxLength(v, len), message ?? `不能超过 ${len} 个字符`);
}

/**
 * 小数位数规则（最多 places 位小数）
 * @param places 最多小数位数
 * @param message 自定义提示文案
 */
export function decimalRule(places: number, message?: string): UpValidator {
  return makeValidator(
    (v) => isDecimal(v, places),
    message ?? `请输入正确的小数（最多 ${places} 位小数）`
  );
}

export default { validators, makeValidator };
