import React, { useEffect, useState } from 'react';
import { X, AlertCircle, CheckCircle, Info, XCircle } from 'lucide-react';

export type ToastType = 'error' | 'success' | 'info' | 'warning';

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

interface ErrorToastProps {
  toast: Toast;
  onDismiss: (id: string) => void;
}

/**
 * 单个 Toast 通知组件
 */
const ToastItem: React.FC<ErrorToastProps> = ({ toast, onDismiss }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // 动画进入
    setTimeout(() => setIsVisible(true), 10);
    
    // 自动消失
    const duration = toast.duration ?? 5000;
    if (duration > 0) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(() => onDismiss(toast.id), 300); // 等待动画完成
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [toast.id, toast.duration, onDismiss]);

  const icons = {
    error: <XCircle className="text-red-500" size={20} />,
    success: <CheckCircle className="text-green-500" size={20} />,
    info: <Info className="text-blue-500" size={20} />,
    warning: <AlertCircle className="text-yellow-500" size={20} />,
  };

  const bgColors = {
    error: 'bg-red-50 border-red-200',
    success: 'bg-green-50 border-green-200',
    info: 'bg-blue-50 border-blue-200',
    warning: 'bg-yellow-50 border-yellow-200',
  };

  return (
    <div
      className={`
        ${bgColors[toast.type]}
        border rounded-lg shadow-lg p-4 mb-2 flex items-start gap-3
        transition-all duration-300 ease-out
        ${isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-full'}
        min-w-[300px] max-w-[500px]
      `}
    >
      <div className="flex-shrink-0 mt-0.5">
        {icons[toast.type]}
      </div>
      <div className="flex-1">
        <p className="text-sm font-medium text-gray-800">{toast.message}</p>
      </div>
      <button
        onClick={() => {
          setIsVisible(false);
          setTimeout(() => onDismiss(toast.id), 300);
        }}
        className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
      >
        <X size={18} />
      </button>
    </div>
  );
};

interface ToastContainerProps {
  toasts: Toast[];
  onDismiss: (id: string) => void;
}

/**
 * Toast 通知容器组件
 */
export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] pointer-events-none">
      <div className="pointer-events-auto">
        {toasts.map(toast => (
          <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
        ))}
      </div>
    </div>
  );
};

/**
 * Toast 管理器 Hook
 */
export const useToast = () => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = (message: string, type: ToastType = 'info', duration?: number) => {
    const id = Date.now().toString() + Math.random().toString();
    const newToast: Toast = { id, message, type, duration };
    setToasts(prev => [...prev, newToast]);
    return id;
  };

  const dismissToast = (id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  const showError = (message: string, duration?: number) => showToast(message, 'error', duration);
  const showSuccess = (message: string, duration?: number) => showToast(message, 'success', duration);
  const showInfo = (message: string, duration?: number) => showToast(message, 'info', duration);
  const showWarning = (message: string, duration?: number) => showToast(message, 'warning', duration);

  return {
    toasts,
    showToast,
    dismissToast,
    showError,
    showSuccess,
    showInfo,
    showWarning,
  };
};

