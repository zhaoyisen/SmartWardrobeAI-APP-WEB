import React, { useRef } from 'react';
import { UserProfile, Language } from '../types';
import { getTranslation } from '../utils/translations';
import { Upload } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface ProfileProps {
  userProfile: UserProfile;
  setUserProfile: React.Dispatch<React.SetStateAction<UserProfile>>;
  lang: Language;
  onPhotoUpload: (e: React.ChangeEvent<HTMLInputElement>) => void | Promise<void>;
  onSave?: () => void;
  onLogout?: () => void;
}

/**
 * 个人资料页面组件
 * 显示和管理用户个人资料信息
 */
export const Profile: React.FC<ProfileProps> = ({
  userProfile,
  setUserProfile,
  lang,
  onPhotoUpload,
  onSave,
  onLogout,
}) => {
  const t = getTranslation(lang);
  const auth = useAuth();
  const photoInputRef = useRef<HTMLInputElement>(null);

  const handleSave = () => {
    if (onSave) {
      onSave();
    }
  };

  const handleLogout = () => {
    auth.logout();
    if (onLogout) {
      onLogout();
    }
  };

  // 包装上传处理函数，确保在上传完成后（无论成功或失败）都重置文件输入框
  // 这样即使上传失败，用户也可以再次选择相同文件重新上传
  const handlePhotoUploadWrapper = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      // 调用上传处理函数（可能是同步或异步）
      const result = onPhotoUpload(e);
      // 如果返回 Promise，等待它完成
      if (result instanceof Promise) {
        await result;
      }
    } catch (error) {
      // 错误已经在 onPhotoUpload 中处理，这里不需要再次处理
      // 只需要确保文件输入框被重置
      console.error('Photo upload error:', error);
    } finally {
      // 无论成功还是失败，都重置文件输入框的值，以便可以再次选择相同文件
      // 这是关键：重置后，即使用户再次选择相同的文件，onChange 事件也会触发
      if (photoInputRef.current) {
        photoInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="h-full flex flex-col bg-gray-50 overflow-y-auto">
      <div className="flex-1 p-6 pb-24">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">{t.profile.title}</h2>
          
          <div className="space-y-6">
            {/* 照片上传区 */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <label className="block text-sm font-medium text-gray-700 mb-3">{t.profile.uploadPhoto}</label>
              <div 
                onClick={() => photoInputRef.current?.click()}
                className="w-full aspect-[3/4] max-w-xs mx-auto bg-gray-100 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:bg-gray-200 transition-colors relative overflow-hidden"
              >
                {userProfile.userPhoto ? (
                  <img src={userProfile.userPhoto} className="w-full h-full object-cover" alt="User" />
                ) : (
                  <>
                    <Upload className="text-gray-400 mb-2" size={32} />
                    <span className="text-sm text-gray-500">{t.profile.uploadPhoto}</span>
                  </>
                )}
              </div>
              <input 
                type="file" 
                ref={photoInputRef} 
                onChange={handlePhotoUploadWrapper} 
                accept="image/*" 
                className="hidden" 
              />
              <p className="text-xs text-gray-400 mt-3 text-center">{t.profile.photoNote}</p>
            </div>

            {/* 基础资料输入 */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t.profile.height}</label>
                <input 
                  type="number" 
                  value={userProfile.height}
                  onChange={(e) => setUserProfile({...userProfile, height: Number(e.target.value)})}
                  className="w-full border border-gray-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-black"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t.profile.weight}</label>
                <input 
                  type="number" 
                  value={userProfile.weight}
                  onChange={(e) => setUserProfile({...userProfile, weight: Number(e.target.value)})}
                  className="w-full border border-gray-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-black"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t.profile.gender}</label>
                <select 
                  value={userProfile.gender}
                  onChange={(e) => setUserProfile({...userProfile, gender: e.target.value as any})}
                  className="w-full border border-gray-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-black"
                >
                  <option value="female">{t.profile.female}</option>
                  <option value="male">{t.profile.male}</option>
                  <option value="unisex">{t.profile.unisex}</option>
                </select>
              </div>
            </div>

            {/* 操作按钮 */}
            <div className="space-y-3 pt-2">
              <button 
                onClick={handleSave}
                className="w-full bg-black text-white py-3 rounded-xl font-semibold hover:bg-gray-800 transition-colors"
              >
                {t.profile.save}
              </button>
              
              {auth.isAuthenticated && (
                <button
                  onClick={handleLogout}
                  className="w-full border-2 border-gray-300 text-gray-800 py-3 rounded-xl font-semibold hover:bg-gray-50 transition-colors"
                >
                  {lang === 'zh' ? '退出登录' : lang === 'en' ? 'Log out' : 'ログアウト'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

