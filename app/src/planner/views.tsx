import { useMemo, type ReactNode } from 'react';
import type { Lesson, Named } from '../lib/types';
import {
  addDays, byCreated, cmpStr, dayLabel, fmtD, fmtMin, OTHER, parseYmd, plural, RATINGS, rotFor, shortMin, startOfWeek, weekStartDate, ymd,
} from '../lib/util';
import { Icon } from '../components/Icon';
import { Sticker } from '../components/Sticker';
import { cv, usePlanner, type EditInit, type Ui } from './context';

// ---------- Shared bits ----------

function LessonSticker({ l, sub, size }: { l: Lesson; sub: Named; size: number }) {
  const { ui } = usePlanner();
  return <Sticker color={sub.color} rating={l.rating || 3} size={size} rot={rotFor(l.id)} hidden isNew={ui.justStuck === l.id} />;
}

const Dot = ({ color }: { color: string }) => <i className="dot" style={cv(color)} />;

function AddButton({ init, className = 'btn primary', size = 20, children, label }: { init: EditInit; className?: string; size?: number; children: ReactNode; label?: string }) {
  const { openSheet } = usePlanner();
  return <button className={className} aria-label={label} onClick={() => openSheet({ type: 'edit', init })}><Icon name="plus" size={size} />{children}</button>;
}

function LessonRow({ l, action, showDate }: { l: Lesson; action?: 'done' | 'move' | ''; showDate?: boolean }) {
  const { ctx, openSheet, updateLesson, showToast } = usePlanner();
  const sub = ctx.sub(l.subjectId);
  let lead;
  if (l.status === 'done') lead = <LessonSticker l={l} sub={sub} size={44} />;
  else if (l.status === 'skipped') lead = <span className="spot is-skipped" aria-hidden="true" />;
  else lead = <span className="spot" style={cv(sub.color)} aria-hidden="true" />;
  const meta: ReactNode[] = [<span key="s" className="meta-sub"><Dot color={sub.color} />{sub.name}</span>];
  if (l.skill && l.skill.trim().toLowerCase() !== l.title.trim().toLowerCase()) meta.push(<span key="k">{l.skill}</span>);
  if (showDate && l.date) meta.push(<span key="d" className={l.status === 'planned' && l.date < ctx.today ? 'late' : ''}>{dayLabel(l.date)}</span>);
  if (l.status === 'done') meta.push(<span key="r">{RATINGS[l.rating] || 'Done'}, {fmtMin(l.spent || l.minutes)}</span>);
  else meta.push(<span key="m">{fmtMin(l.minutes)}</span>);
  if (l.status === 'planned' && l.steps.length) meta.push(<span key="st">{l.steps.filter((s) => s.d).length} of {l.steps.length} steps</span>);
  if (l.status === 'skipped') meta.push(<span key="sk">Skipped</span>);
  let act = null;
  if (l.status === 'planned' && action === 'done') {
    act = <button className="btn done-btn" aria-label={`Mark done: ${l.title}`} onClick={() => openSheet({ type: 'complete', id: l.id })}><Icon name="check" /><span className="done-label">Mark done</span></button>;
  } else if (l.status === 'planned' && action === 'move') {
    act = <button className="btn small" aria-label={`Move to today: ${l.title}`} onClick={() => { updateLesson(l, { date: ctx.today }); showToast('Moved to today'); }}>Move to today</button>;
  }
  return (
    <div className={`row is-${l.status}`}>
      <div className="row-lead">{lead}</div>
      <button className="row-main" onClick={() => openSheet({ type: 'detail', id: l.id })}><span className="row-title">{l.title}</span><span className="row-meta">{meta}</span></button>
      <div className="row-act">{act}</div>
    </div>
  );
}

function ViewHead({ title, lede, children }: { title: string; lede: ReactNode; children?: ReactNode }) {
  return <div className="view-head"><div><h1 tabIndex={-1}>{title}</h1><p className="lede">{lede}</p></div>{children}</div>;
}

// ---------- Today ----------

