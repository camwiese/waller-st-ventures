# Waller Street Ventures — Admin Analytics Dashboard Spec

## What We're Already Tracking

The `useTracker` hook fires every time an investor switches tabs or leaves the site. Each event writes a row to the `page_views` table:

```
| user_email         | tab_id   | time_spent_seconds | created_at          |
|--------------------|----------|--------------------|---------------------|
| ryan@gmail.com     | overview | 45                 | 2026-02-19 14:02:00 |
| ryan@gmail.com     | model    | 187                | 2026-02-19 14:02:45 |
| ryan@gmail.com     | memo     | 312                | 2026-02-19 14:05:52 |
| ryan@gmail.com     | terms    | 58                 | 2026-02-19 14:11:04 |
| sarah@company.com  | overview | 22                 | 2026-02-19 15:30:00 |
| sarah@company.com  | model    | 94                 | 2026-02-19 15:30:22 |
```

This means we already have everything we need: who viewed what, for how long, and when. The dashboard just needs to aggregate and display it well.

---

## Dashboard Layout

### Header Bar
```
┌──────────────────────────────────────────────────────────────────┐
│  WALLER STREET VENTURES — Investor Analytics              ← Back to PST    │
│                                                                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────────┐ │
│  │    12    │  │  8h 42m  │  │   4.2    │  │  3 active today  │ │
│  │ Investors│  │Total Time│  │Avg Pages │  │                  │ │
│  └──────────┘  └──────────┘  └──────────┘  └──────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
```

Four summary cards across the top:
- **Total Investors** — unique emails in the system
- **Total Time** — sum of all time_spent_seconds, formatted as hours and minutes
- **Avg Pages per Visit** — average number of distinct tabs viewed per session
- **Active Today** — unique emails with activity in the last 24 hours

---

## View 1: Investor Table (Default View)

The primary view. A table of all investors sorted by intent score (highest first).

```
┌──────────────────────────────────────────────────────────────────┐
│                                                                  │
│  Investor              Visits  Time     Last Active  Intent  ▼   │
│  ═══════════════════════════════════════════════════════════════  │
│                                                                  │
│  ▸ ryan@gmail.com        6    18m 22s   2 hours ago    62        │
│  ▸ sarah@company.com     4    12m 05s   1 day ago      41        │
│  ▸ mike@fund.com         3     8m 33s   3 days ago     28        │
│  ▸ jen@corp.com          1     0m 22s   5 days ago      3        │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

**Columns:**
- **Investor** — email address
- **Visits** — total number of page_view records (each tab switch = 1 visit)
- **Time** — total time_spent_seconds, formatted as "Xm Ys"
- **Last Active** — most recent created_at, shown as relative time
- **Intent** — weighted score (see scoring below)

**Sorting:** Clickable column headers. Default sort: Intent descending.

### Expanded Row (click ▸ to expand)

When you click a row, it expands to show two things: the per-tab breakdown and the visit timeline.

```
│  ▾ ryan@gmail.com        6    18m 22s   2 hours ago    62        │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │                                                            │  │
│  │  Tab Breakdown                                             │  │
│  │                                                            │  │
│  │  Scenario Model   ████████████████████░░░░  5m 12s  (3x)  │  │
│  │  Deal Memo        ██████████████░░░░░░░░░░  4m 08s        │  │
│  │  FAQ              ████████████░░░░░░░░░░░░  3m 45s        │  │
│  │  Deal Terms       ████████░░░░░░░░░░░░░░░░  2m 31s  (2x) │  │
│  │  Science Primer   ██████░░░░░░░░░░░░░░░░░░  1m 52s        │  │
│  │  Exec Summary     ███░░░░░░░░░░░░░░░░░░░░░  0m 44s        │  │
│  │  CEO Interview    ░░░░░░░░░░░░░░░░░░░░░░░░  0m 10s        │  │
│  │                                                            │  │
│  │  Visit Timeline                                            │  │
│  │                                                            │  │
│  │  Feb 19, 2:02 PM — Overview (45s) → Model (3m 07s)        │  │
│  │                     → Memo (5m 12s) → Terms (58s)          │  │
│  │  Feb 18, 9:15 AM — Overview (12s) → Model (2m 05s)        │  │
│  │                     → FAQ (3m 45s)                         │  │
│  │                                                            │  │
│  └────────────────────────────────────────────────────────────┘  │
```

**Tab Breakdown:**
- Horizontal bar chart showing time per tab, sorted by most time spent
- Bar length proportional to the longest tab's time
- The "(3x)" and "(2x)" labels indicate which tabs carry bonus intent weight — this helps Cameron understand the score
- Show total time per tab formatted as "Xm Ys"
- Color: Fern (#3a7d59) for the filled portion, Stone (#e2ddd3) for the empty track

**Visit Timeline:**
- Group page_view records into sessions. A session is a sequence of events from the same user where no gap between consecutive events exceeds 30 minutes.
- For each session, show: date/time, then the sequence of tabs visited with time per tab
- Most recent session first
- This tells Cameron the story: "Ryan came back twice. First visit he just skimmed the model. Second visit he read the full memo and spent 5 minutes on terms — he's getting serious."

---

## View 2: Page Analytics

A secondary view (tab toggle at the top of the dashboard) that flips the lens — instead of "per investor," show "per page."

```
┌──────────────────────────────────────────────────────────────────┐
│  [Investors]  [Page Analytics]                                   │
│                                                                  │
│  Page               Unique Viewers  Avg Time   Total Time        │
│  ════════════════════════════════════════════════════════════════ │
│                                                                  │
│  Scenario Model          9          3m 12s      28m 48s          │
│  Deal Memo               8          4m 45s      38m 00s          │
│  Deal Terms              8          1m 22s      10m 56s          │
│  FAQ                     6          2m 58s      17m 48s          │
│  GP Letter              12          0m 38s       7m 36s          │
│  Science Primer          4          2m 15s       9m 00s          │
│  CEO Interview           3          0m 45s       2m 15s          │
│                                                                  │
│  ────────────────────────────────────────────────────────────    │
│                                                                  │
│  Funnel (of 12 total investors):                                 │
│                                                                  │
│  GP Letter      ████████████████████████████████  12  (100%)     │
│  Deal Terms     ██████████████████████████░░░░░░   8   (67%)     │
│  Scenario Model █████████████████████████░░░░░░░   9   (75%)     │
│  Deal Memo      ██████████████████████████░░░░░░   8   (67%)     │
│  FAQ            ████████████████████░░░░░░░░░░░░   6   (50%)     │
│  Science Primer ████████████████░░░░░░░░░░░░░░░░   4   (33%)     │
│  CEO Interview  ██████████░░░░░░░░░░░░░░░░░░░░░░   3   (25%)     │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

