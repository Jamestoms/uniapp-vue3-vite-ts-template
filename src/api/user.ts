/**
 * 用户模块 API
 *
 * 路径为约定占位，接入真实后端时按实际接口文档调整。
 */
import { http } from "@/utils/request";

/* ============================== 类型定义 ============================== */

/** 微信手机号登录参数 */
export interface WxMobileLoginParams {
  /** uni.login 获取的登录凭证，后端换取 openid */
  loginCode: string;
  /** 手机号快速验证组件返回的动态令牌，后端换取手机号 */
  phoneCode: string;
}

/** 登录结果 */
export interface LoginResult {
  token: string;
  phone: string;
}

/** 用户信息 */
export interface UserInfo {
  id: number;
  nickname: string;
  avatar: string;
  phone: string;
  /** 0-未知 1-男 2-女 */
  gender: 0 | 1 | 2;
}

/** 修改用户信息参数（字段均可选，只传需要修改的） */
export interface UpdateUserParams {
  nickname?: string;
  avatar?: string;
  gender?: 0 | 1 | 2;
}

/** 对象存储预签名上传凭证（后端签发，前端直传） */
export interface PresignedUpload {
  /** 对象存储上传地址（COS/OSS/S3 兼容） */
  uploadUrl: string;
  /** 上传成功后的文件访问地址 */
  fileUrl: string;
  /** 直传时需随表单携带的签名字段（policy/signature 等） */
  formData?: Record<string, string>;
}

/* ============================== 接口方法 ============================== */

/**
 * 微信手机号快速登录
 * POST /user/login/wx-mobile
 */
export function wxMobileLogin(params: WxMobileLoginParams) {
  return http.post<LoginResult>("/user/login/wx-mobile", params, { loading: true });
}

/**
 * 获取当前登录用户信息
 * GET /user/info
 */
export function getUserInfo() {
  return http.get<UserInfo>("/user/info");
}

/**
 * 修改用户信息（昵称/头像/性别）
 * PUT /user/info
 */
export function updateUserInfo(params: UpdateUserParams) {
  return http.put<UserInfo>("/user/info", params);
}

/**
 * 获取头像预签名上传凭证
 * GET /user/avatar/upload-config
 *
 * 头像走对象存储直传：后端仅签发凭证不中转文件，避免占用业务服务器带宽。
 */
export function getAvatarUploadConfig() {
  return http.get<PresignedUpload>("/user/avatar/upload-config");
}

/**
 * 上传头像（对象存储直传）
 *
 * 流程：getAvatarUploadConfig 取预签名凭证 → uni.uploadFile 直传对象存储 → 返回文件访问地址，
 * 随后调用 updateUserInfo({ avatar }) 完成回写。
 * 注意：直传地址为已签名地址，不走 http 封装（无需 token，错误处理独立实现）。
 *
 * @param filePath 本地临时文件路径（uni.chooseImage 返回）
 * @returns 上传成功后的文件访问地址
 */
export function uploadAvatar(filePath: string): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    getAvatarUploadConfig()
      .then((config) => {
        uni.uploadFile({
          url: config.uploadUrl,
          filePath,
          name: "file",
          formData: config.formData,
          success: (res) => {
            if (res.statusCode >= 200 && res.statusCode < 300) {
              resolve(config.fileUrl);
            } else {
              uni.showToast({ title: "头像上传失败", icon: "none" });
              reject(new Error(`对象存储上传失败（${res.statusCode}）`));
            }
          },
          fail: () => {
            uni.showToast({ title: "头像上传失败", icon: "none" });
            reject(new Error("上传网络异常"));
          },
        });
      })
      .catch((error: unknown) => reject(error));
  });
}
