# Dataroom UX + Admin Reliability Migration

Apply these changes to a fork of the waller-street-ventures repo to get:

- Contact Settings (schedule URL, phone) in admin for sidebar CTA
- 70ms tab switch delay and nav hover state
- Indented Investment Memo summary
- Simplified Invite tab (email + notify toggle)
- CMS-driven investor nav (reorder/add/title reflect live)
- Reliable Edit Dataroom save for reorder/rename
- Faster admin load (deferred pending-access fetch)

---

## 1. New file: `app/api/admin/pending-access/route.js`

Create this file:

```javascript
import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "../../../../lib/supabase/server";
import { getAccessRequests } from "../../../../lib/access-requests";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const gpEmail = (process.env.GP_EMAIL || "").toLowerCase();
  const isLocalDevBypass = process.env.NODE_ENV === "development" && process.env.LOCAL_DEV_ADMIN_BYPASS === "true";

  if (!isLocalDevBypass && (!user || user.email?.toLowerCase() !== gpEmail)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const serviceClient = createServiceClient();
  const { requests, pendingCount, error } = await getAccessRequests(serviceClient);
  if (error) {
    return NextResponse.json({ error }, { status: 500 });
  }

  return NextResponse.json({ requests, pendingCount });
}
```

---

## 2. `lib/cms/content.js`

**Add** after `TAB_TO_SECTION_SLUG`:

```javascript
const SECTION_SLUG_TO_TAB = Object.fromEntries(
  Object.entries(TAB_TO_SECTION_SLUG).map(([tab, slug]) => [slug, tab])
);
```

**Replace** `getCmsContentByTabs` so it returns `{ orderedSections, byId }` instead of the old tab-keyed object:

```javascript
export async function getCmsContentByTabs({ dealSlug = DEFAULT_DEAL_SLUG, includeHidden = false } = {}) {
  const sections = await getAllSectionsWithBlocks({ dealSlug, includeHidden });
  const orderedSections = sections.map((section) => {
    const knownTabId = SECTION_SLUG_TO_TAB[section.slug] || null;
    const id = knownTabId || section.slug;
    return {
      id,
      knownTabId,
      section,
      blocks: blockArrayToMap(section),
    };
  });

  const byId = orderedSections.reduce((acc, item) => {
    acc[item.id] = item;
    return acc;
  }, {});

  return {
    orderedSections,
    byId,
  };
}
```

**Add** (if missing) `getCmsSectionBySlug`:

```javascript
export async function getCmsSectionBySlug(sectionSlug, { dealSlug = DEFAULT_DEAL_SLUG, includeHidden = false } = {}) {
  const sections = await getAllSectionsWithBlocks({ dealSlug, includeHidden });
  const section = sections.find((item) => item.slug === sectionSlug) || null;
  return section ? { section, blocks: blockArrayToMap(section) } : null;
}
```

---

## 3. `lib/cms/contact.js`

**Replace** the return block in `extractContactSettings`:

```javascript
  const phoneDigits = (byLabel.phone_e164 || byLabel.phone_display || "").replace(/\D/g, "");
  const phoneDisplay = byLabel.phone_display || byLabel.phone_e164 || "";
  return {
    schedule_url: (byLabel.schedule_url || "").trim(),
    phone_display: phoneDisplay,
    phone_e164: phoneDigits,
  };
```

---

## 4. `components/DataRoomClient.js`

**Import change:** Remove `TAB_ORDER` from imports; add `RichTextRenderer`:

```javascript
import { NAV_ITEMS } from "../constants/tabs";
import RichTextRenderer from "./RichTextRenderer";
```

**Add** helper functions and `GenericSection` before the main component:

```javascript
function toShortLabel(label) {
  if (!label) return "";
  return label.length <= 12 ? label : label.split(" ").slice(0, 2).join(" ");
}

function normalizeSections(cmsContent, isMobile) {
  if (Array.isArray(cmsContent?.orderedSections) && cmsContent.orderedSections.length > 0) {
    const sections = isMobile
      ? cmsContent.orderedSections
      : cmsContent.orderedSections.filter((item) => item.knownTabId !== "chat");
    return sections.map((item) => ({
      ...item,
      navLabel: item.section?.title || item.id,
      shortLabel: toShortLabel(item.section?.title || item.id),
    }));
  }

  const base = isMobile ? NAV_ITEMS : NAV_ITEMS.filter((item) => item.id !== "chat");
  return base.map((item) => {
    const section = cmsContent?.[item.id]?.section;
    return {
      id: item.id,
      knownTabId: item.id,
      section,
      blocks: cmsContent?.[item.id]?.blocks || {},
      navLabel: section?.title || item.label,
      shortLabel: section?.title || item.short,
    };
  });
}

function GenericSection({ isMobile, title, bodyHtml }) {
  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: SERIF, fontSize: isMobile ? 40 : 48, lineHeight: 1.05, color: COLORS.text900, margin: "0 0 18px 0", letterSpacing: "-0.01em" }}>
          {title}
        </h1>
        <div style={{ width: 42, height: 4, background: COLORS.green600, borderRadius: 2 }} />
      </div>
      <RichTextRenderer html={bodyHtml} />
    </div>
  );
}
```