export function TodayView() {
  const { ctx, data, nav, setUi, showToast } = usePlanner();
  const t = ctx.today;
  const name = ctx.child!.name;
  const todays = ctx.lessons.filter((l) => l.date === t).sort(byCreated);
  const active = todays.filter((l) => l.status !== 'skipped');
  const done = active.filter((l) => l.status === 'done');
  const left = active.filter((l) => l.status === 'planned');
  const overdue = ctx.lessons.filter((l) => l.status === 'planned' && l.date && l.date < t).sort((a, b) => cmpStr(a.date, b.date) || byCreated(a, b));
  let lede: string;
  if (!todays.length) lede = `Nothing planned for ${name} today.`;
  else if (!active.length) lede = 'Today’s lessons were skipped.';
  else if (!left.length) lede = active.length === 1 ? `${name} finished today’s lesson.` : `${name} finished all ${active.length} lessons today.`;
  else {
    const mins = left.reduce((s, l) => s + l.minutes, 0);
    lede = done.length
      ? `${name} has ${plural(active.length, 'lesson')} today. ${done.length} done, about ${fmtMin(mins)} to go.`
      : `${name} has ${plural(active.length, 'lesson')} today, about ${fmtMin(mins)} in all.`;
  }
  const tm = ymd(addDays(parseYmd(t), 1));
  const tomorrow = ctx.lessons.filter((l) => l.date === tm && l.status === 'planned');
  const moveAll = () => {
    data.commitLessons(overdue.map((l) => ({ id: l.id, next: { ...l, date: t, updatedAt: Math.max(Date.now(), l.updatedAt + 1) } })));
    showToast(`Moved ${plural(overdue.length, 'lesson')} to today`);
  };
  const shown = overdue.slice(0, 8);
  return (
    <div className="narrow">
      <ViewHead title={fmtD(parseYmd(t), { weekday: 'long', month: 'long', day: 'numeric' })} lede={lede} />
      {active.length > 0 && (
        <div className="strip" role="img" aria-label={`${done.length} of ${active.length} stickers earned today`}>
          {active.map((l) => (l.status === 'done'
            ? <LessonSticker key={l.id} l={l} sub={ctx.sub(l.subjectId)} size={50} />
            : <span key={l.id} className="slot" style={cv(ctx.sub(l.subjectId).color)} />))}
        </div>
      )}
      {todays.length ? (
        <div className="page">
          {todays.map((l) => <LessonRow key={l.id} l={l} action="done" />)}
          <AddButton className="add-line" size={22} init={{ date: t }}>Add a lesson for today</AddButton>
        </div>
      ) : (
        <div className="page empty">
          <p>Plan something for today, or look ahead at the rest of the week.</p>
          <div className="btn-row"><AddButton init={{ date: t }}>Plan a lesson</AddButton><button className="btn" onClick={() => nav('week')}>Open this week</button></div>
        </div>
      )}
      {tomorrow.length > 0 && (
        <p className="next-line">Tomorrow: {plural(tomorrow.length, 'lesson')} planned, about {fmtMin(tomorrow.reduce((s, l) => s + l.minutes, 0))}. <button className="link" onClick={() => nav('week')}>See the week</button></p>
      )}
      {overdue.length > 0 && (
        <section className="section">
          <div className="section-head"><h2>Still to do from earlier</h2><button className="btn small" onClick={moveAll}>Move all to today</button></div>
          <div className="page">{shown.map((l) => <LessonRow key={l.id} l={l} action="move" showDate />)}</div>
          {overdue.length > shown.length && (
            <button className="btn quiet more" onClick={() => { setUi({ view: 'lessons', filter: { status: 'upcoming', subject: 'all', q: '' } }); window.scrollTo(0, 0); }}>See all {overdue.length} in Lessons</button>
          )}
        </section>
      )}
    </div>
  );
}

// ---------- Week ----------

