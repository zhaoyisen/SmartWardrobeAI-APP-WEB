import { ClothingItem, UserProfile, Language, ModelTier, UserInfo } from '../types';

// localStorage 键名常量
const STORAGE_KEYS = {
  WARDROBE: 'smartwardrobe_wardrobe',
  USER_PROFILE: 'smartwardrobe_user_profile',
  LANGUAGE: 'smartwardrobe_language',
  MODEL_TIER: 'smartwardrobe_model_tier',
  TOKEN: 'smartwardrobe_token',
  USER_INFO: 'smartwardrobe_user_info',
} as const;

/**
 * 本地存储工具类
 * 提供数据持久化功能，使用 localStorage 保存用户数据
 */
export class StorageService {
  /**
   * 保存衣橱数据到本地存储
   */
  static saveWardrobe(items: ClothingItem[]): void {
    try {
      // 注意：Base64 图片数据可能很大，localStorage 有 5-10MB 限制
      // 如果数据过大，可以考虑只保存元数据，图片使用 IndexedDB
      const data = JSON.stringify(items);
      if (data.length > 4 * 1024 * 1024) {
        console.warn('Wardrobe data is large, consider using IndexedDB for images');
      }
      localStorage.setItem(STORAGE_KEYS.WARDROBE, data);
    } catch (error) {
      console.error('Failed to save wardrobe:', error);
      // 如果存储失败（可能是配额超限），尝试清理旧数据
      if (error instanceof DOMException && error.name === 'QuotaExceededError') {
        console.warn('Storage quota exceeded, clearing old data');
        this.clearWardrobe();
      }
    }
  }

  /**
   * 从本地存储加载衣橱数据
   */
  static loadWardrobe(): ClothingItem[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.WARDROBE);
      if (!data) return [];
      
      const items = JSON.parse(data) as ClothingItem[];
      // 验证数据格式
      if (Array.isArray(items)) {
        return items;
      }
      return [];
    } catch (error) {
      console.error('Failed to load wardrobe:', error);
      return [];
    }
  }

  /**
   * 清空衣橱数据
   */
  static clearWardrobe(): void {
    try {
      localStorage.removeItem(STORAGE_KEYS.WARDROBE);
    } catch (error) {
      console.error('Failed to clear wardrobe:', error);
    }
  }

  /**
   * 保存用户资料
   */
  static saveUserProfile(profile: UserProfile): void {
    try {
      localStorage.setItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify(profile));
    } catch (error) {
      console.error('Failed to save user profile:', error);
    }
  }

  /**
   * 加载用户资料
   */
  static loadUserProfile(): UserProfile | null {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.USER_PROFILE);
      if (!data) return null;
      
      return JSON.parse(data) as UserProfile;
    } catch (error) {
      console.error('Failed to load user profile:', error);
      return null;
    }
  }

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
   * 保存模型等级设置
   */
  static saveModelTier(tier: ModelTier): void {
    try {
      localStorage.setItem(STORAGE_KEYS.MODEL_TIER, tier);
    } catch (error) {
      console.error('Failed to save model tier:', error);
    }
  }

  /**
   * 加载模型等级设置
   */
  static loadModelTier(): ModelTier | null {
    try {
      return localStorage.getItem(STORAGE_KEYS.MODEL_TIER) as ModelTier | null;
    } catch (error) {
      console.error('Failed to load model tier:', error);
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

