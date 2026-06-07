import { Button } from "antd";
import { sanitizeRichHtml } from "../lib/richHtml";
import { useEffect, useMemo, useRef, useState } from "react";
import "./rich-text.css";

type Props = {
  html: string;
  className?: string;
  enableNotes?: boolean;
  onSaveSelection?: (selectionText: string) => void;
};

export default function RichHtmlViewer({
  html,
  className,
  enableNotes,
  onSaveSelection,
}: Props) {
  const safe = useMemo(() => sanitizeRichHtml(html), [html]);
  if (!safe) return null;

  const rootRef = useRef<HTMLDivElement | null>(null);
  const [selectionText, setSelectionText] = useState("");
  const [showSave, setShowSave] = useState(false);

  useEffect(() => {
    if (!enableNotes) return;

    const handleSelection = () => {
      const root = rootRef.current;
      if (!root) return;
      const sel = window.getSelection();
      const txt = sel?.toString().trim() ?? "";
      if (!txt) {
        setSelectionText("");
        setShowSave(false);
        return;
      }
      const anchorNode = sel?.anchorNode;
      if (!anchorNode) {
        setSelectionText("");
        setShowSave(false);
        return;
      }
      const anchorEl = anchorNode.nodeType === Node.ELEMENT_NODE ? (anchorNode as Element) : anchorNode.parentElement;
      if (!anchorEl || !root.contains(anchorEl)) {
        setSelectionText("");
        setShowSave(false);
        return;
      }
      setSelectionText(txt);
      setShowSave(true);
    };

    document.addEventListener("selectionchange", handleSelection);
    return () => document.removeEventListener("selectionchange", handleSelection);
  }, [enableNotes]);

  const save = () => {
    const txt = selectionText.trim();
    if (!txt) return;
    onSaveSelection?.(txt);
    setSelectionText("");
    setShowSave(false);
    try {
      window.getSelection()?.removeAllRanges();
    } catch {
      // ignore
    }
  };

  return (
    <div className="rich-html-viewer">
      <div
        ref={rootRef}
        className={["rich-html-content", className].filter(Boolean).join(" ")}
        dangerouslySetInnerHTML={{ __html: safe }}
      />
      {enableNotes && showSave && (
        <div className="rich-html-viewer__save">
          <Button size="small" type="primary" onClick={save}>
            Сохранить в заметки
          </Button>
        </div>
      )}
    </div>
  );
}
