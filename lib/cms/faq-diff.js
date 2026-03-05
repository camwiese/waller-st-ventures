function toMap(arr, key = "id") {
  return new Map((arr || []).map((item) => [item[key], item]));
}

function itemMaps(groups) {
  const itemById = new Map();
  const itemGroupById = new Map();
  for (const group of groups || []) {
    for (const item of group.items || []) {
      itemById.set(item.id, item);
      itemGroupById.set(item.id, group.id);
    }
  }
  return { itemById, itemGroupById };
}

export function diffFaqGroups(previousGroups, nextGroups) {
  const entries = [];
  const prevGroups = Array.isArray(previousGroups) ? previousGroups : [];
  const nextGroupsArr = Array.isArray(nextGroups) ? nextGroups : [];

  const prevGroupMap = toMap(prevGroups);
  const nextGroupMap = toMap(nextGroupsArr);

  for (const [id, group] of nextGroupMap) {
    if (!prevGroupMap.has(id)) {
      entries.push({ action: "group_add", description: `Added FAQ group "${group.title}"` });
    }
  }

  for (const [id, group] of prevGroupMap) {
    if (!nextGroupMap.has(id)) {
      entries.push({ action: "group_delete", description: `Deleted FAQ group "${group.title}"` });
    }
  }

  for (const [id, nextGroup] of nextGroupMap) {
    const prevGroup = prevGroupMap.get(id);
    if (prevGroup && prevGroup.title !== nextGroup.title) {
      entries.push({
        action: "group_rename",
        description: `Renamed FAQ group "${prevGroup.title}" -> "${nextGroup.title}"`,
      });
    }
  }

  const prevGroupOrder = prevGroups.map((g) => g.id).join(",");
  const nextGroupOrder = nextGroupsArr.map((g) => g.id).join(",");
  if (prevGroupOrder !== nextGroupOrder) {
    entries.push({ action: "group_reorder", description: "Reordered FAQ groups" });
  }

  const { itemById: prevItems, itemGroupById: prevItemGroup } = itemMaps(prevGroups);
  const { itemById: nextItems, itemGroupById: nextItemGroup } = itemMaps(nextGroupsArr);

  for (const [itemId, item] of nextItems) {
    if (!prevItems.has(itemId)) {
      const group = nextGroupMap.get(nextItemGroup.get(itemId));
      entries.push({
        action: "faq_add",
        description: `Added FAQ "${item.question}" to ${group?.title || "Unknown"}`,
      });
    }
  }

  for (const [itemId, item] of prevItems) {
    if (!nextItems.has(itemId)) {
      const group = prevGroupMap.get(prevItemGroup.get(itemId));
      entries.push({
        action: "faq_delete",
        description: `Deleted FAQ "${item.question}" from ${group?.title || "Unknown"}`,
      });
    }
  }

  for (const [itemId, nextItem] of nextItems) {
    const prevItem = prevItems.get(itemId);
    if (!prevItem) continue;
    const prevGroupId = prevItemGroup.get(itemId);
    const nextGroupId = nextItemGroup.get(itemId);
    if (prevGroupId !== nextGroupId) {
      const fromGroup = prevGroupMap.get(prevGroupId);
      const toGroup = nextGroupMap.get(nextGroupId);
      entries.push({
        action: "faq_move",
        description: `Moved FAQ "${nextItem.question}" from ${fromGroup?.title || "Unknown"} -> ${toGroup?.title || "Unknown"}`,
      });
    } else if (prevItem.question !== nextItem.question || prevItem.answer !== nextItem.answer) {
      const group = nextGroupMap.get(nextGroupId);
      entries.push({
        action: "faq_edit",
        description: `Edited FAQ "${nextItem.question}" in ${group?.title || "Unknown"}`,
      });
    }
  }

  // Reorder detection within groups
  for (const nextGroup of nextGroupsArr) {
    const prevGroup = prevGroupMap.get(nextGroup.id);
    if (!prevGroup) continue;
    const prevOrder = (prevGroup.items || []).map((item) => item.id).join(",");
    const nextOrder = (nextGroup.items || []).map((item) => item.id).join(",");
    if (prevOrder !== nextOrder) {
      entries.push({
        action: "faq_reorder",
        description: `Reordered FAQs in ${nextGroup.title}`,
      });
    }
  }

  return entries;
}

