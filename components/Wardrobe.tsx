import React, { useRef, useState } from 'react';
import { Plus, X, Camera } from 'lucide-react';
import { ClothingItem, ClothingCategory, Language, ModelTier } from '../types';
import { getTranslation } from '../utils/translations';

interface WardrobeProps {
  items: ClothingItem[]; // 衣物列表
  onRemoveItem: (id: string) => void; // 删除回调
  lang: Language; // 当前语言
  modelTier: ModelTier; // 模型等级
  // 全局上传处理 Props
  onUpload: (files: FileList | null) => void; 
  uploadStatus: { isUploading: boolean; current: number; total: number };
  backendAvailable?: boolean | null; // 后端可用性状态
}

/**
 * 衣橱组件
 * 展示用户所有上传的衣物，支持分类筛选和批量上传
 */
export const Wardrobe: React.FC<WardrobeProps> = ({ 
  items, 
  onRemoveItem, 
  lang, 
  modelTier, 
  onUpload, 
  uploadStatus,
  backendAvailable
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [filter, setFilter] = useState<string>('All'); // 当前筛选类别
  
  const t = getTranslation(lang);

  // 处理文件选择，触发上传回调
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onUpload(e.target.files);
    // 重置 input 以允许再次选择相同文件
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // 过滤显示的衣物
  const filteredItems = filter === 'All' 
    ? items 
    : items.filter(item => item.category === filter);

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* 顶部标题和过滤器 */}
      <div className="p-4 bg-white shadow-sm sticky top-0 z-10">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">{t.wardrobe.title}</h2>
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
          {['All', ...Object.values(ClothingCategory)].map(cat => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                filter === cat 
                  ? 'bg-black text-white' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {cat === 'All' ? t.wardrobe.filterAll : t.category[cat as keyof typeof t.category]}
            </button>
          ))}
        </div>
      </div>

      {/* 后端状态提示 */}
      {backendAvailable === false && (
        <div className="mx-4 mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
          <p>{t.wardrobe.backendUnavailable}</p>
        </div>
      )}

      {/* 衣物网格展示区 */}
      <div className="flex-1 overflow-y-auto p-4 pb-24">
        {filteredItems.length === 0 ? (
          // 空状态展示
          <div className="flex flex-col items-center justify-center h-64 text-gray-400">
            <Camera className="w-12 h-12 mb-2 opacity-50" />
            <p>{uploadStatus.isUploading ? t.wardrobe.uploading.replace('{current}', uploadStatus.current.toString()).replace('{total}', uploadStatus.total.toString()) : t.wardrobe.empty}</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredItems.map(item => (
              <div key={item.id} className="relative group bg-white rounded-xl shadow-sm overflow-hidden aspect-[3/4]">
                <img 
                  src={item.imageUrl} 
                  alt={item.description} 
                  className="w-full h-full object-cover"
                />
                {/* 删除按钮 (悬停显示) */}
                <button
                  onClick={() => onRemoveItem(item.id)}
                  className="absolute top-2 right-2 p-1.5 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X size={14} />
                </button>
                {/* 底部信息栏 */}
                <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/70 to-transparent text-white">
                  <p className="text-xs font-semibold truncate">
                    {t.category[item.category as keyof typeof t.category]}
                  </p>
                  <p className="text-[10px] opacity-80 truncate">{item.tags.join(', ')}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 悬浮上传按钮 (FAB) */}
      <button
        onClick={() => fileInputRef.current?.click()}
        disabled={uploadStatus.isUploading}
        className="absolute bottom-6 right-6 w-14 h-14 bg-black text-white rounded-full shadow-lg flex items-center justify-center hover:scale-105 transition-transform disabled:bg-gray-400 z-20"
      >
        {uploadStatus.isUploading ? (
          <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
        ) : (
          <Plus size={28} />
        )}
      </button>
      {/* 隐藏的文件输入框 */}
      <input 
        type="file" 
        multiple
        ref={fileInputRef} 
        onChange={handleFileChange} 
        accept="image/*" 
        className="hidden" 
      />
    </div>
  );
};