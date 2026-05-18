const API_URL = import.meta.env.VITE_API_URL || "/api";

export type User = { id: number; email: string; name: string; role: "student" | "teacher" | "admin" };

function getAccessToken() {
  return localStorage.getItem("access");
}

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> | undefined),
  };
  const token = getAccessToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${API_URL}${path}`, { ...options, headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const detail =
      typeof err === "object" && err !== null
        ? (err as { detail?: string }).detail ||
          Object.entries(err as Record<string, unknown>)
            .map(([k, v]) => `${k}: ${JSON.stringify(v)}`)
            .join("; ")
        : res.statusText;
    throw new Error(detail || res.statusText);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export const authApi = {
  register: (body: { email: string; password: string; name: string; role: string }) =>
    api<User>("/auth/register/", { method: "POST", body: JSON.stringify(body) }),
  login: async (login: string, password: string) => {
    const data = await api<{ access: string; refresh: string; user: User }>("/auth/login/", {
      method: "POST",
      body: JSON.stringify({ login, password }),
    });
    localStorage.setItem("access", data.access);
    localStorage.setItem("refresh", data.refresh);
    localStorage.setItem("user", JSON.stringify(data.user));
    return data;
  },
  me: () => api<User>("/auth/me/"),
  logout: () => {
    localStorage.removeItem("access");
    localStorage.removeItem("refresh");
    localStorage.removeItem("user");
  },
  storedUser: (): User | null => {
    const raw = localStorage.getItem("user");
    return raw ? JSON.parse(raw) : null;
  },
};
