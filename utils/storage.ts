import { Language, UserInfo } from '../types';

// localStorage 键名常量
// 注意：不再存储业务数据（衣橱、用户资料、模型能力），所有业务数据都从后端获取
const STORAGE_KEYS = {
  LANGUAGE: 'smartwardrobe_language',
  TOKEN: 'smartwardrobe_token',
  USER_INFO: 'smartwardrobe_user_info',
} as const;

/**
 * 本地存储工具类
 * 只存储用户偏好设置和认证信息，不存储业务数据（衣橱、用户资料等）
 * 所有业务数据都应该从后端API获取
 */
export class StorageService {

  /**
   * 保存语言设置
   */
  static saveLanguage(lang: Language): void {
    try {
      localStorage.setItem(STORAGE_KEYS.LANGUAGE, lang);
    } catch (error) {
      console.error('Failed to save language:', error);
    }
  }

  /**
   * 加载语言设置
   */
  static loadLanguage(): Language | null {
    try {
      return localStorage.getItem(STORAGE_KEYS.LANGUAGE) as Language | null;
    } catch (error) {
      console.error('Failed to load language:', error);
      return null;
    }
  }


  /**
   * 清空所有存储数据
   */
  static clearAll(): void {
    try {
      Object.values(STORAGE_KEYS).forEach(key => {
        localStorage.removeItem(key);
      });
    } catch (error) {
      console.error('Failed to clear all storage:', error);
    }
  }

  /**
   * 检查 localStorage 是否可用
   */
  static isAvailable(): boolean {
    try {
      const test = '__storage_test__';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 保存认证Token
   */
  static saveToken(token: string): void {
    try {
      localStorage.setItem(STORAGE_KEYS.TOKEN, token);
    } catch (error) {
      console.error('Failed to save token:', error);
    }
  }

  /**
   * 加载认证Token
   */
  static loadToken(): string | null {
    try {
      return localStorage.getItem(STORAGE_KEYS.TOKEN);
    } catch (error) {
      console.error('Failed to load token:', error);
      return null;
    }
  }

  /**
   * 清除认证Token
   */
  static clearToken(): void {
    try {
      localStorage.removeItem(STORAGE_KEYS.TOKEN);
    } catch (error) {
      console.error('Failed to clear token:', error);
    }
  }

  /**
   * 保存用户信息
   */
  static saveUserInfo(userInfo: UserInfo): void {
    try {
      localStorage.setItem(STORAGE_KEYS.USER_INFO, JSON.stringify(userInfo));
    } catch (error) {
      console.error('Failed to save user info:', error);
    }
  }

  /**
   * 加载用户信息
   */
  static loadUserInfo(): UserInfo | null {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.USER_INFO);
      if (!data) return null;
      
      return JSON.parse(data) as UserInfo;
    } catch (error) {
      console.error('Failed to load user info:', error);
      return null;
    }
  }

  /**
   * 清除用户信息
   */
  static clearUserInfo(): void {
    try {
      localStorage.removeItem(STORAGE_KEYS.USER_INFO);
    } catch (error) {
      console.error('Failed to clear user info:', error);
    }
  }
}

