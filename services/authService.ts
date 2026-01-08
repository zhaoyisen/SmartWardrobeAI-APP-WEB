import { 
  AuthResponse, 
  SendCodeRequest, 
  SmsLoginRequest, 
  EmailRegisterRequest, 
  LoginRequest 
} from '../types';
import { StorageService } from '../utils/storage';

/**
 * API 基础配置
 * 后端 API 基础 URL，可以通过环境变量配置
 * 默认使用相对路径，适用于同域部署
 */
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

/**
 * 后端响应格式
 */
interface Result<T> {
  code?: number;
  message?: string;
  data?: T;
  success?: boolean;
}

/**
 * 通用 API 请求函数（认证相关，不需要Token）
 */
async function authRequest<T>(
  endpoint: string,
  options: RequestInit = {},
  timeout: number = 10000
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    // 构建请求头，明确不包含Authorization
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    
    // 合并用户自定义的headers，但排除Authorization
    if (options.headers) {
      Object.entries(options.headers).forEach(([key, value]) => {
        if (key.toLowerCase() !== 'authorization') {
          headers[key] = value;
        }
      });
    }
    
    console.log('[AuthRequest] 发送请求（无认证）:', { url, method: options.method || 'GET' });
    
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers,
    });
    
    clearTimeout(timeoutId);
    
    console.log('[AuthRequest] 响应状态:', response.status, response.statusText);
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: response.statusText }));
      console.error('[AuthRequest] 请求失败:', { status: response.status, error });
      // 对于认证相关的接口，如果返回401，可能是后端配置问题，给出更友好的提示
      if (response.status === 401) {
        throw new Error(error.message || '该操作不需要登录，但后端返回401错误。请检查后端配置，确保 /api/app/auth/send-code 接口不需要认证');
      }
      throw new Error(error.message || `API request failed: ${response.status}`);
    }

    const result: Result<T> = await response.json();
    
    // 检查是否有错误码（即使状态码是200，也可能有业务错误）
    if (result.code !== undefined && result.code !== 200 && result.code !== 0) {
      throw new Error(result.message || `请求失败: ${result.code}`);
    }
    
    // 处理后端返回的Result格式
    if (result.data !== undefined && result.data !== null) {
      return result.data;
    }
    
    // 如果data是null，说明请求失败
    if (result.data === null) {
      throw new Error(result.message || '请求失败，返回数据为空');
    }
    
    // 如果没有data字段，直接返回result（兼容直接返回数据的情况）
    return result as unknown as T;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('请求超时，请检查网络连接');
    }
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error('无法连接到后端服务，请检查服务器是否运行');
    }
    throw error;
  }
}

/**
 * 发送验证码
 * POST /api/app/auth/send-code
 */
export const sendVerificationCode = async (
  target: string,
  type: 'sms' | 'email'
): Promise<string> => {
  try {
    const request: SendCodeRequest = { target, type };
    console.log('Sending verification code request:', { target, type, endpoint: '/app/auth/send-code' });
    const response = await authRequest<string>('/app/auth/send-code', {
      method: 'POST',
      body: JSON.stringify(request),
    });
    return response || '验证码发送成功';
  } catch (error) {
    console.error('Send verification code failed:', error);
    // 如果是401错误，提示可能是后端配置问题
    if (error instanceof Error && error.message.includes('401')) {
      throw new Error('发送验证码失败：后端可能要求该接口需要认证，请检查后端配置');
    }
    throw error;
  }
};

/**
 * 手机号验证码登录/注册（一体化）
 * POST /api/app/auth/login/sms
 */
export const loginBySms = async (
  phone: string,
  verifyCode: string
): Promise<AuthResponse> => {
  try {
    const request: SmsLoginRequest = { phone, verifyCode };
    const response = await authRequest<AuthResponse>('/app/auth/login/sms', {
      method: 'POST',
      body: JSON.stringify(request),
    });
    
    // 自动保存Token和用户信息
    if (response.token) {
      StorageService.saveToken(response.token);
      StorageService.saveUserInfo({
        userId: response.userId,
        username: response.username,
        phone: phone,
      });
    }
    
    return response;
  } catch (error) {
    console.error('SMS login failed', error);
    throw error;
  }
};

/**
 * 邮箱注册
 * POST /api/app/auth/register/email
 */
export const registerByEmail = async (
  username: string,
  email: string,
  password: string,
  verifyCode: string
): Promise<AuthResponse> => {
  try {
    const request: EmailRegisterRequest = { username, email, password, verifyCode };
    const response = await authRequest<AuthResponse>('/app/auth/register/email', {
      method: 'POST',
      body: JSON.stringify(request),
    });
    
    // 检查响应是否有效
    if (!response || !response.token) {
      throw new Error('注册失败：服务器返回的数据无效');
    }
    
    // 自动保存Token和用户信息
    StorageService.saveToken(response.token);
    StorageService.saveUserInfo({
      userId: response.userId,
      username: response.username,
      email: email,
    });
    
    return response;
  } catch (error) {
    console.error('Email register failed', error);
    throw error;
  }
};

/**
 * 密码登录
 * POST /api/app/auth/login/password
 */
export const loginByPassword = async (
  account: string,
  password: string
): Promise<AuthResponse> => {
  try {
    const request: LoginRequest = { account, password };
    const response = await authRequest<AuthResponse>('/app/auth/login/password', {
      method: 'POST',
      body: JSON.stringify(request),
    });
    
    // 自动保存Token和用户信息
    if (response.token) {
      StorageService.saveToken(response.token);
      StorageService.saveUserInfo({
        userId: response.userId,
        username: response.username,
        email: account.includes('@') ? account : undefined,
        phone: account.includes('@') ? undefined : account,
      });
    }
    
    return response;
  } catch (error) {
    console.error('Password login failed', error);
    throw error;
  }
};

/**
 * 登出
 * 清除本地存储的Token和用户信息
 */
export const logout = (): void => {
  StorageService.clearToken();
  StorageService.clearUserInfo();
};

