"use client";

import { useEffect, useState } from "react";
import { COLORS } from "../../../constants/theme";

export default function KeyValueEditor({ value, onChange }) {
  const rows = Array.isArray(value) ? value : [];
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(max-width: 820px)").matches;
  });

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 820px)");
    const handleChange = (e) => setIsMobile(e.matches);
    mq.addEventListener("change", handleChange);
    return () => mq.removeEventListener("change", handleChange);
  }, []);

  const updateRow = (index, patch) => {
    const nextRows = rows.map((row, rowIndex) => rowIndex === index ? { ...row, ...patch } : row);
    onChange(nextRows);
  };

  const addRow = () => onChange([...(rows || []), { label: "", value: "", highlight: false }]);
  const removeRow = (index) => onChange(rows.filter((_, rowIndex) => rowIndex !== index));

  return (
    <div style={{ display: "grid", gap: 8 }}>
      {rows.map((row, index) => (
        <div
          key={`${row.label}-${index}`}
          style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr auto auto",
            gap: 8,
            alignItems: "center",
          }}
        >
          <input value={row.label || ""} onChange={(e) => updateRow(index, { label: e.target.value })} placeholder="Label" style={{ padding: "10px 12px", border: `1px solid ${COLORS.border}`, borderRadius: 6 }} />
          <input value={row.value || ""} onChange={(e) => updateRow(index, { value: e.target.value })} placeholder="Value" style={{ padding: "10px 12px", border: `1px solid ${COLORS.border}`, borderRadius: 6 }} />
          <label style={{ fontSize: 12, whiteSpace: "nowrap" }}>
            <input type="checkbox" checked={!!row.highlight} onChange={(e) => updateRow(index, { highlight: e.target.checked })} /> highlight
          </label>
          <button type="button" onClick={() => removeRow(index)} style={{ border: `1px solid ${COLORS.border}`, background: COLORS.white, borderRadius: 6, padding: "8px 10px", cursor: "pointer" }}>Delete</button>
        </div>
      ))}
      <button type="button" onClick={addRow} style={{ border: `1px solid ${COLORS.border}`, background: COLORS.white, borderRadius: 6, padding: "8px 10px", cursor: "pointer", width: "fit-content" }}>
        + Add row
      </button>
    </div>
  );
}
