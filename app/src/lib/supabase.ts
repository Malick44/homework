import { createClient } from '@supabase/supabase-js';
import type { Child, Lesson, Named, Subject } from './types';
import { ratingOf } from './util';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const configError = !url || !anonKey
  ? 'Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. Copy .env.example to .env.local and fill them in.'
  : '';

export const supabase = createClient(url || 'http://localhost', anonKey || 'missing', {
  auth: { persistSession: true, autoRefreshToken: true },
});

// ---- Row mapping (snake_case in Postgres, camelCase in the app) ----

export interface LessonRow {
  id: string; user_id?: string; child_id: string; subject_id: string | null; title: string; skill: string;
  date: string | null; minutes: number; plan: string; steps: unknown; status: string; rating: number;
  spent: number; note: string; done_at: string | null; created_at: number; updated_at: number;
}
export interface NamedRow { id: string; user_id?: string; name: string; color: string; sort_order: number }

export function lessonFromRow(r: LessonRow): Lesson {
  const steps = Array.isArray(r.steps)
    ? (r.steps as { t?: unknown; d?: unknown }[]).filter((s) => s && typeof s.t === 'string').map((s) => ({ t: s.t as string, d: !!s.d }))
    : [];
  return {
    id: r.id,
    childId: r.child_id,
    subjectId: r.subject_id || '',
    title: r.title || 'Untitled lesson',
    skill: r.skill || '',
    date: r.date || '',
    minutes: r.minutes ?? 20,
    plan: r.plan || '',
    steps,
    status: (['planned', 'done', 'skipped'].includes(r.status) ? r.status : 'planned') as Lesson['status'],
    rating: ratingOf(r.rating),
    spent: r.spent ?? 0,
    note: r.note || '',
    doneAt: r.done_at || '',
    createdAt: Number(r.created_at) || 0,
    updatedAt: Number(r.updated_at) || 0,
  };
}

export function lessonToRow(l: Lesson): LessonRow {
  return {
    id: l.id,
    child_id: l.childId,
    subject_id: l.subjectId || null,
    title: l.title,
    skill: l.skill,
    date: l.date || null,
    minutes: l.minutes,
    plan: l.plan,
    steps: l.steps,
    status: l.status,
    rating: l.rating,
    spent: l.spent,
    note: l.note,
    done_at: l.doneAt || null,
    created_at: l.createdAt,
    updated_at: l.updatedAt,
  };
}

export const namedFromRow = (r: NamedRow): Named => ({ id: r.id, name: r.name, color: r.color, order: r.sort_order });
export const namedToRow = (n: Child | Subject): NamedRow => ({ id: n.id, name: n.name, color: n.color, sort_order: n.order });