function WeekChip({ l }: { l: Lesson }) {
  const { ctx, openSheet } = usePlanner();
  const sub = ctx.sub(l.subjectId);
  let lead;
  if (l.status === 'done') lead = <LessonSticker l={l} sub={sub} size={30} />;
  else if (l.status === 'skipped') lead = <span className="spot sm is-skipped" aria-hidden="true" />;
  else lead = <span className="spot sm" style={cv(sub.color)} aria-hidden="true" />;
  const state = l.status === 'done' ? `, ${RATINGS[l.rating] || 'done'}` : l.status === 'skipped' ? ', skipped' : '';
  return (
    <button className={`lchip is-${l.status}`} onClick={() => openSheet({ type: 'detail', id: l.id })}>
      <span className="lchip-lead">{lead}</span>
      <span className="lchip-text"><span className="t">{l.title}</span><span className="m">{sub.name}, {fmtMin(l.status === 'done' ? l.spent || l.minutes : l.minutes)}<span className="visually-hidden">{state}</span></span></span>
    </button>
  );
}

export function WeekView() {
  const { ctx, ui, setUi, openSheet, closeSheet, data, showToast } = usePlanner();
  const start = weekStartDate(ui.weekOffset, ctx.ws);
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  const s0 = ymd(days[0]), s6 = ymd(days[6]);
  const inWeek = ctx.lessons.filter((l) => l.date && l.date >= s0 && l.date <= s6);
  const active = inWeek.filter((l) => l.status !== 'skipped');
  const done = active.filter((l) => l.status === 'done');
  const o = ui.weekOffset;
  const title = o === 0 ? 'This week' : o === 1 ? 'Next week' : o === -1 ? 'Last week' : `Week of ${fmtD(days[0], { month: 'long', day: 'numeric' })}`;
  const span = `${fmtD(days[0], { month: 'short', day: 'numeric' })} to ${fmtD(days[6], { month: 'short', day: 'numeric' })}`;
  const lede = active.length
    ? `${span}. ${done.length} of ${plural(active.length, 'lesson')} done, about ${fmtMin(active.reduce((s, l) => s + l.minutes, 0))} planned.`
    : `${span}. Nothing planned yet.`;

  const copyWeek = () => {
    const src = inWeek.slice().sort((a, b) => cmpStr(a.date, b.date) || byCreated(a, b));
    if (!src.length) return;
    openSheet({
      type: 'confirm',
      title: `Copy ${plural(src.length, 'lesson')} to next week?`,
      body: `They’ll be added to the week of ${fmtD(addDays(start, 7), { month: 'long', day: 'numeric' })} as new lessons, on the same days, with stickers and checklists cleared.`,
      confirm: 'Copy lessons',
      onConfirm: () => {
        const now = Date.now();
        const changes = src.map((l, i) => {
          const n: Lesson = {
            ...l, id: crypto.randomUUID(), steps: l.steps.map((s) => ({ t: s.t, d: false })), date: ymd(addDays(parseYmd(l.date), 7)),
            status: 'planned', rating: 0, spent: 0, note: '', doneAt: '', createdAt: now + i, updatedAt: now,
          };
          return { id: n.id, next: n };
        });
        closeSheet();
        setUi({ weekOffset: o + 1 });
        data.commitLessons(changes);
        showToast(`${plural(changes.length, 'lesson')} copied`);
      },
    });
  };

  const widths: string[] = [];
  const cols = days.map((d) => {
    const ds = ymd(d);
    const list = ctx.lessons.filter((l) => l.date === ds).sort(byCreated);
    widths.push((d.getDay() === 0 || d.getDay() === 6) && !list.length ? 'minmax(0, 0.6fr)' : 'minmax(0, 1fr)');
    const dayName = fmtD(d, { weekday: 'long', month: 'long', day: 'numeric' });
    const mins = list.filter((l) => l.status !== 'skipped').reduce((s, l) => s + l.minutes, 0);
    return (
      <section key={ds} className={'day' + (ds === ctx.today ? ' is-today' : '')} aria-label={dayName}>
        <div className="day-head">
          <span className="day-name"><span className="mark"><span className="wd-long">{fmtD(d, { weekday: 'long' })}</span><span className="wd-short">{fmtD(d, { weekday: 'short' })}</span> {d.getDate()}</span></span>
          {mins > 0 && <span className="day-total">{fmtMin(mins)}</span>}
          <AddButton className="day-add-inline" size={16} init={{ date: ds }} label={`Add a lesson on ${dayName}`}>Add</AddButton>
        </div>
        {list.map((l) => <WeekChip key={l.id} l={l} />)}
        <AddButton className="day-add" size={18} init={{ date: ds }} label={`Add a lesson on ${dayName}`}>Add</AddButton>
      </section>
    );
  });

  return (
    <>
      <ViewHead title={title} lede={lede}>
        <div className="head-actions">
          {inWeek.length > 0 && <button className="btn small" onClick={copyWeek}><Icon name="copy" size={18} />Copy to next week</button>}
          <button className="icon-btn boxed" aria-label="Previous week" onClick={() => setUi({ weekOffset: o - 1 })}><Icon name="left" /></button>
          {o !== 0 && <button className="btn small" onClick={() => setUi({ weekOffset: 0 })}>This week</button>}
          <button className="icon-btn boxed" aria-label="Next week" onClick={() => setUi({ weekOffset: o + 1 })}><Icon name="right" /></button>
        </div>
      </ViewHead>
      <div className="week" style={{ ['--week-cols' as string]: widths.join(' ') }}>{cols}</div>
    </>
  );
}