**Add state:** `const [hoveredTab, setHoveredTab] = useState(null);`

**Replace** `contactSettings` useMemo to support both old and new CMS shapes:

```javascript
  const contactSettings = useMemo(
    () => {
      const section = Array.isArray(cmsContent?.orderedSections)
        ? cmsContent.orderedSections.find((item) => item.knownTabId === "chat" || item.section?.slug === "contact")
        : null;
      return extractContactSettings(section?.blocks || cmsContent?.chat?.blocks || {});
    },
    [cmsContent]
  );
```

**Replace** `navItems` with `sections` and related derived state:

```javascript
  const sections = useMemo(() => normalizeSections(cmsContent, isMobile), [cmsContent, isMobile]);
  const validTabs = useMemo(() => new Set(sections.map((item) => item.id)), [sections]);
  const sectionById = useMemo(
    () =>
      sections.reduce((acc, item) => {
        acc[item.id] = item;
        return acc;
      }, {}),
    [sections]
  );
  const activeSection = sectionById[activeTab] || sections[0] || null;
```

**Update** `navigate` callback: change `setTimeout` delay from `100` to `70`.

**Update** `blockContent` and `sectionTitle`:

```javascript
  const blockContent = activeSection?.blocks || {};
  const sectionTitle = activeSection?.section?.title;
```

**Update** `renderSection` switch to use `activeSection?.knownTabId || activeTab` and add `default` case that renders `GenericSection`.

**Update** nav buttons (desktop and mobile) to:
- Use `sections` instead of `navItems`
- Add `onMouseEnter={() => setHoveredTab(item.id)}` and `onMouseLeave={() => setHoveredTab(null)}`
- Add hover styling: `showHover ? "rgba(245, 241, 232, 0.09)" : "transparent"` for background, and `showHover ? COLORS.cream50 : COLORS.green300` for color when not active
- Use `item.navLabel` / `item.shortLabel` instead of `item.label` / `item.short`

**Update** `activeTab !== "chat"` check to `activeSection?.knownTabId !== "chat"`.

---

## 5. `components/MemoSection.js`

**Add** `textIndent: 24` to the TLDR paragraph style:

```javascript
<p key={pidx} style={{ ...bodyP, textIndent: 24, marginBottom: pidx < sec.paragraphs.length - 1 ? 20 : 0 }}>{para}</p>
```

---

## 6. `app/admin/page.js`

**Import change:** Replace `getAccessRequests` with `getCmsSectionBySlug`:

```javascript
import { getCmsSectionBySlug } from "../../lib/cms/content";
```

**Replace** the `Promise.all` so it fetches `contactSectionResult` instead of `accessRequestsLegacyResult`:

```javascript
  const [
    pageViewsResult,
    revokedResult,
    allowedResult,
    accessRequestsResult,
    notificationRecipientsResult,
    contactSectionResult,
  ] = await Promise.all([
    // ... existing fetches ...
    getCmsSectionBySlug("contact", { dealSlug, includeHidden: true }),
  ]);
```

**Replace** legacy access request handling:

```javascript
  const accessRequestsLegacy = [];
  const pendingCountLegacy = 0;
```

**Add** before the return:

```javascript
  const contactBlock = (contactSectionResult?.section?.content_blocks || []).find((block) => block.key === "contact") || null;
  const contactSettingsBlock = contactBlock
    ? {
        blockId: contactBlock.id,
        content: contactBlock.content,
        sectionSlug: contactSectionResult?.section?.slug || "contact",
        sectionTitle: contactSectionResult?.section?.title || "Chat with Cam",
        dealSlug,
      }
    : null;
```

**Add** `contactSettingsBlock={contactSettingsBlock}` to `AnalyticsTable` props.

---

## 7. `app/api/admin/invite/route.js`

**Replace** body parsing and insert logic:

```javascript
  const { email, notify = true } = body;
  if (!email || typeof email !== "string" || !email.includes("@")) {
    return NextResponse.json({ error: "Valid email is required" }, { status: 400 });
  }

  const targetEmail = email.trim().toLowerCase();
  const shouldNotify = notify !== false;

  const serviceClient = createServiceClient();

  const { error: insertError } = await serviceClient.from("allowed_emails").insert({
    email: targetEmail,
    source: "admin_added",
  });

  if (insertError) {
    if (insertError.code === "23505") {
      return NextResponse.json({ error: "This email is already on the invite list" }, { status: 409 });
    }
    console.error("[admin/invite] Insert error:", insertError);
    return NextResponse.json({ error: "Failed to add email" }, { status: 500 });
  }

  if (shouldNotify) {
    sendInviteEmail(targetEmail, "invite").catch((err) =>
      console.error("[admin/invite] sendInviteEmail failed:", err?.message)
    );
  }

  return NextResponse.json({ ok: true, notified: shouldNotify });
```

---

## 8. `components/admin/AnalyticsTable.js`

**Add** helper functions after `formatRequestDate`:

