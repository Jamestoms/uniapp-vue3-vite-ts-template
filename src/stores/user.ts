/**
 * 用户全局状态（Pinia）
 *
 * 登录态唯一数据源：组件/store 修改状态，storage 仅作持久化层。
 * 页面禁止直接读写 token/phone 的 storage，统一经过本 store。
 */
import { defineStore } from "pinia";
import type { UserInfo } from "@/api/user";
import { getStorage, setStorage, removeStorage, StorageKey } from "@/utils/storage";

export const useUserStore = defineStore("user", {
  state: () => ({
    /** 登录令牌（启动时从本地存储恢复） */
    token: getStorage<string>(StorageKey.TOKEN, ""),
    /** 登录手机号 */
    phone: getStorage<string>(StorageKey.PHONE, ""),
    /** 用户信息（getUserInfo 拉取后写入） */
    userInfo: getStorage<UserInfo | null>(StorageKey.USER_INFO, null),
  }),

  getters: {
    /** 是否已登录 */
    isLoggedIn: (state) => Boolean(state.token),
    /** 手机号脱敏展示：138****1234；未取到手机号时返回占位 */
    maskedPhone(state): string {
      if (!state.phone) {
        return "已登录用户";
      }
      return state.phone.replace(/^(\d{3})\d{4}(\d{4})$/, "$1****$2");
    },
  },

  actions: {
    /** 登录成功后写入（登录页调用） */
    setLoginInfo(token: string, phone: string) {
      this.token = token;
      this.phone = phone;
      setStorage(StorageKey.TOKEN, token);
      setStorage(StorageKey.PHONE, phone);
    },

    /** 缓存用户信息 */
    setUserInfo(userInfo: UserInfo) {
      this.userInfo = userInfo;
      setStorage(StorageKey.USER_INFO, userInfo);
    },

    /** 更新登录手机号（编辑资料页修改手机号成功后调用） */
    setPhone(phone: string) {
      this.phone = phone;
      setStorage(StorageKey.PHONE, phone);
    },

    /** 清除登录态（退出登录 / 401 失效时调用） */
    clearLogin() {
      this.token = "";
      this.phone = "";
      this.userInfo = null;
      removeStorage(StorageKey.TOKEN);
      removeStorage(StorageKey.PHONE);
      removeStorage(StorageKey.USER_INFO);
    },
  },
});
