import logging

from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import generics, permissions
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.courses.permissions import IsTeacher
from apps.courses.models import Lesson, ModuleLesson
from apps.llm.generation import generate_ui_practice, normalize_ui_practice_content
from apps.llm.grading import LlmGradingError, grade_free_answer_submission, grade_test_case_submission

from .models import (
    GradingSource,
    Note,
    Step,
    StepDraft,
    StepDraftStatus,
    StepSubmission,
    StepType,
    SubmissionStatus,
)

from .serializers import (
    GradeSubmissionSerializer,
    NoteSerializer,
    StepDraftSerializer,
    StepSerializer,
    StepSubmissionSerializer,
    TestCasePayloadSerializer,
)

logger = logging.getLogger(__name__)


class StepDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Step.objects.all()
    serializer_class = StepSerializer

    def get_permissions(self):
        if self.request.method == "GET":
            return [permissions.IsAuthenticated()]
        return [IsTeacher()]

class SubmitTestCaseView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, step_id):
        step = get_object_or_404(Step, pk=step_id)
        if step.step_type != StepType.TEST_CASE:
            return Response({"detail": "Step is not test_case type."}, status=400)
        payload_ser = TestCasePayloadSerializer(data=request.data)
        payload_ser.is_valid(raise_exception=True)
        payload_data = dict(payload_ser.validated_data)
        submission, _ = StepSubmission.objects.update_or_create(
            step=step,
            user=request.user,
            defaults={
                "payload": payload_data,
                "status": SubmissionStatus.SUBMITTED,
                "max_score": step.points,
                "score": None,
                "feedback": "",
                "grading_source": GradingSource.MANUAL,
                "graded_at": None,
                "graded_by": None,
            },
        )
        submission.submitted_at = timezone.now()
        submission.save(update_fields=["submitted_at"])

        try:
            result = grade_test_case_submission(submission, step)
            payload_data["llm_grade"] = {
                "total_percent": result["total_percent"],
                "criteria": result["criteria"],
                "summary": result["summary"],
                "recommendations": result["recommendations"],
            }
            payload_data["llm_debug"] = {
                "prompt_log": result.get("prompt_log", ""),
                "raw_response": result.get("raw_response", ""),
            }
            submission.payload = payload_data
            submission.score = result["score"]
            submission.feedback = result["summary"]
            submission.status = SubmissionStatus.GRADED
            submission.grading_source = GradingSource.LLM
            submission.graded_at = timezone.now()
            submission.save()
        except LlmGradingError as e:
            logger.warning("LLM grading failed for submission %s: %s", submission.id, e)
            submission.payload = {**payload_data, "llm_error": str(e)}
            submission.status = SubmissionStatus.SUBMITTED
            submission.save(update_fields=["payload", "status"])

        ser = StepSubmissionSerializer(submission, context={"strip_llm_debug": True})
        return Response(ser.data, status=200)


class SubmitFreeAnswerView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, step_id):
        step = get_object_or_404(Step, pk=step_id)
        if step.step_type != StepType.FREE_ANSWER:
            return Response({"detail": "Шаг не является свободным ответом."}, status=400)
        answer = request.data.get("answer", "")
        if not isinstance(answer, str) or not answer.strip():
            return Response({"answer": "Обязательное поле."}, status=400)

        payload_data = {"answer": answer.strip()}
        submission, _ = StepSubmission.objects.update_or_create(
            step=step,
            user=request.user,
            defaults={
                "payload": payload_data,
                "status": SubmissionStatus.SUBMITTED,
                "max_score": step.points,
                "score": None,
                "feedback": "",
                "grading_source": GradingSource.MANUAL,
                "graded_at": None,
                "graded_by": None,
            },
        )
        submission.submitted_at = timezone.now()
        submission.save(update_fields=["submitted_at"])

        try:
            result = grade_free_answer_submission(submission, step)
            payload_data["llm_grade"] = {
                "total_percent": result["total_percent"],
                "awarded_points": result.get("awarded_points"),
                "band_min_percent": result.get("band_min_percent"),
                "criteria": result["criteria"],
                "summary": result["summary"],
                "recommendations": result["recommendations"],
            }
            payload_data["llm_debug"] = {
                "prompt_log": result.get("prompt_log", ""),
                "raw_response": result.get("raw_response", ""),
            }
            submission.payload = payload_data
            submission.score = result["score"]
            submission.feedback = result["summary"]
            submission.status = SubmissionStatus.GRADED
            submission.grading_source = GradingSource.LLM
            submission.graded_at = timezone.now()
            submission.save()
        except LlmGradingError as e:
            logger.warning("LLM grading failed for submission %s: %s", submission.id, e)
            submission.payload = {**payload_data, "llm_error": str(e)}
            submission.status = SubmissionStatus.SUBMITTED
            submission.save(update_fields=["payload", "status"])

        ser = StepSubmissionSerializer(submission, context={"strip_llm_debug": True})
        return Response(ser.data, status=200)


