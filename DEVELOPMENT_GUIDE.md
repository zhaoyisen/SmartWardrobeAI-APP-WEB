# SmartWardrobe AI 开发者指南与技术规格

## 1. 项目概述
SmartWardrobe AI 是一个基于 AI 的智能时尚管理应用。它旨在通过 AI 解决用户"不知道怎么穿"、"衣服太多记不住"以及"线上试穿"的需求。

## 2. 前端已实现功能

### 2.1 智能衣橱 (Wardrobe.tsx)
- **批量上传**: 实现了一个排队上传机制，顺序处理图片以防止 API 频率限制。
- **自动分类**: 前端通过 `analyzeClothingImage` 调用 AI，自动提取分类（上装、下装等）、颜色和风格标签。
- **本地化展示**: 支持中、英、日三语切换。

### 2.2 虚拟试穿系统 (TryOn.tsx)
- **3D 预览**: 使用 React Three Fiber 构建。当用户没有上传照片时，显示一个根据身高体重动态缩放的 3D 模特。
- **叠穿逻辑 (Layering Engine)**: 
  - 允许用户选择多件衣物。
  - **核心逻辑**: 前端实现了“叠穿排序”功能。用户可以将衣物标记为“里层”或“外层”。
  - **AI 输入**: 系统会将选中的衣物图片及其“里外”关系生成一段结构化 Prompt 发送给后端/AI。
- **图像合成**: 生成高质量的试穿结果图，支持全屏预览和下载。

### 2.3 AI 搭配师 (StylistChat.tsx)
- **上下文感知**: 聊天时会自动注入用户当前的衣橱清单作为 System Instruction。
- **实时天气增强**: 通过后端 API 获取实时天气信息。
- **可视化建议**: 推荐消息中会附带衣橱中具体衣物的图片。

## 3. 后端 API 接口规格建议

由于你决定自行编写后端，请参考以下接口定义：

### [POST] `/api/wardrobe/analyze`
**描述**: 用于衣物入库时的自动标注。
- **Payload**:
  ```json
  {
    "image": "base64",
    "language": "zh"
  }
  ```
- **AI 模型建议**: 使用速度快、性价比高的 AI 模型。
- **返回数据结构**: `ClothingItem` 的部分字段。

### [POST] `/api/ai/recommend`
**描述**: 基于天气和衣橱的每日穿搭生成。
- **Payload**:
  ```json
  {
    "location": "北京",
    "wardrobe": [ ...items ],
    "userQuery": "我今天要参加面试"
  }
  ```
- **核心逻辑**: 后端需要集成天气 API 服务以获取天气信息。
- **返回数据结构**:
  ```json
  {
    "weather": { "temp": "25℃", "condition": "晴" },
    "recommendation": "建议穿白衬衫搭配西装裤...",
    "selectedItemIds": ["item_1", "item_2"]
  }
  ```

### [POST] `/api/ai/try-on`
**描述**: 最复杂的图像生成接口。
- **Payload**:
  ```json
  {
    "user_photo": "base64?",
    "user_description": "身高165cm的女生",
    "items": [
      {"id": "1", "image": "base64", "layer": "inner"},
      {"id": "2", "image": "base64", "layer": "outer"}
    ]
  }
  ```
- **AI 模型建议**: 使用支持高分辨率图像生成的 AI 模型。
- **提示词工程**: 应包含类似 "Place the inner layer item under the outer layer item, maintain the user's facial features if photo provided" 的指令。

## 4. 技术栈参考
- **Frontend**: React 19, Tailwind CSS, Lucide Icons.
- **3D**: Three.js, @react-three/fiber, @react-three/drei.
- **AI SDK**: 后端应使用相应的 AI SDK 进行模型调用。

## 5. 待办事项 (由你后端实现)
1. 实现持久化数据库 (推荐 PostgreSQL 或 MongoDB)。
2. 实现图片存储服务 (如 S3、OSS)。
3. 将 `services/geminiService.ts` 中的调用逻辑迁移至后端。
