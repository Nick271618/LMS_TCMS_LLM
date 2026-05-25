from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import generics, permissions
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.courses.permissions import IsTeacher

from .models import GradingSource, Step, StepSubmission, StepType, SubmissionStatus
from .serializers import (
    GradeSubmissionSerializer,
    StepSerializer,
    StepSubmissionSerializer,
    TestCasePayloadSerializer,
)

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
        submission = StepSubmission.objects.create(
            step=step,
            user=request.user,
            payload=payload_ser.validated_data,
            status=SubmissionStatus.SUBMITTED,
            max_score=step.points,
            grading_source=GradingSource.MANUAL,
        )
        return Response(StepSubmissionSerializer(submission).data, status=201)

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
        return Response(StepSubmissionSerializer(sub).data)


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
