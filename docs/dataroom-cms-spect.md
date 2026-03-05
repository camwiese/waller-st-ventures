# Dataroom CMS Spec v2: Performance, Rich Text, Movable FAQs

## Overview

Updated spec addressing three concerns: content must render fast despite being DB-driven, all section content is rich text, and FAQ items can be reordered and moved between sections. Includes an admin-visible changelog.

---

## 1. Performance: Why It Won't Slow Down

The concern is valid — a naive implementation that queries Supabase on every page load would add 100–300ms of latency per request, which kills the snappy feel of a static site. Here's how to avoid that entirely.

### 1.1 Architecture: Build-Time Fetch + On-Demand Revalidation

Content is fetched at **build time** (or first request) and cached as static HTML by Vercel's edge network. The database is only hit when content actually changes.

```
Admin saves content
        │
        ▼
  Supabase updated
        │
        ▼
  API route calls revalidatePath()
        │
        ▼
  Vercel regenerates the static page (background)
        │
        ▼
  Next request gets fresh static HTML from CDN edge

  Time to serve a page view: ~20ms (CDN cache hit)
  Time to reflect an edit: ~2-5 seconds (revalidation)
```

This means:

- **Viewers never wait on a database query.** They get static HTML from Vercel's CDN, same as if the content were hardcoded in JSX.
- **The database is only queried during builds and revalidation.** Not on every page view.
- **Edits appear on the live site within seconds** — not instant, but fast enough that the CEO can hit Save, refresh, and see the change.

### 1.2 Implementation

**Page-level static generation with on-demand revalidation:**

```typescript
// app/dataroom/[section]/page.tsx

import { getRenderedSection } from '@dr/cms'

// This page is statically generated at build time
// and revalidated on-demand when content changes
export const dynamic = 'force-static'

export async function generateStaticParams() {
  const sections = await getAllSectionSlugs()
  return sections.map((slug) => ({ section: slug }))
}

export default async function SectionPage({ params }: { params: { section: string } }) {
  const data = await getRenderedSection(params.section)

  if (!data) return notFound()

  return (
    <article>
      <h1>{data.title}</h1>
      <div
        className="prose prose-lg"
        dangerouslySetInnerHTML={{ __html: data.body }}
      />
      {data.faqs.length > 0 && (
        <FAQAccordion items={data.faqs} />
      )}
    </article>
  )
}
```

**Content fetching with Next.js cache integration:**

```typescript
// packages/cms/lib/content.ts

import { unstable_cache } from 'next/cache'

// Cached fetch — only re-runs when the cache tag is invalidated
export const getRenderedSection = unstable_cache(
  async (slug: string) => {
    const supabase = createServiceClient()

    const { data: section } = await supabase
      .from('content_sections')
      .select(`
        id, slug, title,
        content_blocks!inner (
          id, key, type, content, display_order
        )
      `)
      .eq('slug', slug)
      .eq('is_visible', true)
      .order('display_order', { referencedTable: 'content_blocks' })
      .single()

    if (!section) return null

    // Separate body content from FAQs
    const bodyBlocks = section.content_blocks
      .filter((b) => b.type === 'rich_text')
      .sort((a, b) => a.display_order - b.display_order)

    const faqBlock = section.content_blocks.find((b) => b.type === 'faq_list')

    return {
      title: section.title,
      body: bodyBlocks.map((b) => b.content).join(''),
      faqs: faqBlock ? (faqBlock.content as FAQ[]) : [],
    }
  },
  ['section-content'],  // cache key prefix
  {
    tags: ['content'],   // invalidation tag
    revalidate: 3600,    // fallback: revalidate every hour even without explicit invalidation
  }
)
```

**On-demand revalidation after admin saves:**

```typescript
// In the save API route (app/api/admin/content/save/route.ts)
import { revalidateTag } from 'next/cache'

// After writing changes to DB:
revalidateTag('content')

// This tells Vercel to regenerate ALL pages that depend on the 'content' tag.
// Next page view triggers a background rebuild with fresh data.
```

