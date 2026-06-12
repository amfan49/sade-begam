// ── Sade Begam — language handling ────────────────────────────────
// Auto-detects the visitor's language: Persian for Persian speakers,
// otherwise English. Visitors can switch manually (saved in localStorage).

const STRINGS = {
  fa: {
    dir: "rtl",
    htmlLang: "fa",
    brandName: "ساده بگم",
    tagline: "خبر رسمی. بدون فیلتر.",
    heroMain: "خبر رسمی.",
    heroAccent: " بدون فیلتر.",
    kicker: "رسانه‌ی مستقل فارسی‌زبان",
    navHome: "خانه",
    navAbout: "درباره",
    navNewsletter: "خبرنامه",
    weekLabel: "هفته‌ی",
    updated: "آخرین به‌روزرسانی: شنبه",
    filterAll: "همه",
    searchPlaceholder: "جستجو در کشورها و موضوع‌ها…",
    sourceLabel: "منبع رسمی",
    officialBadge: "منبع رسمی تأییدشده",
    originalLabel: "متن اصلی",
    translationLabel: "ترجمه",
    contextLabel: "زمینه",
    noItems: "برای این بخش خبری موجود نیست.",
    sampleBadge: "داده‌ی نمونه — برای نمایش طراحی",
    footerNote: "ما خبر را می‌رسانیم. نتیجه‌گیری با شماست.",
    rights: "© ۲۰۲۶ ساده بگم. همه‌ی حقوق محفوظ است.",
    about: {
      title: "درباره‌ی ساده بگم",
      lead: "ساده بگم یک رسانه‌ی مستقل فارسی‌زبان است. ما فقط خبرهای رسمی درباره‌ی ایران را بازتاب می‌دهیم — و هیچ چیز دیگر.",
      body: "ما تنها بیانیه‌های رسمی از منابع رسمی را منتشر می‌کنیم. بدون تحلیل، بدون تفسیر، بدون نظر شخصی، بدون هیچ افزوده‌ای. ما گزارش می‌دهیم؛ شما تصمیم می‌گیرید.",
      sourcesTitle: "منابع ما تنها این‌ها هستند:",
      sources: [
        "وب‌سایت‌های رسمی دولت‌ها",
        "وب‌سایت‌های رسمی سیاستمداران و وزارت‌خانه‌ها",
        "حساب‌های رسمی و تأییدشده‌ی ایکس (توییتر) سیاستمداران و مقام‌ها"
      ],
      focus: "تمرکز ما بر ایران است.",
      donateNote: "ساده بگم یک خدمت کاملاً رایگان است. ما، سازندگان، از آن سودی نمی‌بریم — هدف ما آگاهی است، نه پول. اگر مایلید، در ازای این خدمت به صلیب سرخ آلمان کمک کنید."
    },
    newsletter: {
      title: "خبرنامه",
      intro: "هفته‌ای یک‌بار، خبرهای رسمی درباره‌ی ایران — گردآوری‌شده، مستند و رایگان. ابتدا یک ایمیل تأیید می‌فرستیم؛ بدون رضایت شما چیزی ارسال نمی‌شود و هر زمان می‌توانید لغو اشتراک کنید.",
      emailLabel: "نشانی ایمیل",
      nameLabel: "نام (اختیاری)",
      signupBtn: "اشتراک در خبرنامه",
      requestTitle: "درخواست خبر ویژه",
      requestIntro: "می‌خواهید موضوع مشخصی درباره‌ی ایران را دنبال کنیم؟ دقیقاً بگویید چه می‌خواهید بدانید — ما منابع رسمی را بررسی و نتیجه را برایتان ایمیل می‌کنیم. این خدمت رایگان است؛ اگر مایلید، در ازای آن به صلیب سرخ آلمان کمک کنید.",
      requestTopicLabel: "موضوع / خواسته‌ی شما",
      requestTopicPlaceholder: "مثلاً بیانیه‌های رسمی درباره‌ی یک موضوع خاص…",
      requestBtn: "ارسال درخواست",
      formNote: "فقط پس از تأیید شما ایمیل می‌فرستیم. بدون هرزنامه."
    },
    donate: {
      title: "خدمت رایگان — حمایت از صلیب سرخ آلمان",
      body: "ساده بگم رایگان است و ما از آن سود نمی‌بریم. اگر کار ما برایتان ارزشمند است، به‌جای پرداخت به ما، لطفاً به صلیب سرخ آلمان کمک کنید. ۱۰۰٪ کمک به آن‌ها می‌رسد، نه به ما.",
      button: "کمک به صلیب سرخ آلمان",
      url: "https://www.drk.de/spenden/"
    },
    regions: {
      "North America": "آمریکای شمالی",
      "Europe": "اروپا",
      "Asia": "آسیا",
      "Middle East": "خاورمیانه",
      "Africa": "آفریقا",
      "South America": "آمریکای جنوبی",
      "Oceania": "اقیانوسیه",
      "International Bodies": "نهادهای بین‌المللی"
    }
  },
  en: {
    dir: "ltr",
    htmlLang: "en",
    brandName: "Sade Begam",
    tagline: "Official News. No Filter.",
    heroMain: "Official News.",
    heroAccent: " No Filter.",
    kicker: "Independent Persian News Media",
    navHome: "Home",
    navAbout: "About",
    navNewsletter: "Newsletter",
    weekLabel: "Week",
    updated: "Last updated: Saturday",
    filterAll: "All",
    searchPlaceholder: "Search countries and topics…",
    sourceLabel: "Official source",
    officialBadge: "Verified Official Source",
    originalLabel: "Original",
    translationLabel: "Translation",
    contextLabel: "Context",
    noItems: "No items for this section.",
    sampleBadge: "Sample data — for design preview",
    footerNote: "We report the news. You draw the conclusions.",
    rights: "© 2026 Sade Begam. All rights reserved.",
    about: {
      title: "About Sade Begam",
      lead: "Sade Begam is an independent Persian news media. We relay official news about Iran — and nothing else.",
      body: "We publish only official statements from official sources. No analysis, no interpretation, no opinion, nothing added. We report; you decide.",
      sourcesTitle: "Our sources are only:",
      sources: [
        "Official government websites",
        "Official websites of politicians and ministries",
        "Verified official X (Twitter) accounts of politicians and officials"
      ],
      focus: "Our focus is Iran.",
      donateNote: "Sade Begam is a completely free service. We, the creators, do not profit from it — our goal is awareness, not money. If you wish, support the German Red Cross in return for this service."
    },
    newsletter: {
      title: "Newsletter",
      intro: "Once a week, the official news about Iran — gathered, sourced, and free. We send a confirmation first; nothing is sent without your consent, and you can unsubscribe anytime.",
      emailLabel: "Email address",
      nameLabel: "Name (optional)",
      signupBtn: "Subscribe to the newsletter",
      requestTitle: "Request specific news",
      requestIntro: "Want us to follow a specific topic about Iran? Tell us exactly what you'd like to know — we research official sources and email the result to you. This service is free; if you wish, support the German Red Cross in return.",
      requestTopicLabel: "Your topic / wish",
      requestTopicPlaceholder: "e.g. official statements on a specific subject…",
      requestBtn: "Send my request",
      formNote: "We email you only after you confirm. No spam, ever."
    },
    donate: {
      title: "Free service — support the German Red Cross",
      body: "Sade Begam is free and we do not profit from it. If our work is valuable to you, instead of paying us, please support the German Red Cross. 100% goes to them, none to us.",
      button: "Donate to the German Red Cross",
      url: "https://www.drk.de/spenden/"
    },
    regions: {
      "North America": "North America",
      "Europe": "Europe",
      "Asia": "Asia",
      "Middle East": "Middle East",
      "Africa": "Africa",
      "South America": "South America",
      "Oceania": "Oceania",
      "International Bodies": "International Bodies"
    }
  }
};

function detectLang() {
  const saved = localStorage.getItem("sb_lang");
  if (saved && STRINGS[saved]) return saved;
  const params = new URLSearchParams(location.search);
  const q = params.get("lang");
  if (q && STRINGS[q]) return q;
  const nav = (navigator.language || "en").toLowerCase();
  return nav.startsWith("fa") ? "fa" : "en";
}

function setLang(lang) {
  localStorage.setItem("sb_lang", lang);
  location.reload();
}

const SB_LANG = detectLang();
const T = STRINGS[SB_LANG];
