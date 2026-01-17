import React, { useState, useEffect, useRef } from 'react';
import { Plus, X, Camera, Image as ImageIcon, Scissors, Edit2, Trash2, Grid3x3, LayoutGrid, Save, Loader2, ChevronDown } from 'lucide-react';
import { ClothingVO, DictItem, Language, ModelTier, ModelConfig, CategoryItem, ClothingCreateDTO, ClothingFilterOptionsVO } from '../types';
import { getTranslation } from '../utils/translations';
import { UploadModal } from './UploadModal';
import { getClothingList, getDictList, getCategoryList, saveClothing, getClothingFilterOptions } from '../services/apiService';
import { useToastContext } from '../contexts/ToastContext';

interface WardrobeProps {
  onRemoveItem: (id: number) => void; // 删除回调（id为number类型）
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
 * 展示用户所有上传的衣物，支持分类筛选、无限滚动和批量上传
 */
export const Wardrobe: React.FC<WardrobeProps> = ({ 
  onRemoveItem, 
  lang, 
  modelTier, 
  onUpload, 
  onRefresh,
  uploadStatus,
  backendAvailable
}) => {
  // 状态管理
  const [clothingList, setClothingList] = useState<ClothingVO[]>([]); // 累积加载的数据
  const [regionFilter, setRegionFilter] = useState<string | null>(null); // 当前筛选的部位，null表示全部
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null); // 当前筛选的品类，null表示全部
  const [layerFilter, setLayerFilter] = useState<number | null>(null); // 当前筛选的层级，null表示全部
  const [colorFilter, setColorFilter] = useState<string | null>(null); // 当前筛选的颜色，null表示全部
  const [seasonFilter, setSeasonFilter] = useState<string | null>(null); // 当前筛选的季节，null表示全部
  const [fitTypeFilter, setFitTypeFilter] = useState<string | null>(null); // 当前筛选的版型，null表示全部
  const [regionDict, setRegionDict] = useState<DictItem[]>([]); // 从字典加载的筛选选项
  const [currentPage, setCurrentPage] = useState<number>(1); // 当前页码，从1开始
  const [hasMore, setHasMore] = useState<boolean>(true); // 是否还有更多数据
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false); // 是否正在加载更多
  const [imageMode, setImageMode] = useState<'original' | 'mask'>('original'); // 图片显示模式
  const [showUploadModal, setShowUploadModal] = useState(false); // 控制上传模态框显示
  const [isLoadingInitial, setIsLoadingInitial] = useState<boolean>(true); // 初始加载状态
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null); // 全屏预览图片
  const [longPressItem, setLongPressItem] = useState<ClothingVO | null>(null); // 长按的衣物项
  const [showActionMenu, setShowActionMenu] = useState<boolean>(false); // 是否显示操作菜单
  const [actionMenuPosition, setActionMenuPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 }); // 菜单位置
  const [gridColumns, setGridColumns] = useState<number>(3); // 网格列数（2或3）
  const [isLongPressing, setIsLongPressing] = useState<boolean>(false); // 是否正在长按
  const [editingItem, setEditingItem] = useState<ClothingVO | null>(null); // 正在编辑的衣物
  const [showEditModal, setShowEditModal] = useState<boolean>(false); // 是否显示编辑模态框
  const [isSaving, setIsSaving] = useState<boolean>(false); // 是否正在保存
  const [editFormData, setEditFormData] = useState<Partial<ClothingVO>>({}); // 编辑表单数据
  const [categories, setCategories] = useState<CategoryItem[]>([]); // 品类列表
  const [layerDict, setLayerDict] = useState<DictItem[]>([]); // 层级字典
  const [colorDict, setColorDict] = useState<DictItem[]>([]); // 颜色字典
  const [seasonDict, setSeasonDict] = useState<DictItem[]>([]); // 季节字典
  const [fitTypeDict, setFitTypeDict] = useState<DictItem[]>([]); // 版型字典
  const [viewTypeDict, setViewTypeDict] = useState<DictItem[]>([]); // 视角字典
  const [loadingDicts, setLoadingDicts] = useState<boolean>(false); // 加载字典状态
  const [openSeasonDropdown, setOpenSeasonDropdown] = useState<boolean>(false); // 季节下拉框打开状态
  const [editFullscreenImage, setEditFullscreenImage] = useState<string | null>(null); // 编辑模态框全屏图片
  const [filterOptions, setFilterOptions] = useState<ClothingFilterOptionsVO>({ regions: [], categories: [], layers: [], colors: [], seasons: [], fitTypes: [] }); // 用户已有的筛选选项
  const [showMoreFilters, setShowMoreFilters] = useState<boolean>(false); // 是否显示更多筛选
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null); // 长按定时器
  
  const t = getTranslation(lang);
  const { showError, showSuccess } = useToastContext();
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // 加载所有筛选选项数据（品类、字典等）和用户已有的筛选选项
  useEffect(() => {
    const loadFilterOptions = async () => {
      try {
        // 并行加载所有筛选选项数据和用户已有的筛选选项
        const [categoriesData, regionData, layerData, colorData, seasonData, fitTypeData, userFilterOptions] = await Promise.all([
          getCategoryList(),
          getDictList('clothing_region'),
          getDictList('clothing_layer'),
          getDictList('clothing_color'),
          getDictList('clothing_season'),
          getDictList('clothing_fit_type'),
          getClothingFilterOptions(),
        ]);
        
        setCategories(categoriesData);
        setRegionDict(regionData);
        setLayerDict(layerData);
        setColorDict(colorData);
        setSeasonDict(seasonData);
        setFitTypeDict(fitTypeData);
        setFilterOptions(userFilterOptions);
      } catch (error) {
        console.error('Failed to load filter options:', error);
      }
    };
    loadFilterOptions();
  }, []);

  // 加载衣物列表
  const loadClothingList = async (page: number, reset: boolean = false) => {
    if (isLoadingMore && !reset) {
      return; // 防止重复加载
    }

    setIsLoadingMore(true);
    try {
      const query = {
        current: page,
        size: 20, // 每页20条
        region: regionFilter || undefined,
        category: categoryFilter || undefined,
        defaultLayer: layerFilter !== null ? layerFilter : undefined,
        color: colorFilter || undefined,
        season: seasonFilter || undefined,
        fitType: fitTypeFilter || undefined,
      };
      
      const result = await getClothingList(query);
      
      if (reset) {
        setClothingList(result.records);
        setCurrentPage(result.current);
      } else {
        setClothingList(prev => [...prev, ...result.records]);
        setCurrentPage(result.current);
      }
      
      // 判断是否还有更多数据
      setHasMore(result.current < result.pages);
    } catch (error) {
      console.error('Failed to load clothing list:', error);
      showError(lang === 'zh' ? '加载衣物列表失败，请稍后重试' : 'Failed to load clothing list, please try again later');
    } finally {
      setIsLoadingMore(false);
      setIsLoadingInitial(false);
    }
  };

  // 初始加载和筛选改变时加载数据
  useEffect(() => {
    setIsLoadingInitial(true);
    loadClothingList(1, true);
  }, [regionFilter, categoryFilter, layerFilter, colorFilter, seasonFilter, fitTypeFilter]);

  // 处理保存完成（从模态框回调）- 用于刷新衣橱列表
  const handleSaveComplete = () => {
    // 保存完成后刷新衣橱列表（重置到第一页）
    setClothingList([]);
    loadClothingList(1, true);
    if (onRefresh) {
      onRefresh();
    }
  };

  // 无限滚动处理
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const element = e.currentTarget;
    const { scrollTop, scrollHeight, clientHeight } = element;
    const distanceToBottom = scrollHeight - scrollTop - clientHeight;
    
    // 距离底部小于100px时加载更多
    if (distanceToBottom < 100 && hasMore && !isLoadingMore && !isLoadingInitial) {
      loadClothingList(currentPage + 1, false);
    }
  };

  // 获取图片URL
  const getImageUrl = (item: ClothingVO): string => {
    if (imageMode === 'mask' && item.maskImageUrl) {
      return item.maskImageUrl;
    }
    return item.imageUrl;
  };

  // 点击图片查看大图
  const handleImageClick = (item: ClothingVO, e: React.MouseEvent | React.TouchEvent) => {
    // 如果正在长按，不执行点击事件
    if (isLongPressing) {
      return;
    }
    e.stopPropagation();
    setFullscreenImage(getImageUrl(item));
  };

  // 长按开始
  const handleLongPressStart = (item: ClothingVO, e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    setIsLongPressing(false);
    
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    
    longPressTimerRef.current = setTimeout(() => {
      setIsLongPressing(true);
      setLongPressItem(item);
      setActionMenuPosition({ x: clientX, y: clientY });
      setShowActionMenu(true);
      // 阻止默认的长按行为（如文本选择）
      if ('touches' in e) {
        e.preventDefault();
      }
    }, 500); // 500ms 长按
  };

  // 长按结束/取消
  const handleLongPressEnd = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    // 延迟重置，防止立即触发点击
    if (isLongPressing) {
      setTimeout(() => {
        setIsLongPressing(false);
      }, 100);
    }
  };

  // 处理删除
  const handleDelete = (item: ClothingVO) => {
    setShowActionMenu(false);
    setLongPressItem(null);
    onRemoveItem(item.id);
  };

  // 加载编辑所需的字典和品类数据
  const loadEditDictsAndCategories = async () => {
    if (categories.length > 0 && layerDict.length > 0) {
      return; // 已经加载过
    }
    setLoadingDicts(true);
    try {
      const [categoriesData, layerData, colorData, seasonData, fitTypeData, viewTypeData] = await Promise.all([
        getCategoryList(),
        getDictList('clothing_layer'),
        getDictList('clothing_color'),
        getDictList('clothing_season'),
        getDictList('clothing_fit_type'),
        getDictList('clothing_view_type'),
      ]);
      setCategories(categoriesData);
      setLayerDict(layerData);
      setColorDict(colorData);
      setSeasonDict(seasonData);
      setFitTypeDict(fitTypeData);
      setViewTypeDict(viewTypeData);
    } catch (error) {
      console.error('Failed to load edit dicts and categories:', error);
    } finally {
      setLoadingDicts(false);
    }
  };

  // 处理编辑
  const handleEdit = async (item: ClothingVO) => {
    setShowActionMenu(false);
    setLongPressItem(null);
    setEditingItem(item);
    // 初始化表单数据
    setEditFormData({
      name: item.name || '',
      category: item.category || '',
      region: item.region || '',
      defaultLayer: item.defaultLayer,
      color: item.color || '',
      season: item.season || '',
      fitType: item.fitType || '',
      viewType: item.viewType || '',
      shelfNo: item.shelfNo || '',
      brand: item.brand || '',
      size: item.size || '',
      price: item.price,
      purchaseDate: item.purchaseDate || '',
      status: item.status !== undefined ? item.status : 1,
      wearCount: item.wearCount !== undefined ? item.wearCount : 0,
    });
    // 加载字典数据
    await loadEditDictsAndCategories();
    setShowEditModal(true);
  };

  // 更新编辑表单字段
  const handleEditFieldChange = (field: keyof ClothingVO, value: string | number) => {
    setEditFormData(prev => ({ ...prev, [field]: value }));
  };

  // 解析季节字符串为数组
  const parseSeasonString = (seasonStr: string): string[] => {
    if (!seasonStr) return [];
    return seasonStr.split(',').map(s => s.trim()).filter(s => s);
  };

  // 处理季节多选
  const handleSeasonChange = (selectedValues: string[]) => {
    const seasonValue = selectedValues.join(',');
    handleEditFieldChange('season', seasonValue);
  };

  // 保存编辑
  const handleSaveEdit = async () => {
    if (!editingItem) return;
    
    setIsSaving(true);
    try {
      // 构建 ClothingCreateDTO 对象（编辑时传入id）
      const dto: ClothingCreateDTO = {
        // 编辑时必填id
        id: editingItem.id,
        // 必填字段
        imageId: editingItem.imageId,
        category: editFormData.category || editingItem.category || '',
        color: editFormData.color || editingItem.color || '',
        season: editFormData.season || editingItem.season || '',
        // 可选字段
        maskImageId: editingItem.maskImageId,
        region: editFormData.region || editingItem.region,
        defaultLayer: editFormData.defaultLayer !== undefined ? editFormData.defaultLayer : editingItem.defaultLayer,
        fitType: editFormData.fitType || editingItem.fitType,
        viewType: editFormData.viewType || editingItem.viewType,
        name: editFormData.name || editingItem.name,
        shelfNo: editFormData.shelfNo || editingItem.shelfNo,
        brand: editFormData.brand || editingItem.brand,
        size: editFormData.size || editingItem.size,
        price: editFormData.price !== undefined ? editFormData.price : editingItem.price,
        purchaseDate: editFormData.purchaseDate || editingItem.purchaseDate,
        status: editFormData.status !== undefined ? editFormData.status : editingItem.status,
        wearCount: editFormData.wearCount !== undefined ? editFormData.wearCount : editingItem.wearCount,
      };
      
      // 调用统一保存接口（编辑场景，传入id）
      await saveClothing(dto);
      showSuccess(lang === 'zh' ? '保存成功' : 'Saved successfully');
      setShowEditModal(false);
      setEditingItem(null);
      // 刷新列表
      handleSaveComplete();
    } catch (error) {
      console.error('Failed to save clothing:', error);
      showError(lang === 'zh' ? '保存失败，请稍后重试' : 'Failed to save, please try again later');
    } finally {
      setIsSaving(false);
    }
  };

  // ESC 键关闭全屏预览
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (fullscreenImage) {
          setFullscreenImage(null);
        }
        if (showActionMenu) {
          setShowActionMenu(false);
          setLongPressItem(null);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [fullscreenImage, showActionMenu]);

  // 点击菜单外区域关闭菜单
  useEffect(() => {
    const handleClickOutside = () => {
      if (showActionMenu) {
        setShowActionMenu(false);
        setLongPressItem(null);
      }
    };
    if (showActionMenu) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showActionMenu]);


  // 处理上传（从模态框回调）- 暂时不再使用，因为分析流程在 UploadModal 内部完成
  const handleUploadFromModal = (files: File[], modelConfig: ModelConfig) => {
    // 这个回调暂时不会被调用，因为 UploadModal 现在独立处理分析流程
    // 保留它以保持接口兼容性
  };

  // 根据用户实际拥有的数据过滤筛选选项
  // 如果 filterOptions 中某项为空或不存在，返回空数组（不显示该筛选栏）
  const getFilteredRegionDict = (): DictItem[] => {
    if (!filterOptions.regions || filterOptions.regions.length === 0) return [];
    return regionDict.filter(item => filterOptions.regions!.includes(item.dictValue));
  };

  const getFilteredCategories = (): CategoryItem[] => {
    if (!filterOptions.categories || filterOptions.categories.length === 0) return [];
    return categories.filter(item => filterOptions.categories!.includes(item.code));
  };

  const getFilteredLayerDict = (): DictItem[] => {
    if (!filterOptions.layers || filterOptions.layers.length === 0) return [];
    return layerDict.filter(item => filterOptions.layers!.includes(Number(item.dictValue)));
  };

  const getFilteredColorDict = (): DictItem[] => {
    if (!filterOptions.colors || filterOptions.colors.length === 0) return [];
    return colorDict.filter(item => filterOptions.colors!.includes(item.dictValue));
  };

  const getFilteredSeasonDict = (): DictItem[] => {
    if (!filterOptions.seasons || filterOptions.seasons.length === 0) return [];
    return seasonDict.filter(item => filterOptions.seasons!.includes(item.dictValue));
  };

  const getFilteredFitTypeDict = (): DictItem[] => {
    if (!filterOptions.fitTypes || filterOptions.fitTypes.length === 0) return [];
    return fitTypeDict.filter(item => filterOptions.fitTypes!.includes(item.dictValue));
  };

  // 检查是否有任何筛选选项可用
  const hasAnyFilterOptions = (): boolean => {
    return getFilteredCategories().length > 0 ||
           getFilteredRegionDict().length > 0 ||
           getFilteredLayerDict().length > 0 ||
           getFilteredColorDict().length > 0 ||
           getFilteredSeasonDict().length > 0 ||
           getFilteredFitTypeDict().length > 0;
  };

  return (
    <div className="h-full flex flex-col bg-gray-50 relative">
      {/* 顶部标题和过滤器 */}
      <div className="p-4 bg-white shadow-sm sticky top-0 z-10">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">{t.wardrobe.title}</h2>
        
        {/* 筛选栏容器 */}
        {hasAnyFilterOptions() && (
        <div className="space-y-3">
          {/* 品类筛选 */}
          {getFilteredCategories().length > 0 && (
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
              <button
                onClick={() => setCategoryFilter(null)}
                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                  categoryFilter === null 
                    ? 'bg-black text-white' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {t.wardrobe.filterAll}
              </button>
              {getFilteredCategories().map(item => (
                <button
                  key={item.code}
                  onClick={() => setCategoryFilter(item.code)}
                  className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                    categoryFilter === item.code 
                      ? 'bg-black text-white' 
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          )}
          
          {/* 部位筛选 */}
          {getFilteredRegionDict().length > 0 && (
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
              <button
                onClick={() => setRegionFilter(null)}
                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                  regionFilter === null 
                    ? 'bg-black text-white' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {t.wardrobe.filterAll}
              </button>
              {getFilteredRegionDict().map(item => (
                <button
                  key={item.dictValue}
                  onClick={() => setRegionFilter(item.dictValue)}
                  className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                    regionFilter === item.dictValue 
                      ? 'bg-black text-white' 
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {item.dictLabel}
                </button>
              ))}
            </div>
          )}

          {/* 更多筛选按钮 */}
          {(getFilteredLayerDict().length > 0 || getFilteredColorDict().length > 0 || getFilteredSeasonDict().length > 0 || getFilteredFitTypeDict().length > 0) && (
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
              <button
                onClick={() => setShowMoreFilters(!showMoreFilters)}
                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                  showMoreFilters
                    ? 'bg-black text-white' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <span>{lang === 'zh' ? '更多筛选' : 'More Filters'}</span>
                <ChevronDown size={14} className={`transition-transform ${showMoreFilters ? 'rotate-180' : ''}`} />
              </button>
            </div>
          )}

          {/* 更多筛选内容 */}
          {showMoreFilters && (
            <>
              {/* 层级筛选 */}
              {getFilteredLayerDict().length > 0 && (
                <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
                  <button
                    onClick={() => setLayerFilter(null)}
                    className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                      layerFilter === null 
                        ? 'bg-black text-white' 
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {t.wardrobe.filterAll}
                  </button>
                  {getFilteredLayerDict().map(item => (
                    <button
                      key={item.dictValue}
                      onClick={() => setLayerFilter(Number(item.dictValue))}
                      className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                        layerFilter === Number(item.dictValue)
                          ? 'bg-black text-white' 
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {item.dictLabel}
                    </button>
                  ))}
                </div>
              )}
              
              {/* 颜色筛选 */}
              {getFilteredColorDict().length > 0 && (
                <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
                  <button
                    onClick={() => setColorFilter(null)}
                    className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                      colorFilter === null 
                        ? 'bg-black text-white' 
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {t.wardrobe.filterAll}
                  </button>
                  {getFilteredColorDict().map(item => (
                    <button
                      key={item.dictValue}
                      onClick={() => setColorFilter(item.dictValue)}
                      className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                        colorFilter === item.dictValue 
                          ? 'bg-black text-white' 
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {item.dictLabel}
                    </button>
                  ))}
                </div>
              )}
              
              {/* 季节筛选 */}
              {getFilteredSeasonDict().length > 0 && (
                <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
                  <button
                    onClick={() => setSeasonFilter(null)}
                    className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                      seasonFilter === null 
                        ? 'bg-black text-white' 
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {t.wardrobe.filterAll}
                  </button>
                  {getFilteredSeasonDict().map(item => (
                    <button
                      key={item.dictValue}
                      onClick={() => setSeasonFilter(item.dictValue)}
                      className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                        seasonFilter === item.dictValue 
                          ? 'bg-black text-white' 
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {item.dictLabel}
                    </button>
                  ))}
                </div>
              )}
              
              {/* 版型筛选 */}
              {getFilteredFitTypeDict().length > 0 && (
                <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
                  <button
                    onClick={() => setFitTypeFilter(null)}
                    className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                      fitTypeFilter === null 
                        ? 'bg-black text-white' 
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {t.wardrobe.filterAll}
                  </button>
                  {getFilteredFitTypeDict().map(item => (
                    <button
                      key={item.dictValue}
                      onClick={() => setFitTypeFilter(item.dictValue)}
                      className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                        fitTypeFilter === item.dictValue 
                          ? 'bg-black text-white' 
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {item.dictLabel}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
        )}
        {/* 控制栏：列数选择和图片切换 */}
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-200">
          {/* 列数选择 */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-600 mr-1">{lang === 'zh' ? '列数：' : 'Columns:'}</span>
            <button
              onClick={() => setGridColumns(2)}
              className={`p-1.5 rounded transition-colors ${
                gridColumns === 2
                  ? 'bg-black text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
              title={lang === 'zh' ? '2列' : '2 columns'}
            >
              <LayoutGrid size={18} />
            </button>
            <button
              onClick={() => setGridColumns(3)}
              className={`p-1.5 rounded transition-colors ${
                gridColumns === 3
                  ? 'bg-black text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
              title={lang === 'zh' ? '3列' : '3 columns'}
            >
              <Grid3x3 size={18} />
            </button>
          </div>
          {/* 图片切换 */}
          <button
            onClick={() => setImageMode(imageMode === 'original' ? 'mask' : 'original')}
            className={`px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5 transition-colors ${
              imageMode === 'mask'
                ? 'bg-black text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {imageMode === 'original' ? (
              <>
                <Scissors size={16} />
                <span>{lang === 'zh' ? '分割图' : 'Mask'}</span>
              </>
            ) : (
              <>
                <ImageIcon size={16} />
                <span>{lang === 'zh' ? '原图' : 'Original'}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* 后端状态提示 */}
      {backendAvailable === false && (
        <div className="mx-4 mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
          <p>{t.wardrobe.backendUnavailable}</p>
        </div>
      )}

      {/* 衣物网格展示区 */}
      <div 
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto p-3 pb-32" 
        onScroll={handleScroll}
      >
        {isLoadingInitial ? (
          // 初始加载状态
          <div className="flex flex-col items-center justify-center h-64 text-gray-400">
            <div className="w-8 h-8 border-2 border-gray-300 border-t-black rounded-full animate-spin mb-2" />
            <p>{lang === 'zh' ? '加载中...' : 'Loading...'}</p>
          </div>
        ) : clothingList.length === 0 ? (
          // 空状态展示
          <div className="flex flex-col items-center justify-center h-64 text-gray-400">
            <Camera className="w-12 h-12 mb-2 opacity-50" />
            <p>{uploadStatus.isUploading ? t.wardrobe.uploading.replace('{current}', uploadStatus.current.toString()).replace('{total}', uploadStatus.total.toString()) : t.wardrobe.empty}</p>
          </div>
        ) : (
          <>
            <div className={`grid gap-2 md:gap-3 ${gridColumns === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
              {clothingList.map(item => (
                <div 
                  key={item.id} 
                  className="relative bg-white rounded-lg shadow-sm overflow-hidden aspect-square cursor-pointer"
                  onClick={(e) => handleImageClick(item, e)}
                  onTouchStart={(e) => handleLongPressStart(item, e)}
                  onTouchEnd={handleLongPressEnd}
                  onMouseDown={(e) => handleLongPressStart(item, e)}
                  onMouseUp={handleLongPressEnd}
                  onMouseLeave={handleLongPressEnd}
                >
                  <img 
                    src={getImageUrl(item)} 
                    alt={item.name || `Clothing ${item.id}`} 
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      // 如果分割图加载失败，回退到原图
                      if (imageMode === 'mask' && item.maskImageUrl) {
                        const target = e.target as HTMLImageElement;
                        target.src = item.imageUrl;
                      }
                    }}
                  />
                  {/* 底部信息栏 */}
                  {item.name || item.region ? (
                    <div className="absolute bottom-0 left-0 right-0 p-1.5 bg-gradient-to-t from-black/70 to-transparent text-white">
                      {item.name && (
                        <p className="text-[10px] font-semibold truncate">{item.name}</p>
                      )}
                      {item.region && (
                        <p className="text-[9px] opacity-80 truncate">
                          {regionDict.find(d => d.dictValue === item.region)?.dictLabel || item.region}
                        </p>
                      )}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
            {/* 加载更多指示器 */}
            {isLoadingMore && (
              <div className="flex items-center justify-center py-6">
                <div className="w-6 h-6 border-2 border-gray-300 border-t-black rounded-full animate-spin" />
              </div>
            )}
            {!hasMore && clothingList.length > 0 && (
              <div className="text-center py-6 text-gray-400 text-sm">
                {lang === 'zh' ? '没有更多了' : 'No more items'}
              </div>
            )}
          </>
        )}
      </div>

      {/* 悬浮上传按钮 (FAB) */}
      <button
        onClick={() => setShowUploadModal(true)}
        disabled={uploadStatus.isUploading}
        className="fixed bottom-20 right-4 md:bottom-6 md:right-6 w-14 h-14 bg-black text-white rounded-full shadow-lg flex items-center justify-center hover:scale-105 transition-transform disabled:bg-gray-400 z-30"
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

      {/* 全屏图片预览 */}
      {fullscreenImage && (
        <div 
          className="fixed inset-0 z-50 bg-black/95 backdrop-blur-sm flex flex-col items-center justify-center animate-[fadeIn_0.2s_ease-out] cursor-zoom-out"
          onClick={() => setFullscreenImage(null)}
        >
          <div 
            className="absolute top-4 right-4 flex gap-4 z-50"
            onClick={(e) => e.stopPropagation()}
          >
            <button 
              onClick={() => setFullscreenImage(null)}
              className="text-white hover:text-gray-300 bg-white/10 p-2 rounded-full backdrop-blur-md transition-colors"
            >
              <X size={24} />
            </button>
          </div>
          <img 
            src={fullscreenImage} 
            alt="Full view" 
            className="max-w-full max-h-full object-contain p-2 md:p-8 cursor-default"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {/* 长按操作菜单 */}
      {showActionMenu && longPressItem && (
        <div
          className="fixed z-50 bg-white rounded-lg shadow-xl border border-gray-200 py-2 min-w-[120px] animate-[fadeIn_0.2s_ease-out]"
          style={{
            left: `${Math.min(actionMenuPosition.x, window.innerWidth - 140)}px`,
            top: `${Math.min(actionMenuPosition.y, window.innerHeight - 100)}px`,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => handleEdit(longPressItem)}
            className="w-full px-4 py-2.5 flex items-center gap-2 text-gray-700 hover:bg-gray-100 transition-colors text-sm"
          >
            <Edit2 size={16} />
            <span>{lang === 'zh' ? '编辑' : 'Edit'}</span>
          </button>
          <button
            onClick={() => handleDelete(longPressItem)}
            className="w-full px-4 py-2.5 flex items-center gap-2 text-red-600 hover:bg-red-50 transition-colors text-sm"
          >
            <Trash2 size={16} />
            <span>{lang === 'zh' ? '删除' : 'Delete'}</span>
          </button>
        </div>
      )}

      {/* 编辑模态框 */}
      {showEditModal && editingItem && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowEditModal(false)}>
          <div 
            className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-xl animate-[scaleIn_0.2s_ease-out] relative overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 头部 */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-800">{lang === 'zh' ? '编辑衣物' : 'Edit Clothing'}</h2>
              <button
                onClick={() => setShowEditModal(false)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* 内容区域 - 可滚动 */}
            <div className="flex-1 overflow-y-auto p-6">
              {loadingDicts ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 size={24} className="animate-spin text-gray-400" />
                </div>
              ) : (
                <div className="space-y-6">
                  {/* 图片预览 */}
                  <div className="flex gap-4 mb-4">
                    <div className="flex flex-col items-start">
                      <label className="block text-sm font-medium text-gray-700 mb-2">{lang === 'zh' ? '原图' : 'Original Image'}</label>
                      <img 
                        src={editingItem.imageUrl} 
                        alt="Original" 
                        onClick={() => setEditFullscreenImage(editingItem.imageUrl)}
                        className="w-32 h-32 object-contain rounded-lg border border-gray-200 cursor-pointer hover:opacity-80 transition-opacity bg-gray-50" 
                      />
                    </div>
                    {editingItem.maskImageUrl && (
                      <div className="flex flex-col items-start">
                        <label className="block text-sm font-medium text-gray-700 mb-2">{lang === 'zh' ? '分割图' : 'Mask Image'}</label>
                        <img 
                          src={editingItem.maskImageUrl} 
                          alt="Mask" 
                          onClick={() => setEditFullscreenImage(editingItem.maskImageUrl!)}
                          className="w-32 h-32 object-contain rounded-lg border border-gray-200 cursor-pointer hover:opacity-80 transition-opacity bg-gray-50" 
                        />
                      </div>
                    )}
                  </div>

                  {/* 编辑表单 */}
                  <div className="grid grid-cols-2 gap-4">
                    {/* 衣物名称 */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{lang === 'zh' ? '衣物名称' : 'Name'}</label>
                      <input
                        type="text"
                        value={editFormData.name || ''}
                        onChange={(e) => handleEditFieldChange('name', e.target.value)}
                        maxLength={64}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent bg-white"
                        placeholder={lang === 'zh' ? '可选' : 'Optional'}
                      />
                    </div>
                    {/* 品类 */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{lang === 'zh' ? '品类' : 'Category'}</label>
                      <select
                        value={editFormData.category || ''}
                        onChange={(e) => handleEditFieldChange('category', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent bg-white cursor-pointer"
                      >
                        {categories.map((cat) => (
                          <option key={cat.code} value={cat.code}>{cat.label}</option>
                        ))}
                      </select>
                    </div>
                    {/* 部位 */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{lang === 'zh' ? '部位' : 'Region'}</label>
                      <select
                        value={editFormData.region || ''}
                        onChange={(e) => handleEditFieldChange('region', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent bg-white cursor-pointer"
                      >
                        {regionDict.map((item) => (
                          <option key={item.dictValue} value={item.dictValue}>{item.dictLabel}</option>
                        ))}
                      </select>
                    </div>
                    {/* 建议层级 */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{lang === 'zh' ? '建议层级' : 'Default Layer'}</label>
                      <select
                        value={editFormData.defaultLayer?.toString() || ''}
                        onChange={(e) => handleEditFieldChange('defaultLayer', Number(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent bg-white cursor-pointer"
                      >
                        {layerDict.map((item) => (
                          <option key={item.dictValue} value={item.dictValue}>{item.dictLabel}</option>
                        ))}
                      </select>
                    </div>
                    {/* 主色调 */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{lang === 'zh' ? '主色调' : 'Color'}</label>
                      <select
                        value={editFormData.color || ''}
                        onChange={(e) => handleEditFieldChange('color', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent bg-white cursor-pointer"
                      >
                        {colorDict.map((item) => (
                          <option key={item.dictValue} value={item.dictValue}>{item.dictLabel}</option>
                        ))}
                      </select>
                    </div>
                    {/* 季节 - 多选 */}
                    <div className="relative">
                      <label className="block text-sm font-medium text-gray-700 mb-1">{lang === 'zh' ? '季节' : 'Season'}</label>
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setOpenSeasonDropdown(!openSeasonDropdown)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black bg-white text-left flex items-center justify-between cursor-pointer"
                        >
                          <div className="flex flex-wrap gap-1 flex-1">
                            {(() => {
                              const selectedSeasons = parseSeasonString(editFormData.season || '');
                              if (selectedSeasons.length === 0) {
                                return <span className="text-gray-400">{lang === 'zh' ? '请选择季节' : 'Select season'}</span>;
                              }
                              return selectedSeasons.map(seasonValue => {
                                const seasonItem = seasonDict.find(item => item.dictValue === seasonValue);
                                return seasonItem ? (
                                  <span key={seasonValue} className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-sm">
                                    {seasonItem.dictLabel}
                                    <X
                                      size={12}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        const currentSeasons = parseSeasonString(editFormData.season || '');
                                        handleSeasonChange(currentSeasons.filter(s => s !== seasonValue));
                                      }}
                                      className="hover:text-red-600 cursor-pointer"
                                    />
                                  </span>
                                ) : null;
                              });
                            })()}
                          </div>
                          <ChevronDown size={16} className={`text-gray-400 transition-transform ${openSeasonDropdown ? 'rotate-180' : ''}`} />
                        </button>
                        {openSeasonDropdown && (
                          <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                            {seasonDict.map((item) => {
                              const selectedSeasons = parseSeasonString(editFormData.season || '');
                              const isChecked = selectedSeasons.includes(item.dictValue);
                              return (
                                <label
                                  key={item.dictValue}
                                  className="flex items-center gap-2 py-2 px-3 cursor-pointer hover:bg-gray-50"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={(e) => {
                                      const currentSeasons = parseSeasonString(editFormData.season || '');
                                      const newSeasons = e.target.checked 
                                        ? [...currentSeasons, item.dictValue]
                                        : currentSeasons.filter(s => s !== item.dictValue);
                                      handleSeasonChange(newSeasons);
                                    }}
                                    className="w-4 h-4 rounded border-gray-300 text-black focus:ring-black cursor-pointer"
                                  />
                                  <span className="text-sm text-gray-700">{item.dictLabel}</span>
                                </label>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                    {/* 版型 */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{lang === 'zh' ? '版型' : 'Fit Type'}</label>
                      <select
                        value={editFormData.fitType || ''}
                        onChange={(e) => handleEditFieldChange('fitType', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent bg-white cursor-pointer"
                      >
                        {fitTypeDict.map((item) => (
                          <option key={item.dictValue} value={item.dictValue}>{item.dictLabel}</option>
                        ))}
                      </select>
                    </div>
                    {/* 视角 */}
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">{lang === 'zh' ? '视角' : 'View Type'}</label>
                      <select
                        value={editFormData.viewType || ''}
                        onChange={(e) => handleEditFieldChange('viewType', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent bg-white cursor-pointer"
                      >
                        {viewTypeDict.map((item) => (
                          <option key={item.dictValue} value={item.dictValue}>{item.dictLabel}</option>
                        ))}
                      </select>
                    </div>
                    
                    {/* 分隔线 */}
                    <div className="col-span-2 border-t border-gray-200 my-2"></div>
                    
                    {/* 用户补充信息 */}
                    {/* 货架号 */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{lang === 'zh' ? '货架号' : 'Shelf No'}</label>
                      <input
                        type="text"
                        value={editFormData.shelfNo || ''}
                        onChange={(e) => handleEditFieldChange('shelfNo', e.target.value)}
                        maxLength={32}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent bg-white"
                        placeholder={lang === 'zh' ? '如：A-1-05' : 'e.g. A-1-05'}
                      />
                    </div>
                    {/* 品牌 */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{lang === 'zh' ? '品牌' : 'Brand'}</label>
                      <input
                        type="text"
                        value={editFormData.brand || ''}
                        onChange={(e) => handleEditFieldChange('brand', e.target.value)}
                        maxLength={64}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent bg-white"
                        placeholder={lang === 'zh' ? '如：Uniqlo' : 'e.g. Uniqlo'}
                      />
                    </div>
                    {/* 尺码 */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{lang === 'zh' ? '尺码' : 'Size'}</label>
                      <input
                        type="text"
                        value={editFormData.size || ''}
                        onChange={(e) => handleEditFieldChange('size', e.target.value)}
                        maxLength={32}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent bg-white"
                        placeholder={lang === 'zh' ? '如：L' : 'e.g. L'}
                      />
                    </div>
                    {/* 购买价格 */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{lang === 'zh' ? '购买价格' : 'Price'}</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={editFormData.price || ''}
                        onChange={(e) => handleEditFieldChange('price', e.target.value ? parseFloat(e.target.value) : 0)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent bg-white"
                        placeholder={lang === 'zh' ? '如：99.90' : 'e.g. 99.90'}
                      />
                    </div>
                    {/* 购买日期 */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{lang === 'zh' ? '购买日期' : 'Purchase Date'}</label>
                      <input
                        type="date"
                        value={editFormData.purchaseDate || ''}
                        onChange={(e) => handleEditFieldChange('purchaseDate', e.target.value)}
                        max={new Date().toISOString().split('T')[0]}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent bg-white"
                      />
                    </div>
                    {/* 状态 */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{lang === 'zh' ? '状态' : 'Status'}</label>
                      <select
                        value={editFormData.status || 1}
                        onChange={(e) => handleEditFieldChange('status', parseInt(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent bg-white cursor-pointer"
                      >
                        <option value={1}>{lang === 'zh' ? '在柜' : 'In Wardrobe'}</option>
                        <option value={2}>{lang === 'zh' ? '洗衣中' : 'Washing'}</option>
                        <option value={3}>{lang === 'zh' ? '借出' : 'Lent'}</option>
                        <option value={0}>{lang === 'zh' ? '丢弃' : 'Discarded'}</option>
                      </select>
                    </div>
                    {/* 穿着次数 */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{lang === 'zh' ? '穿着次数' : 'Wear Count'}</label>
                      <input
                        type="number"
                        min="0"
                        value={editFormData.wearCount || 0}
                        onChange={(e) => handleEditFieldChange('wearCount', parseInt(e.target.value) || 0)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent bg-white"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 底部按钮 */}
            <div className="flex items-center justify-between p-6 border-t border-gray-200">
              <button
                onClick={() => setShowEditModal(false)}
                disabled={isSaving}
                className="px-6 py-2.5 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {lang === 'zh' ? '取消' : 'Cancel'}
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={isSaving}
                className="px-6 py-2.5 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isSaving ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    {lang === 'zh' ? '保存中...' : 'Saving...'}
                  </>
                ) : (
                  <>
                    <Save size={18} />
                    {lang === 'zh' ? '保存' : 'Save'}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 编辑模态框全屏图片预览 */}
      {editFullscreenImage && (
        <div 
          className="fixed inset-0 z-[60] bg-black/95 backdrop-blur-sm flex flex-col items-center justify-center animate-[fadeIn_0.2s_ease-out] cursor-zoom-out"
          onClick={() => setEditFullscreenImage(null)}
        >
          <div 
            className="absolute top-4 right-4 flex gap-4 z-50"
            onClick={(e) => e.stopPropagation()}
          >
            <button 
              onClick={() => setEditFullscreenImage(null)}
              className="text-white hover:text-gray-300 bg-white/10 p-2 rounded-full backdrop-blur-md transition-colors"
            >
              <X size={24} />
            </button>
          </div>
          <img 
            src={editFullscreenImage} 
            alt="Full view" 
            className="max-w-full max-h-full object-contain p-2 md:p-8 cursor-default"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
};