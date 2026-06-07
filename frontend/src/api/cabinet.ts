import { api } from "./client";

export type GradebookColumn = {
  step_id: string;
  module_id: string;
  module_title: string;
  lesson_id: string;
  lesson_title: string;
  step_title: string;
  step_type: string;
  max_score: number;
};

export type GradebookCell = {
  step_id: string;
  score: number | null;
  max_score: number;
  status: string | null;
  grading_source: string | null;
  submission_id: string | null;
};

export type GradebookRow = {
  user_id: number;
  user_name: string;
  user_email: string;
  cells: GradebookCell[];
  total_score: number;
  total_max: number;
  percent: number;
};

export type Gradebook = {
  course: { id: string; title: string };
  columns: GradebookColumn[];
  rows: GradebookRow[];
};

export type SubmissionBrief = {
  id: string;
  user_name: string;
  user_email: string;
  course_title: string;
  lesson_title: string;
  step_title: string;
  step_type: string;
  status: string;
  score: number | null;
  max_score: number;
  grading_source: string;
  llm_score?: number | null;
  submitted_at: string;
};

export type SubmissionDetail = {
  id: string;
  step: string;
  user: number;
  user_name: string;
  user_email: string;
  payload: Record<string, unknown>;
  status: string;
  score: string | null;
  max_score: string | null;
  feedback: string;
  grading_source: string;
  submitted_at: string;
  graded_at: string | null;
  step_title: string;
  step_type: string;
  step_content: Record<string, unknown>;
  lesson_title: string;
  course_id: string;
  course_title: string;
  llm_score?: number | null;
  llm_feedback?: string;
  llm_grade?: {
    total_percent: number;
    criteria: { id: string; percent: number; comment: string }[];
    summary: string;
    recommendations: string[];
  };
};

export type TeacherSummary = {
  enrollments_count: number;
  pending_count: number;
  avg_percent: number;
  quiz_attempts_count: number;
  recent_submissions: SubmissionBrief[];
};

export type StudentSummary = {
  courses_count: number;
  pending_count: number;
  total_score: number;
  total_max: number;
  percent: number;
  course_progress: {
    course_id: string;
    course_title: string;
    total_score: number;
    total_max: number;
    percent: number;
  }[];
};

export const cabinetApi = {
  teacherSummary: (courseId?: string) => {
    const q = courseId ? `?course_id=${courseId}` : "";
    return api<TeacherSummary>(`/cabinet/teacher/summary/${q}`);
  },
  teacherGradebook: (courseId: string) =>
    api<Gradebook>(`/cabinet/teacher/gradebook/?course_id=${courseId}`),
  teacherSubmissions: (params?: { course_id?: string; status?: string }) => {
    const q = new URLSearchParams();
    if (params?.course_id) q.set("course_id", params.course_id);
    if (params?.status) q.set("status", params.status);
    const qs = q.toString();
    return api<SubmissionBrief[]>(`/cabinet/teacher/submissions/${qs ? `?${qs}` : ""}`);
  },
  studentSummary: () => api<StudentSummary>("/cabinet/student/summary/"),
  studentGradebook: (courseId: string) =>
    api<Gradebook>(`/cabinet/student/gradebook/?course_id=${courseId}`),
  studentSubmissions: () => api<SubmissionBrief[]>("/cabinet/student/submissions/"),
  submissionDetail: (id: string) => api<SubmissionDetail>(`/submissions/${id}/detail/`),
};
