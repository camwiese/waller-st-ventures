import { describe, it, expect } from "vitest";
import { diffFaqGroups } from "./faq-diff";

function baseState() {
  return [
    {
      id: "g1",
      title: "Group 1",
      order: 0,
      items: [
        { id: "i1", question: "Q1", answer: "<p>A1</p>", order: 0 },
        { id: "i2", question: "Q2", answer: "<p>A2</p>", order: 1 },
      ],
    },
    {
      id: "g2",
      title: "Group 2",
      order: 1,
      items: [],
    },
  ];
}

describe("diffFaqGroups", () => {
  it("detects group rename", () => {
    const prev = baseState();
    const next = baseState();
    next[0].title = "Updated Group";
    const diff = diffFaqGroups(prev, next);
    expect(diff.some((entry) => entry.action === "group_rename")).toBe(true);
  });

  it("detects item move between groups", () => {
    const prev = baseState();
    const next = baseState();
    const moved = next[0].items.pop();
    next[1].items.push(moved);
    const diff = diffFaqGroups(prev, next);
    expect(diff.some((entry) => entry.action === "faq_move")).toBe(true);
  });

  it("detects item edit", () => {
    const prev = baseState();
    const next = baseState();
    next[0].items[0].answer = "<p>Updated</p>";
    const diff = diffFaqGroups(prev, next);
    expect(diff.some((entry) => entry.action === "faq_edit")).toBe(true);
  });
});

