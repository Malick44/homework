# Home Lessons

A homeschool lesson planner: plan lessons for each child, mark them done with a sticker for how it went, and track progress over time. React + Vite + TypeScript, with Supabase for accounts, storage and live sync across devices.

Converted from the single-file `../home-lessons.html`. The look (CSS) and all behaviour carry over; storage moved from the Claude artifact database / localStorage to Supabase.

## Setup

1. `npm install`
2. Copy `.env.example` to `.env.local` and fill in `VITE_SUPABASE_ANON_KEY`
   (Coolify → project **Supabase** → **home-lessons-supabase** → Environment Variables → `SERVICE_SUPABASEANON_KEY`).
3. Apply the schema once: paste `supabase/migrations/001_init.sql` into Supabase Studio's SQL editor
   (Coolify → home-lessons-supabase → Links → Studio) and run it.
4. `npm run dev` and open http://localhost:5173.

## Starter plans

Settings → Starter plans → **30 days of 3rd-grade writing** adds one lesson per weekday (starting today) for the selected child, under a "Writing" subject it creates if needed. There are six weekly units: sentences and paragraphs, personal narrative, revising and editing, opinion writing, informative reports, and letters/poetry/reflection. Each lesson has a skill (so progress groups on the Progress page), a plan with materials, and a checklist. The content lives in `src/lib/plans/writing-grade3.ts`.

## Supabase

Self-hosted on Coolify (server `luma-dock`), service `home-lessons-supabase`.

- Auth: email + password. Email auto-confirm is on because the instance has no SMTP configured; set the `SMTP_*` variables in Coolify and turn `ENABLE_EMAIL_AUTOCONFIRM` off if you want real confirmation emails.
- When you deploy the frontend, add its URL to `ADDITIONAL_REDIRECT_URLS` / `GOTRUE_SITE_URL` in Coolify.
- A browser page served over HTTPS can't call an `http://` API, so give the Supabase API an HTTPS domain before deploying the frontend.

## Data model

| table      | holds                                                    |
|------------|----------------------------------------------------------|
| `children` | name, colour, order                                      |
| `subjects` | name, colour, order                                      |
| `settings` | week start (Sunday/Monday), one row per user             |
| `lessons`  | title, subject, skill, date, minutes, plan, checklist (jsonb), status, sticker rating, time spent, note |

Every row carries `user_id`, and row-level security limits each account to its own rows. Removing a child deletes their lessons; removing a subject keeps its lessons under "Other". The four tables are in the `supabase_realtime` publication so changes on one device show up on the others.

## Scripts

- `npm run dev`: dev server
- `npm run build`: type-check and build to `dist/`
- `npm run lint`: oxlint
