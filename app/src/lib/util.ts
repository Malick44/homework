import type { Lesson, Named, Rating, Status, Step } from './types';

export const PALETTE = ['#2F6FDE', '#16A06B', '#F28C28', '#D64A7A', '#7B55D9', '#0F9BAE', '#B98A00', '#8A6240'];
export const KID_COLORS = ['#7B55D9', '#16A06B', '#F28C28', '#2F6FDE', '#D64A7A', '#0F9BAE'];
export const OTHER: Named = { id: '', name: 'Other', color: '#8A94A6', order: 0 };
export const SUGGESTED = ['Reading', 'Writing', 'Math', 'Science', 'History', 'Art', 'Music', 'PE'];
export const RATINGS: Record<number, string> = { 1: 'Needs practice', 2: 'Getting there', 3: 'Got it' };
export const REF_SUNDAY = new Date(2024, 0, 7);

export const pad = (n: number) => String(n).padStart(2, '0');
export const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const parseYmd = (s: string) => { const [y, m, d] = String(s).split('-').map(Number); return new Date(y, (m || 1) - 1, d || 1); };
export const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
export const todayStr = () => ymd(new Date());
export const startOfWeek = (d: Date, ws: number) => addDays(d, -((d.getDay() - ws + 7) % 7));
export const weekStartDate = (offset: number, ws: number) => addDays(startOfWeek(parseYmd(todayStr()), ws), offset * 7);
export const fmtD = (d: Date, o: Intl.DateTimeFormatOptions) => d.toLocaleDateString(undefined, o);
export const num = (v: unknown, d: number) => (typeof v === 'number' && isFinite(v) ? v : d);
export const plural = (n: number, w: string, pl?: string) => `${n} ${n === 1 ? w : pl || w + 's'}`;
export const initial = (name: string) => (Array.from(String(name).trim())[0] || '?').toUpperCase();
export const cmpStr = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);
export const byCreated = (a: Lesson, b: Lesson) => a.createdAt - b.createdAt || cmpStr(a.title, b.title);
export const newId = () => crypto.randomUUID();

export function clampInt(v: unknown, lo: number, hi: number, dflt: number) {
  if (v === '' || v == null) return dflt;
  const n = Math.round(Number(v));
  return isFinite(n) ? Math.min(hi, Math.max(lo, n)) : dflt;
}
export function fmtMin(m: number) {
  m = Math.max(0, Math.round(m || 0));
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60), r = m % 60;
  return r ? `${h} hr ${r} min` : `${h} hr`;
}
export const shortMin = (m: number) => (m >= 60 ? (m / 60).toFixed(1).replace(/\.0$/, '') + ' hr' : Math.round(m) + ' min');
export function rotFor(id: string) { let h = 0; for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0; return (Math.abs(h) % 17) - 8; }

export function dayLabel(s: string, lower?: boolean) {
  if (!s) return lower ? 'no day' : 'No day';
  const t = parseYmd(todayStr());
  const rel = s === ymd(t) ? 'Today' : s === ymd(addDays(t, 1)) ? 'Tomorrow' : s === ymd(addDays(t, -1)) ? 'Yesterday' : '';
  if (rel) return lower ? rel.toLowerCase() : rel;
  const d = parseYmd(s);
  return fmtD(d, d.getFullYear() === t.getFullYear() ? { weekday: 'short', month: 'short', day: 'numeric' } : { month: 'short', day: 'numeric', year: 'numeric' });
}

export function defaultWeekStart(): 0 | 1 {
  const lang = String(navigator.language || 'en-US').split('@')[0];
  try {
    const loc = new Intl.Locale(lang) as Intl.Locale & { getWeekInfo?: () => { firstDay: number }; weekInfo?: { firstDay: number } };
    const info = typeof loc.getWeekInfo === 'function' ? loc.getWeekInfo() : loc.weekInfo;
    if (info && info.firstDay) return info.firstDay === 1 ? 1 : 0;
  } catch { /* fall through */ }
  return /^en(-US|-CA)?$|-(US|CA|MX|BR|JP|IL|PH|KR|TW)$/i.test(lang) ? 0 : 1;
}

export function repeatDates(baseStr: string, days: number[], weeks: number, ws: number) {
  const base = parseYmd(baseStr);
  const wk0 = startOfWeek(base, ws);
  const out: string[] = [];
  for (let w = 0; w < weeks; w++) {
    for (let i = 0; i < 7; i++) {
      const d = addDays(wk0, w * 7 + i);
      if (d >= base && days.includes(d.getDay())) out.push(ymd(d));
    }
  }
  return out;
}

export const parseSteps = (text: string): Step[] => String(text || '').split('\n').map((s) => s.trim()).filter(Boolean).map((t) => ({ t, d: false }));
export function mergeSteps(prev: Step[], text: string): Step[] {
  const pool = prev.slice();
  return parseSteps(text).map((s) => {
    const i = pool.findIndex((p) => p.t === s.t);
    if (i >= 0) { const d = pool[i].d; pool.splice(i, 1); return { t: s.t, d }; }
    return s;
  });
}

export function newLesson(f: Partial<Lesson> & { childId: string; title: string }): Lesson {
  const now = Date.now();
  return {
    subjectId: '', skill: '', date: '', minutes: 20, plan: '', steps: [],
    status: 'planned', rating: 0, spent: 0, note: '', doneAt: '',
    ...f,
    id: newId(), createdAt: f.createdAt || now, updatedAt: now,
  };
}
/** Bump updatedAt so it is strictly newer than prev (for last-write-wins across devices). */
export const stamp = (next: Lesson, prev?: { updatedAt: number } | null): Lesson => ({ ...next, updatedAt: Math.max(Date.now(), ((prev && prev.updatedAt) || 0) + 1) });

export const sortNamed = <T extends Named>(list: T[]) => list.slice().sort((a, b) => a.order - b.order || cmpStr(a.name, b.name));
export const statusLabel: Record<Status, string> = { planned: 'Planned', done: 'Done', skipped: 'Skipped' };
export const ratingOf = (r: number): Rating => ([1, 2, 3].includes(r) ? r : 0) as Rating;
