"use client";

import dynamic from "next/dynamic";

const ContentEditor = dynamic(() => import("./ContentEditor"), { ssr: false });

export default function ContentEditorClient(props) {
  return <ContentEditor {...props} />;
}
