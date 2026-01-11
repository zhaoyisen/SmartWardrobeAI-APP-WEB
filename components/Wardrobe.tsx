import React, { useState } from 'react';
import { Plus, X, Camera } from 'lucide-react';
import { ClothingItem, ClothingCategory, Language, ModelTier, ModelConfig } from '../types';
import { getTranslation } from '../utils/translations';
import { UploadModal } from './UploadModal';

interface WardrobeProps {
  items: ClothingItem[]; // 衣物列表
  onRemoveItem: (id: string) => void; // 删除回调
  lang: Language; // 当前语言
  modelTier: ModelTier; // 模型等级
  // 全局上传处理 Props
  onUpload: (files: File[], modelConfig: ModelConfig) => void; // 暂时不使用（分析流程在 UploadModal 内部完成）
  onRefresh?: () => void; // 刷新列表回调（保存衣物后调用）
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
  onRefresh,
  uploadStatus,
  backendAvailable
}) => {
  const [filter, setFilter] = useState<string>('All'); // 当前筛选类别
  const [showUploadModal, setShowUploadModal] = useState(false); // 控制上传模态框显示
  
  const t = getTranslation(lang);

  // 处理上传（从模态框回调）- 暂时不再使用，因为分析流程在 UploadModal 内部完成
  const handleUploadFromModal = (files: File[], modelConfig: ModelConfig) => {
    // 这个回调暂时不会被调用，因为 UploadModal 现在独立处理分析流程
    // 保留它以保持接口兼容性
  };

  // 处理保存完成（从模态框回调）- 用于刷新衣橱列表
  const handleSaveComplete = () => {
    // 保存完成后刷新衣橱列表
    if (onRefresh) {
      onRefresh();
    }
  };

  // 过滤显示的衣物
  // 防御性检查：确保items是数组，防止后端返回错误数据时页面崩溃
  const safeItems = Array.isArray(items) ? items : [];
  const filteredItems = filter === 'All' 
    ? safeItems 
    : safeItems.filter(item => item.category === filter);

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
        onClick={() => setShowUploadModal(true)}
        disabled={uploadStatus.isUploading}
        className="absolute bottom-6 right-6 w-14 h-14 bg-black text-white rounded-full shadow-lg flex items-center justify-center hover:scale-105 transition-transform disabled:bg-gray-400 z-20"
      >
        {uploadStatus.isUploading ? (
          <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
        ) : (
          <Plus size={28} />
        )}
      </button>

      {/* 上传模态框 */}
      <UploadModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        onUpload={handleUploadFromModal}
        onSaveComplete={handleSaveComplete}
        lang={lang}
        isUploading={uploadStatus.isUploading}
      />
    </div>
  );
};