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

## Features (Phase 1)

- **Auth:** Magic link login (no passwords)
- **Admin:** Unit registry (add/edit/deactivate), diesel fund (cycles, payments, balance)
- **Resident portal:** View own diesel status and payment history

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
supabase/
  migrations/     → SQL schema
  seed.sql        → Optional seed data
```
