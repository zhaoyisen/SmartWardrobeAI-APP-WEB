
import { GoogleGenAI, Type } from "@google/genai";
import { ClothingItem, ClothingCategory, Language, ModelTier } from "../types";

/**
 * 注意：当前前端直接调用 Gemini API。
 * 如果你要切换到自己的后端，请将此文件中的方法改为 fetch('/api/your-endpoint')。
 */

// 模拟后端图片处理逻辑（实际开发时请移至服务器）
const resizeImage = (base64: string, maxDim: number = 1024): Promise<string> => {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            let { width, height } = img;
            if (width > maxDim || height > maxDim) {
                if (width > height) { height *= maxDim / width; width = maxDim; }
                else { width *= maxDim / height; height = maxDim; }
            }
            canvas.width = width; canvas.height = height;
            canvas.getContext('2d')?.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL('image/jpeg', 0.8));
        };
        img.src = base64;
    });
};

/**
 * 接口 1: 分析衣物 (建议后端实现此逻辑)
 * 使用 gemini-3-flash-preview 或 gemini-3-pro-preview 进行视觉分析并返回 JSON 结果
 */
export const analyzeClothingImage = async (base64Image: string, lang: Language = 'zh', tier: ModelTier = 'free'): Promise<Partial<ClothingItem>> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const model = tier === 'paid' ? 'gemini-3-pro-preview' : 'gemini-3-flash-preview';
  
  try {
    const compressed = await resizeImage(`data:image/png;base64,${base64Image}`, 512);
    const data = compressed.split(',')[1];

    const response = await ai.models.generateContent({
      model: model,
      contents: [
        { inlineData: { mimeType: 'image/jpeg', data } },
        { text: `Analyze this clothing. Return JSON: {category: "Top"|"Bottom"|"Shoes"|"Outerwear"|"Accessory"|"Dress", color: string, description: string, tags: string[]}. Language: ${lang}` }
      ],
      config: { responseMimeType: "application/json" }
    });

    return JSON.parse(response.text || '{}');
  } catch (error) {
    console.error("Analysis failed", error);
    return { category: ClothingCategory.TOP };
  }
};

/**
 * 接口 2: 获取推荐
 * 使用 googleSearch 结合衣橱数据提供基于天气的穿搭推荐
 * 修复了函数签名以匹配 StylistChat.tsx 中的 5 个参数调用
 */
export const getOutfitRecommendation = async (wardrobe: ClothingItem[], userPrompt: string, location: string, lang: Language = 'zh', tier: ModelTier = 'free') => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const model = tier === 'paid' ? 'gemini-3-pro-preview' : 'gemini-3-flash-preview';

  const prompt = `Current Location: ${location}. 
  User Request: ${userPrompt}. 
  My Wardrobe (JSON format): ${JSON.stringify(wardrobe.map(i => ({ id: i.id, description: i.description, category: i.category, color: i.color })))}.
  Task: Search for current weather in ${location}. Based on the weather and my wardrobe, suggest an outfit.
  Response MUST be in JSON format: {
    "weatherInfo": { "location": string, "condition": string, "temperature": string },
    "recommendationText": string (in ${lang}),
    "selectedItemIds": string[] (IDs from the wardrobe)
  }`;

  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
      config: { 
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            weatherInfo: {
              type: Type.OBJECT,
              properties: {
                location: { type: Type.STRING },
                condition: { type: Type.STRING },
                temperature: { type: Type.STRING }
              },
              required: ["location", "condition", "temperature"]
            },
            recommendationText: { type: Type.STRING },
            selectedItemIds: { type: Type.ARRAY, items: { type: Type.STRING } }
          },
          required: ["weatherInfo", "recommendationText", "selectedItemIds"]
        }
      }
    });

    return JSON.parse(response.text || '{}');
  } catch (error) {
    console.error("Recommendation failed", error);
    throw error;
  }
};

/**
 * 接口 3: 与搭配师聊天
 * 实现了 StylistChat.tsx 中调用的 chatWithStylist 成员
 */
export const chatWithStylist = async (history: any[], message: string, wardrobeContext: string, lang: Language = 'zh', tier: ModelTier = 'free'): Promise<string> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const model = tier === 'paid' ? 'gemini-3-pro-preview' : 'gemini-3-flash-preview';

    const systemInstruction = `You are a professional fashion stylist. 
    User's wardrobe items: ${wardrobeContext}. 
    Preferred language: ${lang}. 
    Provide fashion pairings, style tips, and answers to user questions. Keep advice concise and trendy.`;

    const response = await ai.models.generateContent({
        model: model,
        contents: [
            ...history,
            { role: 'user', parts: [{ text: message }] }
        ],
        config: { systemInstruction }
    });

    return response.text || "";
};

/**
 * 接口 4: 生成试穿
 * 使用 gemini-2.5-flash-image 或 gemini-3-pro-image-preview 进行图像生成
 * 修复了函数签名以匹配 TryOn.tsx 中的 4 个参数调用
 */
export const generateTryOnImage = async (userDesc: string, items: ClothingItem[], userPhoto?: string, tier: ModelTier = 'free'): Promise<string | null> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    // 专业版使用 gemini-3-pro-image-preview，普通版使用 gemini-2.5-flash-image
    const model = tier === 'paid' ? 'gemini-3-pro-image-preview' : 'gemini-2.5-flash-image';
    
    const itemDescs = items.map(i => `${i.category} (${i.color}): ${i.description}`).join(', ');
    const prompt = `Fashion virtual try-on. A model described as "${userDesc}" wearing the following items from their wardrobe: ${itemDescs}. Provide a high-quality studio fashion photo.`;

    const parts: any[] = [{ text: prompt }];
    if (userPhoto) {
        // 如果有用户照片，作为基础参考
        const data = userPhoto.includes(',') ? userPhoto.split(',')[1] : userPhoto;
        parts.unshift({ inlineData: { mimeType: 'image/jpeg', data } });
    }

    try {
        const response = await ai.models.generateContent({
            model: model,
            contents: { parts },
            config: {
                imageConfig: {
                    aspectRatio: "3:4",
                    imageSize: tier === 'paid' ? "1K" : undefined
                }
            }
        });

        // 遍历 parts 找到包含图像数据的部分
        for (const part of response.candidates?.[0]?.content?.parts || []) {
            if (part.inlineData) {
                return `data:image/png;base64,${part.inlineData.data}`;
            }
        }
        return null;
    } catch (e) {
        console.error("Try-on generation failed", e);
        return null;
    }
};

/**
 * 验证专业版模型访问权限
 * 实现了 App.tsx 中调用的 validateProModelAccess 成员
 */
export const validateProModelAccess = async (): Promise<boolean> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    try {
        // 尝试调用 Pro 模型以验证 API Key 权限
        await ai.models.generateContent({
            model: 'gemini-3-pro-preview',
            contents: 'ping',
            config: { maxOutputTokens: 1 }
        });
        return true;
    } catch (e) {
        console.error("Pro validation failed", e);
        return false;
    }
};
