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
    navOrders: "سفارش خبر",
    navArchive: "آرشیو",
    navChat: "چت هوشمند",
    todayLabel: "امروز",
    weekLabel: "هفته‌ی",
    lastUpdated: "آخرین به‌روزرسانی",
    filterAll: "همه",
    searchPlaceholder: "جستجو در کشورها و موضوع‌ها…",
    sourceLabel: "منبع رسمی",
    nonProfitNotice: "این وب‌سایت صرفاً برای اطلاعات شخصی، به‌طور خصوصی اداره می‌شود و هدف تجاری ندارد.",
    officialBadge: "منبع رسمی تأییدشده",
    originalLabel: "متن اصلی",
    translationLabel: "ترجمه",
    contextLabel: "زمینه",
    noItems: "برای این بخش خبری موجود نیست.",
    footerNote: "ما خبر را می‌رسانیم. نتیجه‌گیری با شماست.",
    closeDetail: "بستن",
    backToHome: "← بازگشت به خانه",
    viewSource: "مشاهده منبع رسمی ←",
    darkMode: "حالت تاریک",
    lightMode: "حالت روشن",
    fontLarger: "بزرگ‌تر",
    fontSmaller: "کوچک‌تر",
    a11yBar: "دسترس‌پذیری",
    aiChat: {
      botName:     "بگم‌بات",
      botStatus:   "آنلاین · دستیار هوشمند",
      placeholder: "پیامتان را بنویسید…",
      greeting:    "سلام! 👋 من بگم‌بات هستم — دستیار هوشمند سایت «ساده بگم».\n\nمی‌توانید درباره اخبار رسمی ایران بپرسید، وضعیت اشتراک را بررسی کنید، یا اطلاعات تماس خود را ثبت کنید.",
      error:       "متأسفانه خطایی رخ داد. لطفاً دوباره تلاش کنید."
    },
    chat: {
      title: "ساده بگم — چت و جستجو",
      open: "باز کردن چت",
      close: "بستن",
      placeholder: "موضوع را جستجو کنید…",
      send: "ارسال",
      micHint: "ورودی صوتی",
      readNews: "خواندن اخبار با صدا",
      greeting: "!سلام! به ساده بگم خوش آمدید",
      greetBack: "!سلام! چه موضوعی را جستجو می‌کنید؟",
      helpHint: "یک موضوع تایپ کنید تا در اخبار جستجو شود. «کمک» بنویسید برای راهنما.",
      helpText: "<b>دستورات:</b><br>• هر موضوعی (مثلاً «هسته‌ای») — جستجو در اخبار<br>• <b>خبرنامه</b> — اشتراک<br>• <b>تماس</b> — فرم تماس<br>• <b>بخوان</b> — خواندن اخبار با صدا<br>• <b>توقف</b> — توقف صدا",
      newsletterReply: "برای اشتراک در خبرنامه:",
      contactReply: "برای ارتباط و سفارش خبر:",
      contactLink: "سفارش خبر",
      noLocalData: "داده‌ای در حافظه نیست. جستجو در توییتر:",
      noResults: "نتیجه‌ای برای «{q}» پیدا نشد. در توییتر جستجو کنید:",
      found: "{n} نتیجه یافت شد:",
      moreResults: "+{n} نتیجه‌ی دیگر. جستجوی دقیق‌تر را امتحان کنید.",
      source: "منبع رسمی",
      twitterTip: "جستجوی گسترده‌تر در توییتر:",
      twitterSearch: "جستجوی «{q}» در توییتر",
      readingNews: "در حال خواندن اخبار…",
      noNewsToRead: "خبری برای خواندن موجود نیست.",
      stopped: "متوقف شد.",
      ttsNotSupported: "متأسفانه مرورگر شما از خواندن متن پشتیبانی نمی‌کند.",
      sttNotSupported: "ورودی صوتی در این مرورگر پشتیبانی نمی‌شود. لطفاً از Chrome استفاده کنید."
    },
    trModalTitle: "ترجمه‌ی فارسی",
    trModalClose: "بستن ×",
    trModalSource: "مشاهده منبع اصلی ←",
    trModalDisclaimer: "این ترجمه توسط هوش مصنوعی تولید شده است. برای اطلاعات دقیق، به منبع اصلی مراجعه کنید.",
    autoRefreshNotice: "اخبار هر ۵ دقیقه به‌روز می‌شوند.",
    translationDisclaimer: "این ترجمه توسط هوش مصنوعی تولید شده است. این وب‌سایت تولید کننده محتوای خبری نیست؛ این محتوا را فقط از منابع رسمی جمع‌آوری می‌کند. این وب‌سایت هیچ مسئولیتی در قبال دقت یا محتوای منابع ندارد.",
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
      officialFeedsTitle: "فیدهای RSS رسمی که پایش می‌شوند"
    },
    newsletter: {
      title: "خبرنامه",
      intro: "هفته‌ای یک‌بار، خبرهای رسمی درباره‌ی ایران — گردآوری‌شده، مستند و رایگان. ابتدا یک ایمیل تأیید می‌فرستیم؛ بدون رضایت شما چیزی ارسال نمی‌شود و هر زمان می‌توانید لغو اشتراک کنید.",
      emailLabel: "نشانی ایمیل",
      signupBtn: "اشتراک در خبرنامه",
      formNote: "فقط پس از تأیید شما ایمیل می‌فرستیم. بدون هرزنامه.",
      confirmTitle: "یک گام دیگر باقی مانده ✉️",
      confirmBody: "برای تکمیل اشتراک، ایمیل تأییدی را که برایتان باز می‌شود ارسال کنید. تا وقتی روی پیوند تأیید کلیک نکنید، هیچ خبرنامه‌ای دریافت نخواهید کرد (تأیید دو‌مرحله‌ای).",
      confirmAgain: "ثبت ایمیلی دیگر"
    },
    orders: {
      title: "سفارش خبر ویژه",
      intro: "می‌خواهید روی موضوعِ مشخصی درباره‌ی ایران تمرکز کنیم؟ این یک سرویس ویژه است. درخواست خود را دقیق بنویسید — ما منابع رسمی را بررسی و نتیجه را برایتان ایمیل می‌کنیم.",
      nameLabel: "نام",
      emailLabel: "نشانی ایمیل",
      focusLabel: "موضوع یا تمرکز دقیق شما",
      focusPlaceholder: "مثلاً یک موضوع، رویداد یا منطقه‌ی مشخص درباره‌ی ایران…",
      submitBtn: "ثبت درخواست",
      note: "این یک سرویس ویژه است. فعلاً هیچ پرداختی فعال نیست؛ پس از ثبت با شما هماهنگ می‌کنیم.",
      sourceNote: "از آنجایی که روزنامه‌نگاران مستقل و آمار رسمی در دسترس نیستند، ما کاملاً بر منابع اینترنتی موجود متکی هستیم. ارسال درخواست تضمینی برای تکمیل نیست؛ ما امکان‌پذیری آن را بررسی می‌کنیم. ما از کمک‌های مالی کوچک استقبال می‌کنیم.",
      supportNote: "پیشنهاد مالی فقط برای اشخاص خارج از ایران."
    },
    archive: {
      title: "آرشیو خبرها",
      intro: "همه‌ی خبرهای رسمی منتشرشده را بر اساس بازه‌ی زمانی مرور کنید.",
      groupBy: "گروه‌بندی بر اساس:",
      day: "روز",
      week: "هفته",
      month: "ماه",
      year: "سال",
      empty: "هنوز خبری در آرشیو نیست.",
      count: "خبر"
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
    navOrders: "Orders",
    navArchive: "Archive",
    navChat: "AI Chat",
    todayLabel: "Today",
    weekLabel: "Week",
    lastUpdated: "Last updated",
    filterAll: "All",
    searchPlaceholder: "Search countries and topics…",
    sourceLabel: "Official source",
    nonProfitNotice: "This website is for personal information purposes only, is operated privately, and does not pursue any commercial interests.",
    officialBadge: "Verified Official Source",
    originalLabel: "Original",
    translationLabel: "Translation",
    contextLabel: "Context",
    noItems: "No items for this section.",
    footerNote: "We report the news. You draw the conclusions.",
    closeDetail: "Close",
    backToHome: "← Back to Home",
    viewSource: "View Official Source →",
    darkMode: "Dark mode",
    lightMode: "Light mode",
    fontLarger: "Larger text",
    fontSmaller: "Smaller text",
    a11yBar: "Accessibility",
    aiChat: {
      botName:     "SaBot",
      botStatus:   "Online · AI Assistant",
      placeholder: "Type your message…",
      greeting:    "Hello! 👋 I'm SaBot — the AI assistant for Sade Begam.\n\nYou can ask me about official news on Iran, check your subscription status, or register your contact information.",
      error:       "Sorry, an error occurred. Please try again."
    },
    chat: {
      title: "Sade Begam — Chat & Search",
      open: "Open chat",
      close: "Close",
      placeholder: "Search a topic…",
      send: "Send",
      micHint: "Voice input",
      readNews: "Read news aloud",
      greeting: "Welcome to Sade Begam!",
      greetBack: "Hello! What topic are you searching for?",
      helpHint: "Type a topic to search news. Type 'help' for commands.",
      helpText: "<b>Commands:</b><br>• Any topic (e.g. 'nuclear') — search news<br>• <b>newsletter</b> — subscribe<br>• <b>contact</b> — contact form<br>• <b>read news</b> — listen to news<br>• <b>stop</b> — stop audio",
      newsletterReply: "Subscribe to the newsletter:",
      contactReply: "Contact or order specific news:",
      contactLink: "Order news",
      noLocalData: "No local news data. Search on Twitter:",
      noResults: "No results for “{q}”. Search on Twitter:",
      found: "{n} result(s):",
      moreResults: "+{n} more results. Try a more specific search.",
      source: "Official Source",
      twitterTip: "Broader search on Twitter:",
      twitterSearch: "Search \"{q}\" on Twitter",
      readingNews: "Reading news aloud…",
      noNewsToRead: "No news loaded yet.",
      stopped: "Stopped.",
      ttsNotSupported: "Sorry, your browser does not support text-to-speech.",
      sttNotSupported: "Voice input is not supported in this browser. Please use Chrome."
    },
    trModalTitle: "Persian Translation",
    trModalClose: "Close ×",
    trModalSource: "View Original Source →",
    trModalDisclaimer: "AI-generated translation. For accurate information, refer to the original source.",
    autoRefreshNotice: "News refreshes every 5 minutes.",
    translationDisclaimer: "This translation is AI-generated. This website is not the producer of the news content; it only aggregates news from official sources. This website bears no responsibility for the accuracy or content of the sources.",
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
      officialFeedsTitle: "Monitored Official RSS Feeds"
    },
    newsletter: {
      title: "Newsletter",
      intro: "Once a week, the official news about Iran — gathered, sourced, and free. We send a confirmation first; nothing is sent without your consent, and you can unsubscribe anytime.",
      emailLabel: "Email address",
      signupBtn: "Subscribe to the newsletter",
      formNote: "We email you only after you confirm. No spam, ever.",
      confirmTitle: "One more step ✉️",
      confirmBody: "To complete your subscription, please send the confirmation email that just opened. You won't receive any newsletter until you confirm (double opt-in).",
      confirmAgain: "Use a different email"
    },
    orders: {
      title: "Request specific news",
      intro: "Want us to focus on a specific topic about Iran? This is a special service. Describe exactly what you want — we research official sources and email the result to you.",
      nameLabel: "Name",
      emailLabel: "Email address",
      focusLabel: "Your exact topic or focus",
      focusPlaceholder: "e.g. a specific subject, event, or region about Iran…",
      submitBtn: "Submit request",
      note: "This is a special service. No payment is active yet; we'll coordinate with you after you submit.",
      sourceNote: "Due to the lack of independent journalists and official statistics, we rely exclusively on available Internet sources. Submission does not guarantee fulfillment; we review feasibility. We welcome small financial contributions.",
      supportNote: "Financial support suggestions are for persons outside Iran only."
    },
    archive: {
      title: "News archive",
      intro: "Browse all published official news by time period.",
      groupBy: "Group by:",
      day: "Day",
      week: "Week",
      month: "Month",
      year: "Year",
      empty: "Nothing in the archive yet.",
      count: "item(s)"
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

// ── Shared date helpers (available to every page) ─────────────────
// Gregorian months are always shown in English (e.g. "13 June").
// The Persian (Jalali) date is always shown WITHOUT the year (e.g. "۲۳ خرداد").
const SB_MONTHS_EN = ["January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"];
// Gregorian months as Iranians write them in Persian (for the Persian page).
const SB_MONTHS_FA = ["ژانویه", "فوریه", "مارس", "آوریل", "مه", "ژوئن",
  "ژوئیه", "اوت", "سپتامبر", "اکتبر", "نوامبر", "دسامبر"];
const SB_JALALI_MONTHS = ["فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور",
  "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند"];

function sbPersianDigits(s) {
  return String(s).replace(/[0-9]/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[d]);
}

// Gregorian → Jalali (canonical jalaali-js algorithm). Returns { jy, jm, jd }
// with jd as the real day-of-month.
function sbToJalali(gy, gm, gd) {
  const gdm = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
  const gy2 = gm > 2 ? gy + 1 : gy;
  let days = 355666 + 365 * gy + Math.floor((gy2 + 3) / 4) - Math.floor((gy2 + 99) / 100) +
    Math.floor((gy2 + 399) / 400) + gd + gdm[gm - 1];
  let jy = -1595 + 33 * Math.floor(days / 12053);
  days %= 12053;
  jy += 4 * Math.floor(days / 1461);
  days %= 1461;
  if (days > 365) {
    jy += Math.floor((days - 1) / 365);
    days = (days - 1) % 365;
  }
  const jm = days < 186 ? 1 + Math.floor(days / 31) : 7 + Math.floor((days - 186) / 30);
  const jd = 1 + (days < 186 ? days % 31 : (days - 186) % 30);
  return { jy, jm, jd };
}

// "13 June" — Gregorian, English month, no year (English page).
function sbGregorian(iso) {
  const [, m, d] = iso.split("-").map(Number);
  return `${d} ${SB_MONTHS_EN[m - 1]}`;
}

// "۱۳ ژوئن" — Gregorian in Persian words + Persian digits (Persian page).
function sbGregorianFa(iso) {
  const [, m, d] = iso.split("-").map(Number);
  return `${sbPersianDigits(d)} ${SB_MONTHS_FA[m - 1]}`;
}

// "۲۳ خرداد" — Jalali, Persian digits + month name, no year.
function sbJalali(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  const j = sbToJalali(y, m, d);
  return `${sbPersianDigits(j.jd)} ${SB_JALALI_MONTHS[j.jm - 1]}`;
}

// Date for the current language, one line, single script:
//   • Persian page: Jalali date + Gregorian date, both in Persian
//     (e.g. "۲۳ خرداد · ۱۳ ژوئن") — Iranian date first.
//   • English page: just the Gregorian date (e.g. "13 June").
function sbBothDates(iso) {
  if (SB_LANG === "fa") return `${sbJalali(iso)} · ${sbGregorianFa(iso)}`;
  return sbGregorian(iso);
}

function sbTodayIso() {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}-${String(n.getDate()).padStart(2, "0")}`;
}

// Fills the shared footer bits (today's date in both calendars + the
// non-profit / imprint notice) on every page that includes them.
function sbRenderCommonFooter() {
  const today = document.getElementById("todayDate");
  if (today) today.textContent = `${T.todayLabel}: ${sbBothDates(sbTodayIso())}`;
  const np = document.getElementById("nonProfitFooter");
  if (np) np.textContent = T.nonProfitNotice;
}
