# Dataroom Auth Spec: 6-Digit OTP + Admin Notifications

## Overview

Replace magic link authentication with a 6-digit email OTP code (Luma-style). Add admin notification emails for new access requests (with approve/deny links) and for every login event.

**Stack:** Next.js on Vercel, Supabase Auth + Database, Supabase Edge Functions (for admin emails).

---

## 1. Auth Flow — User Experience

### 1.1 Screen: Email Entry

Single input screen. No sign-up vs. sign-in distinction — the flow is identical regardless.

```
┌──────────────────────────────────────┐
│                                      │
│   Enter your email                   │
│   ┌────────────────────────────┐     │
│   │ email@example.com          │     │
│   └────────────────────────────┘     │
│   ┌────────────────────────────┐     │
│   │         Continue           │     │
│   └────────────────────────────┘     │
│                                      │
└──────────────────────────────────────┘
```

**Behavior:**
- Client-side email format validation before submit.
- On submit, call `supabase.auth.signInWithOtp({ email })`.
- Show a loading spinner on the button during the request.
- On success, transition to the Code Entry screen.
- On rate limit error, show: "Too many attempts. Please wait a minute and try again."
- Store the email in component state (needed for the verify call).

### 1.2 Screen: Code Entry

```
┌──────────────────────────────────────┐
│                                      │
│   We sent a code to                  │
│   email@example.com                  │
│                                      │
│      ┌─┐ ┌─┐ ┌─┐ ┌─┐ ┌─┐ ┌─┐      │
│      │ │ │ │ │ │ │ │ │ │ │ │      │
│      └─┘ └─┘ └─┘ └─┘ └─┘ └─┘      │
│                                      │
│   ┌────────────────────────────┐     │
│   │          Verify            │     │
│   └────────────────────────────┘     │
│                                      │
│   Resend code (disabled 60s)         │
│   ← Use a different email            │
│                                      │
└──────────────────────────────────────┘
```

**Code Input UX:**
- 6 individual `<input>` elements, each accepting 1 digit, `inputMode="numeric"`, `pattern="[0-9]"`.
- Auto-focus advances to next input on entry.
- Backspace clears current input and moves focus to previous.
- Paste support: detect 6-digit paste, distribute across all inputs.
- Auto-submit when 6th digit is entered.
- Numbers only — reject non-numeric keystrokes.
- On mobile, `inputMode="numeric"` surfaces the number pad.

**Resend Logic:**
- "Resend code" link, disabled with a 60-second countdown timer on initial load.
- After resend, reset the 60-second timer.
- Max 3 resends per email per session. After that: "Please try again later."

**Back Link:**
- "Use a different email" clears state and returns to Email Entry screen.

**Error States:**
- Invalid code: "That code isn't right. Please try again." — clear all inputs, re-focus first.
- Expired code: "This code has expired. We've sent you a new one." — auto-trigger resend.
- Too many attempts: "Too many incorrect attempts. We've sent a new code." — auto-trigger resend.

### 1.3 Post-Verification Routing

After successful `verifyOtp`, Supabase returns a session. The app then checks the user's approval status and routes accordingly.

**Decision tree:**

```
verifyOtp success
  │
  ├── User has profile with is_approved = true
  │     → Redirect to /dataroom (or wherever the main app lives)
  │
  ├── User has profile with is_approved = false
  │     → Show "Pending Approval" screen
  │
  └── User has no profile row (brand new user)
        → Insert profile row with is_approved = false
        → Trigger "New Access Request" admin email (see §3.1)
        → Show "We'll Be In Touch" screen
```

### 1.4 Screen: We'll Be In Touch (New / Unapproved Users)

```
┌──────────────────────────────────────┐
│                                      │
│   ✓  Thanks! We'll be in touch.      │
│                                      │
│   Your request to access the         │
│   dataroom has been received.        │
│   You'll get an email when           │
│   you're approved.                   │
│                                      │
└──────────────────────────────────────┘
```

- No action buttons. Dead end.
- User's session is valid but they cannot access protected routes.
- If they come back and log in again before being approved, they see the same screen.

---

## 2. Auth Flow — Technical Implementation

### 2.1 Supabase Dashboard Configuration

