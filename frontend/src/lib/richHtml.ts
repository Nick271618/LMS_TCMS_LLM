import DOMPurify from "dompurify";

export const RICH_HTML_ALLOWED_TAGS = [
  "p",
  "br",
  "strong",
  "em",
  "u",
  "h2",
  "h3",
  "ul",
  "ol",
  "li",
  "blockquote",
  "pre",
  "code",
  "a",
  "img",
];

export function sanitizeRichHtml(html: string): string {
  if (!html?.trim()) return "";
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: RICH_HTML_ALLOWED_TAGS,
    ALLOWED_ATTR: ["href", "title", "target", "rel", "src", "alt"],
  });
}

export function normalizeEditorHtml(html: string): string {
  const trimmed = html?.trim() ?? "";
  if (!trimmed || trimmed === "<p></p>" || trimmed === "<p><br></p>") {
    return "";
  }
  return trimmed;
}
