import { createContext, useContext, type CSSProperties } from 'react';
import type { PlannerData } from '../lib/store';
import type { Child, Lesson, Named, Subject, View } from '../lib/types';

export interface Ctx {
  child: Child | null;
  kids: Child[];
  subjects: Subject[];
  sub: (id: string) => Named;
  /** Lessons for the current child. */
  lessons: Lesson[];
  today: string;
  ws: 0 | 1;
}

export interface Ui {
  view: View;
  childId: string | null;
  weekOffset: number;
  filter: { status: 'upcoming' | 'unscheduled' | 'done' | 'all'; subject: string; q: string };
  listLimit: number;
  range: number;
  showAllSkills: boolean;
  showAllNotes: boolean;
  justStuck: string | null;
}

export interface EditInit { id?: string; date?: string; subjectId?: string; skill?: string; title?: string; minutes?: number; plan?: string; stepsText?: string }
export interface ConfirmInit { title: string; body: string; confirm: string; cancel?: string; danger?: boolean; onConfirm: () => void; back?: SheetState }

export type SheetState =
  | { type: 'detail'; id: string }
  | { type: 'complete'; id: string }
  | { type: 'edit'; init: EditInit }
  | { type: 'settings' }
  | ({ type: 'confirm' } & ConfirmInit);

export interface ToastAction { label: string; fn: () => void }

export interface PlannerApi {
  data: PlannerData;
  ctx: Ctx;
  ui: Ui;
  setUi: (patch: Partial<Ui>) => void;
  nav: (v: View) => void;
  openSheet: (s: SheetState) => void;
  closeSheet: () => void;
  showToast: (msg: string, action?: ToastAction) => void;
  getLesson: (id: string) => Lesson | null;
  updateLesson: (l: Lesson, patch: Partial<Lesson>) => void;
  addSubject: (name: string) => string;
  exportCsv: () => void;
  email: string;
  signOut: () => void;
}

export const PlannerContext = createContext<PlannerApi | null>(null);
export function usePlanner() {
  const v = useContext(PlannerContext);
  if (!v) throw new Error('usePlanner outside PlannerContext');
  return v;
}

/** Set the --c custom property the stylesheet uses for dots, spots and avatars. */
export const cv = (c: string) => ({ ['--c' as string]: c }) as CSSProperties;