// ---------- Lessons ----------

export function LessonsView() {
  const { ctx, ui, setUi } = usePlanner();
  const f = ui.filter, t = ctx.today;
  const setFilter = (p: Partial<Ui['filter']>) => setUi({ filter: { ...f, ...p }, listLimit: 150 });
  let pool = ctx.lessons;
  if (f.subject !== 'all') pool = pool.filter((l) => ctx.sub(l.subjectId).id === f.subject);
  const q = f.q.trim().toLowerCase();
  if (q) pool = pool.filter((l) => `${l.title} ${l.skill} ${l.plan} ${l.note}`.toLowerCase().includes(q));
  const groups = {
    upcoming: pool.filter((l) => l.status === 'planned' && l.date).sort((a, b) => cmpStr(a.date, b.date) || byCreated(a, b)),
    unscheduled: pool.filter((l) => l.status === 'planned' && !l.date).sort((a, b) => b.createdAt - a.createdAt),
    done: pool.filter((l) => l.status === 'done').sort((a, b) => cmpStr(b.date, a.date) || b.createdAt - a.createdAt),
    all: pool.slice().sort((a, b) => cmpStr(b.date || '9999', a.date || '9999') || byCreated(a, b)),
  };
  const segs = [['upcoming', 'Planned'], ['unscheduled', 'No day'], ['done', 'Done'], ['all', 'All']] as const;
  const list = groups[f.status] || groups.upcoming;
  const rows: ReactNode[] = [];
  let lastKey: string | null = null;
  for (const l of list.slice(0, ui.listLimit)) {
    const key = l.date || '';
    if (f.status !== 'unscheduled' && key !== lastKey) {
      const late = key && key < t && l.status === 'planned' && f.status === 'upcoming';
      rows.push(<h3 key={'h' + key} className={'date-head' + (key === t ? ' is-today' : '')}>{dayLabel(key)}{late && <span className="late-tag">Overdue</span>}</h3>);
      lastKey = key;
    }
    rows.push(<LessonRow key={l.id} l={l} action={l.status === 'planned' && l.date && l.date <= t ? 'done' : ''} />);
  }
  const empties = {
    upcoming: 'No planned lessons yet.',
    unscheduled: 'Lessons without a day wait here. Use it as a list of ideas to plan later.',
    done: 'Finished lessons show up here.',
    all: 'No lessons yet.',
  };
  const empty = q ? `No lessons match “${f.q.trim()}”.` : empties[f.status];
  const subjectFilter = f.subject !== 'all' ? f.subject : undefined;
  return (
    <div className="narrow">
      <ViewHead title="Lessons" lede={`Everything planned for ${ctx.child!.name}, plus ideas without a day and finished work.`} />
      <div className="controls">
        <div className="seg" role="group" aria-label="Show">
          {segs.map(([v, lab]) => <button key={v} aria-pressed={f.status === v} onClick={() => setFilter({ status: v })}>{lab}<span className="count">{groups[v].length}</span></button>)}
        </div>
        <div className="search-wrap"><Icon name="search" size={20} /><input id="q" className="input" type="search" placeholder="Search lessons, skills and notes" value={f.q} aria-label="Search lessons" autoComplete="off" onChange={(e) => setFilter({ q: e.target.value })} /></div>
        {ctx.subjects.length > 1 && (
          <div className="chips" role="group" aria-label="Subject">
            <button className="pick" aria-pressed={f.subject === 'all'} onClick={() => setFilter({ subject: 'all' })}>All subjects</button>
            {ctx.subjects.map((s) => <button key={s.id} className="pick" aria-pressed={f.subject === s.id} onClick={() => setFilter({ subject: s.id })}><Dot color={s.color} />{s.name}</button>)}
          </div>
        )}
      </div>
      {list.length ? (
        <>
          <div className="page">{rows}</div>
          {list.length > ui.listLimit && <button className="btn more" onClick={() => setUi({ listLimit: ui.listLimit + 150 })}>Show more</button>}
        </>
      ) : (
        <div className="page empty">
          <p>{empty}</p>
          {q
            ? <button className="btn" onClick={() => { setFilter({ q: '' }); document.getElementById('q')?.focus(); }}>Clear search</button>
            : <AddButton init={{ date: f.status === 'unscheduled' ? '' : t, subjectId: subjectFilter }}>Add lesson</AddButton>}
        </div>
      )}
    </div>
  );
}

