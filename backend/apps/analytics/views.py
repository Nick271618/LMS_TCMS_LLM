from django.shortcuts import get_object_or_404
from rest_framework import permissions
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.content.models import StepSubmission
from apps.content.serializers import StepSubmissionSerializer
from apps.courses.permissions import IsTeacher

from . import services


class TeacherSummaryView(APIView):
    permission_classes = [IsTeacher]

    def get(self, request):
        course_id = request.query_params.get("course_id")
        course = services.get_course_or_none(course_id, request.user, as_teacher=True) if course_id else None
        if course_id and not course:
            return Response({"detail": "Курс не найден."}, status=404)
        return Response(services.teacher_summary(request.user, course))


class TeacherGradebookView(APIView):
    permission_classes = [IsTeacher]

    def get(self, request):
        course_id = request.query_params.get("course_id")
        if not course_id:
            return Response({"detail": "Укажите course_id."}, status=400)
        course = services.get_course_or_none(course_id, request.user, as_teacher=True)
        if not course:
            return Response({"detail": "Курс не найден."}, status=404)
        return Response(services.build_gradebook(course))


class TeacherSubmissionsView(APIView):
    permission_classes = [IsTeacher]

    def get(self, request):
        course_id = request.query_params.get("course_id")
        status = request.query_params.get("status")
        course = None
        if course_id:
            course = services.get_course_or_none(course_id, request.user, as_teacher=True)
            if not course:
                return Response({"detail": "Курс не найден."}, status=404)
        return Response(services.list_submissions_for_teacher(request.user, course, status))


class StudentSummaryView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        if request.user.role not in ("student", "admin"):
            return Response({"detail": "Доступно студентам."}, status=403)
        return Response(services.student_summary(request.user))


class StudentGradebookView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        if request.user.role not in ("student", "admin"):
            return Response({"detail": "Доступно студентам."}, status=403)
        course_id = request.query_params.get("course_id")
        if not course_id:
            return Response({"detail": "Укажите course_id."}, status=400)
        course = services.get_course_or_none(course_id, request.user, as_teacher=False)
        if not course:
            return Response({"detail": "Курс не найден."}, status=404)
        return Response(services.build_gradebook(course, student_user=request.user))


class StudentSubmissionsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        if request.user.role not in ("student", "admin"):
            return Response({"detail": "Доступно студентам."}, status=403)
        return Response(services.list_submissions_for_student(request.user))


class SubmissionDetailView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, submission_id):
        sub = get_object_or_404(
            StepSubmission.objects.select_related(
                "user", "step", "step__lesson"
            ),
            pk=submission_id,
        )
        course = None
        for ml in sub.step.lesson.module_placements.select_related("module__course").all():
            course = ml.module.course
            break
        if not course:
            return Response({"detail": "Шаг не привязан к курсу."}, status=404)

        is_teacher = request.user.role in ("teacher", "admin") and (
            course.author_id == request.user.id or request.user.role == "admin"
        )
        is_owner = sub.user_id == request.user.id
        if not is_teacher and not is_owner:
            raise PermissionDenied

        data = StepSubmissionSerializer(sub).data
        data["step_title"] = sub.step.title or sub.step.step_type
        data["step_type"] = sub.step.step_type
        data["step_content"] = sub.step.content
        data["lesson_title"] = sub.step.lesson.title
        data["course_id"] = str(course.id)
        data["course_title"] = course.title
        payload = sub.payload if isinstance(sub.payload, dict) else {}
        data["llm_score"] = payload.get("llm_score")
        data["llm_feedback"] = payload.get("llm_feedback", "")
        return Response(data)
