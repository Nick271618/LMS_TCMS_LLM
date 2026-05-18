import uuid
from django.conf import settings
from django.db import models

class StepType(models.TextChoices):
    TEXT = "text", "Текст"
    VIDEO = "video", "Видео"
    QUIZ = "quiz", "Тест"
    TEST_CASE = "test_case", "Тест-кейс"
    SORT = "sort", "Сортировка"
    MATCH = "match", "Сопоставление"

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
