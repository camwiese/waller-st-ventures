"use client";

/* eslint-disable react-hooks/refs */

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCorners,
  pointerWithin,
  rectIntersection,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  verticalListSortingStrategy,
  useSortable,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

const RichTextEditor = dynamic(() => import("./RichTextEditor"), {
  ssr: false,
  loading: () => (
    <div
      style={{
        border: "1px solid #e2ddd3",
        borderRadius: 6,
        background: "#fff",
        minHeight: 110,
      }}
    />
  ),
});

function newGroup() {
  return {
    id: crypto.randomUUID(),
    title: "Untitled Group",
    order: 0,
    items: [],
  };
}

function newItem() {
  return {
    id: crypto.randomUUID(),
    question: "",
    answer: "",
    order: 0,
  };
}

function normalize(groups) {
  return (groups || []).map((group, groupIndex) => ({
    ...group,
    order: groupIndex,
    items: (group.items || []).map((item, itemIndex) => ({
      ...item,
      order: itemIndex,
    })),
  }));
}

function groupDragId(groupId) {
  return `group:${groupId}`;
}

function itemDragId(itemId) {
  return `item:${itemId}`;
}

function parseDragId(rawId) {
  const value = String(rawId || "");
  const [kind, id] = value.split(":");
  return { kind, id };
}

function findGroupByItemId(groups, itemId) {
  return (
    groups.find((group) =>
      (group.items || []).some((item) => item.id === itemId)
    ) || null
  );
}

function findItemById(groups, itemId) {
  for (const group of groups) {
    const item = (group.items || []).find((entry) => entry.id === itemId);
    if (item) return item;
  }
  return null;
}

function SortableGroup({ dragId, children }) {
  const sortable = useSortable({ id: dragId });
  const style = {
    transform: CSS.Transform.toString(sortable.transform),
    transition: sortable.transition,
    opacity: sortable.isDragging ? 0.65 : 1,
  };
  return (
    // eslint-disable-next-line react-hooks/refs
    <div ref={sortable.setNodeRef} style={style}>
      {children({
        dragHandleProps: { ...sortable.attributes, ...sortable.listeners },
        isDragging: sortable.isDragging,
      })}
    </div>
  );
}

function SortableAccordionItem({ dragId, children }) {
  const sortable = useSortable({ id: dragId });
  const style = {
    transform: CSS.Transform.toString(sortable.transform),
    transition: sortable.transition,
    opacity: sortable.isDragging ? 0.5 : 1,
  };
  return (
    // eslint-disable-next-line react-hooks/refs
    <div ref={sortable.setNodeRef} style={style}>
      {children({
        dragHandleProps: { ...sortable.attributes, ...sortable.listeners },
        isDragging: sortable.isDragging,
      })}
    </div>
  );
}

