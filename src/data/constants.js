// الكلمة اللي كانت جوه App.js
export const WORD_LISTS = {
    'عام': ['سيارة', 'منزل', 'شجرة', 'شمس', 'قمر', 'كتاب', 'قلم', 'تفاحة', 'موز', 'قطة', 'كلب', 'جبل', 'نهر', 'كرسي', 'طاولة', 'هاتف', 'كمبيوتر', 'ساعة', 'نظارة', 'مفتاح', 'محفظة', 'كرة', 'دراجة', 'طائرة'],
    'حيوانات': ['فيل', 'زرافة', 'تمساح', 'بطريق', 'كنغر', 'أخطبوط', 'دولفين', 'نمر', 'أسد', 'قرد', 'حصان', 'بقرة', 'خروف', 'أرنب', 'سلحفاة', 'ثعلب', 'دب', 'ذئب', 'غزال', 'جمل'],
    'طعام': ['بيتزا', 'برجر', 'بطاطس مقلية', 'سوشي', 'آيس كريم', 'كعكة', 'سلطة', 'قهوة', 'شاي', 'عصير', 'خبز', 'جبن', 'بيض', 'دجاج', 'سمك', 'أرز', 'معكرونة', 'شوربة', 'فاكهة', 'خضروات'],
    'أفلام وشخصيات': ['تيتانيك', 'باتمان', 'سبايدرمان', 'أفاتار', 'هاري بوتر', 'الأسد الملك', 'علاء الدين', 'فروزن', 'جوكر', 'سوبرمان', 'كابتن أمريكا', 'شريك', 'ميكي ماوس', 'سندريلا', 'طرزان'],
    'أماكن ومعالم': ['هرم', 'برج إيفل', 'سور الصين العظيم', 'مدرسة', 'مستشفى', 'شاطئ', 'غابة', 'صحراء', 'مدينة', 'قرية', 'مطار', 'محطة قطار', 'متحف', 'مكتبة', 'ملعب', 'بركان', 'جزيرة'],
    'أفعال وأنشطة': ['يركض', 'يقفز', 'يسبح', 'يأكل', 'يشرب', 'ينام', 'يقرأ', 'يكتب', 'يرسم', 'يلعب', 'يسافر', 'يضحك', 'يبكي', 'يطبخ', 'يقود سيارة']
};

