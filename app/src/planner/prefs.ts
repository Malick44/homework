// Per-device conveniences only (last child picked, last subject used).
const KEY = 'home-lessons-prefs-v1';

export const prefs: { childId?: string; lastSubject?: string } = (() => {
  try { return JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch { return {}; }
})();

export function savePrefs() {
  try { localStorage.setItem(KEY, JSON.stringify(prefs)); } catch { /* storage blocked; not important */ }
}
