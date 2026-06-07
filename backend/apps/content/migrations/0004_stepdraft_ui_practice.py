import uuid

from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("courses", "0001_initial"),
        ("content", "0003_note"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.AlterField(
            model_name="step",
            name="step_type",
            field=models.CharField(
                choices=[
                    ("text", "Текст"),
                    ("video", "Видео"),
                    ("quiz", "Тест"),
                    ("test_case", "Тест-кейс"),
                    ("sort", "Сортировка"),
                    ("match", "Сопоставление"),
                    ("free_answer", "Свободный ответ"),
                    ("ui_practice", "UI для тестирования"),
                ],
                max_length=20,
            ),
        ),
        migrations.CreateModel(
            name="StepDraft",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("preview_token", models.UUIDField(default=uuid.uuid4, editable=False, unique=True)),
                ("prompt", models.TextField()),
                ("step_type", models.CharField(default="ui_practice", max_length=20)),
                ("title", models.CharField(blank=True, default="", max_length=255)),
                ("points", models.PositiveIntegerField(default=5)),
                ("content", models.JSONField(blank=True, default=dict)),
                ("rationale", models.TextField(blank=True, default="")),
                (
                    "status",
                    models.CharField(
                        choices=[("draft", "Черновик"), ("confirmed", "Подтверждён"), ("discarded", "Удалён")],
                        default="draft",
                        max_length=20,
                    ),
                ),
                ("llm_debug", models.JSONField(blank=True, default=dict)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "author",
                    models.ForeignKey(
                        on_delete=models.deletion.CASCADE,
                        related_name="step_drafts",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    "lesson",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=models.deletion.SET_NULL,
                        related_name="step_drafts",
                        to="courses.lesson",
                    ),
                ),
                (
                    "step",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=models.deletion.SET_NULL,
                        related_name="source_drafts",
                        to="content.step",
                    ),
                ),
            ],
            options={
                "ordering": ["-updated_at"],
            },
        ),
    ]
