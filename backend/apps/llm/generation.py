import json
import logging
from pathlib import Path

from apps.content.html_sanitize import sanitize_form_html, sanitize_html, sanitize_step_content
from apps.content.rubric import default_rubric, normalize_rubric

from .grading import LlmGradingError, _extract_json, call_ollama

logger = logging.getLogger(__name__)

GENERATE_UI_PRACTICE_PATH = Path(__file__).parent / "prompts" / "generate_ui_practice.txt"

ALLOWED_FIELD_TYPES = {"text", "email", "password", "number", "checkbox", "select", "textarea"}


def _normalize_fields(raw) -> list[dict]:
    if not isinstance(raw, list):
        return []
    fields = []
    for item in raw:
        if not isinstance(item, dict):
            continue
        fid = str(item.get("id", "")).strip()
        label = str(item.get("label", "")).strip()
        ftype = str(item.get("type", "text")).strip().lower()
        if not fid or not label:
            continue
        if ftype not in ALLOWED_FIELD_TYPES:
            ftype = "text"
        field = {
            "id": fid,
            "label": label,
            "type": ftype,
            "required": bool(item.get("required", False)),
            "placeholder": str(item.get("placeholder", "") or ""),
        }
        if ftype == "select":
            opts = item.get("options", [])
            if isinstance(opts, list):
                field["options"] = [str(o) for o in opts if str(o).strip()]
            else:
                field["options"] = []
        fields.append(field)
    return fields


def _fields_to_form_html(fields: list[dict]) -> str:
    parts = ['<form id="ui-practice-form">']
    for f in fields:
        fid = f["id"]
        label = f["label"]
        ftype = f["type"]
        req = " required" if f.get("required") else ""
        ph = f.get("placeholder", "")
        parts.append(f'<label for="{fid}">{label}</label>')
        if ftype == "textarea":
            parts.append(
                f'<textarea id="{fid}" name="{fid}" placeholder="{ph}"{req} rows="3"></textarea>'
            )
        elif ftype == "select":
            opts = f.get("options") or []
            opt_html = "".join(f'<option value="{o}">{o}</option>' for o in opts)
            parts.append(f'<select id="{fid}" name="{fid}"{req}>{opt_html}</select>')
        elif ftype == "checkbox":
            parts.append(f'<input type="checkbox" id="{fid}" name="{fid}" />')
        else:
            inp_type = ftype if ftype in ("email", "password", "number") else "text"
            parts.append(
                f'<input type="{inp_type}" id="{fid}" name="{fid}" placeholder="{ph}"{req} />'
            )
    parts.append('<button type="button">Отправить</button>')
    parts.append("</form>")
    return sanitize_form_html("\n".join(parts))


def normalize_ui_practice_content(raw: dict | None) -> dict:
    if not isinstance(raw, dict):
        raw = {}
    fields = _normalize_fields(raw.get("fields"))
    if len(fields) < 1:
        fields = [
            {"id": "field1", "label": "Поле 1", "type": "text", "required": True, "placeholder": ""},
            {"id": "field2", "label": "Поле 2", "type": "text", "required": False, "placeholder": ""},
        ]
    form_html = raw.get("form_html", "")
    if not str(form_html).strip():
        form_html = _fields_to_form_html(fields)
    else:
        form_html = sanitize_form_html(str(form_html))

    task_html = sanitize_html(str(raw.get("task_html") or "<p>Протестируйте форму и составьте тест-кейс.</p>"))
    ui_hints = raw.get("ui_hints", [])
    if not isinstance(ui_hints, list):
        ui_hints = []
    ui_hints = [str(h).strip() for h in ui_hints if str(h).strip()][:6]

    rubric = normalize_rubric(raw.get("rubric"))
    if not rubric.get("criteria"):
        rubric = default_rubric()

    ref = raw.get("reference_test_case")
    reference_test_case = {}
    if isinstance(ref, dict):
        for key in ("title", "preconditions", "execution_steps", "expected_result"):
            reference_test_case[key] = str(ref.get(key, "") or "")

    content = {
        "task_html": task_html,
        "form_html": form_html,
        "fields": fields,
        "ui_hints": ui_hints,
        "rubric": rubric,
    }
    if any(reference_test_case.values()):
        content["reference_test_case"] = reference_test_case
    return sanitize_step_content(content)


def validate_ui_practice_content(content: dict) -> None:
    fields = content.get("fields", [])
    if not isinstance(fields, list) or len(fields) < 1:
        raise LlmGradingError("Сгенерировано менее одного поля формы")
    if not content.get("task_html"):
        raise LlmGradingError("Пустое задание (task_html)")


def _parse_generation_response(raw: str) -> dict:
    try:
        return _extract_json(raw)
    except LlmGradingError:
        fix_prompt = (
            "Преобразуй текст ниже в один валидный JSON-объект. "
            "Только двойные кавычки, без markdown и пояснений.\n\n"
            + raw[:6000]
        )
        fixed_raw = call_ollama(fix_prompt)
        return _extract_json(fixed_raw)


def generate_ui_practice(prompt: str) -> dict:
    prompt = str(prompt or "").strip()
    if not prompt:
        raise LlmGradingError("Пустой запрос")

    template = GENERATE_UI_PRACTICE_PATH.read_text(encoding="utf-8")
    full_prompt = template.replace("{prompt}", prompt)
    raw = call_ollama(full_prompt)
    parsed = _parse_generation_response(raw)

    title = str(parsed.get("title", "") or "UI для тестирования").strip()[:255]
    try:
        points = int(parsed.get("points", 5) or 5)
    except (TypeError, ValueError):
        points = 5
    points = max(1, min(100, points))

    content_raw = parsed.get("content", {})
    if not isinstance(content_raw, dict):
        content_raw = {}
    content = normalize_ui_practice_content(content_raw)
    validate_ui_practice_content(content)

    rationale = str(parsed.get("rationale", "") or "")

    return {
        "title": title,
        "points": points,
        "content": content,
        "rationale": rationale,
        "prompt_log": full_prompt[:8000],
        "raw_response": raw[:8000],
    }


def build_ui_practice_condition(content: dict) -> str:
    parts = []
    task = content.get("task_html", "")
    if task:
        parts.append(f"ЗАДАНИЕ:\n{task}")
    fields = content.get("fields", [])
    if isinstance(fields, list) and fields:
        lines = []
        for f in fields:
            if not isinstance(f, dict):
                continue
            req = "обязательное" if f.get("required") else "необязательное"
            line = f"- {f.get('label', f.get('id', ''))} ({f.get('type', 'text')}, {req})"
            if f.get("options"):
                line += f"; варианты: {', '.join(str(o) for o in f['options'])}"
            lines.append(line)
        if lines:
            parts.append("ПОЛЯ ФОРМЫ:\n" + "\n".join(lines))
    hints = content.get("ui_hints", [])
    if isinstance(hints, list) and hints:
        parts.append("ПОДСКАЗКИ ДЛЯ ПРОВЕРКИ:\n" + "\n".join(f"- {h}" for h in hints))
    return "\n\n".join(parts)
