import { api } from "./client";

export type UiField = {
  id: string;
  label: string;
  type: "text" | "email" | "password" | "number" | "checkbox" | "select" | "textarea";
  required?: boolean;
  placeholder?: string;
  options?: string[];
};

export type UiPracticeContent = {
  task_html?: string;
  form_html?: string;
  fields?: UiField[];
  ui_hints?: string[];
  rubric?: Record<string, unknown>;
  reference_test_case?: Record<string, string>;
};

export type StepDraft = {
  id: string;
  preview_token: string;
  preview_url: string;
  learn_url: string | null;
  teach_lesson_url: string | null;
  lesson: string | null;
  prompt: string;
  step_type: string;
  title: string;
  points: number;
  content: UiPracticeContent;
  rationale: string;
  status: string;
  step_id: string | null;
  created_at: string;
  updated_at: string;
};

export const llmApi = {
  generateUiPractice: (body: { prompt: string; lesson_id?: string }) =>
    api<StepDraft>("/llm/generate-ui-practice/", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  getDraft: (id: string) => api<StepDraft>(`/llm/step-drafts/${id}/`),
  getDraftByToken: (token: string) => api<StepDraft>(`/llm/step-drafts/preview/${token}/`),
  updateDraft: (id: string, body: Partial<Pick<StepDraft, "title" | "points" | "content">>) =>
    api<StepDraft>(`/llm/step-drafts/${id}/`, { method: "PATCH", body: JSON.stringify(body) }),
  regenerateDraft: (id: string, prompt?: string) =>
    api<StepDraft>(`/llm/step-drafts/${id}/regenerate/`, {
      method: "POST",
      body: JSON.stringify(prompt ? { prompt } : {}),
    }),
  confirmDraft: (id: string, lessonId: string) =>
    api<StepDraft>(`/llm/step-drafts/${id}/confirm/`, {
      method: "POST",
      body: JSON.stringify({ lesson_id: lessonId }),
    }),
  discardDraft: (id: string) => api<void>(`/llm/step-drafts/${id}/`, { method: "DELETE" }),
};