// ---------- Progress ----------

export function ProgressView() {
  const { ctx, ui, setUi, exportCsv } = usePlanner();
  const t = ctx.today;
  const name = ctx.child!.name;
  const range = ui.range;
  const since = range ? ymd(addDays(parseYmd(t), -(range - 1))) : '';
  const doneAll = useMemo(
    () => ctx.lessons.filter((l) => l.status === 'done' && l.date).sort((a, b) => cmpStr(a.date, b.date) || byCreated(a, b)),
    [ctx.lessons],
  );
  const done = since ? doneAll.filter((l) => l.date >= since) : doneAll;
  const mins = done.reduce((s, l) => s + (l.spent || l.minutes || 0), 0);
  const dayCount = new Set(done.map((l) => l.date)).size;
  const phrase = range === 28 ? 'In the last 4 weeks' : range === 84 ? 'In the last 12 weeks' : 'So far';
  const lede = done.length
    ? `${phrase}, ${name} finished ${plural(done.length, 'lesson')} on ${plural(dayCount, 'day')}, about ${fmtMin(mins)} of learning.`
    : `No stickers ${range ? phrase.toLowerCase() : 'yet'}. Finished lessons show up here as stickers.`;
  const order = [...ctx.subjects.map((s) => s.id), ''];
  const subOf = (id: string) => (id ? ctx.sub(id) : OTHER);

  // Sticker chart
  const bySub = new Map<string, Lesson[]>();
  for (const l of done) { const k = ctx.sub(l.subjectId).id; if (!bySub.has(k)) bySub.set(k, []); bySub.get(k)!.push(l); }

  // Skills
  type Skill = { key: string; name: string; subjectId: string; entries: Lesson[]; last: Lesson };
  const skillMap = new Map<string, Omit<Skill, 'last'>>();
  for (const l of doneAll) {
    if (!l.skill.trim()) continue;
    const key = l.subjectId + '|' + l.skill.trim().toLowerCase();
    if (!skillMap.has(key)) skillMap.set(key, { key, name: l.skill.trim(), subjectId: l.subjectId, entries: [] });
    const s = skillMap.get(key)!;
    s.name = l.skill.trim();
    s.entries.push(l);
  }
  const planned = new Set(ctx.lessons.filter((l) => l.status === 'planned' && l.skill.trim() && (!l.date || l.date >= t)).map((l) => l.subjectId + '|' + l.skill.trim().toLowerCase()));
  const skills: Skill[] = Array.from(skillMap.values()).map((s) => ({ ...s, last: s.entries[s.entries.length - 1] }));
  const revisit = skills.filter((s) => s.last.rating === 1 && !planned.has(s.key)).sort((a, b) => cmpStr(b.last.date, a.last.date)).slice(0, 8);
  const inRange = skills.filter((s) => !since || s.last.date >= since).sort((a, b) => cmpStr(b.last.date, a.last.date));
  const skillsShown = ui.showAllSkills ? inRange : inRange.slice(0, 10);
  const tomorrow = ymd(addDays(parseYmd(t), 1));

  // Time per week
  const cur = startOfWeek(parseYmd(t), ctx.ws);
  let nW = range ? range / 7 : 12;
  if (!range && doneAll.length) {
    const first = startOfWeek(parseYmd(doneAll[0].date), ctx.ws);
    nW = Math.min(26, Math.max(4, Math.round((cur.getTime() - first.getTime()) / 604800000) + 1));
  }
  const weeks = Array.from({ length: nW }, (_, i) => addDays(cur, -7 * (nW - 1 - i)));
  const bars = weeks.map((w) => {
    const a = ymd(w), b = ymd(addDays(w, 6));
    const per = new Map<string, number>();
    let total = 0;
    for (const l of doneAll) {
      if (l.date < a || l.date > b) continue;
      const m = l.spent || l.minutes || 0;
      const k = ctx.sub(l.subjectId).id;
      per.set(k, (per.get(k) || 0) + m);
      total += m;
    }
    return { w, per, total };
  });
  const max = Math.max(60, ...bars.map((x) => x.total));
  const usedSubs = order.filter((id) => bars.some((x) => x.per.get(id)));

  // Notes
  const notes = done.filter((l) => l.note.trim()).reverse();
  const notesShown = ui.showAllNotes ? notes : notes.slice(0, 6);

  return (
    <>
      <ViewHead title={`${name}’s progress`} lede={lede}>
        <div className="head-actions">
          <div className="seg" role="group" aria-label="Time period">
            {([[28, '4 weeks'], [84, '12 weeks'], [0, 'All time']] as const).map(([v, lab]) => <button key={v} aria-pressed={range === v} onClick={() => setUi({ range: v })}>{lab}</button>)}
          </div>
        </div>
      </ViewHead>

      <section className="section">
        <div className="section-head"><h2>Sticker chart</h2>
          <div className="legend" aria-hidden="true">{[3, 2, 1].map((r) => <span key={r}><Sticker color="#8A94A6" rating={r} size={22} hidden />{RATINGS[r]}</span>)}</div>
        </div>
        {bySub.size ? (
          <div>
            {order.filter((id) => bySub.has(id)).map((id) => {
              const sub = subOf(id);
              const list = bySub.get(id)!;
              const mix = [3, 2, 1].map((r) => [r, list.filter((l) => l.rating === r).length]).filter(([, n]) => n).map(([r, n]) => `${n} ${RATINGS[r].toLowerCase()}`).join(', ');
              return (
                <div key={id || 'other'} className="chart-row">
                  <div><span className="chart-name"><Dot color={sub.color} />{sub.name}</span><span className="chart-count">{plural(list.length, 'sticker')}{mix ? `: ${mix}` : ''}</span></div>
                  <div className="chart-stickers">{list.map((l) => <StickerButton key={l.id} l={l} sub={sub} />)}</div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="hint-box">When {name} finishes a lesson, tap Mark done and pick how it went. The sticker lands here, in a row for its subject.</p>
        )}
      </section>

      {revisit.length > 0 && (
        <section className="section">
          <div className="section-head"><h2>Skills to revisit</h2></div>
          <p className="section-note">The last lesson on each of these was marked Needs practice, and nothing is planned for them yet.</p>
          <div>
            {revisit.map((s) => {
              const sub = subOf(ctx.sub(s.subjectId).id);
              return (
                <div key={s.key} className="skill-row">
                  <div><span className="skill-name">{s.name}</span><span className="skill-sub"><Dot color={sub.color} />{sub.name}, last practiced {dayLabel(s.last.date, true)}</span></div>
                  <AddButton className="btn small" size={18} init={{ date: tomorrow, subjectId: s.subjectId, skill: s.name, title: 'Practice: ' + s.name }}>Plan practice</AddButton>
                </div>
              );
            })}
          </div>
        </section>
      )}

      <section className="section">
        <div className="section-head"><h2>Skills</h2></div>
        {inRange.length ? (
          <>
            <p className="section-note">Each lesson on a skill adds a sticker to its trail, oldest to newest.</p>
            <div>
              {skillsShown.map((s) => {
                const sub = subOf(ctx.sub(s.subjectId).id);
                return (
                  <div key={s.key} className="skill-row">
                    <div><span className="skill-name">{s.name}</span><span className="skill-sub"><Dot color={sub.color} />{sub.name}, {plural(s.entries.length, 'lesson')}, now {(RATINGS[s.last.rating] || 'done').toLowerCase()}</span></div>
                    <div className="trail">{s.entries.slice(-12).map((l) => <Sticker key={l.id} color={sub.color} rating={l.rating || 3} size={24} rot={rotFor(l.id)} hidden />)}</div>
                  </div>
                );
              })}
            </div>
            {inRange.length > 10 && <button className="btn quiet more" onClick={() => setUi({ showAllSkills: !ui.showAllSkills })}>{ui.showAllSkills ? 'Show fewer' : `Show all ${inRange.length} skills`}</button>}
          </>
        ) : (
          <p className="hint-box">Add a skill when you plan a lesson, like “Adding to 20” or “Short vowel sounds”. Lessons on the same skill are grouped here so you can see it improve over time.</p>
        )}
      </section>

      <section className="section">
        <div className="section-head"><h2>Time learning each week</h2>
          {usedSubs.length > 0 && <div className="legend">{usedSubs.map((id) => <span key={id || 'other'}><Dot color={subOf(id).color} />{subOf(id).name}</span>)}</div>}
        </div>
        <div className="bars">
          {bars.map((x) => (
            <div key={ymd(x.w)} className="bcol" role="img" aria-label={`Week of ${fmtD(x.w, { month: 'long', day: 'numeric' })}: ${x.total ? fmtMin(x.total) : 'no finished lessons'}`}>
              <div className="bwrap"><div className="bar" style={{ height: `${((x.total / max) * 100).toFixed(1)}%` }}>
                {order.filter((id) => x.per.get(id)).map((id) => <span key={id || 'other'} style={{ flex: `${x.per.get(id)} 0 0`, background: subOf(id).color }} />)}
              </div></div>
              <div className="blabel">{fmtD(x.w, { month: 'short', day: 'numeric' })}<b>{x.total ? shortMin(x.total) : '–'}</b></div>
            </div>
          ))}
        </div>
      </section>

      {notes.length > 0 && (
        <section className="section">
          <div className="section-head"><h2>Notes</h2></div>
          <div>
            {notesShown.map((l) => (
              <div key={l.id} className="note-item">
                <div className="note-head"><LessonSticker l={l} sub={ctx.sub(l.subjectId)} size={26} /><strong>{l.title}</strong><span>{dayLabel(l.date)}</span></div>
                <p className="note-text">{l.note}</p>
              </div>
            ))}
          </div>
          {notes.length > 6 && <button className="btn quiet more" onClick={() => setUi({ showAllNotes: !ui.showAllNotes })}>{ui.showAllNotes ? 'Show fewer' : `Show all ${notes.length} notes`}</button>}
        </section>
      )}

      <section className="section">
        <div className="btn-row"><button className="btn" onClick={exportCsv}><Icon name="download" size={20} />Download {name}’s lessons (CSV)</button></div>
        <p className="hint">A spreadsheet of every lesson, sticker and note. Useful for records or a portfolio.</p>
      </section>
    </>
  );
}

function StickerButton({ l, sub }: { l: Lesson; sub: Named }) {
  const { openSheet } = usePlanner();
  return (
    <button className="sticker-btn" aria-label={`${l.title}, ${dayLabel(l.date)}, ${RATINGS[l.rating] || 'done'}`} onClick={() => openSheet({ type: 'detail', id: l.id })}>
      <LessonSticker l={l} sub={sub} size={38} />
    </button>
  );
}
