import { api } from "./client";

export type Note = {
  id: string;
  course: string;
  step: string;
  selection_text: string;
  note_text: string;
  created_at: string;
  updated_at: string;
  module_title: string;
  lesson_id: string;
  lesson_title: string;
  step_id: string;
  step_title: string;
};

export const notesApi = {
  list: (courseId: string) => api<Note[]>(`/notes/?course=${encodeURIComponent(courseId)}`),
  create: (body: { course: string; step: string; selection_text: string; note_text?: string }) =>
    api<Note>("/notes/", { method: "POST", body: JSON.stringify(body) }),
  update: (noteId: string, body: Partial<Pick<Note, "note_text" | "selection_text">>) =>
    api<Note>(`/notes/${noteId}/`, { method: "PATCH", body: JSON.stringify(body) }),
  remove: (noteId: string) => api<void>(`/notes/${noteId}/`, { method: "DELETE" }),
};

