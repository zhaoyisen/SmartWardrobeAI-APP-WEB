import React, { useState, useEffect } from 'react';
import { Smartphone, Lock, Loader2, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useToastContext } from '../contexts/ToastContext';

type LoginTab = 'sms' | 'password';

interface LoginProps {
  onClose?: () => void;
  onSuccess?: () => void;
  onSwitchToRegister?: () => void;
}

export const Login: React.FC<LoginProps> = ({ onClose, onSuccess, onSwitchToRegister }) => {
  const [activeTab, setActiveTab] = useState<LoginTab>('sms');
  const [loading, setLoading] = useState(false);
  const { showError, showSuccess } = useToastContext();
  const auth = useAuth();

  // 手机号验证码登录状态
  const [phone, setPhone] = useState('');
  const [smsCode, setSmsCode] = useState('');
  const [smsCountdown, setSmsCountdown] = useState(0);
  const [smsLoading, setSmsLoading] = useState(false);

  // 密码登录状态
  const [passwordAccount, setPasswordAccount] = useState('');
  const [password, setPassword] = useState('');

  // 验证码倒计时
  useEffect(() => {
    if (smsCountdown > 0) {
      const timer = setTimeout(() => setSmsCountdown(smsCountdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [smsCountdown]);

  // 验证手机号格式
  const validatePhone = (phone: string): boolean => {
    return /^1[3-9]\d{9}$/.test(phone);
  };

  // 发送短信验证码
  const handleSendSmsCode = async () => {
    if (!validatePhone(phone)) {
      showError('请输入正确的手机号');
      return;
    }

    setSmsLoading(true);
    try {
      await auth.sendCode(phone, 'sms');
      showSuccess('验证码已发送');
      setSmsCountdown(60);
    } catch (error) {
      showError(error instanceof Error ? error.message : '发送验证码失败');
    } finally {
      setSmsLoading(false);
    }
  };

  // 手机号验证码登录
  const handleSmsLogin = async () => {
    if (!validatePhone(phone)) {
      showError('请输入正确的手机号');
      return;
    }
    if (!smsCode || smsCode.length !== 6) {
      showError('请输入6位验证码');
      return;
    }

    setLoading(true);
    try {
      await auth.loginBySms(phone, smsCode);
      showSuccess('登录成功');
      onSuccess?.();
    } catch (error) {
      showError(error instanceof Error ? error.message : '登录失败');
    } finally {
      setLoading(false);
    }
  };

  // 密码登录
  const handlePasswordLogin = async () => {
    if (!passwordAccount.trim()) {
      showError('请输入手机号或邮箱');
      return;
    }
    if (!password) {
      showError('请输入密码');
      return;
    }

    setLoading(true);
    try {
      await auth.loginByPassword(passwordAccount, password);
      showSuccess('登录成功');
      onSuccess?.();
    } catch (error) {
      showError(error instanceof Error ? error.message : '登录失败');
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
          <h2 className="text-2xl font-bold mb-6 text-center">登录</h2>

          {/* Tab切换：手机验证码和密码登录 */}
          <div className="flex gap-2 mb-6 bg-gray-100 p-1 rounded-lg">
            <button
              onClick={() => setActiveTab('sms')}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'sms'
                  ? 'bg-white text-black shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Smartphone size={16} className="inline mr-1" />
              手机验证码
            </button>
            <button
              onClick={() => setActiveTab('password')}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'password'
                  ? 'bg-white text-black shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Lock size={16} className="inline mr-1" />
              密码登录
            </button>
          </div>

          {/* 手机号验证码登录 */}
          {activeTab === 'sms' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">手机号</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="请输入手机号"
                  className="w-full border rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-black"
                  maxLength={11}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">验证码</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={smsCode}
                    onChange={(e) => setSmsCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="请输入验证码"
                    className="flex-1 border rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-black"
                    maxLength={6}
                  />
                  <button
                    onClick={handleSendSmsCode}
                    disabled={smsCountdown > 0 || smsLoading || !validatePhone(phone)}
                    className="px-4 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-200 transition-colors whitespace-nowrap"
                  >
                    {smsLoading ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : smsCountdown > 0 ? (
                      `${smsCountdown}秒`
                    ) : (
                      '发送验证码'
                    )}
                  </button>
                </div>
              </div>
              <button
                onClick={handleSmsLogin}
                disabled={loading}
                className="w-full bg-black text-white py-3 rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-800 transition-colors flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 size={20} className="animate-spin" />
                    登录中...
                  </>
                ) : (
                  '登录 / 注册'
                )}
              </button>
            </div>
          )}

          {/* 密码登录 */}
          {activeTab === 'password' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">手机号或邮箱</label>
                <input
                  type="text"
                  value={passwordAccount}
                  onChange={(e) => setPasswordAccount(e.target.value)}
                  placeholder="请输入手机号或邮箱"
                  className="w-full border rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-black"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">密码</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="请输入密码"
                  className="w-full border rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-black"
                />
              </div>
              <button
                onClick={handlePasswordLogin}
                disabled={loading}
                className="w-full bg-black text-white py-3 rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-800 transition-colors flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 size={20} className="animate-spin" />
                    登录中...
                  </>
                ) : (
                  '登录'
                )}
              </button>
            </div>
          )}

          {/* 去注册按钮 */}
          {onSwitchToRegister && (
            <div className="mt-6 text-center">
              <button
                onClick={onSwitchToRegister}
                className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
              >
                还没有账号？去注册
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
