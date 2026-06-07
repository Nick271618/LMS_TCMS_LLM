import json
import logging
import re
from decimal import Decimal
from pathlib import Path

from django.conf import settings

from apps.content.rubric import CRITERION_LABELS, enabled_criteria, rubric_from_step_content
from apps.content.models import StepType

logger = logging.getLogger(__name__)

PROMPT_PATH = Path(__file__).parent / "prompts" / "test_case_grade.txt"
FREE_ANSWER_PROMPT_PATH = Path(__file__).parent / "prompts" / "free_answer_grade.txt"


class LlmGradingError(Exception):
    pass


def _ollama_enabled() -> bool:
    return bool(getattr(settings, "OLLAMA_ENABLED", True))


def _build_rubric_text(rubric: dict) -> str:
    lines = []
    for c in enabled_criteria(rubric):
        label = CRITERION_LABELS.get(c["id"], c["id"])
        hint = c.get("hint", "").strip()
        lines.append(f"- {c['id']} ({label}): вес {c['weight']}%" + (f"; подсказка: {hint}" if hint else ""))
    if rubric.get("free_text"):
        lines.append(f"Дополнительно от преподавателя: {rubric['free_text']}")
    lines.append(f"Порог зачёта: {rubric.get('pass_percent', 60)}%")
    return "\n".join(lines)


def _build_reference_block(content: dict) -> str:
    ref = content.get("reference_test_case")
    if not isinstance(ref, dict):
        return ""
    parts = []
    for key, label in [
        ("title", "Название"),
        ("preconditions", "Предусловия"),
        ("execution_steps", "Шаги"),
        ("expected_result", "Ожидаемый результат"),
    ]:
        val = ref.get(key, "")
        if val:
            parts.append(f"{label}: {val}")
    if not parts:
        return ""
    return "ЭТАЛОН (только для сверки полноты сценариев, не требуй дословного совпадения):\n" + "\n".join(parts)


def _weighted_percent(parsed: dict, rubric_criteria: list[dict]) -> float:
    """Пересчёт итога по весам рубрики, если модель вернула неточный total_percent."""
    criteria_out = parsed.get("criteria", [])
    if not isinstance(criteria_out, list) or not rubric_criteria:
        return float(parsed.get("total_percent", 0))
    by_id = {c["id"]: c for c in rubric_criteria}
    total_weight = sum(c["weight"] for c in rubric_criteria) or 1
    weighted = 0.0
    for item in criteria_out:
        if not isinstance(item, dict):
            continue
        cid = item.get("id")
        if cid not in by_id:
            continue
        try:
            pct = float(item.get("percent", 0))
        except (TypeError, ValueError):
            pct = 0
        weighted += pct * by_id[cid]["weight"]
    if weighted > 0:
        return weighted / total_weight
    try:
        return float(parsed.get("total_percent", 0))
    except (TypeError, ValueError):
        return 0.0


def _strip_code_fence(text: str) -> str:
    text = text.strip()
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?\s*", "", text, flags=re.IGNORECASE)
        text = re.sub(r"\s*```$", "", text)
    return text.strip()


def _find_json_object(text: str) -> str:
    text = _strip_code_fence(text)
    start = text.find("{")
    if start < 0:
        raise LlmGradingError("JSON not found in model response")
    depth = 0
    in_string = False
    escape = False
    quote = ""
    for i in range(start, len(text)):
        ch = text[i]
        if in_string:
            if escape:
                escape = False
            elif ch == "\\":
                escape = True
            elif ch == quote:
                in_string = False
            continue
        if ch in ('"', "'"):
            in_string = True
            quote = ch
            continue
        if ch == "{":
            depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0:
                return text[start : i + 1]
    match = re.search(r"\{[\s\S]*\}", text)
    if match:
        return match.group()
    raise LlmGradingError("JSON not found in model response")


