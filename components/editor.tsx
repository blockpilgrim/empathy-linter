"use client";

import { useEffect } from "react";
import {
  useEditor,
  EditorContent,
  type Editor as TipTapEditor,
} from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import EmpathyFlag from "@/lib/empathy-extension";

interface EditorProps {
  content?: string;
  onUpdate?: (text: string) => void;
  onEditorReady?: (editor: TipTapEditor) => void;
}

export default function Editor({
  content,
  onUpdate,
  onEditorReady,
}: EditorProps) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        bold: false,
        italic: false,
        strike: false,
        code: false,
        codeBlock: false,
        blockquote: false,
        bulletList: false,
        orderedList: false,
        listItem: false,
        heading: false,
        horizontalRule: false,
      }),
      Placeholder.configure({
        placeholder: "Paste your documentation here, or start writing...",
      }),
      EmpathyFlag,
    ],
    content,
    onUpdate: ({ editor }) => {
      onUpdate?.(editor.getText());
    },
  });

  useEffect(() => {
    if (editor) {
      onEditorReady?.(editor);
    }
  }, [editor, onEditorReady]);

  return (
    <div className="tiptap-editor-wrapper">
      <EditorContent editor={editor} />
    </div>
  );
}
