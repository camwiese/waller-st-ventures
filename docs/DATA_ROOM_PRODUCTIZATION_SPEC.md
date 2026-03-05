# Data Room Productization Spec

## What You Have Today

Your current stack is Next.js 16 on Vercel, Supabase for auth and analytics, Resend for email notifications, and a custom intent-scoring algorithm. The core systems — magic-link authentication, per-tab time tracking, investor intent scoring, real-time GP notifications — are all well-built and genuinely differentiated. Most data room tools don't give founders real-time "this investor just came back for the third time and spent 8 minutes on your financial model" alerts. That's the real value here.

The problem is that all of it is hardcoded to Waller Street Ventures and PST. The deal slug `"pst"` appears across multiple files. FAQ content, the overview letter, financial model assumptions ($25M cap, $35M Series A), your phone number, your calendar link, and email templates are all inline in React components. There's no config layer — the brand *is* the code.

---

## What Needs to Change (The Work)

### Phase 1: Extract Config from Code (8–12 hours)

This is the biggest chunk and the thing that makes everything else possible. Right now, content lives inside JSX. You need to pull it out.

**Create a site config file** — a single `config.js` or JSON file per deployment that holds: company name, founder name, founder email, founder phone, calendar link, deal slug, theme colors, logo path, and Supabase/Resend credentials. Every component that currently says "Waller Street Ventures" or "camwiese@gmail.com" reads from this config instead.

**Move content to markdown or a content directory.** The FAQ section has ~150 lines of hardcoded Q&As. The overview is a personal letter. The memo, primer, and terms are already markdown files, which is good — but the FAQ and overview aren't. Move all content into a `/content` directory with markdown files (or a simple JSON structure) that a client can edit or that you can swap out per deployment. The tab definitions in `/constants/tabs.js` should also become configurable, since not every founder will have the same sections (some won't have a "science" tab, for example).

**Parameterize the financial model.** `ModelSection` has hardcoded dollar amounts. These need to come from config: safe cap, series A pre-money, dilution assumptions, etc. Or you make the model section optional and let clients provide their own spreadsheet/embed.

**Template the email notifications.** The three notification emails (first visit, return visit, high intent) have Waller Street Ventures-specific copy. Create a simple template system that pulls company name, founder name, and admin URL from config.

**Replace the hardcoded deal slug.** `"pst"` is in the tracking API's allowlist, the page route, the admin page filter, and the database queries. This should come from config or from the URL structure.

### Phase 2: Per-Client Deployment Pipeline (4–6 hours)

Once config is extracted, you need a repeatable way to stand up a new instance.

**One Supabase project per client.** This is the simplest approach and keeps data fully isolated. You'd run the SQL schema (which you already have in `supabase-schema.sql`) against a new project, configure auth settings (magic link enabled, redirect URLs), and set up the email template in Supabase's dashboard.

