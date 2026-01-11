import React, { useState, useEffect, useRef } from 'react';
import { X, ChevronRight, ChevronLeft, Upload, FileImage, Loader2, Check, Save, Edit, XCircle, Info, ChevronDown } from 'lucide-react';
import { Language, AiModelVO, ModelConfig, ClothingAnalysisVO, AiExecutionDTO, DictItem, CategoryItem } from '../types';
import { getTranslation } from '../utils/translations';
import { getAiModelList, analyzeClothingImage, BusinessError, getCategoryList, getDictList } from '../services/apiService';
import { useToastContext } from '../contexts/ToastContext';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpload?: (files: File[], modelConfig: ModelConfig) => void; // 可选，暂时不使用（分析流程在组件内部完成）
  onSaveComplete?: () => void; // 保存完成后的回调（用于刷新列表等）
  lang: Language;
  isUploading?: boolean;
}

/**
 * 上传模态框组件
 * 支持三个步骤：1. 选择模型并配置 2. 上传文件并分析 3. 编辑分析结果
 */
export const UploadModal: React.FC<UploadModalProps> = ({
  isOpen,
  onClose,
  onUpload,
  onSaveComplete,
  lang,
  isUploading = false
}) => {
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [models, setModels] = useState<AiModelVO[]>([]);
  const [loadingModels, setLoadingModels] = useState(false);
  const [selectedModel, setSelectedModel] = useState<AiModelVO | null>(null);
  const [enableThinking, setEnableThinking] = useState(false);
  const [thinkingBudget, setThinkingBudget] = useState<number>(0);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [analysisResults, setAnalysisResults] = useState<(ClothingAnalysisVO & { originalFile: File })[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analyzingProgress, setAnalyzingProgress] = useState({ current: 0, total: 0 });
  const [isSaving, setIsSaving] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);
  
  // 字典和品类数据
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [regionDict, setRegionDict] = useState<DictItem[]>([]);
  const [layerDict, setLayerDict] = useState<DictItem[]>([]);
  const [colorDict, setColorDict] = useState<DictItem[]>([]);
  const [seasonDict, setSeasonDict] = useState<DictItem[]>([]);
  const [fitTypeDict, setFitTypeDict] = useState<DictItem[]>([]);
  const [viewTypeDict, setViewTypeDict] = useState<DictItem[]>([]);
  const [loadingDicts, setLoadingDicts] = useState(false);
  const dictsLoadedRef = useRef(false);
  const [openSeasonDropdowns, setOpenSeasonDropdowns] = useState<{ [key: number]: boolean }>({});
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const t = getTranslation(lang);
  const { showError, showSuccess } = useToastContext();

  // 当模态框打开时，加载模型列表
  useEffect(() => {
    if (isOpen && models.length === 0) {
      loadModels();
    }
    // 重置状态
    if (isOpen) {
      setCurrentStep(1);
      setSelectedModel(null);
      setEnableThinking(false);
      setThinkingBudget(0);
      // 清理预览URL
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
      setPreviewUrl(null);
      setSelectedFiles([]);
      setAnalysisResults([]);
      setIsAnalyzing(false);
      setAnalyzingProgress({ current: 0, total: 0 });
      setIsSaving(false);
      setAnalysisError(null);
      setFullscreenImage(null);
      // 重置字典加载状态
      dictsLoadedRef.current = false;
    }
  }, [isOpen]);

  // 处理ESC键关闭全屏预览
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && fullscreenImage) {
        setFullscreenImage(null);
      }
    };
    if (fullscreenImage) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [fullscreenImage]);

  // 处理点击外部关闭季节下拉框
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      // 如果点击的不是季节下拉框相关的元素，关闭所有下拉框
      if (!target.closest('.season-dropdown-container')) {
        setOpenSeasonDropdowns({});
      }
    };

    if (Object.keys(openSeasonDropdowns).some(key => openSeasonDropdowns[Number(key)])) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [openSeasonDropdowns]);

  // 加载模型列表
  const loadModels = async () => {
    setLoadingModels(true);
    try {
      const modelList = await getAiModelList();
      // 按 sort 字段排序
      const sortedModels = modelList.sort((a, b) => (a.sort || 0) - (b.sort || 0));
      setModels(sortedModels);
    } catch (error) {
      console.error('Failed to load models:', error);
    } finally {
      setLoadingModels(false);
    }
  };

  // 加载品类和字典数据
  const loadDictsAndCategories = async () => {
    if (dictsLoadedRef.current) {
      return; // 已经加载过，不重复加载
    }
    
    setLoadingDicts(true);
    try {
      console.log('Loading dicts and categories...');
      // 并行加载所有数据
      const [categoriesData, regionData, layerData, colorData, seasonData, fitTypeData, viewTypeData] = await Promise.all([
        getCategoryList(),
        getDictList('clothing_region'),
        getDictList('clothing_layer'),
        getDictList('clothing_color'),
        getDictList('clothing_season'),
        getDictList('clothing_fit_type'),
        getDictList('clothing_view_type'),
      ]);

      console.log('Loaded data:', {
        categories: categoriesData.length,
        region: regionData.length,
        layer: layerData.length,
        color: colorData.length,
        season: seasonData.length,
        fitType: fitTypeData.length,
        viewType: viewTypeData.length,
      });

      setCategories(categoriesData);
      setRegionDict(regionData);
      setLayerDict(layerData);
      setColorDict(colorData);
      setSeasonDict(seasonData);
      setFitTypeDict(fitTypeData);
      setViewTypeDict(viewTypeData);
      
      dictsLoadedRef.current = true; // 标记为已加载
    } catch (error) {
      console.error('Failed to load dicts and categories:', error);
      // 静默失败，不影响用户体验
    } finally {
      setLoadingDicts(false);
    }
  };

  // 当进入步骤3时，加载字典和品类数据
  useEffect(() => {
    if (currentStep === 3) {
      loadDictsAndCategories();
    }
  }, [currentStep]);

  // 选择模型
  const handleSelectModel = (model: AiModelVO) => {
    setSelectedModel(model);
    
    // 如果模型支持思考模式，且默认开启思考模式，则自动勾选
    if (model.supportThinking && model.defaultEnableThinking) {
      setEnableThinking(true);
      setThinkingBudget(model.defaultThinkingBudget || 1024);
    } else {
      setEnableThinking(false);
      setThinkingBudget(model.defaultThinkingBudget || 1024);
    }
  };

  // 处理文件选择（单文件模式）
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      // 清理旧的预览URL
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
      // 创建新的预览URL
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      setSelectedFiles([file]);
      // 清除之前的错误
      setAnalysisError(null);
    }
    // 重置 input 以允许再次选择相同文件
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // 移除文件
  const handleRemoveFile = () => {
    // 清理预览URL
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    setSelectedFiles([]);
  };

  // 清理预览URL（组件卸载时）
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  // 验证思考Token预算
  const validateThinkingBudget = (value: number, model: AiModelVO): boolean => {
    if (!model.supportThinking || !enableThinking) return true;
    if (model.maxThinkingBudget && value > model.maxThinkingBudget) return false;
    return value > 0;
  };

  // 处理思考Token预算变化
  const handleThinkingBudgetChange = (value: string) => {
    const numValue = parseInt(value, 10);
    if (isNaN(numValue)) {
      setThinkingBudget(0);
      return;
    }
    if (selectedModel && validateThinkingBudget(numValue, selectedModel)) {
      setThinkingBudget(numValue);
    } else if (selectedModel?.maxThinkingBudget && numValue > selectedModel.maxThinkingBudget) {
      setThinkingBudget(selectedModel.maxThinkingBudget);
    } else if (numValue > 0) {
      setThinkingBudget(numValue);
    }
  };

  // 下一步（从步骤1到步骤2）
  const handleNext = () => {
    if (!selectedModel) {
      return;
    }
    setCurrentStep(2);
  };

  // 上一步
  const handleBack = () => {
    if (currentStep === 2) {
      setCurrentStep(1);
    } else if (currentStep === 3) {
      setCurrentStep(2);
    }
  };

  // 开始分析
  const handleAnalyze = async () => {
    if (!selectedModel || selectedFiles.length === 0) {
      showError(
        lang === 'zh' ? '请先选择文件和模型' : 'Please select files and model first',
        3000
      );
      return;
    }

    // 验证文件是否有效
    const validFiles = selectedFiles.filter(file => {
      if (!file || file.size === 0) {
        return false;
      }
      // 检查文件类型是否为图片
      if (!file.type.startsWith('image/')) {
        return false;
      }
      return true;
    });

    if (validFiles.length === 0) {
      showError(
        lang === 'zh' ? '请选择有效的图片文件' : 'Please select valid image files',
        3000
      );
      return;
    }

    if (validFiles.length < selectedFiles.length) {
      showError(
        lang === 'zh' 
          ? `已过滤 ${selectedFiles.length - validFiles.length} 个无效文件` 
          : `Filtered ${selectedFiles.length - validFiles.length} invalid files`,
        3000
      );
    }

    setIsAnalyzing(true);
    setAnalysisError(null); // 清除之前的错误
    setAnalyzingProgress({ current: 0, total: validFiles.length });
    const results: (ClothingAnalysisVO & { originalFile: File })[] = [];

    try {
      // 构建配置对象
      const config: AiExecutionDTO = {
        modelKey: selectedModel.modelKey,
        enableThinking: selectedModel.supportThinking ? enableThinking : false,
        thinkingBudget: selectedModel.supportThinking && enableThinking ? thinkingBudget : undefined,
      };

      // 逐个分析文件（现在只处理一个文件）
      for (let i = 0; i < validFiles.length; i++) {
        setAnalyzingProgress({ current: i + 1, total: validFiles.length });
        try {
          const result = await analyzeClothingImage(validFiles[i], config);
          results.push({ ...result, originalFile: validFiles[i] });
        } catch (error) {
          console.error(`Failed to analyze file ${i + 1}:`, error);
          // 检查是否是BusinessError，提取message字段
          if (error instanceof BusinessError && error.message) {
            setAnalysisError(error.message);
            // 不继续处理，直接返回
            return;
          }
          // 其他错误，显示单个文件的错误提示
          const errorMessage = error instanceof Error 
            ? error.message 
            : (lang === 'zh' ? `第 ${i + 1} 个文件分析失败` : `Failed to analyze file ${i + 1}`);
          showError(`${validFiles[i].name}: ${errorMessage}`, 5000);
          // 即使某个文件分析失败，也继续处理其他文件
        }
      }

      if (results.length > 0) {
        setAnalysisResults(results);
        setCurrentStep(3);
        if (results.length < validFiles.length) {
          // 部分成功
          showSuccess(
            lang === 'zh' 
              ? `成功分析 ${results.length}/${validFiles.length} 个文件` 
              : `Successfully analyzed ${results.length}/${validFiles.length} files`,
            3000
          );
        } else {
          // 全部成功
          showSuccess(
            lang === 'zh' 
              ? `成功分析 ${results.length} 个文件` 
              : `Successfully analyzed ${results.length} files`,
            3000
          );
        }
      } else {
        // 所有文件都分析失败（但如果没有设置analysisError，说明不是BusinessError，显示通用错误）
        if (!analysisError) {
          const errorMessage = lang === 'zh' 
            ? '所有文件分析失败，请检查文件格式或重试' 
            : 'All files failed to analyze, please check file format or try again';
          showError(errorMessage, 5000);
        }
        // 如果已经设置了analysisError（BusinessError），则不显示toast，只显示固定的错误信息
      }
    } catch (error) {
      console.error('Analysis failed:', error);
      // 显示整体错误提示
      const errorMessage = error instanceof Error 
        ? error.message 
        : (lang === 'zh' ? '分析失败，请稍后重试' : 'Analysis failed, please try again later');
      showError(errorMessage, 5000);
    } finally {
      setIsAnalyzing(false);
      setAnalyzingProgress({ current: 0, total: 0 });
    }
  };

  // 获取字典标签（根据dict_value获取dict_label）
  const getDictLabel = (dictValue: string, dictList: DictItem[]): string => {
    const item = dictList.find(d => d.dictValue === dictValue);
    return item ? item.dictLabel : dictValue;
  };

  // 获取品类标签（根据code获取label）
  const getCategoryLabel = (code: string): string => {
    const category = categories.find(c => c.code === code);
    return category ? category.label : code;
  };

  // 处理季节多选变化
  const handleSeasonChange = (index: number, selectedValues: string[]) => {
    // 季节字段存储逗号分隔的字符串
    const seasonValue = selectedValues.join(',');
    handleResultFieldChange(index, 'season', seasonValue);
  };

  // 解析季节字符串为数组
  const parseSeasonString = (seasonStr: string): string[] => {
    if (!seasonStr) return [];
    return seasonStr.split(',').map(s => s.trim()).filter(s => s);
  };

  // 更新分析结果字段
  const handleResultFieldChange = (index: number, field: keyof ClothingAnalysisVO, value: string | number) => {
    setAnalysisResults(prev => prev.map((result, i) => {
      if (i === index) {
        const updatedResult = { ...result, [field]: value };
        
        // 如果修改的是品类，自动带出部位和建议层级
        if (field === 'category' && typeof value === 'string') {
          const selectedCategory = categories.find(cat => cat.code === value);
          if (selectedCategory) {
            // 如果品类有默认的region和layer，自动设置
            if (selectedCategory.region) {
              updatedResult.region = selectedCategory.region;
            }
            if (selectedCategory.layer) {
              // layer是字典的code（字符串），但defaultLayer字段类型是number
              // 如果layer是数字字符串，转换为数字；否则可能需要查找字典对应的值
              const layerNum = Number(selectedCategory.layer);
              updatedResult.defaultLayer = isNaN(layerNum) ? 0 : layerNum;
            }
          }
        }
        
        return updatedResult;
      }
      return result;
    }));
  };

  // 保存衣物（占位函数）
  const handleSaveClothing = async () => {
    setIsSaving(true);
    try {
      // TODO: 实现保存逻辑
      // 这里暂时只是占位，实际保存逻辑等待后续实现
      // 需要调用后端接口保存衣物，使用 analysisResults 中的数据
      // 每个结果包含：imageId, category, region, defaultLayer, color, season, fitType, viewType 等
      
      console.log('Saving clothing items:', analysisResults);
      
      // 模拟保存延迟
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // 保存成功后，调用回调刷新列表（如果提供）
      if (onSaveComplete) {
        onSaveComplete();
      }
      
      // 关闭模态框
      onClose();
    } catch (error) {
      console.error('Failed to save clothing:', error);
      // 这里可以显示错误提示
    } finally {
      setIsSaving(false);
    }
  };

  // 如果模态框未打开，不渲染
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div 
        className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-xl animate-[scaleIn_0.2s_ease-out] relative"
      >
        {/* 头部 */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-800">{t.uploadModal.title}</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            disabled={isAnalyzing || isSaving}
          >
            <X size={20} />
          </button>
        </div>

        {/* 步骤指示器 */}
        <div className="flex items-center justify-center gap-2 p-4 border-b border-gray-100">
          <div className={`flex items-center gap-2 ${currentStep >= 1 ? 'text-black' : 'text-gray-400'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              currentStep >= 1 ? 'bg-black text-white' : 'bg-gray-200 text-gray-600'
            }`}>
              {currentStep > 1 ? <Check size={16} /> : '1'}
            </div>
            <span className="text-sm font-medium">{t.uploadModal.step1}</span>
          </div>
          <ChevronRight size={20} className="text-gray-400" />
          <div className={`flex items-center gap-2 ${currentStep >= 2 ? 'text-black' : 'text-gray-400'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              currentStep >= 2 ? 'bg-black text-white' : 'bg-gray-200 text-gray-600'
            }`}>
              {currentStep > 2 ? <Check size={16} /> : '2'}
            </div>
            <span className="text-sm font-medium">{t.uploadModal.step2}</span>
          </div>
          <ChevronRight size={20} className="text-gray-400" />
          <div className={`flex items-center gap-2 ${currentStep >= 3 ? 'text-black' : 'text-gray-400'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              currentStep >= 3 ? 'bg-black text-white' : 'bg-gray-200 text-gray-600'
            }`}>
              3
            </div>
            <span className="text-sm font-medium">{t.uploadModal.step3}</span>
          </div>
        </div>

        {/* 内容区域 */}
        <div className="flex-1 overflow-y-auto p-6">
          {currentStep === 1 ? (
            /* 步骤1: 模型选择 */
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-4">{t.uploadModal.selectModel}</h3>
                
                {loadingModels ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                    <span className="ml-2 text-gray-600">{t.uploadModal.loadingModels}</span>
                  </div>
                ) : models.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    {t.uploadModal.noModels}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {models.map((model) => (
                      <div
                        key={model.modelKey}
                        onClick={() => handleSelectModel(model)}
                        className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                          selectedModel?.modelKey === model.modelKey
                            ? 'border-black bg-black/5'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-gray-800">{model.label}</span>
                          {selectedModel?.modelKey === model.modelKey && (
                            <Check size={20} className="text-black" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 模型配置 */}
              {selectedModel && (
                <div className="border-t border-gray-200 pt-6 space-y-4">
                  <h3 className="text-lg font-semibold text-gray-800">{t.uploadModal.modelConfig}</h3>
                  
                  {/* 思考模式配置 */}
                  {selectedModel.supportThinking && (
                    <div className="space-y-3">
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={enableThinking}
                          onChange={(e) => {
                            setEnableThinking(e.target.checked);
                            if (!e.target.checked) {
                              setThinkingBudget(selectedModel.defaultThinkingBudget || 1024);
                            }
                          }}
                          className="w-5 h-5 rounded border-gray-300 text-black focus:ring-black cursor-pointer"
                        />
                        <span className="text-gray-700">{t.uploadModal.enableThinking}</span>
                      </label>

                      {enableThinking && (
                        <div className="ml-8 space-y-2">
                          <label className="block text-sm font-medium text-gray-700">
                            {t.uploadModal.thinkingBudget}
                            {selectedModel.maxThinkingBudget && (
                              <span className="text-gray-500 ml-2">
                                ({t.uploadModal.maxThinkingBudget}: {selectedModel.maxThinkingBudget})
                              </span>
                            )}
                          </label>
                          <input
                            type="number"
                            min="1"
                            max={selectedModel.maxThinkingBudget || undefined}
                            value={thinkingBudget || ''}
                            onChange={(e) => handleThinkingBudgetChange(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                            placeholder={selectedModel.defaultThinkingBudget?.toString() || '1024'}
                          />
                          <p className="text-xs text-gray-500">{t.uploadModal.thinkingBudgetHint}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : currentStep === 2 ? (
            /* 步骤2: 文件上传 */
            <div className="space-y-6">
              {/* 模型摘要 */}
              {selectedModel && (
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <p className="text-sm text-gray-600">
                    {t.uploadModal.modelSummary.replace('{modelName}', selectedModel.label)}
                  </p>
                  {selectedModel.supportThinking && enableThinking && (
                    <p className="text-xs text-gray-500 mt-1">
                      {t.uploadModal.enableThinking}: {t.uploadModal.thinkingBudget} = {thinkingBudget}
                    </p>
                  )}
                </div>
              )}

              {/* 图片要求提示 */}
              {!isAnalyzing && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-start gap-3">
                    <Info className="text-blue-600 flex-shrink-0 mt-0.5" size={20} />
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-blue-800 mb-2">{t.uploadModal.imageRequirements}</p>
                      <ul className="space-y-1.5 text-sm text-blue-700">
                        <li className="flex items-start gap-2">
                          <span className="text-blue-600 mt-0.5">•</span>
                          <span>{t.uploadModal.imageRequirement1}</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-blue-600 mt-0.5">•</span>
                          <span>{t.uploadModal.imageRequirement2}</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-blue-600 mt-0.5">•</span>
                          <span>{t.uploadModal.imageRequirement3}</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {/* 错误信息显示（固定显示） */}
              {analysisError && (
                <div className="p-4 bg-red-50 border-2 border-red-300 rounded-lg">
                  <div className="flex items-start gap-3">
                    <XCircle className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-red-800 mb-1">分析失败</p>
                      <p className="text-sm text-red-700 whitespace-pre-wrap">{analysisError}</p>
                    </div>
                    <button
                      onClick={() => setAnalysisError(null)}
                      className="flex-shrink-0 text-red-600 hover:text-red-800 transition-colors"
                    >
                      <X size={18} />
                    </button>
                  </div>
                </div>
              )}

              {/* 分析进度 */}
              {isAnalyzing && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center gap-3 mb-2">
                    <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                    <span className="text-sm font-medium text-blue-800">
                      {t.uploadModal.analyzingFile.replace('{current}', analyzingProgress.current.toString()).replace('{total}', analyzingProgress.total.toString())}
                    </span>
                  </div>
                  <div className="w-full bg-blue-200 h-2 rounded-full overflow-hidden">
                    <div 
                      className="bg-blue-600 h-full transition-all duration-300"
                      style={{ width: `${(analyzingProgress.current / analyzingProgress.total) * 100}%` }}
                    />
                  </div>
                </div>
              )}

              {/* 文件选择器 */}
              {!isAnalyzing && (
                <>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">{t.uploadModal.selectFiles}</h3>
                    
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isAnalyzing}
                      className="w-full py-12 border-2 border-dashed border-gray-300 rounded-lg hover:border-black transition-colors flex flex-col items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Upload size={32} className="text-gray-400" />
                      <span className="text-gray-600 font-medium">{t.uploadModal.selectFiles}</span>
                    </button>

                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </div>

                  {/* 已选择的文件缩略图 */}
                  {selectedFiles.length > 0 && previewUrl && (
                    <div>
                      <div className="relative inline-block">
                        <img
                          src={previewUrl}
                          alt="预览"
                          className="w-32 h-32 object-cover rounded-lg border border-gray-200"
                        />
                        <button
                          onClick={handleRemoveFile}
                          disabled={isAnalyzing}
                          className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    </div>
                  )}

                  {selectedFiles.length === 0 && (
                    <div className="text-center py-8 text-gray-500 text-sm">
                      {t.uploadModal.noFilesSelected}
                    </div>
                  )}
                </>
              )}
            </div>
          ) : (
            /* 步骤3: 编辑分析结果 */
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-800">{t.uploadModal.editInfo}</h3>
              
              {analysisResults.map((result, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4 space-y-4">
                  {/* 图片预览 */}
                  <div className="flex gap-4 mb-4">
                    <div className="flex flex-col items-start">
                      <label className="block text-sm font-medium text-gray-700 mb-2">{t.uploadModal.originalImage}</label>
                      <img 
                        src={result.imageUrl} 
                        alt="Original" 
                        onClick={() => setFullscreenImage(result.imageUrl)}
                        className="w-32 h-32 object-contain rounded-lg border border-gray-200 cursor-pointer hover:opacity-80 transition-opacity bg-gray-50" 
                      />
                    </div>
                    {result.maskImageUrl && (
                      <div className="flex flex-col items-start">
                        <label className="block text-sm font-medium text-gray-700 mb-2">{t.uploadModal.maskImage}</label>
                        <img 
                          src={result.maskImageUrl} 
                          alt="Mask" 
                          onClick={() => setFullscreenImage(result.maskImageUrl!)}
                          className="w-32 h-32 object-contain rounded-lg border border-gray-200 cursor-pointer hover:opacity-80 transition-opacity bg-gray-50" 
                        />
                      </div>
                    )}
                  </div>

                  {/* 可编辑表单 */}
                  <div className="grid grid-cols-2 gap-4">
                    {/* 品类 - 下拉框 */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{t.uploadModal.category}</label>
                      <select
                        value={result.category}
                        onChange={(e) => handleResultFieldChange(index, 'category', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent bg-white hover:border-gray-400 transition-colors cursor-pointer"
                      >
                        {categories.map((cat) => (
                          <option key={cat.code} value={cat.code}>
                            {cat.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    {/* 部位 - 下拉框 */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{t.uploadModal.region}</label>
                      <select
                        value={result.region}
                        onChange={(e) => handleResultFieldChange(index, 'region', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent bg-white hover:border-gray-400 transition-colors cursor-pointer"
                      >
                        {regionDict.map((item) => (
                          <option key={item.dictValue} value={item.dictValue}>
                            {item.dictLabel}
                          </option>
                        ))}
                      </select>
                    </div>
                    {/* 建议层级 - 下拉框 */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{t.uploadModal.defaultLayer}</label>
                      <select
                        value={result.defaultLayer.toString()}
                        onChange={(e) => {
                          const layerValue = isNaN(Number(e.target.value)) ? 0 : Number(e.target.value);
                          handleResultFieldChange(index, 'defaultLayer', layerValue);
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent bg-white hover:border-gray-400 transition-colors cursor-pointer"
                      >
                        {layerDict.map((item) => (
                          <option key={item.dictValue} value={item.dictValue}>
                            {item.dictLabel}
                          </option>
                        ))}
                      </select>
                    </div>
                    {/* 主色调 - 下拉框 */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{t.uploadModal.color}</label>
                      <select
                        value={result.color}
                        onChange={(e) => handleResultFieldChange(index, 'color', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent bg-white hover:border-gray-400 transition-colors cursor-pointer"
                      >
                        {colorDict.map((item) => (
                          <option key={item.dictValue} value={item.dictValue}>
                            {item.dictLabel}
                          </option>
                        ))}
                      </select>
                    </div>
                    {/* 季节 - 多选下拉框 */}
                    <div className="relative season-dropdown-container">
                      <label className="block text-sm font-medium text-gray-700 mb-1">{t.uploadModal.season}</label>
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setOpenSeasonDropdowns(prev => ({ ...prev, [index]: !prev[index] }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent bg-white hover:border-gray-400 transition-colors cursor-pointer text-left flex items-center justify-between"
                        >
                          <div className="flex flex-wrap gap-1 flex-1">
                            {(() => {
                              const selectedSeasons = parseSeasonString(result.season);
                              if (selectedSeasons.length === 0) {
                                return <span className="text-gray-400">请选择季节</span>;
                              }
                              return selectedSeasons.map(seasonValue => {
                                const seasonItem = seasonDict.find(item => item.dictValue === seasonValue);
                                return seasonItem ? (
                                  <span key={seasonValue} className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-sm">
                                    {seasonItem.dictLabel}
                                    <span
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        const currentSeasons = parseSeasonString(result.season);
                                        const newSeasons = currentSeasons.filter(s => s !== seasonValue);
                                        handleSeasonChange(index, newSeasons);
                                      }}
                                      className="hover:text-red-600 cursor-pointer inline-flex items-center"
                                      role="button"
                                      tabIndex={0}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter' || e.key === ' ') {
                                          e.preventDefault();
                                          e.stopPropagation();
                                          const currentSeasons = parseSeasonString(result.season);
                                          const newSeasons = currentSeasons.filter(s => s !== seasonValue);
                                          handleSeasonChange(index, newSeasons);
                                        }
                                      }}
                                    >
                                      <X size={14} />
                                    </span>
                                  </span>
                                ) : null;
                              });
                            })()}
                          </div>
                          <ChevronDown size={16} className={`text-gray-400 transition-transform ${openSeasonDropdowns[index] ? 'rotate-180' : ''}`} />
                        </button>
                        {openSeasonDropdowns[index] && (
                          <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                            {loadingDicts && seasonDict.length === 0 ? (
                              <div className="p-2 text-gray-500 text-sm text-center">加载中...</div>
                            ) : seasonDict.length === 0 ? (
                              <div className="p-2 text-gray-500 text-sm text-center">暂无数据</div>
                            ) : (
                              seasonDict.map((item) => {
                                const selectedSeasons = parseSeasonString(result.season);
                                const isChecked = selectedSeasons.includes(item.dictValue);
                                return (
                                  <label
                                    key={item.dictValue}
                                    className="flex items-center gap-2 py-2 px-3 cursor-pointer hover:bg-gray-50 transition-colors"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={isChecked}
                                      onChange={(e) => {
                                        const currentSeasons = parseSeasonString(result.season);
                                        let newSeasons: string[];
                                        if (e.target.checked) {
                                          newSeasons = [...currentSeasons, item.dictValue];
                                        } else {
                                          newSeasons = currentSeasons.filter(s => s !== item.dictValue);
                                        }
                                        handleSeasonChange(index, newSeasons);
                                      }}
                                      className="w-4 h-4 rounded border-gray-300 text-black focus:ring-black cursor-pointer"
                                    />
                                    <span className="text-sm text-gray-700">{item.dictLabel}</span>
                                  </label>
                                );
                              })
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    {/* 版型 - 下拉框 */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{t.uploadModal.fitType}</label>
                      <select
                        value={result.fitType}
                        onChange={(e) => handleResultFieldChange(index, 'fitType', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent bg-white hover:border-gray-400 transition-colors cursor-pointer"
                      >
                        {fitTypeDict.map((item) => (
                          <option key={item.dictValue} value={item.dictValue}>
                            {item.dictLabel}
                          </option>
                        ))}
                      </select>
                    </div>
                    {/* 视角 - 下拉框 */}
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">{t.uploadModal.viewType}</label>
                      <select
                        value={result.viewType}
                        onChange={(e) => handleResultFieldChange(index, 'viewType', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent bg-white hover:border-gray-400 transition-colors cursor-pointer"
                      >
                        {viewTypeDict.map((item) => (
                          <option key={item.dictValue} value={item.dictValue}>
                            {item.dictLabel}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 底部按钮 */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200">
          <button
            onClick={currentStep === 1 ? onClose : handleBack}
            disabled={isAnalyzing || isSaving}
            className="px-6 py-2.5 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {currentStep === 1 ? t.uploadModal.cancel : t.uploadModal.back}
          </button>

          {currentStep === 1 ? (
            <button
              onClick={handleNext}
              disabled={!selectedModel || isAnalyzing}
              className="px-6 py-2.5 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {t.uploadModal.next}
              <ChevronRight size={18} />
            </button>
          ) : currentStep === 2 ? (
            <button
              onClick={handleAnalyze}
              disabled={selectedFiles.length === 0 || isAnalyzing}
              className="px-6 py-2.5 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  {t.uploadModal.analyzing}
                </>
              ) : (
                <>
                  <Upload size={18} />
                  {t.uploadModal.upload}
                </>
              )}
            </button>
          ) : (
            <button
              onClick={handleSaveClothing}
              disabled={analysisResults.length === 0 || isSaving}
              className="px-6 py-2.5 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isSaving ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  {t.uploadModal.saving}
                </>
              ) : (
                <>
                  <Save size={18} />
                  {t.uploadModal.saveClothing}
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* 全屏图片预览 */}
      {fullscreenImage && (
        <div 
          className="fixed inset-0 z-[60] bg-black/95 backdrop-blur-sm flex flex-col items-center justify-center animate-[fadeIn_0.2s_ease-out] cursor-zoom-out"
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
    </div>
  );
};
