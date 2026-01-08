# 智能衣橱 AI

一个基于 AI 的智能穿搭管理应用，支持虚拟试穿、智能搭配推荐等功能。

## 本地运行

**前置要求：** Node.js 16+

1. 安装依赖：
   ```bash
   npm install
   ```

2. 配置后端 API 地址（创建 `.env.local` 文件）：
   ```env
   VITE_API_BASE_URL=http://localhost:9090/api
   ```
   **注意**：后端服务运行在 9090 端口。如果不创建此文件，开发服务器会自动代理 `/api` 请求到 `http://localhost:9090`。
   
   详细 API 配置请参考 [API_CONFIG.md](API_CONFIG.md)

3. 启动开发服务器：
   ```bash
   npm run dev
   ```

4. 构建生产版本：
   ```bash
   npm run build
   ```

## 功能特性

- 📱 **智能衣橱管理** - 自动分类和标签衣物
- 👗 **虚拟试穿** - 3D 虚拟试穿效果预览
- 💬 **AI 搭配师** - 智能穿搭建议和推荐
- 🌍 **多语言支持** - 中文、英文、日文
- 💾 **数据持久化** - 本地存储用户数据

## 技术栈

- React 19 + TypeScript
- Vite 6
- Tailwind CSS
- React Three Fiber (3D 渲染)