### 1.3 Performance Budget

| Metric | Target | How |
|---|---|---|
| Page load (viewer) | < 100ms TTFB | Static HTML served from Vercel CDN edge |
| Content update visibility | < 5 seconds | On-demand revalidation after save |
| Admin editor load | < 500ms | Direct Supabase query (admin only, acceptable) |
| Admin save | < 1 second | Direct Supabase write + revalidation trigger |

### 1.4 Fallback: What If the DB Is Down?

Because pages are statically generated, a Supabase outage doesn't affect viewers at all — they get the last-cached version. The admin editor would fail to load or save, but that's acceptable. When Supabase comes back, everything resumes normally.

---

## 2. Content Model: Rich Text Sections + Movable FAQs

### 2.1 Sections

Every section has a single rich text body (the main content) and optionally contains FAQ items. FAQs can be moved between sections.

| Section | Slug | Default Content |
|---|---|---|
| Opening Letter | `opening-letter` | Letter from founders to investors |
| Deal Memo | `deal-memo` | Investment thesis, market opportunity |
| Investment Terms | `investment-terms` | Terms, structure, minimums |
| FAQ | `faq` | General questions (catch-all) |
| Science Primer | `science-primer` | Technical/scientific background |
| Biotech Primer | `biotech-primer` | Biotech-specific context |
| Interview | `interview` | Founder interview transcript or Q&A |

New sections can be added from the admin panel without code changes — they're just rows in `content_sections`.

### 2.2 Simplified Block Model

Since everything is rich text, the content model gets simpler. Each section has exactly two block types:

```
Section: "Deal Memo"
  ├── Block: body (type: rich_text)
  │     └── content: "<h2>Market Opportunity</h2><p>The global market for...</p>"
  │
  └── Block: faqs (type: faq_list)
        └── content: [
              { id: "faq_1", question: "What's the minimum check?", answer: "<p>$25K</p>", order: 0 },
              { id: "faq_2", question: "Is there a pro-rata?", answer: "<p>Yes, for...</p>", order: 1 }
            ]
```

FAQ answers are also rich text (HTML strings), so they support formatting, links, and lists.

### 2.3 FAQ Items Have Stable IDs

Each FAQ item gets a UUID when created. This is what makes cross-section moves trackable:

```typescript
interface FAQItem {
  id: string           // UUID, assigned on creation, never changes
  question: string     // plain text
  answer: string       // HTML (rich text)
  order: number        // display order within this section
}
```

When an FAQ is moved from "Investment Terms" to "FAQ", its `id` stays the same — it's just removed from one section's `faq_list` block and added to another's.

---

## 3. Database Schema (Updated)

### 3.1 `content_sections`

```sql
create table public.content_sections (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  display_order int not null default 0,
  is_visible boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

### 3.2 `content_blocks`

```sql
create table public.content_blocks (
  id uuid primary key default gen_random_uuid(),
  section_id uuid not null references public.content_sections(id) on delete cascade,
  key text not null,                  -- 'body' or 'faqs'
  type text not null,                 -- 'rich_text' or 'faq_list'
  content jsonb not null default '""',
  display_order int not null default 0,
  updated_at timestamptz not null default now(),

  unique(section_id, key)
);
```

### 3.3 `content_changelog`

Renamed from `content_revisions` — this is the admin-visible change log.

```sql
create table public.content_changelog (
  id uuid primary key default gen_random_uuid(),
  block_id uuid references public.content_blocks(id) on delete set null,
  section_slug text not null,         -- denormalized for easy display
  section_title text not null,        -- denormalized
  action text not null,               -- 'edit', 'faq_add', 'faq_delete', 'faq_reorder', 'faq_move'
  description text not null,          -- human-readable, e.g. "Edited Deal Memo body"
  previous_content jsonb,             -- null for adds
  new_content jsonb,                  -- null for deletes
  changed_by uuid not null references auth.users(id),
  changed_by_email text not null,
  changed_at timestamptz not null default now()
);

