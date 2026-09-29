import { useState, type FormEvent } from 'react';
import { supabase } from './lib/supabase';
import { RATINGS } from './lib/util';
import { Sticker } from './components/Sticker';

export function Auth() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email.trim() || !password) { setError('Enter your email and a password.'); return; }
    if (mode === 'signup' && password.length < 8) { setError('Use at least 8 characters for your password.'); return; }
    setBusy(true);
    const { data, error } = mode === 'signin'
      ? await supabase.auth.signInWithPassword({ email: email.trim(), password })
      : await supabase.auth.signUp({ email: email.trim(), password });
    setBusy(false);
    if (error) { setError(error.message); return; }
    if (mode === 'signup' && !data.session) setError('Check your email to confirm your account, then sign in.');
  };

  const demo: [number, string, number, number][] = [[1, '#16A06B', 58, -9], [2, '#F28C28', 66, 5], [3, '#2F6FDE', 76, -4]];
  return (
    <div className="ob">
      <div className="ob-stickers" aria-hidden="true">
        {demo.map(([r, c, size, rot]) => <div key={r} className="ob-sticker"><Sticker color={c} rating={r} size={size} rot={rot} hidden /><span>{RATINGS[r]}</span></div>)}
      </div>
      <h1>Home Lessons</h1>
      <p className="lede">Plan lessons for the week, tick them off together, and watch the sticker chart fill up. {mode === 'signin' ? 'Sign in to open your planner.' : 'Create an account to start your planner.'}</p>
      <form onSubmit={submit} noValidate>
        <div className="field"><label htmlFor="au-email">Email</label>
          <input id="au-email" className="input" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="field"><label htmlFor="au-pass">Password</label>
          <input id="au-pass" className="input" type="password" autoComplete={mode === 'signin' ? 'current-password' : 'new-password'} value={password} onChange={(e) => setPassword(e.target.value)} />
          {mode === 'signup' && <p className="hint">At least 8 characters.</p>}
          {error && <p className="error" role="alert">{error}</p>}
        </div>
        <div className="ob-go">
          <button className="btn primary big" type="submit" disabled={busy}>{busy ? 'One moment…' : mode === 'signin' ? 'Sign in' : 'Create account'}</button>
          <p className="hint">
            {mode === 'signin' ? 'New here? ' : 'Already have an account? '}
            <button type="button" className="link" onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError(''); }}>
              {mode === 'signin' ? 'Create an account' : 'Sign in'}
            </button>
          </p>
        </div>
      </form>
    </div>
  );
}
