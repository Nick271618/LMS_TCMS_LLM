import os
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from apps.llm.grading import _extract_json

samples = [
    "{'title': 'Login', 'points': 5, 'content': {'task_html': '<p>t</p>', 'fields': [{'id': 'e', 'label': 'E', 'type': 'email', 'required': True}], 'ui_hints': ['a']}, 'rationale': 'ok'}",
    '{"title": "Login", "points": 5, "content": {"task_html": "<p>t</p>", "fields": [{"id": "e", "label": "E", "type": "email", "required": true}], "ui_hints": ["a"]}, "rationale": "ok"}',
]
for i, s in enumerate(samples):
    r = _extract_json(s)
    print(i, r["title"], len(r["content"]["fields"]))