**Authentication → Providers → Email:**
- Email sign-in: Enabled
- Email OTP: Enabled
- Confirm email: Enabled (implicit via OTP)
- Secure email change: Enabled
- `shouldCreateUser`: Will be set to `true` in client call

**Authentication → Email Templates → Magic Link:**

Customize to show code only (remove the magic link URL):

```
Subject: Your dataroom login code: {{ .Token }}

Body:
Your verification code is:

{{ .Token }}

This code expires in 10 minutes. If you didn't request this, you can safely ignore this email.
```

**Authentication → Settings:**
- OTP expiry: 600 seconds (10 minutes)
- Rate limit email sends: 3 per 60 seconds (default)

**Authentication → URL Configuration:**
- Remove redirect URLs that were only needed for magic link callbacks (keep any others you use for password resets, etc.)

### 2.2 Session Configuration

- Access token lifetime: 3600 seconds (1 hour) — default
- Refresh token lifetime: 604800 seconds (1 week)
- Refresh token reuse interval: 10 seconds
- These are configured in Supabase Dashboard → Authentication → Settings

### 2.3 Database Schema

#### `profiles` table

If you already have a profiles table, add the `is_approved` column. If not, create the table:

```sql
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  is_approved boolean not null default false,
  created_at timestamptz not null default now(),
  approved_at timestamptz,
  approved_by uuid references auth.users(id)
);

-- RLS: users can read their own profile
alter table public.profiles enable row level security;

create policy "Users can read own profile"
  on public.profiles for select
  using (auth.uid() = id);

-- Admins can update any profile (you'll need an is_admin flag or a separate admins table)
create policy "Admins can update profiles"
  on public.profiles for update
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and is_admin = true
    )
  );
```

Add `is_admin` column if you don't already have an admin designation:

```sql
alter table public.profiles add column is_admin boolean not null default false;
```

#### `login_events` table

Tracks every login for the admin notification system:

```sql
create table public.login_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  email text not null,
  logged_in_at timestamptz not null default now(),
  ip_address text,
  user_agent text,
  is_first_login boolean not null default false
);

-- RLS: only service role can insert (via Edge Function), admins can read
alter table public.login_events enable row level security;

create policy "Admins can read login events"
  on public.login_events for select
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and is_admin = true
    )
  );
```

### 2.4 Client-Side Code

#### Requesting the OTP

```typescript
// app/login/page.tsx (or wherever your login lives)

async function handleEmailSubmit(email: string) {
  setLoading(true)

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: true,
    },
  })

  if (error) {
    if (error.status === 429) {
      setError('Too many attempts. Please wait a minute and try again.')
    } else {
      setError('Something went wrong. Please try again.')
    }
    setLoading(false)
    return
  }

  setStep('code') // transition to code entry screen
  setLoading(false)
}
```

#### Verifying the OTP

```typescript
async function handleCodeSubmit(code: string) {
  setLoading(true)

  const { data, error } = await supabase.auth.verifyOtp({
    email,
    token: code,
    type: 'email',
  })

  if (error) {
    if (error.message.includes('expired')) {
      setError('This code has expired.')
      await handleResend()
    } else {
      setError("That code isn't right. Please try again.")
      clearCodeInputs()
    }
    setLoading(false)
    return
  }

  // Session is now active. Route based on approval status.
  await handlePostAuth(data.user)
  setLoading(false)
}
```

#### Post-Auth Routing + Login Event Logging

```typescript
async function handlePostAuth(user: User) {
  // 1. Check if profile exists
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_approved')
    .eq('id', user.id)
    .single()

  let isFirstLogin = false

  if (!profile) {
    // 2a. New user — create profile, mark as first login
    isFirstLogin = true
    await supabase.from('profiles').insert({
      id: user.id,
      email: user.email,
      is_approved: false,
    })
  }

  // 3. Log the login event (via API route to capture IP/UA securely)
  await fetch('/api/auth/log-login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      is_first_login: isFirstLogin,
    }),
  })

  // 4. Route
  if (profile?.is_approved) {
    router.push('/dataroom')
  } else {
    router.push('/pending')
  }
}
```

#### Login Logging API Route

