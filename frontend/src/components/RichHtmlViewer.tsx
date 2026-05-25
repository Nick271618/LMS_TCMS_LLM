import { sanitizeRichHtml } from "../lib/richHtml";
import "./rich-text.css";

type Props = {
  html: string;
  className?: string;
};

export default function RichHtmlViewer({ html, className }: Props) {
  const safe = sanitizeRichHtml(html);
  if (!safe) return null;

  return (
    <div
      className={["rich-html-content", className].filter(Boolean).join(" ")}
      dangerouslySetInnerHTML={{ __html: safe }}
    />
  );
}
