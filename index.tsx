import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// 获取根 DOM 元素
const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

// 初始化 React 应用根节点并渲染 App 组件
const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);