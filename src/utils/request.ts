/**
 * 基于 uni.request 的请求封装
 *
 * 特性：
 * - 自动拼接当前环境请求前缀（见 @/config）
 * - 内置请求拦截（token 注入）、响应拦截（业务码校验）
 * - 支持注册自定义拦截器（useRequestInterceptor / useResponseInterceptor）
 * - 统一错误处理：HTTP 状态码 / 业务码 / 网络异常三类错误统一 toast 并 reject 规范化的 RequestError
 *
 * 用法示例：
 *   import { http } from "@/utils/request";
 *   const user = await http.get<UserInfo>("/user/info", { id: 1 });
 *   await http.post("/login", { username, password }, { loading: true });
 */
import { envConfig } from "@/config";

/** 后端统一响应结构（按实际后端约定调整字段名） */
export interface ApiResponse<T = unknown> {
  code: number;
  message: string;
  data: T;
}

/** 业务成功状态码（按实际后端约定调整） */
const SUCCESS_CODE = 0;

/** 请求方法类型 */
type Method = "GET" | "POST" | "PUT" | "DELETE";

/** 请求配置 */
export interface RequestOptions {
  /** 接口路径：以 / 开头将自动拼接当前环境前缀；以 http(s):// 开头则原样请求 */
  url: string;
  /** 请求方法，默认 GET */
  method?: Method;
  /** URL query 参数 */
  params?: Record<string, unknown>;
  /** 请求体参数（具体结构由各 api 模块的业务类型定义） */
  data?: object | string;
  /** 自定义请求头 */
  header?: Record<string, string>;
  /** 超时时间（毫秒），默认取环境配置 */
  timeout?: number;
  /** 是否显示 loading，默认 false */
  loading?: boolean;
  /** 失败时是否自动 toast 错误提示，默认 true */
  showError?: boolean;
}

/** 统一错误对象（reject 时抛出） */
export interface RequestError extends Error {
  /** HTTP 状态码；网络层错误（断网/超时等）时为 -1 */
  statusCode: number;
  /** 后端业务码 */
  code?: number;
}

/** 自定义请求拦截器 */
export type RequestInterceptor = (options: RequestOptions) => RequestOptions;
/** 自定义响应拦截器（在统一错误处理前执行，可改写响应体） */
export type ResponseInterceptor = (response: ApiResponse<any>) => ApiResponse<any>;

const requestInterceptors: RequestInterceptor[] = [];
const responseInterceptors: ResponseInterceptor[] = [];

/** 注册自定义请求拦截器（在内置 token 注入之后执行） */
export function useRequestInterceptor(fn: RequestInterceptor) {
  requestInterceptors.push(fn);
}

/** 注册自定义响应拦截器 */
export function useResponseInterceptor(fn: ResponseInterceptor) {
  responseInterceptors.push(fn);
}

/** 内置请求拦截：注入登录态请求头 */
function defaultRequestInterceptor(options: RequestOptions): RequestOptions {
  const header: Record<string, string> = { ...options.header };
  const token = uni.getStorageSync("token");
  if (token) {
    header.Authorization = `Bearer ${token}`;
  }
  return { ...options, header };
}

/** 拼接完整请求地址：前缀 + query 参数 */
function buildUrl(url: string, params?: Record<string, unknown>): string {
  const fullUrl = /^https?:\/\//.test(url) ? url : envConfig.baseUrl + url;
  if (!params) {
    return fullUrl;
  }
  const query = Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
    .join("&");
  if (!query) {
    return fullUrl;
  }
  return `${fullUrl}${fullUrl.includes("?") ? "&" : "?"}${query}`;
}

/** 常见 HTTP 状态码错误文案 */
const HTTP_ERROR_MESSAGE: Record<number, string> = {
  400: "请求参数错误",
  401: "登录已过期，请重新登录",
  403: "没有权限访问",
  404: "请求的资源不存在",
  500: "服务器内部错误",
  502: "网关错误",
  503: "服务不可用",
  504: "网关超时",
};