Server-side route to capture IP and user agent securely (client can't be trusted for these):

```typescript
// app/api/auth/log-login/route.ts
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies, headers } from 'next/headers'

export async function POST(request: Request) {
  const supabase = createRouteHandlerClient({ cookies })
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const headersList = headers()
  const ip = headersList.get('x-forwarded-for')?.split(',')[0] ?? 'unknown'
  const userAgent = headersList.get('user-agent') ?? 'unknown'

  // Insert login event using service role client
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  await supabaseAdmin.from('login_events').insert({
    user_id: user.id,
    email: user.email,
    logged_in_at: new Date().toISOString(),
    ip_address: ip,
    user_agent: userAgent,
    is_first_login: body.is_first_login ?? false,
  })

  // Trigger admin notification
  await supabaseAdmin.functions.invoke('notify-admin-login', {
    body: {
      user_id: user.id,
      email: user.email,
      ip_address: ip,
      is_first_login: body.is_first_login,
    },
  })

  return Response.json({ ok: true })
}
```

### 2.5 Route Protection Middleware

Protect dataroom routes by checking both session validity and approval status:

```typescript
// middleware.ts
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'

export async function middleware(req) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })
  const { data: { session } } = await supabase.auth.getSession()

  const isProtectedRoute = req.nextUrl.pathname.startsWith('/dataroom')
  const isAuthRoute = req.nextUrl.pathname.startsWith('/login')

  // Not logged in, trying to access protected route
  if (!session && isProtectedRoute) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  // Logged in, trying to access login page
  if (session && isAuthRoute) {
    // Check approval before redirecting
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_approved')
      .eq('id', session.user.id)
      .single()

    if (profile?.is_approved) {
      return NextResponse.redirect(new URL('/dataroom', req.url))
    } else {
      return NextResponse.redirect(new URL('/pending', req.url))
    }
  }

  // Logged in, accessing protected route — verify approval
  if (session && isProtectedRoute) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_approved')
      .eq('id', session.user.id)
      .single()

    if (!profile?.is_approved) {
      return NextResponse.redirect(new URL('/pending', req.url))
    }
  }

  return res
}

export const config = {
  matcher: ['/dataroom/:path*', '/login'],
}
```

---

## 3. Admin Notification Emails

Two types of admin emails, both sent via Supabase Edge Functions using a transactional email service (Resend, Postmark, SendGrid, etc. — Resend is recommended for simplicity on Vercel).

### 3.1 Email Type 1: New Access Request

**Trigger:** A brand new user verifies their OTP for the first time (no existing profile row).

**Recipients:** All users where `profiles.is_admin = true`.

**Subject:** `New dataroom access request: {email}`

**Body:**

```
New access request

{email} is requesting access to the dataroom.

Requested at: {timestamp}
IP address: {ip}

[Approve]  [Deny]
```

**Approve/Deny Links:**

These are signed URLs pointing to an API route on your Vercel app. They contain a JWT or HMAC-signed token so they can't be forged.

```
https://yourdomain.com/api/admin/approve?user_id={id}&token={signed_token}
https://yourdomain.com/api/admin/deny?user_id={id}&token={signed_token}
```

Clicking Approve:
1. Validates the signed token.
2. Updates `profiles` set `is_approved = true`, `approved_at = now()`, `approved_by = admin_id` (if token encodes admin identity, otherwise null).
3. Optionally sends the user an email: "You've been approved! Log in here."
4. Redirects admin to a confirmation page: "✓ {email} has been approved."

Clicking Deny:
1. Validates the signed token.
2. Optionally deletes the user from `auth.users` (via service role) or keeps them with `is_approved = false`.
3. Optionally sends the user an email: "Your request was not approved."
4. Redirects admin to a confirmation page: "✗ {email} has been denied."

### 3.2 Email Type 2: Login Notification

**Trigger:** Every successful OTP verification (first-time and returning users).

**Recipients:** All users where `profiles.is_admin = true`.

**Subject:**
- First login: `🆕 First login: {email}`
- Returning login: `Login: {email}`

**Body:**

```
Login activity

{email} logged in to the dataroom.

Time: {timestamp}
IP address: {ip}
Device: {user_agent_summary}
First login: Yes / No

[View login history]
```

"View login history" links to an admin page in your app (e.g., `/admin/logins`) that queries the `login_events` table.

### 3.3 Edge Function: `notify-admin-login`

```typescript
// supabase/functions/notify-admin-login/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const APP_URL = Deno.env.get('APP_URL')! // e.g. https://yourdomain.com
const SIGNING_SECRET = Deno.env.get('ADMIN_ACTION_SIGNING_SECRET')!

serve(async (req) => {
  const { user_id, email, ip_address, is_first_login } = await req.json()

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

  // Get admin emails
  const { data: admins } = await supabase
    .from('profiles')
    .select('email')
    .eq('is_admin', true)

  if (!admins || admins.length === 0) return new Response('No admins', { status: 200 })

  const adminEmails = admins.map((a) => a.email)
  const timestamp = new Date().toISOString()

  if (is_first_login) {
    // Generate signed approve/deny tokens
    const approveToken = await signAction({ user_id, action: 'approve' })
    const denyToken = await signAction({ user_id, action: 'deny' })

    const approveUrl = `${APP_URL}/api/admin/approve?user_id=${user_id}&token=${approveToken}`
    const denyUrl = `${APP_URL}/api/admin/deny?user_id=${user_id}&token=${denyToken}`

    // Send access request email
    await sendEmail({
      to: adminEmails,
      subject: `New dataroom access request: ${email}`,
      html: `
        <h2>New access request</h2>
        <p><strong>${email}</strong> is requesting access to the dataroom.</p>
        <p>Requested at: ${timestamp}<br/>IP address: ${ip_address}</p>
        <p>
          <a href="${approveUrl}"
             style="background:#22c55e;color:white;padding:10px 24px;
                    border-radius:6px;text-decoration:none;margin-right:12px;">
            Approve
          </a>
          <a href="${denyUrl}"
             style="background:#ef4444;color:white;padding:10px 24px;
                    border-radius:6px;text-decoration:none;">
            Deny
          </a>
        </p>
      `,
    })
  }

  // Send login notification email (every login, including first)
  await sendEmail({
    to: adminEmails,
    subject: is_first_login
      ? `🆕 First login: ${email}`
      : `Login: ${email}`,
    html: `
      <h2>Login activity</h2>
      <p><strong>${email}</strong> logged in to the dataroom.</p>
      <p>
        Time: ${timestamp}<br/>
        IP address: ${ip_address}<br/>
        First login: ${is_first_login ? 'Yes' : 'No'}
      </p>
      <p><a href="${APP_URL}/admin/logins">View login history</a></p>
    `,
  })

  return new Response('OK', { status: 200 })
})

async function sendEmail({ to, subject, html }) {
  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Dataroom <notifications@yourdomain.com>',
      to,
      subject,
      html,
    }),
  })
}

async function signAction(payload) {
  // HMAC-sign the action so approve/deny links can't be forged
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(SIGNING_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const data = encoder.encode(JSON.stringify(payload))
  const sig = await crypto.subtle.sign('HMAC', key, data)
  const token = btoa(JSON.stringify(payload)) + '.' + btoa(String.fromCharCode(...new Uint8Array(sig)))
  return encodeURIComponent(token)
}
```

### 3.4 Approve / Deny API Routes

```typescript
// app/api/admin/approve/route.ts
import { createClient } from '@supabase/supabase-js'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const userId = searchParams.get('user_id')
  const token = searchParams.get('token')

  // Validate the signed token
  const isValid = await verifySignedToken(token, { user_id: userId, action: 'approve' })
  if (!isValid) {
    return new Response('Invalid or expired link', { status: 403 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Approve the user
  await supabase
    .from('profiles')
    .update({
      is_approved: true,
      approved_at: new Date().toISOString(),
    })
    .eq('id', userId)

  // Get user email for confirmation page
  const { data: profile } = await supabase
    .from('profiles')
    .select('email')
    .eq('id', userId)
    .single()

  // Optional: send the user a "you're approved" email here

  // Redirect to confirmation
  return Response.redirect(
    `${process.env.APP_URL}/admin/confirmed?action=approved&email=${profile?.email}`
  )
}
```

```typescript
// app/api/admin/deny/route.ts
// Same structure, but either:
// - Deletes the user: await supabaseAdmin.auth.admin.deleteUser(userId)
// - Or just leaves is_approved = false and logs the denial
```

---

## 4. Environment Variables

Add these to your Vercel project and Supabase Edge Function secrets:

| Variable | Where | Purpose |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Vercel | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Vercel | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Vercel + Edge Function | Admin operations |
| `RESEND_API_KEY` | Edge Function | Sending admin emails |
| `APP_URL` | Vercel + Edge Function | e.g. `https://yourdomain.com` |
| `ADMIN_ACTION_SIGNING_SECRET` | Vercel + Edge Function | HMAC signing for approve/deny links |

Generate the signing secret:
```bash
openssl rand -base64 32
```

---

## 5. Migration Plan

### Phase 1: Database Setup
1. Add `is_approved` and `is_admin` columns to `profiles` (if not present).
2. Create `login_events` table.
3. Set existing users to `is_approved = true` so they aren't locked out.
4. Set yourself (and any other admins) to `is_admin = true`.
5. Apply RLS policies.

### Phase 2: Admin Notification Infrastructure
1. Set up Resend (or your email provider) — verify your domain.
2. Deploy the `notify-admin-login` Edge Function.
3. Create the `/api/admin/approve` and `/api/admin/deny` routes.
4. Create the `/admin/confirmed` page (simple confirmation screen).
5. Test the full approve/deny flow end to end.

### Phase 3: Build OTP Login Flow
1. Build `EmailEntry` and `CodeVerification` components.
2. Wire up `signInWithOtp` and `verifyOtp`.
3. Build the `/pending` (We'll Be In Touch) screen.
4. Add the `/api/auth/log-login` route.
5. Implement the post-auth routing logic.
6. Update Supabase email template to show code only.

### Phase 4: Switch Over
1. Replace the current login page with the new OTP flow.
2. Update `middleware.ts` with approval-aware route protection.
3. Keep the old `/auth/callback` route live for 1 week (in case any magic link emails are still in inboxes).

### Phase 5: Clean Up
1. Remove `/auth/callback` route.
2. Remove `exchangeCodeForSession` logic.
3. Remove PKCE cookie handling.
4. Remove magic link redirect URL config from Supabase dashboard.
5. Remove any "check your email and click the link" UI copy.

---

## 6. What Gets Deleted After Migration

| File / Logic | Why |
|---|---|
| `/auth/callback` route (or `/api/auth/callback`) | No more redirect-based auth |
| `exchangeCodeForSession()` calls | OTP doesn't use PKCE exchange |
| PKCE code verifier cookie handling | No cookies needed for OTP |
| Redirect URL config in Supabase (auth-specific) | No redirects in OTP flow |
| "Check your email and click the link" copy | Replaced with code entry UI |

---

## 7. Testing Checklist

**Auth Flow:**
- [ ] New user enters email → receives code → enters code → sees "We'll Be In Touch"
- [ ] Approved user enters email → receives code → enters code → lands in dataroom
- [ ] Unapproved returning user → sees pending screen
- [ ] Wrong code → error message, inputs cleared
- [ ] Expired code → auto-resend, message shown
- [ ] Rate limiting → appropriate error after too many requests
- [ ] Resend → new code arrives, 60s cooldown enforced
- [ ] "Use a different email" → returns to email entry
- [ ] Paste 6-digit code → auto-distributes and submits
- [ ] Mobile number pad appears on code input

**Admin Notifications:**
- [ ] New user sign-up → admin receives "New access request" email with approve/deny
- [ ] Click Approve → user's `is_approved` flips to true, admin sees confirmation
- [ ] Click Deny → user is denied/deleted, admin sees confirmation
- [ ] Approve link cannot be reused or forged (signed token validation)
- [ ] Every login (first and returning) → admin receives "Login activity" email
- [ ] First login email has 🆕 prefix and "First login: Yes"
- [ ] Login event logged in `login_events` table with IP and user agent

**Session:**
- [ ] Session persists for 1 week without re-login
- [ ] Unapproved user with valid session still can't access /dataroom
- [ ] Expired session redirects to /login
