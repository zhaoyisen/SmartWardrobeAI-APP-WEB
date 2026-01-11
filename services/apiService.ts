import { ClothingItem, ClothingCategory, Language, ModelTier, UserProfile, AiModelVO, ModelConfig, AiExecutionDTO, ClothingAnalysisVO, DictItem, CategoryItem, CategoryItemRaw } from "../types";
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
 * 业务错误类
 * 用于标识业务逻辑错误（code !== 200），包含原始响应数据
 */
export class BusinessError extends Error {
  public readonly code?: number;
  public readonly reason?: string;
  public readonly rawResponse?: any;

  constructor(message: string, code?: number, reason?: string, rawResponse?: any) {
    super(message);
    this.name = 'BusinessError';
    this.code = code;
    this.reason = reason;
    this.rawResponse = rawResponse;
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
      // 尝试解析错误响应，如果解析失败则使用状态文本
      let errorMessage = response.statusText;
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorData.error || errorData.msg || response.statusText;
      } catch (parseError) {
        // 如果响应不是有效的 JSON，尝试读取文本
        try {
          const text = await response.text();
          if (text) {
            errorMessage = text.length > 200 ? text.substring(0, 200) : text;
          }
        } catch (textError) {
          // 如果文本读取也失败，使用状态文本
          errorMessage = response.statusText || `HTTP ${response.status}`;
        }
      }
      throw new Error(errorMessage || `API request failed: ${response.status}`);
    }

    // 尝试解析响应 JSON，如果解析失败则抛出错误
    try {
      const jsonData = await response.json();
      
      // 检查响应是否包含错误信息（某些后端可能返回 HTTP 200 但 JSON 中包含错误码）
      if (jsonData && typeof jsonData === 'object') {
        // 优先检查 code 字段：如果存在且不是 200，视为错误并显示 message
        // 这是最重要的检查，因为后端可能返回 HTTP 200 但业务逻辑失败（code = 500）
        if (jsonData.code !== undefined && jsonData.code !== 200) {
          const errorMsg = jsonData.message || jsonData.error || jsonData.msg || `请求失败，错误码: ${jsonData.code}`;
          const reason = jsonData.reason;
          throw new BusinessError(errorMsg, jsonData.code, reason, jsonData);
        }
        
        // 检查 success 字段：如果存在且为 false，视为错误
        if (jsonData.success === false) {
          const errorMsg = jsonData.message || jsonData.error || jsonData.msg || 'Operation failed';
          const reason = jsonData.reason;
          throw new BusinessError(errorMsg, undefined, reason, jsonData);
        }
        
        // 如果响应包含 data 字段，返回 data 内容（统一响应格式：{ code: 200, data: {...} }）
        if (jsonData.data !== undefined) {
          // 如果 data 是 null，可能表示没有数据，但不一定是错误（某些接口可能允许返回 null）
          // 这里直接返回 data，让调用方决定如何处理
          return jsonData.data as T;
        }
      }
      
      // 如果没有 data 字段，返回整个响应对象（兼容直接返回数据的格式）
      return jsonData as T;
    } catch (parseError) {
      // 如果是我们主动抛出的错误（检查 code/success 时），直接向上抛出
      if (parseError instanceof Error) {
        throw parseError;
      }
      // 否则是 JSON 解析错误
      console.error('Failed to parse response as JSON:', parseError);
      throw new Error('Invalid response format from server: expected JSON');
    }
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof UnauthorizedError || error instanceof BusinessError) {
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
 * 接口 1: 获取穿搭推荐
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
          image: i.imageUrl, // 图片URL（后端会处理URL到图片的转换）
          category: i.category,
          color: i.color,
          description: i.description,
        })),
        userPhoto: userPhoto,
        tier: tier,
      }),
    });

    // 返回图片URL（后端返回的图片访问地址）
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

/**
 * 接口 6: 获取衣橱列表
 * 从后端获取用户的所有衣物
 * GET /api/app/wardrobe/list
 */
