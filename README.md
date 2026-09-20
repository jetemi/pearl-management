# Estate Management App

A zero-cost estate management app for small residential estates (20–50 units). Manages diesel fund contributions, unit registry, and resident portal.

## Tech Stack

- **Frontend:** Next.js 16, React, Tailwind CSS
- **Backend/DB:** Supabase (Postgres, Auth, RLS)
- **Hosting:** Vercel (free tier)

## Setup

### 1. Create Supabase project

1. Go to [supabase.com](https://supabase.com) and create a project
2. In Project Settings → API, copy the URL and anon key

### 2. Run database migrations

In Supabase Dashboard → SQL Editor, run the migration files in order:
1. `supabase/migrations/001_initial_schema.sql`
2. `supabase/migrations/002_get_user_by_email.sql`
3. `supabase/migrations/003_chairman_role_policy.sql`
4. `supabase/migrations/004_phase2_schema.sql`
5. `supabase/migrations/005_phase4_resident_requests.sql`
6. `supabase/migrations/006_residents_phone_fm_contacts.sql`
7. `supabase/migrations/007_diesel_generator_accounting.sql`
8. `supabase/migrations/008_cbap_schema.sql`

Or with Supabase CLI:

```bash
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
```

### 3. Configure environment

```bash
cp .env.example .env.local
```

Edit `.env.local` and add your Supabase URL and anon key.

### 4. Configure Resend (email)

**Magic link emails (Supabase Auth):**

1. Sign up at [resend.com](https://resend.com) and create an API key
2. In Supabase → **Authentication** → **SMTP Settings**, enable custom SMTP:
   - Host: `smtp.resend.com`
   - Port: `465`
   - Username: `resend`
   - Password: your Resend API key
   - Sender: `onboarding@resend.dev` (testing) or your verified domain

**Bulk emails (new cycle, notices):**

Add `RESEND_API_KEY=re_xxxx` to `.env.local`. The app uses this for bulk emails to residents.

**Optional branding (used in WhatsApp/email messages):**

- `NEXT_PUBLIC_ESTATE_NAME` — e.g. "Sunshine Estate"
- `NEXT_PUBLIC_BANK_DETAILS` — e.g. "GTBank 0123456789 (Estate Account)"

**Phase 4 — resident requests & facility manager:**

- `NEXT_PUBLIC_APP_URL` — canonical site URL for email links and WhatsApp text (e.g. `https://your-app.vercel.app`). Falls back to `VERCEL_URL` on Vercel or `http://localhost:3000` locally.
- Facility manager **emails** come from every `auth.users` account whose `residents.role` is `facility_manager` (RPC `get_facility_manager_emails()`). Each manager gets their own copy of the notification email.
- Facility manager **WhatsApp numbers** come from `residents.phone`, or the linked unit’s `units.phone` if the resident phone is empty (RPC `get_facility_manager_phones()`). Set phones under **Admin → Residents** (chairman). Multiple managers get one green button each when numbers differ.

In Supabase → **Authentication** → **URL configuration**, allow redirect URLs that include query strings (e.g. `http://localhost:3000/auth/callback**`) so magic links preserve the `next` parameter.

### 5. Install and run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### 6. Create first committee member

1. Go to `/login` and sign in with your email (magic link)
2. You'll be redirected to `/` but may see an error — your user exists in `auth.users` but not in `residents`
3. In Supabase SQL Editor, run:

```sql
-- Create a unit first
INSERT INTO units (flat_number, owner_name, phone, email)
VALUES ('A1', 'Treasurer Name', '08012345678', 'your-email@example.com');

-- Link your auth user to the unit as treasurer
INSERT INTO residents (id, unit_id, role)
SELECT
  id,
  (SELECT id FROM units WHERE flat_number = 'A1' LIMIT 1),
  'treasurer'
FROM auth.users
WHERE email = 'your-email@example.com'
ON CONFLICT (id) DO UPDATE SET role = 'treasurer', unit_id = EXCLUDED.unit_id;
```

4. Refresh the app — you should now see the admin dashboard

## Deploy to Vercel

1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com) → New Project → Import your repo
3. Add environment variables from `.env.example`
4. Deploy

### Post-deploy: Run migrations

If you didn't use Supabase CLI, run the migration SQL in Supabase Dashboard → SQL Editor against your production project.

## Features

- **Auth:** Magic link login (no passwords)
- **Admin:** Unit registry (add/edit/deactivate, bulk CSV import, diesel generator on/off per unit), diesel fund (cycles, payments, estate cash pool vs purchases, balance, WhatsApp reminder), service charge, facility tracker, reports, notices, resident requests queue
- **Resident portal:** View own diesel status and payment history; submit facility requests (email + WhatsApp share to FM)
- **Phase 3:** WhatsApp message generator, email reminders (new cycle, overdue, notice broadcast), print-friendly reports, mobile-responsive nav
- **Phase 4:** Resident requests to facility manager, Resend notification emails, WhatsApp deep link, `facility_manager` role with filtered admin nav

## CBAP prep module (`/cbap`)

A self-contained exam-prep track for the IIBA **Certified Business Analysis Professional**
credential. It shares the Supabase auth session but is otherwise detachable — it keys off
`auth.users` directly and never touches `residents` or the estate tables.

### What's in it

| Area | Content |
| --- | --- |
| Knowledge areas | All 6, with purpose, summary, and exam weighting |
| Tasks | All 30 BABOK v3 tasks with inputs, outputs, elements, techniques, and study notes |
| Techniques | 37 techniques mapped to the tasks that use them |
| Question bank | 250 original practice questions, weighted to the official CBAP blueprint |
| Case studies | 7 multi-question scenarios |
| Flashcards | SM-2 spaced repetition |

Question bank distribution follows the CBAP exam blueprint published in the IIBA CBAP
Handbook (RADD 30%, RLCM 15%, SA 15%, BAPM 14%, SE 14%, EC 12%):

```
RADD 75 · RLCM 38 · SA 37 · BAPM 35 · SE 35 · EC 30  =  250
```

### Daily review (`/cbap/daily`)

The core study loop. Each day serves a target number of questions (default 15, adjustable
5–60 on the study plan page). Answering reveals the explanation immediately — right or wrong —
along with the BABOK task the question tests.

Selection is spaced-repetition driven, reusing the same SM-2 engine as the flashcards
(`lib/cbap/srs.ts`):

- **Due reviews first**, ordered by most overdue, then lowest ease, then worst accuracy.
- **At least a third of each day is reserved for new questions** while unseen ones remain,
  so a review backlog can never starve out coverage of the bank.
- **A miss resets the interval to 1 day**; a hit pushes it out along the ease curve. That is
  what makes 250 questions last months rather than 17 days.
- The day's set is **deterministic per user per day** (seeded on user id + date), so
  refreshing does not reshuffle, and a part-finished session resumes where it left off.
- Order within the day is **shuffled across knowledge areas** — the real exam interleaves
  KAs, and mixed practice retains better than blocked practice.

### Content sourcing

The questions are original items written against the *published structure* of BABOK v3 —
knowledge areas, the 30 tasks and their input/output maps, techniques, and the exam blueprint.
The BABOK Guide itself is IIBA copyright, available to members through IIBA KnowledgeHub;
no BABOK text is reproduced here. This module is a drill layer, not a substitute for the
Guide or for accredited training.

To extend the bank, add to the per-KA files in `lib/cbap/content/questions/` — the daily
engine, mock assembler, and blueprint weighting pick up new questions with no other changes.

### Adding questions

```ts
// lib/cbap/content/questions/radd.ts
{
  id: "Q-RADD-076",          // stable; used as the SRS key
  kaId: "RADD",
  taskId: "RADD-2",          // optional — drives the "study this" link
  caseStudyId: "CS-005",     // optional — shows the scenario above the question
  stem: "...",
  options: ["...", "...", "...", "..."],
  correctIndex: 2,
  explanation: "...",        // shown on answer, right or wrong
  difficulty: "medium",
}
```

## Project structure

```
app/
  login/          → Magic link login
  admin/          → Committee dashboard (units, diesel)
  my/             → Resident portal
components/
  units/          → Unit table, add/edit modals
  diesel/         → Diesel fund view, record payment, start cycle
lib/
  supabase/       → Client, server, middleware
  auth.ts         → getCurrentResident, isCommittee
  resend.ts       → Email sending (sendEmail, sendBulkEmails)
  utils.ts        → Balance calculation, formatCurrency
  cbap/           → CBAP prep: content, SRS engine, daily selection, blueprint
    content/      → Knowledge areas, tasks, techniques, flashcards, case studies
      questions/  → Question bank, one file per knowledge area
    srs.ts        → SM-2 spaced repetition
    daily.ts      → Daily set selection + streaks
    exam.ts       → Blueprint-weighted mock assembly
supabase/
  migrations/     → SQL schema
  seed.sql        → Optional seed data
```
