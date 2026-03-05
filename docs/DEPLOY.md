# Waller Street Ventures — Deployment Guide

## 1. Supabase Setup

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to **Authentication > Providers** and:
   - Enable **Email** provider
   - Enable **Magic Links** (OTP)
   - Disable **password** sign-in (uncheck "Enable Email Signup" or set to magic link only)
3. Go to **Authentication > URL Configuration** and set:
   - **Site URL**: `http://localhost:3000` (update to `https://wallerstreetventures.com` for production)
   - **Redirect URLs**: add all of these:
     - `http://localhost:3000/auth/callback`
     - `http://localhost:3000/auth/verify`
     - `https://wallerstreetventures.com/auth/callback`
     - `https://wallerstreetventures.com/auth/verify`
     - `https://your-vercel-domain.vercel.app/auth/callback`
     - `https://your-vercel-domain.vercel.app/auth/verify`
4. Go to **SQL Editor** and run the contents of `supabase-setup.sql`
5. Go to **Settings > API** and copy:
   - **Project URL** (starts with `https://`)
   - **anon public** key
   - **service_role** key (keep this secret)

## 2. Local Development

```bash
# Copy the example env file and fill in your Supabase values
cp .env.local.example .env.local

# Install dependencies
npm install

# Start the dev server
npm run dev
```

Visit `http://localhost:3000`. The homepage shows the Waller Street Ventures logo. Navigate to `/pst` — you'll be redirected to `/login` since you're not authenticated.

To test the full flow:
1. Enter your email on the login page
2. Check your email for the magic link
3. Click the link — you'll be redirected to the deal room at `/pst`
4. Visit `/admin` — only accessible if your email matches `GP_EMAIL` in `.env.local`

## 3. Vercel Deployment

