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

FORM_ALLOWED_TAGS = ALLOWED_TAGS + [
    "form",
    "label",
    "input",
    "button",
    "select",
    "option",
    "textarea",
    "fieldset",
    "legend",
    "div",
    "span",
]

ALLOWED_ATTRIBUTES = {
    "a": ["href", "title", "target", "rel"],
    "img": ["src", "alt", "title"],
}

FORM_ALLOWED_ATTRIBUTES = {
    **ALLOWED_ATTRIBUTES,
    "input": ["type", "name", "id", "placeholder", "required", "disabled", "value", "min", "max", "checked"],
    "button": ["type", "disabled"],
    "label": ["for"],
    "select": ["name", "id", "required", "disabled"],
    "option": ["value", "selected", "disabled"],
    "textarea": ["name", "id", "placeholder", "required", "disabled", "rows", "cols"],
    "form": ["id", "class"],
    "div": ["class"],
    "span": ["class"],
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


def sanitize_form_html(html: str) -> str:
    if not html or not str(html).strip():
        return ""
    return bleach.clean(
        str(html),
        tags=FORM_ALLOWED_TAGS,
        attributes=FORM_ALLOWED_ATTRIBUTES,
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
    if "prompt_html" in result:
        result["prompt_html"] = sanitize_html(result.get("prompt_html") or "")
    if "wrong_answer_html" in result:
        result["wrong_answer_html"] = sanitize_html(result.get("wrong_answer_html") or "")
    if "option_feedback" in result and isinstance(result["option_feedback"], list):
        result["option_feedback"] = [
            sanitize_html(item) if item else "" for item in result["option_feedback"]
        ]
    if "task_html" in result:
        result["task_html"] = sanitize_html(result.get("task_html") or "")
    if "form_html" in result:
        result["form_html"] = sanitize_form_html(result.get("form_html") or "")
    return result
