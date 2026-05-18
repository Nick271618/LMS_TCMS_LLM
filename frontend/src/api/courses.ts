import { api } from "./client";

export type Course = {
  id: string;
  title: string;
  short_description: string;
  about_html?: string;
  language?: string;
  is_published: boolean;
  author_name?: string;
  updated_at?: string;
};

export type CourseStructure = Course & {
  modules: {
    id: string;
    title: string;
    description: string;
    order: number;
    lessons: { id: string; title: string; order: number }[];
  }[];
};

export type Lesson = {
  id: string;
  title: string;
  author: number;
  comments_disabled: boolean;
};

export type StepType = "text" | "video" | "quiz" | "test_case" | "sort" | "match";

export type Step = {
  id: string;
  lesson: string;
  order: number;
  step_type: StepType;
  title: string;
  points: number;
  content: Record<string, unknown>;
};

export type StepSubmission = {
  id: string;
  step: string;
  user: number;
  user_name: string;
  user_email: string;
  payload: Record<string, unknown>;
  status: "draft" | "submitted" | "graded";
  score: string | null;
  max_score: string | null;
  feedback: string;
  grading_source: string;
  submitted_at: string;
  graded_at: string | null;
};

export const coursesApi = {
  listMine: () => api<Course[]>("/courses/"),
  listCatalog: () => api<Course[]>("/courses/?catalog=1"),
  listEnrolled: () => api<Course[]>("/courses/?enrolled=1"),
  get: (id: string) => api<Course>(`/courses/${id}/`),
  create: (body: { title: string; short_description?: string }) =>
    api<Course>("/courses/", { method: "POST", body: JSON.stringify(body) }),
  update: (id: string, body: Partial<Course>) =>
    api<Course>(`/courses/${id}/`, { method: "PATCH", body: JSON.stringify(body) }),
  publish: (id: string) => api<{ is_published: boolean }>(`/courses/${id}/publish/`, { method: "POST" }),
  enroll: (id: string) => api<{ status: string }>(`/courses/${id}/enroll/`, { method: "POST" }),
  structure: (id: string) => api<CourseStructure>(`/courses/${id}/structure/`),
  createModule: (courseId: string, body: { title: string; description?: string; order?: number }) =>
    api<{ id: string }>(`/courses/${courseId}/modules/`, { method: "POST", body: JSON.stringify(body) }),
  createModuleLesson: (moduleId: string, body: { title: string; order?: number }) =>
    api<unknown>(`/modules/${moduleId}/lessons/`, { method: "POST", body: JSON.stringify(body) }),
};

export const lessonsApi = {
  create: (title: string) =>
    api<Lesson>("/lessons/", { method: "POST", body: JSON.stringify({ title }) }),
  get: (id: string) => api<Lesson>(`/lessons/${id}/`),
  steps: (lessonId: string) => api<Step[]>(`/lessons/${lessonId}/steps/`),
  addStep: (lessonId: string, body: Partial<Step>) =>
    api<Step>(`/lessons/${lessonId}/steps/`, { method: "POST", body: JSON.stringify(body) }),
};

export const stepsApi = {
  get: (id: string) => api<Step>(`/steps/${id}/`),
  update: (id: string, body: Partial<Step>) =>
    api<Step>(`/steps/${id}/`, { method: "PATCH", body: JSON.stringify(body) }),
  delete: (id: string) => api<void>(`/steps/${id}/`, { method: "DELETE" }),
  submitTestCase: (stepId: string, payload: Record<string, string>) =>
    api<StepSubmission>(`/steps/${stepId}/submit-test-case/`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  submitQuiz: (stepId: string, selected: number[]) =>
    api<{ correct: boolean; score: number; max_score: number }>(`/steps/${stepId}/submit-quiz/`, {
      method: "POST",
      body: JSON.stringify({ selected }),
    }),
  mySubmission: (stepId: string) => api<StepSubmission>(`/steps/${stepId}/my-submission/`),
  listSubmissions: (stepId: string) => api<StepSubmission[]>(`/steps/${stepId}/submissions/`),
  grade: (submissionId: string, body: { score: number; feedback?: string }) =>
    api<StepSubmission>(`/submissions/${submissionId}/grade/`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
};
