import React, { useState, useRef, useEffect } from 'react';
import { Wardrobe } from './components/Wardrobe';
import { TryOn } from './components/TryOn';
import { StylistChat } from './components/StylistChat';
import { ClothingItem, UserProfile, Language, ModelTier, ClothingCategory } from './types';
import { Shirt, User, MessageSquareHeart, Globe, Upload, Lock, Sparkles, Zap, Star, Loader2 } from 'lucide-react';
import { getTranslation } from './utils/translations';
import { analyzeClothingImage, validateProModelAccess } from './services/geminiService';

const App: React.FC = () => {
  // 状态管理
  const [hasApiKey, setHasApiKey] = useState(false); // API Key 状态
  const [activeTab, setActiveTab] = useState<'wardrobe' | 'tryon' | 'chat'>('wardrobe'); // 当前标签页
  const [lang, setLang] = useState<Language>('zh'); // 当前语言 (默认中文)
  const [modelTier, setModelTier] = useState<ModelTier>('free'); // 模型等级 (Free/Paid)
  const [isVerifyingKey, setIsVerifyingKey] = useState(false); // 是否正在验证 Key
  
  // 核心数据状态：衣橱列表
  const [wardrobe, setWardrobe] = useState<ClothingItem[]>([]);
  
  // 全局上传进度状态
  const [uploadStatus, setUploadStatus] = useState({ isUploading: false, current: 0, total: 0 });
  
  // 用户个人资料状态
  const [userProfile, setUserProfile] = useState<UserProfile>({
    height: 170,
    weight: 65,
    gender: 'female', 
    stylePreference: 'Casual Chic'
  });

  const [showProfileModal, setShowProfileModal] = useState(false); // 控制个人资料弹窗
  const [showLangMenu, setShowLangMenu] = useState(false); // 控制语言菜单
  const photoInputRef = useRef<HTMLInputElement>(null); // 隐藏的文件 Input 引用

  const t = getTranslation(lang);

  // 初始化检查 API Key
  useEffect(() => {
    const checkApiKey = async () => {
      try {
        if (window.aistudio && window.aistudio.hasSelectedApiKey) {
          const hasKey = await window.aistudio.hasSelectedApiKey();
          setHasApiKey(hasKey);
        } else {
            // 在开发环境中回退到 true
            setHasApiKey(true);
        }
      } catch (e) {
        console.error("Error checking API key", e);
      }
    };
    checkApiKey();
  }, []);

  // 处理 API Key 选择
  const handleSelectKey = async () => {
    if (window.aistudio && window.aistudio.openSelectKey) {
      await window.aistudio.openSelectKey();
      setHasApiKey(true);
    }
  };

  // 处理切换到 Pro 模式的逻辑
  // 必须验证 Key 有效性
  const handleSwitchToPro = async () => {
      setIsVerifyingKey(true);
      try {
          // 1. 如果有选择 Key 的能力，先强制让用户确认/选择 Key
          if (window.aistudio && window.aistudio.openSelectKey) {
              await window.aistudio.openSelectKey();
          }

          // 2. 使用当前 Key 发起验证请求
          const isValid = await validateProModelAccess();

          if (isValid) {
              setModelTier('paid');
              setHasApiKey(true);
              alert(t.profile.verificationSuccess);
          } else {
              setModelTier('free');
              alert(t.profile.verificationFailed);
          }
      } catch (e) {
          console.error(e);
          setModelTier('free');
          alert(t.profile.verificationFailed);
      } finally {
          setIsVerifyingKey(false);
      }
  };

  const addClothingItem = (item: ClothingItem) => {
    setWardrobe(prev => [item, ...prev]);
  };

  const removeClothingItem = (id: string) => {
    setWardrobe(prev => prev.filter(item => item.id !== id));
  };

  const switchLanguage = (l: Language) => {
      setLang(l);
      setShowLangMenu(false);
  };

  // 处理用户头像上传
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onloadend = () => {
          setUserProfile(prev => ({ ...prev, userPhoto: reader.result as string }));
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

  // 如果没有 API Key，显示锁定界面
  if (!hasApiKey) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-gray-50 p-6 text-center">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full flex flex-col items-center">
          <div className="w-16 h-16 bg-black rounded-full flex items-center justify-center mb-6">
            <Lock className="text-white" size={32} />
          </div>
          <h1 className="text-2xl font-bold mb-2 text-gray-900">Access Required</h1>
          <p className="text-gray-500 mb-8">
            To use the advanced AI features like Virtual Try-On and real-time Stylist Chat, please select your Google Cloud API key.
          </p>
          <button 
            onClick={handleSelectKey}
            className="w-full bg-black text-white py-4 rounded-xl font-semibold flex items-center justify-center gap-2 hover:scale-[1.02] transition-transform"
          >
            <Sparkles size={18} />
            Select API Key
          </button>
          <a 
            href="https://ai.google.dev/gemini-api/docs/billing" 
            target="_blank" 
            rel="noopener noreferrer"
            className="mt-4 text-xs text-blue-600 hover:underline"
          >
            Learn about Gemini API billing
          </a>
        </div>
      </div>
    );
  }

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
          />
        )}
        {activeTab === 'tryon' && (
          <TryOn 
            userProfile={userProfile} 
            wardrobe={wardrobe} 
            lang={lang}
            modelTier={modelTier}
          />
        )}
        {activeTab === 'chat' && (
          <StylistChat 
            wardrobe={wardrobe}
            lang={lang}
            modelTier={modelTier}
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

export default App;