export const getWardrobeList = async (): Promise<ClothingItem[]> => {
  try {
    const response = await apiRequest<ClothingItem[]>('/app/wardrobe/list', {
      method: 'GET',
    });

    // 确保返回的总是数组，即使后端返回了非数组数据
    if (Array.isArray(response)) {
      return response;
    }
    console.warn('Backend returned non-array response, defaulting to empty array:', response);
    return [];
  } catch (error) {
    console.error("Failed to fetch wardrobe list", error);
    // 发生错误时返回空数组而不是抛出错误，避免页面崩溃
    // 调用方可以通过检查数组长度来判断是否成功
    return [];
  }
};

/**
 * 接口 7: 获取AI模型列表
 * 从后端获取可用的AI模型列表
 * GET /api/app/ai-models/list
 */
export const getAiModelList = async (): Promise<AiModelVO[]> => {
  try {
    const response = await apiRequest<AiModelVO[]>('/app/ai-models/list', {
      method: 'GET',
    });

    // 确保返回的总是数组，即使后端返回了非数组数据
    if (Array.isArray(response)) {
      return response;
    }
    console.warn('Backend returned non-array response for model list, defaulting to empty array:', response);
    return [];
  } catch (error) {
    console.error("Failed to fetch AI model list", error);
    // 发生错误时返回空数组而不是抛出错误，避免页面崩溃
    return [];
  }
};

/**
 * 处理 FormData 请求的函数（用于文件上传等场景）
 * 自动添加Authorization头，处理401错误
 */
