from rest_framework import serializers

from apps.content.html_sanitize import sanitize_html

from .models import Course, Enrollment, Lesson, Module, ModuleLesson

class CourseListSerializer(serializers.ModelSerializer):
    author_name = serializers.CharField(source="author.name", read_only=True)
    class Meta:
        model = Course
        fields = ("id", "title", "short_description", "is_published", "author_name", "updated_at")

class CourseDetailSerializer(serializers.ModelSerializer):
    class Meta:
        model = Course
        fields = ("id", "title", "short_description", "about_html", "language", "is_published", "author", "created_at", "updated_at")
        read_only_fields = ("author", "created_at", "updated_at")

    def validate_about_html(self, value):
        return sanitize_html(value or "")

class ModuleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Module
        fields = ("id", "course", "title", "description", "order")
        read_only_fields = ("id", "course")

class LessonSerializer(serializers.ModelSerializer):
    class Meta:
        model = Lesson
        fields = ("id", "title", "author", "comments_disabled", "created_at", "updated_at")
        read_only_fields = ("author", "created_at", "updated_at")

class ModuleLessonSerializer(serializers.ModelSerializer):
    lesson = LessonSerializer(read_only=True)
    lesson_id = serializers.UUIDField(write_only=True, required=False, allow_null=True)

    class Meta:
        model = ModuleLesson
        fields = ("id", "module", "lesson", "lesson_id", "order")
        read_only_fields = ("id", "module", "lesson")

class CourseStructureSerializer(serializers.ModelSerializer):
    modules = serializers.SerializerMethodField()

    class Meta:
        model = Course
        fields = ("id", "title", "short_description", "about_html", "is_published", "modules")

    def get_modules(self, obj):
        result = []
        for m in obj.modules.prefetch_related("module_lessons__lesson"):
            result.append({
                "id": str(m.id),
                "title": m.title,
                "description": m.description,
                "order": m.order,
                "lessons": [
                    {"id": str(ml.lesson.id), "title": ml.lesson.title, "order": ml.order}
                    for ml in m.module_lessons.all()
                ],
            })
        return result
