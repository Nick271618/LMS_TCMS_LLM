from decimal import Decimal
from rest_framework import serializers
from apps.llm.grading import max_points_from_score_bands, _normalize_score_bands
from apps.courses.models import ModuleLesson
from .html_sanitize import sanitize_step_content
from apps.llm.generation import normalize_ui_practice_content
from .models import GradingSource, Note, Step, StepDraft, StepDraftStatus, StepSubmission, StepType, SubmissionStatus

class StepSerializer(serializers.ModelSerializer):
    class Meta:
        model = Step
        fields = ("id", "lesson", "order", "step_type", "title", "points", "content")
        read_only_fields = ("lesson",)

    def validate_content(self, value):
        return sanitize_step_content(value)

    def validate(self, attrs):
        attrs = super().validate(attrs)
        step_type = attrs.get("step_type")
        if step_type is None and self.instance:
            step_type = self.instance.step_type
        if step_type != StepType.FREE_ANSWER:
            return attrs
        content = attrs.get("content")
        if content is None and self.instance:
            content = self.instance.content
        if not isinstance(content, dict):
            return attrs
        bands = _normalize_score_bands(content.get("score_bands"))
        content = dict(content)
        content["score_bands"] = bands
        attrs["content"] = content
        attrs["points"] = max_points_from_score_bands(bands)
        return attrs

class TestCasePayloadSerializer(serializers.Serializer):
    title = serializers.CharField(max_length=256)
    preconditions = serializers.CharField(required=False, allow_blank=True, default="")
    execution_steps = serializers.CharField()
    expected_result = serializers.CharField()

def _strip_llm_debug(payload) -> dict:
    if not isinstance(payload, dict):
        return payload or {}
    return {k: v for k, v in payload.items() if k != "llm_debug"}


class StepSubmissionSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source="user.name", read_only=True)
    user_email = serializers.CharField(source="user.email", read_only=True)

    def to_representation(self, instance):
        data = super().to_representation(instance)
        if self.context.get("strip_llm_debug"):
            data["payload"] = _strip_llm_debug(data.get("payload"))
        return data

    class Meta:
        model = StepSubmission
        fields = (
            "id",
            "step",
            "user",
            "user_name",
            "user_email",
            "payload",
            "status",
            "score",
            "max_score",
            "feedback",
            "grading_source",
            "submitted_at",
            "graded_at",
        )
        read_only_fields = (
            "id",
            "user",
            "user_name",
            "user_email",
            "status",
            "score",
            "max_score",
            "feedback",
            "grading_source",
            "submitted_at",
            "graded_at",
        )

class GradeSubmissionSerializer(serializers.Serializer):
    score = serializers.DecimalField(max_digits=6, decimal_places=2, min_value=0)
    feedback = serializers.CharField(required=False, allow_blank=True)


class NoteSerializer(serializers.ModelSerializer):
    module_title = serializers.SerializerMethodField()
    lesson_id = serializers.SerializerMethodField()
    lesson_title = serializers.SerializerMethodField()
    step_id = serializers.UUIDField(source="step.id", read_only=True)
    step_title = serializers.CharField(source="step.title", read_only=True)

    class Meta:
        model = Note
        fields = (
            "id",
            "course",
            "step",
            "selection_text",
            "note_text",
            "created_at",
            "updated_at",
            "module_title",
            "lesson_id",
            "lesson_title",
            "step_id",
            "step_title",
        )
        read_only_fields = (
            "id",
            "created_at",
            "updated_at",
            "module_title",
            "lesson_id",
            "lesson_title",
            "step_id",
            "step_title",
        )

    def validate(self, attrs):
        attrs = super().validate(attrs)
        request = self.context.get("request")
        user = getattr(request, "user", None)
        if user and user.is_authenticated:
            attrs["user"] = user

        course = attrs.get("course")
        step = attrs.get("step")
        if course and step:
            ok = ModuleLesson.objects.filter(module__course=course, lesson=step.lesson).exists()
            if not ok:
                raise serializers.ValidationError(
                    {"step": "Шаг не относится к этому курсу (lesson не найден в модулях курса)."}
                )

        return attrs

    def get_lesson_id(self, obj: Note):
        return str(getattr(obj.step, "lesson_id", "") or "")

    def get_lesson_title(self, obj: Note):
        lesson = getattr(obj.step, "lesson", None)
        return getattr(lesson, "title", "") or ""

    def get_module_title(self, obj: Note):
        lesson_id = getattr(obj.step, "lesson_id", None)
        if not lesson_id:
            return ""
        ml = (
            ModuleLesson.objects.filter(module__course_id=obj.course_id, lesson_id=lesson_id)
            .select_related("module")
            .order_by("module__order", "order")
            .first()
        )
        return ml.module.title if ml else ""


class StepDraftSerializer(serializers.ModelSerializer):
    preview_url = serializers.SerializerMethodField()
    learn_url = serializers.SerializerMethodField()
    teach_lesson_url = serializers.SerializerMethodField()
    step_id = serializers.UUIDField(source="step.id", read_only=True, allow_null=True)

    class Meta:
        model = StepDraft
        fields = (
            "id",
            "preview_token",
            "preview_url",
            "learn_url",
            "teach_lesson_url",
            "lesson",
            "prompt",
            "step_type",
            "title",
            "points",
            "content",
            "rationale",
            "status",
            "step_id",
            "created_at",
            "updated_at",
        )
        read_only_fields = (
            "id",
            "preview_token",
            "preview_url",
            "learn_url",
            "teach_lesson_url",
            "status",
            "step_id",
            "created_at",
            "updated_at",
        )

    def get_preview_url(self, obj: StepDraft) -> str:
        return f"/teach/preview/draft/{obj.preview_token}"

    def get_teach_lesson_url(self, obj: StepDraft) -> str | None:
        lesson_id = obj.lesson_id or (obj.step.lesson_id if obj.step_id else None)
        return f"/teach/lessons/{lesson_id}" if lesson_id else None

    def get_learn_url(self, obj: StepDraft) -> str | None:
        if not obj.step_id:
            return None
        ml = (
            ModuleLesson.objects.filter(lesson_id=obj.step.lesson_id)
            .select_related("module")
            .order_by("module__order")
            .first()
        )
        if not ml:
            return None
        return f"/learn/{ml.module.course_id}?lesson={obj.step.lesson_id}&step={obj.step_id}"

    def validate_content(self, value):
        if not isinstance(value, dict):
            return {}
        return normalize_ui_practice_content(value)
