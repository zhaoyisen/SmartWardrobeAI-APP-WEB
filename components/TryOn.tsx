import React, { useState, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, ContactShadows, Environment, Float } from '@react-three/drei';
import { UserProfile, ClothingItem, ClothingCategory, Language, ModelTier } from '../types';
import { Wand2, Info, ArrowLeft, Loader2, User, Layers, ChevronLeft, ChevronRight, ArrowRight, Maximize2, Download, X } from 'lucide-react';
import { getTranslation } from '../utils/translations';
import { generateTryOnImage } from '../services/apiService';
import { useToastContext } from '../contexts/ToastContext';

interface TryOnProps {
  userProfile: UserProfile;
  wardrobe: ClothingItem[];
  lang: Language;
  modelTier: ModelTier;
  backendAvailable?: boolean | null;
}

// 简单的占位 3D Avatar 模型
// 根据用户的身高体重数据动态调整缩放比例
const AvatarModel = ({ height, weight, gender, selectedItems }: { 
  height: number; 
  weight: number; 
  gender: string;
  selectedItems: ClothingItem[];
}) => {
  const scaleY = height / 170; // 基础身高 170cm
  const scaleX = (weight / 70) * 0.8; // 基础体重 70kg

  // 简单的颜色映射，改变模型上的色块
  const topColor = selectedItems.find(i => i.category === ClothingCategory.TOP || i.category === ClothingCategory.OUTERWEAR)?.color || '#f0f0f0';
  const bottomColor = selectedItems.find(i => i.category === ClothingCategory.BOTTOM)?.color || '#333';
  const shoesColor = selectedItems.find(i => i.category === ClothingCategory.SHOES)?.color || '#111';

  return (
    <group position={[0, -1, 0]}>
      {/* 头部 */}
      <mesh position={[0, 1.6 * scaleY, 0]}>
        <sphereGeometry args={[0.15 * scaleX, 32, 32]} />
        <meshStandardMaterial color="#e0ac69" roughness={0.5} />
      </mesh>
      
      {/* 躯干 (上身) */}
      <mesh position={[0, 1.1 * scaleY, 0]}>
        <capsuleGeometry args={[0.25 * scaleX, 0.7 * scaleY, 4, 8]} />
        <meshStandardMaterial color={topColor} />
      </mesh>
      
      {/* 手臂 */}
      <mesh position={[-0.35 * scaleX, 1.1 * scaleY, 0]} rotation={[0,0, -0.2]}>
         <capsuleGeometry args={[0.08 * scaleX, 0.6 * scaleY, 4, 8]} />
         <meshStandardMaterial color={topColor} />
      </mesh>
      <mesh position={[0.35 * scaleX, 1.1 * scaleY, 0]} rotation={[0,0, 0.2]}>
         <capsuleGeometry args={[0.08 * scaleX, 0.6 * scaleY, 4, 8]} />
         <meshStandardMaterial color={topColor} />
      </mesh>

      {/* 腿部 (下身) */}
      <mesh position={[-0.15 * scaleX, 0.4 * scaleY, 0]}>
        <capsuleGeometry args={[0.11 * scaleX, 0.8 * scaleY, 4, 8]} />
        <meshStandardMaterial color={bottomColor} />
      </mesh>
      <mesh position={[0.15 * scaleX, 0.4 * scaleY, 0]}>
        <capsuleGeometry args={[0.11 * scaleX, 0.8 * scaleY, 4, 8]} />
        <meshStandardMaterial color={bottomColor} />
      </mesh>

      {/* 鞋子 */}
      <mesh position={[-0.15 * scaleX, 0, 0.05]}>
         <boxGeometry args={[0.12 * scaleX, 0.1, 0.25]} />
         <meshStandardMaterial color={shoesColor} />
      </mesh>
      <mesh position={[0.15 * scaleX, 0, 0.05]}>
         <boxGeometry args={[0.12 * scaleX, 0.1, 0.25]} />
         <meshStandardMaterial color={shoesColor} />
      </mesh>
    </group>
  );
};

