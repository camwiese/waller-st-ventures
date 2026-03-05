# FAQ Spec: Grouped Headers, Drag Between Groups, Consolidate

## Overview

The FAQ section is organized under **section headers** (groups). Each group has a title and contains one or more Q&A items. Admins can drag FAQ items between groups, reorder items within groups, reorder the groups themselves, add/remove groups, and consolidate (merge) two groups into one.

---

## 1. Data Model

### 1.1 Structure

The FAQ content block stores a single JSON array of groups, each containing an array of items:

```typescript
interface FAQGroup {
  id: string              // UUID, stable across moves
  title: string           // e.g. "Investment Details"
  order: number           // display order among groups
  items: FAQItem[]
}

interface FAQItem {
  id: string              // UUID, stable across moves
  question: string        // plain text
  answer: string          // HTML (rich text)
  order: number           // display order within this group
}
```

### 1.2 Stored As

The `content` column of the FAQ section's `faq_list` block holds the full structure:

```json
[
  {
    "id": "grp_1",
    "title": "Investment Details",
    "order": 0,
    "items": [
      { "id": "faq_1", "question": "What's the minimum check?", "answer": "<p>$25,000</p>", "order": 0 },
      { "id": "faq_2", "question": "Is there a pro-rata?", "answer": "<p>Yes, all Series A investors...</p>", "order": 1 },
      { "id": "faq_3", "question": "When does the round close?", "answer": "<p>March 31, 2026</p>", "order": 2 }
    ]
  },
  {
    "id": "grp_2",
    "title": "Science & Technology",
    "order": 1,
    "items": [
      { "id": "faq_4", "question": "How does the platform work?", "answer": "<p>Our platform uses...</p>", "order": 0 },
      { "id": "faq_5", "question": "What stage is the trial?", "answer": "<p>Phase 2, with...</p>", "order": 1 }
    ]
  },
  {
    "id": "grp_3",
    "title": "Legal & Compliance",
    "order": 2,
    "items": [
      { "id": "faq_6", "question": "What regulatory approvals?", "answer": "<p>FDA 510(k) for...</p>", "order": 0 }
    ]
  }
]
```

This is a single JSONB value in one `content_blocks` row. The entire FAQ state is saved and versioned atomically — no partial saves, no orphaned items.

---

## 2. Admin Editor UI

### 2.1 Full Layout

```
┌───────────────────────────────────────────────────────────────────┐
│  FAQ                                                              │
│                                                                   │
│  ┌─ Investment Details ──────────────────────────── [Edit] [✕] ─┐│
│  │                                                               ││
│  │  ┌───────────────────────────────────────────────────────┐   ││
│  │  │ ≡  What's the minimum check size?                 ✕  │   ││
│  │  │    $25,000                                            │   ││
│  │  └───────────────────────────────────────────────────────┘   ││
│  │                                                               ││
│  │  ┌───────────────────────────────────────────────────────┐   ││
│  │  │ ≡  Is there a pro-rata?                           ✕  │   ││
│  │  │    Yes, all Series A investors receive...              │   ││
│  │  └───────────────────────────────────────────────────────┘   ││
│  │                                                               ││
│  │  ┌───────────────────────────────────────────────────────┐   ││
│  │  │ ≡  When does the round close?                     ✕  │   ││
│  │  │    March 31, 2026                                     │   ││
│  │  └───────────────────────────────────────────────────────┘   ││
│  │                                                               ││
│  │  [+ Add FAQ item]                                             ││
│  └───────────────────────────────────────────────────────────────┘│
│                                                                   │
│  ┌─ Science & Technology ────────────────────────── [Edit] [✕] ─┐│
│  │                                                               ││
│  │  ┌───────────────────────────────────────────────────────┐   ││
│  │  │ ≡  How does the platform work?                    ✕  │   ││
│  │  │    Our platform uses proprietary...                    │   ││
│  │  └───────────────────────────────────────────────────────┘   ││
│  │                                                               ││
│  │  ┌───────────────────────────────────────────────────────┐   ││
│  │  │ ≡  What stage is the clinical trial?              ✕  │   ││
│  │  │    Phase 2, with results expected...                   │   ││
│  │  └───────────────────────────────────────────────────────┘   ││
│  │                                                               ││
│  │  [+ Add FAQ item]                                             ││
│  └───────────────────────────────────────────────────────────────┘│
│                                                                   │
│  ┌─ Legal & Compliance ─────────────────────────── [Edit] [✕] ─┐│
│  │                                                               ││
│  │  ┌───────────────────────────────────────────────────────┐   ││
│  │  │ ≡  What regulatory approvals are needed?          ✕  │   ││
│  │  │    FDA 510(k) for the initial device...                │   ││
│  │  └───────────────────────────────────────────────────────┘   ││
│  │                                                               ││
│  │  [+ Add FAQ item]                                             ││
│  └───────────────────────────────────────────────────────────────┘│
│                                                                   │
│  ┌──────────────────────┐  ┌────────────────────────────┐        │
│  │  + Add Group          │  │  Consolidate Groups...     │        │
│  └──────────────────────┘  └────────────────────────────┘        │
│                                                                   │
│           ┌──────┐   Last saved 3 min ago by ceo@acme.com        │
│           │ Save │                                                │
│           └──────┘                                                │
│                                                                   │
└───────────────────────────────────────────────────────────────────┘
```

