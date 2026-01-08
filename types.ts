import React from 'react';

// 衣物分类枚举
export enum ClothingCategory {
  TOP = 'Top',          // 上装
  BOTTOM = 'Bottom',    // 下装
  SHOES = 'Shoes',      // 鞋履
  OUTERWEAR = 'Outerwear', // 外套
  ACCESSORY = 'Accessory', // 配饰
  DRESS = 'Dress'       // 裙装
}

// 单件衣物的数据结构
export interface ClothingItem {
  id: string;           // 唯一标识符
  imageUrl: string;     // 图片数据 (Base64 或 URL)
  category: ClothingCategory; // 分类
  tags: string[];       // 标签列表 (AI分析生成)
  description: string;  // 描述文本
  color: string;        // 主色调
}

// 用户个人资料接口
export interface UserProfile {
  height: number;       // 身高 (cm)
  weight: number;       // 体重 (kg)
  gender: 'male' | 'female' | 'unisex'; // 性别
  stylePreference: string; // 风格偏好
  userPhoto?: string;   // 用户上传的全身照 (Base64)
}

// 聊天消息结构
export interface ChatMessage {
  id: string;
  role: 'user' | 'model'; // 发送者角色
  text: string;           // 消息内容
  isLoading?: boolean;    // 是否正在加载
  attachments?: string[]; // 附件 (如图片URL)
}

// 天气数据结构
export interface WeatherData {
  location: string;    // 地点
  condition: string;   // 天气状况
  temperature: string; // 温度
}

// 穿搭推荐结果结构
export interface OutfitRecommendation {
  items: ClothingItem[]; // 推荐的衣物列表
  explanation: string;   // 推荐理由
}

// 支持的语言类型
export type Language = 'zh' | 'en' | 'ja';

// 模型层级类型 (免费/付费)
export type ModelTier = 'free' | 'paid';

// ========== 认证相关类型 ==========

// 认证响应
export interface AuthResponse {
  token: string;    // JWT 令牌
  userId: number;   // 用户ID
  username: string; // 用户名
}

// 发送验证码请求
export interface SendCodeRequest {
  target: string;  // 接收目标(手机号或邮箱)
  type: 'sms' | 'email'; // 类型: sms 或 email
}

// 手机号验证码登录/注册请求
export interface SmsLoginRequest {
  phone: string;      // 手机号
  verifyCode: string; // 短信验证码
}

// 邮箱注册请求
export interface EmailRegisterRequest {
  username: string;   // 用户名
  email: string;      // 邮箱
  password: string;   // 密码
  verifyCode: string; // 验证码
}

// 密码登录请求
export interface LoginRequest {
  account: string;  // 账号(手机或邮箱)
  password: string; // 密码
}

// 用户信息
export interface UserInfo {
  userId: number;
  username: string;
  email?: string;
  phone?: string;
}

// 全局声明（保留以兼容旧代码，但不再使用）
declare global {
  // 已移除 AIStudio 相关接口，改为直接调用后端 API

  // Add type definitions for React Three Fiber elements to satisfy TypeScript (Global Scope)
  namespace JSX {
    interface IntrinsicElements {
      group: any;
      mesh: any;
      sphereGeometry: any;
      meshStandardMaterial: any;
      capsuleGeometry: any;
      boxGeometry: any;
      ambientLight: any;
      spotLight: any;
    }
  }
}

// Augment React's JSX namespace for stricter type checking environments or newer React versions
declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      group: any;
      mesh: any;
      sphereGeometry: any;
      meshStandardMaterial: any;
      capsuleGeometry: any;
      boxGeometry: any;
      ambientLight: any;
      spotLight: any;
    }
  }
}
