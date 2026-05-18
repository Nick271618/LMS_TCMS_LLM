from django.urls import path
from .views import (
    GradeSubmissionView,
    MySubmissionView,
    StepDetailView,
    StepSubmissionsListView,
    SubmitQuizView,
    SubmitTestCaseView,
)

urlpatterns = [
    path("steps/<uuid:pk>/", StepDetailView.as_view(), name="step-detail"),
    path("steps/<uuid:step_id>/submit-test-case/", SubmitTestCaseView.as_view(), name="submit-test-case"),
    path("steps/<uuid:step_id>/submit-quiz/", SubmitQuizView.as_view(), name="submit-quiz"),
    path("steps/<uuid:step_id>/my-submission/", MySubmissionView.as_view(), name="my-submission"),
    path("steps/<uuid:step_id>/submissions/", StepSubmissionsListView.as_view(), name="step-submissions"),
    path("submissions/<uuid:submission_id>/grade/", GradeSubmissionView.as_view(), name="grade-submission"),
]
