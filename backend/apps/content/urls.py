from django.urls import path
from .views import (
    GenerateUiPracticeView,
    GradeSubmissionView,
    MySubmissionView,
    NoteDetailView,
    NotesListCreateView,
    StepDetailView,
    StepDraftConfirmView,
    StepDraftDetailView,
    StepDraftPreviewView,
    StepDraftRegenerateView,
    StepSubmissionsListView,
    SubmitFreeAnswerView,
    SubmitMatchView,
    SubmitQuizView,
    SubmitTestCaseView,
    SubmitUiPracticeView,
)

urlpatterns = [
    path("steps/<uuid:pk>/", StepDetailView.as_view(), name="step-detail"),
    path("steps/<uuid:step_id>/submit-test-case/", SubmitTestCaseView.as_view(), name="submit-test-case"),
    path(
        "steps/<uuid:step_id>/submit-free-answer/",
        SubmitFreeAnswerView.as_view(),
        name="submit-free-answer",
    ),
    path("steps/<uuid:step_id>/submit-quiz/", SubmitQuizView.as_view(), name="submit-quiz"),
    path("steps/<uuid:step_id>/submit-match/", SubmitMatchView.as_view(), name="submit-match"),
    path(
        "steps/<uuid:step_id>/submit-ui-practice/",
        SubmitUiPracticeView.as_view(),
        name="submit-ui-practice",
    ),
    path("steps/<uuid:step_id>/my-submission/", MySubmissionView.as_view(), name="my-submission"),
    path("steps/<uuid:step_id>/submissions/", StepSubmissionsListView.as_view(), name="step-submissions"),
    path("submissions/<uuid:submission_id>/grade/", GradeSubmissionView.as_view(), name="grade-submission"),
    path("notes/", NotesListCreateView.as_view(), name="notes-list-create"),
    path("notes/<uuid:pk>/", NoteDetailView.as_view(), name="note-detail"),
    path("llm/generate-ui-practice/", GenerateUiPracticeView.as_view(), name="generate-ui-practice"),
    path("llm/step-drafts/<uuid:pk>/", StepDraftDetailView.as_view(), name="step-draft-detail"),
    path(
        "llm/step-drafts/preview/<uuid:token>/",
        StepDraftPreviewView.as_view(),
        name="step-draft-preview",
    ),
    path(
        "llm/step-drafts/<uuid:pk>/regenerate/",
        StepDraftRegenerateView.as_view(),
        name="step-draft-regenerate",
    ),
    path(
        "llm/step-drafts/<uuid:pk>/confirm/",
        StepDraftConfirmView.as_view(),
        name="step-draft-confirm",
    ),
]