// الأغراض اللي في المتجر
export const STORE_ITEMS = {
    // Frames
    'frame_gold': { name: 'الإطار الذهبي', price: 500, type: 'frame', style: 'gold-frame' },
    'frame_silver': { name: 'الإطار الفضي', price: 250, type: 'frame', style: 'silver-frame' },
    'frame_fire': { name: 'الإطار الناري', price: 1000, type: 'frame', style: 'fire-frame' },
    'frame_royal': { name: 'الإطار الملكي', price: 1200, type: 'frame', style: 'royal-frame' },
    'frame_water': { name: 'الإطار المائي', price: 750, type: 'frame', style: 'water-frame' },
    'frame_gem': { name: 'إطار الجوهرة', price: 1500, type: 'frame', style: 'gem-frame' },
    'frame_nature': { name: 'الإطار الطبيعي', price: 800, type: 'frame', style: 'nature-frame' },
    'frame_neon': { name: 'إطار النيون', price: 1100, type: 'frame', style: 'neon-frame' },
    'frame_blossom': { name: 'إطار أزهار الكرز 🌸', price: 900, type: 'frame', style: 'frame-blossom' },
    'frame_ice': { name: 'الإطار الجليدي ❄️', price: 950, type: 'frame', style: 'frame-ice' },
    'frame_circuit': { name: 'إطار الدوائر 💻', price: 1300, type: 'frame', style: 'frame-circuit' },
    'frame_comic': { name: 'إطار كوميك 💥', price: 850, type: 'frame', style: 'frame-comic' },
    // --- NEW FRAMES (Ramadan & Others) ---
    'frame_ramadan': { name: 'إطار رمضان 🌙', price: 1000, type: 'frame', style: 'frame-ramadan' },
    'frame_glitch': { name: 'إطار جليتش 👾', price: 1250, type: 'frame', style: 'frame-glitch' },
    'frame_steampunk': { name: 'إطار ستيم بانك ⚙️', price: 1400, type: 'frame', style: 'frame-steampunk' },
    'frame_rainbow': { name: 'إطار قوس قزح 🌈', price: 1150, type: 'frame', style: 'frame-rainbow' },
    // --- END NEW ---

    // Backgrounds
    'bg_galaxy': { name: 'خلفية المجرة ✨', price: 400, type: 'background', style: 'bg-galaxy' }, // Added emoji
    'bg_sunset': { name: 'خلفية الغروب 🌇', price: 350, type: 'background', style: 'bg-sunset' }, // Added emoji
    'bg_forest': { name: 'خلفية الغابة 🌲', price: 300, type: 'background', style: 'bg-forest' }, // Added emoji
    'bg_sea': { name: 'خلفية البحر 🐠', price: 300, type: 'background', style: 'bg-sea' }, // Added emoji
    'bg_night_city': { name: 'المدينة الليلية 🌃', price: 450, type: 'background', style: 'bg-night-city' }, // Added emoji
    'bg_snow': { name: 'خلفية الثلج ☃️', price: 250, type: 'background', style: 'bg-snow' }, // Added emoji
    'bg_cherry_blossom': { name: 'أزهار الكرز 🌸', price: 600, type: 'background', style: 'bg-cherry-blossom' },
    'bg_aurora': { name: 'الشفق القطبي ✨', price: 750, type: 'background', style: 'bg-aurora' },

    // Drawing Tools
    'tool_spray': { name: 'أداة الرش', price: 600, type: 'tool', value: 'spray', icon: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2a6 6 0 0 0-6 6c0 2.5 1.5 4.6 3.6 5.5L6 17.6V22h2v-3h8v3h2V17.6l-3.6-4.1C16.5 12.6 18 10.5 18 8a6 6 0 0 0-6-6z"/><circle cx="12" cy="8" r="2"/></svg>` },
    'tool_pattern': { name: 'فرشاة النقش', price: 800, type: 'tool', value: 'pattern', icon: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="1"><rect x="0" y="0" width="8" height="8" /><rect x="8" y="8" width="8" height="8" /><rect x="16" y="0" width="8" height="8" /><rect x="0" y="16" width="8" height="8" /><rect x="16" y="16" width="8" height="8" /></svg>` },
    'tool_line': { name: 'خط مستقيم', price: 400, type: 'tool', value: 'line', icon: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 19L19 5"/></svg>` },
    'tool_rectangle': { name: 'مستطيل', price: 450, type: 'tool', value: 'rectangle', icon: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="5" width="18" height="14" rx="2"/></svg>` },
    'tool_circle': { name: 'دائرة', price: 500, type: 'tool', value: 'circle', icon: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="8"/></svg>` },
    'tool_eyedropper': { name: 'قطارة الألوان', price: 700, type: 'tool', value: 'eyedropper', icon: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0L12 2.69z"/><path d="M12 12.69L2.69 3.34"/></svg>` },
    'tool_fill_bucket': { name: 'أداة التعبئة', price: 1000, type: 'tool', value: 'fill', icon: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22a2 2 0 0 0 2-2h-4a2 2 0 0 0 2 2z"/><path d="M12 2a4 4 0 0 0-4 4v.28c0 1.45.6 2.78 1.6 3.72L12 12l2.4-2.00c1-.94 1.6-2.27 1.6-3.72V6a4 4 0 0 0-4-4z"/><path d="m13.88 15.6 3.12 3.9a2 2 0 0 1-3.2 2.5l-2.8-3.5a2 2 0 0 1 .4-2.8Z"/><path d="m10.12 15.6-3.12 3.9a2 2 0 1 0 3.2 2.5l2.8-3.5a2 2 0 0 0-.4-2.8Z"/></svg>` },

    // Features
    'feature_custom_avatar': { name: 'صورة رمزية مخصصة', price: 2000, type: 'feature', icon: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>` }
};

export const AVATAR_COUNT = 60;