"use client";

export default function TextListEditor({ value, onChange }) {
  const list = Array.isArray(value) ? value : [];

  const updateItem = (index, nextValue) => {
    const next = list.map((item, itemIndex) => itemIndex === index ? nextValue : item);
    onChange(next);
  };

  const addItem = () => onChange([...list, ""]);
  const removeItem = (index) => onChange(list.filter((_, itemIndex) => itemIndex !== index));
  const moveItem = (index, delta) => {
    const to = index + delta;
    if (to < 0 || to >= list.length) return;
    const next = list.slice();
    const [item] = next.splice(index, 1);
    next.splice(to, 0, item);
    onChange(next);
  };

  return (
    <div style={{ display: "grid", gap: 8 }}>
      {list.map((item, index) => (
        <div key={`${index}-${item}`} style={{ display: "grid", gridTemplateColumns: "1fr auto auto auto", gap: 8 }}>
          <input value={item || ""} onChange={(e) => updateItem(index, e.target.value)} placeholder="List item" style={{ padding: "10px 12px", border: "1px solid #e2ddd3", borderRadius: 6 }} />
          <button type="button" onClick={() => moveItem(index, -1)} style={{ border: "1px solid #e2ddd3", borderRadius: 6, background: "#fff", padding: "8px 10px", cursor: "pointer" }}>↑</button>
          <button type="button" onClick={() => moveItem(index, 1)} style={{ border: "1px solid #e2ddd3", borderRadius: 6, background: "#fff", padding: "8px 10px", cursor: "pointer" }}>↓</button>
          <button type="button" onClick={() => removeItem(index)} style={{ border: "1px solid #e2ddd3", borderRadius: 6, background: "#fff", padding: "8px 10px", cursor: "pointer" }}>Delete</button>
        </div>
      ))}
      <button type="button" onClick={addItem} style={{ border: "1px solid #e2ddd3", background: "#fff", borderRadius: 6, padding: "8px 10px", width: "fit-content", cursor: "pointer" }}>
        + Add item
      </button>
    </div>
  );
}

