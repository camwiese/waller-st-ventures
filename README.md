# Waller Street Ventures — Data Room Platform

A Next.js data room platform for sharing deal materials with investors. Features magic-link authentication, page view analytics, and admin dashboards.

## Prerequisites

- **Node.js** 18+ and npm
- **Supabase** account ([supabase.com](https://supabase.com))
- **Resend** account ([resend.com](https://resend.com)) — for investor notification emails
- **Git** (to clone the repo)

---

## Quick Start — Build & Run Locally

### 1. Clone and install

```bash
git clone https://github.com/camwiese/waller-street-ventures.git
cd waller-street-ventures
npm install
```

### 2. Set up environment variables

```bash
cp .env.local.example .env.local
```

Edit `.env.local` and fill in your values:

| Variable | Description | Where to get it |
|----------|-------------|-----------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | Supabase → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon/public key | Supabase → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (keep secret) | Supabase → Settings → API |
| `GP_EMAIL` | Your email — only this user can access `/admin` | Your email |
| `RESEND_API_KEY` | API key for sending emails | Resend dashboard |

Optional for local dev:
- `AUTH_SENDER_EMAIL` — used for admin audit filtering
- `NOTIFICATION_EXCLUDE_EMAILS` — comma-separated test emails to exclude from notifications

### 3. Set up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to **Authentication → Providers**:
   - Enable **Email** provider
   - Enable **Magic Links** (OTP)
   - Disable password sign-in (magic link only)
3. Go to **Authentication → URL Configuration**:
   - **Site URL**: `http://localhost:3000`
   - **Redirect URLs**: add `http://localhost:3000/auth/callback` and `http://localhost:3000/auth/verify`
4. Go to **SQL Editor** and run the contents of `supabase-setup.sql`
5. (Optional) Run `supabase-migrations/005_access_request_notification_emails.sql` for access request notifications
6. Go to **Settings → API** and copy the Project URL, anon key, and service_role key into `.env.local`

### 4. Build and run

```bash
npm run build
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### 5. Test the flow

1. Visit `/pst` — you’ll be redirected to `/login` (not authenticated)
2. Enter your email on the login page
3. Check your email for the magic link
4. Click the link → you’ll be redirected to the deal room at `/pst`
5. Visit `/admin` — only accessible if your email matches `GP_EMAIL` in `.env.local`

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server (hot reload) |
| `npm run build` | Build for production |
| `npm run start` | Run production build locally |
| `npm run lint` | Run ESLint |
| `npm run test` | Run tests |

---

## Deployment

For full deployment instructions (Vercel, custom domain, email templates, etc.), see **[DEPLOY.md](./DEPLOY.md)**.

**TL;DR:**
1. Push to GitHub
2. Import repo in [Vercel](https://vercel.com)
3. Add env vars (same as `.env.local`, plus `NEXT_PUBLIC_APP_URL` for production)
4. Deploy
5. Update Supabase Site URL and Redirect URLs to your production domain

---

## Project structure

- `app/` — Next.js App Router pages and API routes
- `components/` — React components
- `lib/` — Utilities (Supabase client, notifications)
- `supabase-setup.sql` — Initial database schema
- `supabase-migrations/` — Optional migrations

---

## Tech stack

- **Next.js 16** (App Router)
- **Supabase** (auth, database)
- **Resend** (transactional email)
- **Vercel** (hosting)
