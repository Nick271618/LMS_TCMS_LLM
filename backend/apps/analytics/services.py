from decimal import Decimal

from django.db.models import Prefetch

from apps.content.models import Step, StepSubmission, SubmissionStatus
from apps.courses.models import Course, Enrollment, Module, ModuleLesson


def teacher_courses(user):
    qs = Course.objects.filter(author=user)
    if getattr(user, "role", None) == "admin":
        qs = Course.objects.all()
    return qs


def student_courses(user):
    return Course.objects.filter(enrollments__user=user, is_published=True).distinct()


def get_course_or_none(course_id, user, *, as_teacher: bool):
    if not course_id:
        return None
    if as_teacher:
        return teacher_courses(user).filter(pk=course_id).first()
    return student_courses(user).filter(pk=course_id).first()


def build_columns(course: Course) -> list[dict]:
    columns = []
    modules = (
        course.modules.prefetch_related(
            Prefetch(
                "module_lessons",
                queryset=ModuleLesson.objects.select_related("lesson").order_by("order"),
            )
        )
        .order_by("order")
    )
    for module in modules:
        for ml in module.module_lessons.all():
            lesson = ml.lesson
            steps = Step.objects.filter(lesson=lesson, points__gt=0).order_by("order")
            for step in steps:
                columns.append(
                    {
                        "step_id": str(step.id),
                        "module_id": str(module.id),
                        "module_title": module.title,
                        "lesson_id": str(lesson.id),
                        "lesson_title": lesson.title,
                        "step_title": step.title or step.get_step_type_display(),
                        "step_type": step.step_type,
                        "max_score": step.points,
                    }
                )
    return columns


def submissions_map(step_ids: list, user_ids: list | None = None) -> dict[tuple[int, str], StepSubmission]:
    if not step_ids:
        return {}
    qs = StepSubmission.objects.filter(step_id__in=step_ids).select_related("user", "step")
    if user_ids is not None:
        qs = qs.filter(user_id__in=user_ids)
    result: dict[tuple[int, str], StepSubmission] = {}
    for sub in qs.order_by("submitted_at"):
        key = (sub.user_id, str(sub.step_id))
        result[key] = sub
    return result


def cell_from_submission(sub: StepSubmission | None, step_id: str, max_score: int) -> dict:
    if not sub:
        return {
            "step_id": step_id,
            "score": None,
            "max_score": max_score,
            "status": None,
            "grading_source": None,
            "submission_id": None,
        }
    return {
        "step_id": step_id,
        "score": float(sub.score) if sub.score is not None else None,
        "max_score": float(sub.max_score or max_score),
        "status": sub.status,
        "grading_source": sub.grading_source,
        "submission_id": str(sub.id),
    }


def build_gradebook(course: Course, *, student_user=None) -> dict:
    columns = build_columns(course)
    step_ids = [c["step_id"] for c in columns]

    if student_user:
        enrollments = Enrollment.objects.filter(course=course, user=student_user)
    else:
        enrollments = Enrollment.objects.filter(course=course).select_related("user")

    users = [e.user for e in enrollments]
    user_ids = [u.id for u in users]
    smap = submissions_map(step_ids, user_ids)

    rows = []
    for user in users:
        cells = []
        total_score = Decimal("0")
        total_max = Decimal("0")
        for col in columns:
            sub = smap.get((user.id, col["step_id"]))
            cells.append(cell_from_submission(sub, col["step_id"], col["max_score"]))
            if sub and sub.score is not None:
                total_score += sub.score
            total_max += Decimal(col["max_score"])

        rows.append(
            {
                "user_id": user.id,
                "user_name": user.name,
                "user_email": user.email,
                "cells": cells,
                "total_score": float(total_score),
                "total_max": float(total_max),
                "percent": round(float(total_score / total_max * 100), 1) if total_max else 0,
            }
        )

    return {
        "course": {"id": str(course.id), "title": course.title},
        "columns": columns,
        "rows": rows,
    }


