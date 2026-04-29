import type { Language } from '@/lib/supabase/types'

// ── Cuisine options (key + label per language) ─────────────────────────────────
export const CUISINES = {
  ru: [
    { key: 'italian',   label: '🍕 Итальянская' },
    { key: 'japanese',  label: '🍣 Японская' },
    { key: 'arabic',    label: '🥙 Арабская' },
    { key: 'indian',    label: '🍛 Индийская' },
    { key: 'chinese',   label: '🥢 Китайская' },
    { key: 'american',  label: '🍔 Американская' },
    { key: 'mexican',   label: '🌮 Мексиканская' },
    { key: 'thai',      label: '🍜 Тайская' },
    { key: 'turkish',   label: '🥗 Турецкая' },
    { key: 'any',       label: '🌍 Любые кухни' },
  ],
  en: [
    { key: 'italian',   label: '🍕 Italian' },
    { key: 'japanese',  label: '🍣 Japanese' },
    { key: 'arabic',    label: '🥙 Arabic' },
    { key: 'indian',    label: '🍛 Indian' },
    { key: 'chinese',   label: '🥢 Chinese' },
    { key: 'american',  label: '🍔 American' },
    { key: 'mexican',   label: '🌮 Mexican' },
    { key: 'thai',      label: '🍜 Thai' },
    { key: 'turkish',   label: '🥗 Turkish' },
    { key: 'any',       label: '🌍 Any cuisine' },
  ],
  ar: [
    { key: 'italian',   label: '🍕 إيطالية' },
    { key: 'japanese',  label: '🍣 يابانية' },
    { key: 'arabic',    label: '🥙 عربية' },
    { key: 'indian',    label: '🍛 هندية' },
    { key: 'chinese',   label: '🥢 صينية' },
    { key: 'american',  label: '🍔 أمريكية' },
    { key: 'mexican',   label: '🌮 مكسيكية' },
    { key: 'thai',      label: '🍜 تايلاندية' },
    { key: 'turkish',   label: '🥗 تركية' },
    { key: 'any',       label: '🌍 أي مطبخ' },
  ],
} as const

// ── Stop-list options ──────────────────────────────────────────────────────────
export const STOP_LIST_OPTIONS = {
  ru: [
    { key: 'meat',    label: '🥩 Мясо' },
    { key: 'seafood', label: '🦐 Морепродукты' },
    { key: 'dairy',   label: '🥛 Молочное' },
    { key: 'nuts',    label: '🥜 Орехи' },
    { key: 'gluten',  label: '🌾 Глютен' },
    { key: 'spicy',   label: '🌶️ Острое' },
    { key: 'sweets',  label: '🍰 Сладкое' },
  ],
  en: [
    { key: 'meat',    label: '🥩 Meat' },
    { key: 'seafood', label: '🦐 Seafood' },
    { key: 'dairy',   label: '🥛 Dairy' },
    { key: 'nuts',    label: '🥜 Nuts' },
    { key: 'gluten',  label: '🌾 Gluten' },
    { key: 'spicy',   label: '🌶️ Spicy' },
    { key: 'sweets',  label: '🍰 Sweets' },
  ],
  ar: [
    { key: 'meat',    label: '🥩 لحم' },
    { key: 'seafood', label: '🦐 مأكولات بحرية' },
    { key: 'dairy',   label: '🥛 ألبان' },
    { key: 'nuts',    label: '🥜 مكسرات' },
    { key: 'gluten',  label: '🌾 جلوتين' },
    { key: 'spicy',   label: '🌶️ حار' },
    { key: 'sweets',  label: '🍰 حلويات' },
  ],
} as const

// ── Light-vegan animal product checklist ───────────────────────────────────────
export const LIGHT_VEGAN_OPTIONS = {
  ru: [
    { key: 'meat',    label: '🥩 Мясо' },
    { key: 'seafood', label: '🦐 Рыба/Морепродукты' },
    { key: 'dairy',   label: '🥛 Молочное' },
  ],
  en: [
    { key: 'meat',    label: '🥩 Meat' },
    { key: 'seafood', label: '🦐 Fish/Seafood' },
    { key: 'dairy',   label: '🥛 Dairy' },
  ],
  ar: [
    { key: 'meat',    label: '🥩 لحم' },
    { key: 'seafood', label: '🦐 سمك/مأكولات بحرية' },
    { key: 'dairy',   label: '🥛 ألبان' },
  ],
} as const