### 2.2 Interactions

**Drag FAQ items between groups:**

Uses `@dnd-kit` with multiple sortable containers. Each group is a droppable zone. Each FAQ item is a draggable/sortable element.

```
Dragging "When does the round close?" from Investment Details
into Science & Technology:

  ┌─ Investment Details ─────────────────────────────────────────┐
  │  ≡  What's the minimum check size?                          │
  │  ≡  Is there a pro-rata?                                    │
  │  ┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄  (item removed)                   │
  └─────────────────────────────────────────────────────────────┘

  ┌─ Science & Technology ───────────────────────────────────────┐
  │  ≡  How does the platform work?                              │
  │  ╔═══════════════════════════════════════════════════════╗   │
  │  ║  ≡  When does the round close?  ← drop indicator     ║   │
  │  ╚═══════════════════════════════════════════════════════╝   │
  │  ≡  What stage is the clinical trial?                        │
  └─────────────────────────────────────────────────────────────┘
```

The drop indicator shows exactly where the item will land. On drop, the item's `id` stays the same — it just moves to the new group and gets a new `order` value.

**Reorder groups:**

Each group header has an implicit drag handle (or a `⋮⋮` grip icon on the left side of the header bar). Dragging a group reorders it relative to other groups. All items within the group move with it.

**Reorder items within a group:**

The `≡` handle on each FAQ item sorts within its parent group, same as before.

### 2.3 Group Operations

**[Edit] on group header:**

Inline-edits the group title. Clicking Edit turns the title into a text input. Press Enter or click away to confirm.

```
┌─ [Investment Details_________] ─────────────── [Done] [✕] ─┐
```

**[✕] on group header (Delete Group):**

Confirmation modal with options for what to do with the items inside:

```
┌──────────────────────────────────────────────┐
│  Delete "Legal & Compliance"?                │
│                                              │
│  This group has 1 FAQ item. What should      │
│  happen to it?                               │
│                                              │
│  ○ Move items to: [Investment Details ▼]     │
│  ○ Delete items too                          │
│                                              │
│  ┌────────┐  ┌──────────────────┐            │
│  │ Cancel │  │ Delete Group     │            │
│  └────────┘  └──────────────────┘            │
└──────────────────────────────────────────────┘
```

If the group is empty, it deletes immediately (no confirmation needed).

**[+ Add Group]:**

Appends a new empty group at the bottom with a placeholder title:

```
┌─ [Untitled Group_____________] ──────────────── [Done] [✕] ─┐
│                                                               │
│  No items yet                                                 │
│  [+ Add FAQ item]                                             │
└───────────────────────────────────────────────────────────────┘
```

Title input is auto-focused so the admin can type immediately.

**[+ Add FAQ item] (within a group):**

Appends a new empty FAQ at the bottom of that group, expanded for editing:

```
┌───────────────────────────────────────────────────────┐
│ ≡  Question:                                      ✕  │
│    ┌─────────────────────────────────────────────┐    │
│    │                                             │    │
│    └─────────────────────────────────────────────┘    │
│                                                       │
│    Answer:                                            │
│    ┌─────────────────────────────────────────────┐    │
│    │ [B] [I] [Link] [UL] [OL]                   │    │
│    ├─────────────────────────────────────────────┤    │
│    │                                             │    │
│    └─────────────────────────────────────────────┘    │
└───────────────────────────────────────────────────────┘
```

**[✕] on FAQ item (Delete Item):**

Removes the item from its group. Brief toast notification with "Undo" (reverts the local state change). Deletion isn't permanent until Save is clicked.

### 2.4 Consolidate Groups

Merges two groups into one. The "Consolidate Groups" button opens a modal:

```
┌──────────────────────────────────────────────────────┐
│  Consolidate Groups                                  │
│                                                      │
│  Merge:     [Science & Technology      ▼]            │
│  Into:      [Investment Details        ▼]            │
│                                                      │
│  This will move all 2 items from                     │
│  "Science & Technology" into                         │
│  "Investment Details" and delete the empty group.    │
│                                                      │
│  Items will be appended at the end.                  │
│  You can reorder them after.                         │
│                                                      │
│  ┌────────┐  ┌───────────────────┐                   │
│  │ Cancel │  │   Consolidate     │                   │
│  └────────┘  └───────────────────┘                   │
└──────────────────────────────────────────────────────┘
```

**What happens on consolidate:**

