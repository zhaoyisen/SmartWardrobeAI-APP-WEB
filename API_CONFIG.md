# API 配置说明

## 后端 API 端点

前端已重构为调用后端 API，所有 AI 相关逻辑已移至后端。

### API 基础 URL 配置

在 `.env.local` 文件中配置后端 API 地址：

```env
VITE_API_BASE_URL=http://localhost:9090/api
```

**注意**：后端服务默认运行在 9090 端口。

如果不配置，默认使用相对路径 `/api`（适用于同域部署）。

### API 端点列表

#### 1. 分析衣物图像
**POST** `/api/app/wardrobe/analyze`

**请求体：**
```json
{
  "image": "base64字符串",
  "language": "zh" | "en" | "ja",
  "tier": "free" | "paid"
}
```

**响应：**
```json
{
  "category": "Top" | "Bottom" | "Shoes" | "Outerwear" | "Accessory" | "Dress",
  "color": "string",
  "description": "string",
  "tags": ["string"]
}
```

---

#### 2. 获取穿搭推荐
**POST** `/api/app/ai/recommend`

**请求体：**
```json
{
  "location": "城市名称",
  "wardrobe": [
    {
      "id": "string",
      "description": "string",
      "category": "string",
      "color": "string"
    }
  ],
  "userQuery": "用户查询文本",
  "language": "zh" | "en" | "ja",
  "tier": "free" | "paid"
}
```

**响应：**
```json
{
  "weatherInfo": {
    "location": "string",
    "condition": "string",
    "temperature": "string"
  },
  "recommendationText": "推荐文本",
  "selectedItemIds": ["string"]
}
```

---

#### 3. 搭配师聊天
**POST** `/api/app/ai/chat`

**请求体：**
```json
{
  "history": [
    {
      "role": "user" | "model",
      "parts": [{"text": "消息内容"}]
    }
  ],
  "message": "当前用户消息",
  "wardrobeContext": "衣橱上下文字符串",
  "language": "zh" | "en" | "ja",
  "tier": "free" | "paid"
}
```

**响应：**
```json
{
  "text": "AI 回复文本"
}
```

---

#### 4. 生成试穿图像
**POST** `/api/app/ai/try-on`

**请求体：**
```json
{
  "userDescription": "用户描述，如：A 170cm tall, 65kg female model",
  "items": [
    {
      "id": "string",
      "image": "base64图片数据",
      "category": "string",
      "color": "string",
      "description": "string"
    }
  ],
  "userPhoto": "base64图片数据（可选）",
  "tier": "free" | "paid"
}
```

**响应：**
```json
{
  "imageUrl": "data:image/png;base64,..."
}
```

---

#### 5. 验证 Pro 模型权限
**POST** `/api/app/ai/validate-pro`

**请求体：** 无（使用请求头中的认证信息）

**响应：**
```json
{
  "valid": true | false
}
```

---

## 错误处理

所有 API 端点应返回标准的 HTTP 状态码：
- `200` - 成功
- `400` - 请求参数错误
- `401` - 未授权
- `500` - 服务器错误

错误响应格式：
```json
{
  "message": "错误描述信息"
}
```

## 开发建议

1. **CORS 配置**：确保后端允许前端域名的跨域请求
2. **认证**：如需认证，可在请求头中添加 `Authorization` 字段
3. **图片处理**：建议在后端进行图片压缩和格式转换
4. **错误日志**：后端应记录详细的错误日志便于调试

