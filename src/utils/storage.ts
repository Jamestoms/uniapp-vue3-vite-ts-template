/**
 * 本地存储封装（带类型与统一 Key 管理）
 *
 * 用法：
 *   import { getStorage, setStorage, StorageKey } from "@/utils/storage";
 *   setStorage(StorageKey.TOKEN, "xxx");
 *   const token = getStorage<string>(StorageKey.TOKEN, "");
 */

/** 存储 Key 统一管理（新增 Key 在此登记，避免散落各处的魔法字符串） */
export const StorageKey = {
  /** 登录令牌 */
  TOKEN: "token",
  /** 登录手机号 */
  PHONE: "phone",
  /** 用户信息缓存 */
  USER_INFO: "user_info",
} as const;

/** 读取存储（不存在或异常时返回默认值） */
export function getStorage<T>(key: string, defaultValue: T): T {
  try {
    const value = uni.getStorageSync(key);
    // getStorageSync 未命中时返回空字符串
    return value === "" ? defaultValue : (value as T);
  } catch {
    return defaultValue;
  }
}

/** 写入存储（异常仅告警不中断业务） */
export function setStorage(key: string, value: unknown): void {
  try {
    uni.setStorageSync(key, value);
  } catch (error) {
    console.error(`[storage] 写入 ${key} 失败`, error);
  }
}

/** 移除存储 */
export function removeStorage(key: string): void {
  try {
    uni.removeStorageSync(key);
  } catch (error) {
    console.error(`[storage] 移除 ${key} 失败`, error);
  }
}
