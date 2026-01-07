import React, { useState, useEffect, useRef } from 'react';
import { Send, MapPin, Sparkles, Loader2, ThermometerSun } from 'lucide-react';
import { ChatMessage, ClothingItem, WeatherData, Language, ModelTier } from '../types';
import { chatWithStylist, getOutfitRecommendation } from '../services/apiService';
import { getTranslation } from '../utils/translations';
import { useToastContext } from '../contexts/ToastContext';

interface StylistChatProps {
  wardrobe: ClothingItem[];
  lang: Language;
  modelTier: ModelTier;
  backendAvailable?: boolean | null;
}

/**
 * 智能搭配师聊天组件
 * 提供对话式穿搭建议和基于天气的推荐
 */
export const StylistChat: React.FC<StylistChatProps> = ({ wardrobe, lang, modelTier, backendAvailable }) => {
  const t = getTranslation(lang);
  const { showError } = useToastContext();
  
  // 初始化消息列表
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: '1', role: 'model', text: t.chat.initial }
  ]);
  const [input, setInput] = useState('');
  const [location, setLocation] = useState('Shanghai'); // 默认位置
  const [isTyping, setIsTyping] = useState(false);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 当语言改变时，更新初始欢迎语
  useEffect(() => {
    if (messages.length === 1 && messages[0].role === 'model') {
       setMessages([{ id: '1', role: 'model', text: t.chat.initial }]);
    }
  }, [lang]);

  // 自动滚动到底部
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // 获取地理位置 (可选功能)
  useEffect(() => {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition((pos) => {
            // 这里可以集成真实的地理位置 API
        });
    }
  }, []);

  // 发送消息处理函数
  const handleSend = async () => {
    if (!input.trim()) return;

    if (backendAvailable === false) {
      showError(lang === 'zh' ? t.chat.backendUnavailable : t.chat.backendUnavailable);
      return;
    }

    // 添加用户消息
    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', text: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    try {
      // 转换历史消息格式适配后端 API
      const history = messages.map(m => ({
        role: m.role,
        parts: [{ text: m.text }]
      }));
      
      // 将衣柜数据作为上下文注入 Prompt
      const wardrobeContext = wardrobe.map(i => `${i.category} (${i.color}): ${i.description}`).join(', ');
      
      // 调用聊天 API
      const responseText = await chatWithStylist(history, userMsg.text, wardrobeContext, lang, modelTier);
      
      const botMsg: ChatMessage = { 
        id: (Date.now() + 1).toString(), 
        role: 'model', 
        text: responseText || t.chat.thinking
      };
      setMessages(prev => [...prev, botMsg]);
    } catch (error) {
      console.error('Chat error:', error);
      const errorMsg = error instanceof Error ? error.message : t.chat.error;
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'model', text: errorMsg }]);
      showError(lang === 'zh' ? '发送消息失败，请检查网络连接' : 'Failed to send message, please check your connection');
    } finally {
      setIsTyping(false);
    }
  };

  // 获取今日穿搭推荐处理函数
  const handleRecommendOutfit = async () => {
    if (backendAvailable === false) {
      showError(lang === 'zh' ? t.chat.backendUnavailable : t.chat.backendUnavailable);
      return;
    }

    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', text: `${t.chat.outfitToday} (${location})` };
    setMessages(prev => [...prev, userMsg]);
    setIsTyping(true);

    try {
        // 调用推荐 API，包含天气搜索
        const { recommendationText, selectedItemIds, weatherInfo } = await getOutfitRecommendation(
            wardrobe, 
            "Pick a stylish outfit for today.", 
            location,
            lang,
            modelTier
        );
        
        if (weatherInfo) setWeather(weatherInfo);

        const botMsg: ChatMessage = {
            id: Date.now().toString(),
            role: 'model',
            text: recommendationText,
            // 查找并附带选中的衣物图片
            attachments: selectedItemIds.map(id => wardrobe.find(item => item.id === id)?.imageUrl || '').filter(Boolean)
        };
        setMessages(prev => [...prev, botMsg]);

    } catch (e) {
        console.error('Recommendation error:', e);
        setMessages(prev => [...prev, { id: Date.now().toString(), role: 'model', text: t.chat.failedWeather }]);
        showError(lang === 'zh' ? '获取推荐失败，请稍后重试' : 'Failed to get recommendation, please try again later');
    } finally {
        setIsTyping(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* 后端状态提示 */}
      {backendAvailable === false && (
        <div className="mx-4 mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
          <p>{t.chat.backendUnavailable}</p>
        </div>
      )}

      {/* 聊天头部：标题和位置 */}
      <div className="bg-white p-4 shadow-sm flex justify-between items-center z-10">
        <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-pink-500 to-violet-500 flex items-center justify-center text-white">
                <Sparkles size={16} />
            </div>
            <div>
                <h3 className="font-bold text-gray-800">{t.chat.title}</h3>
                <p className="text-xs text-gray-500 flex items-center gap-1">
                    <MapPin size={10} />
                    <input 
                        value={location} 
                        onChange={(e) => setLocation(e.target.value)}
                        placeholder={t.chat.locationPlaceholder}
                        className="bg-transparent border-b border-gray-300 focus:outline-none focus:border-black w-24 placeholder:text-gray-300"
                    />
                </p>
            </div>
        </div>
        {/* 天气展示 */}
        {weather && (
            <div className="text-right">
                <p className="text-sm font-semibold">{weather.temperature}</p>
                <p className="text-xs text-gray-500">{weather.condition}</p>
            </div>
        )}
      </div>

      {/* 消息列表区域 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map(msg => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] rounded-2xl p-4 ${
              msg.role === 'user' 
                ? 'bg-black text-white rounded-br-none' 
                : 'bg-white text-gray-800 shadow-sm rounded-bl-none border border-gray-100'
            }`}>
              <p className="whitespace-pre-wrap text-sm leading-relaxed">{msg.text}</p>
              
              {/* 附件图片展示 (推荐的衣物) */}
              {msg.attachments && msg.attachments.length > 0 && (
                <div className="mt-3 flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                    {msg.attachments.map((src, idx) => (
                        <img key={idx} src={src} className="w-16 h-16 rounded-md object-cover border border-gray-200" alt="outfit item" />
                    ))}
                </div>
              )}
            </div>
          </div>
        ))}
        {/* 输入指示器 */}
        {isTyping && (
            <div className="flex justify-start">
                <div className="bg-white p-3 rounded-2xl rounded-bl-none shadow-sm border border-gray-100 flex gap-1">
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
            </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* 快捷操作区 */}
      <div className="p-2 bg-gray-50 flex gap-2 overflow-x-auto no-scrollbar">
        <button 
            onClick={handleRecommendOutfit}
            disabled={backendAvailable === false}
            className="flex items-center gap-1.5 px-4 py-2 bg-white border border-gray-200 rounded-full text-xs font-medium text-gray-700 whitespace-nowrap hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
        >
            <ThermometerSun size={14} className="text-orange-500" />
            {t.chat.outfitToday}
        </button>
        <button 
             onClick={() => setInput(t.chat.dateNight)}
            disabled={backendAvailable === false}
            className="flex items-center gap-1.5 px-4 py-2 bg-white border border-gray-200 rounded-full text-xs font-medium text-gray-700 whitespace-nowrap hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
        >
            {t.chat.dateNight}
        </button>
      </div>

      {/* 底部输入框 */}
      <div className="p-4 bg-white border-t border-gray-100">
        <div className="flex gap-2">
            <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder={t.chat.placeholder}
                className="flex-1 bg-gray-100 rounded-full px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-black/5"
            />
            <button 
                onClick={handleSend}
                disabled={!input.trim() || isTyping || backendAvailable === false}
                className="w-11 h-11 bg-black text-white rounded-full flex items-center justify-center disabled:opacity-50 hover:scale-105 transition-transform"
            >
                {isTyping ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
            </button>
        </div>
      </div>
    </div>
  );
};