export default function FAQEditor({ value, onChange }) {
  const groups = useMemo(
    () => (Array.isArray(value) ? value : []),
    [value]
  );
  const [openItems, setOpenItems] = useState(new Set());
  const [activeItemId, setActiveItemId] = useState(null);
  const [mergeFrom, setMergeFrom] = useState("");
  const [mergeTo, setMergeTo] = useState("");
  const [lastDeleted, setLastDeleted] = useState(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const update = (next) => onChange(normalize(next));

  const collisionDetection = (args) => {
    const pointerHits = pointerWithin(args);
    if (pointerHits.length > 0) return pointerHits;
    return rectIntersection(args);
  };

  const toggleItem = (itemId) => {
    setOpenItems((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  };

  const updateGroup = (groupId, patch) => {
    update(
      groups.map((group) =>
        group.id === groupId ? { ...group, ...patch } : group
      )
    );
  };

  const addGroup = () => {
    update([...(groups || []), newGroup()]);
  };

  const deleteGroup = (groupId) => {
    const target = groups.find((group) => group.id === groupId);
    if (!target) return;
    if (target.items?.length > 0) {
      const destination = groups.find((group) => group.id !== groupId);
      if (destination) {
        const moveItems = window.confirm(
          `Move ${target.items.length} items to "${destination.title}"? Click Cancel to delete items.`
        );
        if (moveItems) {
          update(
            groups
              .filter((group) => group.id !== groupId)
              .map((group) =>
                group.id === destination.id
                  ? {
                      ...group,
                      items: [
                        ...(group.items || []),
                        ...(target.items || []),
                      ],
                    }
                  : group
              )
          );
          return;
        }
      }
    }
    update(groups.filter((group) => group.id !== groupId));
  };

  const addItem = (groupId) => {
    const item = newItem();
    update(
      groups.map((group) =>
        group.id === groupId
          ? { ...group, items: [...(group.items || []), item] }
          : group
      )
    );
    setOpenItems((prev) => new Set(prev).add(item.id));
  };

  const updateItem = (groupId, itemId, patch) => {
    update(
      groups.map((group) =>
        group.id === groupId
          ? {
              ...group,
              items: (group.items || []).map((item) =>
                item.id === itemId ? { ...item, ...patch } : item
              ),
            }
          : group
      )
    );
  };

  const deleteItem = (groupId, itemId) => {
    const deletedItem = findItemById(groups, itemId);
    const deletedGroup = groups.find((group) => group.id === groupId);
    if (deletedItem && deletedGroup) {
      setLastDeleted({
        item: deletedItem,
        groupId,
        groupTitle: deletedGroup.title,
      });
    }
    setOpenItems((prev) => {
      const next = new Set(prev);
      next.delete(itemId);
      return next;
    });
    update(
      groups.map((group) =>
        group.id === groupId
          ? {
              ...group,
              items: (group.items || []).filter((item) => item.id !== itemId),
            }
          : group
      )
    );
  };

  const moveItemToGroup = (fromGroupId, itemId, toGroupId) => {
    if (!toGroupId || fromGroupId === toGroupId) return;
    const source = groups.find((group) => group.id === fromGroupId);
    const target = groups.find((group) => group.id === toGroupId);
    if (!source || !target) return;
    const item = source.items?.find((entry) => entry.id === itemId);
    if (!item) return;

    update(
      groups.map((group) => {
        if (group.id === fromGroupId) {
          return {
            ...group,
            items: (group.items || []).filter((entry) => entry.id !== itemId),
          };
        }
        if (group.id === toGroupId) {
          return { ...group, items: [...(group.items || []), item] };
        }
        return group;
      })
    );
  };

  const consolidateGroups = () => {
    if (!mergeFrom || !mergeTo || mergeFrom === mergeTo) return;
    const source = groups.find((group) => group.id === mergeFrom);
    const destination = groups.find((group) => group.id === mergeTo);
    if (!source || !destination) return;
    update(
      groups
        .filter((group) => group.id !== mergeFrom)
        .map((group) =>
          group.id === mergeTo
            ? {
                ...group,
                items: [...(group.items || []), ...(source.items || [])],
              }
            : group
        )
    );
    setMergeFrom("");
    setMergeTo("");
  };

  const restoreDeletedItem = () => {
    if (!lastDeleted) return;
    const targetGroupExists = groups.some((g) => g.id === lastDeleted.groupId);
    if (targetGroupExists) {
      update(
        groups.map((group) =>
          group.id === lastDeleted.groupId
            ? { ...group, items: [...(group.items || []), lastDeleted.item] }
            : group
        )
      );
    } else if (groups.length > 0) {
      update(
        groups.map((group, i) =>
          i === 0
            ? { ...group, items: [...(group.items || []), lastDeleted.item] }
            : group
        )
      );
    }
    setLastDeleted(null);
  };

  const handleDragStart = (event) => {
    const parsed = parseDragId(event.active.id);
    if (parsed.kind === "item") {
      setActiveItemId(parsed.id);
    }
  };

  const handleDragOver = (event) => {
    const { active, over } = event;
    if (!over) return;

    const from = parseDragId(active.id);
    const to = parseDragId(over.id);

    if (from.kind !== "item") return;

    const sourceGroup = findGroupByItemId(groups, from.id);
    if (!sourceGroup) return;

    const destinationGroup =
      to.kind === "group"
        ? groups.find((g) => g.id === to.id)
        : findGroupByItemId(groups, to.id);
    if (!destinationGroup || sourceGroup.id === destinationGroup.id) return;

    const sourceItems = sourceGroup.items || [];
    const item = sourceItems.find((i) => i.id === from.id);
    if (!item) return;

    const destItems = destinationGroup.items || [];
    const insertAt =
      to.kind === "item"
        ? destItems.findIndex((i) => i.id === to.id)
        : destItems.length;

    update(
      groups.map((g) => {
        if (g.id === sourceGroup.id) {
          return { ...g, items: sourceItems.filter((i) => i.id !== from.id) };
        }
        if (g.id === destinationGroup.id) {
          const next = destItems.slice();
          next.splice(insertAt < 0 ? destItems.length : insertAt, 0, item);
          return { ...g, items: next };
        }
        return g;
      })
    );
  };

  const handleDragEnd = (event) => {
    setActiveItemId(null);
    const { active, over } = event;
    if (!over) return;

    const from = parseDragId(active.id);
    const to = parseDragId(over.id);

    if (from.kind === "group" && to.kind === "group") {
      const oldIndex = groups.findIndex((g) => g.id === from.id);
      const newIndex = groups.findIndex((g) => g.id === to.id);
      if (oldIndex >= 0 && newIndex >= 0 && oldIndex !== newIndex) {
        update(arrayMove(groups, oldIndex, newIndex));
      }
      return;
    }

    if (from.kind === "item" && to.kind === "item") {
      const group = findGroupByItemId(groups, from.id);
      const overGroup = findGroupByItemId(groups, to.id);
      if (group && overGroup && group.id === overGroup.id) {
        const items = group.items || [];
        const oldIndex = items.findIndex((i) => i.id === from.id);
        const newIndex = items.findIndex((i) => i.id === to.id);
        if (oldIndex >= 0 && newIndex >= 0 && oldIndex !== newIndex) {
          update(
            groups.map((g) =>
              g.id === group.id
                ? { ...g, items: arrayMove(items, oldIndex, newIndex) }
                : g
            )
          );
        }
      }
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisionDetection}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div style={{ display: "grid", gap: 28 }}>
        <SortableContext
          items={groups.map((group) => groupDragId(group.id))}
          strategy={verticalListSortingStrategy}
        >
          {groups.map((group) => (
            <SortableGroup key={group.id} dragId={groupDragId(group.id)}>
              {({ dragHandleProps }) => (
                <div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      marginBottom: 8,
                    }}
                  >
                    <span
                      {...dragHandleProps}
                      style={{
                        cursor: "grab",
                        fontSize: 16,
                        color: "#8a8a82",
                        lineHeight: 1,
                        padding: "2px 0",
                      }}
                      title="Drag to reorder group"
                    >
                      ⠿
                    </span>
                    <input
                      value={group.title || ""}
                      onChange={(e) =>
                        updateGroup(group.id, { title: e.target.value })
                      }
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        color: "#3a7d59",
                        textTransform: "uppercase",
                        letterSpacing: "0.06em",
                        border: "none",
                        background: "transparent",
                        outline: "none",
                        flex: 1,
                        padding: 0,
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => deleteGroup(group.id)}
                      style={{
                        border: "none",
                        background: "transparent",
                        color: "#8a8a82",
                        cursor: "pointer",
                        fontSize: 12,
                        padding: "4px 8px",
                      }}
                    >
                      Delete
                    </button>
                  </div>

                  <div
                    style={{
                      background: "#fff",
                      border: "1px solid #e2ddd3",
                      borderRadius: 3,
                      overflow: "hidden",
                    }}
                  >
                    <SortableContext
                      items={(group.items || []).map((item) =>
                        itemDragId(item.id)
                      )}
                      strategy={verticalListSortingStrategy}
                    >
                      {(group.items || []).map((item, ii) => {
                        const isOpen = openItems.has(item.id);
                        return (
                          <SortableAccordionItem
                            key={item.id}
                            dragId={itemDragId(item.id)}
                          >
                            {({ dragHandleProps: itemDragProps, isDragging }) => (
                              <div
                                style={{
                                  borderBottom:
                                    ii < group.items.length - 1
                                      ? "1px solid #e2ddd3"
                                      : "none",
                                }}
                              >
                                <div
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                  }}
                                >
                                  <span
                                    {...itemDragProps}
                                    style={{
                                      cursor: isDragging
                                        ? "grabbing"
                                        : "grab",
                                      padding: "16px 8px 16px 16px",
                                      fontSize: 14,
                                      color: "#8a8a82",
                                      lineHeight: 1,
                                      flexShrink: 0,
                                    }}
                                    title="Drag to reorder"
                                  >
                                    ⠿
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => toggleItem(item.id)}
                                    style={{
                                      flex: 1,
                                      display: "flex",
                                      justifyContent: "space-between",
                                      alignItems: "center",
                                      padding: "16px 22px 16px 6px",
                                      background: "none",
                                      border: "none",
                                      cursor: "pointer",
                                      textAlign: "left",
                                    }}
                                  >
                                    <span
                                      style={{
                                        fontSize: 14,
                                        color: item.question
                                          ? "#1a1a18"
                                          : "#8a8a82",
                                        fontWeight: 500,
                                        paddingRight: 16,
                                      }}
                                    >
                                      {item.question || "New question..."}
                                    </span>
                                    <span
                                      style={{
                                        fontSize: 18,
                                        color: "#8a8a82",
                                        transform: isOpen
                                          ? "rotate(45deg)"
                                          : "rotate(0deg)",
                                        transition: "transform 0.2s ease",
                                        flexShrink: 0,
                                      }}
                                    >
                                      +
                                    </span>
                                  </button>
                                </div>

                                {isOpen && !isDragging && (
                                  <div
                                    style={{
                                      padding: "0 22px 18px 44px",
                                    }}
                                  >
                                    <div style={{ marginBottom: 10 }}>
                                      <input
                                        value={item.question || ""}
                                        placeholder="Question"
                                        onChange={(e) =>
                                          updateItem(group.id, item.id, {
                                            question: e.target.value,
                                          })
                                        }
                                        style={{
                                          width: "100%",
                                          padding: "10px 12px",
                                          border: "1px solid #e2ddd3",
                                          borderRadius: 6,
                                          fontSize: 14,
                                          fontWeight: 500,
                                        }}
                                      />
                                    </div>
                                    <RichTextEditor
                                      compact
                                      value={item.answer || ""}
                                      onChange={(nextValue) =>
                                        updateItem(group.id, item.id, {
                                          answer: nextValue,
                                        })
                                      }
                                    />
                                    <div
                                      style={{
                                        display: "flex",
                                        gap: 8,
                                        marginTop: 10,
                                        alignItems: "center",
                                      }}
                                    >
                                      {groups.length > 1 && (
                                        <select
                                          value=""
                                          onChange={(e) => {
                                            if (e.target.value)
                                              moveItemToGroup(
                                                group.id,
                                                item.id,
                                                e.target.value
                                              );
                                          }}
                                          style={{
                                            padding: "6px 10px",
                                            border: "1px solid #e2ddd3",
                                            borderRadius: 6,
                                            fontSize: 12,
                                            color: "#6b6b63",
                                          }}
                                        >
                                          <option value="">Move to...</option>
                                          {groups
                                            .filter(
                                              (g) => g.id !== group.id
                                            )
                                            .map((g) => (
                                              <option
                                                key={g.id}
                                                value={g.id}
                                              >
                                                {g.title}
                                              </option>
                                            ))}
                                        </select>
                                      )}
                                      <button
                                        type="button"
                                        onClick={() =>
                                          deleteItem(group.id, item.id)
                                        }
                                        style={{
                                          border: "none",
                                          background: "transparent",
                                          color: "#a84642",
                                          cursor: "pointer",
                                          fontSize: 12,
                                          padding: "6px 8px",
                                        }}
                                      >
                                        Delete
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </SortableAccordionItem>
                        );
                      })}
                    </SortableContext>
                    {(group.items || []).length === 0 && (
                      <div
                        style={{
                          padding: "16px 22px",
                          color: "#8a8a82",
                          fontSize: 14,
                          background: activeItemId
                            ? "#e6f5ed"
                            : "transparent",
                          borderStyle: activeItemId ? "dashed" : "none",
                          borderColor: activeItemId ? "#3a7d59" : undefined,
                          borderWidth: activeItemId ? 1 : 0,
                          borderRadius: 3,
                          margin: activeItemId ? 4 : 0,
                          transition: "background 0.15s ease",
                        }}
                      >
                        {activeItemId
                          ? "Drop question here"
                          : "No questions yet"}
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => addItem(group.id)}
                    style={{
                      marginTop: 8,
                      border: "none",
                      background: "transparent",
                      color: "#224a36",
                      cursor: "pointer",
                      fontSize: 13,
                      fontWeight: 500,
                      padding: "4px 0",
                    }}
                  >
                    + Add question
                  </button>
                </div>
              )}
            </SortableGroup>
          ))}
        </SortableContext>

        <div
          style={{
            display: "flex",
            gap: 10,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <button
            type="button"
            onClick={addGroup}
            style={{
              border: "1px solid #e2ddd3",
              background: "#fff",
              borderRadius: 6,
              padding: "8px 10px",
              cursor: "pointer",
              fontSize: 13,
            }}
          >
            + Add Group
          </button>
          {groups.length > 1 && (
            <>
              <select
                value={mergeFrom}
                onChange={(e) => setMergeFrom(e.target.value)}
                style={{
                  padding: "8px 10px",
                  border: "1px solid #e2ddd3",
                  borderRadius: 6,
                  fontSize: 12,
                }}
              >
                <option value="">Merge from...</option>
                {groups.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.title}
                  </option>
                ))}
              </select>
              <select
                value={mergeTo}
                onChange={(e) => setMergeTo(e.target.value)}
                style={{
                  padding: "8px 10px",
                  border: "1px solid #e2ddd3",
                  borderRadius: 6,
                  fontSize: 12,
                }}
              >
                <option value="">Into...</option>
                {groups.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.title}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={consolidateGroups}
                disabled={!mergeFrom || !mergeTo || mergeFrom === mergeTo}
                style={{
                  border: "1px solid #e2ddd3",
                  background: "#fff",
                  borderRadius: 6,
                  padding: "8px 10px",
                  cursor:
                    !mergeFrom || !mergeTo || mergeFrom === mergeTo
                      ? "not-allowed"
                      : "pointer",
                  fontSize: 12,
                }}
              >
                Consolidate
              </button>
            </>
          )}
          {lastDeleted && (
            <button
              type="button"
              onClick={restoreDeletedItem}
              style={{
                border: "1px solid #224a36",
                color: "#224a36",
                background: "#fff",
                borderRadius: 6,
                padding: "8px 10px",
                cursor: "pointer",
                fontSize: 12,
              }}
            >
              Undo delete
            </button>
          )}
        </div>
      </div>

      <DragOverlay dropAnimation={null}>
        {activeItemId &&
          (() => {
            const item = findItemById(groups, activeItemId);
            if (!item) return null;
            return (
              <div
                style={{
                  background: "#fff",
                  border: "1px solid #e2ddd3",
                  borderRadius: 3,
                  padding: "16px 22px 16px 16px",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  boxShadow: "0 4px 12px rgba(26,26,24,0.1)",
                  fontSize: 14,
                  color: "#1a1a18",
                  fontWeight: 500,
                  cursor: "grabbing",
                }}
              >
                <span style={{ color: "#8a8a82", fontSize: 14 }}>⠿</span>
                <span style={{ flex: 1 }}>
                  {item.question || "New question..."}
                </span>
              </div>
            );
          })()}
      </DragOverlay>
    </DndContext>
  );
}
