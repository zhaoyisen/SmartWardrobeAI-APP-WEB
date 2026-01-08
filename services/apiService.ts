import { ClothingItem, ClothingCategory, Language, ModelTier } from "../types";
import { StorageService } from "../utils/storage";

/**
 * API 基础配置
 * 后端 API 基础 URL，可以通过环境变量配置
 * 默认使用相对路径，适用于同域部署
 */
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

/**
 * 未授权错误类
 * 用于标识401错误，触发登录流程
 */
export class UnauthorizedError extends Error {
  constructor(message: string = '未授权，请先登录') {
    super(message);
    this.name = 'UnauthorizedError';
  }
}

/**
 * 未授权回调函数
 * 当API请求返回401时，会调用此函数
 */
let onUnauthorizedCallback: (() => void) | null = null;

/**
 * 设置未授权回调
 * 在AuthContext中调用此函数设置回调
 */
export const setUnauthorizedCallback = (callback: () => void) => {
  onUnauthorizedCallback = callback;
};

/**
 * 通用 API 请求函数
 * 自动添加Authorization头，处理401错误
 */
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {},
  timeout: number = 10000
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  
  // 从localStorage获取token
  const token = StorageService.loadToken();
  
  // 构建请求头
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };
  
  // 如果存在token，添加Authorization头
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers,
    });
    
    clearTimeout(timeoutId);
    
    // 处理401未授权错误
    if (response.status === 401) {
      // 清除本地存储的token和用户信息
      StorageService.clearToken();
      StorageService.clearUserInfo();
      
      // 触发未授权回调
      if (onUnauthorizedCallback) {
        onUnauthorizedCallback();
      }
      
      throw new UnauthorizedError('登录已过期，请重新登录');
    }
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: response.statusText }));
      throw new Error(error.message || `API request failed: ${response.status}`);
    }

    return response.json();
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof UnauthorizedError) {
      throw error;
    }
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Request timeout. Please check your connection.');
    }
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error('Cannot connect to backend service. Please check if the server is running.');
    }
    throw error;
  }
}

/**
 * 接口 1: 分析衣物
 * 调用后端 API 进行衣物图像分析
 */
export const analyzeClothingImage = async (
  base64Image: string,
  lang: Language = 'zh',
  tier: ModelTier = 'free'
): Promise<Partial<ClothingItem>> => {
  try {
    const response = await apiRequest<Partial<ClothingItem>>('/app/wardrobe/analyze', {
      method: 'POST',
      body: JSON.stringify({
        image: base64Image,
        language: lang,
        tier: tier,
      }),
    });

    return response;
  } catch (error) {
    console.error("Analysis failed", error);
    // 返回默认值，避免应用崩溃
    return { category: ClothingCategory.TOP };
  }
};

/**
 * 接口 2: 获取穿搭推荐
 * 调用后端 API 获取基于天气的穿搭推荐
 * POST /api/app/ai/recommend
 */
export const getOutfitRecommendation = async (
  wardrobe: ClothingItem[],
  userPrompt: string,
  location: string,
  lang: Language = 'zh',
  tier: ModelTier = 'free'
) => {
  try {
    const response = await apiRequest<{
      weatherInfo: {
        location: string;
        condition: string;
        temperature: string;
      };
      recommendationText: string;
      selectedItemIds: string[];
    }>('/app/ai/recommend', {
      method: 'POST',
      body: JSON.stringify({
        location,
        wardrobe: wardrobe.map(i => ({
          id: i.id,
          description: i.description,
          category: i.category,
          color: i.color,
        })),
        userQuery: userPrompt,
        language: lang,
        tier: tier,
      }),
    });

    return response;
  } catch (error) {
    console.error("Recommendation failed", error);
    throw error;
  }
};

/**
 * 接口 3: 与搭配师聊天
 * 调用后端 API 进行对话
 * POST /api/app/ai/chat
 */
export const chatWithStylist = async (
  history: any[],
  message: string,
  wardrobeContext: string,
  lang: Language = 'zh',
  tier: ModelTier = 'free'
): Promise<string> => {
  try {
    const response = await apiRequest<{ text: string }>('/app/ai/chat', {
      method: 'POST',
      body: JSON.stringify({
        history,
        message,
        wardrobeContext,
        language: lang,
        tier: tier,
      }),
    });

    return response.text || "";
  } catch (error) {
    console.error("Chat failed", error);
    throw error;
  }
};

/**
 * 接口 4: 生成试穿图像
 * 调用后端 API 生成虚拟试穿效果图
 * POST /api/app/ai/try-on
 */
export const generateTryOnImage = async (
  userDesc: string,
  items: ClothingItem[],
  userPhoto?: string,
  tier: ModelTier = 'free'
): Promise<string | null> => {
  try {
    const response = await apiRequest<{ imageUrl: string }>('/app/ai/try-on', {
      method: 'POST',
      body: JSON.stringify({
        userDescription: userDesc,
        items: items.map(i => ({
          id: i.id,
          image: i.imageUrl,
          category: i.category,
          color: i.color,
          description: i.description,
        })),
        userPhoto: userPhoto,
        tier: tier,
      }),
    });

    // 返回 Base64 图片数据
    return response.imageUrl || null;
  } catch (error) {
    console.error("Try-on generation failed", error);
    return null;
  }
};

/**
 * 接口 5: 验证专业版模型访问权限
 * 调用后端 API 验证 Pro 模型访问权限
 * POST /api/app/ai/validate-pro
 */
export const validateProModelAccess = async (): Promise<boolean> => {
  try {
    const response = await apiRequest<{ valid: boolean }>('/app/ai/validate-pro', {
      method: 'POST',
    });

    return response.valid || false;
  } catch (error) {
    console.error("Pro validation failed", error);
    return false;
  }
};

