import { useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { defaultWeekStart, KID_COLORS, newId, PALETTE, RATINGS, SUGGESTED } from '../lib/util';
import { Icon } from '../components/Icon';
import { Sticker } from '../components/Sticker';
import { usePlanner } from './context';

export function Onboarding({ onDone }: { onDone: (kidId: string) => void }) {
  const { data, showToast } = usePlanner();
  const [name, setName] = useState('');
  const [subjects, setSubjects] = useState(['Reading', 'Writing', 'Math', 'Science']);
  const [extra, setExtra] = useState<string[]>([]);
  const [custom, setCustom] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);
  const customRef = useRef<HTMLInputElement>(null);
  const all = [...SUGGESTED, ...extra];

  const toggle = (n: string) => setSubjects((s) => (s.includes(n) ? s.filter((x) => x !== n) : s.concat(n)));
  const addCustom = () => {
    const raw = custom.trim();
    if (!raw) { customRef.current?.focus(); return; }
    const known = all.find((x) => x.toLowerCase() === raw.toLowerCase());
    const n = known || raw;
    if (!known) setExtra((e) => e.concat(n));
    if (!subjects.includes(n)) setSubjects((s) => s.concat(n));
    setCustom('');
    customRef.current?.focus();
  };

  const start = async () => {
    const kidName = name.trim();
    if (!kidName) { setError('Add your child’s name to continue.'); nameRef.current?.focus(); return; }
    setBusy(true);
    const kid = newId();
    try {
      // Child last: once a child exists the planner replaces this screen.
      const chosen = all.filter((n) => subjects.includes(n));
      if (chosen.length) await data.saveNamed('subjects', chosen.map((n, i) => ({ id: newId(), name: n, color: PALETTE[i % PALETTE.length], order: i })));
      await data.setWeekStart(defaultWeekStart());
      onDone(kid);
      await data.saveNamed('children', [{ id: kid, name: kidName, color: KID_COLORS[0], order: 0 }]);
    } catch {
      showToast("Couldn't set up your planner. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  };

  const demo: [number, string, number, number][] = [[1, '#16A06B', 58, -9], [2, '#F28C28', 66, 5], [3, '#2F6FDE', 76, -4]];
  return (
    <div className="ob">
      <div className="ob-stickers" aria-hidden="true">
        {demo.map(([r, c, size, rot]) => <div key={r} className="ob-sticker"><Sticker color={c} rating={r} size={size} rot={rot} hidden /><span>{RATINGS[r]}</span></div>)}
      </div>
      <h1 tabIndex={-1}>Set up your planner</h1>
      <p className="lede">Plan lessons for the week, tick them off together, and watch the sticker chart fill up. Every finished lesson earns a sticker for how it went.</p>
      <div className="field"><label htmlFor="ob-name">Child’s name</label>
        <input ref={nameRef} id="ob-name" className="input" value={name} autoComplete="off" autoCapitalize="words" placeholder="First name"
          onChange={(e) => { setName(e.target.value); if (error) setError(''); }}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.nativeEvent.isComposing) { e.preventDefault(); start(); } }} />
        {error && <p className="error">{error}</p>}
        <p className="hint">You can add more children later in Settings.</p>
      </div>
      <div className="field"><span className="label" id="ob-sub-label">Subjects you teach</span>
        <div className="chips" role="group" aria-labelledby="ob-sub-label">
          {all.map((n) => { const on = subjects.includes(n); return <button key={n} className="pick" aria-pressed={on} onClick={() => toggle(n)}>{on && <Icon name="check" size={16} />}{n}</button>; })}
        </div>
        <div className="inline-add">
          <input ref={customRef} id="ob-custom" className="input" value={custom} placeholder="Another subject, like Spanish" autoComplete="off" aria-label="Another subject"
            onChange={(e) => setCustom(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.nativeEvent.isComposing) { e.preventDefault(); addCustom(); } }} />
          <button className="btn" onClick={addCustom}>Add</button>
        </div>
      </div>
      <div className="ob-go">
        <button className="btn primary big" onClick={start} disabled={busy}>{busy ? 'Setting up…' : 'Start planning'}</button>
        <p className="hint">Your planner saves to your account, so it’s there on any device where you sign in. <button className="link" onClick={() => supabase.auth.signOut()}>Sign out</button></p>
      </div>
    </div>
  );
}