**Table:** For each of the 7 tabs, show unique viewers (distinct emails), average time per viewer, and total cumulative time.

**Funnel chart:** Shows what percentage of total investors made it to each page. This tells Cameron which content is actually getting read and where people drop off. If 12 people open the site but only 4 read the science primer, that's fine — it's deep diligence material. But if only 3 people open the memo, that's a problem.

---

## Intent Scoring Algorithm

The intent score is designed to surface the investors who are most likely to commit. It weights both breadth (how many sections they looked at) and depth (how long they spent on the sections that matter most).

```
Intent Score = (total_visits × 2) + weighted_minutes

Where weighted_minutes = sum of each tab's minutes × tab weight:

  Scenario Model  → 3.0x  (they're running their own numbers = very high intent)
  Deal Terms      → 3.0x  (they're looking at the actual terms = ready to commit)
  Deal Memo       → 2.0x  (they're reading Cameron's thesis = building conviction)
  FAQ             → 1.5x  (they're handling their own objections = moving toward yes)
  Science Primer  → 1.0x  (general diligence)
  Exec Summary    → 1.0x  (entry point, everyone sees this)
  CEO Interview   → 1.0x  (general diligence)
```

**Example:**
Ryan viewed 6 tabs. He spent 5m 12s on the model (3x), 4m 08s on the memo (2x), 2m 31s on terms (3x), 3m 45s on FAQ (1.5x), and smaller amounts on others.

```
visits component:  6 × 2 = 12
model:   5.2 min × 3.0 = 15.6
memo:    4.13 min × 2.0 = 8.3
terms:   2.52 min × 3.0 = 7.6
faq:     3.75 min × 1.5 = 5.6
science: 1.87 min × 1.0 = 1.9
overview:0.73 min × 1.0 = 0.7
interview:0.17 min × 1.0 = 0.2

Intent Score = 12 + 39.9 ≈ 52
```

This score doesn't need to be perfect — it just needs to reliably put the most engaged investors at the top so Cameron calls them first.

---

## Session Detection Logic

Group page_view records into sessions for the visit timeline:

```javascript
function groupIntoSessions(records) {
  // records are sorted by created_at ascending
  const sessions = [];
  let currentSession = [];
  
  for (const record of records) {
    if (currentSession.length === 0) {
      currentSession.push(record);
    } else {
      const lastEvent = currentSession[currentSession.length - 1];
      const gapMinutes = (new Date(record.created_at) - new Date(lastEvent.created_at)) / 60000;
      
      if (gapMinutes > 30) {
        // New session
        sessions.push(currentSession);
        currentSession = [record];
      } else {
        currentSession.push(record);
      }
    }
  }
  
  if (currentSession.length > 0) {
    sessions.push(currentSession);
  }
  
  return sessions.reverse(); // Most recent first
}
```

A 30-minute gap between events starts a new session. This means if Ryan visits at 2pm, leaves, and comes back at 9pm, those show as two separate sessions in the timeline.

---

## Database Schema (No Changes Needed)

The existing `page_views` table supports everything above:

```sql
CREATE TABLE page_views (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_email TEXT NOT NULL,
  deal_slug TEXT NOT NULL,
  tab_id TEXT NOT NULL,
  time_spent_seconds INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
```

All the aggregation (grouping by email, summing time, counting visits, session detection) happens at query time in the server component. No schema changes required.

---

## Optional Future Enhancements (Out of Scope Now)

These are not part of the current build but are worth noting for later:

- **Download tracking:** When you add downloadable files (deck, risk doc, etc.), add a `downloads` table with similar structure. Show download events in the visit timeline.
- **Email notifications:** Alert Cameron when a new investor first accesses the deal room, or when someone with high intent comes back for a second session.
- **Cohort analysis:** Group investors by the week they first accessed, track how cohort engagement changes over time.
- **Link tracking:** Differentiate investors who came from email 1 vs email 2 vs a forwarded link, using UTM params or unique invite codes.
- **Export:** Button to export the investor table as CSV for CRM import.