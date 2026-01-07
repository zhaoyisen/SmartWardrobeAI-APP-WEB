import { Language } from '../types';

// 多语言翻译字典
export const translations = {
  // 中文翻译
  zh: {
    appTitle: "智能衣橱 AI",
    wardrobe: {
      title: "我的衣橱",
      empty: "暂无衣物，快来添加吧！",
      filterAll: "全部",
      uploading: "正在批量分析中 ({current}/{total})...",
      noItemsFound: "未找到衣物"
    },
    category: {
      Top: "上装",
      Bottom: "下装",
      Shoes: "鞋履",
      Outerwear: "外套",
      Accessory: "配饰",
      Dress: "裙装"
    },
    tryOn: {
      title: "AI 试穿",
      height: "身高",
      weight: "体重",
      rotatable: "3D 模型可旋转",
      visualizeBtn: "AI 生成试穿效果",
      dreaming: "生成中...",
      back: "返回",
      noItem: "未找到该分类衣物",
      visualizeSuccess: "试穿生成成功",
      usingUserPhoto: "正在使用您的个人照片作为模特",
      resetPhoto: "重置模特",
      layeringTitleUpper: "上半身叠穿顺序",
      layeringTitleLower: "下半身叠穿顺序",
      layeringInner: "里层 (内搭)",
      layeringOuter: "外层 (外套)",
      moveInner: "移至里层",
      moveOuter: "移至外层",
      download: "保存图片",
      close: "关闭"
    },
    chat: {
      title: "AI 搭配师",
      placeholder: "问我任何穿搭建议...",
      initial: "你好！我是你的专属 AI 搭配师。我可以根据天气、场合为你推荐最合适的穿搭。",
      thinking: "思考中...",
      error: "连接似乎断开了，请重试。",
      outfitToday: "今日穿搭推荐",
      dateNight: "约会穿搭建议",
      locationPlaceholder: "输入城市",
      weatherRec: "基于天气的推荐",
      failedWeather: "暂时无法获取天气信息，但我建议根据气温适当增减衣物。"
    },
    profile: {
      title: "我的资料",
      height: "身高 (cm)",
      weight: "体重 (kg)",
      style: "风格偏好",
      gender: "性别",
      male: "男",
      female: "女",
      unisex: "通用",
      save: "保存资料",
      uploadPhoto: "上传本人全身照",
      photoNote: "上传照片后，试穿功能将直接使用您的照片，不再显示 3D 模型。",
      modelTier: "模型能力",
      tierFree: "标准版 (免费/快速)",
      tierPaid: "专业版 (付费/高清)",
      tierNote: "专业版需要绑定计费项目的 API Key。",
      verifying: "正在验证 API Key...",
      verificationSuccess: "验证成功！已切换到专业版。",
      verificationFailed: "验证失败：该 API Key 无法访问专业版模型。请检查 Google Cloud 计费设置。",
      apiKeyRequired: "需要 API Key"
    },
    nav: {
      wardrobe: "衣橱",
      tryon: "试穿",
      chat: "顾问"
    }
  },
  // 英文翻译
  en: {
    appTitle: "SmartWardrobe AI",
    wardrobe: {
      title: "My Wardrobe",
      empty: "No items found. Add some clothes!",
      filterAll: "All",
      uploading: "Analyzing batch ({current}/{total})...",
      noItemsFound: "No items found"
    },
    category: {
      Top: "Top",
      Bottom: "Bottom",
      Shoes: "Shoes",
      Outerwear: "Outerwear",
      Accessory: "Accessory",
      Dress: "Dress"
    },
    tryOn: {
      title: "Virtual Try-On",
      height: "Height",
      weight: "Weight",
      rotatable: "Rotatable 3D Model",
      visualizeBtn: "Visualize with AI",
      dreaming: "Dreaming...",
      back: "Back",
      noItem: "No items found",
      visualizeSuccess: "Success",
      usingUserPhoto: "Using your personal photo as model",
      resetPhoto: "Reset Model",
      layeringTitleUpper: "Upper Body Layering",
      layeringTitleLower: "Lower Body Layering",
      layeringInner: "Inner",
      layeringOuter: "Outer",
      moveInner: "Move Inner",
      moveOuter: "Move Outer",
      download: "Save Image",
      close: "Close"
    },
    chat: {
      title: "Gemini Stylist",
      placeholder: "Ask me anything...",
      initial: "Hello! I am your AI stylist. I can help you pick an outfit based on the weather or your specific plans.",
      thinking: "I'm thinking...",
      error: "Sorry, I had trouble connecting.",
      outfitToday: "Outfit for Today",
      dateNight: "Date Night",
      locationPlaceholder: "Enter City",
      weatherRec: "Recommendation",
      failedWeather: "I couldn't check the weather right now, but I recommend layering up!"
    },
    profile: {
      title: "My Profile",
      height: "Height (cm)",
      weight: "Weight (kg)",
      style: "Style Preference",
      gender: "Gender",
      male: "Male",
      female: "Female",
      unisex: "Unisex",
      save: "Save Profile",
      uploadPhoto: "Upload Full Body Photo",
      photoNote: "Uploading a photo will replace the 3D avatar with your actual image.",
      modelTier: "Model Capability",
      tierFree: "Standard (Free/Fast)",
      tierPaid: "Pro (Paid/High Quality)",
      tierNote: "Pro requires an API Key with a billed project.",
      verifying: "Verifying API Key...",
      verificationSuccess: "Verification Success! Switched to Pro.",
      verificationFailed: "Verification Failed: Key cannot access Pro models. Check Google Cloud billing.",
      apiKeyRequired: "API Key Required"
    },
    nav: {
      wardrobe: "Wardrobe",
      tryon: "Try On",
      chat: "Stylist"
    }
  },
  // 日文翻译
  ja: {
    appTitle: "スマートワードローブ AI",
    wardrobe: {
      title: "マイクローゼット",
      empty: "アイテムがありません。服を追加しましょう！",
      filterAll: "すべて",
      uploading: "一括分析中 ({current}/{total})...",
      noItemsFound: "アイテムが見つかりません"
    },
    category: {
      Top: "トップス",
      Bottom: "ボトムス",
      Shoes: "シューズ",
      Outerwear: "アウター",
      Accessory: "アクセサリー",
      Dress: "ワンピース"
    },
    tryOn: {
      title: "バーチャル試着",
      height: "身長",
      weight: "体重",
      rotatable: "回転可能な3Dモデル",
      visualizeBtn: "AIで試着イメージ生成",
      dreaming: "生成中...",
      back: "戻る",
      noItem: "アイテムがありません",
      visualizeSuccess: "生成完了",
      usingUserPhoto: "あなたの写真を使用中",
      resetPhoto: "モデルをリセット",
      layeringTitleUpper: "トップス重ね着順序",
      layeringTitleLower: "ボトムス重ね着順序",
      layeringInner: "インナー (内)",
      layeringOuter: "アウター (外)",
      moveInner: "内側へ移動",
      moveOuter: "外側へ移動",
      download: "画像を保存",
      close: "閉じる"
    },
    chat: {
      title: "AIスタイリスト",
      placeholder: "コーディネートについて聞いてください...",
      initial: "こんにちは！AIスタイリストです。天気や予定に合わせて最適なコーディネートを提案します。",
      thinking: "考え中...",
      error: "接続に問題が発生しました。",
      outfitToday: "今日のコーデ",
      dateNight: "デートコーデ",
      locationPlaceholder: "都市を入力",
      weatherRec: "天気予報に基づく提案",
      failedWeather: "天気の取得に失敗しましたが、重ね着をおすすめします！"
    },
    profile: {
      title: "マイプロフィール",
      height: "身長 (cm)",
      weight: "体重 (kg)",
      style: "好みのスタイル",
      gender: "性別",
      male: "男性",
      female: "女性",
      unisex: "ユニセックス",
      save: "保存",
      uploadPhoto: "全身写真をアップロード",
      photoNote: "写真をアップロードすると、3Dアバターの代わりにあなたの写真が使用されます。",
      modelTier: "AIモデル設定",
      tierFree: "標準 (無料/高速)",
      tierPaid: "Pro (有料/高品質)",
      tierNote: "Proモードは課金プロジェクトのAPIキーが必要です。",
      verifying: "APIキーを確認中...",
      verificationSuccess: "確認成功！Proモードに切り替えました。",
      verificationFailed: "確認失敗：このキーはProモデルにアクセスできません。",
      apiKeyRequired: "APIキーが必要です"
    },
    nav: {
      wardrobe: "クローゼット",
      tryon: "試着",
      chat: "相談"
    }
  }
};

// 获取翻译函数
export const getTranslation = (lang: Language) => translations[lang];