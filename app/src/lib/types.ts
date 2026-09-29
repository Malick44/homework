export type Status = 'planned' | 'done' | 'skipped';
export type Rating = 0 | 1 | 2 | 3;

export interface Step { t: string; d: boolean }

export interface Lesson {
  id: string;
  childId: string;
  subjectId: string;
  title: string;
  skill: string;
  date: string; // YYYY-MM-DD or '' for "no day"
  minutes: number;
  plan: string;
  steps: Step[];
  status: Status;
  rating: Rating;
  spent: number;
  note: string;
  doneAt: string;
  createdAt: number;
  updatedAt: number;
}

export interface Named { id: string; name: string; color: string; order: number }
export type Child = Named;
export type Subject = Named;

export interface Settings { weekStart: 0 | 1 | null }

export type View = 'today' | 'week' | 'lessons' | 'progress';