```javascript
function upsertContactRows(existingRows, patch) {
  const rows = Array.isArray(existingRows) ? [...existingRows] : [];
  for (const [label, value] of Object.entries(patch)) {
    const idx = rows.findIndex((row) => row?.label === label);
    const nextRow = { ...(idx >= 0 ? rows[idx] : {}), label, value };
    if (idx >= 0) rows[idx] = nextRow;
    else rows.push(nextRow);
  }
  return rows;
}

function readContactValue(rows, label) {
  const row = Array.isArray(rows) ? rows.find((item) => item?.label === label) : null;
  return typeof row?.value === "string" ? row.value : "";
}
```

**Add** `contactSettingsBlock = null` to props.

**Replace** invite-related state:

```javascript
  const [inviteNotify, setInviteNotify] = useState(true);
  // Remove: inviteInvitedByName, inviteInvitedByEmail
  const [legacyRequests, setLegacyRequests] = useState(accessRequests);
  const [legacyPendingCount, setLegacyPendingCount] = useState(pendingCount);
  const [legacyPendingLoaded, setLegacyPendingLoaded] = useState(false);
  const [contactRows, setContactRows] = useState(() => (Array.isArray(contactSettingsBlock?.content) ? contactSettingsBlock.content : []));
  const [scheduleUrl, setScheduleUrl] = useState(() => readContactValue(contactSettingsBlock?.content, "schedule_url"));
  const [phoneDisplay, setPhoneDisplay] = useState(() => readContactValue(contactSettingsBlock?.content, "phone_display"));
  const [phoneE164, setPhoneE164] = useState(() => readContactValue(contactSettingsBlock?.content, "phone_e164"));
  const [contactSaveStatus, setContactSaveStatus] = useState("idle");
  const [contactError, setContactError] = useState(null);
```

**Add** `useEffect` to lazy-fetch pending access:

```javascript
  useEffect(() => {
    if (isMobile || view !== "investors" || legacyPendingLoaded) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/admin/pending-access");
        const data = await res.json().catch(() => ({}));
        if (!res.ok || cancelled) return;
        setLegacyRequests(Array.isArray(data.requests) ? data.requests : []);
        setLegacyPendingCount(Number.isFinite(data.pendingCount) ? data.pendingCount : 0);
        setLegacyPendingLoaded(true);
      } catch {
        // Optional hydration; keep fallback data on failure.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isMobile, view, legacyPendingLoaded]);
```

**Replace** `handleInvite` to send `{ email, notify: inviteNotify }` and remove `invitedByName`/`invitedBy` from the body.

**Add** `handleSaveContact` that calls `/api/admin/content/save` with the contact block changes.

**Replace** all `pendingCount` and `accessRequests` references in the Investors view with `legacyPendingCount` and `legacyRequests`.

**Simplify** Invite form: remove "Invited by (name)" and "Invited by (email, CC)" inputs; add "Send invite email now" checkbox bound to `inviteNotify`.

**Remove** "Invited By" column from the invite list table.

**Add** Contact Settings section at the top of the Settings tab (before "Access Request Notification Emails") with Schedule URL, Phone display, Phone E164 inputs and Save button.

**Update** `InviteCardMobile` to show `formatRequestDate(item.invited_at)` or "Direct invite" instead of `invited_by_name`/`invited_by`.

---

## 9. `components/admin/cms/ContentEditor.js`

**Add** state:

```javascript
  const [baselineSectionOrder, setBaselineSectionOrder] = useState(() =>
    (sections || []).map((section) => section.id)
  );
```

**Update** `hasChanges` to include order changes:

```javascript
    const currentOrder = draftSections.map((section) => section.id);
    if (
      currentOrder.length !== baselineSectionOrder.length ||
      currentOrder.some((id, idx) => id !== baselineSectionOrder[idx])
    ) {
      return true;
    }
```

**Update** `saveChanges` to:
- Detect `orderChanged` and call reorder API before block saves
- Call `setBaselineSectionOrder(currentOrder)` after success

**Replace** `handleSectionDragEnd` to await the reorder API, update `baselineSectionOrder` and `savedAt` on success, revert `draftSections` and show alert on failure.

**Update** `renameSection` to:
- Store `previousTitle` before the API call
- On success: update `baselineSectionTitles`
- On failure: revert the section title in `draftSections` and show alert

---

## Prerequisites

- CMS migration must be run so `content_sections` and `content_blocks` exist.
- The Contact section (slug `contact`) must have a `key_value_table` block with key `contact` containing rows for `schedule_url`, `phone_display`, `phone_e164`. Run `scripts/migrate-existing-content.js` if needed.
- `allowed_emails` table must exist; optional columns `invited_by` and `invited_by_name` are no longer required for the invite flow.

---

## Verification

1. **Investor UI:** Sidebar "Schedule a Call" enabled when URL is set; phone displays; nav tabs have hover state; tab switch feels faster; memo TLDR is indented.
2. **Admin:** Settings → Contact Settings saves and reflects in sidebar; Invite tab adds emails with notify toggle; Investors tab loads without blocking.
3. **Edit Dataroom:** Reorder and rename sections; changes persist and appear in investor nav.
