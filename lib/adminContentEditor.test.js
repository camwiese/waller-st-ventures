import { describe, expect, it } from "vitest";
import {
  needsSectionFetch,
  prepareSectionsForEditor,
  sortContentBlocks,
} from "./adminContentEditor";

describe("sortContentBlocks", () => {
  it("sorts blocks by display order", () => {
    const sorted = sortContentBlocks([
      { id: "b", display_order: 2 },
      { id: "a", display_order: 1 },
    ]);

    expect(sorted.map((block) => block.id)).toEqual(["a", "b"]);
  });
});

describe("prepareSectionsForEditor", () => {
  it("keeps hydrated sections hydrated", () => {
    const sections = prepareSectionsForEditor([
      {
        id: "section-1",
        title: "Memo",
        content_blocks: [
          { id: "block-2", display_order: 2 },
          { id: "block-1", display_order: 1 },
        ],
      },
    ]);

    expect(Array.isArray(sections[0].content_blocks)).toBe(true);
    expect(sections[0].content_blocks.map((block) => block.id)).toEqual([
      "block-1",
      "block-2",
    ]);
  });
});

describe("needsSectionFetch", () => {
  it("returns false for hydrated sections and invalid ids", () => {
    expect(
      needsSectionFetch("section-1", {
        id: "section-1",
        content_blocks: [],
      })
    ).toBe(false);
    expect(needsSectionFetch("", null)).toBe(false);
  });

  it("returns true only when a real section is missing content blocks", () => {
    expect(
      needsSectionFetch("section-2", {
        id: "section-2",
        content_blocks: null,
      })
    ).toBe(true);
  });
});