def _parse_json_object(chunk: str) -> dict:
    import ast

    attempts = [chunk]
    fixed = chunk
    fixed = re.sub(r"\bTrue\b", "true", fixed)
    fixed = re.sub(r"\bFalse\b", "false", fixed)
    fixed = re.sub(r"\bNone\b", "null", fixed)
    fixed = re.sub(r",(\s*[}\]])", r"\1", fixed)
    if fixed != chunk:
        attempts.append(fixed)

    last_err: Exception | None = None
    for candidate in attempts:
        try:
            parsed = json.loads(candidate)
            if isinstance(parsed, dict):
                return parsed
        except json.JSONDecodeError as e:
            last_err = e
        try:
            parsed = ast.literal_eval(candidate)
            if isinstance(parsed, dict):
                return parsed
        except (SyntaxError, ValueError) as e:
            last_err = e

    detail = str(last_err) if last_err else "unknown parse error"
    raise LlmGradingError(f"Невалидный JSON в ответе модели: {detail}") from last_err


def _extract_json(text: str) -> dict:
    chunk = _find_json_object(text)
    return _parse_json_object(chunk)


def call_ollama(prompt: str) -> str:
    import urllib.error
    import urllib.request

    host = getattr(settings, "OLLAMA_HOST", "http://127.0.0.1:11434").rstrip("/")
    model = getattr(settings, "OLLAMA_MODEL", "qwen2.5:7b-instruct-q4_K_M")
    url = f"{host}/api/generate"
    body = json.dumps(
        {
            "model": model,
            "prompt": prompt,
            "stream": False,
            "options": {
                "temperature": getattr(settings, "OLLAMA_TEMPERATURE", 0),
                "num_ctx": getattr(settings, "OLLAMA_NUM_CTX", 4096),
            },
        }
    ).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=body,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    timeout = getattr(settings, "OLLAMA_TIMEOUT", 120)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            data = json.loads(resp.read().decode("utf-8"))
    except TimeoutError as e:
        raise LlmGradingError(
            f"Ollama не ответил за {timeout} с. "
            "Проверьте, что Ollama запущен, или уменьшите модель (OLLAMA_MODEL=llama3.2:3b-instruct-q4_K_M)."
        ) from e
    except urllib.error.HTTPError as e:
        detail = ""
        try:
            err_body = json.loads(e.read().decode("utf-8"))
            detail = err_body.get("error", "")
        except (json.JSONDecodeError, UnicodeDecodeError, AttributeError):
            detail = str(e.reason or e)
        if "system memory" in detail.lower() or "memory" in detail.lower():
            raise LlmGradingError(
                "Недостаточно оперативной памяти для модели 7B. "
                "Закройте лишние программы или в backend/.env укажите меньшую модель, "
                "например OLLAMA_MODEL=llama3.2:3b-instruct-q4_K_M (после: ollama pull llama3.2:3b-instruct-q4_K_M)."
            ) from e
        raise LlmGradingError(f"Ollama: {detail or e}") from e
    except urllib.error.URLError as e:
        if isinstance(getattr(e, "reason", None), TimeoutError):
            raise LlmGradingError(
                f"Ollama не ответил за {timeout} с. "
                "Проверьте, что Ollama запущен, или уменьшите модель (OLLAMA_MODEL=llama3.2:3b-instruct-q4_K_M)."
            ) from e
        raise LlmGradingError(
            "Ollama не запущен. Запустите Ollama из меню Пуск или выполните: ollama serve"
        ) from e
    return data.get("response", "")


