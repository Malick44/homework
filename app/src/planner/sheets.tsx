import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import type { Lesson, Named } from '../lib/types';
import {
  addDays, clampInt, dayLabel, fmtD, fmtMin, initial, KID_COLORS, mergeSteps, newLesson, num, PALETTE, parseSteps, parseYmd,
  plural, RATINGS, REF_SUNDAY, repeatDates, rotFor, stamp, ymd,
} from '../lib/util';
import { Icon } from '../components/Icon';
import { Sticker } from '../components/Sticker';
import { cv, usePlanner, type ConfirmInit, type EditInit, type SheetState } from './context';
import { prefs, savePrefs } from './prefs';
import { WRITING_GRADE3 } from '../lib/plans/writing-grade3';

const Dot = ({ color }: { color: string }) => <i className="dot" style={cv(color)} />;
const onEnter = (fn: () => void) => (e: KeyboardEvent) => { if (e.key === 'Enter' && !e.nativeEvent.isComposing) { e.preventDefault(); fn(); } };

// ---------- Host: scrim, panel, focus trap, Escape ----------

export function SheetHost({ sheet }: { sheet: { s: SheetState; key: number } | null }) {
  const { closeSheet } = usePlanner();
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!sheet) return;
    const p = panel.current;
    if (!p) return;
    p.scrollTop = 0;
    (p.querySelector<HTMLElement>('[data-autofocus]') || p).focus({ preventScroll: true });
  }, [sheet?.key]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!sheet) return <div id="sheet-root" hidden />;
  const s = sheet.s;

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') { e.preventDefault(); closeSheet(); return; }
    if (e.key !== 'Tab' || !panel.current) return;
    const f = Array.from(panel.current.querySelectorAll<HTMLElement>('button, input, textarea, select, [href]'))
      .filter((x) => !(x as HTMLButtonElement).disabled && x.offsetParent !== null);
    if (!f.length) return;
    const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && (document.activeElement === first || document.activeElement === panel.current)) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  };

  let body: ReactNode;
  if (s.type === 'detail') body = <DetailSheet id={s.id} />;
  else if (s.type === 'complete') body = <CompleteSheet id={s.id} />;
  else if (s.type === 'edit') body = <EditSheet init={s.init} />;
  else if (s.type === 'settings') body = <SettingsSheet />;
  else body = <ConfirmSheet {...s} />;

  return (
    <div id="sheet-root" onKeyDown={onKeyDown}>
      <div className="scrim" onClick={closeSheet} />
      <div key={sheet.key} ref={panel} className="sheet enter" role="dialog" aria-modal="true" aria-labelledby="sheet-title" tabIndex={-1}>
        <button className="icon-btn sheet-close" aria-label="Close" onClick={closeSheet}><Icon name="close" /></button>
        {body}
      </div>
    </div>
  );
}

/** Close the sheet if the lesson it shows disappears (deleted here or on another device). */
function useLessonOrClose(id: string) {
  const { getLesson, closeSheet } = usePlanner();
  const l = getLesson(id);
  useEffect(() => { if (!l) closeSheet(); }, [l, closeSheet]);
  return l;
}

// ---------- Detail ----------