create index idx_changelog_time on content_changelog(changed_at desc);
create index idx_changelog_section on content_changelog(section_slug, changed_at desc);
```

**Why denormalize section slug/title?** So the changelog remains readable even if a section is renamed or deleted. The log entry says "Edited Deal Memo body" forever, even if the section is later renamed to "Investment Summary."

### 3.4 RLS

```sql
alter table public.content_sections enable row level security;
alter table public.content_blocks enable row level security;
alter table public.content_changelog enable row level security;

-- Viewers can read content (needed for build-time fetch via service role too,
-- but this covers client-side reads)
create policy "Public read sections" on public.content_sections for select using (true);
create policy "Public read blocks" on public.content_blocks for select using (true);

-- Only admins can modify
create policy "Admin update blocks" on public.content_blocks for update
  using (exists (select 1 from public.profiles where id = auth.uid() and is_admin = true));

create policy "Admin manage sections" on public.content_sections for all
  using (exists (select 1 from public.profiles where id = auth.uid() and is_admin = true));

-- Changelog: admins can read, service role inserts
create policy "Admin read changelog" on public.content_changelog for select
  using (exists (select 1 from public.profiles where id = auth.uid() and is_admin = true));
```

---

## 4. Admin Editor UI (Updated)

### 4.1 Layout

```
┌───────────────────────────────────────────────────────────────────┐
│  Content Editor                                          [+ Section] │
│                                                                   │
│  ┌────────────┐┌──────────┐┌─────────────────┐┌─────┐┌────────┐ │
│  │Opening     ││Deal      ││Investment       ││ FAQ ││Science │ │
│  │Letter      ││Memo      ││Terms            ││     ││Primer  │ │
│  └────────────┘└──────┬───┘└─────────────────┘└─────┘└────────┘ │
│                       │                                           │
│  ┌────────────────────▼──────────────────────────────────────┐   │
│  │                                                            │   │
│  │  Deal Memo                                                 │   │
│  │  ─────────────────────────────────────────────────────     │   │
│  │                                                            │   │
│  │  ┌────────────────────────────────────────────────────┐   │   │
│  │  │  [B] [I] [Link] [H2] [H3] [UL] [OL] [Quote]      │   │   │
│  │  ├────────────────────────────────────────────────────┤   │   │
│  │  │                                                    │   │   │
│  │  │  The global market for synthetic biology is        │   │   │
│  │  │  projected to reach $45B by 2030. Our platform     │   │   │
│  │  │  uniquely positions us to capture...               │   │   │
│  │  │                                                    │   │   │
│  │  │  Key Highlights                                    │   │   │
│  │  │  • First mover in regulated pathway X              │   │   │
│  │  │  • 3 granted patents, 7 pending                    │   │   │
│  │  │  • $2.1M ARR, growing 40% QoQ                     │   │   │
│  │  │                                                    │   │   │
│  │  └────────────────────────────────────────────────────┘   │   │
│  │                                                            │   │
│  │           ┌──────┐   Saved 2 min ago by ceo@acme.com      │   │
│  │           │ Save │                                         │   │
│  │           └──────┘                                         │   │
│  │                                                            │   │
│  │  ─────────────────────────────────────────────────────     │   │
│  │                                                            │   │
│  │  Section FAQs                                              │   │
│  │                                                            │   │
│  │  ┌────────────────────────────────────────────────────┐   │   │
│  │  │ ≡  What's the minimum check size?             ✕   │   │   │
│  │  │    Answer: $25,000 with pro-rata rights for...     │   │   │
│  │  │                                    [Move to ▼]     │   │   │
│  │  └────────────────────────────────────────────────────┘   │   │
│  │                                                            │   │
│  │  ┌────────────────────────────────────────────────────┐   │   │
│  │  │ ≡  Is there a SAFE or priced round?           ✕   │   │   │
│  │  │    Answer: This is a priced Series A round...      │   │   │
│  │  │                                    [Move to ▼]     │   │   │
│  │  └────────────────────────────────────────────────────┘   │   │
│  │                                                            │   │
│  │  [+ Add FAQ]                                               │   │
│  │                                                            │   │
│  │           ┌──────────────┐                                 │   │
│  │           │ Save FAQs    │                                 │   │
│  │           └──────────────┘                                 │   │
│  │                                                            │   │
│  └────────────────────────────────────────────────────────────┘   │
│                                                                   │
│  ─────────────────────────────────────────────────────────────── │
│                                                                   │
│  Changelog                                           [Filter ▼]  │
│                                                                   │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  Feb 25, 3:42 PM · ceo@acme.com                           │  │
│  │  Edited Deal Memo body                                     │  │
│  │                                                  [View diff]│  │
│  ├────────────────────────────────────────────────────────────┤  │
│  │  Feb 25, 3:38 PM · ceo@acme.com                           │  │
│  │  Moved FAQ "What's the minimum check?" from FAQ → Deal Memo│  │
│  │                                                  [View diff]│  │
│  ├────────────────────────────────────────────────────────────┤  │
│  │  Feb 25, 2:10 PM · you@company.com                        │  │
│  │  Added FAQ "Is there a lockup period?" to Investment Terms │  │
│  │                                                  [View diff]│  │
│  ├────────────────────────────────────────────────────────────┤  │
│  │  Feb 24, 11:00 AM · you@company.com                       │  │
│  │  Edited Opening Letter body                                │  │
│  │                                                  [View diff]│  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                   │
│  Showing 10 of 47 changes                        [Load more]     │
│                                                                   │
└───────────────────────────────────────────────────────────────────┘
```

### 4.2 Rich Text Editor Config (Tiptap)

Every section body uses the same Tiptap configuration:

```typescript
// packages/cms/components/RichTextEditor.tsx

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'

