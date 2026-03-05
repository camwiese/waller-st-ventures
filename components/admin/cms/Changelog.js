"use client";

import { useState } from "react";

function renderDiffValue(value) {
  if (typeof value === "string" && value.trim().startsWith("<")) {
    return (
      <div
        style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 6, padding: 10 }}
        dangerouslySetInnerHTML={{ __html: value }}
      />
    );
  }
  return (
    <pre style={{ margin: 0, whiteSpace: "pre-wrap", background: "#f8fafc", border: "1px solid #e5e7eb", borderRadius: 6, padding: 10, fontSize: 12 }}>
      {JSON.stringify(value, null, 2)}
    </pre>
  );
}

export default function Changelog({ initialEntries = [], dealSlug }) {
  const [entries, setEntries] = useState(initialEntries);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [sectionFilter, setSectionFilter] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [selectedEntry, setSelectedEntry] = useState(null);

  const sections = Array.from(new Set(initialEntries.map((entry) => entry.section_slug).filter(Boolean)));
  const actions = Array.from(new Set(initialEntries.map((entry) => entry.action).filter(Boolean)));

  async function loadMore(nextPage = page + 1, reset = false) {
    setLoading(true);
    try {
      const query = new URLSearchParams({
        page: String(nextPage),
        dealSlug,
      });
      if (sectionFilter) query.set("section", sectionFilter);
      if (actionFilter) query.set("action", actionFilter);
      const res = await fetch(`/api/admin/content/changelog?${query.toString()}`);
      const data = await res.json();
      setEntries((prev) => (reset ? (data.entries || []) : [...prev, ...(data.entries || [])]));
      setPage(nextPage);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ marginTop: 24, borderTop: "1px solid #d1d5db", paddingTop: 20 }}>
      <h2 style={{ margin: "0 0 12px 0", fontSize: 18 }}>Changelog</h2>
      <div style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
        <select value={sectionFilter} onChange={(e) => setSectionFilter(e.target.value)} style={{ padding: "8px 10px", border: "1px solid #d1d5db", borderRadius: 6 }}>
          <option value="">All sections</option>
          {sections.map((section) => (
            <option key={section} value={section}>{section}</option>
          ))}
        </select>
        <select value={actionFilter} onChange={(e) => setActionFilter(e.target.value)} style={{ padding: "8px 10px", border: "1px solid #d1d5db", borderRadius: 6 }}>
          <option value="">All actions</option>
          {actions.map((action) => (
            <option key={action} value={action}>{action}</option>
          ))}
        </select>
        <button type="button" onClick={() => loadMore(1, true)} style={{ border: "1px solid #d1d5db", background: "#fff", borderRadius: 6, padding: "8px 10px", cursor: "pointer" }}>
          Apply filters
        </button>
      </div>
      <div style={{ display: "grid", gap: 8 }}>
        {entries.map((entry) => (
          <div key={entry.id} style={{ border: "1px solid #e5e7eb", borderRadius: 6, padding: 10, background: "#fff" }}>
            <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>
              {new Date(entry.changed_at).toLocaleString()} · {entry.changed_by_email}
            </div>
            <div style={{ fontSize: 14, marginBottom: 8 }}>{entry.description}</div>
            <button type="button" onClick={() => setSelectedEntry(entry)} style={{ border: "1px solid #d1d5db", background: "#fff", borderRadius: 6, padding: "6px 8px", cursor: "pointer", fontSize: 12 }}>
              View diff
            </button>
          </div>
        ))}
      </div>
      <button type="button" onClick={loadMore} disabled={loading} style={{ marginTop: 12, border: "1px solid #d1d5db", background: "#fff", borderRadius: 6, padding: "8px 10px", cursor: "pointer" }}>
        {loading ? "Loading..." : "Load more"}
      </button>
      {selectedEntry && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999 }}>
          <div style={{ width: "min(900px, 92vw)", maxHeight: "80vh", overflow: "auto", background: "#fff", borderRadius: 10, padding: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <h3 style={{ margin: 0 }}>Diff · {selectedEntry.action}</h3>
              <button type="button" onClick={() => setSelectedEntry(null)} style={{ border: "1px solid #d1d5db", background: "#fff", borderRadius: 6, padding: "6px 8px", cursor: "pointer" }}>
                Close
              </button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div>
                <div style={{ fontWeight: 600, marginBottom: 6 }}>Before</div>
                {renderDiffValue(selectedEntry.previous_content)}
              </div>
              <div>
                <div style={{ fontWeight: 600, marginBottom: 6 }}>After</div>
                {renderDiffValue(selectedEntry.new_content)}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