function DetailSheet({ id }: { id: string }) {
  const { ctx, openSheet, closeSheet, updateLesson, showToast } = usePlanner();
  const l = useLessonOrClose(id);
  if (!l) return null;
  const sub = ctx.sub(l.subjectId);
  const when = l.date ? fmtD(parseYmd(l.date), { weekday: 'long', month: 'long', day: 'numeric' }) : 'No day set yet';
  const complete = () => openSheet({ type: 'complete', id: l.id });
  const edit = () => openSheet({ type: 'edit', init: { id: l.id } });

  let actions: ReactNode;
  if (l.status === 'planned') {
    actions = (<>
      <button className="btn primary" data-autofocus onClick={complete}><Icon name="check" />Mark done</button>
      {l.date !== ctx.today && <button className="btn" onClick={() => { updateLesson(l, { date: ctx.today }); showToast('Moved to today'); }}>Move to today</button>}
      <button className="btn" onClick={edit}>Edit</button>
      <button className="btn quiet" onClick={() => {
        closeSheet();
        updateLesson(l, { status: 'skipped' });
        showToast('Lesson skipped', { label: 'Undo', fn: () => updateLesson({ ...l, status: 'skipped', updatedAt: l.updatedAt + 1 }, { status: 'planned' }) });
      }}>Skip</button>
    </>);
  } else if (l.status === 'done') {
    actions = (<>
      <button className="btn primary" data-autofocus onClick={complete}>Change sticker</button>
      <button className="btn" onClick={edit}>Edit lesson</button>
      <button className="btn quiet" onClick={() => { updateLesson(l, { status: 'planned', rating: 0, spent: 0, doneAt: '' }); showToast('Marked as not done'); }}>Mark not done</button>
    </>);
  } else {
    actions = (<>
      <button className="btn primary" data-autofocus onClick={() => updateLesson(l, { status: 'planned' })}>Plan it again</button>
      <button className="btn" onClick={edit}>Edit</button>
    </>);
  }

  return (<>
    <h2 id="sheet-title">{l.title}</h2>
    <p className="sheet-meta"><Dot color={sub.color} />{sub.name}{l.skill ? `, ${l.skill}` : ''}</p>
    <p className="muted">{when}. {fmtMin(l.minutes)} planned.</p>
    {l.status === 'done' && (<>
      <div className="result">
        <Sticker color={sub.color} rating={l.rating || 3} size={64} rot={rotFor(l.id)} hidden />
        <div><p className="result-title">{RATINGS[l.rating] || 'Done'}</p><p className="muted">Spent {fmtMin(l.spent || l.minutes)}</p></div>
      </div>
      {l.note && <p className="note">{l.note}</p>}
    </>)}
    {l.status === 'skipped' && <p className="status-line">Skipped</p>}
    {l.plan && <div className="field"><span className="label">Plan and materials</span><p className="plan">{l.plan}</p></div>}
    {l.steps.length > 0 && (
      <div className="field"><span className="label">Checklist</span>
        {l.steps.map((s, i) => (
          <button key={i} className="check" aria-pressed={s.d} onClick={() => updateLesson(l, { steps: l.steps.map((x, j) => (j === i ? { t: x.t, d: !x.d } : x)) })}>
            <span className="box">{s.d && <Icon name="check" size={18} />}</span><span className="ct">{s.t}</span>
          </button>
        ))}
      </div>
    )}
    <div className="sheet-actions">{actions}</div>
  </>);
}

// ---------- Complete ("How did it go?") ----------