1. Push your code to GitHub
2. Import the repository in [Vercel](https://vercel.com)
3. Add these **Environment Variables** in Vercel project settings:
   - `NEXT_PUBLIC_SUPABASE_URL` — your Supabase project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` — your Supabase anon key
   - `SUPABASE_SERVICE_ROLE_KEY` — your Supabase service role key
   - `GP_EMAIL` — `camwiese@gmail.com`
   - `RESEND_API_KEY` — for investor view notifications (get from resend.com)
   - `AUTH_SENDER_EMAIL` — auth email sender for admin audit (e.g. `hello@wallerstreetventures.com`)
   - (Optional) `NOTIFICATION_EXCLUDE_EMAILS` — comma-separated test emails to exclude (e.g. `cam@worldsfair.co`)
5. Deploy
6. Add `NEXT_PUBLIC_APP_URL` to Vercel env (e.g. `https://wallerstreetventures.com`) so notification emails point to the correct domain.
7. After deployment, go back to **Supabase > Authentication > URL Configuration** and:
   - Update **Site URL** to your production domain (e.g., `https://wallerstreetventures.com`)
   - Add `https://wallerstreetventures.com/auth/verify` and `/auth/callback` to **Redirect URLs** if not already there
8. Update the **Magic Link** email template (see below).

## 4. Email Templates (Magic Link + Confirm Signup)

Supabase sends **Magic Link** for returning users and **Confirm signup** for first-time users. Update both templates so all investors get the same flow.

**Supabase Dashboard > Authentication > Email Templates**

### Magic Link

Replace the default content with:

```html
<div style="font-family: 'Inter', -apple-system, Helvetica, Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 0;">
  <div style="font-family: 'Cormorant', Georgia, serif; font-size: 18px; font-weight: 600; color: #1a3a2a; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 32px;">Waller Street Ventures</div>
  <p style="font-size: 15px; line-height: 1.7; color: #3d3d38; margin: 0 0 20px 0;">Here's your verification code to access the PST data room:</p>
  <div style="font-family: 'SF Mono', 'Fira Code', 'Courier New', monospace; font-size: 32px; font-weight: 700; letter-spacing: 8px; color: #1a3a2a; background: #f9f5ed; border: 1px solid #e2ddd3; border-radius: 6px; padding: 20px 24px; text-align: center; margin: 0 0 28px 0;">{{ .Token }}</div>
  <p style="font-size: 13px; line-height: 1.6; color: #6b6b63; margin: 0 0 8px 0;">Enter this code on the login page. It expires in 10 minutes.</p>
  <p style="font-size: 13px; line-height: 1.7; color: #6b6b63; margin: 28px 0 0 0;">If you have any trouble getting in, reply to this email or text/call Cameron at 360-318-4480.</p>
</div>
```

### Confirm signup (first-time users)

Use the same template (with `type=email` for the token type):

```html
<div style="font-family: 'Inter', -apple-system, Helvetica, Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 0;">
  <div style="font-family: 'Cormorant', Georgia, serif; font-size: 18px; font-weight: 600; color: #1a3a2a; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 32px;">Waller Street Ventures</div>
  <p style="font-size: 15px; line-height: 1.7; color: #3d3d38; margin: 0 0 20px 0;">Here's your verification code to access the PST data room:</p>
  <div style="font-family: 'SF Mono', 'Fira Code', 'Courier New', monospace; font-size: 32px; font-weight: 700; letter-spacing: 8px; color: #1a3a2a; background: #f9f5ed; border: 1px solid #e2ddd3; border-radius: 6px; padding: 20px 24px; text-align: center; margin: 0 0 28px 0;">{{ .Token }}</div>
  <p style="font-size: 13px; line-height: 1.6; color: #6b6b63; margin: 0 0 8px 0;">Enter this code on the login page. It expires in 10 minutes.</p>
  <p style="font-size: 13px; line-height: 1.7; color: #6b6b63; margin: 28px 0 0 0;">If you have any trouble getting in, reply to this email or text/call Cameron at 360-318-4480.</p>
</div>
```

These templates show only the 6-digit code (no magic link button) to avoid the multi-browser rate-limit loop where clicking a magic link in a new tab triggers additional OTP sends.

## 5. Custom Domain (wallerstreetventures.com)

1. In Vercel project settings, go to **Domains** and add `wallerstreetventures.com`
2. Update DNS records per Vercel's instructions (typically an A record and/or CNAME)
3. In Supabase, update:
   - **Site URL** to `https://wallerstreetventures.com`
   - Add `https://wallerstreetventures.com/auth/verify` and `https://wallerstreetventures.com/auth/callback` to **Redirect URLs**

## 6. Admin Email Audit (Existing Projects)

If you already have a deployed project and are adding the email audit feature:

1. Run the migration in **Supabase > SQL Editor** (see Database Migration below)
2. Add `AUTH_SENDER_EMAIL` to Vercel env (e.g. `hello@wallerstreetventures.com`)

### Database Migration

Run this SQL in Supabase SQL Editor for existing projects:

```sql
CREATE TABLE otp_attempts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('sent', 'rate_limited', 'error')),
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
CREATE INDEX idx_otp_attempts_email ON otp_attempts(email);
CREATE INDEX idx_otp_attempts_created ON otp_attempts(created_at DESC);
ALTER TABLE otp_attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access" ON otp_attempts FOR ALL USING (true) WITH CHECK (true);
```

### High Intent Notifications (Intent Score Improvements)

Run this SQL in Supabase SQL Editor if adding the intent score improvements:

```sql
CREATE TABLE high_intent_notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_email TEXT NOT NULL,
  deal_slug TEXT NOT NULL,
  intent_score INTEGER NOT NULL,
  notified_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(user_email, deal_slug)
);
CREATE INDEX idx_high_intent_user_deal ON high_intent_notifications(user_email, deal_slug);
ALTER TABLE high_intent_notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access" ON high_intent_notifications FOR ALL USING (true) WITH CHECK (true);
```

### Access Request Notification Recipients

Run the contents of `supabase-migrations/005_access_request_notification_emails.sql` in Supabase SQL Editor to add configurable notification recipients for access requests. After running, add emails in **Admin > Settings** to receive access request notifications. If none are configured, notifications fall back to `GP_EMAIL`.

### Soft Revoke (revoked_emails)

Run `supabase-migrations/006_revoked_emails.sql` to enable soft revoke. When revoking access, analytics are kept in the database but hidden from the admin display. You can query the data later for reporting.

### Analytics Indexes (optional)

Run `supabase-migrations/007_analytics_indexes.sql` to add indexes that support future analytics features (date range filtering, export, search).

### Resend Email Cache (admin performance)

Run `supabase-migrations/008_resend_email_cache.sql` to add a cache table for Resend delivery status. This avoids calling the Resend API on every admin page load; the cache refreshes every 15 minutes. **Required for the admin page to load quickly.**

## 7. Sending Investor Links

To invite an investor, send them a link with their email pre-filled:

```
https://wallerstreetventures.com/pst?email=investor@example.com
```

The middleware will redirect them to the login page. After they enter their email and click the magic link (or use the 6-digit code if the link expires), they'll have access to the deal room. Their activity (which tabs they view and for how long) will be tracked and visible at `/admin`.
