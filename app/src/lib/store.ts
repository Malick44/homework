import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import type { Child, Lesson, Named, Settings, Subject } from './types';
import { lessonFromRow, lessonToRow, namedFromRow, namedToRow, supabase, type LessonRow, type NamedRow } from './supabase';

export interface LessonChange { id: string; next: Lesson | null }

interface Data {
  loaded: boolean;
  children: Map<string, Child>;
  subjects: Map<string, Subject>;
  settings: Settings;
  lessons: Map<string, Lesson>;
}
const empty = (): Data => ({ loaded: false, children: new Map(), subjects: new Map(), settings: { weekStart: null }, lessons: new Map() });

const PAGE = 1000;
async function fetchAll<T>(table: string): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase.from(table).select('*').order('id').range(from, from + PAGE - 1);
    if (error) throw error;
    out.push(...(data as T[]));
    if (!data || data.length < PAGE) return out;
  }
}

/** Keep the newer of two copies of a lesson (last write wins by updatedAt). */
const newer = (cur: Lesson | undefined, next: Lesson) => !cur || next.updatedAt >= cur.updatedAt;

export function usePlannerData(userId: string, onError: (msg: string) => void) {
  const [data, setData] = useState<Data>(empty);
  // Optimistic edits not yet confirmed by the server. value null = pending delete.
  const [pending, setPending] = useState<Map<string, { v: Lesson | null; token: object }>>(new Map());
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;

  const load = useCallback(async () => {
    const [kids, subs, settings, lessons] = await Promise.all([
      fetchAll<NamedRow>('children'),
      fetchAll<NamedRow>('subjects'),
      supabase.from('settings').select('*').maybeSingle(),
      fetchAll<LessonRow>('lessons'),
    ]);
    if (settings.error) throw settings.error;
    setData({
      loaded: true,
      children: new Map(kids.map((r) => [r.id, namedFromRow(r)])),
      subjects: new Map(subs.map((r) => [r.id, namedFromRow(r)])),
      settings: { weekStart: settings.data ? (settings.data.week_start as 0 | 1 | null) : null },
      lessons: new Map(lessons.map((r) => [r.id, lessonFromRow(r)])),
    });
  }, []);

  useEffect(() => {
    let alive = true;
    setData(empty());
    load().catch(() => { if (alive) { onErrorRef.current("Couldn't load your planner. Reload the page to try again."); setData((d) => ({ ...d, loaded: true })); } });

    const named = (key: 'children' | 'subjects') => (p: RealtimePostgresChangesPayload<NamedRow>) => {
      setData((d) => {
        const m = new Map(d[key]);
        if (p.eventType === 'DELETE') { if (p.old.id) m.delete(p.old.id); } else m.set(p.new.id, namedFromRow(p.new));
        return { ...d, [key]: m };
      });
    };
    const channel = supabase
      .channel(`planner-${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'children', filter: `user_id=eq.${userId}` }, named('children'))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'subjects', filter: `user_id=eq.${userId}` }, named('subjects'))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'settings', filter: `user_id=eq.${userId}` }, (p) => {
        const row = p.new as { week_start?: number | null };
        if (p.eventType !== 'DELETE') setData((d) => ({ ...d, settings: { weekStart: (row.week_start ?? null) as 0 | 1 | null } }));
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'lessons', filter: `user_id=eq.${userId}` }, (p) => {
        setData((d) => {
          const m = new Map(d.lessons);
          if (p.eventType === 'DELETE') { const id = (p.old as { id?: string }).id; if (id) m.delete(id); }
          else { const l = lessonFromRow(p.new as LessonRow); if (!newer(m.get(l.id), l)) return d; m.set(l.id, l); }
          return { ...d, lessons: m };
        });
      })
      .subscribe((status) => {
        // After a reconnect, refetch so nothing missed while offline is lost.
        if (status === 'SUBSCRIBED' && alive) load().catch(() => {});
      });

    return () => { alive = false; supabase.removeChannel(channel); };
  }, [userId, load]);

  const lessons = useMemo(() => {
    const m = new Map(data.lessons);
    for (const [id, p] of pending) { if (p.v) m.set(id, p.v); else m.delete(id); }
    return m;
  }, [data.lessons, pending]);

  const commitLessons = useCallback(async (changes: LessonChange[]): Promise<boolean> => {
    if (!changes.length) return true;
    const token = {};
    setPending((prev) => { const m = new Map(prev); for (const c of changes) m.set(c.id, { v: c.next, token }); return m; });
    const clear = () => setPending((prev) => {
      const m = new Map(prev);
      for (const c of changes) { const p = m.get(c.id); if (p && p.token === token) m.delete(c.id); }
      return m;
    });
    const ups = changes.filter((c) => c.next).map((c) => lessonToRow(c.next!));
    const dels = changes.filter((c) => !c.next).map((c) => c.id);
    try {
      if (ups.length) { const { error } = await supabase.from('lessons').upsert(ups); if (error) throw error; }
      if (dels.length) { const { error } = await supabase.from('lessons').delete().in('id', dels); if (error) throw error; }
      setData((d) => {
        const m = new Map(d.lessons);
        for (const c of changes) { if (c.next) { if (newer(m.get(c.id), c.next)) m.set(c.id, c.next); } else m.delete(c.id); }
        return { ...d, lessons: m };
      });
      return true;
    } catch {
      onErrorRef.current("Couldn't save that change. Check your connection and try again.");
      return false;
    } finally {
      clear();
    }
  }, []);

  const saveNamed = useCallback(async (key: 'children' | 'subjects', items: Named[]) => {
    const before = data[key];
    setData((d) => { const m = new Map(d[key]); for (const it of items) m.set(it.id, it); return { ...d, [key]: m }; });
    const { error } = await supabase.from(key).upsert(items.map(namedToRow));
    if (error) {
      setData((d) => ({ ...d, [key]: before }));
      onErrorRef.current("Couldn't save that change. Check your connection and try again.");
      throw error;
    }
  }, [data]);

  const removeNamed = useCallback(async (key: 'children' | 'subjects', id: string) => {
    const before = data;
    setData((d) => {
      const m = new Map(d[key]); m.delete(id);
      const next = { ...d, [key]: m };
      if (key === 'children') next.lessons = new Map(Array.from(d.lessons).filter(([, l]) => l.childId !== id));
      if (key === 'subjects') next.lessons = new Map(Array.from(d.lessons, ([k, l]) => [k, l.subjectId === id ? { ...l, subjectId: '' } : l]));
      return next;
    });
    // Lessons cascade (child) or have subject_id nulled (subject) in the database.
    const { error } = await supabase.from(key).delete().eq('id', id);
    if (error) { setData(before); onErrorRef.current("Couldn't save that change. Check your connection and try again."); }
  }, [data]);

  const setWeekStart = useCallback(async (weekStart: 0 | 1) => {
    setData((d) => ({ ...d, settings: { weekStart } }));
    const { error } = await supabase.from('settings').upsert({ user_id: userId, week_start: weekStart, updated_at: new Date().toISOString() });
    if (error) onErrorRef.current("Couldn't save that change. Check your connection and try again.");
  }, [userId]);

  return { ...data, lessons, commitLessons, saveNamed, removeNamed, setWeekStart };
}

export type PlannerData = ReturnType<typeof usePlannerData>;