function CompleteSheet({ id }: { id: string }) {
  const { ctx, data, closeSheet, setUi, showToast } = usePlanner();
  const l = useLessonOrClose(id);
  const t = ctx.today;
  const [st, setSt] = useState(() => ({
    rating: l?.rating || 0,
    spent: (l && (l.status === 'done' && l.spent ? l.spent : l.minutes)) as number | '',
    note: l?.note || '',
    date: !l ? t : l.status === 'done' && l.date ? l.date : l.date && l.date < t ? t : l.date || t,
  }));
  if (!l) return null;
  const sub = ctx.sub(l.subjectId);
  const chips: [string, string][] = [['Today', t]];
  if (l.date && l.date !== t && l.date < t) chips.push([dayLabel(l.date), l.date]);
  const rots = [-6, 4, -3];

  const save = () => {
    if (!st.rating) { document.querySelector<HTMLElement>('#sheet-root .rate')?.focus(); return; }
    const wasDone = l.status === 'done';
    const next = stamp({
      ...l, status: 'done', rating: st.rating as Lesson['rating'], spent: clampInt(st.spent, 0, 600, l.minutes),
      note: st.note.trim(), date: st.date || t, doneAt: l.doneAt || new Date().toISOString(),
    }, l);
    closeSheet();
    setUi({ justStuck: l.id });
    data.commitLessons([{ id: l.id, next }]);
    showToast(wasDone ? 'Sticker saved' : 'Sticker added');
    setTimeout(() => setUi({ justStuck: null }), 1200);
  };

  return (<>
    <h2 id="sheet-title">How did it go?</h2>
    <p className="muted sheet-sub">{l.title}</p>
    <div className={'rates' + (st.rating ? ' has-pick' : '')} role="group" aria-label="Pick a sticker">
      {[1, 2, 3].map((r) => (
        <button key={r} className="rate" aria-pressed={st.rating === r} onClick={() => setSt({ ...st, rating: r as Lesson['rating'] })}>
          <Sticker color={sub.color} rating={r} size={76} rot={rots[r - 1]} hidden /><span>{RATINGS[r]}</span>
        </button>
      ))}
    </div>
    <div className="field"><span className="label" id="lbl-spent">Time spent</span>
      <div className="stepper">
        <button className="icon-btn boxed" aria-label="5 minutes less" onClick={() => setSt({ ...st, spent: Math.max(0, clampInt(st.spent, 0, 600, 0) - 5) })}><Icon name="minus" /></button>
        <input id="f-spent" className="input num" type="number" inputMode="numeric" min={0} max={600} value={st.spent} aria-labelledby="lbl-spent"
          onChange={(e) => setSt({ ...st, spent: e.target.value === '' ? '' : Number(e.target.value) })} />
        <button className="icon-btn boxed" aria-label="5 minutes more" onClick={() => setSt({ ...st, spent: Math.min(600, clampInt(st.spent, 0, 600, 0) + 5) })}><Icon name="plus" /></button>
        <span className="muted">minutes</span>
      </div>
    </div>
    <div className="field"><label htmlFor="f-done-date">Done on</label>
      {chips.length > 1 && <div className="chips">{chips.map(([lab, v]) => <button key={v} className="pick" aria-pressed={st.date === v} onClick={() => setSt({ ...st, date: v })}>{lab}</button>)}</div>}
      <input id="f-done-date" className={'input date' + (chips.length > 1 ? '' : ' flush')} type="date" value={st.date} max={t} onChange={(e) => setSt({ ...st, date: e.target.value })} />
    </div>
    <div className="field"><label htmlFor="f-note">Notes <span className="opt">(optional)</span></label>
      <textarea id="f-note" className="input" placeholder="What clicked, what was tricky, pages covered" value={st.note} onChange={(e) => setSt({ ...st, note: e.target.value })} />
    </div>
    <div className="sheet-actions">
      <button className="btn primary" aria-disabled={st.rating ? undefined : true} onClick={save}>{l.status === 'done' ? 'Save sticker' : 'Add sticker'}</button>
      <button className="btn quiet" onClick={closeSheet}>Cancel</button>
      {!st.rating && <span className="hint">Pick a sticker first.</span>}
    </div>
  </>);
}

// ---------- Edit / New lesson ----------

interface Draft { title: string; subjectId: string; skill: string; date: string; minutes: number | ''; plan: string; stepsText: string }

