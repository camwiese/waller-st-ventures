"use client";

import { useEffect } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Superscript from "@tiptap/extension-superscript";
import { Table } from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";

const buttonStyle = {
  border: "1px solid #e2ddd3",
  background: "#fff",
  borderRadius: 4,
  padding: "4px 8px",
  fontSize: 12,
  cursor: "pointer",
};

function RichTextEditorImpl({ value, onChange, compact = false }) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: compact ? false : { levels: [2, 3] },
        codeBlock: false,
        code: false,
        strike: false,
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { target: "_blank", rel: "noopener noreferrer" },
      }),
      Superscript,
      Table.configure({ resizable: false }),
      TableRow,
      TableCell,
      TableHeader,
    ],
    content: value || "",
    onUpdate: ({ editor: nextEditor }) => {
      onChange(nextEditor.getHTML());
    },
  });

  useEffect(() => {
    if (!editor) return;
    if (value !== editor.getHTML()) {
      editor.commands.setContent(value || "", { emitUpdate: false });
    }
  }, [value, editor]);

  if (!editor) return null;

  return (
    <div style={{ border: "1px solid #e2ddd3", borderRadius: 3, background: "#fff" }}>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", padding: "8px 10px", borderBottom: "1px solid #e2ddd3" }}>
        <button type="button" onClick={() => editor.chain().focus().toggleBold().run()} style={buttonStyle}>B</button>
        <button type="button" onClick={() => editor.chain().focus().toggleItalic().run()} style={buttonStyle}>I</button>
        {!compact && <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} style={buttonStyle}>H2</button>}
        {!compact && <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} style={buttonStyle}>H3</button>}
        <button type="button" onClick={() => editor.chain().focus().toggleBulletList().run()} style={buttonStyle}>UL</button>
        <button type="button" onClick={() => editor.chain().focus().toggleOrderedList().run()} style={buttonStyle}>OL</button>
        <button type="button" onClick={() => editor.chain().focus().toggleBlockquote().run()} style={buttonStyle}>Quote</button>
        <button
          type="button"
          onClick={() => {
            const previousUrl = editor.getAttributes("link").href;
            const url = window.prompt("URL", previousUrl || "https://");
            if (!url) return;
            editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
          }}
          style={buttonStyle}
        >
          Link
        </button>
        <button type="button" onClick={() => editor.chain().focus().toggleSuperscript().run()} style={buttonStyle}>x²</button>
        {!compact && <button type="button" onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()} style={buttonStyle}>Table</button>}
      </div>
      <EditorContent
        editor={editor}
        style={{
          minHeight: compact ? 110 : 180,
          padding: "10px 12px",
          fontSize: 14,
          lineHeight: 1.6,
        }}
      />
    </div>
  );
}

export default function RichTextEditor({ value, onChange, compact = false }) {
  return <RichTextEditorImpl value={value} onChange={onChange} compact={compact} />;
}

