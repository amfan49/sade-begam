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
    todayLabel: "امروز",
    weekLabel: "هفته‌ی",
    updated: "آخرین به‌روزرسانی: شنبه",
    filterAll: "همه",
    searchPlaceholder: "جستجو در کشورها و موضوع‌ها…",
    sourceLabel: "منبع رسمی",
    nonProfitNotice: "این وب‌سایت صرفاً برای اطلاعات شخصی، به‌طور خصوصی اداره می‌شود و هدف تجاری ندارد.",
    officialBadge: "منبع رسمی تأییدشده",
    originalLabel: "متن اصلی",
    translationLabel: "ترجمه",
    contextLabel: "زمینه",
    noItems: "برای این بخش خبری موجود نیست.",
    sampleBadge: "داده‌ی نمونه — برای نمایش طراحی",
    footerNote: "ما خبر را می‌رسانیم. نتیجه‌گیری با شماست.",
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
      focus: "تمرکز ما بر ایران است."
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
    todayLabel: "Today",
    weekLabel: "Week",
    updated: "Last updated: Saturday",
    filterAll: "All",
    searchPlaceholder: "Search countries and topics…",
    sourceLabel: "Official source",
    nonProfitNotice: "This website is for personal information purposes only, is operated privately, and does not pursue any commercial interests.",
    officialBadge: "Verified Official Source",
    originalLabel: "Original",
    translationLabel: "Translation",
    contextLabel: "Context",
    noItems: "No items for this section.",
    sampleBadge: "Sample data — for design preview",
    footerNote: "We report the news. You draw the conclusions.",
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
      focus: "Our focus is Iran."
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

// "13 June" — Gregorian, English month, no year.
function sbGregorian(iso) {
  const [, m, d] = iso.split("-").map(Number);
  return `${d} ${SB_MONTHS_EN[m - 1]}`;
}

// "۲۳ خرداد" — Jalali, Persian digits + month name, no year.
function sbJalali(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  const j = sbToJalali(y, m, d);
  return `${sbPersianDigits(j.jd)} ${SB_JALALI_MONTHS[j.jm - 1]}`;
}

// "13 June · ۲۳ خرداد" — Gregorian + Persian (no year) side by side.
function sbBothDates(iso) {
  return `${sbGregorian(iso)} · ${sbJalali(iso)}`;
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
