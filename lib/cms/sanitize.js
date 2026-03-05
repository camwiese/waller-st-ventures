import sanitizeHtml from "sanitize-html";

const ALLOWED = {
  allowedTags: [
    "h2", "h3", "p", "br",
    "strong", "em", "a",
    "ul", "ol", "li",
    "blockquote",
    "sup",
    "table", "thead", "tbody", "tr", "th", "td",
  ],
  allowedAttributes: {
    a: ["href", "target", "rel", "id"],
    sup: ["id"],
    table: ["style"],
    th: ["colspan", "rowspan", "style"],
    td: ["colspan", "rowspan", "style"],
  },
  transformTags: {
    a: (_tagName, attribs) => {
      const isHashLink = typeof attribs.href === "string" && attribs.href.startsWith("#");
      if (isHashLink) {
        return { tagName: "a", attribs: { ...attribs } };
      }
      return {
        tagName: "a",
        attribs: {
          ...attribs,
          target: "_blank",
          rel: "noopener noreferrer",
        },
      };
    },
  },
};

export function sanitizeRichText(html) {
  if (typeof html !== "string") return "";
  return sanitizeHtml(html, ALLOWED);
}

export function sanitizeFaqGroups(groups) {
  if (!Array.isArray(groups)) return [];
  return groups.map((group, groupIdx) => ({
    id: group?.id || crypto.randomUUID(),
    title: (group?.title || "").trim(),
    order: Number.isFinite(group?.order) ? group.order : groupIdx,
    items: Array.isArray(group?.items)
      ? group.items.map((item, itemIdx) => ({
          id: item?.id || crypto.randomUUID(),
          question: (item?.question || "").trim(),
          answer: sanitizeRichText(item?.answer || ""),
          order: Number.isFinite(item?.order) ? item.order : itemIdx,
        }))
      : [],
  }));
}