def grade_test_case_submission(submission, step) -> dict:
    if not _ollama_enabled():
        raise LlmGradingError("Ollama disabled")

    content = step.content or {}
    rubric = rubric_from_step_content(content)
    criteria = enabled_criteria(rubric)
    criteria_ids = ", ".join(c["id"] for c in criteria)

    if step.step_type == StepType.UI_PRACTICE:
        from apps.llm.generation import build_ui_practice_condition

        condition_html = build_ui_practice_condition(content)
    else:
        condition_html = content.get("condition_html", "")

    payload = submission.payload or {}
    template = PROMPT_PATH.read_text(encoding="utf-8")
    replacements = {
        "condition_html": condition_html,
        "rubric_text": _build_rubric_text(rubric),
        "reference_block": _build_reference_block(content),
        "title": payload.get("title", ""),
        "preconditions": payload.get("preconditions", ""),
        "execution_steps": payload.get("execution_steps", ""),
        "expected_result": payload.get("expected_result", ""),
        "criteria_ids": criteria_ids,
    }
    prompt = template
    for key, value in replacements.items():
        prompt = prompt.replace("{" + key + "}", str(value))

    raw = call_ollama(prompt)
    parsed = _extract_json(raw)

    total_percent = _weighted_percent(parsed, criteria)
    total_percent = max(0, min(100, total_percent))

    max_score = submission.max_score or step.points
    score = Decimal(str(round(float(max_score) * total_percent / 100, 2)))

    criteria_out = parsed.get("criteria", [])
    if not isinstance(criteria_out, list):
        criteria_out = []

    recommendations = parsed.get("recommendations", [])
    if not isinstance(recommendations, list):
        recommendations = []

    return {
        "total_percent": total_percent,
        "score": score,
        "criteria": criteria_out,
        "summary": str(parsed.get("summary", "")),
        "recommendations": [str(r) for r in recommendations],
        "prompt_log": prompt[:8000],
        "raw_response": raw[:8000],
    }


def _normalize_free_answer_rubric(raw) -> dict:
    """Рубрика для свободного ответа: разрешаем произвольные id критериев."""
    default = {
        "criteria": [
            {
                "id": "definition_accuracy",
                "enabled": True,
                "weight": 50,
                "hint": "",
            },
            {"id": "completeness", "enabled": True, "weight": 30, "hint": ""},
            {"id": "clarity", "enabled": True, "weight": 20, "hint": ""},
        ],
        "pass_percent": 60,
        "free_text": "",
    }
    if isinstance(raw, dict) and isinstance(raw.get("criteria"), list):
        criteria = []
        for item in raw.get("criteria", []):
            if not isinstance(item, dict):
                continue
            cid = str(item.get("id", "")).strip()
            if not cid:
                continue
            criteria.append(
                {
                    "id": cid,
                    "enabled": bool(item.get("enabled", True)),
                    "weight": int(item.get("weight", 0) or 0),
                    "hint": str(item.get("hint", "") or ""),
                }
            )
        if criteria:
            return {
                "criteria": criteria,
                "pass_percent": int(raw.get("pass_percent", 60) or 60),
                "free_text": str(raw.get("free_text", "") or ""),
            }
    if isinstance(raw, str) and raw.strip():
        out = dict(default)
        out["free_text"] = raw.strip()
        return out
    return default


DEFAULT_FREE_ANSWER_SCORE_BANDS = [
    {"min_percent": 0, "points": 0},
    {"min_percent": 60, "points": 1},
    {"min_percent": 80, "points": 2},
    {"min_percent": 90, "points": 3},
]


def _normalize_score_bands(raw) -> list[dict]:
    bands = []
    if isinstance(raw, list):
        for item in raw:
            if not isinstance(item, dict):
                continue
            try:
                min_percent = int(item.get("min_percent", 0))
                points = int(item.get("points", 0))
            except (TypeError, ValueError):
                continue
            min_percent = max(0, min(100, min_percent))
            points = max(0, points)
            bands.append({"min_percent": min_percent, "points": points})
    if not bands:
        return list(DEFAULT_FREE_ANSWER_SCORE_BANDS)
    bands.sort(key=lambda b: b["min_percent"])
    if bands[0]["min_percent"] != 0:
        bands.insert(0, {"min_percent": 0, "points": 0})
    return bands


def _score_from_bands(total_percent: float, bands: list[dict]) -> int:
    awarded = 0
    for band in sorted(bands, key=lambda b: b["min_percent"]):
        if total_percent >= band["min_percent"]:
            awarded = band["points"]
    return awarded


def _band_threshold_for_points(bands: list[dict], points: int) -> int | None:
    for band in sorted(bands, key=lambda b: b["min_percent"], reverse=True):
        if band["points"] == points:
            return band["min_percent"]
    return None


