import React from 'react';
import { Language } from '../types';
import { getTranslation } from '../utils/translations';
import { Shirt, User, MessageSquareHeart, Sparkles } from 'lucide-react';

interface HomeProps {
  lang: Language;
}

/**
 * 首页组件
 * 显示欢迎信息和功能入口
 */
export const Home: React.FC<HomeProps> = ({ lang }) => {
  const t = getTranslation(lang);

  const features = [
    {
      icon: Shirt,
      title: lang === 'zh' ? '智能衣橱' : lang === 'en' ? 'Smart Wardrobe' : 'スマートワードローブ',
      desc: lang === 'zh' ? '管理您的衣物收藏' : lang === 'en' ? 'Manage your clothing collection' : '衣類コレクションを管理',
    },
    {
      icon: User,
      title: lang === 'zh' ? '虚拟试穿' : lang === 'en' ? 'Virtual Try-On' : 'バーチャル試着',
      desc: lang === 'zh' ? 'AI生成试穿效果' : lang === 'en' ? 'AI-generated try-on effects' : 'AI生成の試着効果',
    },
    {
      icon: MessageSquareHeart,
      title: lang === 'zh' ? '搭配师聊天' : lang === 'en' ? 'Stylist Chat' : 'スタイリストチャット',
      desc: lang === 'zh' ? '获取专业搭配建议' : lang === 'en' ? 'Get professional styling advice' : 'プロのスタイリングアドバイス',
    },
  ];

  return (
    <div className="h-full flex flex-col bg-gray-50 overflow-y-auto">
      {/* 顶部欢迎区域 */}
      <div className="bg-gradient-to-br from-gray-900 to-gray-800 text-white p-8 pb-12">
        <div className="max-w-2xl mx-auto text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-white/10 rounded-full mb-6">
            <Sparkles size={40} className="text-white" />
          </div>
          <h1 className="text-4xl font-bold mb-4">
            {lang === 'zh' ? '欢迎使用智能衣橱' : lang === 'en' ? 'Welcome to Smart Wardrobe' : 'スマートワードローブへようこそ'}
          </h1>
          <p className="text-gray-300 text-lg">
            {lang === 'zh' ? 'AI驱动的智能穿搭助手，让您的衣橱更智能' : lang === 'en' ? 'AI-powered smart styling assistant to make your wardrobe smarter' : 'AI駆動のスマートスタイリングアシスタントで、ワードローブをよりスマートに'}
          </p>
        </div>
      </div>

      {/* 功能卡片区域 */}
      <div className="flex-1 p-6 pb-24">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">
            {lang === 'zh' ? '主要功能' : lang === 'en' ? 'Main Features' : '主な機能'}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div
                  key={index}
                  className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow border border-gray-100"
                >
                  <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mb-4">
                    <Icon size={24} className="text-gray-700" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">{feature.title}</h3>
                  <p className="text-gray-600 text-sm">{feature.desc}</p>
                </div>
              );
            })}
          </div>

          {/* 提示信息 */}
          <div className="mt-8 bg-blue-50 border border-blue-200 rounded-xl p-6 text-center">
            <p className="text-blue-800">
              {lang === 'zh' ? '请登录以使用完整功能' : lang === 'en' ? 'Please login to use full features' : '完全な機能を使用するにはログインしてください'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

