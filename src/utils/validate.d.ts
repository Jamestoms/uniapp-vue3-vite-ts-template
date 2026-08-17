/** src/utils/validate.js 的类型声明（配合 uview-plus/async-validator 的 validator 签名） */

/** async-validator 风格的 validator：通过 callback() 放行，callback(new Error(msg)) 报错 */
export type UpValidator = (
  rule: unknown,
  value: unknown,
  callback: (error?: Error) => void
) => void;

/** 断言函数：入参任意，返回 boolean */
export type AssertFn = (value: unknown) => boolean;

export declare function isChineseName(value: unknown): boolean;
export declare function isMobile(value: unknown): boolean;
export declare function isTelPhone(value: unknown): boolean;
export declare function isPhone(value: unknown): boolean;
export declare function isIdCard(value: unknown): boolean;
export declare function isInteger(value: unknown): boolean;
export declare function isPositiveInteger(value: unknown): boolean;
export declare function isDecimal(value: unknown, places?: number): boolean;
export declare function isAmount(value: unknown): boolean;
export declare function minLength(value: unknown, len: number): boolean;
export declare function maxLength(value: unknown, len: number): boolean;
export declare function isEmail(value: unknown): boolean;
export declare function isPostalCode(value: unknown): boolean;
export declare function isCarNo(value: unknown): boolean;
export declare function isWeChat(value: unknown): boolean;
export declare function isQQ(value: unknown): boolean;

export declare function makeValidator(validateFn: AssertFn, message: string): UpValidator;

export declare const validators: {
  chineseName: UpValidator;
  mobile: UpValidator;
  telPhone: UpValidator;
  phone: UpValidator;
  idCard: UpValidator;
  integer: UpValidator;
  positiveInteger: UpValidator;
  decimal: UpValidator;
  amount: UpValidator;
  email: UpValidator;
  postalCode: UpValidator;
  carNo: UpValidator;
  weChat: UpValidator;
  qq: UpValidator;
};

export declare function minLenRule(len: number, message?: string): UpValidator;
export declare function maxLenRule(len: number, message?: string): UpValidator;
export declare function decimalRule(places: number, message?: string): UpValidator;

declare const _default: { validators: typeof validators; makeValidator: typeof makeValidator };
export default _default;
