import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")

import django

django.setup()

from apps.content.models import Step, StepSubmission
from apps.llm.grading import LlmGradingError, call_ollama, grade_test_case_submission

step_id = sys.argv[1] if len(sys.argv) > 1 else None
if step_id:
    step = Step.objects.get(pk=step_id)
    sub = StepSubmission.objects.filter(step=step).order_by("-submitted_at").first()
    if not sub:
        print("No submission")
        sys.exit(1)
    try:
        r = grade_test_case_submission(sub, step)
        print("GRADE OK", r["total_percent"], r["summary"][:80])
    except LlmGradingError as e:
        print("GRADE ERR", e)
else:
    # test prompt format only
    from apps.llm.grading import PROMPT_PATH
    from apps.content.rubric import rubric_from_step_content

    step = Step.objects.filter(step_type="test_case").first()
    if not step:
        print("No test_case step")
        sys.exit(1)
    content = step.content or {}
    rubric = rubric_from_step_content(content)
    template = PROMPT_PATH.read_text(encoding="utf-8")
    try:
        prompt = template.format(
            condition_html=content.get("condition_html", ""),
            rubric_text="test",
            reference_block="",
            title="t",
            preconditions="",
            execution_steps="1. step",
            expected_result="ok",
            criteria_ids="tz_alignment",
        )
        print("PROMPT FORMAT OK, len", len(prompt))
        print(call_ollama(prompt[:500] + "\n\nОтветь JSON: {\"total_percent\":50,\"criteria\":[],\"summary\":\"test\",\"recommendations\":[]}"))
    except Exception as e:
        print("ERR", type(e).__name__, e)
