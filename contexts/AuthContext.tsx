import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { UserInfo } from '../types';
import { StorageService } from '../utils/storage';
import { 
  sendVerificationCode, 
  loginBySms, 
  registerByEmail, 
  loginByPassword, 
  logout as authLogout 
} from '../services/authService';

interface AuthContextType {
  isAuthenticated: boolean;
  user: UserInfo | null;
  token: string | null;
  loginBySms: (phone: string, verifyCode: string) => Promise<void>;
  registerByEmail: (username: string, email: string, password: string, verifyCode: string) => Promise<void>;
  loginByPassword: (account: string, password: string) => Promise<void>;
  logout: () => void;
  sendCode: (target: string, type: 'sms' | 'email') => Promise<void>;
  getToken: () => string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [user, setUser] = useState<UserInfo | null>(null);
  const [token, setToken] = useState<string | null>(null);

  // 初始化时从localStorage恢复登录状态
  useEffect(() => {
    const savedToken = StorageService.loadToken();
    const savedUser = StorageService.loadUserInfo();
    
    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(savedUser);
      setIsAuthenticated(true);
    }
  }, []);

  // 手机号验证码登录
  const handleLoginBySms = useCallback(async (phone: string, verifyCode: string) => {
    try {
      const response = await loginBySms(phone, verifyCode);
      setToken(response.token);
      setUser({
        userId: response.userId,
        username: response.username,
        phone: phone,
      });
      setIsAuthenticated(true);
    } catch (error) {
      throw error;
    }
  }, []);

  // 邮箱注册
  const handleRegisterByEmail = useCallback(async (
    username: string,
    email: string,
    password: string,
    verifyCode: string
  ) => {
    try {
      const response = await registerByEmail(username, email, password, verifyCode);
      setToken(response.token);
      setUser({
        userId: response.userId,
        username: response.username,
        email: email,
      });
      setIsAuthenticated(true);
    } catch (error) {
      throw error;
    }
  }, []);

  // 密码登录
  const handleLoginByPassword = useCallback(async (account: string, password: string) => {
    try {
      const response = await loginByPassword(account, password);
      setToken(response.token);
      setUser({
        userId: response.userId,
        username: response.username,
        email: account.includes('@') ? account : undefined,
        phone: account.includes('@') ? undefined : account,
      });
      setIsAuthenticated(true);
    } catch (error) {
      throw error;
    }
  }, []);

  // 登出
  const handleLogout = useCallback(() => {
    authLogout();
    setToken(null);
    setUser(null);
    setIsAuthenticated(false);
  }, []);

  // 发送验证码
  const handleSendCode = useCallback(async (target: string, type: 'sms' | 'email') => {
    await sendVerificationCode(target, type);
  }, []);

  // 获取Token（供API服务使用）
  const getToken = useCallback(() => {
    return token || StorageService.loadToken();
  }, [token]);

  const value: AuthContextType = {
    isAuthenticated,
    user,
    token,
    loginBySms: handleLoginBySms,
    registerByEmail: handleRegisterByEmail,
    loginByPassword: handleLoginByPassword,
    logout: handleLogout,
    sendCode: handleSendCode,
    getToken,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

