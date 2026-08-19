/**
 * 页面跳转封装（含登录拦截）
 *
 * uni-app 无路由守卫，需登录的页面通过本封装跳转：
 *   import { navigateToNeedLogin } from "@/utils/router";
 *   navigateToNeedLogin("/subpkg-mall/pages/order/detail?id=1");
 */
import { useUserStore } from "@/stores/user";

/** 登录页路径（分包） */
export const LOGIN_PAGE = "/subpkg-auth/pages/login/index";

/**
 * 跳转到需登录的页面：未登录时提示并转登录页（登录后可回跳），已登录则正常跳转
 *
 * @param url 目标页面绝对路径
 * @param options.redirectBack 登录成功后是否回跳目标页，默认 true
 */
export function navigateToNeedLogin(url: string, options?: { redirectBack?: boolean }): void {
  const userStore = useUserStore();
  if (userStore.isLoggedIn) {
    uni.navigateTo({ url });
    return;
  }
  const redirectBack = options?.redirectBack ?? true;
  uni.showToast({ title: "请先登录", icon: "none" });
  setTimeout(() => {
    const loginUrl = redirectBack
      ? `${LOGIN_PAGE}?redirect=${encodeURIComponent(url)}`
      : LOGIN_PAGE;
    uni.navigateTo({ url: loginUrl });
  }, 600);
}

/** 是否已登录（页面内快速判断） */
export function isLoggedIn(): boolean {
  return useUserStore().isLoggedIn;
}