const editor = useEditor({
  extensions: [
    StarterKit.configure({
      heading: { levels: [2, 3] },   // H1 reserved for section title
      bulletList: {},
      orderedList: {},
      blockquote: {},
      bold: {},
      italic: {},
      // Disable stuff we don't want
      codeBlock: false,
      code: false,
      strike: false,
    }),
    Link.configure({
      openOnClick: false,             // Don't navigate in editor
      HTMLAttributes: { target: '_blank', rel: 'noopener' },
    }),
  ],
  content: initialHtml,
  onUpdate: ({ editor }) => {
    onChange(editor.getHTML())
  },
})
```

**Toolbar buttons:** Bold, Italic, Link, H2, H3, Bullet List, Numbered List, Blockquote. That's it. No font picker, no color, no images inline, no tables. Clean and hard to break.

**FAQ answers** use the same editor but in a compact variant (smaller height, no heading buttons since FAQ answers shouldn't have H2/H3):

```typescript
const faqEditor = useEditor({
  extensions: [
    StarterKit.configure({
      heading: false,
      bold: {},
      italic: {},
      bulletList: {},
      orderedList: {},
    }),
    Link,
  ],
  content: faqAnswerHtml,
})
```

### 4.3 FAQ: Reorder + Move Between Sections

Each FAQ card has two interactions beyond editing:

**Reorder (within section):** Drag handle (`≡`) using `@dnd-kit/sortable`. Dragging updates the `order` field for all items in that section's FAQ list.

**Move to another section:** "Move to" dropdown at the bottom of each FAQ card. Lists all other sections. Selecting one triggers:

```typescript
async function moveFAQ(faqId: string, fromSectionSlug: string, toSectionSlug: string) {
  // 1. Find the FAQ item in the source section's faq_list block
  // 2. Remove it from the source
  // 3. Add it to the destination (appended at the end)
  // 4. Save both blocks in a single API call
  // 5. Log a 'faq_move' changelog entry

  await fetch('/api/admin/content/save', {
    method: 'POST',
    body: JSON.stringify({
      changes: [
        {
          block_id: fromBlock.id,
          previous_content: fromBlock.content,
          new_content: fromFaqsWithout,
          action: 'faq_move',
          description: `Moved FAQ "${faqItem.question}" from ${fromTitle} to ${toTitle}`,
        },
        {
          block_id: toBlock.id,
          previous_content: toBlock.content,
          new_content: toFaqsWith,
          action: 'faq_move',
          description: `Moved FAQ "${faqItem.question}" from ${fromTitle} to ${toTitle}`,
        },
      ],
    }),
  })
}
```

**The move is atomic** — both the source and destination blocks are updated in the same API call, and a single changelog entry describes the move.

The "Move to" dropdown:

```
┌─────────────────────────────────────────────┐
│ ≡  What's the minimum check size?      ✕   │
│    Answer: $25,000 with pro-rata...         │
│                                             │
│    Move to: ┌─────────────────────────┐     │
│             │ Opening Letter          │     │
│             │ Investment Terms     ←  │     │
│             │ FAQ                     │     │
│             │ Science Primer          │     │
│             │ Biotech Primer          │     │
│             │ Interview               │     │
│             └─────────────────────────┘     │
└─────────────────────────────────────────────┘
```

Current section is omitted from the dropdown.

---

## 5. Changelog: Admin-Visible at Bottom of Page

### 5.1 What Gets Logged

| Action | Description Example |
|---|---|
| `edit` | "Edited Deal Memo body" |
| `faq_add` | "Added FAQ 'Is there a lockup?' to Investment Terms" |
| `faq_delete` | "Deleted FAQ 'Old question' from FAQ" |
| `faq_reorder` | "Reordered FAQs in Deal Memo" |
| `faq_move` | "Moved FAQ 'Minimum check?' from FAQ → Deal Memo" |
| `faq_edit` | "Edited FAQ 'Minimum check?' answer in Deal Memo" |
| `section_add` | "Added section 'Appendix'" |
| `section_hide` | "Hid section 'Interview'" |
| `section_reorder` | "Reordered sections" |

### 5.2 Changelog UI

Lives at the bottom of the admin content page, always visible. Shows the 10 most recent changes with a "Load more" button.

**Filter dropdown** lets you filter by section, action type, or user:

```typescript
// packages/cms/components/Changelog.tsx

