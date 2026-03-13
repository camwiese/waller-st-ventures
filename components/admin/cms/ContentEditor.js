"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCenter,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  horizontalListSortingStrategy,
  useSortable,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { COLORS } from "../../../constants/theme";
import {
  needsSectionFetch,
  prepareSectionsForEditor,
  sortContentBlocks,
} from "../../../lib/adminContentEditor";
import KeyValueEditor from "./KeyValueEditor";
import TextListEditor from "./TextListEditor";
import FAQEditor from "./FAQEditor";

const RichTextEditor = dynamic(() => import("./RichTextEditor"), {
  ssr: false,
  loading: () => (
    <div
      style={{
        border: `1px solid ${COLORS.border}`,
        borderRadius: 6,
        background: COLORS.white,
        minHeight: 180,
      }}
    />
  ),
});


function clone(data) {
  return JSON.parse(JSON.stringify(data));
}

function humanizeKey(key) {
  return key
    .replace(/^section_/, "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function SortablePill({ id, section, isActive, onSelect, onToggleVisibility }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : section.is_visible ? 1 : 0.55,
        display: "inline-flex",
        alignItems: "center",
        border: isActive ? `1px solid ${COLORS.green800}` : `1px solid ${COLORS.border}`,
        borderRadius: 3,
        overflow: "hidden",
        background: isActive ? COLORS.green100 : COLORS.white,
      }}
    >
      <span
        {...attributes}
        {...listeners}
        style={{
          cursor: isDragging ? "grabbing" : "grab",
          padding: "8px 2px 8px 10px",
          fontSize: 14,
          color: COLORS.text400,
          lineHeight: 1,
          display: "flex",
          alignItems: "center",
        }}
        title="Drag to reorder"
      >
        ⠿
      </span>
      <button
        type="button"
        onClick={onSelect}
        style={{
          border: "none",
          background: "transparent",
          color: COLORS.text900,
          padding: "8px 8px 8px 4px",
          fontSize: 13,
          cursor: "pointer",
          whiteSpace: "nowrap",
        }}
      >
        {section.title}
      </button>
      <button
        type="button"
        onClick={onToggleVisibility}
        style={{
          border: "none",
          borderLeft: `1px solid ${COLORS.border}`,
          padding: "6px 10px",
          background: "transparent",
          cursor: "pointer",
          fontSize: 12,
          color: COLORS.text500,
        }}
        title={section.is_visible ? "Hide section" : "Show section"}
      >
        {section.is_visible ? "Hide" : "Show"}
      </button>
    </div>
  );
}

