import React, { useState, useRef, useEffect } from 'react';
import { Wardrobe } from './components/Wardrobe';
import { TryOn } from './components/TryOn';
import { StylistChat } from './components/StylistChat';
import { ClothingItem, UserProfile, Language, ModelTier, ClothingCategory } from './types';
import { Shirt, User, MessageSquareHeart, Globe, Upload, Lock, Sparkles, Zap, Star, Loader2 } from 'lucide-react';
import { getTranslation } from './utils/translations';
import { analyzeClothingImage, validateProModelAccess } from './services/apiService';
import { StorageService } from './utils/storage';
import { ToastProvider, useToastContext } from './contexts/ToastContext';

const AppContent: React.FC = () => {
  // 状态管理
  const [backendAvailable, setBackendAvailable] = useState<boolean | null>(null); // null = 检查中，true/false = 已确定
  const [activeTab, setActiveTab] = useState<'wardrobe' | 'tryon' | 'chat'>('wardrobe'); // 当前标签页
  const [lang, setLang] = useState<Language>(() => StorageService.loadLanguage() || 'zh'); // 当前语言 (默认中文)
  const [modelTier, setModelTier] = useState<ModelTier>(() => StorageService.loadModelTier() || 'free'); // 模型等级 (Free/Paid)
  const [isVerifyingKey, setIsVerifyingKey] = useState(false); // 是否正在验证 Key
  
  // 核心数据状态：衣橱列表（从本地存储初始化）
  const [wardrobe, setWardrobe] = useState<ClothingItem[]>(() => {
    if (StorageService.isAvailable()) {
      return StorageService.loadWardrobe();
    }
    return [];
  });
  
  // 全局上传进度状态
  const [uploadStatus, setUploadStatus] = useState({ isUploading: false, current: 0, total: 0 });
  
  // 用户个人资料状态（从本地存储初始化）
  const [userProfile, setUserProfile] = useState<UserProfile>(() => {
    const saved = StorageService.loadUserProfile();
    return saved || {
      height: 170,
      weight: 65,
      gender: 'female', 
      stylePreference: 'Casual Chic'
    };
  });

  const [showProfileModal, setShowProfileModal] = useState(false); // 控制个人资料弹窗
  const [showLangMenu, setShowLangMenu] = useState(false); // 控制语言菜单
  const photoInputRef = useRef<HTMLInputElement>(null); // 隐藏的文件 Input 引用

  // Toast 通知管理
  const { showError, showSuccess } = useToastContext();

  const t = getTranslation(lang);

  // 后台检查后端连接（不阻塞应用启动）
  useEffect(() => {
    const checkBackendConnection = async () => {
      try {
        const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);
        
        const response = await fetch(`${API_BASE_URL}/health`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
        });
        
        clearTimeout(timeoutId);
        setBackendAvailable(response.ok);
      } catch (e) {
        console.warn("Backend connection check failed, continuing in offline mode", e);
        setBackendAvailable(false);
      }
    };
    checkBackendConnection();
  }, []);

  // 保存衣橱数据到本地存储（当衣橱变化时）
  useEffect(() => {
    if (StorageService.isAvailable()) {
      StorageService.saveWardrobe(wardrobe);
    }
  }, [wardrobe]);

  // 保存用户资料到本地存储（当资料变化时）
  useEffect(() => {
    if (StorageService.isAvailable()) {
      StorageService.saveUserProfile(userProfile);
    }
  }, [userProfile]);

  // 保存语言设置到本地存储
  useEffect(() => {
    if (StorageService.isAvailable()) {
      StorageService.saveLanguage(lang);
    }
  }, [lang]);

  // 保存模型等级设置到本地存储
  useEffect(() => {
    if (StorageService.isAvailable()) {
      StorageService.saveModelTier(modelTier);
    }
  }, [modelTier]);

  // 手动重新检查后端连接
  const handleCheckBackend = async () => {
    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      const response = await fetch(`${API_BASE_URL}/health`, {
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
      showError(lang === 'zh' ? '后端服务未运行，请检查配置' : 'Backend service not running, please check configuration');
    }
  };

  // 处理切换到 Pro 模式的逻辑
  // 验证后端是否支持专业版功能
  const handleSwitchToPro = async () => {
      setIsVerifyingKey(true);
      try {
          // 调用后端验证专业版功能
          const isValid = await validateProModelAccess();

          if (isValid) {
              setModelTier('paid');
              setBackendAvailable(true);
              showSuccess(t.profile.verificationSuccess);
          } else {
              setModelTier('free');
              showError(t.profile.verificationFailed);
          }
      } catch (e) {
          console.error(e);
          setModelTier('free');
          showError(t.profile.verificationFailed);
      } finally {
          setIsVerifyingKey(false);
      }
  };

  const addClothingItem = (item: ClothingItem) => {
    setWardrobe(prev => {
      const updated = [item, ...prev];
      // 自动保存到本地存储
      if (StorageService.isAvailable()) {
        StorageService.saveWardrobe(updated);
      }
      return updated;
    });
  };

  const removeClothingItem = (id: string) => {
    setWardrobe(prev => {
      const updated = prev.filter(item => item.id !== id);
      // 自动保存到本地存储
      if (StorageService.isAvailable()) {
        StorageService.saveWardrobe(updated);
      }
      return updated;
    });
  };

  const switchLanguage = (l: Language) => {
      setLang(l);
      setShowLangMenu(false);
      // 自动保存语言设置
      if (StorageService.isAvailable()) {
        StorageService.saveLanguage(l);
      }
  };

  // 处理用户头像上传
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onloadend = () => {
          const updatedProfile = { ...userProfile, userPhoto: reader.result as string };
          setUserProfile(updatedProfile);
          // 自动保存用户资料
          if (StorageService.isAvailable()) {
            StorageService.saveUserProfile(updatedProfile);
          }
      };
      reader.onerror = () => {
          console.error('Failed to read photo file');
          showError(lang === 'zh' ? '照片读取失败，请重试' : 'Failed to read photo, please try again');
      };
      reader.readAsDataURL(file);
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
  // 负责文件的读取、AI 分析和状态更新
  const handleBatchUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    // 如果后端不可用，允许手动添加（降级处理）
    if (backendAvailable === false) {
      const t = getTranslation(lang);
      showError(t.wardrobe.backendUnavailable, 5000);
      
      // 提供降级方案：允许用户手动添加衣物
      const fileArray = Array.from(files);
      for (let i = 0; i < fileArray.length; i++) {
        try {
          const file = fileArray[i];
          const base64 = await readFileAsBase64(file);
          
          // 创建默认的衣物项（无 AI 分析）
          const newItem: ClothingItem = {
            id: Date.now().toString() + Math.random().toString(),
            imageUrl: base64,
            category: ClothingCategory.TOP,
            color: 'Unknown',
            description: file.name.replace(/\.[^/.]+$/, '') || 'New Item',
            tags: []
          };

          addClothingItem(newItem);
        } catch (error) {
          console.error(`Error processing file ${i + 1}`, error);
        }
      }
      return;
    }

    setUploadStatus({ isUploading: true, current: 0, total: files.length });
    
    // 转换为数组以便安全迭代
    const fileArray = Array.from(files);

    try {
        // 顺序处理文件
        for (let i = 0; i < fileArray.length; i++) {
            setUploadStatus(prev => ({ ...prev, current: i + 1 }));
            
            try {
                const file = fileArray[i];
                const base64 = await readFileAsBase64(file);
                const base64Data = base64.split(',')[1];
                
                // 添加小延迟以防止浏览器卡顿或触发 API 速率限制
                await new Promise(resolve => setTimeout(resolve, 500));

                // 调用服务进行 AI 分析
                const analysis = await analyzeClothingImage(base64Data, lang, modelTier);
                
                const newItem: ClothingItem = {
                    id: Date.now().toString() + Math.random().toString(),
                    imageUrl: base64,
                    category: analysis.category || ClothingCategory.TOP,
                    color: analysis.color || 'Unknown',
                    description: analysis.description || 'New Item',
                    tags: analysis.tags || []
                };

                addClothingItem(newItem);
            } catch (error) {
                console.error(`Error uploading file ${i + 1}`, error);
                // 显示用户友好的错误提示
                const errorMsg = lang === 'zh' 
                  ? `第 ${i + 1} 张图片分析失败，请检查图片格式或网络连接`
                  : `Failed to analyze image ${i + 1}, please check image format or network`;
                showError(errorMsg, 4000);
                // 即使单个失败也继续循环
            }
        }
    } finally {
        // 确保最终重置状态
        setTimeout(() => {
            setUploadStatus({ isUploading: false, current: 0, total: 0 });
        }, 1500);
    }
  };

  return (
    <div className="h-screen w-screen flex flex-col bg-gray-50 overflow-hidden text-gray-900">
      {/* 主内容区域 */}
      <main className="flex-1 overflow-hidden relative">
        {activeTab === 'wardrobe' && (
          <Wardrobe 
            items={wardrobe} 
            onRemoveItem={removeClothingItem} 
            lang={lang}
            modelTier={modelTier}
            onUpload={handleBatchUpload}
            uploadStatus={uploadStatus}
            backendAvailable={backendAvailable}
          />
        )}
        {activeTab === 'tryon' && (
          <TryOn 
            userProfile={userProfile} 
            wardrobe={wardrobe} 
            lang={lang}
            modelTier={modelTier}
            backendAvailable={backendAvailable}
          />
        )}
        {activeTab === 'chat' && (
          <StylistChat 
            wardrobe={wardrobe}
            lang={lang}
            modelTier={modelTier}
            backendAvailable={backendAvailable}
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

        {/* 个人资料设置弹窗 */}
        {showProfileModal && (
            <div className="absolute inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl animate-[scaleIn_0.2s_ease-out] max-h-[90vh] overflow-y-auto">
                    <h2 className="text-xl font-bold mb-4">{t.profile.title}</h2>
                    <div className="space-y-4">
                        {/* 照片上传区 */}
                        <div className="border-b border-gray-100 pb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-2">{t.profile.uploadPhoto}</label>
                            <div 
                                onClick={() => photoInputRef.current?.click()}
                                className="w-full aspect-[3/4] bg-gray-100 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:bg-gray-200 transition-colors relative overflow-hidden"
                            >
                                {userProfile.userPhoto ? (
                                    <img src={userProfile.userPhoto} className="w-full h-full object-cover" alt="User" />
                                ) : (
                                    <>
                                        <Upload className="text-gray-400 mb-2" />
                                        <span className="text-xs text-gray-500">{t.profile.uploadPhoto}</span>
                                    </>
                                )}
                            </div>
                            <input type="file" ref={photoInputRef} onChange={handlePhotoUpload} accept="image/*" className="hidden" />
                            <p className="text-[10px] text-gray-400 mt-2">{t.profile.photoNote}</p>
                        </div>

                        {/* 模型能力选择 (Free/Paid) */}
                         <div className="border-b border-gray-100 pb-4">
                             <label className="block text-sm font-medium text-gray-700 mb-2">{t.profile.modelTier}</label>
                             <div className="flex gap-2">
                                <button 
                                    onClick={() => setModelTier('free')}
                                    className={`flex-1 p-3 rounded-lg border text-sm font-medium flex flex-col items-center gap-1 transition-all ${
                                        modelTier === 'free' ? 'border-black bg-gray-50' : 'border-gray-200 text-gray-500'
                                    }`}
                                >
                                    <Zap size={16} className={modelTier === 'free' ? 'text-orange-500' : ''} />
                                    {t.profile.tierFree}
                                </button>
                                <button 
                                    onClick={handleSwitchToPro}
                                    disabled={isVerifyingKey}
                                    className={`flex-1 p-3 rounded-lg border text-sm font-medium flex flex-col items-center gap-1 transition-all ${
                                        modelTier === 'paid' ? 'border-black bg-gray-50' : 'border-gray-200 text-gray-500'
                                    }`}
                                >
                                    {isVerifyingKey ? (
                                        <Loader2 size={16} className="animate-spin text-purple-500" />
                                    ) : (
                                        <Star size={16} className={modelTier === 'paid' ? 'text-purple-500' : ''} />
                                    )}
                                    {isVerifyingKey ? t.profile.verifying : t.profile.tierPaid}
                                </button>
                             </div>
                             <p className="text-[10px] text-gray-400 mt-2">{t.profile.tierNote}</p>
                         </div>

                        {/* 基础资料输入 */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">{t.profile.height}</label>
                            <input 
                                type="number" 
                                value={userProfile.height}
                                onChange={(e) => setUserProfile({...userProfile, height: Number(e.target.value)})}
                                className="w-full border rounded-lg p-2"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">{t.profile.weight}</label>
                            <input 
                                type="number" 
                                value={userProfile.weight}
                                onChange={(e) => setUserProfile({...userProfile, weight: Number(e.target.value)})}
                                className="w-full border rounded-lg p-2"
                            />
                        </div>
                         <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">{t.profile.gender}</label>
                            <select 
                                value={userProfile.gender}
                                onChange={(e) => setUserProfile({...userProfile, gender: e.target.value as any})}
                                className="w-full border rounded-lg p-2"
                            >
                                <option value="female">{t.profile.female}</option>
                                <option value="male">{t.profile.male}</option>
                                <option value="unisex">{t.profile.unisex}</option>
                            </select>
                        </div>
                        <button 
                            onClick={() => setShowProfileModal(false)}
                            className="w-full bg-black text-white py-3 rounded-xl font-semibold mt-2"
                        >
                            {t.profile.save}
                        </button>
                    </div>
                </div>
            </div>
        )}
      </main>

      {/* 后端状态指示器 (左上角) */}
      {backendAvailable !== null && (
        <div className="absolute top-4 left-4 z-50">
          <div className={`px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-2 backdrop-blur-sm ${
            backendAvailable 
              ? 'bg-green-100/80 text-green-700 border border-green-200' 
              : 'bg-red-100/80 text-red-700 border border-red-200'
          }`}>
            <div className={`w-2 h-2 rounded-full ${
              backendAvailable ? 'bg-green-500' : 'bg-red-500'
            }`} />
            <span>
              {backendAvailable 
                ? t.backend.statusAvailable 
                : t.backend.statusUnavailable}
            </span>
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

      {/* 悬浮头像按钮 (用于打开设置) */}
      <button 
        onClick={() => setShowProfileModal(true)}
        className="absolute top-4 right-16 z-30 bg-white/90 backdrop-blur text-black p-2 rounded-full shadow-md border border-gray-100"
      >
        <User size={20} />
      </button>

      {/* 底部导航栏 */}
      <nav className="bg-white border-t border-gray-100 px-6 py-3 flex justify-between items-center z-20 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.02)]">
        <button 
          onClick={() => setActiveTab('wardrobe')}
          className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'wardrobe' ? 'text-black' : 'text-gray-400'}`}
        >
          <Shirt size={24} strokeWidth={activeTab === 'wardrobe' ? 2.5 : 2} />
          <span className="text-[10px] font-medium">{t.nav.wardrobe}</span>
        </button>
        
        <button 
          onClick={() => setActiveTab('tryon')}
          className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'tryon' ? 'text-black' : 'text-gray-400'}`}
        >
          <div className={`p-1 rounded-lg ${activeTab === 'tryon' ? 'bg-gray-100' : ''}`}>
             <User size={24} strokeWidth={activeTab === 'tryon' ? 2.5 : 2} />
          </div>
          <span className="text-[10px] font-medium">{t.nav.tryon}</span>
        </button>

        <button 
          onClick={() => setActiveTab('chat')}
          className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'chat' ? 'text-black' : 'text-gray-400'}`}
        >
          <MessageSquareHeart size={24} strokeWidth={activeTab === 'chat' ? 2.5 : 2} />
          <span className="text-[10px] font-medium">{t.nav.chat}</span>
        </button>
      </nav>
    </div>
  );
};

// 包装 App 组件以提供 Toast Context
const App: React.FC = () => {
  return (
    <ToastProvider>
      <AppContent />
    </ToastProvider>
  );
};

export default App;