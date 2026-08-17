/// <reference types="vite/client" />
/// <reference types="uview-plus/types" />

/** 补充 VITE_ 环境变量的类型声明（与 vite/client 中的 ImportMetaEnv 接口合并） */
interface ImportMetaEnv {
  /** 应用运行环境标识，由根目录 .env.[mode] 注入 */
  readonly VITE_APP_ENV?: "development" | "test" | "production";
}

declare module '*.vue' {
  import { DefineComponent } from 'vue'
  // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/ban-types
  const component: DefineComponent<{}, {}, any>
  export default component
}
