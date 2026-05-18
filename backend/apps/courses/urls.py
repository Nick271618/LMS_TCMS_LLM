from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import CourseViewSet, LessonViewSet, ModuleLessonViewSet, ModuleViewSet

router = DefaultRouter()
router.register("courses", CourseViewSet, basename="course")
router.register("lessons", LessonViewSet, basename="lesson")

urlpatterns = [
    path("", include(router.urls)),
    path(
        "courses/<uuid:course_pk>/modules/",
        ModuleViewSet.as_view({"get": "list", "post": "create"}),
        name="course-modules",
    ),
    path(
        "courses/<uuid:course_pk>/modules/<uuid:pk>/",
        ModuleViewSet.as_view({"get": "retrieve", "patch": "partial_update", "delete": "destroy"}),
        name="course-module-detail",
    ),
    path(
        "modules/<uuid:module_pk>/lessons/",
        ModuleLessonViewSet.as_view({"get": "list", "post": "create"}),
        name="module-lessons",
    ),
]