export const TryOn: React.FC<TryOnProps> = ({ userProfile, wardrobe, lang, modelTier, backendAvailable }) => {
  const [selectedItems, setSelectedItems] = useState<ClothingItem[]>([]); // 当前选中的搭配
  const [activeCategory, setActiveCategory] = useState<ClothingCategory>(ClothingCategory.TOP); // 当前浏览的分类
  const [isGenerating, setIsGenerating] = useState(false); // 生成状态
  const [generatedImage, setGeneratedImage] = useState<string | null>(null); // 生成的结果图
  const [isFullscreen, setIsFullscreen] = useState(false); // 全屏预览状态

  const { showError, showSuccess } = useToastContext();
  const t = getTranslation(lang);

  // 定义叠穿组
  const upperCategories = [ClothingCategory.TOP, ClothingCategory.OUTERWEAR, ClothingCategory.DRESS];
  const lowerCategories = [ClothingCategory.BOTTOM];

  // 将选中项分组，顺序基于 selectedItems 数组的顺序
  const upperBodyItems = selectedItems.filter(i => upperCategories.includes(i.category));
  const lowerBodyItems = selectedItems.filter(i => lowerCategories.includes(i.category));
  const otherItems = selectedItems.filter(i => !upperCategories.includes(i.category) && !lowerCategories.includes(i.category));

  // 处理 ESC 键退出全屏
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsFullscreen(false);
      }
    };
    if (isFullscreen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen]);

  // 选择/取消选择衣物
  const toggleItem = (item: ClothingItem) => {
    setSelectedItems(prev => {
      // 如果已存在则移除
      if (prev.find(i => i.id === item.id)) {
        return prev.filter(i => i.id !== item.id);
      }
      // 否则添加到末尾 (默认为最外层)
      return [...prev, item];
    });
  };

  /**
   * 调整叠穿顺序
   * @param group 组别 (upper/lower)
   * @param index 在该组内的索引
   * @param direction 移动方向 (left=inner, right=outer)
   */
  const moveItem = (group: 'upper' | 'lower', index: number, direction: 'left' | 'right') => {
      // 获取当前组的所有项
      const groupItems = group === 'upper' ? upperBodyItems : lowerBodyItems;
      const itemToMove = groupItems[index];
      
      if (!itemToMove) return;

      // 计算在组内的目标索引
      let targetGroupIndex = index;
      if (direction === 'left') targetGroupIndex = index - 1;
      else targetGroupIndex = index + 1;

      // 边界检查
      if (targetGroupIndex < 0 || targetGroupIndex >= groupItems.length) return;

      const itemToSwapWith = groupItems[targetGroupIndex];

      // 在主状态数组中找到对应元素并交换位置
      const indexA = selectedItems.indexOf(itemToMove);
      const indexB = selectedItems.indexOf(itemToSwapWith);
      
      if (indexA === -1 || indexB === -1) return;

      const newSelected = [...selectedItems];
      newSelected[indexA] = itemToSwapWith;
      newSelected[indexB] = itemToMove;
      
      setSelectedItems(newSelected);
  };

  // 调用 API 生成试穿图
  const handleGenerateLook = async () => {
    if (selectedItems.length === 0) {
      showError(lang === 'zh' ? '请先选择衣物' : 'Please select items first');
      return;
    }
    
    if (backendAvailable === false) {
      showError(t.tryOn.backendUnavailable);
      return;
    }
    
    setIsGenerating(true);
    setGeneratedImage(null);

    try {
      const genderText = userProfile.gender === 'female' ? 'female' : userProfile.gender === 'male' ? 'male' : 'person';
      const userDesc = `A ${userProfile.height}cm tall, ${userProfile.weight}kg ${genderText} model`;

      const imageUrl = await generateTryOnImage(userDesc, selectedItems, userProfile.userPhoto, modelTier);
      
      if (imageUrl) {
          setGeneratedImage(imageUrl);
          showSuccess(lang === 'zh' ? '试穿效果生成成功！' : 'Try-on image generated successfully!');
      } else {
          showError(lang === 'zh' ? "生成失败，可能是网络问题或输入数据有误。" : "Generation failed. Please check connection or inputs.");
      }
    } catch (error) {
      console.error('Failed to generate try-on image:', error);
      showError(lang === 'zh' ? "生成失败，请稍后重试。" : "Generation failed. Please try again later.");
    } finally {
      setIsGenerating(false);
    }
  };

  // 下载生成的图片
  const handleDownload = () => {
    if (!generatedImage) return;
    const link = document.createElement('a');
    link.href = generatedImage;
    link.download = `smart-wardrobe-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 可复用的叠穿排序 UI 组件
  const LayeringSection = ({ title, items, group }: { title: string, items: ClothingItem[], group: 'upper' | 'lower' }) => (
      <div className="mb-2">
         <div className="flex justify-between items-center mb-1">
            <h4 className="text-[10px] font-bold uppercase tracking-wider text-gray-500 flex items-center gap-1">
                <Layers size={10} /> {title}
            </h4>
            <div className="flex items-center gap-1 text-[8px] text-gray-400">
                <span className="bg-gray-100 px-1 rounded">{t.tryOn.layeringInner}</span>
                <ArrowRight size={10} />
                <span className="bg-gray-100 px-1 rounded">{t.tryOn.layeringOuter}</span>
            </div>
        </div>
        <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
            {items.map((item, idx) => (
                <div key={item.id} className="flex flex-col items-center gap-0.5 min-w-[50px]">
                    <div className="relative w-12 h-12 rounded-lg border border-gray-200 overflow-hidden bg-gray-50 group shrink-0 shadow-sm">
                        <img src={item.imageUrl} className="w-full h-full object-cover" alt="" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-0.5">
                            <button 
                                onClick={(e) => { e.stopPropagation(); moveItem(group, idx, 'left'); }}
                                disabled={idx === 0}
                                className="p-0.5 text-white hover:bg-white/20 rounded disabled:opacity-30"
                            >
                                <ChevronLeft size={12} />
                            </button>
                            <button 
                                onClick={(e) => { e.stopPropagation(); moveItem(group, idx, 'right'); }}
                                disabled={idx === items.length - 1}
                                className="p-0.5 text-white hover:bg-white/20 rounded disabled:opacity-30"
                            >
                                <ChevronRight size={12} />
                            </button>
                        </div>
                    </div>
                    <div className="flex flex-col items-center w-full">
                        <span className="text-[9px] font-bold text-gray-600 leading-none mb-0.5">{idx + 1}</span>
                        {idx === 0 && <span className="text-[7px] bg-blue-50 text-blue-600 px-1 rounded font-medium">{t.tryOn.layeringInner}</span>}
                        {idx === items.length - 1 && idx !== 0 && <span className="text-[7px] bg-orange-50 text-orange-600 px-1 rounded font-medium">{t.tryOn.layeringOuter}</span>}
                    </div>
                </div>
            ))}
        </div>
      </div>
  );

  return (
    <div className="h-full flex flex-col md:flex-row bg-white">
      {/* 左侧面板：3D 预览或结果展示 */}
      <div className="h-[50vh] md:h-full md:w-1/2 bg-gray-100 relative flex flex-col">
        {/* 可视化区域 (Flex容器) */}
        <div className="flex-1 relative min-h-0 w-full overflow-hidden">
            {generatedImage ? (
                // 结果展示模式
                <div className="relative w-full h-full animate-[fadeIn_0.5s_ease-out] group">
                    <img 
                        src={generatedImage} 
                        alt="AI Generated" 
                        className="w-full h-full object-contain bg-black/5 cursor-zoom-in"
                        onClick={() => setIsFullscreen(true)}
                    />
                    <div className="absolute top-4 left-4 right-4 flex justify-between items-start pointer-events-none">
                         <button 
                            onClick={() => setGeneratedImage(null)}
                            className="pointer-events-auto bg-white/90 backdrop-blur p-2 pr-4 rounded-full text-sm font-medium shadow-sm flex items-center gap-2 hover:bg-white transition-colors"
                        >
                            <ArrowLeft size={16} />
                            {t.tryOn.back}
                        </button>
                        <button
                             onClick={() => setIsFullscreen(true)}
                             className="pointer-events-auto bg-black/50 text-white p-2 rounded-full hover:bg-black/70 transition-colors"
                        >
                            <Maximize2 size={16} />
                        </button>
                    </div>
                </div>
            ) : (
                // 3D 预览模式 (或用户照片模式)
                <>
                    {userProfile.userPhoto ? (
                        <div className="w-full h-full flex items-center justify-center bg-gray-200">
                            <img src={userProfile.userPhoto} alt="User Model" className="w-full h-full object-cover opacity-80" />
                            <div className="absolute top-4 left-4 bg-white/70 backdrop-blur-sm p-2 rounded-lg text-xs flex items-center gap-2">
                                <User size={14} />
                                {t.tryOn.usingUserPhoto}
                            </div>
                        </div>
                    ) : (
                        <Canvas shadows camera={{ position: [0, 0, 4], fov: 50 }}>
                            <ambientLight intensity={0.7} />
                            <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} shadow-mapSize={2048} castShadow />
                            <Environment preset="city" />
                            <Float speed={2} rotationIntensity={0.2} floatIntensity={0.5}>
                                <AvatarModel 
                                    height={userProfile.height} 
                                    weight={userProfile.weight} 
                                    gender={userProfile.gender}
                                    selectedItems={selectedItems}
                                />
                            </Float>
                            <ContactShadows resolution={1024} scale={10} blur={2} opacity={0.25} far={10} color="#000000" />
                            <OrbitControls enablePan={false} minPolarAngle={Math.PI / 2.5} maxPolarAngle={Math.PI / 1.8} />
                        </Canvas>
                    )}
                </>
            )}
        </div>

        {/* 底部控制条 (仅当有选中项时显示) */}
        {!generatedImage && selectedItems.length > 0 && (
            <div className="bg-white/95 backdrop-blur border-t border-gray-200 p-2 z-20 shadow-[0_-5px_15px_rgba(0,0,0,0.05)] shrink-0 overflow-y-auto max-h-[40vh]">
                
                {/* 上身叠穿控制区 */}
                {upperBodyItems.length > 0 && (
                    <LayeringSection title={t.tryOn.layeringTitleUpper} items={upperBodyItems} group="upper" />
                )}

                {/* 下身叠穿控制区 */}
                {lowerBodyItems.length > 0 && (
                    <LayeringSection title={t.tryOn.layeringTitleLower} items={lowerBodyItems} group="lower" />
                )}

                {/* 其他物品 (不排序) */}
                {otherItems.length > 0 && (
                    <div className="mt-1 flex gap-2 justify-center py-1 border-t border-gray-100">
                        {otherItems.map(item => (
                             <div key={item.id} className="w-8 h-8 rounded border border-gray-200 overflow-hidden opacity-70">
                                 <img src={item.imageUrl} className="w-full h-full object-cover" />
                             </div>
                        ))}
                    </div>
                )}

                {/* 生成按钮 */}
                <div className="mt-2 flex justify-center pb-1">
                    {backendAvailable === false && (
                      <div className="mb-2 text-xs text-yellow-700 bg-yellow-50 px-3 py-1.5 rounded-lg border border-yellow-200">
                        {t.tryOn.backendUnavailable}
                      </div>
                    )}
                    <button 
                        onClick={handleGenerateLook}
                        disabled={isGenerating || backendAvailable === false}
                        className="bg-black text-white px-6 py-2.5 rounded-full shadow-lg flex items-center gap-2 font-semibold hover:scale-105 transition-all text-xs md:text-sm disabled:opacity-50"
                    >
                        {isGenerating ? (
                            <>
                                <Loader2 size={14} className="animate-spin" />
                                <span>{t.tryOn.dreaming}</span>
                            </>
                        ) : (
                            <>
                                <Wand2 size={14} />
                                <span>{t.tryOn.visualizeBtn}</span>
                            </>
                        )}
                    </button>
                </div>
            </div>
        )}
      </div>

      {/* 右侧面板：衣物选择器 */}
      <div className="flex-1 flex flex-col h-[50vh] md:h-full border-t border-gray-100 md:border-t-0 md:border-l">
        {/* 顶部标签页 */}
        <div className="flex overflow-x-auto p-3 border-b border-gray-100 no-scrollbar gap-2 shrink-0">
            {Object.values(ClothingCategory).map(cat => (
                <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs md:text-sm font-medium transition-all whitespace-nowrap ${
                        activeCategory === cat ? 'bg-black text-white' : 'bg-gray-50 text-gray-500'
                    }`}
                >
                    {t.category[cat as keyof typeof t.category]}
                </button>
            ))}
        </div>

        {/* 衣物列表 */}
        <div className="flex-1 overflow-y-auto p-3 grid grid-cols-3 md:grid-cols-3 gap-2 content-start min-h-0">
            {wardrobe
                .filter(item => item.category === activeCategory)
                .map(item => {
                    const selectionIndex = selectedItems.findIndex(i => i.id === item.id);
                    const isSelected = selectionIndex !== -1;
                    return (
                        <button
                            key={item.id}
                            onClick={() => toggleItem(item)}
                            className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all group ${
                                isSelected ? 'border-black ring-1 ring-black/20' : 'border-transparent hover:border-gray-200'
                            }`}
                        >
                            <img src={item.imageUrl} className="w-full h-full object-cover" alt="" />
                            {isSelected && (
                                <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                                    <div className="bg-black text-white w-5 h-5 md:w-6 md:h-6 rounded-full flex items-center justify-center text-[10px] md:text-xs font-bold shadow-sm">
                                        {selectionIndex + 1}
                                    </div>
                                </div>
                            )}
                        </button>
                    )
                })
            }
        </div>
      </div>

      {/* 全屏模态框 */}
      {isFullscreen && generatedImage && (
          <div 
            className="fixed inset-0 z-50 bg-black/95 backdrop-blur-sm flex flex-col items-center justify-center animate-[fadeIn_0.2s_ease-out] cursor-zoom-out"
            onClick={() => setIsFullscreen(false)}
          >
              <div 
                className="absolute top-4 right-4 flex gap-4 z-50"
                onClick={(e) => e.stopPropagation()}
              >
                  <button 
                      onClick={handleDownload}
                      className="text-white hover:text-gray-300 flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full backdrop-blur-md"
                  >
                      <Download size={20} />
                      <span className="text-sm font-medium">{t.tryOn.download}</span>
                  </button>
                  <button 
                      onClick={() => setIsFullscreen(false)}
                      className="text-white hover:text-gray-300 bg-white/10 p-2 rounded-full backdrop-blur-md"
                  >
                      <X size={24} />
                  </button>
              </div>
              <img 
                  src={generatedImage} 
                  alt="Full view" 
                  className="max-w-full max-h-full object-contain p-2 md:p-8 cursor-default"
                  onClick={(e) => e.stopPropagation()}
              />
          </div>
      )}
    </div>
  );
};
