import React, { useState, useRef, useEffect } from 'react';
import { Home } from './components/Home';
import { Login } from './components/Login';
import { Register } from './components/Register';
import { Wardrobe } from './components/Wardrobe';
import { TryOn } from './components/TryOn';
import { StylistChat } from './components/StylistChat';
import { Profile } from './components/Profile';
import { ClothingItem, UserProfile, Language, ModelTier, ModelConfig } from './types';
import { Home as HomeIcon, Shirt, User, UserCircle, MessageSquareHeart, Globe, X, Loader2 } from 'lucide-react';
import { getTranslation } from './utils/translations';
import { 
  setUnauthorizedCallback, 
  UnauthorizedError,
  getWardrobeList,
  addClothingItemToBackend,
  deleteClothingItemFromBackend,
  deleteClothing,
  getUserProfile,
  updateUserProfile,
  getModelTier
} from './services/apiService';
import { StorageService } from './utils/storage';
import { ToastProvider, useToastContext } from './contexts/ToastContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';

const AppContent: React.FC = () => {
  // 状态管理
  const [backendAvailable, setBackendAvailable] = useState<boolean | null>(null); // null = 检查中，true/false = 已确定
  const [lang, setLang] = useState<Language>(() => StorageService.loadLanguage() || 'zh'); // 当前语言 (默认中文)
  const [modelTier, setModelTier] = useState<ModelTier>('free'); // 模型等级（只读，从后端获取）
  
  // 认证管理
  const auth = useAuth();
  
  // 根据登录状态设置初始标签页：未登录显示首页，已登录显示衣橱
  const [activeTab, setActiveTab] = useState<'home' | 'wardrobe' | 'tryon' | 'me'>(() => {
    return auth.isAuthenticated ? 'wardrobe' : 'home';
  });
  
  // 注意：衣橱列表现在由 Wardrobe 组件内部管理，不再需要这里的状态
  
  // 全局上传进度状态
  const [uploadStatus, setUploadStatus] = useState({ isUploading: false, current: 0, total: 0 });
  
  // 用户个人资料状态（从后端加载）
  const [userProfile, setUserProfile] = useState<UserProfile>({
    height: 170,
    weight: 65,
    gender: 'female', 
    stylePreference: 'Casual Chic'
  });
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);

  const [showLangMenu, setShowLangMenu] = useState(false); // 控制语言菜单
  const [showLogin, setShowLogin] = useState(false); // 控制登录页面显示
  const [showRegister, setShowRegister] = useState(false); // 控制注册页面显示
  const [showChatModal, setShowChatModal] = useState(false); // 控制聊天模态框显示

  // Toast 通知管理
  const { showError, showSuccess } = useToastContext();

  const t = getTranslation(lang);

  // 后台检查后端连接（不阻塞应用启动）
  useEffect(() => {
    const checkBackendConnection = async () => {
      // 检查开始时状态已经是 null（检查中），无需额外设置
      try {
        const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);
        
        const response = await fetch(`${API_BASE_URL}/app/health`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
        });
        
        clearTimeout(timeoutId);
        
        // 确保在检查完成后总是设置状态
        if (response.ok) {
          setBackendAvailable(true);
          console.log("Backend connection check successful");
        } else {
          setBackendAvailable(false);
          console.warn("Backend connection check failed: HTTP", response.status);
        }
      } catch (e) {
        // 确保在错误情况下也设置状态
        setBackendAvailable(false);
        if (e instanceof Error && e.name === 'AbortError') {
          console.warn("Backend connection check timeout (3s), continuing in offline mode");
        } else if (e instanceof TypeError && e.message.includes('fetch')) {
          console.warn("Backend connection check failed: Network error, continuing in offline mode", e);
        } else {
          console.warn("Backend connection check failed, continuing in offline mode", e);
        }
      }
    };
    checkBackendConnection();
  }, []);

  // 设置未授权回调
  useEffect(() => {
    setUnauthorizedCallback(() => {
      setShowLogin(true);
    });
  }, []);

  // 当登录状态改变时，调整当前标签页
  useEffect(() => {
    if (!auth.isAuthenticated && activeTab !== 'home' && activeTab !== 'me') {
      setActiveTab('home');
    } else if (auth.isAuthenticated && activeTab === 'home') {
      setActiveTab('wardrobe');
    }
  }, [auth.isAuthenticated, activeTab]);

  // 从后端加载用户资料（登录后自动加载）
  useEffect(() => {
    if (auth.isAuthenticated) {
      loadProfileFromBackend();
    } else {
      // 未登录时重置为默认值
      setUserProfile({
        height: 170,
        weight: 65,
        gender: 'female',
        stylePreference: 'Casual Chic'
      });
    }
  }, [auth.isAuthenticated]);

  // 从后端加载模型能力（登录后自动加载）
  useEffect(() => {
    if (auth.isAuthenticated) {
      loadModelTierFromBackend();
    } else {
      // 未登录时重置为默认值
      setModelTier('free');
    }
  }, [auth.isAuthenticated]);

  // 注意：衣橱列表现在由 Wardrobe 组件内部管理

  // 从后端加载用户资料
  const loadProfileFromBackend = async () => {
    if (!auth.isAuthenticated) {
      // 未登录时使用默认值
      setUserProfile({
        height: 170,
        weight: 65,
        gender: 'female',
        stylePreference: 'Casual Chic'
      });
      return;
    }
    
    setIsLoadingProfile(true);
    try {
      const profile = await getUserProfile();
      if (profile && typeof profile === 'object') {
        // 验证profile的基本字段，确保数据完整性
        setUserProfile({
          height: typeof profile.height === 'number' ? profile.height : 170,
          weight: typeof profile.weight === 'number' ? profile.weight : 65,
          gender: profile.gender || 'female',
          stylePreference: profile.stylePreference || 'Casual Chic',
          userPhoto: profile.userPhoto,
        });
      } else {
        // 如果后端返回 null 或无效数据，使用默认值
        setUserProfile({
          height: 170,
          weight: 65,
          gender: 'female',
          stylePreference: 'Casual Chic'
        });
      }
    } catch (error) {
      console.error('Failed to load user profile:', error);
      // 即使出错也设置默认值，确保页面可以正常使用
      setUserProfile({
        height: 170,
        weight: 65,
        gender: 'female',
        stylePreference: 'Casual Chic'
      });
      // getUserProfile 现在不会抛出错误，所以这个catch块主要是防御性代码
    } finally {
      setIsLoadingProfile(false);
    }
  };

  // 从后端加载模型能力
  const loadModelTierFromBackend = async () => {
    if (!auth.isAuthenticated) {
      setModelTier('free');
      return;
    }

    try {
      const tier = await getModelTier();
      setModelTier(tier);
    } catch (error) {
      console.error('Failed to load model tier:', error);
      // 即使出错也使用默认值
      setModelTier('free');
    }
  };

  // 保存语言设置到本地存储
  useEffect(() => {
    if (StorageService.isAvailable()) {
      StorageService.saveLanguage(lang);
    }
  }, [lang]);

  // 手动重新检查后端连接
  const handleCheckBackend = async () => {
    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';
    // 重置为检查中状态
    setBackendAvailable(null);
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      
      // 统一使用 /app/health 端点
      const response = await fetch(`${API_BASE_URL}/app/health`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        setBackendAvailable(true);
        showSuccess(lang === 'zh' ? '后端连接成功！' : 'Backend connected successfully!');
      } else {
        setBackendAvailable(false);
        showError(lang === 'zh' ? '无法连接到后端服务' : 'Cannot connect to backend service');
      }
    } catch (e) {
      setBackendAvailable(false);
      if (e instanceof Error && e.name === 'AbortError') {
        showError(lang === 'zh' ? '后端连接超时，请检查配置' : 'Backend connection timeout, please check configuration');
      } else if (e instanceof TypeError && e.message.includes('fetch')) {
        showError(lang === 'zh' ? '无法连接到后端服务，请检查网络' : 'Cannot connect to backend service, please check network');
      } else {
        showError(lang === 'zh' ? '后端服务未运行，请检查配置' : 'Backend service not running, please check configuration');
      }
    }
  };


  // 删除衣物（id 为 number 类型）
  const removeClothingItem = async (id: number) => {
    try {
      await deleteClothing(id);
      showSuccess(lang === 'zh' ? '删除成功' : 'Item deleted successfully');
      // 注意：Wardrobe 组件会自己处理刷新，通过 onRefresh 回调或重新加载
    } catch (error) {
      console.error('Failed to delete clothing item:', error);
      if (error instanceof UnauthorizedError) {
        // 未授权错误已由 apiRequest 处理
        return;
      }
      showError(lang === 'zh' ? '删除失败，请稍后重试' : 'Failed to delete item, please try again later');
    }
  };

  const switchLanguage = (l: Language) => {
      setLang(l);
      setShowLangMenu(false);
      // 自动保存语言设置
      if (StorageService.isAvailable()) {
        StorageService.saveLanguage(l);
      }
  };

  // 保存用户资料到后端
  const handleSaveProfile = async () => {
    if (!auth.isAuthenticated) {
      showError(lang === 'zh' ? '请先登录后再保存资料' : 'Please login before saving profile');
      setShowLogin(true);
      return;
    }

    try {
      const updatedProfile = await updateUserProfile(userProfile);
      setUserProfile(updatedProfile);
      showSuccess(lang === 'zh' ? '资料保存成功' : 'Profile saved successfully');
    } catch (error) {
      console.error('Failed to save profile:', error);
      if (error instanceof UnauthorizedError) {
        return;
      }
      showError(lang === 'zh' ? '资料保存失败，请稍后重试' : 'Failed to save profile, please try again later');
    }
  };

  // 处理用户头像上传
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      // 检查文件大小（可选，防止上传过大文件）
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (file.size > maxSize) {
        showError(lang === 'zh' ? '图片文件过大，请选择小于10MB的图片' : 'Image file is too large, please select an image smaller than 10MB');
        return;
      }

      try {
        const base64 = await readFileAsBase64(file);
        const profileWithPhoto = { ...userProfile, userPhoto: base64 };
        
        // 保存到后端（后端会返回更新后的资料，包含图片URL）
        if (auth.isAuthenticated) {
          // 等待 updateUserProfile 完成，如果抛出错误会被catch捕获
          const updatedProfile = await updateUserProfile(profileWithPhoto);
          
          // 只有在成功返回有效数据时才更新状态和显示成功消息
          if (updatedProfile && typeof updatedProfile === 'object') {
            setUserProfile(updatedProfile); // 使用后端返回的值（包含URL）
            showSuccess(lang === 'zh' ? '头像上传成功' : 'Photo uploaded successfully');
          } else {
            // 如果返回的数据无效，显示错误
            throw new Error('Invalid response from server');
          }
        } else {
          // 未登录时，仅更新本地状态（等待登录后同步）
          setUserProfile(profileWithPhoto);
          showSuccess(lang === 'zh' ? '头像已保存，登录后将同步到服务器' : 'Photo saved locally, will sync after login');
        }
      } catch (error) {
        console.error('Failed to upload photo:', error);
        
        // 根据错误类型显示不同的错误消息
        if (error instanceof UnauthorizedError) {
          // 未授权错误，用户会被重定向到登录页，不需要额外提示
          return;
        }
        
        // 获取更具体的错误信息
        let errorMessage = lang === 'zh' ? '头像上传失败，请稍后重试' : 'Failed to upload photo, please try again later';
        if (error instanceof Error && error.message) {
          // 如果后端返回了具体的错误消息，使用它
          if (error.message.includes('Invalid') || error.message.includes('invalid')) {
            errorMessage = lang === 'zh' ? '头像上传失败：服务器返回数据格式错误' : 'Failed to upload photo: invalid response from server';
          } else if (error.message.includes('timeout')) {
            errorMessage = lang === 'zh' ? '头像上传超时，请检查网络连接' : 'Upload timeout, please check your network connection';
          } else if (error.message.includes('connect')) {
            errorMessage = lang === 'zh' ? '无法连接到服务器，请检查网络' : 'Cannot connect to server, please check your network';
          }
        }
        
        showError(errorMessage);
        
        // 上传失败时，不更新本地状态（保持原有状态）
        // 如果之前已经更新了，这里不处理，因为已经失败了
      }
  };

  // 辅助函数：将文件读取为 Base64
  const readFileAsBase64 = (file: File): Promise<string> => {
      return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
      });
  };

  // 全局批量上传处理逻辑
  // 注意：现在分析流程已经在 UploadModal 组件内部完成
  // 这个函数暂时保留作为占位，实际不会被调用（因为 UploadModal 已独立处理分析）
  // 如果将来需要在保存衣物后刷新列表，可以在这里实现
  const handleBatchUpload = async (files: File[], modelConfig: ModelConfig) => {
    // 这个函数暂时不会被调用，因为分析流程已经在 UploadModal 内部完成
    // 保存逻辑也在 UploadModal 内部（目前是占位函数）
    // 如果将来需要在这里处理保存后的逻辑（如刷新衣橱列表），可以在这里实现
    
    // TODO: 当 UploadModal 中的保存逻辑实现后，可以考虑在这里刷新衣橱列表
    // await loadWardrobeFromBackend();
    
    console.log('handleBatchUpload called but not used - analysis is handled in UploadModal');
  };

  return (
    <div className="h-screen w-screen flex flex-col bg-gray-50 overflow-hidden text-gray-900">
      {/* 登录页面 */}
      {showLogin && (
        <Login
          onClose={() => setShowLogin(false)}
          onSuccess={() => {
            setShowLogin(false);
          }}
          onSwitchToRegister={() => {
            setShowLogin(false);
            setShowRegister(true);
          }}
        />
      )}

      {/* 注册页面 */}
      {showRegister && (
        <Register
          onClose={() => setShowRegister(false)}
          onSuccess={() => {
            setShowRegister(false);
          }}
          onSwitchToLogin={() => {
            setShowRegister(false);
            setShowLogin(true);
          }}
        />
      )}

      {/* 主内容区域 */}
      <main className="flex-1 overflow-hidden relative">
        {activeTab === 'home' && (
          <Home 
            lang={lang} 
            isAuthenticated={auth.isAuthenticated} 
            onLoginClick={() => setShowLogin(true)} 
          />
        )}
        {activeTab === 'wardrobe' && (
          <Wardrobe 
            onRemoveItem={removeClothingItem} 
            lang={lang}
            modelTier={modelTier}
            onUpload={handleBatchUpload}
            onRefresh={undefined}
            uploadStatus={uploadStatus}
            backendAvailable={backendAvailable}
          />
        )}
        {activeTab === 'tryon' && (
          <TryOn 
            userProfile={userProfile} 
            wardrobe={[]} 
            lang={lang}
            modelTier={modelTier}
            backendAvailable={backendAvailable}
          />
        )}
        {activeTab === 'me' && (
          <Profile
            userProfile={userProfile}
            setUserProfile={setUserProfile}
            lang={lang}
            onPhotoUpload={handlePhotoUpload}
            onSave={handleSaveProfile}
            onLogout={() => setActiveTab('home')}
          />
        )}

        {/* 全局悬浮上传进度条 */}
        {uploadStatus.isUploading && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-50 bg-black text-white px-4 py-3 rounded-xl shadow-xl flex items-center gap-4 min-w-[280px] animate-[slideUp_0.3s_ease-out]">
                <div className="flex-1">
                    <div className="flex justify-between text-xs font-medium mb-1.5">
                        <span>{lang === 'zh' ? '正在分析衣物...' : 'Analyzing items...'}</span>
                        <span>{uploadStatus.current} / {uploadStatus.total}</span>
                    </div>
                    <div className="w-full bg-gray-700 h-1.5 rounded-full overflow-hidden">
                        <div 
                            className="bg-white h-full transition-all duration-300 ease-out"
                            style={{ width: `${(uploadStatus.current / uploadStatus.total) * 100}%` }}
                        />
                    </div>
                </div>
                <Loader2 size={20} className="animate-spin text-white/70" />
            </div>
        )}

      </main>

      {/* 后端状态指示器 (左上角) - 仅在不可用时显示 */}
      {backendAvailable === false && (
        <div className="absolute top-4 left-4 z-50">
          <div className="px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-2 backdrop-blur-sm bg-red-100/80 text-red-700 border border-red-200">
            <div className="w-2 h-2 rounded-full bg-red-500" />
            <span>{t.backend.statusUnavailable}</span>
          </div>
        </div>
      )}

      {/* 语言切换菜单 (右上角) */}
      <div className="absolute top-4 right-4 z-50">
        <button 
            onClick={() => setShowLangMenu(!showLangMenu)}
            className="bg-white/90 backdrop-blur text-black p-2 rounded-full shadow-md border border-gray-100 hover:bg-gray-100 transition-colors"
        >
            <Globe size={20} />
        </button>
        
        {showLangMenu && (
            <div className="absolute top-12 right-0 bg-white rounded-lg shadow-xl border border-gray-100 py-1 w-32 animate-[fadeIn_0.1s_ease-out] flex flex-col overflow-hidden">
                <button 
                    onClick={() => switchLanguage('zh')}
                    className={`px-4 py-2 text-left text-sm hover:bg-gray-50 ${lang === 'zh' ? 'font-bold text-black' : 'text-gray-600'}`}
                >
                    中文
                </button>
                <button 
                    onClick={() => switchLanguage('en')}
                    className={`px-4 py-2 text-left text-sm hover:bg-gray-50 ${lang === 'en' ? 'font-bold text-black' : 'text-gray-600'}`}
                >
                    English
                </button>
                <button 
                    onClick={() => switchLanguage('ja')}
                    className={`px-4 py-2 text-left text-sm hover:bg-gray-50 ${lang === 'ja' ? 'font-bold text-black' : 'text-gray-600'}`}
                >
                    日本語
                </button>
            </div>
        )}
      </div>

      {/* 悬浮顾问按钮 (右侧中间) */}
      <button 
        onClick={() => {
          if (!auth.isAuthenticated) {
            setShowLogin(true);
          } else {
            setShowChatModal(true);
          }
        }}
        className="fixed right-4 top-1/2 -translate-y-1/2 z-40 bg-black text-white p-4 rounded-full shadow-xl hover:scale-110 transition-transform border-2 border-white"
      >
        <MessageSquareHeart size={24} />
      </button>

      {/* 聊天模态框 */}
      {showChatModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowChatModal(false)}>
          <div className="bg-white rounded-2xl w-full max-w-2xl h-[90vh] flex flex-col shadow-xl animate-[scaleIn_0.2s_ease-out] relative" onClick={(e) => e.stopPropagation()}>
            {/* 关闭按钮（右上角） */}
            <button 
              onClick={() => setShowChatModal(false)}
              className="absolute top-3 right-3 z-50 p-2 hover:bg-gray-100 rounded-full transition-colors bg-white/90 backdrop-blur shadow-sm border border-gray-200"
              aria-label={lang === 'zh' ? '关闭' : lang === 'en' ? 'Close' : '閉じる'}
            >
              <X size={18} />
            </button>
            {/* StylistChat 组件内容 */}
            <div className="flex-1 overflow-hidden rounded-2xl">
              <StylistChat 
                wardrobe={[]}
                lang={lang}
                modelTier={modelTier}
                backendAvailable={backendAvailable}
              />
            </div>
          </div>
        </div>
      )}

      {/* 底部导航栏 */}
      <nav className="bg-white border-t border-gray-100 px-6 py-3 flex justify-around items-center z-20 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.02)]">
        <button 
          onClick={() => setActiveTab('home')}
          className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'home' ? 'text-black' : 'text-gray-400'}`}
        >
          <HomeIcon size={24} strokeWidth={activeTab === 'home' ? 2.5 : 2} />
          <span className="text-[10px] font-medium">{lang === 'zh' ? '首页' : lang === 'en' ? 'Home' : 'ホーム'}</span>
        </button>
        
        <button 
          onClick={() => {
            if (!auth.isAuthenticated) {
              setShowLogin(true);
            } else {
              setActiveTab('wardrobe');
            }
          }}
          className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'wardrobe' ? 'text-black' : 'text-gray-400'}`}
        >
          <Shirt size={24} strokeWidth={activeTab === 'wardrobe' ? 2.5 : 2} />
          <span className="text-[10px] font-medium">{t.nav.wardrobe}</span>
        </button>
        
        <button 
          onClick={() => {
            if (!auth.isAuthenticated) {
              setShowLogin(true);
            } else {
              setActiveTab('tryon');
            }
          }}
          className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'tryon' ? 'text-black' : 'text-gray-400'}`}
        >
          <div className={`p-1 rounded-lg ${activeTab === 'tryon' ? 'bg-gray-100' : ''}`}>
             <User size={24} strokeWidth={activeTab === 'tryon' ? 2.5 : 2} />
          </div>
          <span className="text-[10px] font-medium">{t.nav.tryon}</span>
        </button>
        
        <button 
          onClick={() => {
            if (!auth.isAuthenticated) {
              setShowLogin(true);
            } else {
              setActiveTab('me');
            }
          }}
          className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'me' ? 'text-black' : 'text-gray-400'}`}
        >
          <UserCircle size={24} strokeWidth={activeTab === 'me' ? 2.5 : 2} />
          <span className="text-[10px] font-medium">{t.nav.me}</span>
        </button>
      </nav>
    </div>
  );
};

// 包装 App 组件以提供 Toast Context 和 Auth Context
const App: React.FC = () => {
  return (
    <ToastProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ToastProvider>
  );
};

export default App;