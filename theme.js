// ─── THEME MANAGER ────────────────────────────────────────
// Import this in every page: import './theme.js'
// Or add <script type="module" src="theme.js"></script>

const THEME_KEY = 'roomie-theme';

export function initTheme() {
  const saved = localStorage.getItem(THEME_KEY) || 'dark';
  applyTheme(saved);
}

export function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme') || 'dark';
  const next    = current === 'dark' ? 'light' : 'dark';
  applyTheme(next);
  localStorage.setItem(THEME_KEY, next);
  return next;
}

export function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  // Update all toggle buttons on the page
  document.querySelectorAll('.theme-toggle').forEach(btn => {
    btn.textContent = theme === 'dark' ? '☀️' : '🌙';
    btn.title = theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode';
  });
  // Update meta theme-color
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = theme === 'dark' ? '#0d0f14' : '#ffffff';
}

// Auto-init on load
initTheme();