**One Vercel project per client.** Each gets its own Vercel project with environment variables pointing to their Supabase instance, their Resend API key (or yours, if you're managing email), and their config values. You deploy from the same repo but with different env vars.

**Domain setup.** You'd register `dataroom.theirstartup.com` (or `theirstartup.dataroom.site`, or whatever convention you settle on). Point DNS to Vercel. Vercel handles SSL automatically. Budget 30–60 minutes per client for DNS propagation and verification.

**Checklist/script.** Write a setup checklist (or better, a shell script) that: creates the Supabase project, runs the schema, creates the Vercel project, sets env vars, deploys, and configures the domain. This turns a 2-hour manual process into a 30-minute one.

### Phase 3: Hardening for External Use (4–8 hours)

Your current setup works well for you because you understand it. For external clients, some things need to be tighter.

**Auth edge cases.** Magic links work well, but you should handle: expired links gracefully (right now it just fails), rate limiting visibility (tell the user to wait, don't just silently fail), and the 6-digit code fallback needs to be more prominent since some corporate email systems mangle links.

**Error handling on the tracking API.** The `/api/track` endpoint currently does fire-and-forget with `sendBeacon`. If Supabase is down or rate-limited, analytics silently drop. For your own use this is fine. For a paying client, you might want a small retry queue or at minimum logging so you know if data is being lost.

**Admin page polish.** Your admin page works, but it's built for you. A less technical founder will want: clearer labels, maybe a "last 7 days" summary at the top, an explanation of what the intent score means, and probably email-based login to the admin page rather than relying on them knowing which email is the GP_EMAIL.

**Content validation.** If a client gives you bad markdown or forgets a required field in the config, the app shouldn't crash — it should show a fallback or a clear error during build.

---

## Per-Client Setup Process (Once Productized)

Assuming you've done Phases 1–3, here's what onboarding a new client looks like:

1. **Client provides content** (1–2 days, mostly waiting on them): Company name, logo, brand colors, founder bio/letter, FAQ content, memo/terms documents, financial model inputs, investor email list, calendar link, preferred domain.

2. **You set up infrastructure** (~2 hours): Register/configure subdomain, create Supabase project + run schema, create Vercel project + set env vars, populate content directory, deploy, test auth flow end-to-end, test that notifications fire correctly.

3. **Client reviews** (1 day): They log in, check everything looks right, confirm branding, test with a fake investor email.

4. **Go live** (~30 min): Flip DNS to production, send client the admin URL, walk them through the analytics dashboard.

**Total hands-on time per client: ~4–6 hours**, assuming content is ready and no custom feature requests.

---

## Ongoing Maintenance Scope

This is what the "$500/month during fundraise" covers:

- **Content updates.** Founder wants to change an FAQ answer, update the financial model, add a new document. You'd edit the config/content files and redeploy. 15–30 minutes per change.
- **Monitoring.** Check that auth is working, analytics are recording, notifications are firing. Mostly passive — you'd notice if Supabase or Vercel had issues.
- **Investor troubleshooting.** "This investor says they didn't get the magic link." Check OTP attempts table, check spam, maybe resend manually. 10 minutes per incident.
- **Analytics questions.** "Who's been looking at my data room this week?" You could answer this from the admin page, or pull a quick query from Supabase.

Realistically, a client in active fundraise might need 2–4 hours/month of your time. At $500/month that's $125–250/hour for your time, which is reasonable for a high-trust, high-stakes service.

---

## Pricing Thoughts

**Setup fee: $2,000–3,000.** Covers domain registration, infrastructure setup, content integration, testing, and a walkthrough call. Your actual time is 4–6 hours, but you're also selling the system you built and the expertise behind it.

**Monthly during fundraise: $500/month.** Content changes, monitoring, troubleshooting, analytics support. Most months you'll spend 2–4 hours. Some months nearly zero.

**Infrastructure costs you'd pass through or absorb:**

| Item | Cost | Notes |
|------|------|-------|
| Vercel | Free tier likely sufficient | Pro is $20/month if they need more |
| Supabase | Free tier likely sufficient | Pro is $25/month for more storage/auth |
| Resend | Free for 100 emails/day | $20/month for custom domain sending |
| Domain | $10–15/year | If you're buying for them |

So your hard costs per client are $0–65/month. At $500/month, margins are strong.

---

## Things to Watch Out For

**Content is the bottleneck.** The technical setup is the easy part. Getting a founder to actually write their FAQ, finalize their terms, and provide a polished memo is where timelines slip. Set expectations early: "I need all your content before I start, and here's exactly what I need" with a template/checklist.

**Scope creep on "small changes."** A founder in active fundraise will want to tweak things constantly. "Can we change the color?" "Can we add a video section?" "Can we integrate with our CRM?" The $500/month needs to cover reasonable content updates, not feature development. Define this clearly upfront.

**Auth email deliverability.** Magic links going to spam is the #1 support issue you'll hit. Supabase sends auth emails from their domain by default. For a client's custom domain, you'll want to configure a custom SMTP sender (Resend can do this) so emails come from `noreply@theirstartup.com`. This requires DNS records (SPF, DKIM, DMARC) on the client's domain, which adds 30–60 minutes to setup but dramatically improves deliverability.

**Multi-tenant vs. multi-instance.** You're right to do separate Supabase + Vercel projects per client rather than building a multi-tenant system. Multi-tenant would be the "right" engineering choice if you were building a SaaS for 100+ customers, but for 5–10 clients it's massive overengineering. Separate instances mean: complete data isolation (important for fundraising confidentiality), independent scaling, and if one client's Supabase project has issues it doesn't affect anyone else. The tradeoff is that updating the core codebase means redeploying each client separately — but with 5–10 clients, a simple script handles that fine.

**Your own IP in the financial model.** The intent scoring algorithm and the tab-weighted analytics are genuinely clever. If you're deploying this for other people, consider whether you want the code visible (it's currently client-side for the tracking hook). The scoring logic is server-side which is good, but the tracking weights and tab definitions are in the client bundle.

**Supabase auth gotcha.** Each Supabase project has its own auth user pool. An investor who accesses Client A's data room and then Client B's data room would need to do the magic link flow separately for each. This is actually fine and probably desirable (separate access controls), but be aware of it.

**The "less tech-savvy" founder.** The admin/analytics page is currently bare-bones. A non-technical founder is going to want something that feels more polished: a summary at the top ("3 new investors this week, highest intent: jane@vc.com at score 72"), maybe a chart of activity over time, and clear definitions of what everything means. Budget an extra 4–6 hours to make the admin page client-ready.

---

## Total Effort Estimate

| Phase | Hours | Priority |
|-------|-------|----------|
| Extract config from code | 8–12 | Must do first |
| Per-client deployment pipeline | 4–6 | Must do before first client |
| Hardening (auth, errors, admin polish) | 4–8 | Should do before first client |
| Admin page improvements | 4–6 | Should do, can iterate |
| Setup checklist/script | 2–3 | Nice to have, saves time at scale |
| **Total** | **22–35 hours** | |

If you're focused, this is a 1–2 week project to get the platform ready for your first external client. The first client deployment after that should take about half a day.

---

## Recommended Sequence

1. Start with the config extraction — it's the foundation for everything else.
2. Do one "practice" deployment where you spin up a fake client to test the full pipeline.
3. Harden auth and notifications based on what you find in the practice run.
4. Polish the admin page.
5. Write a client onboarding doc (what you need from them, timeline, what they get).
6. Then take on your first real client.

The bones of what you've built are good. The analytics, intent scoring, and notification system are the real product — the rest is just making it repeatable.