function EditSheet({ init }: { init: EditInit }) {
  const { ctx, data, getLesson, openSheet, closeSheet, showToast, addSubject } = usePlanner();
  const existing = init.id ? getLesson(init.id) : null;
  const [draft, setDraft] = useState<Draft>(() => {
    if (existing) return { title: existing.title, subjectId: existing.subjectId, skill: existing.skill, date: existing.date, minutes: existing.minutes, plan: existing.plan, stepsText: existing.steps.map((s) => s.t).join('\n') };
    const subs = ctx.subjects;
    const fallback = subs.some((s) => s.id === prefs.lastSubject) ? prefs.lastSubject! : subs[0] ? subs[0].id : '';
    return {
      title: init.title || '', subjectId: init.subjectId && subs.some((s) => s.id === init.subjectId) ? init.subjectId : fallback,
      skill: init.skill || '', date: init.date !== undefined ? init.date : ctx.today, minutes: init.minutes || 20, plan: init.plan || '', stepsText: init.stepsText || '',
    };
  });
  const [repeat, setRepeat] = useState(() => {
    const dow = draft.date ? parseYmd(draft.date).getDay() : new Date().getDay();
    return { on: false, days: [dow], weeks: 4 };
  });
  const [adding, setAdding] = useState(false);
  const [newSubject, setNewSubject] = useState('');
  const [error, setError] = useState('');
  const titleRef = useRef<HTMLInputElement>(null);
  const newSubRef = useRef<HTMLInputElement>(null);
  useEffect(() => { if (adding) newSubRef.current?.focus(); }, [adding]);

  const isNew = !init.id;
  const t = ctx.today;
  const tm = ymd(addDays(parseYmd(t), 1));
  const set = (p: Partial<Draft>) => setDraft((d) => ({ ...d, ...p }));
  const setDate = (v: string) => { set({ date: v }); if (v && !repeat.on) setRepeat((r) => ({ ...r, days: [parseYmd(v).getDay()] })); };
  const skills = Array.from(new Set(ctx.lessons.filter((l) => l.skill.trim() && (!draft.subjectId || l.subjectId === draft.subjectId)).map((l) => l.skill.trim()))).sort();
  const dates = isNew && draft.date && repeat.on ? repeatDates(draft.date, repeat.days, repeat.weeks, ctx.ws) : [];
  const saveLabel = !isNew ? 'Save changes' : repeat.on && dates.length > 1 ? `Add ${dates.length} lessons` : 'Add lesson';

  const addSubjectInline = () => {
    const name = newSubject.trim();
    if (!name) { newSubRef.current?.focus(); return; }
    set({ subjectId: addSubject(name) });
    setAdding(false);
    setNewSubject('');
  };

  const save = () => {
    const child = ctx.child;
    if (!child) return;
    const title = draft.title.trim();
    if (!title) { setError('Give this lesson a name.'); titleRef.current?.focus(); return; }
    const fields = { title, subjectId: draft.subjectId || '', skill: draft.skill.trim(), minutes: clampInt(draft.minutes, 1, 600, 20), plan: draft.plan.trim() };
    if (draft.subjectId) { prefs.lastSubject = draft.subjectId; savePrefs(); }
    if (existing) {
      closeSheet();
      data.commitLessons([{ id: existing.id, next: stamp({ ...existing, ...fields, date: draft.date || '', steps: mergeSteps(existing.steps, draft.stepsText) }, existing) }]);
      showToast('Changes saved');
      return;
    }
    const list = draft.date && repeat.on ? dates : [draft.date || ''];
    if (!list.length) { showToast('Pick at least one day to repeat on.'); return; }
    const now = Date.now();
    const steps = parseSteps(draft.stepsText);
    const changes = list.map((date, i) => { const n = newLesson({ ...fields, childId: child.id, date, steps: steps.map((s) => ({ ...s })), createdAt: now + i }); return { id: n.id, next: n }; });
    closeSheet();
    data.commitLessons(changes);
    if (changes.length > 1) showToast(`${changes.length} lessons added`);
    else showToast(list[0] ? `Lesson added for ${dayLabel(list[0], true)}` : 'Lesson added, no day yet');
  };

  const remove = () => {
    if (!existing) return;
    closeSheet();
    data.commitLessons([{ id: existing.id, next: null }]);
    showToast('Lesson deleted', { label: 'Undo', fn: () => data.commitLessons([{ id: existing.id, next: stamp({ ...existing }, existing) }]) });
  };

  const order = Array.from({ length: 7 }, (_, i) => (ctx.ws + i) % 7);

  return (<>
    <h2 id="sheet-title">{isNew ? 'New lesson' : 'Edit lesson'}</h2>
    <div className="field"><label htmlFor="f-title">Lesson</label>
      <input ref={titleRef} id="f-title" className="input" value={draft.title} placeholder="e.g. Short vowel words" autoComplete="off"
        data-autofocus={isNew && !draft.title ? true : undefined}
        onChange={(e) => { set({ title: e.target.value }); if (error) setError(''); }} />
      {error && <p className="error" id="f-title-err">{error}</p>}
    </div>
    <div className="field"><span className="label" id="lbl-sub">Subject</span>
      <div className="chips" role="group" aria-labelledby="lbl-sub">
        {ctx.subjects.map((s) => <button key={s.id} className="pick" aria-pressed={draft.subjectId === s.id} onClick={() => set({ subjectId: s.id })}><Dot color={s.color} />{s.name}</button>)}
        <button className="pick ghost" aria-expanded={adding} onClick={() => setAdding(!adding)}><Icon name="plus" size={16} />New subject</button>
      </div>
      {adding && (
        <div className="inline-add">
          <input ref={newSubRef} id="f-newsub" className="input" value={newSubject} placeholder="Subject name" autoComplete="off" aria-label="New subject name"
            onChange={(e) => setNewSubject(e.target.value)} onKeyDown={onEnter(addSubjectInline)} />
          <button className="btn" onClick={addSubjectInline}>Add</button>
        </div>
      )}
    </div>
    <div className="field"><label htmlFor="f-skill">Skill or topic <span className="opt">(optional)</span></label>
      <input id="f-skill" className="input" list="dl-skills" value={draft.skill} placeholder="e.g. Adding to 20" autoComplete="off" onChange={(e) => set({ skill: e.target.value })} />
      <datalist id="dl-skills">{skills.map((s) => <option key={s} value={s} />)}</datalist>
      <p className="hint">Lessons on the same skill are tracked together on the progress page.</p>
    </div>
    <div className="field"><label htmlFor="f-date">Day</label>
      <div className="chips">{([['Today', t], ['Tomorrow', tm], ['No day yet', '']] as const).map(([lab, v]) => <button key={lab} className="pick" aria-pressed={draft.date === v} onClick={() => setDate(v)}>{lab}</button>)}</div>
      <input id="f-date" className="input date" type="date" value={draft.date} onChange={(e) => setDate(e.target.value)} />
    </div>
    {isNew && draft.date && (
      <div className="field">
        <button className="toggle" aria-pressed={repeat.on} onClick={() => setRepeat((r) => ({ ...r, on: !r.on, days: !r.on && !r.days.length ? [parseYmd(draft.date).getDay()] : r.days }))}>
          <span className="switch" aria-hidden="true" />Repeat every week
        </button>
        {repeat.on && (
          <div className="repeat-box">
            <div className="chips" role="group" aria-label="Days">
              {order.map((n) => {
                const ref = addDays(REF_SUNDAY, n);
                return (
                  <button key={n} className="pick day-pick" aria-pressed={repeat.days.includes(n)} aria-label={fmtD(ref, { weekday: 'long' })}
                    onClick={() => setRepeat((r) => ({ ...r, days: r.days.includes(n) ? r.days.filter((x) => x !== n) : r.days.concat(n) }))}>
                    {fmtD(ref, { weekday: 'short' })}
                  </button>
                );
              })}
            </div>
            <div className="stepper">
              <span>For</span>
              <button className="icon-btn boxed" aria-label="One week fewer" onClick={() => setRepeat((r) => ({ ...r, weeks: Math.max(1, r.weeks - 1) }))}><Icon name="minus" /></button>
              <span className="stepper-val">{plural(repeat.weeks, 'week')}</span>
              <button className="icon-btn boxed" aria-label="One week more" onClick={() => setRepeat((r) => ({ ...r, weeks: Math.min(16, r.weeks + 1) }))}><Icon name="plus" /></button>
            </div>
            <p className="hint">{dates.length ? `Adds ${plural(dates.length, 'lesson')}, ${dayLabel(dates[0], true)} through ${dayLabel(dates[dates.length - 1], true)}.` : 'Pick at least one day.'}</p>
          </div>
        )}
      </div>
    )}
    <div className="field"><label htmlFor="f-min">Planned time</label>
      <div className="chips">{[10, 15, 20, 30, 45, 60].map((m) => <button key={m} className="pick" aria-pressed={Number(draft.minutes) === m} onClick={() => set({ minutes: m })}>{m} min</button>)}</div>
      <div className="inline-num">
        <input id="f-min" className="input num" type="number" inputMode="numeric" min={1} max={600} value={draft.minutes}
          onChange={(e) => set({ minutes: e.target.value === '' ? '' : Number(e.target.value) })} />
        <span className="muted">minutes</span>
      </div>
    </div>
    <div className="field"><label htmlFor="f-plan">Plan and materials <span className="opt">(optional)</span></label>
      <textarea id="f-plan" className="input" value={draft.plan} placeholder="What you’ll do, books or pages, things to gather" onChange={(e) => set({ plan: e.target.value })} />
    </div>
    <div className="field"><label htmlFor="f-steps">Checklist <span className="opt">(optional)</span></label>
      <textarea id="f-steps" className="input" value={draft.stepsText} placeholder="One step per line" onChange={(e) => set({ stepsText: e.target.value })} />
      <p className="hint">Each line becomes a box to tick during the lesson.</p>
    </div>
    <div className="sheet-actions">
      <button className="btn primary" onClick={save}>{saveLabel}</button>
      <button className="btn quiet" onClick={closeSheet}>Cancel</button>
      {!isNew && (<>
        <span className="spacer" />
        <button className="btn quiet" onClick={() => { openSheet({ type: 'edit', init: { ...draft, minutes: clampInt(draft.minutes, 1, 600, 20) } }); showToast('Copy ready to edit'); }}>Duplicate</button>
        <button className="btn danger" onClick={remove}>Delete</button>
      </>)}
    </div>
  </>);
}

