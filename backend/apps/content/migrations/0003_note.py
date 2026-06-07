import uuid

from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("courses", "0001_initial"),
        ("content", "0002_alter_step_step_type"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="Note",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("selection_text", models.TextField()),
                ("note_text", models.TextField(blank=True, default="")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("course", models.ForeignKey(on_delete=models.deletion.CASCADE, related_name="notes", to="courses.course")),
                ("step", models.ForeignKey(on_delete=models.deletion.CASCADE, related_name="notes", to="content.step")),
                ("user", models.ForeignKey(on_delete=models.deletion.CASCADE, related_name="notes", to=settings.AUTH_USER_MODEL)),
            ],
            options={
                "ordering": ["-updated_at"],
            },
        ),
    ]

