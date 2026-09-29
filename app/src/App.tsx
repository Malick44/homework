import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { configError, supabase } from './lib/supabase';
import { Auth } from './Auth';
import { Planner } from './planner/Planner';

export default function App() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);

  useEffect(() => {
    if (configError) return;
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);

  if (configError) return <div className="ob"><h1>Setup needed</h1><p className="error">{configError}</p></div>;
  if (session === undefined) {
    return <div className="loading" role="status"><div className="loading-slots" aria-hidden="true"><span className="slot" /><span className="slot" /><span className="slot" /></div><p>Opening your planner…</p></div>;
  }
  if (!session) return <Auth />;
  return <Planner key={session.user.id} userId={session.user.id} email={session.user.email || ''} signOut={() => supabase.auth.signOut()} />;
}