async function apiRequestFormData<T>(
  endpoint: string,
  formData: FormData,
  timeout: number = 30000
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  
  // 从localStorage获取token
  const token = StorageService.loadToken();
  
  // 构建请求头（FormData 不需要设置 Content-Type，浏览器会自动设置）
  const headers: HeadersInit = {};
  
  // 如果存在token，添加Authorization头
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      body: formData,
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
    
    // 先读取响应文本，以便后续处理（response 只能读取一次）
    let jsonData: any;
    try {
      const responseText = await response.text();
      if (!responseText) {
        throw new Error('Empty response from server');
      }
      jsonData = JSON.parse(responseText);
    } catch (parseError) {
      // JSON 解析失败
      if (!response.ok) {
        throw new Error(response.statusText || `HTTP ${response.status}`);
      }
      console.error('Failed to parse response as JSON:', parseError);
      throw new Error('Invalid response format from server: expected JSON');
    }

    // 检查 HTTP 状态码
    if (!response.ok) {
      // HTTP 状态码不是 200
      const errorMessage = jsonData?.message || jsonData?.error || jsonData?.msg || response.statusText || `HTTP ${response.status}`;
      throw new Error(errorMessage);
    }

    // 检查响应是否包含错误信息（HTTP 200 但业务错误码）
    if (jsonData && typeof jsonData === 'object') {
      // 优先检查 code 字段：如果存在且不是 200，视为错误并显示 message
      if (jsonData.code !== undefined && jsonData.code !== 200) {
        const errorMsg = jsonData.message || jsonData.error || jsonData.msg || `请求失败，错误码: ${jsonData.code}`;
        const reason = jsonData.reason;
        throw new BusinessError(errorMsg, jsonData.code, reason, jsonData);
      }
      
      // 检查 success 字段
      if (jsonData.success === false) {
        const errorMsg = jsonData.message || jsonData.error || jsonData.msg || 'Operation failed';
        const reason = jsonData.reason;
        throw new BusinessError(errorMsg, undefined, reason, jsonData);
      }
      
      // 如果响应包含 data 字段，返回 data 内容
      if (jsonData.data !== undefined) {
        return jsonData.data as T;
      }
    }
    
    // 如果没有 data 字段，返回整个响应对象
    return jsonData as T;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof UnauthorizedError || error instanceof BusinessError) {
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
 * 接口 7.5: AI分析衣物图片
 * 上传图片并调用AI模型进行分析，返回识别结果
 * POST /app/clothing/analyze
 */
export const analyzeClothingImage = async (
  file: File,
  config: AiExecutionDTO
): Promise<ClothingAnalysisVO> => {
  try {
    const formData = new FormData();
    
    // 添加文件
    formData.append('file', file);
    
    // 构建配置对象，确保如果模型不支持思考模式，enableThinking 为 false 或不传递
    const configObj: any = {
      modelKey: config.modelKey,
    };
    
    // 只有当 enableThinking 明确为 true 时才添加
    if (config.enableThinking === true) {
      configObj.enableThinking = true;
      if (config.thinkingBudget !== undefined && config.thinkingBudget > 0) {
        configObj.thinkingBudget = config.thinkingBudget;
      }
    } else {
      // 如果不支持思考模式或未开启，设置为 false
      configObj.enableThinking = false;
    }
    
    // 将配置作为 JSON Blob 添加到 FormData，并设置正确的 Content-Type
    // 使用 Blob 可以确保后端 @RequestPart 能够正确解析为 JSON
    const configBlob = new Blob([JSON.stringify(configObj)], { type: 'application/json' });
    formData.append('config', configBlob);
    
    const response = await apiRequestFormData<ClothingAnalysisVO>('/app/clothing/analyze', formData, 60000);
    
    return response;
  } catch (error) {
    console.error("Failed to analyze clothing image", error);
    throw error;
  }
};

/**
 * 接口 8: 添加衣物到后端
 * 上传图片到后端，后端会进行AI分析并保存
 * POST /api/app/wardrobe/add
 */
export const addClothingItemToBackend = async (
  base64Image: string,
  lang: Language = 'zh',
  tier: ModelTier = 'free',
  modelConfig?: ModelConfig
): Promise<ClothingItem> => {
  try {
    // 确保base64字符串不包含data:image前缀
    const base64Data = base64Image.includes(',') 
      ? base64Image.split(',')[1] 
      : base64Image;

    const requestBody: any = {
      image: base64Data,
      language: lang,
      tier: tier,
    };

    // 如果提供了模型配置，添加到请求体中
    if (modelConfig) {
      requestBody.modelKey = modelConfig.modelKey;
      if (modelConfig.enableThinking !== undefined) {
        requestBody.enableThinking = modelConfig.enableThinking;
      }
      if (modelConfig.thinkingBudget !== undefined && modelConfig.enableThinking) {
        requestBody.thinkingBudget = modelConfig.thinkingBudget;
      }
    }

    const response = await apiRequest<ClothingItem>('/app/wardrobe/add', {
      method: 'POST',
      body: JSON.stringify(requestBody),
    });

    return response;
  } catch (error) {
    console.error("Failed to add clothing item", error);
    throw error;
  }
};

/**
 * 接口 9: 从后端删除衣物
 * DELETE /api/app/wardrobe/:id
 */
export const deleteClothingItemFromBackend = async (id: string): Promise<void> => {
  try {
    await apiRequest<{ success: boolean }>(`/app/wardrobe/${id}`, {
      method: 'DELETE',
    });
  } catch (error) {
    console.error("Failed to delete clothing item", error);
    throw error;
  }
};

/**
 * 接口 10: 获取用户资料
 * GET /api/app/profile
 */
export const getUserProfile = async (): Promise<UserProfile | null> => {
  try {
    const response = await apiRequest<UserProfile>('/app/profile', {
      method: 'GET',
    });

    // 验证返回的数据格式是否符合UserProfile
    if (response && typeof response === 'object') {
      return response as UserProfile;
    }
    console.warn('Backend returned invalid user profile data:', response);
    return null;
  } catch (error) {
    console.error("Failed to fetch user profile", error);
    // 如果用户资料不存在（404）或其他错误，返回null而不是抛出错误
    // 调用方可以通过检查返回值是否为null来判断是否成功
    return null;
  }
};

/**
 * 接口 11: 更新用户资料
 * PUT /api/app/profile
 */
export const updateUserProfile = async (profile: UserProfile): Promise<UserProfile> => {
  try {
    const response = await apiRequest<UserProfile>('/app/profile', {
      method: 'PUT',
      body: JSON.stringify(profile),
    });

    // 验证响应数据的有效性
    if (!response || typeof response !== 'object') {
      throw new Error('Invalid response format from server');
    }

    // 验证基本字段是否存在
    if (typeof response.height !== 'number' || typeof response.weight !== 'number') {
      throw new Error('Invalid user profile data returned from server');
    }

    return response;
  } catch (error) {
    console.error("Failed to update user profile", error);
    // 重新抛出错误，确保调用方能够捕获
    throw error;
  }
};

/**
 * 接口 12: 获取用户的模型能力
 * GET /api/app/profile/model-tier
 * 或者从用户资料接口中获取（如果后端在用户资料中返回modelTier）
 */
export const getModelTier = async (): Promise<ModelTier> => {
  // 首先尝试从专门的接口获取模型能力
  try {
    const response = await apiRequest<{ modelTier: ModelTier }>('/app/profile/model-tier', {
      method: 'GET',
    });

    // 验证响应数据
    if (response && response.modelTier && (response.modelTier === 'free' || response.modelTier === 'paid')) {
      return response.modelTier;
    }
  } catch (error) {
    // 如果专门的接口不存在（如404）或格式不对，尝试从用户资料中获取
    // 忽略第一个接口的错误，继续尝试其他方式
    console.log('Model tier endpoint not available, trying to get from user profile');
  }

  // 如果专门的接口不存在或格式不对，尝试从用户资料中获取
  // 注意：这需要后端在用户资料中返回 modelTier 字段
  try {
    const profile = await getUserProfile();
    if (profile && 'modelTier' in profile && (profile as any).modelTier) {
      const tier = (profile as any).modelTier;
      if (tier === 'free' || tier === 'paid') {
        return tier;
      }
    }
  } catch (error) {
    console.error("Failed to fetch model tier from user profile", error);
  }

  // 如果都获取不到，返回默认值
  console.warn('Could not get model tier from backend, using default "free"');
  return 'free';
};

/**
 * 接口 13: 获取品类列表
 * 从后端获取所有品类
 * GET /api/app/categories/list
 */
export const getCategoryList = async (): Promise<CategoryItem[]> => {
  try {
    const response = await apiRequest<CategoryItemRaw[]>('/app/categories/list', {
      method: 'GET',
    });

    // 确保返回的总是数组，即使后端返回了非数组数据
    if (Array.isArray(response)) {
      // 转换数据格式：categoryCode -> code, categoryDesc -> label
      return response.map(item => ({
        code: item.categoryCode,
        label: item.categoryDesc,
        region: item.region,
        layer: item.layer,
        sort: item.sort,
      }));
    }
    console.warn('Backend returned non-array response for category list, defaulting to empty array:', response);
    return [];
  } catch (error) {
    console.error("Failed to fetch category list", error);
    // 发生错误时返回空数组而不是抛出错误，避免页面崩溃
    return [];
  }
};

/**
 * 接口 14: 获取字典列表
 * 从后端获取指定类型的字典列表
 * GET /api/app/dict/{dictType}
 */
export const getDictList = async (dictType: string): Promise<DictItem[]> => {
  try {
    const response = await apiRequest<any[]>(`/app/dict/${dictType}`, {
      method: 'GET',
    });

    console.log(`Dict ${dictType} response:`, response);

    // 确保返回的总是数组，即使后端返回了非数组数据
    if (Array.isArray(response)) {
      // 尝试不同的字段名组合来适配后端返回格式
      return response.map(item => {
        // 尝试多种可能的字段名
        const dictValue = item.dictValue || item.dict_value || item.code || item.dictCode || item.value || '';
        const dictLabel = item.dictLabel || item.dict_label || item.label || item.dictDesc || item.name || '';
        
        return {
          dictValue: String(dictValue),
          dictLabel: String(dictLabel),
        };
      });
    }
    console.warn(`Backend returned non-array response for dict ${dictType}, defaulting to empty array:`, response);
    return [];
  } catch (error) {
    console.error(`Failed to fetch dict list for ${dictType}`, error);
    // 发生错误时返回空数组而不是抛出错误，避免页面崩溃
    return [];
  }
};

