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
  id: string;           // 唯一标识符（由后端生成）
  imageUrl: string;     // 图片URL（后端返回的图片访问地址，如 /api/app/wardrobe/image/:id）
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
  userPhoto?: string;   // 用户上传的全身照 URL（后端返回的图片访问地址）
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

// ========== AI模型相关类型 ==========

// AI模型信息 (对应后端 AiModelVO)
export interface AiModelVO {
  modelKey: string;              // 模型Key（前端传参标识）
  label: string;                 // 模型展示名称
  modelName: string;             // 底层模型ID（API调用名称）
  baseUrl: string;               // 接口Base URL
  supportThinking: boolean;      // 是否支持思考模式
  maxThinkingBudget?: number;    // 最大允许的思考Token数
  defaultEnableThinking?: boolean; // 默认是否开启思考模式
  defaultThinkingBudget?: number; // 默认思考Token预算
  sort?: number;                 // 排序值
}

// 模型配置（用户选择的配置）
export interface ModelConfig {
  modelKey: string;              // 模型标识
  enableThinking?: boolean;      // 是否开启思考模式
  thinkingBudget?: number;       // 思考Token预算
}

// AI执行参数DTO (对应后端 AiExecutionDTO)
export interface AiExecutionDTO {
  modelKey: string;              // 模型唯一标识Key（必填）
  enableThinking?: boolean;      // 是否开启思考模式（可选，如果不支持思考模式则为false）
  thinkingBudget?: number;       // 思考预算Token数（可选，仅在enableThinking=true时有效）
}

// 字典项接口
export interface DictItem {
  dictValue: string;             // 字典值（代码）
  dictLabel: string;             // 字典标签（显示文本）
}

// 品类项接口（API返回格式）
export interface CategoryItemRaw {
  categoryCode: string;          // 品类代码
  categoryDesc: string;          // 品类标签（显示文本）
  region?: string;               // 默认部位（字典code）
  layer?: string;                // 默认层级（字典code）
  sort?: number;                 // 排序
}

// 品类项接口（前端使用格式）
export interface CategoryItem {
  code: string;                  // 品类代码
  label: string;                 // 品类标签（显示文本）
  region?: string;               // 默认部位（字典code）
  layer?: string;                // 默认层级（字典code）
  sort?: number;                 // 排序
}

// AI智能分析结果VO (对应后端 ClothingAnalysisVO)
export interface ClothingAnalysisVO {
  imageId: number;               // 原始图片ID（保存时需传回）
  imageUrl: string;              // 原始图片URL（用于回显）
  maskImageId?: number;          // AI去底图ID（可能为空）
  maskImageUrl?: string;         // AI去底图URL（可能为空）
  category: string;              // 识别出的品类（存储品类code）
  region: string;                // 自动推断的部位（存储dict_value）
  defaultLayer: number;          // 自动推断的建议层级（存储dict_value对应的数字或字符串）
  color: string;                 // 识别出的主色调（存储dict_value）
  season: string;                // 识别出的季节（存储dict_value，可能逗号分隔多个值）
  fitType: string;               // 识别出的版型（存储dict_value）
  viewType: string;              // 识别出的视角（存储dict_value）
}

// 新增衣物提交参数 DTO (对应后端 ClothingCreateDTO)
// 当 id 为 null 或 undefined 时表示新增，不为 null 时表示编辑
export interface ClothingCreateDTO {
  // 标识字段
  id?: number;                   // 衣物ID（编辑时必填，新增时为空）

  // 核心关联
  imageId: number;               // 原始图片ID（必填）
  maskImageId?: number;          // 分割后图片ID（可选）

  // 核心分类
  category: string;              // 品类（必填）
  region?: string;               // 部位（可选）
  defaultLayer?: number;         // 建议层级（可选）

  // AI 识别属性
  color: string;                 // 主色调（必填）
  season: string;                // 季节（必填）
  fitType?: string;              // 版型（可选）
  viewType?: string;             // 视角（可选）

