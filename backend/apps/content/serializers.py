from decimal import Decimal
from rest_framework import serializers
from .html_sanitize import sanitize_step_content
from .models import GradingSource, Step, StepSubmission, StepType, SubmissionStatus

class StepSerializer(serializers.ModelSerializer):
    class Meta:
        model = Step
        fields = ("id", "lesson", "order", "step_type", "title", "points", "content")
        read_only_fields = ("lesson",)

    def validate_content(self, value):
        return sanitize_step_content(value)

class TestCasePayloadSerializer(serializers.Serializer):
    test_case_id = serializers.CharField(max_length=32)
    title = serializers.CharField(max_length=256)
    description = serializers.CharField()
    preconditions = serializers.CharField(required=False, allow_blank=True)
    execution_steps = serializers.CharField()
    expected_result = serializers.CharField()
    priority = serializers.ChoiceField(choices=["low", "medium", "high", "critical"])
    testing_type = serializers.ChoiceField(
        choices=["functional", "integration", "regression", "smoke", "acceptance", "negative"]
    )

class StepSubmissionSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source="user.name", read_only=True)
    user_email = serializers.CharField(source="user.email", read_only=True)

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