function createError(message: string, statusCode: number, code?: number): RequestError {
  const error = new Error(message) as RequestError;
  error.statusCode = statusCode;
  error.code = code;
  return error;
}

/** 401 统一处理：清除登录态并跳转分包登录页 */
function handleUnauthorized() {
  uni.removeStorageSync("token");
  uni.removeStorageSync("phone");
  uni.reLaunch({ url: "/subpkg-auth/pages/login/index" });
}

/** 核心请求方法 */
function request<T = unknown>(options: RequestOptions): Promise<T> {
  // 合并默认配置，依次执行内置与自定义请求拦截器
  const finalOptions = [defaultRequestInterceptor, ...requestInterceptors].reduce<RequestOptions>(
    (merged, interceptor) => interceptor(merged),
    {
      method: "GET",
      loading: false,
      showError: true,
      ...options,
    }
  );

  /** 统一错误出口：toast 提示 + 控制台留痕 + reject 规范化错误 */
  const rejectUnified = (error: RequestError) => {
    if (finalOptions.showError) {
      uni.showToast({ title: error.message, icon: "none", duration: 2500 });
    }
    console.error(`[request] ${finalOptions.method} ${finalOptions.url}`, error);
    return Promise.reject(error);
  };

  return new Promise<T>((resolve, reject) => {
    if (finalOptions.loading) {
      uni.showLoading({ title: "加载中", mask: true });
    }

    uni.request({
      url: buildUrl(finalOptions.url, finalOptions.params),
      method: finalOptions.method,
      data: finalOptions.data,
      header: finalOptions.header,
      timeout: finalOptions.timeout ?? envConfig.timeout,
      success: (res) => {
        const { statusCode, data } = res;

        // HTTP 层统一错误处理
        if (statusCode === 401) {
          handleUnauthorized();
        }
        if (statusCode < 200 || statusCode >= 300) {
          reject(
            rejectUnified(
              createError(HTTP_ERROR_MESSAGE[statusCode] ?? `请求失败（${statusCode}）`, statusCode)
            )
          );
          return;
        }

        // 业务层：执行自定义响应拦截器
        const response = responseInterceptors.reduce(
          (processed, interceptor) => interceptor(processed),
          data as ApiResponse<T>
        );

        // 业务码统一错误处理
        if (response.code !== SUCCESS_CODE) {
          reject(
            rejectUnified(
              createError(response.message || "请求失败", statusCode, response.code)
            )
          );
          return;
        }
        resolve(response.data);
      },
      fail: (err) => {
        // 网络层统一错误处理（断网、超时、域名无法解析等）
        const isTimeout = /timeout/i.test(err.errMsg);
        reject(
          rejectUnified(
            createError(
              isTimeout ? "请求超时，请稍后重试" : "网络异常，请检查网络设置",
              -1
            )
          )
        );
      },
      complete: () => {
        if (finalOptions.loading) {
          uni.hideLoading();
        }
      },
    });
  });
}

/** 快捷请求方法 */
export const http = {
  get<T = unknown>(
    url: string,
    params?: Record<string, unknown>,
    options?: Partial<RequestOptions>
  ) {
    return request<T>({ ...options, url, method: "GET", params });
  },
  post<T = unknown>(
    url: string,
    data?: object | string,
    options?: Partial<RequestOptions>
  ) {
    return request<T>({ ...options, url, method: "POST", data });
  },
  put<T = unknown>(
    url: string,
    data?: object | string,
    options?: Partial<RequestOptions>
  ) {
    return request<T>({ ...options, url, method: "PUT", data });
  },
  delete<T = unknown>(
    url: string,
    params?: Record<string, unknown>,
    options?: Partial<RequestOptions>
  ) {
    return request<T>({ ...options, url, method: "DELETE", params });
  },
};

export default http;