  // 用户补充信息
  name?: string;                 // 衣物名称（可选）
  shelfNo?: string;              // 货架号（可选）
  price?: number;                // 购买价格（可选）
  purchaseDate?: string;         // 购买日期（可选，格式：YYYY-MM-DD）
  brand?: string;                // 品牌（可选）
  size?: string;                 // 尺码（可选）

  // 状态与统计
  status?: number;               // 初始状态（可选，默认1：在柜）
  wearCount?: number;            // 初始穿着次数（可选，默认0）
}

// 衣物展示对象 VO (对应后端 ClothingVO)
export interface ClothingVO {
  id: number;                    // 衣物ID
  userId: number;                // 所属用户ID
  
  // 核心图片区
  imageId: number;               // 原始图片ID
  imageUrl: string;              // 原始图片URL
  maskImageId?: number;          // AI抠图后的透明底图ID
  maskImageUrl?: string;         // AI抠图后的透明底图URL
  
  // 核心分类
  name?: string;                 // 衣物名称
  region?: string;               // 部位 (TOP, BOTTOM, DRESS, SHOES, ACCESSORY)
  category?: string;             // 具体品类
  defaultLayer?: number;         // 建议层级 (1:Inner, 2:Middle, 3:Outer, 4:Accessory)
  
  // AI 识别属性
  color?: string;                // 主色调
  season?: string;               // 适用季节
  fitType?: string;              // 版型
  viewType?: string;             // 视角
  
  // 用户补充信息
  shelfNo?: string;              // 货架号/收纳位置
  brand?: string;                // 品牌
  size?: string;                 // 尺码
  price?: number;                // 购买价格
  purchaseDate?: string;         // 购买日期 (格式: YYYY-MM-DD)
  
  // 状态与统计
  status?: number;               // 状态 (1:在柜, 2:洗衣中, 3:借出, 0:丢弃)
  wearCount?: number;            // 穿着次数
  
  // 系统字段
  createTime?: string;           // 创建时间
  updateTime?: string;           // 更新时间
}

// 分页结果对象 (对应后端 PageResult<T>)
export interface PageResult<T> {
  records: T[];                  // 当前页数据列表
  total: number;                 // 总记录数
  pages: number;                 // 总页数
  current: number;               // 当前页码
  size: number;                  // 每页条数
}

// 衣物筛选选项 VO (对应后端 ClothingFilterOptionsVO)
export interface ClothingFilterOptionsVO {
  regions?: string[];             // 用户已有的部位列表
  categories?: string[];           // 用户已有的品类列表
  layers?: number[];               // 用户已有的层级列表
  colors?: string[];               // 用户已有的颜色列表
  seasons?: string[];              // 用户已有的季节列表
  fitTypes?: string[];             // 用户已有的版型列表
}

// 衣物查询参数 DTO (对应后端 ClothingQueryDTO)
export interface ClothingQueryDTO {
  region?: string;               // 部位筛选 (TOP, BOTTOM, DRESS, SHOES, ACCESSORY)，为空表示查询全部
  category?: string;              // 品类筛选
  defaultLayer?: number;          // 层级筛选
  color?: string;                 // 颜色筛选
  season?: string;                // 季节筛选
  fitType?: string;               // 版型筛选
  current?: number;              // 当前页码（默认1）
  size?: number;                 // 每页条数（默认10）
}

// 更新衣物提交参数 DTO (对应后端 ClothingUpdateDTO)
export interface ClothingUpdateDTO {
  // 核心分类
  name?: string;                 // 衣物名称（可选）
  category?: string;             // 品类（可选）
  region?: string;               // 部位（可选）
  defaultLayer?: number;         // 建议层级（可选）

  // AI 识别属性
  color?: string;                // 主色调（可选）
  season?: string;               // 季节（可选）
  fitType?: string;              // 版型（可选）
  viewType?: string;             // 视角（可选）

  // 用户补充信息
  shelfNo?: string;              // 货架号（可选）
  brand?: string;                // 品牌（可选）
  size?: string;                 // 尺码（可选）
  price?: number;                // 购买价格（可选）
  purchaseDate?: string;         // 购买日期（可选，格式：YYYY-MM-DD）

  // 状态与统计
  status?: number;               // 状态（可选）
  wearCount?: number;            // 穿着次数（可选）
}

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