// ---------- Settings ----------

function SettingsRow({ kind, item }: { kind: 'child' | 'subject'; item: Named }) {
  const { data, ctx, openSheet, closeSheet, showToast, setUi, ui } = usePlanner();
  const key = kind === 'child' ? 'children' : 'subjects';
  const [name, setName] = useState(item.name);
  useEffect(() => setName(item.name), [item.name]);

  const rename = () => {
    const v = name.trim();
    if (!v) { setName(item.name); return; }
    if (v !== item.name) data.saveNamed(key, [{ ...item, name: v }]).catch(() => setName(item.name));
  };
  const cycle = () => {
    const pal = kind === 'child' ? KID_COLORS : PALETTE;
    data.saveNamed(key, [{ ...item, color: pal[(pal.indexOf(item.color) + 1) % pal.length] }]).catch(() => {});
  };
  const remove = () => {
    const back: SheetState = { type: 'settings' };
    if (kind === 'child') {
      const theirs = Array.from(data.lessons.values()).filter((l) => l.childId === item.id);
      openSheet({
        type: 'confirm', danger: true, title: `Remove ${item.name}?`,
        body: theirs.length ? `This also deletes ${plural(theirs.length, 'lesson')} planned or finished for ${item.name}. It can’t be undone.` : `${item.name} has no lessons yet.`,
        confirm: `Remove ${item.name}`, cancel: 'Keep', back,
        onConfirm: () => {
          data.removeNamed('children', item.id);
          if (ui.childId === item.id) setUi({ childId: null });
          if (ctx.kids.length > 1) openSheet(back); else closeSheet();
          showToast(`${item.name} removed`);
        },
      });
    } else {
      const n = Array.from(data.lessons.values()).filter((l) => l.subjectId === item.id).length;
      openSheet({
        type: 'confirm', danger: true, title: `Remove ${item.name}?`,
        body: n ? `Its ${plural(n, 'lesson')} will stay, listed under Other.` : 'No lessons use this subject yet.',
        confirm: `Remove ${item.name}`, cancel: 'Keep', back,
        onConfirm: () => {
          data.removeNamed('subjects', item.id);
          if (ui.filter.subject === item.id) setUi({ filter: { ...ui.filter, subject: 'all' } });
          openSheet(back);
          showToast(`${item.name} removed`);
        },
      });
    }
  };

  return (
    <div className="set-row">
      <button className="swatch" aria-label={`Change color for ${item.name}`} onClick={cycle}>
        {kind === 'child' ? <span className="avatar" style={cv(item.color)} aria-hidden="true">{initial(item.name)}</span> : <Dot color={item.color} />}
      </button>
      <input className="input" value={name} aria-label={`Name for ${item.name}`} autoComplete="off"
        onChange={(e) => setName(e.target.value)} onBlur={rename} onKeyDown={onEnter(() => (document.activeElement as HTMLElement)?.blur())} />
      <button className="icon-btn" aria-label={`Remove ${item.name}`} onClick={remove}><Icon name="trash" /></button>
    </div>
  );
}

