# uniapp-vue3-vite-ts-template

基于 uni-app + Vue 3 + TypeScript 的微信小程序项目，多端编译支持（当前以微信小程序为主，兼容 H5），开箱即用，省去你搭建基础框架的时间，直接投入开发

## 技术栈

| 分类 | 选型 |
| --- | --- |
| 框架 | uni-app（Vue 3.4+，Composition API + `<script setup>`） |
| 语言 | TypeScript 5.9（vue-tsc 2.x 类型检查） |
| UI 组件库 | uview-plus 3.x（组件前缀 `up-`） |
| 状态管理 | Pinia（登录态等全局状态） |
| 请求 | 基于 `uni.request` 自封装（拦截器 + 统一错误处理） |
| 日期处理 | dayjs |
| 构建 | Vite 5（@dcloudio/vite-plugin-uni） |
| 包管理 | **pnpm（必须）** |

## 环境要求

- Node.js ≥ 18
- pnpm ≥ 8（**请勿使用 npm / yarn 安装依赖**）
- 微信开发者小程序工具（运行小程序产物）

> **pinia 锁定 2.1.7**（与 uni-app 内置版本对齐）：pinia 3/4 的构建产物与 uni 编译链不兼容（如 4.x 的
> `nostics` 依赖无法解析）。用法遵循 [uni-app 官方文档](https://uniapp.dcloud.net.cn/tutorial/vue3-pinia.html)：
> main.ts 必须 `return { app, Pinia }`（将 Pinia 一并返回），否则小程序多实例间无法共享状态。

## 快速开始

```bash
# 安装依赖（必须使用 pnpm）
pnpm install

# 启动 H5 开发服务（浏览器预览）
pnpm dev:h5

# 启动微信小程序开发模式（产物在 dist/dev/mp-weixin，用微信开发者工具导入该目录）
pnpm dev:mp-weixin
```

## 开发与构建命令

### 开发（dev）

```bash
pnpm dev:h5                # H5 开发服务
pnpm dev:mp-weixin         # 微信小程序开发模式
```

### 构建（build）

```bash
pnpm build:h5              # H5 正式构建 → dist/build/h5
pnpm build:mp-weixin       # 微信小程序正式构建 → dist/build/mp-weixin
```

其余平台（支付宝/百度/抖音等）脚本见 `package.json`，规则一致：`dev:mp-*` / `build:mp-*`。

### 多环境切换

项目内置三套环境（开发 / 测试 / 正式），由根目录 `.env.[mode]` 文件注入 `VITE_APP_ENV`：

| 环境 | 标识 | 使用方式 |
| --- | --- | --- |
| 开发 | `development` | `pnpm dev:*` 默认 |
| 测试 | `test` | 命令追加 `:test`，如 `pnpm build:mp-weixin:test` |
| 正式 | `production` | `pnpm build:*` 默认 |

各环境的接口前缀（baseUrl）配置在 `src/config/index.ts`，**接入真实后端时修改此处**：

```ts
const envConfigMap: Record<EnvType, EnvConfig> = {
  development: { baseUrl: "https://dev-api.example.com", timeout: 10000 },
  test:        { baseUrl: "https://test-api.example.com", timeout: 10000 },
  production:  { baseUrl: "https://api.example.com",      timeout: 10000 },
};
```

敏感配置（密钥等）放在 `.env.[mode].local`（已被 .gitignore 忽略），通过 `import.meta.env.VITE_xxx` 读取。

## 目录结构

```
├── src/
│   ├── api/                    # API 层：所有后端接口模块（按业务域拆分）
│   │   └── user.ts             #   用户模块（登录/信息修改/头像上传）
│   ├── config/
│   │   └── index.ts            # 环境配置（请求前缀、超时）
│   ├── stores/                 # Pinia 全局状态
│   │   └── user.ts             #   用户登录态（token/手机号/用户信息）
│   ├── pages/                  # 主包页面（仅 tabBar 页面）
│   │   ├── index/              #   首页（自定义导航栏）
│   │   ├── tab2/               #   分类（占位）
│   │   ├── tab3/               #   发现（占位）
│   │   └── mine/               #   我的
│   ├── subpkg-auth/            # 登录分包（登录页、用户协议页）
│   ├── subpkg-common/          # 通用分包（低频功能页，持续扩展）
│   ├── static/                 # 静态资源（tabBar 图标等）
│   ├── utils/
│   │   ├── request.ts          # 请求封装（拦截器 + 统一错误处理）
│   │   ├── validate.js         # 表单验证规则库（+ validate.d.ts）
│   │   ├── storage.ts          # 本地存储封装（typed + Key 统一管理）
│   │   ├── router.ts           # 跳转封装（需登录页面拦截）
│   │   ├── wechat.ts           # 微信能力（支付/订阅消息）
│   │   └── ...
│   ├── App.vue                 # 应用入口（引入 uview-plus 全局样式）
│   ├── main.ts                 # 应用启动（注册 uview-plus）
│   ├── pages.json              # 页面路由 / tabBar / 分包配置
│   └── uni.scss                # 全局样式变量（引入 uview-plus 主题）
├── .env.development / .env.test / .env.production
└── package.json
```

## 公用模块

### 状态管理（Pinia）

全局状态定义在 `src/stores/`，已在 `main.ts` 按官方写法注册（`import * as Pinia from "pinia"` 并将
`Pinia` 随 `createApp` 返回，这是 uni-app 的硬性要求）。**登录态唯一数据源为 user store**，页面禁止直接读写 token/phone 的 storage：

```ts
import { storeToRefs } from "pinia";
import { useUserStore } from "@/stores/user";

const userStore = useUserStore();
const { isLoggedIn, maskedPhone } = storeToRefs(userStore); // 响应式取值

userStore.setLoginInfo(token, phone); // 登录写入（自动持久化 storage）
userStore.clearLogin();                // 退出/失效清除
```

新增全局状态（购物车、预订草稿等）时在 `stores/` 下新建模块。

### 微信能力封装（`@/utils/wechat`）

支付参数由后端统一下单接口返回，前端不拼接签名：

```ts
import { wxPay, wxSubscribeMessage, type WxPayParams } from "@/utils/wechat";

try {
  await wxPay(payParams);              // 调起微信支付（仅小程序端）
} catch (e) {
  // "已取消支付" / "支付失败，请重试"
}

// 订阅消息（赛事预约提醒等，需用户手势触发，模板 id 在公众平台申请）
const accepted = await wxSubscribeMessage(["TMPL_ID_XXX"]);
```

### 本地存储（`@/utils/storage`）

```ts
import { getStorage, setStorage, removeStorage, StorageKey } from "@/utils/storage";

setStorage(StorageKey.USER_INFO, info);          // 写入
const info = getStorage<UserInfo>(StorageKey.USER_INFO, null); // 读取（带类型与默认值）
```

新增 Key 在 `StorageKey` 中登记，不要散落魔法字符串。

### 需登录页面跳转（`@/utils/router`）

uni-app 无路由守卫，需登录的页面用封装跳转（未登录自动提示并转登录页，登录后回跳）：

```ts
import { navigateToNeedLogin } from "@/utils/router";

navigateToNeedLogin("/subpkg-mall/pages/order/detail?id=1");
```

### 请求封装（`@/utils/request`）

所有请求经由 `http` 对象发出，自动拼接环境前缀、注入 token、统一处理错误：

```ts
import { http } from "@/utils/request";

// GET：第二参数为 query
const user = await http.get<UserInfo>("/user/info");

// POST：第二参数为请求体
await http.post<LoginResult>("/user/login/wx-mobile", { loginCode, phoneCode });

// 请求选项：loading / showError（错误是否自动 toast）
await http.post("/order/submit", payload, { loading: true, showError: false });
```

行为约定：

- **请求拦截**：自动从 user store 读取 token 并注入 `Authorization: Bearer <token>`
- **响应约定**：后端返回 `{ code, message, data }`，`code === 0` 视为成功，其余统一 toast `message` 并 reject；字段约定与成功码在 `request.ts` 顶部按后端实际调整
- **错误分类**：HTTP 状态码错误（400/401/404/500 等有中文文案）、业务码错误、网络异常（断网/超时）三类，统一 reject `RequestError { statusCode, code, message }`，页面 catch 后只需写业务逻辑
- **401 处理**：自动清除登录态并 `reLaunch` 到登录页
- **扩展拦截器**：`useRequestInterceptor(fn)` / `useResponseInterceptor(fn)` 注册全局拦截

### 表单验证（`@/utils/validate`）

配合 uview-plus 表单（内部为 async-validator）使用，规则与必填分离（空值放行交给 `required`）：

```ts
import { validators, minLenRule, maxLenRule, decimalRule } from "@/utils/validate";

const rules = {
  realName: [
    { required: true, message: "请输入姓名", trigger: ["blur", "change"] },
    { validator: validators.chineseName, trigger: ["blur"] },
  ],
  price:  [{ validator: decimalRule(2), trigger: ["blur"] }],  // 最多 2 位小数
  remark: [{ validator: minLenRule(5), trigger: ["blur"] }],
};
```

可用规则：中文姓名、手机号、座机、座机或手机、身份证（15/18 位含校验码）、整数/正整数、小数（限位数）、金额、长度、邮箱、邮编、车牌（含新能源）、微信号、QQ。

也可直接调用断言函数：`isMobile("13812345678") // true`。完整演示见 `/subpkg-common/pages/validate/index`。

### 日期处理（dayjs）

**日期时间统一使用 dayjs**，不要手写时间格式化：

```ts
import dayjs from "dayjs";

dayjs().format("YYYY-MM-DD HH:mm:ss");        // 2026-08-17 10:30:00
dayjs("2026-08-17").format("MM月DD日");        // 08月17日
dayjs().add(7, "day").format("YYYY-MM-DD");   // 一周后
dayjs().subtract(1, "hour").valueOf();        // 一小时前时间戳
```

### 环境信息（`@/config`）

```ts
import { currentEnv, envConfig } from "@/config";

currentEnv;        // "development" | "test" | "production"
envConfig.baseUrl; // 当前环境请求前缀
```

## API 层规范

**所有后端接口必须定义在 `src/api/` 目录**，页面/组件中禁止内联写请求路径：

```ts
// src/api/order.ts —— 新增业务模块示例
import { http } from "@/utils/request";

export interface OrderItem { id: number; title: string }

export function getOrderList(params: { page: number; size: number }) {
  return http.get<OrderItem[]>("/order/list", params);
}
```

页面中调用：

```ts
import { getOrderList } from "@/api/order";

const list = await getOrderList({ page: 1, size: 10 });
```

现有模块：`@/api/user`（`wxMobileLogin` / `getUserInfo` / `updateUserInfo` / `uploadAvatar` 等）。

文件上传走对象存储直传：后端签发预签名凭证（`getAvatarUploadConfig`）→ `uni.uploadFile` 直传 → `updateUserInfo({ avatar })` 回写，业务服务器不中转文件。

## UI 组件（uview-plus）

组件已全局注册，模板中直接使用 `up-` 前缀（easycom 按需加载，无需 import）：

```html
<up-button type="primary" text="按钮" @click="onClick"></up-button>
<up-form :model="form" :rules="rules">...</up-form>
```

工具方法通过 `uni.$u` 调用（如 `uni.$u.toast("提示")`）。

相关配置（已就绪，勿重复修改）：

- `main.ts`：`app.use(uviewPlus)`
- `uni.scss`：`@import 'uview-plus/theme.scss'`
- `App.vue`：`@import 'uview-plus/index.scss'`
- `pages.json`：easycom 规则（`up-` / `u-` / `u--` 前缀）
- sass 版本锁定 `1.63.2`（uview-plus 未迁移 `@use` 语法，勿升级）

组件文档：https://uview-plus.jiangruyi.com

## 页面与分包

微信小程序限制：**tabBar 页面必须在主包；主包与单个分包均 ≤ 2M**。本项目约定：

- `src/pages/`：仅放 4 个 tab 页（首页/分类/发现/我的）
- `src/subpkg-auth/`：登录相关（登录页、用户协议页）
- `src/subpkg-common/`：通用分包（表单演示页等低频页面）
- 新增页面：一律放分包（按业务新建 `subpkg-xxx`），并在 `pages.json` 的 `subPackages` 注册；进入高频入口页时可在 `preloadRule` 配置分包预下载
- 静态资源：分包内用到的静态资源放在分包目录下通过相对路径引用，禁止把静态资源全都放在主目录下

跳转分包页面使用绝对路径：

```ts
uni.navigateTo({ url: "/subpkg-auth/pages/login/index" });
```

注意：`pages.json` 中**不要写注释**（uni 编译器支持，但 IDE 按 JSON 校验会报错）。

## TypeScript 约定

- 已启用 `verbatimModuleSyntax`：**纯类型导入必须写 `import type`**

  ```ts
  import { wxMobileLogin, type WxMobileLoginParams } from "@/api/user";
  ```

- 类型检查：`pnpm type-check`（等价 `vue-tsc --noEmit`），提交前建议通过
- 导入 JS 工具模块需配套同名 `.d.ts`（如 `validate.js` / `validate.d.ts`）

## 常见问题

| 问题 | 说明 |
| --- | --- |
| 手机号一键登录拿不到 code | 微信手机号快速验证组件需**企业认证小程序**并在后台开通（按次收费），个人号不可用 |
| `up-xxx` 组件不生效 | easycom 修改后需重启 dev 服务 |
| 请求 401 | 自动清登录态并跳转登录页，无需页面处理 |
| 安装依赖用了 npm | 删掉 node_modules 与锁文件，改用 `pnpm install` |
