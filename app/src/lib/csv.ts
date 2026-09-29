import type { Child, Lesson, Named } from './types';
import { byCreated, cmpStr, RATINGS, statusLabel, todayStr } from './util';

function csvCell(v: unknown) {
  let s = String(v == null ? '' : v);
  if (/^[=+@-]/.test(s)) s = "'" + s; // keep spreadsheets from treating text as a formula
  return /[",\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}

export function downloadLessonsCsv(child: Child, lessons: Lesson[], sub: (id: string) => Named) {
  const list = lessons.slice().sort((a, b) => cmpStr(a.date || '9999', b.date || '9999') || byCreated(a, b));
  const head = ['Date', 'Subject', 'Lesson', 'Skill', 'Status', 'How it went', 'Planned minutes', 'Minutes spent', 'Plan and materials', 'Checklist', 'Notes'];
  const rows = list.map((l) => [
    l.date, sub(l.subjectId).name, l.title, l.skill, statusLabel[l.status], RATINGS[l.rating] || '', l.minutes,
    l.status === 'done' ? l.spent || l.minutes : '', l.plan, l.steps.map((s) => (s.d ? '[x] ' : '[ ] ') + s.t).join('\n'), l.note,
  ]);
  const csv = '﻿' + [head, ...rows].map((r) => r.map(csvCell).join(',')).join('\r\n');
  const filename = `${child.name.replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '') || 'child'}-lessons-${todayStr()}.csv`;
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
}