class NotesListCreateView(generics.ListCreateAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = NoteSerializer

    def get_queryset(self):
        qs = Note.objects.filter(user=self.request.user).select_related("step", "step__lesson")
        course = self.request.query_params.get("course")
        if course:
            qs = qs.filter(course_id=course)
        return qs.order_by("-updated_at")

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class NoteDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = NoteSerializer

    def get_queryset(self):
        return Note.objects.filter(user=self.request.user).select_related("step", "step__lesson")

    def partial_update(self, request, *args, **kwargs):
        data = request.data if isinstance(request.data, dict) else {}
        allowed = {"note_text", "selection_text"}
        clean = {k: data.get(k) for k in data.keys() if k in allowed}
        request._full_data = clean  # type: ignore[attr-defined]
        return super().partial_update(request, *args, **kwargs)


class GradeSubmissionView(APIView):
    permission_classes = [IsTeacher]

    def post(self, request, submission_id):
        submission = get_object_or_404(StepSubmission, pk=submission_id)
        ser = GradeSubmissionSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        max_score = submission.max_score or submission.step.points
        score = ser.validated_data["score"]
        if score > max_score:
            return Response({"score": "Exceeds maximum."}, status=400)
        submission.score = score
        submission.feedback = ser.validated_data.get("feedback", "")
        submission.status = SubmissionStatus.GRADED
        submission.grading_source = GradingSource.MANUAL
        submission.graded_by = request.user
        submission.graded_at = timezone.now()
        submission.save()
        return Response(StepSubmissionSerializer(submission).data)

class MySubmissionView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, step_id):
        sub = StepSubmission.objects.filter(step_id=step_id, user=request.user).first()
        if not sub:
            return Response(status=404)
        ser = StepSubmissionSerializer(sub, context={"strip_llm_debug": True})
        return Response(ser.data)


def _match_pairs(step) -> list:
    pairs = step.content.get("pairs", [])
    if not isinstance(pairs, list):
        return []
    result = []
    for item in pairs:
        if isinstance(item, dict):
            left = str(item.get("left", "")).strip()
            right = str(item.get("right", "")).strip()
            if left and right:
                result.append({"left": left, "right": right})
    return result


class SubmitMatchView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, step_id):
        step = get_object_or_404(Step, pk=step_id)
        if step.step_type != StepType.MATCH:
            return Response({"detail": "Шаг не является заданием на сопоставление."}, status=400)
        pairs = _match_pairs(step)
        n = len(pairs)
        if n < 2:
            return Response({"detail": "В задании меньше двух пар."}, status=400)
        mapping = request.data.get("mapping", [])
        if not isinstance(mapping, list) or len(mapping) != n:
            return Response(
                {"detail": f"mapping должен быть массивом из {n} индексов."},
                status=400,
            )
        try:
            mapping_int = [int(x) for x in mapping]
        except (TypeError, ValueError):
            return Response({"detail": "mapping должен содержать целые числа."}, status=400)
        if sorted(mapping_int) != list(range(n)):
            return Response({"detail": "Каждый элемент справа должен быть выбран ровно один раз."}, status=400)
        correct_mapping = list(range(n))
        is_correct = mapping_int == correct_mapping
        score = step.points if is_correct else 0
        submission, _ = StepSubmission.objects.update_or_create(
            step=step,
            user=request.user,
            defaults={
                "payload": {"mapping": mapping_int},
                "score": score,
                "max_score": step.points,
                "status": SubmissionStatus.GRADED,
                "grading_source": GradingSource.MANUAL,
                "graded_at": timezone.now(),
            },
        )
        return Response(
            {
                "correct": is_correct,
                "score": float(score),
                "max_score": step.points,
                "submission_id": str(submission.id),
            }
        )


