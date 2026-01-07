import React, { createContext, useContext, ReactNode } from 'react';
import { useToast, ToastContainer } from '../components/ErrorToast';

interface ToastContextType {
  showError: (message: string, duration?: number) => string;
  showSuccess: (message: string, duration?: number) => string;
  showInfo: (message: string, duration?: number) => string;
  showWarning: (message: string, duration?: number) => string;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToastContext = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToastContext must be used within ToastProvider');
  }
  return context;
};

interface ToastProviderProps {
  children: ReactNode;
}

export const ToastProvider: React.FC<ToastProviderProps> = ({ children }) => {
  const { toasts, dismissToast, showError, showSuccess, showInfo, showWarning } = useToast();

  return (
    <ToastContext.Provider value={{ showError, showSuccess, showInfo, showWarning }}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </ToastContext.Provider>
  );
};