// ── Main strings per language ──────────────────────────────────────────────────
const strings = {
  ru: {
    choose_language:    'Выберите язык / Choose language / اختر اللغة',
    language_set:       '🇷🇺 Язык: Русский',
    welcome:            'Привет! Я FoodAgent 🍽️\n\nНахожу лучшую еду в ОАЭ — сравниваю цены на Talabat и Deliveroo, считаю КБЖУ, выбираю лучшее предложение.',
    ask_name:           'Как вас зовут?',
    ask_cuisine:        '🍽️ Любимые кухни (можно несколько):\n\nПоказываем их первыми, но не скрываем остальное.',
    cuisine_done_btn:   '✅ Готово',
    none_btn:           '— Нет ограничений',
    ask_stop_list:      '🚫 Есть продукты, которые не едите?\n\nВыберите из списка или нажмите «Нет»:',
    ask_address_mode:   '📍 Как вы хотите указывать адрес доставки?',
    addr_save_btn:      '📍 Сохранить адрес',
    addr_each_btn:      '🔄 Указывать каждый раз',
    ask_address:        '📍 Укажите ваш адрес или отправьте геолокацию:\n\n_Например: Dubai Marina, JBR, Downtown Dubai_',
    share_location_btn: '📍 Отправить геолокацию',
    type_address_btn:   '✏️ Ввести текстом',
    ask_goal:           '🎯 Какая ваша цель в питании?',
    goal_diet_btn:      '🥗 Поддерживать диету',
    goal_variety_btn:   '🍽️ Разнообразие без ограничений',
    goal_balance_btn:   '⚖️ Соблюдать баланс',
    profile_saved:      (name: string) =>
      `✅ Готово, ${name}! Профиль сохранён.\n\nТеперь напишите или скажите голосом, что хотите поесть — найду лучшие варианты.`,
    profile_hint:       '💡 Попробуйте: «Хочу пиццу» или просто нажмите 🎤 и скажите вслух',
    commands_hint:      '📋 Доступные команды:\n/profile — настройки профиля\n/language — сменить язык\n/cancel — отменить текущее действие',
    cancel_ok:          '↩️ Действие отменено. Напишите что хотите поесть.',
    cancel_onboarding:  '↩️ Регистрация отменена. Отправьте /start чтобы начать заново.',
    trial_active:       (days: number) =>
      `⏳ Пробный период: ещё ${days} ${dayWord(days)} бесплатно.`,
    trial_expired_msg:  '⏰ Ваш 30-дневный пробный период завершился.\n\nОформите подписку, чтобы продолжить:',
    subscribe_btn:      '💳 Оформить подписку',
    language_prompt:    'Выберите язык:',
    language_changed:   '🇷🇺 Язык изменён на Русский',
    unknown_command:    'Напишите или скажите 🎤 что хотите поесть — найду лучшее предложение.',
    voice_received:     (text: string) => `🎤 Услышал: _«${text}»_`,
    voice_searching:    'Ищу...',
    // Profile
    profile_title:      '👤 Ваш профиль',
    edit_language_btn:  '🗣 Язык',
    edit_cuisine_btn:   '🍽️ Кухни',
    edit_stoplist_btn:  '🚫 Стоп-лист',
    edit_address_btn:   '📍 Адрес',
    edit_goal_btn:      '🎯 Цель',
    profile_updated:    '✅ Профиль обновлён!',
    no_cuisines:        'не указаны',
    no_stop_list:       'нет ограничений',
    no_address:         'не указан',
    goal_diet_label:    '🥗 Диета',
    goal_variety_label: '🍽️ Разнообразие',
    goal_balance_label: '⚖️ Баланс',
    // Language picker labels in this language
    lang_ru_btn:        '🇷🇺 Русский',
    lang_en_btn:        '🇬🇧 Английский',
    lang_ar_btn:        '🇸🇦 Арабский',
    // Welcome back (returning user)
    welcome_back:       (name: string) =>
      `👋 С возвращением, ${name}!\n\n` +
      `Что я могу для вас:\n\n` +
      `🔍 Найти что-то вкусное — опишите настроение: «Хочу что-то лёгкое, не острое, около 30 AED» — найду по всем платформам\n\n` +
      `💰 Сравнить цены — одно блюдо может стоить на 15–25 AED дешевле на другой платформе с учётом всех сборов\n\n` +
      `🥗 Следить за питанием — укажите цель: кето, не больше 500 ккал, минимум углеводов — отфильтрую и покажу нутриенты\n\n` +
      `Напишите что хотите поесть или отправьте 🎤 голосовое сообщение.`,
    // Vegan step
    ask_vegan:          '🌿 Придерживаетесь веганства?',
    vegan_none_btn:     '🍖 Нет, ем всё',
    vegan_strict_btn:   '🌿 Да, строгий веган',
    vegan_light_btn:    '🥗 Веган — Лайт (частично)',
    ask_light_vegan:    '🥗 Какие животные продукты исключить?\n\nВыберите из списка:',
    lvegan_done_btn:    '✅ Готово',
    vegan_none_label:   '🍖 Ем всё',
    vegan_strict_label: '🌿 Строгий веган',
    vegan_light_label:  '🥗 Веган — Лайт',
    edit_vegan_btn:     '🌿 Веган',
    // Platform toggles
    edit_platforms_btn: '📱 Платформы',
    edit_rating_btn:    '⭐ Рейтинг',
    ask_platforms:      '📱 Выберите платформы для поиска:',
    ask_rating:         '⭐ Минимальный рейтинг ресторана:',
    no_platforms:       'не выбраны',
    // Per-search location picker
    ask_location:       '📍 Куда доставить?',
    loc_home_btn:       '🏠 Домой',
    loc_work_btn:       '🏢 На работу',
    loc_pin_btn:        '📍 Отправить геолокацию',
    loc_other_btn:      '✏️ Другой адрес',
    loc_save_prompt:    'Сохранить этот адрес?',
    loc_save_home_btn:  '🏠 Как «Дом»',
    loc_save_work_btn:  '🏢 Как «Работа»',
    loc_no_save_btn:    '— Не сохранять',
    loc_saved:          '✅ Адрес сохранён.',
    loc_empty:          'Пусто',
    // Onboarding progress bar
    onboarding_progress: (step: number, total: number) =>
      `Шаг ${step} из ${total}`,
    skip_btn:            'Пропустить →',
    // Soft address step (end of onboarding)
    ask_address_soft:    '📍 Хотите указать район доставки?\n\nЭто поможет мне учитывать стоимость доставки в ваш район при сравнении цен.',
    set_area_btn:        '📍 Указать район',
    // Search pipeline
    searching:           '🔍 Ищу лучшие предложения на Talabat и Deliveroo...',
    search_error_fallback: '😔 Платформы временно недоступны. Попробуйте через несколько минут.\n\nЕсли проблема повторяется — попробуйте другой запрос.',
    no_results_fallback: '🤷 По этому запросу ничего не нашлось.\n\nПопробуйте изменить запрос или убрать фильтры.',
    no_actionable_results: '⚠️ Нашелись только неполные карточки (без цены или прямой ссылки на заказ).\n\nПопробуйте повторить поиск через минуту или другой запрос.',
    cuisine_fallback_notice: '⚠️ По вашим кухням ничего не нашлось — показываю все доступные варианты.',
    order_btn:           'Заказать →',
    surprise_btn:        'Удиви меня',
    retry_btn:           '🔄 Повторить поиск',
    search_no_filters_btn: '🔍 Искать без фильтров',
    // Stop-list conflict
    conflict_prompt:     (dish: string, item: string) =>
      `⚠️ В «${dish}» есть ${item} — он у вас в стоп-листе.\n\nКак поступим?`,
    conflict_bypass_btn: '✅ Всё равно показать',
    conflict_stop_btn:   '🚫 Убрать из стоп-листа',
    // Price alerts
    dismiss_alert_btn:   '✕ Закрыть',
    price_alert:         (dish: string, restaurant: string, delta: number, price: number, platform: string) =>
      `📉 Цена снизилась!\n\n${dish} в ${restaurant}\nБыло: ${price + delta} AED → Стало: ${price} AED (−${delta} AED)\nПлатформа: ${platform}`,
    // Trial cron reminders
    trial_reminder_3:    (days: number) =>
      `⏳ До конца пробного периода осталось ${days} ${dayWord(days)}.\n\nОформите подписку заранее, чтобы не прерваться:`,
    trial_reminder_1:    '⚠️ Завтра заканчивается ваш бесплатный пробный период.\n\nОформите подписку сейчас:',
    trial_expired:       '⏰ Пробный период закончился.\n\nЧтобы продолжить пользоваться FoodAgent — оформите подписку:',
    // Weekly report cron
    weekly_report:       (searches: number, saved: number, equivalent: number, best_dish: string) =>
      `📊 Ваш недельный отчёт:\n\n🔍 Поисков: ${searches}\n💰 Сэкономлено: ${saved} AED\n📦 Заказов на сумму: ${equivalent} AED\n⭐ Лучший выбор недели: ${best_dish}\n\nОткройте дашборд для подробной статистики:`,
    open_dashboard_btn:  '📊 Открыть дашборд',
  },

  en: {
    choose_language:    'Выберите язык / Choose language / اختر اللغة',
    language_set:       '🇬🇧 Language: English',
    welcome:            'Hi! I\'m FoodAgent 🍽️\n\nI find the best food in UAE — compare Talabat & Deliveroo prices, track nutrition, pick the best deal.',
    ask_name:           'What\'s your name?',
    ask_cuisine:        '🍽️ Favourite cuisines (pick as many as you like):\n\nShown first, but others still appear.',
    cuisine_done_btn:   '✅ Done',
    none_btn:           '— No restrictions',
    ask_stop_list:      '🚫 Any foods you avoid?\n\nPick from the list or tap "None":',
    ask_address_mode:   '📍 How do you want to set your delivery address?',
    addr_save_btn:      '📍 Save an address',
    addr_each_btn:      '🔄 Ask me each time',
    ask_address:        '📍 Share your location or type your area:\n\n_E.g. Dubai Marina, JBR, Downtown Dubai_',
    share_location_btn: '📍 Share location',
    type_address_btn:   '✏️ Type address',
    ask_goal:           '🎯 What\'s your eating goal?',
    goal_diet_btn:      '🥗 Maintain a diet',
    goal_variety_btn:   '🍽️ Enjoy variety freely',
    goal_balance_btn:   '⚖️ Keep a balance',
    profile_saved:      (name: string) =>
      `✅ Done, ${name}! Profile saved.\n\nNow type or say 🎤 what you want to eat — I'll find the best options.`,
    profile_hint:       '💡 Try: "I want pizza" or tap 🎤 and just say it',
    commands_hint:      '📋 Available commands:\n/profile — profile settings\n/language — change language\n/cancel — cancel current action',
    cancel_ok:          '↩️ Cancelled. Tell me what you want to eat.',
    cancel_onboarding:  '↩️ Setup cancelled. Send /start to begin again.',
    trial_active:       (days: number) =>
      `⏳ Trial: ${days} ${days === 1 ? 'day' : 'days'} remaining for free.`,
    trial_expired_msg:  '⏰ Your 30-day free trial has ended.\n\nSubscribe to keep using FoodAgent:',
    subscribe_btn:      '💳 Subscribe',
    language_prompt:    'Choose your language:',
    language_changed:   '🇬🇧 Language changed to English',
    unknown_command:    'Type or say 🎤 what you want to eat — I\'ll find the best deal.',
    voice_received:     (text: string) => `🎤 Got it: _«${text}»_`,
    voice_searching:    'Searching...',
    profile_title:      '👤 Your profile',
    edit_language_btn:  '🗣 Language',
    edit_cuisine_btn:   '🍽️ Cuisines',
    edit_stoplist_btn:  '🚫 Stop list',
    edit_address_btn:   '📍 Address',
    edit_goal_btn:      '🎯 Goal',
    profile_updated:    '✅ Profile updated!',
    no_cuisines:        'not set',
    no_stop_list:       'no restrictions',
    no_address:         'not set',
    goal_diet_label:    '🥗 Diet',
    goal_variety_label: '🍽️ Variety',
    goal_balance_label: '⚖️ Balance',
    // Language picker labels in this language
    lang_ru_btn:        '🇷🇺 Russian',
    lang_en_btn:        '🇬🇧 English',
    lang_ar_btn:        '🇸🇦 Arabic',
    // Welcome back (returning user)
    welcome_back:       (name: string) =>
      `👋 Welcome back, ${name}!\n\n` +
      `Here's what I can do:\n\n` +
      `🔍 Find something tasty — describe your mood: "Light Japanese, under 40 AED" — I'll search all platforms\n\n` +
      `💰 Compare prices — the same dish can cost 15–25 AED less on another platform once all fees are included\n\n` +
      `🥗 Track nutrition — set a goal: keto, under 500 kcal, low carb — I'll filter and show full macros\n\n` +
      `Type what you want to eat or send a 🎤 voice message.`,
    // Per-search location picker
    ask_location:       '📍 Where should we deliver?',
    loc_home_btn:       '🏠 Home',
    loc_work_btn:       '🏢 Work',
    loc_pin_btn:        '📍 Send location',
    loc_other_btn:      '✏️ Other address',
    loc_save_prompt:    'Save this address?',
    loc_save_home_btn:  '🏠 Save as Home',
    loc_save_work_btn:  '🏢 Save as Work',
    loc_no_save_btn:    "— Don't save",
    loc_saved:          '✅ Address saved.',
    loc_empty:          'Empty',
    // Vegan step
    ask_vegan:          '🌿 Do you follow a vegan diet?',
    vegan_none_btn:     '🍖 No, I eat everything',
    vegan_strict_btn:   '🌿 Yes, strict vegan',
    vegan_light_btn:    '🥗 Vegan — Light (partial)',
    ask_light_vegan:    '🥗 Which animal products do you want to exclude?\n\nSelect from the list:',
    lvegan_done_btn:    '✅ Done',
    vegan_none_label:   '🍖 Eats everything',
    vegan_strict_label: '🌿 Strict vegan',
    vegan_light_label:  '🥗 Vegan — Light',
    edit_vegan_btn:     '🌿 Vegan',
    // Platform toggles
    edit_platforms_btn: '📱 Platforms',
    edit_rating_btn:    '⭐ Rating',
    ask_platforms:      '📱 Select platforms to search:',
    ask_rating:         '⭐ Minimum restaurant rating:',
    no_platforms:       'none selected',
    // Onboarding progress bar
    onboarding_progress: (step: number, total: number) =>
      `Step ${step} of ${total}`,
    skip_btn:            'Skip →',
    // Soft address step (end of onboarding)
    ask_address_soft:    '📍 Would you like to set a delivery area?\n\nThis helps me factor in delivery costs when comparing prices.',
    set_area_btn:        '📍 Set area',
    // Search pipeline
    searching:           '🔍 Searching for the best deals on Talabat and Deliveroo...',
    search_error_fallback: '😔 Platforms are temporarily unavailable. Please try again in a few minutes.\n\nIf the issue persists, try a different query.',
    no_results_fallback: '🤷 Nothing found for this request.\n\nTry adjusting your query or removing filters.',
    no_actionable_results: '⚠️ Only incomplete cards were found (no price or direct order link).\n\nPlease retry in a minute or use another query.',
    cuisine_fallback_notice: '⚠️ Nothing matched your cuisine prefs — showing all available options.',
    order_btn:           'Order →',
    surprise_btn:        'Surprise me',
    retry_btn:           '🔄 Search again',
    search_no_filters_btn: '🔍 Search without filters',
    // Stop-list conflict
    conflict_prompt:     (dish: string, item: string) =>
      `⚠️ "${dish}" contains ${item}, which is in your stop list.\n\nWhat would you like to do?`,
    conflict_bypass_btn: '✅ Show it anyway',
    conflict_stop_btn:   '🚫 Remove from stop list',
    // Price alerts
    dismiss_alert_btn:   '✕ Dismiss',
    price_alert:         (dish: string, restaurant: string, delta: number, price: number, platform: string) =>
      `📉 Price dropped!\n\n${dish} at ${restaurant}\nWas: ${price + delta} AED → Now: ${price} AED (−${delta} AED)\nPlatform: ${platform}`,
    // Trial cron reminders
    trial_reminder_3:    (days: number) =>
      `⏳ ${days} ${days === 1 ? 'day' : 'days'} left in your free trial.\n\nSubscribe now to keep going without interruption:`,
    trial_reminder_1:    '⚠️ Your free trial ends tomorrow.\n\nSubscribe now:',
    trial_expired:       '⏰ Your free trial has ended.\n\nSubscribe to keep using FoodAgent:',
    // Weekly report cron
    weekly_report:       (searches: number, saved: number, equivalent: number, best_dish: string) =>
      `📊 Your weekly report:\n\n🔍 Searches: ${searches}\n💰 Saved: ${saved} AED\n📦 Orders total: ${equivalent} AED\n⭐ Best pick of the week: ${best_dish}\n\nOpen the dashboard for full stats:`,
    open_dashboard_btn:  '📊 Open dashboard',
  },

  ar: {
    choose_language:    'Выберите язык / Choose language / اختر اللغة',
    language_set:       '🇸🇦 اللغة: العربية',
    welcome:            'مرحباً! أنا FoodAgent 🍽️\n\nأجد أفضل الطعام في الإمارات — أقارن أسعار طلبات وديليفرو، أحسب القيم الغذائية، وأختار أفضل عرض.',
    ask_name:           'ما اسمك؟',
    ask_cuisine:        '🍽️ المأكولات المفضلة (يمكنك اختيار أكثر من واحدة):\n\nتظهر أولاً، لكن لا يُخفى شيء.',
    cuisine_done_btn:   '✅ تم',
    none_btn:           '— لا قيود',
    ask_stop_list:      '🚫 هل تتجنب أطعمة معينة؟\n\nاختر من القائمة أو اضغط «لا شيء»:',
    ask_address_mode:   '📍 كيف تريد تحديد عنوان التوصيل؟',
    addr_save_btn:      '📍 حفظ عنوان ثابت',
    addr_each_btn:      '🔄 تحديده في كل مرة',
    ask_address:        '📍 أرسل موقعك أو اكتب منطقتك:\n\n_مثال: دبي مارينا، جميرا، وسط دبي_',
    share_location_btn: '📍 إرسال الموقع',
    type_address_btn:   '✏️ كتابة العنوان',
    ask_goal:           '🎯 ما هو هدفك الغذائي؟',
    goal_diet_btn:      '🥗 اتباع حمية غذائية',
    goal_variety_btn:   '🍽️ التنوع بلا قيود',
    goal_balance_btn:   '⚖️ توازن بين الاثنين',
    profile_saved:      (name: string) =>
      `✅ تم يا ${name}! تم حفظ ملفك الشخصي.\n\nاكتب أو قل 🎤 ما تريد أكله وسأجد أفضل الخيارات.`,
    profile_hint:       '💡 جرب: «أريد بيتزا» أو اضغط 🎤 وقلها بصوت',
    commands_hint:      '📋 الأوامر المتاحة:\n/profile — إعدادات الملف الشخصي\n/language — تغيير اللغة\n/cancel — إلغاء الإجراء الحالي',
    cancel_ok:          '↩️ تم الإلغاء. أخبرني بما تريد أكله.',
    cancel_onboarding:  '↩️ تم إلغاء الإعداد. أرسل /start للبدء من جديد.',
    trial_active:       (days: number) =>
      `⏳ الفترة التجريبية: ${days} ${days === 1 ? 'يوم' : 'أيام'} مجاناً.`,
    trial_expired_msg:  '⏰ انتهت فترتك التجريبية المجانية.\n\nاشترك للاستمرار:',
    subscribe_btn:      '💳 اشترك الآن',
    language_prompt:    'اختر لغتك:',
    language_changed:   '🇸🇦 تم تغيير اللغة إلى العربية',
    unknown_command:    'اكتب أو قل 🎤 ما تريد أكله وسأجد أفضل عرض.',
    voice_received:     (text: string) => `🎤 سمعت: _«${text}»_`,
    voice_searching:    'جارٍ البحث...',
    profile_title:      '👤 ملفك الشخصي',
    edit_language_btn:  '🗣 اللغة',
    edit_cuisine_btn:   '🍽️ المأكولات',
    edit_stoplist_btn:  '🚫 القائمة السوداء',
    edit_address_btn:   '📍 العنوان',
    edit_goal_btn:      '🎯 الهدف',
    profile_updated:    '✅ تم تحديث ملفك الشخصي!',
    no_cuisines:        'غير محدد',
    no_stop_list:       'لا قيود',
    no_address:         'غير محدد',
    goal_diet_label:    '🥗 حمية',
    goal_variety_label: '🍽️ تنوع',
    goal_balance_label: '⚖️ توازن',
    // Language picker labels in this language
    lang_ru_btn:        '🇷🇺 الروسية',
    lang_en_btn:        '🇬🇧 الإنجليزية',
    lang_ar_btn:        '🇸🇦 العربية',
    // Welcome back (returning user)
    welcome_back:       (name: string) =>
      `👋 أهلاً بعودتك، ${name}!\n\n` +
      `إليك ما يمكنني فعله:\n\n` +
      `🔍 البحث عن شيء لذيذ — صف ما تشتهيه: «شيء خفيف، غير حار، 30 درهم» — سأبحث في جميع المنصات\n\n` +
      `💰 مقارنة الأسعار — نفس الطبق قد يكون أرخص بـ15–25 درهماً في منصة أخرى بعد احتساب جميع الرسوم\n\n` +
      `🥗 متابعة التغذية — حدد هدفك: كيتو، أقل من 500 سعرة، قليل الكربوهيدرات — سأعرض القيم الغذائية\n\n` +
      `اكتب ما تريد أكله أو أرسل رسالة 🎤 صوتية.`,
    // Per-search location picker
    ask_location:       '📍 إلى أين نوصّل؟',
    loc_home_btn:       '🏠 المنزل',
    loc_work_btn:       '🏢 العمل',
    loc_pin_btn:        '📍 إرسال الموقع',
    loc_other_btn:      '✏️ عنوان آخر',
    loc_save_prompt:    'هل تريد حفظ هذا العنوان؟',
    loc_save_home_btn:  '🏠 كـ«المنزل»',
    loc_save_work_btn:  '🏢 كـ«العمل»',
    loc_no_save_btn:    '— لا أريد حفظه',
    loc_saved:          '✅ تم حفظ العنوان.',
    loc_empty:          'فارغ',
    // Vegan step
    ask_vegan:          '🌿 هل تتبع نظاماً نباتياً؟',
    vegan_none_btn:     '🍖 لا، آكل كل شيء',
    vegan_strict_btn:   '🌿 نعم، نباتي صارم',
    vegan_light_btn:    '🥗 نباتي — لايت (جزئي)',
    ask_light_vegan:    '🥗 ما المنتجات الحيوانية التي تريد استبعادها؟\n\nاختر من القائمة:',
    lvegan_done_btn:    '✅ تم',
    vegan_none_label:   '🍖 يأكل كل شيء',
    vegan_strict_label: '🌿 نباتي صارم',
    vegan_light_label:  '🥗 نباتي — لايت',
    edit_vegan_btn:     '🌿 نباتي',
    // Platform toggles
    edit_platforms_btn: '📱 المنصات',
    edit_rating_btn:    '⭐ التقييم',
    ask_platforms:      '📱 اختر منصات التوصيل للبحث:',
    ask_rating:         '⭐ الحد الأدنى لتقييم المطعم:',
    no_platforms:       'لم يتم الاختيار',
    // Onboarding progress bar
    onboarding_progress: (step: number, total: number) =>
      `الخطوة ${step} من ${total}`,
    skip_btn:            '← تخطَّ',
    // Soft address step (end of onboarding)
    ask_address_soft:    '📍 هل تريد تحديد منطقة التوصيل؟\n\nسيساعدني ذلك في احتساب تكلفة التوصيل عند مقارنة الأسعار.',
    set_area_btn:        '📍 تحديد المنطقة',
    // Search pipeline
    searching:           '🔍 أبحث عن أفضل العروض على طلبات وديليفرو...',
    search_error_fallback: '😔 المنصات غير متاحة مؤقتاً. حاول مرة أخرى بعد دقائق.\n\nإذا استمرت المشكلة، جرب طلباً مختلفاً.',
    no_results_fallback: '🤷 لم يُعثر على نتائج لهذا الطلب.\n\nحاول تعديل طلبك أو إزالة بعض الفلاتر.',
    no_actionable_results: '⚠️ تم العثور فقط على بطاقات غير مكتملة (بدون سعر أو رابط طلب مباشر).\n\nحاول مجدداً بعد دقيقة أو غيّر الطلب.',
    cuisine_fallback_notice: '⚠️ لا يوجد ما يطابق مأكولاتك المفضلة — إليك جميع الخيارات المتاحة.',
    order_btn:           'اطلب ←',
    surprise_btn:        'فاجئني',
    retry_btn:           '🔄 إعادة البحث',
    search_no_filters_btn: '🔍 بحث بدون فلاتر',
    // Stop-list conflict
    conflict_prompt:     (dish: string, item: string) =>
      `⚠️ «${dish}» يحتوي على ${item} الموجود في قائمة استثناءاتك.\n\nماذا تريد؟`,
    conflict_bypass_btn: '✅ أظهره على أي حال',
    conflict_stop_btn:   '🚫 حذف من الاستثناءات',
    // Price alerts
    dismiss_alert_btn:   '✕ إغلاق',
    price_alert:         (dish: string, restaurant: string, delta: number, price: number, platform: string) =>
      `📉 انخفض السعر!\n\n${dish} في ${restaurant}\nكان: ${price + delta} درهم ← الآن: ${price} درهم (−${delta} درهم)\nالمنصة: ${platform}`,
    // Trial cron reminders
    trial_reminder_3:    (days: number) =>
      `⏳ تبقّى ${days} ${days === 1 ? 'يوم' : 'أيام'} من فترتك التجريبية المجانية.\n\nاشترك الآن لتستمر دون انقطاع:`,
    trial_reminder_1:    '⚠️ فترتك التجريبية المجانية تنتهي غداً.\n\nاشترك الآن:',
    trial_expired:       '⏰ انتهت فترتك التجريبية المجانية.\n\nاشترك للاستمرار في استخدام FoodAgent:',
    // Weekly report cron
    weekly_report:       (searches: number, saved: number, equivalent: number, best_dish: string) =>
      `📊 تقريرك الأسبوعي:\n\n🔍 عمليات البحث: ${searches}\n💰 وفّرت: ${saved} درهم\n📦 إجمالي الطلبات: ${equivalent} درهم\n⭐ أفضل اختيار الأسبوع: ${best_dish}\n\nافتح لوحة التحكم لإحصاءات مفصّلة:`,
    open_dashboard_btn:  '📊 فتح لوحة التحكم',
  },
} as const

export type Strings = typeof strings.ru

export function i18n(lang: string | null | undefined): Strings {
  if (lang === 'en') return strings.en as unknown as Strings
  if (lang === 'ar') return strings.ar as unknown as Strings
  return strings.ru
}

export const LANG_BUTTONS = [
  { text: '🇷🇺 Русский', data: 'lang:ru' },
  { text: '🇬🇧 English', data: 'lang:en' },
  { text: '🇸🇦 العربية', data: 'lang:ar' },
] as const

export function languageLabel(lang: Language): string {
  return lang === 'en' ? '🇬🇧 English' : lang === 'ar' ? '🇸🇦 العربية' : '🇷🇺 Русский'
}

function dayWord(n: number): string {
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod100 >= 11 && mod100 <= 14) return 'дней'
  if (mod10 === 1) return 'день'
  if (mod10 >= 2 && mod10 <= 4) return 'дня'
  return 'дней'
}
