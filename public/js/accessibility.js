// ── Sade Begam — Accessibility (dark mode + font size) ────────────
// Runs immediately to prevent flash of wrong theme/size.
// Exposes: sbToggleTheme(), sbFontSizeChange(delta)

(function () {
  const html = document.documentElement;
  const theme = localStorage.getItem("sb_theme");
  if (theme === "dark") html.setAttribute("data-theme", "dark");
  const size = localStorage.getItem("sb_fontsize");
  if (size && size !== "normal") html.setAttribute("data-fontsize", size);
})();

function sbToggleTheme() {
  const html = document.documentElement;
  const isDark = html.getAttribute("data-theme") === "dark";
  if (isDark) html.removeAttribute("data-theme");
  else html.setAttribute("data-theme", "dark");
  localStorage.setItem("sb_theme", isDark ? "light" : "dark");
  _sbUpdateThemeBtn();
}

function _sbUpdateThemeBtn() {
  const btn = document.getElementById("sbThemeBtn");
  if (!btn) return;
  const isDark = document.documentElement.getAttribute("data-theme") === "dark";
  btn.textContent = isDark ? "☀️" : "🌙";
  btn.title = typeof T !== "undefined" ? (isDark ? T.lightMode : T.darkMode) : (isDark ? "Light" : "Dark");
}

const SB_FONT_SIZES = ["normal", "large", "xlarge"];

function sbFontSizeChange(delta) {
  const html = document.documentElement;
  const cur = html.getAttribute("data-fontsize") || "normal";
  const idx = SB_FONT_SIZES.indexOf(cur);
  const next = SB_FONT_SIZES[Math.max(0, Math.min(2, idx + delta))];
  if (next === "normal") html.removeAttribute("data-fontsize");
  else html.setAttribute("data-fontsize", next);
  localStorage.setItem("sb_fontsize", next);
}

// Inject the floating accessibility bar when DOM is ready.
function sbInitA11yBar() {
  const bar = document.createElement("div");
  bar.className = "sb-a11y-bar";
  bar.setAttribute("role", "toolbar");
  bar.setAttribute("aria-label", typeof T !== "undefined" ? T.a11yBar : "Accessibility");
  bar.innerHTML = `
    <button class="sb-a11y-btn" id="sbThemeBtn" onclick="sbToggleTheme()" title="">🌙</button>
    <button class="sb-a11y-btn" onclick="sbFontSizeChange(1)"  title="${typeof T !== "undefined" ? T.fontLarger  : "Larger"}" aria-label="${typeof T !== "undefined" ? T.fontLarger  : "Larger"}">A+</button>
    <button class="sb-a11y-btn" onclick="sbFontSizeChange(-1)" title="${typeof T !== "undefined" ? T.fontSmaller : "Smaller"}" aria-label="${typeof T !== "undefined" ? T.fontSmaller : "Smaller"}">A−</button>
  `;
  document.body.appendChild(bar);
  _sbUpdateThemeBtn();
}

function sbInitBurger() {
  const burger = document.getElementById("navBurger");
  if (!burger) return;
  const masthead = burger.closest(".masthead");

  function closeMenu() {
    masthead.classList.remove("nav-open");
    burger.setAttribute("aria-expanded", "false");
    burger.textContent = "☰";
  }

  burger.addEventListener("click", (e) => {
    e.stopPropagation();
    const isOpen = masthead.classList.toggle("nav-open");
    burger.setAttribute("aria-expanded", String(isOpen));
    burger.textContent = isOpen ? "✕" : "☰";
  });

  document.querySelectorAll(".nav__link").forEach((link) => {
    link.addEventListener("click", closeMenu);
  });

  document.addEventListener("click", (e) => {
    if (!e.target.closest(".masthead")) closeMenu();
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => { sbInitA11yBar(); sbInitBurger(); });
} else {
  sbInitA11yBar();
  sbInitBurger();
}
