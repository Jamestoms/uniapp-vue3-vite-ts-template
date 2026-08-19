/**
 * 微信能力封装（支付 / 订阅消息）
 *
 * 支付参数由后端统一下单接口返回（见各业务 api 模块），前端不拼接签名。
 */

/** 微信支付参数（后端统一下单返回） */
export interface WxPayParams {
  timeStamp: string;
  nonceStr: string;
  /** prepay_id=xxx */
  package: string;
  signType: string;
  paySign: string;
}

/**
 * 调起微信支付
 *
 * @param params 后端统一下单返回的支付参数
 * @returns 支付成功 resolve；用户取消 / 支付失败 reject（错误信息已区分取消场景）
 */
export function wxPay(params: WxPayParams): Promise<void> {
  return new Promise((resolve, reject) => {
    // #ifdef MP-WEIXIN
    uni.requestPayment({
      provider: "wxpay",
      ...params,
      success: () => resolve(),
      fail: (err) => {
        const cancelled = err.errMsg?.includes("cancel");
        reject(new Error(cancelled ? "已取消支付" : "支付失败，请重试"));
      },
    });
    // #endif
    // #ifndef MP-WEIXIN
    reject(new Error("微信支付仅在小程序端可用"));
    // #endif
  });
}

/**
 * 调起订阅消息授权（赛事预约提醒等场景）
 *
 * 建议在用户点击提交前调用（微信要求由用户手势触发）。
 * 模板 id 在微信公众平台"订阅消息"中申请后配置。
 *
 * @param tmplIds 订阅消息模板 id 列表
 * @returns 用户同意订阅的模板 id 列表（非微信端返回空数组，静默通过）
 */
export function wxSubscribeMessage(tmplIds: string[]): Promise<string[]> {
  return new Promise((resolve) => {
    // #ifdef MP-WEIXIN
    uni.requestSubscribeMessage({
      tmplIds,
      success: (res) => {
        const result = res as unknown as Record<string, string>;
        const accepted = tmplIds.filter((id) => result[id] === "accept");
        resolve(accepted);
      },
      fail: () => resolve([]),
    });
    // #endif
    // #ifndef MP-WEIXIN
    resolve([]);
    // #endif
  });
}
