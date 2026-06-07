import uuid
from django.conf import settings
from django.db import models
from apps.courses.models import Course

class StepType(models.TextChoices):
    TEXT = "text", "Текст"
    VIDEO = "video", "Видео"
    QUIZ = "quiz", "Тест"
    TEST_CASE = "test_case", "Тест-кейс"
    SORT = "sort", "Сортировка"
    MATCH = "match", "Сопоставление"
    FREE_ANSWER = "free_answer", "Свободный ответ"
    UI_PRACTICE = "ui_practice", "UI для тестирования"

class Step(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    lesson = models.ForeignKey("courses.Lesson", on_delete=models.CASCADE, related_name="steps")
    order = models.PositiveIntegerField(default=0)
    step_type = models.CharField(max_length=20, choices=StepType.choices)
    title = models.CharField(max_length=255, blank=True)
    points = models.PositiveIntegerField(default=1)
    content = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ["order"]

class SubmissionStatus(models.TextChoices):
    DRAFT = "draft", "Черновик"
    SUBMITTED = "submitted", "Ожидает проверки"
    GRADED = "graded", "Оценено"

class GradingSource(models.TextChoices):
    MANUAL = "manual", "Преподаватель"
    LLM = "llm", "ИИ"

class StepSubmission(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    step = models.ForeignKey(Step, on_delete=models.CASCADE, related_name="submissions")
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="step_submissions")
    payload = models.JSONField(default=dict)
    status = models.CharField(max_length=20, choices=SubmissionStatus.choices, default=SubmissionStatus.SUBMITTED)
    score = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)
    max_score = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)
    feedback = models.TextField(blank=True)
    grading_source = models.CharField(max_length=10, choices=GradingSource.choices, default=GradingSource.MANUAL)
    graded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name="graded_submissions"
    )
    submitted_at = models.DateTimeField(auto_now_add=True)
    graded_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-submitted_at"]


class Note(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="notes"
    )
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name="notes")
    step = models.ForeignKey(Step, on_delete=models.CASCADE, related_name="notes")
    selection_text = models.TextField()
    note_text = models.TextField(blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-updated_at"]


class StepDraftStatus(models.TextChoices):
    DRAFT = "draft", "Черновик"
    CONFIRMED = "confirmed", "Подтверждён"
    DISCARDED = "discarded", "Удалён"


class StepDraft(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    preview_token = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="step_drafts"
    )
    lesson = models.ForeignKey(
        "courses.Lesson", null=True, blank=True, on_delete=models.SET_NULL, related_name="step_drafts"
    )
    prompt = models.TextField()
    step_type = models.CharField(max_length=20, default=StepType.UI_PRACTICE)
    title = models.CharField(max_length=255, blank=True, default="")
    points = models.PositiveIntegerField(default=5)
    content = models.JSONField(default=dict, blank=True)
    rationale = models.TextField(blank=True, default="")
    status = models.CharField(
        max_length=20, choices=StepDraftStatus.choices, default=StepDraftStatus.DRAFT
    )
    step = models.ForeignKey(
        Step, null=True, blank=True, on_delete=models.SET_NULL, related_name="source_drafts"
    )
    llm_debug = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-updated_at"]