class SubmitQuizView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, step_id):
        step = get_object_or_404(Step, pk=step_id)
        if step.step_type != StepType.QUIZ:
            return Response({"detail": "Шаг не является тестом."}, status=400)
        selected = request.data.get("selected", [])
        if not isinstance(selected, list):
            return Response({"detail": "selected должен быть массивом индексов."}, status=400)
        selected_set = {int(x) for x in selected}
        correct_set = {int(x) for x in step.content.get("correct_indices", [])}
        is_correct = selected_set == correct_set
        score = step.points if is_correct else 0
        submission, _ = StepSubmission.objects.update_or_create(
            step=step,
            user=request.user,
            defaults={
                "payload": {"selected": sorted(selected_set)},
                "score": score,
                "max_score": step.points,
                "status": SubmissionStatus.GRADED,
                "grading_source": GradingSource.MANUAL,
                "graded_at": timezone.now(),
            },
        )
        return Response(
            {
                "correct": is_correct,
                "score": float(score),
                "max_score": step.points,
                "submission_id": str(submission.id),
            }
        )


class StepSubmissionsListView(APIView):
    permission_classes = [IsTeacher]

    def get(self, request, step_id):
        step = get_object_or_404(Step, pk=step_id)
        subs = StepSubmission.objects.filter(step=step).select_related("user").order_by("-submitted_at")
        return Response(StepSubmissionSerializer(subs, many=True).data)


class SubmitUiPracticeView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, step_id):
        step = get_object_or_404(Step, pk=step_id)
        if step.step_type != StepType.UI_PRACTICE:
            return Response({"detail": "Шаг не является UI-практикой."}, status=400)
        payload_ser = TestCasePayloadSerializer(data=request.data)
        payload_ser.is_valid(raise_exception=True)
        payload_data = dict(payload_ser.validated_data)
        submission, _ = StepSubmission.objects.update_or_create(
            step=step,
            user=request.user,
            defaults={
                "payload": payload_data,
                "status": SubmissionStatus.SUBMITTED,
                "max_score": step.points,
                "score": None,
                "feedback": "",
                "grading_source": GradingSource.MANUAL,
                "graded_at": None,
                "graded_by": None,
            },
        )
        submission.submitted_at = timezone.now()
        submission.save(update_fields=["submitted_at"])

        try:
            result = grade_test_case_submission(submission, step)
            payload_data["llm_grade"] = {
                "total_percent": result["total_percent"],
                "criteria": result["criteria"],
                "summary": result["summary"],
                "recommendations": result["recommendations"],
            }
            payload_data["llm_debug"] = {
                "prompt_log": result.get("prompt_log", ""),
                "raw_response": result.get("raw_response", ""),
            }
            submission.payload = payload_data
            submission.score = result["score"]
            submission.feedback = result["summary"]
            submission.status = SubmissionStatus.GRADED
            submission.grading_source = GradingSource.LLM
            submission.graded_at = timezone.now()
            submission.save()
        except LlmGradingError as e:
            logger.warning("LLM grading failed for ui_practice submission %s: %s", submission.id, e)
            submission.payload = {**payload_data, "llm_error": str(e)}
            submission.status = SubmissionStatus.SUBMITTED
            submission.save(update_fields=["payload", "status"])

        ser = StepSubmissionSerializer(submission, context={"strip_llm_debug": True})
        return Response(ser.data, status=200)