interface ChangelogProps {
  initialEntries: ChangelogEntry[]
}

export function Changelog({ initialEntries }: ChangelogProps) {
  const [entries, setEntries] = useState(initialEntries)
  const [filter, setFilter] = useState<{
    section?: string
    action?: string
    user?: string
  }>({})
  const [page, setPage] = useState(1)

  async function loadMore() {
    const res = await fetch(
      `/api/admin/content/changelog?page=${page + 1}&section=${filter.section ?? ''}&action=${filter.action ?? ''}`
    )
    const data = await res.json()
    setEntries([...entries, ...data.entries])
    setPage(page + 1)
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h2>Changelog</h2>
        <ChangelogFilter value={filter} onChange={setFilter} />
      </div>

      {entries.map((entry) => (
        <ChangelogRow key={entry.id} entry={entry} />
      ))}

      <button onClick={loadMore}>Load more</button>
    </div>
  )
}
```

**"View diff" button** on each entry opens a modal showing the before/after. For rich text, render both as HTML in a side-by-side or inline diff. For FAQ list changes, show which items were added/removed/moved.

### 5.3 Changelog API

```typescript
// app/api/admin/content/changelog/route.ts

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const page = parseInt(searchParams.get('page') ?? '1')
  const section = searchParams.get('section')
  const action = searchParams.get('action')
  const pageSize = 10

  const supabase = createRouteHandlerClient({ cookies })
  const { data: { user } } = await supabase.auth.getUser()

  // Verify admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single()

  if (!profile?.is_admin) {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  let query = supabase
    .from('content_changelog')
    .select('*')
    .order('changed_at', { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1)

  if (section) query = query.eq('section_slug', section)
  if (action) query = query.eq('action', action)

  const { data: entries } = await query

  return Response.json({ entries, page })
}
```

---

## 6. Save API (Updated)

The save route now handles body edits, FAQ mutations, and FAQ moves in a single request, each producing its own changelog entry.

```typescript
// app/api/admin/content/save/route.ts

import { revalidateTag } from 'next/cache'
import { createClient } from '@supabase/supabase-js'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'

export async function POST(request: Request) {
  const supabase = createRouteHandlerClient({ cookies })
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin, email')
    .eq('id', user.id)
    .single()

  if (!profile?.is_admin) {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { changes } = await request.json()
  // changes: Array<{
  //   block_id: string
  //   previous_content: any
  //   new_content: any
  //   action: string          -- 'edit', 'faq_add', 'faq_move', etc.
  //   description: string     -- human-readable
  //   section_slug: string
  //   section_title: string
  // }>

  const now = new Date().toISOString()

  // Batch: update all blocks and insert all changelog entries
  for (const change of changes) {
    await supabaseAdmin
      .from('content_blocks')
      .update({ content: change.new_content, updated_at: now })
      .eq('id', change.block_id)

    await supabaseAdmin
      .from('content_changelog')
      .insert({
        block_id: change.block_id,
        section_slug: change.section_slug,
        section_title: change.section_title,
        action: change.action,
        description: change.description,
        previous_content: change.previous_content,
        new_content: change.new_content,
        changed_by: user.id,
        changed_by_email: profile.email,
        changed_at: now,
      })
  }

  // Invalidate the content cache so the live site picks up changes
  revalidateTag('content')

  return Response.json({ ok: true, saved_at: now })
}
```

---

## 7. Sanitization + Security

Since we're storing and rendering HTML, sanitization is critical.

### 7.1 Sanitize on Save (Server-Side)

```typescript
// packages/cms/lib/sanitize.ts
import sanitizeHtml from 'sanitize-html'

const ALLOWED = {
  allowedTags: [
    'h2', 'h3', 'p', 'br',
    'strong', 'em', 'a',
    'ul', 'ol', 'li',
    'blockquote',
  ],
  allowedAttributes: {
    a: ['href', 'target', 'rel'],
  },
  // Force safe link attributes
  transformTags: {
    a: (tagName, attribs) => ({
      tagName,
      attribs: {
        ...attribs,
        target: '_blank',
        rel: 'noopener noreferrer',
      },
    }),
  },
}

export function sanitize(html: string): string {
  return sanitizeHtml(html, ALLOWED)
}
```

Run `sanitize()` on every rich text block before writing to the database in the save API route. This strips script tags, iframes, event handlers, and anything else that could be injected.

### 7.2 Render with `prose`

On the frontend, render sanitized HTML inside a `prose` container (Tailwind Typography plugin) for consistent styling:

```tsx
<div
  className="prose prose-lg max-w-none"
  dangerouslySetInnerHTML={{ __html: sanitizedBody }}
/>
```

---

## 8. Adding New Sections (Admin)

Admins can add new sections from the editor via the `[+ Section]` button:

```
┌────────────────────────────────┐
│  Add New Section               │
│                                │
│  Title: ┌─────────────────┐   │
│         │ Regulatory       │   │
│         └─────────────────┘   │
│  Slug:   regulatory            │
│  (auto-generated from title)   │
│                                │
│  ┌────────┐  ┌────────────┐   │
│  │ Cancel │  │   Create   │   │
│  └────────┘  └────────────┘   │
└────────────────────────────────┘
```

Creating a section:
1. Inserts a row into `content_sections` with the next `display_order`.
2. Creates two `content_blocks`: one `rich_text` body and one `faq_list` (empty).
3. Logs a `section_add` changelog entry.
4. The new tab appears immediately in the editor.

Section visibility can be toggled (eye icon on the tab) — hidden sections don't render on the public dataroom but stay in the admin editor.

---

## 9. Seed Script (Updated for Your Sections)

```typescript
// scripts/seed-content.ts

const SECTIONS = [
  {
    slug: 'opening-letter',
    title: 'Opening Letter',
    body: '<p>Dear prospective investors,</p><p>We are excited to share...</p>',
    faqs: [],
  },
  {
    slug: 'deal-memo',
    title: 'Deal Memo',
    body: '<h2>Market Opportunity</h2><p>The global market for...</p>',
    faqs: [
      { question: 'What is the raise amount?', answer: '<p>We are raising...</p>' },
      { question: 'What is the valuation?', answer: '<p>Pre-money valuation of...</p>' },
    ],
  },
  {
    slug: 'investment-terms',
    title: 'Investment Terms',
    body: '<h2>Structure</h2><p>This is a priced Series A round...</p>',
    faqs: [
      { question: 'What is the minimum check size?', answer: '<p>$25,000</p>' },
      { question: 'Is there a pro-rata?', answer: '<p>Yes, all investors receive...</p>' },
    ],
  },
  {
    slug: 'faq',
    title: 'FAQ',
    body: '',
    faqs: [
      { question: 'How do I wire funds?', answer: '<p>Wire instructions will be...</p>' },
      { question: 'When is the deadline?', answer: '<p>The round closes on...</p>' },
    ],
  },
  {
    slug: 'science-primer',
    title: 'Science Primer',
    body: '<h2>The Science</h2><p>Our approach is based on...</p>',
    faqs: [],
  },
  {
    slug: 'biotech-primer',
    title: 'Biotech Primer',
    body: '<h2>Biotech Landscape</h2><p>The biotech industry is undergoing...</p>',
    faqs: [],
  },
  {
    slug: 'interview',
    title: 'Interview',
    body: '<h2>Founder Q&A</h2><p><strong>Q: What inspired you to start this?</strong></p><p>A: I was working in...</p>',
    faqs: [],
  },
]

async function seed() {
  for (let i = 0; i < SECTIONS.length; i++) {
    const s = SECTIONS[i]

    // Create section
    const { data: section } = await supabase
      .from('content_sections')
      .insert({ slug: s.slug, title: s.title, display_order: i })
      .select()
      .single()

    // Create body block
    await supabase.from('content_blocks').insert({
      section_id: section.id,
      key: 'body',
      type: 'rich_text',
      content: s.body,
      display_order: 0,
    })

    // Create FAQ block
    const faqItems = s.faqs.map((f, j) => ({
      id: crypto.randomUUID(),
      question: f.question,
      answer: f.answer,
      order: j,
    }))

    await supabase.from('content_blocks').insert({
      section_id: section.id,
      key: 'faqs',
      type: 'faq_list',
      content: faqItems,
      display_order: 1,
    })
  }

  console.log('Seeded', SECTIONS.length, 'sections')
}
```

---

## 10. Implementation Order

| Phase | What | Effort |
|---|---|---|
| 1 | DB tables, RLS, seed script | Half day |
| 2 | `getRenderedSection()` with `unstable_cache` + revalidation | Half day |
| 3 | Update frontend pages to render from DB (replaces hardcoded JSX) | 1 day |
| 4 | Admin editor: section tabs + Tiptap body editor + Save | 1–2 days |
| 5 | Admin editor: FAQ list with add/delete/reorder | 1 day |
| 6 | FAQ "Move to" cross-section functionality | Half day |
| 7 | Changelog UI at bottom of admin page | Half day |
| 8 | Diff viewer modal for changelog entries | Half day |
| 9 | Add section / hide section from admin | Half day |
| 10 | Extract to `@dr/cms` package in monorepo | Half day |

**Total: ~5–7 days of dev work.**

Phase 1–3 can ship first — the dataroom works exactly as before, just powered by the DB instead of JSX. The admin editor layers on after.