/** The next n weekdays, starting today if today is a weekday. */
function schoolDays(from: string, n: number) {
  const out: string[] = [];
  for (let d = parseYmd(from); out.length < n; d = addDays(d, 1)) if (d.getDay() !== 0 && d.getDay() !== 6) out.push(ymd(d));
  return out;
}

function StarterPlans() {
  const { ctx, data, openSheet, closeSheet, showToast, nav } = usePlanner();
  const child = ctx.child;
  if (!child) return null;
  const n = WRITING_GRADE3.length;

  const add = () => {
    const days = schoolDays(ctx.today, n);
    const already = ctx.lessons.some((l) => l.title === WRITING_GRADE3[0].title);
    openSheet({
      type: 'confirm',
      title: `Add ${n} days of writing for ${child.name}?`,
      body: `One 3rd-grade writing lesson each weekday, ${dayLabel(days[0], true)} through ${dayLabel(days[n - 1], true)}: sentences and paragraphs, stories, opinion pieces, reports, letters and poetry. Each has a plan and a checklist you can edit.`
        + (already ? ` ${child.name} already has lessons from this plan, so this adds a second copy.` : ''),
      confirm: `Add ${n} lessons`,
      back: { type: 'settings' },
      onConfirm: async () => {
        closeSheet();
        try {
          let sub = ctx.subjects.find((s) => s.name.trim().toLowerCase() === 'writing');
          if (!sub) {
            // Save the subject first so the lessons' subject reference is valid.
            const used = new Set(ctx.subjects.map((s) => s.color));
            sub = { id: crypto.randomUUID(), name: 'Writing', color: PALETTE.find((c) => !used.has(c)) || PALETTE[1], order: ctx.subjects.length ? Math.max(...ctx.subjects.map((s) => s.order)) + 1 : 0 };
            await data.saveNamed('subjects', [sub]);
          }
          const now = Date.now();
          const changes = WRITING_GRADE3.map((p, i) => {
            const l = newLesson({ childId: child.id, subjectId: sub!.id, title: p.title, skill: p.skill, minutes: p.minutes, plan: p.plan, steps: p.steps.map((t) => ({ t, d: false })), date: days[i], createdAt: now + i });
            return { id: l.id, next: l };
          });
          if (await data.commitLessons(changes)) { showToast(`${n} writing lessons added`); nav('week'); }
        } catch { /* saveNamed already showed an error */ }
      },
    });
  };

  return (
    <div className="set-group"><h3>Starter plans</h3>
      <button className="btn" onClick={add}><Icon name="plus" size={20} />{n} days of 3rd-grade writing</button>
      <p className="hint">Adds one writing lesson each weekday for {child.name}, ready to use or edit.</p>
    </div>
  );
}

