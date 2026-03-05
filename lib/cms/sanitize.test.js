import { describe, it, expect } from "vitest";
import { sanitizeRichText, sanitizeFaqGroups } from "./sanitize";

describe("sanitizeRichText", () => {
  it("removes script tags", () => {
    const out = sanitizeRichText("<p>Hi</p><script>alert('xss')</script>");
    expect(out).toContain("<p>Hi</p>");
    expect(out).not.toContain("<script>");
  });

  it("normalizes links with safe attrs", () => {
    const out = sanitizeRichText('<a href="https://example.com">Link</a>');
    expect(out).toContain('target="_blank"');
    expect(out).toContain('rel="noopener noreferrer"');
  });
});

describe("sanitizeFaqGroups", () => {
  it("sanitizes answers and fills ids when missing", () => {
    const out = sanitizeFaqGroups([
      {
        title: "Group",
        items: [
          { question: "Q", answer: "<p>A</p><script>bad()</script>" },
        ],
      },
    ]);
    expect(out[0].id).toBeTruthy();
    expect(out[0].items[0].id).toBeTruthy();
    expect(out[0].items[0].answer).toContain("<p>A</p>");
    expect(out[0].items[0].answer).not.toContain("<script>");
  });
});

