# 迁移说明：从前端直接调用 AI 服务到后端 API

## 变更概述

项目已从前端直接调用 AI 服务重构为调用后端 API。所有 AI 相关逻辑已移至后端。

## 主要变更

### 1. 服务层重构

- **旧文件**：`services/geminiService.ts` → 已备份为 `services/geminiService.ts.backup`（已移除所有国外服务依赖）
- **新文件**：`services/apiService.ts` → 使用 `fetch` 调用后端 API

### 2. 接口保持不变

所有接口签名保持不变，组件代码无需修改：
- `analyzeClothingImage()`
- `getOutfitRecommendation()`
- `chatWithStylist()`
- `generateTryOnImage()`
- `validateProModelAccess()`

### 3. 依赖移除

- 前端不再需要直接调用 AI 服务的 SDK
- 可以从 `package.json` 中移除（可选，不影响功能）

### 4. 配置变更

**旧配置**（已移除）：
```env
# 不再需要前端直接配置 AI 服务密钥
```

**新配置**（`.env.local`）：
```env
VITE_API_BASE_URL=http://localhost:3001/api
```

## 后端 API 要求

请参考 [API_CONFIG.md](API_CONFIG.md) 了解详细的 API 端点规范。

### 必需的 API 端点

1. `POST /api/wardrobe/analyze` - 分析衣物图像
2. `POST /api/ai/recommend` - 获取穿搭推荐
3. `POST /api/ai/chat` - 搭配师聊天
4. `POST /api/ai/try-on` - 生成试穿图像
5. `POST /api/ai/validate-pro` - 验证 Pro 模型权限

## 开发建议

1. **开发环境**：使用代理或 CORS 配置连接后端
2. **生产环境**：配置正确的 `VITE_API_BASE_URL`
3. **错误处理**：后端应返回标准 HTTP 状态码和错误信息
4. **认证**：如需认证，可在请求头中添加 `Authorization` 字段

## 回退方案

如果需要临时回退到前端直接调用 AI 服务：
1. 恢复 `services/geminiService.ts.backup` 为 `services/geminiService.ts`
2. 更新所有导入路径从 `apiService` 改回 `geminiService`
3. 配置相应的 AI 服务密钥环境变量

## 注意事项

- 图片数据以 Base64 格式传输，注意大小限制
- 建议后端进行图片压缩和格式转换
- 确保后端正确处理 CORS 请求