1. All items from the source group are appended to the destination group (maintaining their relative order, but after the destination's existing items).
2. The source group is deleted.
3. This is all local state until Save is clicked.
4. On save, the changelog records: `"Consolidated 'Science & Technology' (2 items) into 'Investment Details'"`

---

## 3. Drag-and-Drop Implementation

### 3.1 Library: `@dnd-kit`

Use `@dnd-kit/core` + `@dnd-kit/sortable` — it's the most mature React DnD library for nested sortable containers.

### 3.2 Architecture

```
<DndContext>                              ← handles all drag events
│
├── <SortableContext>                     ← group-level sorting (reorder groups)
│   │
│   ├── <GroupContainer id="grp_1">      ← droppable zone
│   │   └── <SortableContext>            ← item-level sorting within group
│   │       ├── <SortableFAQ id="faq_1" />
│   │       ├── <SortableFAQ id="faq_2" />
│   │       └── <SortableFAQ id="faq_3" />
│   │
│   ├── <GroupContainer id="grp_2">
│   │   └── <SortableContext>
│   │       ├── <SortableFAQ id="faq_4" />
│   │       └── <SortableFAQ id="faq_5" />
│   │
│   └── <GroupContainer id="grp_3">
│       └── <SortableContext>
│           └── <SortableFAQ id="faq_6" />
│
└── <DragOverlay>                        ← ghost element while dragging
```

### 3.3 Core Logic

```typescript
// packages/cms/components/FAQEditor.tsx

import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable'

function FAQEditor({ initialGroups, onChangeGroups }) {
  const [groups, setGroups] = useState<FAQGroup[]>(initialGroups)
  const [activeItem, setActiveItem] = useState<FAQItem | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor)
  )

  function handleDragStart(event) {
    const { active } = event
    // Determine if we're dragging a group or an item
    const item = findFAQItem(groups, active.id)
    if (item) setActiveItem(item)
  }

  function handleDragOver(event) {
    const { active, over } = event
    if (!over) return

    const activeGroupId = findGroupContaining(groups, active.id)
    const overGroupId = findGroupContaining(groups, over.id) || over.id

    // If dragging an item over a different group, move it there
    if (activeGroupId && overGroupId && activeGroupId !== overGroupId) {
      setGroups((prev) => {
        const item = findFAQItem(prev, active.id)
        if (!item) return prev

        return prev.map((group) => {
          if (group.id === activeGroupId) {
            // Remove from source
            return {
              ...group,
              items: group.items.filter((i) => i.id !== active.id),
            }
          }
          if (group.id === overGroupId) {
            // Add to destination at the position of the "over" element
            const overIndex = group.items.findIndex((i) => i.id === over.id)
            const insertAt = overIndex >= 0 ? overIndex : group.items.length
            const newItems = [...group.items]
            newItems.splice(insertAt, 0, item)
            return { ...group, items: newItems }
          }
          return group
        })
      })
    }
  }

  function handleDragEnd(event) {
    const { active, over } = event
    setActiveItem(null)
    if (!over) return

    const groupId = findGroupContaining(groups, active.id)
    if (!groupId) return

    // Reorder within the same group
    setGroups((prev) =>
      prev.map((group) => {
        if (group.id !== groupId) return group
        const oldIndex = group.items.findIndex((i) => i.id === active.id)
        const newIndex = group.items.findIndex((i) => i.id === over.id)
        if (oldIndex === -1 || newIndex === -1) return group
        return { ...group, items: arrayMove(group.items, oldIndex, newIndex) }
      })
    )

    // Recalculate order values
    normalizeOrderValues()

    // Notify parent of change
    onChangeGroups(groups)
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      {/* Group-level sortable for reordering groups */}
      <SortableContext items={groups.map(g => g.id)} strategy={verticalListSortingStrategy}>
        {groups.map((group) => (
          <FAQGroupContainer key={group.id} group={group}>
            {/* Item-level sortable within each group */}
            <SortableContext
              items={group.items.map(i => i.id)}
              strategy={verticalListSortingStrategy}
            >
              {group.items.map((item) => (
                <SortableFAQItem key={item.id} item={item} />
              ))}
            </SortableContext>
          </FAQGroupContainer>
        ))}
      </SortableContext>

      {/* Ghost element follows cursor while dragging */}
      <DragOverlay>
        {activeItem && <FAQItemPreview item={activeItem} />}
      </DragOverlay>
    </DndContext>
  )
}
```

### 3.4 Touch + Accessibility

- `PointerSensor` handles mouse and touch.
- `activationConstraint: { distance: 5 }` prevents accidental drags on tap (important for mobile — user needs to move 5px before drag activates).
- `KeyboardSensor` enables reordering with arrow keys for accessibility.
- Each draggable item has `aria-roledescription="sortable"` and announces position changes to screen readers.

---

## 4. Public-Facing FAQ Rendering

The viewer-facing FAQ page renders the grouped structure:

```tsx
// In the dataroom section page

function FAQSection({ groups }: { groups: FAQGroup[] }) {
  return (
    <div className="space-y-10">
      {groups
        .sort((a, b) => a.order - b.order)
        .map((group) => (
          <div key={group.id}>
            <h2 className="text-xl font-semibold mb-4">{group.title}</h2>
            <div className="space-y-2">
              {group.items
                .sort((a, b) => a.order - b.order)
                .map((item) => (
                  <details key={item.id} className="border rounded-lg">
                    <summary className="p-4 cursor-pointer font-medium">
                      {item.question}
                    </summary>
                    <div
                      className="px-4 pb-4 prose"
                      dangerouslySetInnerHTML={{ __html: item.answer }}
                    />
                  </details>
                ))}
            </div>
          </div>
        ))}
    </div>
  )
}
```

Renders as:

```
Investment Details
─────────────────────────────
▸ What's the minimum check size?
▸ Is there a pro-rata?
▸ When does the round close?

Science & Technology
─────────────────────────────
▸ How does the platform work?
▸ What stage is the clinical trial?

Legal & Compliance
─────────────────────────────
▸ What regulatory approvals are needed?
```

---

## 5. Changelog Entries for FAQ Operations

Every FAQ operation generates a specific, descriptive log entry:

| Operation | `action` | `description` Example |
|---|---|---|
| Edit a question or answer | `faq_edit` | Edited FAQ "What's the minimum check?" in Investment Details |
| Add a new item | `faq_add` | Added FAQ "Is there a lockup?" to Investment Details |
| Delete an item | `faq_delete` | Deleted FAQ "Old question" from Legal & Compliance |
| Reorder items within group | `faq_reorder` | Reordered FAQs in Investment Details |
| Move item between groups | `faq_move` | Moved FAQ "Minimum check?" from Legal → Investment Details |
| Add a new group | `group_add` | Added FAQ group "Regulatory" |
| Rename a group | `group_rename` | Renamed FAQ group "Legal" → "Legal & Compliance" |
| Delete a group | `group_delete` | Deleted FAQ group "Misc" (moved 3 items to Investment Details) |
| Reorder groups | `group_reorder` | Reordered FAQ groups |
| Consolidate groups | `group_consolidate` | Consolidated "Science & Technology" (2 items) into "Investment Details" |

The save endpoint diffs the previous FAQ state against the new one to auto-generate these descriptions:

```typescript
// packages/cms/lib/faq-diff.ts

function diffFAQGroups(
  prev: FAQGroup[],
  next: FAQGroup[]
): ChangelogEntry[] {
  const entries: ChangelogEntry[] = []

  const prevGroupMap = new Map(prev.map(g => [g.id, g]))
  const nextGroupMap = new Map(next.map(g => [g.id, g]))

  // Detect added groups
  for (const [id, group] of nextGroupMap) {
    if (!prevGroupMap.has(id)) {
      entries.push({
        action: 'group_add',
        description: `Added FAQ group "${group.title}"`,
      })
    }
  }

  // Detect deleted groups
  for (const [id, group] of prevGroupMap) {
    if (!nextGroupMap.has(id)) {
      entries.push({
        action: 'group_delete',
        description: `Deleted FAQ group "${group.title}"`,
      })
    }
  }

  // Detect renamed groups
  for (const [id, nextGroup] of nextGroupMap) {
    const prevGroup = prevGroupMap.get(id)
    if (prevGroup && prevGroup.title !== nextGroup.title) {
      entries.push({
        action: 'group_rename',
        description: `Renamed FAQ group "${prevGroup.title}" → "${nextGroup.title}"`,
      })
    }
  }

  // Detect group reorder
  const prevGroupOrder = prev.map(g => g.id)
  const nextGroupOrder = next.map(g => g.id)
  if (JSON.stringify(prevGroupOrder) !== JSON.stringify(nextGroupOrder) && entries.length === 0) {
    entries.push({
      action: 'group_reorder',
      description: 'Reordered FAQ groups',
    })
  }

  // Detect item-level changes
  // Build item → group maps for prev and next
  const prevItemGroup = new Map<string, string>()
  const nextItemGroup = new Map<string, string>()
  const prevItems = new Map<string, FAQItem>()
  const nextItems = new Map<string, FAQItem>()

  for (const group of prev) {
    for (const item of group.items) {
      prevItemGroup.set(item.id, group.id)
      prevItems.set(item.id, item)
    }
  }
  for (const group of next) {
    for (const item of group.items) {
      nextItemGroup.set(item.id, group.id)
      nextItems.set(item.id, item)
    }
  }

  // Moved items (different group)
  for (const [itemId, nextGroupId] of nextItemGroup) {
    const prevGroupId = prevItemGroup.get(itemId)
    if (prevGroupId && prevGroupId !== nextGroupId) {
      const item = nextItems.get(itemId)!
      const fromGroup = prevGroupMap.get(prevGroupId)
      const toGroup = nextGroupMap.get(nextGroupId)
      entries.push({
        action: 'faq_move',
        description: `Moved FAQ "${item.question}" from ${fromGroup?.title} → ${toGroup?.title}`,
      })
    }
  }

  // Added items
  for (const [itemId, item] of nextItems) {
    if (!prevItems.has(itemId)) {
      const group = nextGroupMap.get(nextItemGroup.get(itemId)!)
      entries.push({
        action: 'faq_add',
        description: `Added FAQ "${item.question}" to ${group?.title}`,
      })
    }
  }

  // Deleted items
  for (const [itemId, item] of prevItems) {
    if (!nextItems.has(itemId)) {
      const group = prevGroupMap.get(prevItemGroup.get(itemId)!)
      entries.push({
        action: 'faq_delete',
        description: `Deleted FAQ "${item.question}" from ${group?.title}`,
      })
    }
  }

  // Edited items (same id, different question or answer)
  for (const [itemId, nextItem] of nextItems) {
    const prevItem = prevItems.get(itemId)
    if (prevItem && (prevItem.question !== nextItem.question || prevItem.answer !== nextItem.answer)) {
      const group = nextGroupMap.get(nextItemGroup.get(itemId)!)
      entries.push({
        action: 'faq_edit',
        description: `Edited FAQ "${nextItem.question}" in ${group?.title}`,
      })
    }
  }

  return entries
}
```

This runs server-side in the save API route. The admin just hits Save — the backend figures out what changed and logs it automatically.

---

## 6. Seed Data (Updated)

```typescript
const FAQ_GROUPS: FAQGroup[] = [
  {
    id: crypto.randomUUID(),
    title: 'Investment Details',
    order: 0,
    items: [
      { id: crypto.randomUUID(), question: 'What is the minimum check size?', answer: '<p>$25,000</p>', order: 0 },
      { id: crypto.randomUUID(), question: 'Is there a pro-rata?', answer: '<p>Yes, all Series A investors receive pro-rata rights.</p>', order: 1 },
      { id: crypto.randomUUID(), question: 'When does the round close?', answer: '<p>March 31, 2026. Early commitments are encouraged.</p>', order: 2 },
    ],
  },
  {
    id: crypto.randomUUID(),
    title: 'Science & Technology',
    order: 1,
    items: [
      { id: crypto.randomUUID(), question: 'How does the platform work?', answer: '<p>Our platform uses proprietary...</p>', order: 0 },
      { id: crypto.randomUUID(), question: 'What stage is the clinical trial?', answer: '<p>Phase 2, with topline results expected Q4 2026.</p>', order: 1 },
    ],
  },
  {
    id: crypto.randomUUID(),
    title: 'Legal & Compliance',
    order: 2,
    items: [
      { id: crypto.randomUUID(), question: 'What regulatory approvals are needed?', answer: '<p>FDA 510(k) clearance for the initial device configuration.</p>', order: 0 },
    ],
  },
]

// Insert as the faq_list block content
await supabase.from('content_blocks').update({
  content: FAQ_GROUPS,
}).eq('key', 'faqs').eq('section_id', faqSectionId)
```

---

## 7. Edge Cases

| Scenario | Behavior |
|---|---|
| Drag item into empty group | Item becomes the only item, order = 0 |
| Delete last item in a group | Group remains (empty groups are allowed) |
| Delete a group with items | Must choose: move items elsewhere or delete them |
| Consolidate into a group that already has items | Source items appended after destination items |
| Consolidate a group into itself | Dropdown prevents this (source ≠ destination) |
| Save with no changes | Button is disabled (diff detects no changes) |
| Two admins editing at the same time | Last save wins. The changelog shows both saves, so conflicts are visible after the fact. Could add optimistic locking later (version counter on the block) if this becomes a real problem. |
| Group title left blank | Validate on save — require non-empty title |
| FAQ question left blank | Validate on save — require non-empty question. Answers can be empty (sometimes the admin is drafting). |
