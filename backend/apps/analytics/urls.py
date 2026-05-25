from django.urls import path

from .views import (
    StudentGradebookView,
    StudentSubmissionsView,
    StudentSummaryView,
    SubmissionDetailView,
    TeacherGradebookView,
    TeacherSubmissionsView,
    TeacherSummaryView,
)

urlpatterns = [
    path("cabinet/teacher/summary/", TeacherSummaryView.as_view(), name="cabinet-teacher-summary"),
    path("cabinet/teacher/gradebook/", TeacherGradebookView.as_view(), name="cabinet-teacher-gradebook"),
    path("cabinet/teacher/submissions/", TeacherSubmissionsView.as_view(), name="cabinet-teacher-submissions"),
    path("cabinet/student/summary/", StudentSummaryView.as_view(), name="cabinet-student-summary"),
    path("cabinet/student/gradebook/", StudentGradebookView.as_view(), name="cabinet-student-gradebook"),
    path("cabinet/student/submissions/", StudentSubmissionsView.as_view(), name="cabinet-student-submissions"),
    path("submissions/<uuid:submission_id>/detail/", SubmissionDetailView.as_view(), name="submission-detail"),
]
