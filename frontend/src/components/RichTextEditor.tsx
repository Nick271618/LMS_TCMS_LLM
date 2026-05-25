import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Button, Input, Segmented, Space, Tooltip } from "antd";
import { useEffect, useState } from "react";
import { ru } from "../i18n/ru";
import { normalizeEditorHtml } from "../lib/richHtml";
import "./rich-text.css";

type Props = {
  value?: string;
  onChange?: (html: string) => void;
  placeholder?: string;
  minHeight?: number;
};

type TabKey = "visual" | "html";

export default function RichTextEditor({
  value = "",
  onChange,
  placeholder,
  minHeight = 160,
}: Props) {
  const [tab, setTab] = useState<TabKey>("visual");
  const [htmlSource, setHtmlSource] = useState(value || "");

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { rel: "noopener noreferrer", target: "_blank" },
      }),
      Image.configure({ inline: false }),
      Placeholder.configure({
        placeholder: placeholder ?? ru.editor.placeholder,
      }),
    ],
    content: value || "<p></p>",
    onUpdate: ({ editor: ed }) => {
      const html = normalizeEditorHtml(ed.getHTML());
      onChange?.(html);
      setHtmlSource(html || "<p></p>");
    },
  });

  useEffect(() => {
    if (!editor || tab === "html") return;
    const current = normalizeEditorHtml(editor.getHTML());
    const external = normalizeEditorHtml(value);
    if (current !== external) {
      editor.commands.setContent(value || "<p></p>", { emitUpdate: false });
      setHtmlSource(value || "<p></p>");
    }
  }, [value, editor, tab]);

  const emitHtml = (html: string) => {
    const normalized = normalizeEditorHtml(html);
    onChange?.(normalized);
    setHtmlSource(html);
  };

  const switchTab = (next: TabKey) => {
    if (!editor) {
      setTab(next);
      return;
    }
    if (next === "html" && tab === "visual") {
      const html = editor.getHTML();
      setHtmlSource(html);
      emitHtml(html);
    }
    if (next === "visual" && tab === "html") {
      editor.commands.setContent(htmlSource || "<p></p>", { emitUpdate: false });
      emitHtml(htmlSource);
    }
    setTab(next);
  };

  const setLink = () => {
    if (!editor) return;
    const prev = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt(ru.editor.linkPrompt, prev || "https://");
    if (url === null) return;
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  };

  const setImage = () => {
    if (!editor) return;
    const url = window.prompt(ru.editor.imagePrompt, "https://");
    if (!url) return;
    editor.chain().focus().setImage({ src: url }).run();
  };

  if (!editor) {
    return null;
  }

  return (
    <div className="rich-text-editor">
      <div style={{ padding: "8px 8px 0" }}>
        <Segmented
          value={tab}
          onChange={(v) => switchTab(v as TabKey)}
          options={[
            { label: ru.editor.tabVisual, value: "visual" },
            { label: ru.editor.tabHtml, value: "html" },
          ]}
        />
      </div>

      {tab === "visual" ? (
        <>
          <div className="rich-text-editor__toolbar">
            <Space wrap size={4}>
              <Tooltip title={ru.editor.bold}>
                <Button
                  type={editor.isActive("bold") ? "primary" : "default"}
                  size="small"
                  onClick={() => editor.chain().focus().toggleBold().run()}
                >
                  B
                </Button>
              </Tooltip>
              <Tooltip title={ru.editor.italic}>
                <Button
                  type={editor.isActive("italic") ? "primary" : "default"}
                  size="small"
                  onClick={() => editor.chain().focus().toggleItalic().run()}
                >
                  I
                </Button>
              </Tooltip>
              <Tooltip title={ru.editor.underline}>
                <Button
                  type={editor.isActive("underline") ? "primary" : "default"}
                  size="small"
                  onClick={() => editor.chain().focus().toggleUnderline().run()}
                >
                  U
                </Button>
              </Tooltip>
              <Tooltip title={ru.editor.heading2}>
                <Button
                  type={editor.isActive("heading", { level: 2 }) ? "primary" : "default"}
                  size="small"
                  onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                >
                  H2
                </Button>
              </Tooltip>
              <Tooltip title={ru.editor.heading3}>
                <Button
                  type={editor.isActive("heading", { level: 3 }) ? "primary" : "default"}
                  size="small"
                  onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
                >
                  H3
                </Button>
              </Tooltip>
              <Tooltip title={ru.editor.bulletList}>
                <Button
                  type={editor.isActive("bulletList") ? "primary" : "default"}
                  size="small"
                  onClick={() => editor.chain().focus().toggleBulletList().run()}
                >
                  •
                </Button>
              </Tooltip>
              <Tooltip title={ru.editor.orderedList}>
                <Button
                  type={editor.isActive("orderedList") ? "primary" : "default"}
                  size="small"
                  onClick={() => editor.chain().focus().toggleOrderedList().run()}
                >
                  1.
                </Button>
              </Tooltip>
              <Tooltip title={ru.editor.blockquote}>
                <Button
                  type={editor.isActive("blockquote") ? "primary" : "default"}
                  size="small"
                  onClick={() => editor.chain().focus().toggleBlockquote().run()}
                >
                  “
                </Button>
              </Tooltip>
              <Tooltip title={ru.editor.codeBlock}>
                <Button
                  type={editor.isActive("codeBlock") ? "primary" : "default"}
                  size="small"
                  onClick={() => editor.chain().focus().toggleCodeBlock().run()}
                >
                  {"</>"}
                </Button>
              </Tooltip>
              <Tooltip title={ru.editor.link}>
                <Button size="small" onClick={setLink}>
                  URL
                </Button>
              </Tooltip>
              <Tooltip title={ru.editor.image}>
                <Button size="small" onClick={setImage}>
                  IMG
                </Button>
              </Tooltip>
              <Tooltip title={ru.editor.undo}>
                <Button
                  size="small"
                  disabled={!editor.can().undo()}
                  onClick={() => editor.chain().focus().undo().run()}
                >
                  ↶
                </Button>
              </Tooltip>
              <Tooltip title={ru.editor.redo}>
                <Button
                  size="small"
                  disabled={!editor.can().redo()}
                  onClick={() => editor.chain().focus().redo().run()}
                >
                  ↷
                </Button>
              </Tooltip>
            </Space>
          </div>
          <div
            className="rich-text-editor__content"
            style={{ minHeight, ["--editor-min-h" as string]: `${Math.max(minHeight - 48, 120)}px` }}
          >
            <EditorContent editor={editor} />
          </div>
        </>
      ) : (
        <div style={{ padding: 8 }}>
          <Input.TextArea
            rows={Math.max(12, Math.round(minHeight / 24))}
            value={htmlSource}
            onChange={(e) => {
              const html = e.target.value;
              setHtmlSource(html);
              emitHtml(html);
            }}
            style={{ fontFamily: "monospace", minHeight }}
          />
        </div>
      )}
    </div>
  );
}