function SettingsSheet() {
  const { ctx, data, closeSheet, showToast, addSubject, exportCsv, email, signOut } = usePlanner();
  const [newChild, setNewChild] = useState('');
  const [newSubj, setNewSubj] = useState('');

  const addChild = () => {
    const name = newChild.trim();
    if (!name) { document.getElementById('f-newchild')?.focus(); return; }
    const used = new Set(ctx.kids.map((k) => k.color));
    data.saveNamed('children', [{
      id: crypto.randomUUID(), name,
      color: KID_COLORS.find((c) => !used.has(c)) || KID_COLORS[ctx.kids.length % KID_COLORS.length],
      order: ctx.kids.length ? Math.max(...ctx.kids.map((k) => num(k.order, 0))) + 1 : 0,
    }]).then(() => showToast(`${name} added`), () => {});
    setNewChild('');
  };
  const addSubj = () => {
    const name = newSubj.trim();
    if (!name) { document.getElementById('f-newsubj')?.focus(); return; }
    addSubject(name);
    setNewSubj('');
  };

  return (<>
    <h2 id="sheet-title">Settings</h2>
    <div className="set-group"><h3>Children</h3>
      {ctx.kids.map((k) => <SettingsRow key={k.id} kind="child" item={k} />)}
      <div className="set-row">
        <input id="f-newchild" className="input" value={newChild} placeholder="Add a child" autoComplete="off" aria-label="New child’s name" onChange={(e) => setNewChild(e.target.value)} onKeyDown={onEnter(addChild)} />
        <button className="btn" onClick={addChild}>Add</button>
      </div>
    </div>
    <div className="set-group"><h3>Subjects</h3>
      {ctx.subjects.map((s) => <SettingsRow key={s.id} kind="subject" item={s} />)}
      <div className="set-row">
        <input id="f-newsubj" className="input" value={newSubj} placeholder="Add a subject" autoComplete="off" aria-label="New subject name" onChange={(e) => setNewSubj(e.target.value)} onKeyDown={onEnter(addSubj)} />
        <button className="btn" onClick={addSubj}>Add</button>
      </div>
    </div>
    <div className="set-group"><h3>Week starts on</h3>
      <div className="seg" role="group" aria-label="Week starts on">
        {([[0, 'Sunday'], [1, 'Monday']] as const).map(([v, lab]) => <button key={v} aria-pressed={ctx.ws === v} onClick={() => data.setWeekStart(v)}>{lab}</button>)}
      </div>
    </div>
    <StarterPlans />
    {ctx.child && (
      <div className="set-group"><h3>Records</h3>
        <button className="btn" onClick={exportCsv}><Icon name="download" size={20} />Download {ctx.child.name}’s lessons (CSV)</button>
        <p className="hint">Opens in Excel, Numbers or Google Sheets.</p>
      </div>
    )}
    <div className="set-group"><h3>Account</h3>
      <p className="hint" style={{ marginTop: 0, marginBottom: 10 }}>Signed in as {email}. Your planner saves to your account, so it’s there on any device where you sign in.</p>
      <button className="btn" onClick={() => { closeSheet(); signOut(); }}><Icon name="logout" size={20} />Sign out</button>
    </div>
    <div className="sheet-actions"><button className="btn primary" onClick={closeSheet}>Done</button></div>
  </>);
}

// ---------- Confirm ----------

function ConfirmSheet(s: ConfirmInit) {
  const { openSheet, closeSheet } = usePlanner();
  return (<>
    <h2 id="sheet-title">{s.title}</h2>
    <p className="sheet-body">{s.body}</p>
    <div className="sheet-actions">
      <button className={'btn ' + (s.danger ? 'danger-solid' : 'primary')} data-autofocus onClick={s.onConfirm}>{s.confirm}</button>
      <button className="btn quiet" onClick={() => (s.back ? openSheet(s.back) : closeSheet())}>{s.cancel || 'Cancel'}</button>
    </div>
  </>);
}
