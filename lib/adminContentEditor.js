export function sortContentBlocks(contentBlocks) {
  if (!Array.isArray(contentBlocks)) return contentBlocks ?? null;

  return contentBlocks
    .slice()
    .sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
}

export function prepareSectionsForEditor(sections = []) {
  return sections.map((section) => ({
    ...section,
    content_blocks: sortContentBlocks(section.content_blocks),
  }));
}

export function needsSectionFetch(sectionId, section) {
  if (
    !sectionId ||
    typeof sectionId !== "string" ||
    !sectionId.trim() ||
    sectionId === "undefined" ||
    sectionId === "null"
  ) {
    return false;
  }

  if (!section) return false;

  return !Array.isArray(section.content_blocks);
}
