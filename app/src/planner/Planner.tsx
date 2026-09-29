import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePlannerData } from '../lib/store';
import { downloadLessonsCsv } from '../lib/csv';
import type { Lesson, View } from '../lib/types';
import { addDays, defaultWeekStart, initial, newId, num, OTHER, PALETTE, sortNamed, stamp, todayStr, weekStartDate, ymd } from '../lib/util';
import { Icon, type IconName } from '../components/Icon';
import { Sticker } from '../components/Sticker';
import { cv, PlannerContext, type Ctx, type PlannerApi, type SheetState, type ToastAction, type Ui } from './context';
import { prefs, savePrefs } from './prefs';
import { Onboarding } from './Onboarding';
import { LessonsView, ProgressView, TodayView, WeekView } from './views';
import { SheetHost } from './sheets';

const NAV: { id: View; label: string; icon: IconName }[] = [
  { id: 'today', label: 'Today', icon: 'today' },
  { id: 'week', label: 'Week', icon: 'week' },
  { id: 'lessons', label: 'Lessons', icon: 'book' },
  { id: 'progress', label: 'Progress', icon: 'star' },
];

function useToday() {
  const [today, setToday] = useState(todayStr);
  useEffect(() => {
    const check = () => setToday(todayStr());
    const id = setInterval(check, 60000);
    document.addEventListener('visibilitychange', check);
    return () => { clearInterval(id); document.removeEventListener('visibilitychange', check); };
  }, []);
  return today;
}

interface ToastState { msg: string; action?: ToastAction; shown: boolean }