def _teacher_draft_queryset(user):
    return StepDraft.objects.filter(author=user, status=StepDraftStatus.DRAFT)


class GenerateUiPracticeView(APIView):
    permission_classes = [IsTeacher]

    def post(self, request):
        prompt = request.data.get("prompt", "")
        lesson_id = request.data.get("lesson_id")
        lesson = None
        if lesson_id:
            lesson = get_object_or_404(Lesson, pk=lesson_id)
            if lesson.author_id != request.user.id and request.user.role != "admin":
                return Response({"detail": "Нет доступа к уроку."}, status=403)
        try:
            result = generate_ui_practice(prompt)
        except LlmGradingError as e:
            return Response({"detail": str(e)}, status=502)
        except Exception as e:
            logger.exception("generate_ui_practice failed")
            return Response({"detail": str(e)}, status=502)

        draft = StepDraft.objects.create(
            author=request.user,
            lesson=lesson,
            prompt=str(prompt).strip(),
            step_type=StepType.UI_PRACTICE,
            title=result["title"],
            points=result["points"],
            content=result["content"],
            rationale=result.get("rationale", ""),
            llm_debug={
                "prompt_log": result.get("prompt_log", ""),
                "raw_response": result.get("raw_response", ""),
            },
        )
        return Response(StepDraftSerializer(draft).data, status=201)


class StepDraftDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsTeacher]
    serializer_class = StepDraftSerializer

    def get_queryset(self):
        return StepDraft.objects.filter(author=self.request.user).exclude(
            status=StepDraftStatus.DISCARDED
        )

    def perform_destroy(self, instance):
        instance.status = StepDraftStatus.DISCARDED
        instance.save(update_fields=["status", "updated_at"])


class StepDraftPreviewView(APIView):
    permission_classes = [IsTeacher]

    def get(self, request, token):
        draft = get_object_or_404(
            StepDraft.objects.exclude(status=StepDraftStatus.DISCARDED),
            preview_token=token,
        )
        if draft.author_id != request.user.id and request.user.role != "admin":
            return Response(status=403)
        return Response(StepDraftSerializer(draft).data)


class StepDraftRegenerateView(APIView):
    permission_classes = [IsTeacher]

    def post(self, request, pk):
        draft = get_object_or_404(_teacher_draft_queryset(request.user), pk=pk)
        prompt = request.data.get("prompt") or draft.prompt
        try:
            result = generate_ui_practice(prompt)
        except LlmGradingError as e:
            return Response({"detail": str(e)}, status=502)
        draft.prompt = str(prompt).strip()
        draft.title = result["title"]
        draft.points = result["points"]
        draft.content = result["content"]
        draft.rationale = result.get("rationale", "")
        draft.llm_debug = {
            "prompt_log": result.get("prompt_log", ""),
            "raw_response": result.get("raw_response", ""),
        }
        draft.save()
        return Response(StepDraftSerializer(draft).data)


class StepDraftConfirmView(APIView):
    permission_classes = [IsTeacher]

    def post(self, request, pk):
        draft = get_object_or_404(_teacher_draft_queryset(request.user), pk=pk)
        lesson_id = request.data.get("lesson_id") or (str(draft.lesson_id) if draft.lesson_id else None)
        if not lesson_id:
            return Response({"lesson_id": "Обязательное поле."}, status=400)
        lesson = get_object_or_404(Lesson, pk=lesson_id)
        if lesson.author_id != request.user.id and request.user.role != "admin":
            return Response({"detail": "Нет доступа к уроку."}, status=403)

        order = lesson.steps.count()
        content = normalize_ui_practice_content(draft.content)
        step = Step.objects.create(
            lesson=lesson,
            order=order,
            step_type=StepType.UI_PRACTICE,
            title=draft.title or "UI для тестирования",
            points=draft.points,
            content=content,
        )
        draft.status = StepDraftStatus.CONFIRMED
        draft.step = step
        draft.lesson = lesson
        draft.save(update_fields=["status", "step", "lesson", "updated_at"])

        return Response(StepDraftSerializer(draft).data, status=200)