def max_points_from_score_bands(bands: list[dict]) -> int:
    if not bands:
        return 0
    return max(b["points"] for b in bands)


def _format_score_bands_text(bands: list[dict]) -> str:
    parts = []
    for band in sorted(bands, key=lambda b: b["min_percent"]):
        if band["min_percent"] == 0 and band["points"] == 0:
            continue
        parts.append(f"от {band['min_percent']}% — {band['points']} балл(ов)")
    if not parts:
        return "Шкала баллов: 0 баллов при любом проценте."
    return "Шкала баллов: " + "; ".join(parts) + "."


def _free_answer_enabled_criteria(rubric: dict) -> list[dict]:
    criteria = [c for c in rubric.get("criteria", []) if isinstance(c, dict) and c.get("enabled")]
    if not criteria:
        criteria = _normalize_free_answer_rubric(None)["criteria"]
    return [
        {
            "id": str(c.get("id", "")).strip(),
            "weight": int(c.get("weight", 0) or 0),
            "hint": str(c.get("hint", "") or ""),
        }
        for c in criteria
        if str(c.get("id", "")).strip()
    ]


def grade_free_answer_submission(submission, step) -> dict:
    if not _ollama_enabled():
        raise LlmGradingError("Ollama disabled")

    content = step.content or {}
    rubric = _normalize_free_answer_rubric(content.get("rubric"))
    criteria = _free_answer_enabled_criteria(rubric)
    criteria_ids = ", ".join(c["id"] for c in criteria)

    rubric_lines = []
    for c in criteria:
        hint = c.get("hint", "").strip()
        rubric_lines.append(
            f"- {c['id']}: вес {c['weight']}%" + (f"; подсказка: {hint}" if hint else "")
        )
    if rubric.get("free_text"):
        rubric_lines.append(f"Дополнительно от преподавателя: {rubric['free_text']}")
    rubric_lines.append(f"Порог зачёта: {rubric.get('pass_percent', 60)}%")
    score_bands = _normalize_score_bands(content.get("score_bands"))
    rubric_lines.append(_format_score_bands_text(score_bands))
    rubric_text = "\n".join(rubric_lines)

    reference_answer = content.get("reference_answer", "")
    reference_block = ""
    if isinstance(reference_answer, str) and reference_answer.strip():
        reference_block = (
            "ЭТАЛОННЫЙ ОТВЕТ (ориентир по смыслу, не требуй дословного совпадения):\n"
            + reference_answer.strip()
        )

    payload = submission.payload or {}
    answer = str(payload.get("answer", "") or "")

    template = FREE_ANSWER_PROMPT_PATH.read_text(encoding="utf-8")
    replacements = {
        "prompt_html": content.get("prompt_html", ""),
        "rubric_text": rubric_text,
        "reference_block": reference_block,
        "answer": answer,
        "criteria_ids": criteria_ids,
    }
    prompt = template
    for key, value in replacements.items():
        prompt = prompt.replace("{" + key + "}", str(value))

    raw = call_ollama(prompt)
    parsed = _extract_json(raw)

    total_percent = _weighted_percent(parsed, criteria)
    total_percent = max(0, min(100, total_percent))

    awarded_points = _score_from_bands(total_percent, score_bands)
    score = Decimal(str(awarded_points))
    band_min_percent = _band_threshold_for_points(score_bands, awarded_points)

    criteria_out = parsed.get("criteria", [])
    if not isinstance(criteria_out, list):
        criteria_out = []

    recommendations = parsed.get("recommendations", [])
    if not isinstance(recommendations, list):
        recommendations = []

    return {
        "total_percent": total_percent,
        "score": score,
        "awarded_points": awarded_points,
        "band_min_percent": band_min_percent,
        "criteria": criteria_out,
        "summary": str(parsed.get("summary", "")),
        "recommendations": [str(r) for r in recommendations],
        "prompt_log": prompt[:8000],
        "raw_response": raw[:8000],
    }
