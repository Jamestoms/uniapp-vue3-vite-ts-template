/**
 * 全局环境配置
 *
 * 环境切换方式：
 * 1. dev / build 默认走 development / production；
 * 2. 测试环境通过 --mode 参数切换（见 package.json 中 *:test 脚本），
 *    会加载根目录 .env.test 中的 VITE_APP_ENV=test；
 * 3. 敏感配置（密钥等）建议放在 .env.[mode].local 文件中（已被 .gitignore 忽略）。
 */

/** 环境标识 */
export type EnvType = "development" | "test" | "production";

/** 单个环境的配置项 */
export interface EnvConfig {
  /** 请求前缀（接口基础地址） */
  baseUrl: string;
  /** 请求超时时间（毫秒） */
  timeout: number;
}

/** 各环境配置（按实际后端地址修改） */
const envConfigMap: Record<EnvType, EnvConfig> = {
  development: {
    baseUrl: "https://dev-api.example.com",
    timeout: 10000,
  },
  test: {
    baseUrl: "https://test-api.example.com",
    timeout: 10000,
  },
  production: {
    baseUrl: "https://api.example.com",
    timeout: 10000,
  },
};

/**
 * 当前环境：
 * 优先读取 VITE_APP_ENV（由根目录 .env.[mode] 注入，配合 --mode 脚本切换），
 * 未注入时按 vite 内置的 PROD 标识兜底（dev 命令为 development，build 命令为 production）。
 */
export const currentEnv: EnvType =
  (import.meta.env.VITE_APP_ENV as EnvType | undefined) ??
  (import.meta.env.PROD ? "production" : "development");

/** 当前环境配置 */
export const envConfig: EnvConfig = envConfigMap[currentEnv];
