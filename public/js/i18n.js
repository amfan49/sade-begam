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
      focus: "تمرکز ما بر ایران است."
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
      focus: "Our focus is Iran."
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
