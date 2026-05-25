import bleach

ALLOWED_TAGS = [
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
]

ALLOWED_ATTRIBUTES = {
    "a": ["href", "title", "target", "rel"],
    "img": ["src", "alt", "title"],
}


def sanitize_html(html: str) -> str:
    if not html or not str(html).strip():
        return ""
    return bleach.clean(
        str(html),
        tags=ALLOWED_TAGS,
        attributes=ALLOWED_ATTRIBUTES,
        strip=True,
    )


def sanitize_step_content(content: dict | None) -> dict:
    if not content:
        return {}
    result = dict(content)
    if "body_html" in result:
        result["body_html"] = sanitize_html(result.get("body_html") or "")
    if "condition_html" in result:
        result["condition_html"] = sanitize_html(result.get("condition_html") or "")
    if "wrong_answer_html" in result:
        result["wrong_answer_html"] = sanitize_html(result.get("wrong_answer_html") or "")
    if "option_feedback" in result and isinstance(result["option_feedback"], list):
        result["option_feedback"] = [
            sanitize_html(item) if item else "" for item in result["option_feedback"]
        ]
    return result