export function Planner({ userId, email, signOut }: { userId: string; email: string; signOut: () => void }) {
  // ---- Toast ----
  const [toast, setToast] = useState<ToastState>({ msg: '', shown: false });
  const toastTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const hideToast = useCallback(() => { clearTimeout(toastTimer.current); setToast((t) => ({ ...t, action: undefined, shown: false })); }, []);
  const showToast = useCallback((msg: string, action?: ToastAction) => {
    setToast({ msg, action, shown: true });
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast((t) => ({ ...t, action: undefined, shown: false })), action ? 6500 : 3200);
  }, []);

  const data = usePlannerData(userId, showToast);
  const today = useToday();

  // ---- UI state ----
  const [ui, setUiState] = useState<Ui>({
    view: 'today', childId: prefs.childId || null, weekOffset: 0,
    filter: { status: 'upcoming', subject: 'all', q: '' },
    listLimit: 150, range: 28, showAllSkills: false, showAllNotes: false, justStuck: null,
  });
  const setUi = useCallback((patch: Partial<Ui>) => setUiState((u) => ({ ...u, ...patch })), []);

  // ---- Derived context ----
  const ctx: Ctx = useMemo(() => {
    const kids = sortNamed(Array.from(data.children.values()));
    const subjects = sortNamed(Array.from(data.subjects.values()));
    const child = kids.find((k) => k.id === ui.childId) || kids[0] || null;
    const ws = data.settings.weekStart === 0 || data.settings.weekStart === 1 ? data.settings.weekStart : defaultWeekStart();
    const all = Array.from(data.lessons.values());
    return {
      child, kids, subjects, today, ws,
      sub: (id: string) => data.subjects.get(id) || OTHER,
      lessons: child ? all.filter((l) => l.childId === child.id) : [],
    };
  }, [data.children, data.subjects, data.settings, data.lessons, ui.childId, today]);

  // ---- Sheets ----
  const [sheet, setSheet] = useState<{ s: SheetState; key: number } | null>(null);
  const sheetReturn = useRef<HTMLElement | null>(null);
  const openSheet = useCallback((s: SheetState) => {
    setSheet((cur) => {
      if (!cur) { sheetReturn.current = document.activeElement as HTMLElement | null; hideToast(); }
      return { s, key: (cur?.key || 0) + 1 };
    });
  }, [hideToast]);
  const closeSheet = useCallback(() => {
    setSheet(null);
    const el = sheetReturn.current;
    sheetReturn.current = null;
    if (el && el.isConnected) setTimeout(() => el.focus({ preventScroll: true }), 0);
  }, []);
  useEffect(() => {
    document.documentElement.classList.toggle('has-sheet', !!sheet);
  }, [sheet]);

  // ---- Focus the heading after navigating ----
  const focusHeading = useRef(false);
  const nav = useCallback((v: View) => {
    setUi({ view: v, listLimit: 150 });
    window.scrollTo(0, 0);
    focusHeading.current = true;
  }, [setUi]);
  useEffect(() => {
    if (!focusHeading.current) return;
    focusHeading.current = false;
    document.querySelector<HTMLElement>('main h1')?.focus({ preventScroll: true });
  });

  // ---- Actions ----
  const { lessons, subjects, commitLessons, saveNamed } = data;
  const getLesson = useCallback((id: string) => lessons.get(id) || null, [lessons]);
  const updateLesson = useCallback((l: Lesson, patch: Partial<Lesson>) => {
    commitLessons([{ id: l.id, next: stamp({ ...l, ...patch }, l) }]);
  }, [commitLessons]);
  const addSubject = useCallback((name: string) => {
    const subs = Array.from(subjects.values());
    const existing = subs.find((s) => s.name.toLowerCase() === name.toLowerCase());
    if (existing) return existing.id;
    const used = new Set(subs.map((s) => s.color));
    const id = newId();
    saveNamed('subjects', [{
      id, name,
      color: PALETTE.find((c) => !used.has(c)) || PALETTE[subs.length % PALETTE.length],
      order: subs.length ? Math.max(...subs.map((s) => num(s.order, 0))) + 1 : 0,
    }]).catch(() => {});
    return id;
  }, [subjects, saveNamed]);
  const exportCsv = useCallback(() => {
    if (ctx.child) downloadLessonsCsv(ctx.child, ctx.lessons, ctx.sub);
  }, [ctx]);

  const api: PlannerApi = {
    data, ctx, ui, setUi, nav, openSheet, closeSheet, showToast, getLesson, updateLesson, addSubject, exportCsv, email, signOut,
  };

  const pickChild = (id: string) => { setUi({ childId: id }); prefs.childId = id; savePrefs(); };
  const addLesson = () => {
    let date: string;
    if (ui.view === 'week') {
      // Default to today if it's in the week on screen, else that week's first day.
      const start = weekStartDate(ui.weekOffset, ctx.ws);
      const s0 = ymd(start), s6 = ymd(addDays(start, 6));
      date = today >= s0 && today <= s6 ? today : s0;
    } else if (ui.view === 'lessons' && ui.filter.status === 'unscheduled') date = '';
    else date = today;
    const subjectId = ui.view === 'lessons' && ui.filter.subject !== 'all' ? ui.filter.subject : undefined;
    openSheet({ type: 'edit', init: { date, subjectId } });
  };

  let body;
  if (!data.loaded) {
    body = (
      <div className="loading" role="status">
        <div className="loading-slots" aria-hidden="true"><span className="slot" /><span className="slot" /><span className="slot" /></div>
        <p>Opening your planner…</p>
      </div>
    );
  } else if (!ctx.kids.length) {
    body = <Onboarding onDone={(kidId) => { setUi({ childId: kidId, view: 'today' }); prefs.childId = kidId; savePrefs(); focusHeading.current = true; }} />;
  } else {
    const View = { today: TodayView, week: WeekView, lessons: LessonsView, progress: ProgressView }[ui.view];
    const learners = (compact: boolean) => {
      const cls = compact ? 'learners compact' : 'learners';
      if (ctx.kids.length === 1) {
        const k = ctx.kids[0];
        return <div className={cls}><span className="learner is-on"><span className="avatar" style={cv(k.color)} aria-hidden="true">{initial(k.name)}</span><span className="learner-name">{k.name}</span></span></div>;
      }
      return (
        <div className={cls} role="group" aria-label="Choose a learner">
          {ctx.kids.map((k) => (
            <button key={k.id} className="learner" aria-pressed={ctx.child?.id === k.id} onClick={() => pickChild(k.id)}>
              <span className="avatar" style={cv(k.color)} aria-hidden="true">{initial(k.name)}</span><span className="learner-name">{k.name}</span>
            </button>
          ))}
        </div>
      );
    };
    body = (
      <>
        <div className="app">
          <aside className="rail" aria-label="Planner">
            <div className="brand"><Sticker color="#2F6FDE" rating={3} size={30} rot={-8} hidden /><span>Home Lessons</span></div>
            {learners(false)}
            <nav className="nav" aria-label="Views">
              {NAV.map((n) => (
                <button key={n.id} className="nav-item" aria-current={ui.view === n.id ? 'page' : undefined} onClick={() => nav(n.id)}>
                  <Icon name={n.icon} /><span className="nav-label">{n.label}</span>
                </button>
              ))}
            </nav>
            <button className="btn primary add-btn" onClick={addLesson}><Icon name="plus" size={20} />Add lesson</button>
            <div className="rail-foot">
              <button className="nav-item" onClick={() => openSheet({ type: 'settings' })}><Icon name="settings" /><span className="nav-label">Settings</span></button>
              <p className="small muted">Saved to your account</p>
            </div>
          </aside>
          <div className="col">
            <header className="topbar">
              {learners(true)}
              <div className="topbar-actions">
                <button className="btn primary small" onClick={addLesson}><Icon name="plus" size={18} />Add</button>
                <button className="icon-btn" aria-label="Settings" onClick={() => openSheet({ type: 'settings' })}><Icon name="settings" /></button>
              </div>
            </header>
            <main id="main"><View /></main>
          </div>
        </div>
        <nav className="tabs" aria-label="Views">
          {NAV.map((n) => (
            <button key={n.id} className="tab" aria-current={ui.view === n.id ? 'page' : undefined} onClick={() => nav(n.id)}>
              <Icon name={n.icon} /><span>{n.label}</span>
            </button>
          ))}
        </nav>
      </>
    );
  }

  return (
    <PlannerContext.Provider value={api}>
      <div id="app">{body}</div>
      <SheetHost sheet={sheet} />
      <div id="toast" role="status" aria-live="polite" className={toast.shown ? 'is-shown' : ''}>
        <span>{toast.msg}</span>
        {toast.action && (
          <button onClick={() => { const a = toast.action; hideToast(); a?.fn(); }}>{toast.action.label}</button>
        )}
      </div>
    </PlannerContext.Provider>
  );
}
