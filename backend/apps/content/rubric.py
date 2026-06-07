"""Критерии оценки тест-кейсов для LLM."""

DEFAULT_CRITERIA = [
    {"id": "tz_alignment", "weight": 30},
    {"id": "structure", "weight": 20},
    {"id": "steps_quality", "weight": 25},
    {"id": "expected_result", "weight": 15},
    {"id": "preconditions", "weight": 10},
]

CRITERION_LABELS = {
    "tz_alignment": "Соответствие тестовой документации",
    "structure": "Структура и полнота полей",
    "steps_quality": "Качество шагов",
    "expected_result": "Ожидаемый результат",
    "preconditions": "Предусловия",
}


def default_rubric() -> dict:
    return {
        "criteria": [
            {**c, "enabled": True, "hint": ""} for c in DEFAULT_CRITERIA
        ],
        "pass_percent": 60,
        "free_text": "",
    }


def normalize_rubric(raw) -> dict:
    if isinstance(raw, dict) and "criteria" in raw:
        criteria = []
        for item in raw.get("criteria", []):
            if not isinstance(item, dict):
                continue
            cid = item.get("id")
            if cid not in CRITERION_LABELS:
                continue
            criteria.append(
                {
                    "id": cid,
                    "enabled": bool(item.get("enabled", True)),
                    "weight": int(item.get("weight", 10)),
                    "hint": str(item.get("hint", "")),
                }
            )
        if not criteria:
            return default_rubric()
        return {
            "criteria": criteria,
            "pass_percent": int(raw.get("pass_percent", 60)),
            "free_text": str(raw.get("free_text", "")),
        }
    if isinstance(raw, str) and raw.strip():
        base = default_rubric()
        base["free_text"] = raw.strip()
        return base
    return default_rubric()


def rubric_from_step_content(content: dict | None) -> dict:
    if not content:
        return default_rubric()
    return normalize_rubric(content.get("rubric"))


def enabled_criteria(rubric: dict) -> list[dict]:
    items = [c for c in rubric.get("criteria", []) if c.get("enabled")]
    if not items:
        return default_rubric()["criteria"]
    total = sum(c["weight"] for c in items) or 1
    return [{**c, "weight": c["weight"]} for c in items if c.get("enabled")]
