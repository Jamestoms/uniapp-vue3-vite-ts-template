import { createSSRApp } from "vue";
import * as Pinia from "pinia";
import uviewPlus from "uview-plus";
import App from "./App.vue";
export function createApp() {
  const app = createSSRApp(App);
  app.use(Pinia.createPinia());
  app.use(uviewPlus);
  return {
    app,
    // uni-app 官方要求：必须将 Pinia 一并返回，否则小程序多实例间无法共享状态
    Pinia,
  };
}