def teacher_summary(user, course: Course | None) -> dict:
    courses = [course] if course else list(teacher_courses(user))
    course_ids = [c.id for c in courses]

    enrollments_count = Enrollment.objects.filter(course_id__in=course_ids).count()
    pending = StepSubmission.objects.filter(
        step__lesson__module_placements__module__course_id__in=course_ids,
        status=SubmissionStatus.SUBMITTED,
    ).count()
    graded_subs = StepSubmission.objects.filter(
        step__lesson__module_placements__module__course_id__in=course_ids,
        status=SubmissionStatus.GRADED,
        score__isnull=False,
    )
    quiz_count = StepSubmission.objects.filter(
        step__lesson__module_placements__module__course_id__in=course_ids,
        step__step_type="quiz",
    ).count()

    total_score = Decimal("0")
    total_max = Decimal("0")
    for sub in graded_subs.select_related("step"):
        if sub.score is not None:
            total_score += sub.score
            total_max += sub.max_score or sub.step.points

    avg_percent = round(float(total_score / total_max * 100), 1) if total_max else 0

    recent = (
        StepSubmission.objects.filter(
            step__lesson__module_placements__module__course_id__in=course_ids,
        )
        .select_related("user", "step", "step__lesson")
        .order_by("-submitted_at")[:5]
    )

    return {
        "enrollments_count": enrollments_count,
        "pending_count": pending,
        "avg_percent": avg_percent,
        "quiz_attempts_count": quiz_count,
        "recent_submissions": [_submission_brief(s, courses) for s in recent],
    }


def student_summary(user) -> dict:
    enrollments = Enrollment.objects.filter(user=user).select_related("course")
    course_ids = [e.course_id for e in enrollments]

    pending = StepSubmission.objects.filter(
        user=user,
        step__lesson__module_placements__module__course_id__in=course_ids,
        status=SubmissionStatus.SUBMITTED,
    ).count()

    graded = StepSubmission.objects.filter(
        user=user,
        step__lesson__module_placements__module__course_id__in=course_ids,
        status=SubmissionStatus.GRADED,
        score__isnull=False,
    ).select_related("step")

    total_score = Decimal("0")
    total_max = Decimal("0")
    for sub in graded:
        total_score += sub.score
        total_max += sub.max_score or sub.step.points

    course_progress = []
    for enr in enrollments:
        gb = build_gradebook(enr.course, student_user=user)
        row = gb["rows"][0] if gb["rows"] else None
        course_progress.append(
            {
                "course_id": str(enr.course.id),
                "course_title": enr.course.title,
                "total_score": row["total_score"] if row else 0,
                "total_max": row["total_max"] if row else 0,
                "percent": row["percent"] if row else 0,
            }
        )

    return {
        "courses_count": len(enrollments),
        "pending_count": pending,
        "total_score": float(total_score),
        "total_max": float(total_max),
        "percent": round(float(total_score / total_max * 100), 1) if total_max else 0,
        "course_progress": course_progress,
    }


def _submission_brief(sub: StepSubmission, courses: list[Course]) -> dict:
    course_title = ""
    lesson_title = ""
    for course in courses:
        cols = build_columns(course)
        if any(c["step_id"] == str(sub.step_id) for c in cols):
            course_title = course.title
            for c in cols:
                if c["step_id"] == str(sub.step_id):
                    lesson_title = c["lesson_title"]
                    break
            break
    llm = sub.payload.get("llm_score") if isinstance(sub.payload, dict) else None
    return {
        "id": str(sub.id),
        "user_name": sub.user.name,
        "user_email": sub.user.email,
        "course_title": course_title,
        "lesson_title": lesson_title,
        "step_title": sub.step.title or sub.step.step_type,
        "step_type": sub.step.step_type,
        "status": sub.status,
        "score": float(sub.score) if sub.score is not None else None,
        "max_score": float(sub.max_score or sub.step.points),
        "grading_source": sub.grading_source,
        "llm_score": llm,
        "submitted_at": sub.submitted_at.isoformat(),
    }


def list_submissions_for_teacher(user, course: Course | None, status: str | None) -> list[dict]:
    course_ids = [course.id] if course else list(teacher_courses(user).values_list("id", flat=True))
    qs = StepSubmission.objects.filter(
        step__lesson__module_placements__module__course_id__in=course_ids,
        step__points__gt=0,
    ).select_related("user", "step", "step__lesson")

    if status:
        qs = qs.filter(status=status)

    courses = list(Course.objects.filter(id__in=course_ids))
    return [_submission_brief(s, courses) for s in qs.order_by("-submitted_at")[:200]]


def list_submissions_for_student(user) -> list[dict]:
    course_ids = Enrollment.objects.filter(user=user).values_list("course_id", flat=True)
    courses = list(Course.objects.filter(id__in=course_ids))
    qs = StepSubmission.objects.filter(
        user=user,
        step__lesson__module_placements__module__course_id__in=course_ids,
    ).select_related("step", "step__lesson")
    return [_submission_brief(s, courses) for s in qs.order_by("-submitted_at")]
