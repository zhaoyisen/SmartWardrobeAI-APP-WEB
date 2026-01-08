import React, { useState, useEffect } from 'react';
import { Mail, Loader2, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useToastContext } from '../contexts/ToastContext';

interface RegisterProps {
  onClose?: () => void;
  onSuccess?: () => void;
  onSwitchToLogin?: () => void;
}

export const Register: React.FC<RegisterProps> = ({ onClose, onSuccess, onSwitchToLogin }) => {
  const [loading, setLoading] = useState(false);
  const { showError, showSuccess } = useToastContext();
  const auth = useAuth();

  // 邮箱注册状态
  const [emailUsername, setEmailUsername] = useState('');
  const [email, setEmail] = useState('');
  const [emailPassword, setEmailPassword] = useState('');
  const [emailCode, setEmailCode] = useState('');
  const [emailCountdown, setEmailCountdown] = useState(0);
  const [emailCodeLoading, setEmailCodeLoading] = useState(false);

  // 验证码倒计时
  useEffect(() => {
    if (emailCountdown > 0) {
      const timer = setTimeout(() => setEmailCountdown(emailCountdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [emailCountdown]);

  // 验证邮箱格式
  const validateEmail = (email: string): boolean => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  // 发送邮箱验证码
  const handleSendEmailCode = async () => {
    if (!validateEmail(email)) {
      showError('请输入正确的邮箱地址');
      return;
    }

    setEmailCodeLoading(true);
    try {
      await auth.sendCode(email, 'email');
      showSuccess('验证码已发送');
      setEmailCountdown(60);
    } catch (error) {
      showError(error instanceof Error ? error.message : '发送验证码失败');
    } finally {
      setEmailCodeLoading(false);
    }
  };

  // 邮箱注册
  const handleEmailRegister = async () => {
    if (!emailUsername.trim()) {
      showError('请输入用户名');
      return;
    }
    if (!validateEmail(email)) {
      showError('请输入正确的邮箱地址');
      return;
    }
    if (!emailPassword || emailPassword.length < 6) {
      showError('密码至少6位');
      return;
    }
    if (!emailCode || emailCode.length !== 6) {
      showError('请输入6位验证码');
      return;
    }

    setLoading(true);
    try {
      await auth.registerByEmail(emailUsername, email, emailPassword, emailCode);
      showSuccess('注册成功');
      onSuccess?.();
    } catch (error) {
      showError(error instanceof Error ? error.message : '注册失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl animate-[scaleIn_0.2s_ease-out] relative">
        {/* 关闭按钮 */}
        {onClose && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={20} />
          </button>
        )}

        <div className="p-6">
          <h2 className="text-2xl font-bold mb-6 text-center">注册</h2>

          {/* 邮箱注册表单 */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">用户名</label>
              <input
                type="text"
                value={emailUsername}
                onChange={(e) => setEmailUsername(e.target.value)}
                placeholder="请输入用户名"
                className="w-full border rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-black"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">邮箱</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="请输入邮箱"
                className="w-full border rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-black"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">密码</label>
              <input
                type="password"
                value={emailPassword}
                onChange={(e) => setEmailPassword(e.target.value)}
                placeholder="请输入密码（至少6位）"
                className="w-full border rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-black"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">验证码</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={emailCode}
                  onChange={(e) => setEmailCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="请输入验证码"
                  className="flex-1 border rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-black"
                  maxLength={6}
                />
                <button
                  onClick={handleSendEmailCode}
                  disabled={emailCountdown > 0 || emailCodeLoading || !validateEmail(email)}
                  className="px-4 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-200 transition-colors whitespace-nowrap"
                >
                  {emailCodeLoading ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : emailCountdown > 0 ? (
                    `${emailCountdown}秒`
                  ) : (
                    '发送验证码'
                  )}
                </button>
              </div>
            </div>
            <button
              onClick={handleEmailRegister}
              disabled={loading}
              className="w-full bg-black text-white py-3 rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-800 transition-colors flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  注册中...
                </>
              ) : (
                '注册'
              )}
            </button>
          </div>

          {/* 返回登录按钮 */}
          {onSwitchToLogin && (
            <div className="mt-6 text-center">
              <button
                onClick={onSwitchToLogin}
                className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
              >
                已有账号？返回登录
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

