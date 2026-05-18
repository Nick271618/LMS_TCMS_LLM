from django.shortcuts import get_object_or_404
from rest_framework import generics, permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.content.models import Step
from apps.content.serializers import StepSerializer

from .models import Course, Enrollment, Lesson, Module, ModuleLesson
from .permissions import IsTeacher
from .serializers import (
    CourseDetailSerializer,
    CourseListSerializer,
    CourseStructureSerializer,
    LessonSerializer,
    ModuleLessonSerializer,
    ModuleSerializer,
)

class CourseViewSet(viewsets.ModelViewSet):
    queryset = Course.objects.select_related("author").all()

    def get_permissions(self):
        if self.action in ("list", "retrieve", "structure", "enroll", "enrolled"):
            return [permissions.IsAuthenticated()]
        return [IsTeacher()]

    def get_serializer_class(self):
        if self.action == "list":
            return CourseListSerializer
        if self.action == "structure":
            return CourseStructureSerializer
        return CourseDetailSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        if self.action == "list":
            if user.role == "student":
                if self.request.query_params.get("enrolled") == "1":
                    ids = Enrollment.objects.filter(user=user).values_list("course_id", flat=True)
                    return qs.filter(id__in=ids)
                return qs.filter(is_published=True)
            if user.role in ("teacher", "admin"):
                if self.request.query_params.get("catalog") == "1":
                    return qs.filter(is_published=True)
                return qs.filter(author=user)
        return qs

    def perform_create(self, serializer):
        serializer.save(author=self.request.user)

    @action(detail=True, methods=["get"])
    def structure(self, request, pk=None):
        course = self.get_object()
        return Response(CourseStructureSerializer(course).data)

    @action(detail=True, methods=["post"], permission_classes=[permissions.IsAuthenticated])
    def enroll(self, request, pk=None):
        course = get_object_or_404(Course, pk=pk, is_published=True)
        Enrollment.objects.get_or_create(user=request.user, course=course)
        return Response({"status": "enrolled"}, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=["get"], permission_classes=[permissions.IsAuthenticated])
    def enrolled(self, request):
        ids = Enrollment.objects.filter(user=request.user).values_list("course_id", flat=True)
        courses = self.queryset.filter(id__in=ids)
        return Response(CourseListSerializer(courses, many=True).data)

    @action(detail=True, methods=["post"], permission_classes=[IsTeacher])
    def publish(self, request, pk=None):
        course = self.get_object()
        if course.author != request.user and request.user.role != "admin":
            return Response(status=status.HTTP_403_FORBIDDEN)
        course.is_published = True
        course.save(update_fields=["is_published"])
        return Response({"is_published": True})

class ModuleViewSet(viewsets.ModelViewSet):
    serializer_class = ModuleSerializer
    permission_classes = [IsTeacher]

    def get_queryset(self):
        return Module.objects.filter(course_id=self.kwargs["course_pk"])

    def perform_create(self, serializer):
        serializer.save(course_id=self.kwargs["course_pk"])

class ModuleLessonViewSet(viewsets.ModelViewSet):
    serializer_class = ModuleLessonSerializer
    permission_classes = [IsTeacher]

    def get_queryset(self):
        return ModuleLesson.objects.filter(module_id=self.kwargs["module_pk"]).select_related("lesson")

    def create(self, request, *args, **kwargs):
        lesson_id = request.data.get("lesson_id")
        if not lesson_id and request.data.get("title"):
            lesson = Lesson.objects.create(
                title=request.data["title"],
                author=request.user,
            )
            lesson_id = lesson.id
        serializer = self.get_serializer(data={**request.data, "lesson_id": lesson_id})
        serializer.is_valid(raise_exception=True)
        serializer.save(module_id=self.kwargs["module_pk"], lesson_id=lesson_id)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

class LessonViewSet(viewsets.ModelViewSet):
    serializer_class = LessonSerializer

    def get_permissions(self):
        if self.action in ("retrieve", "steps"):
            return [permissions.IsAuthenticated()]
        return [IsTeacher()]

    def get_queryset(self):
        qs = Lesson.objects.filter(author=self.request.user) if self.request.user.role == "teacher" else Lesson.objects.all()
        return qs

    def perform_create(self, serializer):
        serializer.save(author=self.request.user)

    @action(detail=True, methods=["get", "post"])
    def steps(self, request, pk=None):
        lesson = self.get_object()
        if request.method == "GET":
            steps = lesson.steps.all()
            return Response(StepSerializer(steps, many=True).data)
        if request.user.role not in ("teacher", "admin"):
            return Response(status=status.HTTP_403_FORBIDDEN)
        ser = StepSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        ser.save(lesson=lesson)
        return Response(ser.data, status=status.HTTP_201_CREATED)