export default function ContentEditor({
  dealSlug,
  sections,
  currentUserEmail,
}) {
  const [draftSections, setDraftSections] = useState(() =>
    prepareSectionsForEditor(sections || [])
  );
  const [activeSectionId, setActiveSectionId] = useState(() => draftSections[0]?.id || null);
  const [loadingSectionId, setLoadingSectionId] = useState(null);
  const [isMobile, setIsMobile] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState(null);
  const [creatingSection, setCreatingSection] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [baselineByBlockId, setBaselineByBlockId] = useState(() => {
    const map = new Map();
    (sections || []).forEach((section) => {
      (section.content_blocks || []).forEach((block) =>
        map.set(block.id, clone(block.content))
      );
    });
    return map;
  });
  const [baselineSectionTitles, setBaselineSectionTitles] = useState(() => {
    const map = new Map();
    (sections || []).forEach((section) => map.set(section.id, section.title));
    return map;
  });
  const [baselineSectionOrder, setBaselineSectionOrder] = useState(() =>
    (sections || []).map((section) => section.id)
  );
  const [dirtyBlockIds, setDirtyBlockIds] = useState(new Set());
  const [dirtySectionIds, setDirtySectionIds] = useState(new Set());

  const draftSectionsRef = useRef(draftSections);
  useEffect(() => { draftSectionsRef.current = draftSections; }, [draftSections]);

  const activeSection =
    draftSections.find((s) => s.id === activeSectionId) || draftSections[0];
  const activeBlocks = Array.isArray(activeSection?.content_blocks)
    ? activeSection.content_blocks
    : [];

  const sectionSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 820px)");
    const handleChange = (e) => setIsMobile(e.matches);
    setIsMobile(mq.matches);
    mq.addEventListener("change", handleChange);
    return () => mq.removeEventListener("change", handleChange);
  }, []);

  const loadSectionBlocks = useCallback(async (sectionId) => {
    const section = draftSectionsRef.current.find((s) => s.id === sectionId);
    if (!needsSectionFetch(sectionId, section)) return;

    setLoadingSectionId(sectionId);
    try {
      const res = await fetch(
        `/api/admin/content/sections/${encodeURIComponent(sectionId)}?dealSlug=${encodeURIComponent(dealSlug)}`
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || "Failed to load section content");
      }
      const blocks = sortContentBlocks(data?.section?.content_blocks) || [];
      setDraftSections((prev) =>
        prev.map((s) => (s.id === sectionId ? { ...s, content_blocks: blocks } : s))
      );
      setBaselineByBlockId((prev) => {
        const next = new Map(prev);
        for (const block of blocks) {
          if (!next.has(block.id)) next.set(block.id, clone(block.content));
        }
        return next;
      });
    } catch (error) {
      window.alert(error.message);
    } finally {
      setLoadingSectionId(null);
    }
  }, [dealSlug]);

  useEffect(() => {
    if (activeSectionId) {
      loadSectionBlocks(activeSectionId);
    }
  }, [activeSectionId, loadSectionBlocks]);

  useEffect(() => {
    if (!draftSections.length) return;
    const exists = draftSections.some((section) => section.id === activeSectionId);
    if (!exists) {
      setActiveSectionId(draftSections[0].id);
    }
  }, [draftSections, activeSectionId]);

  const updateBlockContent = (blockId, content) => {
    setDraftSections((prev) =>
      prev.map((section) => ({
        ...section,
        content_blocks: (section.content_blocks || []).map((block) =>
          block.id === blockId ? { ...block, content } : block
        ),
      }))
    );
    setDirtyBlockIds((prev) => {
      const next = new Set(prev);
      const baseline = baselineByBlockId.get(blockId);
      const isDirty = JSON.stringify(content) !== JSON.stringify(baseline);
      if (isDirty) next.add(blockId);
      else next.delete(blockId);
      return next;
    });
  };

  const hasChanges = useMemo(() => {
    const currentOrder = draftSections.map((section) => section.id);
    const orderChanged =
      currentOrder.length !== baselineSectionOrder.length ||
      currentOrder.some((id, idx) => id !== baselineSectionOrder[idx]);
    return orderChanged || dirtyBlockIds.size > 0 || dirtySectionIds.size > 0;
  }, [draftSections, baselineSectionOrder, dirtyBlockIds, dirtySectionIds]);

  useEffect(() => {
    const warning = "You have unsaved changes. Leave this page anyway?";

    const handleBeforeUnload = (event) => {
      if (!hasChanges) return;
      event.preventDefault();
      event.returnValue = warning;
    };

    const handleDocumentClick = (event) => {
      if (!hasChanges) return;
      const anchor = event.target?.closest?.("a[href]");
      if (!anchor) return;
      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#")) return;
      const target = anchor.getAttribute("target");
      if (target && target !== "_self") return;
      if (!window.confirm(warning)) {
        event.preventDefault();
        event.stopPropagation();
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    document.addEventListener("click", handleDocumentClick, true);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      document.removeEventListener("click", handleDocumentClick, true);
    };
  }, [hasChanges]);

  const saveChanges = async () => {
    setSaving(true);
    try {
      const currentOrder = draftSections.map((section) => section.id);
      const orderChanged =
        currentOrder.length !== baselineSectionOrder.length ||
        currentOrder.some((id, idx) => id !== baselineSectionOrder[idx]);

      if (orderChanged) {
        const reorderRes = await fetch("/api/admin/content/sections", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "reorder",
            dealSlug,
            orderedSectionIds: currentOrder,
          }),
        });
        const reorderData = await reorderRes.json().catch(() => ({}));
        if (!reorderRes.ok) {
          throw new Error(reorderData?.error || "Failed to reorder sections");
        }
      }

      const sectionRenames = [];
      const changes = [];
      for (const section of draftSections) {
        if (dirtySectionIds.has(section.id)) {
          sectionRenames.push({ sectionId: section.id, title: section.title });
        }
        for (const block of section.content_blocks || []) {
          if (!dirtyBlockIds.has(block.id)) continue;
          const previous = baselineByBlockId.get(block.id);
          changes.push({
            block_id: block.id,
            previous_content: previous,
            new_content: block.content,
            action: block.type === "faq_list" ? "faq_edit" : "edit",
            description: `Edited ${section.title} ${block.key}`,
            section_slug: section.slug,
            section_title: section.title,
          });
        }
      }

      for (const rename of sectionRenames) {
        const renameRes = await fetch("/api/admin/content/sections", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "rename",
            sectionId: rename.sectionId,
            title: rename.title,
            dealSlug,
          }),
        });
        const renameData = await renameRes.json().catch(() => ({}));
        if (!renameRes.ok) {
          throw new Error(renameData?.error || "Failed to rename section");
        }
      }

      let savedAtValue = new Date().toISOString();
      if (changes.length > 0) {
        const res = await fetch("/api/admin/content/save", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ dealSlug, changes }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || "Save failed");
        savedAtValue = data.saved_at || savedAtValue;
      }

      setSavedAt(savedAtValue);
      const nextBaseline = new Map(baselineByBlockId);
      for (const section of draftSections) {
        for (const block of section.content_blocks || []) {
          nextBaseline.set(block.id, clone(block.content));
        }
      }
      setBaselineByBlockId(nextBaseline);
      const nextSectionBaseline = new Map(baselineSectionTitles);
      for (const section of draftSections) {
        nextSectionBaseline.set(section.id, section.title);
      }
      setBaselineSectionTitles(nextSectionBaseline);
      setBaselineSectionOrder(currentOrder);
      setDirtyBlockIds(new Set());
      setDirtySectionIds(new Set());
    } catch (error) {
      window.alert(error.message);
    } finally {
      setSaving(false);
    }
  };

  const createSection = async () => {
    const title = window.prompt("New section title");
    if (!title) return;
    setCreatingSection(true);
    try {
      const res = await fetch("/api/admin/content/sections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "add", title, dealSlug }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to add section");
      const createdSection = data?.section;
      if (!createdSection?.id) {
        throw new Error("Section created but response payload was incomplete");
      }
      const normalizedSection = {
        ...createdSection,
        content_blocks: (createdSection.content_blocks || []).sort(
          (a, b) => (a.display_order || 0) - (b.display_order || 0)
        ),
      };
      setDraftSections((prev) => [...prev, normalizedSection]);
      setActiveSectionId(createdSection.id);
      setBaselineSectionTitles((prev) => {
        const next = new Map(prev);
        next.set(createdSection.id, createdSection.title || title);
        return next;
      });
      setBaselineSectionOrder((prev) => [...prev, createdSection.id]);
      setBaselineByBlockId((prev) => {
        const next = new Map(prev);
        for (const block of normalizedSection.content_blocks || []) {
          next.set(block.id, clone(block.content));
        }
        return next;
      });
      setSavedAt(new Date().toISOString());
    } catch (error) {
      window.alert(error.message);
    } finally {
      setCreatingSection(false);
    }
  };

  const toggleSectionVisibility = async (sectionId, isVisible) => {
    try {
      const res = await fetch("/api/admin/content/sections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "toggle_visibility",
          sectionId,
          isVisible,
          dealSlug,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to toggle section");
      setDraftSections((prev) =>
        prev.map((s) =>
          s.id === sectionId ? { ...s, is_visible: isVisible } : s
        )
      );
    } catch (error) {
      window.alert(error.message);
    }
  };

  const persistSectionOrder = async (nextSections, previousSections) => {
    try {
      const orderedSectionIds = nextSections.map((s) => s.id);
      const res = await fetch("/api/admin/content/sections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "reorder",
          dealSlug,
          orderedSectionIds,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setDraftSections(previousSections);
        window.alert(data?.error || "Failed to reorder sections");
        return false;
      }
      setBaselineSectionOrder(orderedSectionIds);
      setSavedAt(new Date().toISOString());
      return true;
    } catch {
      setDraftSections(previousSections);
      window.alert("Failed to reorder sections");
      return false;
    }
  };

  const handleSectionDragEnd = async (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = draftSections.findIndex((s) => s.id === active.id);
    const newIndex = draftSections.findIndex((s) => s.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const previousSections = draftSections;
    const nextSections = arrayMove(draftSections, oldIndex, newIndex);
    setDraftSections(nextSections);
    await persistSectionOrder(nextSections, previousSections);
  };

  const moveSection = async (sectionId, direction) => {
    const currentIndex = draftSections.findIndex((s) => s.id === sectionId);
    if (currentIndex < 0) return;
    const nextIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    if (nextIndex < 0 || nextIndex >= draftSections.length) return;
    const previousSections = draftSections;
    const nextSections = arrayMove(draftSections, currentIndex, nextIndex);
    setDraftSections(nextSections);
    await persistSectionOrder(nextSections, previousSections);
  };

  const updateSectionTitle = (sectionId, title) => {
    setDraftSections((prev) =>
      prev.map((s) => (s.id === sectionId ? { ...s, title } : s))
    );
    setDirtySectionIds((prev) => {
      const next = new Set(prev);
      const baseline = baselineSectionTitles.get(sectionId) || "";
      if (baseline !== title) next.add(sectionId);
      else next.delete(sectionId);
      return next;
    });
  };

  const renameSection = async (sectionId, newTitle) => {
    if (!newTitle?.trim()) return;
    setRenaming(true);
    const previousTitle = baselineSectionTitles.get(sectionId) || "";
    try {
      const res = await fetch("/api/admin/content/sections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "rename",
          sectionId,
          title: newTitle.trim(),
          dealSlug,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Failed to rename section");
      setBaselineSectionTitles((prev) => {
        const next = new Map(prev);
        next.set(sectionId, newTitle.trim());
        return next;
      });
      setDirtySectionIds((prev) => {
        const next = new Set(prev);
        next.delete(sectionId);
        return next;
      });
      setSavedAt(new Date().toISOString());
    } catch (error) {
      setDraftSections((prev) =>
        prev.map((s) => (s.id === sectionId ? { ...s, title: previousTitle } : s))
      );
      window.alert(error?.message || "Failed to rename section");
    } finally {
      setRenaming(false);
    }
  };

  const renderBlockEditor = (block) => {
    if (block.type === "rich_text") {
      return (
        <RichTextEditor
          value={block.content || ""}
          onChange={(next) => updateBlockContent(block.id, next)}
        />
      );
    }
    if (block.type === "key_value_table") {
      return (
        <KeyValueEditor
          value={block.content}
          onChange={(next) => updateBlockContent(block.id, next)}
        />
      );
    }
    if (block.type === "text_list") {
      return (
        <TextListEditor
          value={block.content}
          onChange={(next) => updateBlockContent(block.id, next)}
        />
      );
    }
    if (block.type === "faq_list") {
      return (
        <FAQEditor
          value={block.content}
          onChange={(next) => updateBlockContent(block.id, next)}
        />
      );
    }
    return (
      <textarea
        value={JSON.stringify(block.content, null, 2)}
        onChange={(e) => {
          try {
            updateBlockContent(block.id, JSON.parse(e.target.value));
          } catch {
            /* ignore parse errors while typing */
          }
        }}
        style={{
          width: "100%",
          minHeight: 120,
          border: `1px solid ${COLORS.border}`,
          borderRadius: 6,
          padding: 10,
          fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
          fontSize: 12,
        }}
      />
    );
  };

  const renderBlocks = () => {
    if (!activeSection) return null;
    if (!Array.isArray(activeSection.content_blocks)) {
      return (
        <div style={{ padding: "20px 0", color: COLORS.text500, fontSize: 13 }}>
          {loadingSectionId === activeSection.id
            ? "Loading section..."
            : "No content available for this section."}
        </div>
      );
    }

    return (
      <div style={{ display: "grid", gap: 16 }}>
        {activeBlocks.map((block) => (
          <div key={block.id}>
            <div
              style={{
                fontSize: 11,
                color: COLORS.text500,
                marginBottom: 6,
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.04em",
              }}
            >
              {humanizeKey(block.key)}
            </div>
            {renderBlockEditor(block)}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div
      style={{
        background: COLORS.cream50,
        minHeight: "100vh",
        fontFamily: "var(--font-sans)",
      }}
    >
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: 20 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 14,
            position: "sticky",
            top: 0,
            background: COLORS.cream50,
            zIndex: 5,
            padding: "8px 0",
          }}
        >
          <h1 style={{ margin: 0, fontSize: 24, color: COLORS.text900 }}>Edit WSV Data Room</h1>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 12, color: COLORS.text500 }}>
              {savedAt
                ? `Saved ${new Date(savedAt).toLocaleTimeString()} by ${currentUserEmail}`
                : renaming
                  ? "Saving title..."
                  : "Not saved yet"}
            </span>
            <button
              type="button"
              disabled={!hasChanges || saving}
              onClick={saveChanges}
              style={{
                background: !hasChanges || saving ? COLORS.text400 : COLORS.green800,
                color: COLORS.white,
                border: "none",
                borderRadius: 6,
                padding: "10px 14px",
                fontSize: 14,
                fontWeight: 600,
                cursor: !hasChanges || saving ? "not-allowed" : "pointer",
              }}
            >
              {saving ? "Saving..." : "Save"}
            </button>
            <button
              type="button"
              disabled={creatingSection}
              onClick={createSection}
              style={{
                border: `1px solid ${COLORS.green800}`,
                color: COLORS.green800,
                background: COLORS.white,
                borderRadius: 6,
                padding: "10px 14px",
                fontSize: 14,
                fontWeight: 600,
                cursor: creatingSection ? "not-allowed" : "pointer",
              }}
            >
              {creatingSection ? "Creating..." : "+ Section"}
            </button>
          </div>
        </div>

        {isMobile ? (
          <>
            <div style={{ fontSize: 11, fontWeight: 700, color: COLORS.text500, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 6 }}>
              Section
            </div>
            <select
              value={activeSectionId || ""}
              onChange={(e) => setActiveSectionId(e.target.value)}
              style={{
                width: "100%",
                padding: "10px 12px",
                border: `1px solid ${COLORS.border}`,
                borderRadius: 6,
                marginBottom: 12,
                background: COLORS.white,
                fontSize: 14,
              }}
            >
              {draftSections.map((section) => (
                <option key={section.id} value={section.id}>{section.title}</option>
              ))}
            </select>
            <div style={{ display: "grid", gap: 8, marginBottom: 16 }}>
              {draftSections.map((section, index) => {
                const active = activeSection?.id === section.id;
                return (
                  <div
                    key={section.id}
                    style={{
                      display: "grid",
                      gap: 8,
                      padding: 10,
                      border: `1px solid ${active ? COLORS.green400 : COLORS.border}`,
                      borderRadius: 8,
                      background: active ? COLORS.green100 : COLORS.white,
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        if (section.id === activeSectionId && !Array.isArray(section.content_blocks)) {
                          loadSectionBlocks(section.id);
                        } else {
                          setActiveSectionId(section.id);
                        }
                      }}
                      style={{
                        border: "none",
                        background: "transparent",
                        textAlign: "left",
                        fontWeight: 600,
                        fontSize: 14,
                        color: COLORS.text900,
                        cursor: "pointer",
                      }}
                    >
                      {section.title}
                    </button>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <button
                        type="button"
                        onClick={() => moveSection(section.id, "up")}
                        disabled={index === 0}
                        style={{
                          border: `1px solid ${COLORS.border}`,
                          background: COLORS.white,
                          borderRadius: 6,
                          padding: "6px 10px",
                          fontSize: 12,
                          cursor: index === 0 ? "not-allowed" : "pointer",
                        }}
                      >
                        Move up
                      </button>
                      <button
                        type="button"
                        onClick={() => moveSection(section.id, "down")}
                        disabled={index === draftSections.length - 1}
                        style={{
                          border: `1px solid ${COLORS.border}`,
                          background: COLORS.white,
                          borderRadius: 6,
                          padding: "6px 10px",
                          fontSize: 12,
                          cursor: index === draftSections.length - 1 ? "not-allowed" : "pointer",
                        }}
                      >
                        Move down
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleSectionVisibility(section.id, !section.is_visible)}
                        style={{
                          border: `1px solid ${COLORS.border}`,
                          background: COLORS.white,
                          borderRadius: 6,
                          padding: "6px 10px",
                          fontSize: 12,
                          cursor: "pointer",
                          color: COLORS.text700,
                        }}
                      >
                        {section.is_visible ? "Hide" : "Show"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <DndContext
            sensors={sectionSensors}
            collisionDetection={closestCenter}
            onDragEnd={handleSectionDragEnd}
          >
            <SortableContext
              items={draftSections.map((s) => s.id)}
              strategy={horizontalListSortingStrategy}
            >
              <div style={{ fontSize: 11, fontWeight: 700, color: COLORS.text500, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 8 }}>
                Navigation
              </div>
              <div
                style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 14 }}
              >
                {draftSections.map((section) => (
                  <SortablePill
                    key={section.id}
                    id={section.id}
                    section={section}
                    isActive={activeSection?.id === section.id}
                    onSelect={() => {
                      if (section.id === activeSectionId && !Array.isArray(section.content_blocks)) {
                        loadSectionBlocks(section.id);
                      } else {
                        setActiveSectionId(section.id);
                      }
                    }}
                    onToggleVisibility={() =>
                      toggleSectionVisibility(section.id, !section.is_visible)
                    }
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}

        <div
          style={{
            border: `1px solid ${COLORS.border}`,
            borderRadius: 3,
            background: COLORS.white,
            padding: 16,
          }}
        >
          <input
            value={activeSection?.title || ""}
            onChange={(e) => updateSectionTitle(activeSectionId, e.target.value)}
            onBlur={() => renameSection(activeSectionId, activeSection?.title)}
            onKeyDown={(e) => {
              if (e.key === "Enter") e.target.blur();
            }}
            style={{
              fontSize: 18,
              fontWeight: 700,
              border: "none",
              borderBottom: "1px dashed transparent",
              background: "transparent",
              outline: "none",
              width: "100%",
              padding: "0 0 4px 0",
              marginBottom: 14,
            }}
          />
          {renderBlocks()}
        </div>
      </div>
    </div>
  );
}
