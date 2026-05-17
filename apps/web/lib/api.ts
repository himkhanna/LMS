"use client";

import { getSession } from "./auth";

export const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8081";

export const AI_GATEWAY_BASE =
  process.env.NEXT_PUBLIC_AI_GATEWAY_URL ?? "http://localhost:8082";

export const AUTH_BASE =
  process.env.NEXT_PUBLIC_AUTH_BASE_URL ?? "http://localhost:8083";

export class ApiError extends Error {
  status: number;
  detail?: string;
  constructor(status: number, message: string, detail?: string) {
    super(detail ?? message);
    this.status = status;
    this.detail = detail;
  }
}

type RequestOpts = Omit<RequestInit, "body"> & { body?: unknown; baseUrl?: string };

export async function api<T = unknown>(path: string, opts: RequestOpts = {}): Promise<T> {
  const headers = new Headers(opts.headers);
  const isForm = opts.body instanceof FormData;
  if (!isForm && opts.body !== undefined) {
    headers.set("Content-Type", "application/json");
  }
  headers.set("Accept", "application/json");
  const session = getSession();
  if (session) headers.set("Authorization", `Bearer ${session.token}`);

  const base = opts.baseUrl ?? API_BASE;
  const res = await fetch(`${base}${path}`, {
    ...opts,
    headers,
    body: isForm
      ? (opts.body as FormData)
      : opts.body !== undefined
      ? JSON.stringify(opts.body)
      : undefined,
  });

  if (res.status === 204) return undefined as T;
  const text = await res.text();
  const parsed = text ? safeJson(text) : undefined;
  if (!res.ok) {
    const detail =
      (parsed && typeof parsed === "object" && "detail" in parsed
        ? String((parsed as { detail: unknown }).detail)
        : undefined) ?? text;
    throw new ApiError(res.status, `${res.status} ${res.statusText}`, detail);
  }
  return parsed as T;
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

// ---- Auth service (port 8083) ----

export type AuthUser = {
  id: string;
  email: string;
  displayName: string | null;
  role: "USER" | "ADMIN" | "INSTRUCTOR";
  status: "ACTIVE" | "DISABLED";
  createdAt: string;
};

export type LoginResponse = {
  accessToken: string;
  tokenType: string;
  expiresInSeconds: number;
  userId: string;
};

export const Auth = {
  microsoftCallback: (code: string, redirectUri: string) =>
    api<LoginResponse>(`/api/v1/auth/microsoft/callback`, {
      method: "POST",
      body: { code, redirectUri },
      baseUrl: AUTH_BASE,
    }),
  login: (email: string, password: string) =>
    api<LoginResponse>(`/api/v1/auth/login`, {
      method: "POST",
      body: { email, password },
      baseUrl: AUTH_BASE,
    }),
  me: () => api<AuthUser>(`/api/v1/auth/me`, { baseUrl: AUTH_BASE }),
};

export type UserRole = "USER" | "ADMIN" | "INSTRUCTOR";
export type UserStatus = "ACTIVE" | "DISABLED";

export const AdminUsers = {
  list: (params: {
    role?: UserRole;
    status?: UserStatus;
    q?: string;
    page?: number;
    size?: number;
  } = {}) => {
    const qs = new URLSearchParams();
    if (params.role) qs.set("role", params.role);
    if (params.status) qs.set("status", params.status);
    if (params.q) qs.set("q", params.q);
    qs.set("page", String(params.page ?? 0));
    qs.set("size", String(params.size ?? 50));
    return api<Page<AuthUser>>(`/api/v1/admin/users?${qs}`, { baseUrl: AUTH_BASE });
  },
  get: (id: string) =>
    api<AuthUser>(`/api/v1/admin/users/${id}`, { baseUrl: AUTH_BASE }),
  create: (input: { email: string; password: string; displayName: string; role?: UserRole }) =>
    api<AuthUser>(`/api/v1/admin/users`, {
      method: "POST",
      body: input,
      baseUrl: AUTH_BASE,
    }),
  update: (id: string, patch: { displayName?: string; role?: UserRole; status?: UserStatus }) =>
    api<AuthUser>(`/api/v1/admin/users/${id}`, {
      method: "PATCH",
      body: patch,
      baseUrl: AUTH_BASE,
    }),
  resetPassword: (id: string, newPassword: string) =>
    api<void>(`/api/v1/admin/users/${id}/password`, {
      method: "POST",
      body: { newPassword },
      baseUrl: AUTH_BASE,
    }),
  delete: (id: string) =>
    api<void>(`/api/v1/admin/users/${id}`, {
      method: "DELETE",
      baseUrl: AUTH_BASE,
    }),
};

export const MICROSOFT_TENANT = process.env.NEXT_PUBLIC_MS_TENANT_ID ?? "common";
export const MICROSOFT_CLIENT_ID = process.env.NEXT_PUBLIC_MS_CLIENT_ID ?? "";
export const MICROSOFT_REDIRECT_URI =
  process.env.NEXT_PUBLIC_MS_REDIRECT_URI ?? "http://localhost:3000/auth/callback";

export function buildMicrosoftAuthorizeUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: MICROSOFT_CLIENT_ID,
    response_type: "code",
    redirect_uri: MICROSOFT_REDIRECT_URI,
    response_mode: "query",
    scope: "openid profile email",
    state,
  });
  return `https://login.microsoftonline.com/${MICROSOFT_TENANT}/oauth2/v2.0/authorize?${params}`;
}

export type CourseStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";

export type ModuleDto = {
  id: string;
  title: string;
  position: number;
  lessons: LessonDto[];
};

export type LessonDto = {
  id: string;
  moduleId?: string;
  courseId?: string;
  title: string;
  content: string | null;
  position: number;
  durationSecs: number | null;
};

export type Course = {
  id: string;
  title: string;
  description: string | null;
  status: CourseStatus;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
  modules: ModuleDto[];
};

export type Page<T> = {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
};

export type AssetDto = {
  id: string;
  lessonId: string;
  storageKey: string;
  contentType: string | null;
  sizeBytes: number | null;
  originalName: string | null;
  url: string;
  createdAt: string;
};

export const Courses = {
  list: (params: { status?: CourseStatus; page?: number; size?: number } = {}) => {
    const q = new URLSearchParams();
    if (params.status) q.set("status", params.status);
    if (params.page !== undefined) q.set("page", String(params.page));
    if (params.size !== undefined) q.set("size", String(params.size));
    const qs = q.toString();
    return api<Page<Course>>(`/api/v1/courses${qs ? `?${qs}` : ""}`);
  },
  get: (id: string) => api<Course>(`/api/v1/courses/${id}`),
  create: (input: { title: string; description?: string }) =>
    api<Course>(`/api/v1/courses`, { method: "POST", body: input }),
  publish: (id: string) =>
    api<Course>(`/api/v1/courses/${id}/publish`, { method: "POST" }),
  unpublish: (id: string) =>
    api<Course>(`/api/v1/courses/${id}/unpublish`, { method: "POST" }),
  archive: (id: string) =>
    api<Course>(`/api/v1/courses/${id}/archive`, { method: "POST" }),
  delete: (id: string) =>
    api<void>(`/api/v1/courses/${id}`, { method: "DELETE" }),
  search: (q: string, page = 0, size = 20) => {
    const params = new URLSearchParams({ q, page: String(page), size: String(size) });
    return api<Page<Course>>(`/api/v1/courses/search?${params}`);
  },
};

export const Modules = {
  add: (courseId: string, title: string) =>
    api<ModuleDto>(`/api/v1/courses/${courseId}/modules`, {
      method: "POST",
      body: { title },
    }),
  update: (moduleId: string, patch: { title?: string }) =>
    api<ModuleDto>(`/api/v1/modules/${moduleId}`, {
      method: "PATCH",
      body: patch,
    }),
  delete: (moduleId: string) =>
    api<void>(`/api/v1/modules/${moduleId}`, { method: "DELETE" }),
  reorder: (courseId: string, ids: string[]) =>
    api<void>(`/api/v1/courses/${courseId}/modules/order`, {
      method: "PATCH",
      body: { ids },
    }),
};

export const Lessons = {
  get: (id: string) => api<LessonDto>(`/api/v1/lessons/${id}`),
  add: (moduleId: string, input: { title: string; content?: string; durationSecs?: number }) =>
    api<LessonDto>(`/api/v1/courses/modules/${moduleId}/lessons`, {
      method: "POST",
      body: input,
    }),
  update: (id: string, patch: { title?: string; content?: string; durationSecs?: number }) =>
    api<LessonDto>(`/api/v1/lessons/${id}`, {
      method: "PATCH",
      body: patch,
    }),
  delete: (id: string) =>
    api<void>(`/api/v1/lessons/${id}`, { method: "DELETE" }),
  reorder: (moduleId: string, ids: string[]) =>
    api<void>(`/api/v1/modules/${moduleId}/lessons/order`, {
      method: "PATCH",
      body: { ids },
    }),
};

export type CourseTemplateSummary = {
  id: string;
  name: string;
  description: string;
  moduleCount: number;
  lessonCount: number;
};

export const Templates = {
  list: () => api<CourseTemplateSummary[]>(`/api/v1/course-templates`),
  createCourse: (input: { templateId: string; title?: string }) =>
    api<Course>(`/api/v1/courses/from-template`, {
      method: "POST",
      body: input,
    }),
};

export const Assets = {
  list: (lessonId: string) => api<AssetDto[]>(`/api/v1/lessons/${lessonId}/assets`),
  upload: (lessonId: string, file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    return api<AssetDto>(`/api/v1/lessons/${lessonId}/assets`, {
      method: "POST",
      body: fd,
    });
  },
  delete: (id: string) => api<void>(`/api/v1/assets/${id}`, { method: "DELETE" }),
  resolveUrl: (url: string) => (url.startsWith("http") ? url : `${API_BASE}${url}`),
};

// ---- AI Gateway (port 8082) ----

export type ProviderType = "OPENAI" | "AZURE_OPENAI" | "ANTHROPIC" | "OLLAMA";

export type Provider = {
  id: string;
  providerType: ProviderType;
  name: string;
  enabled: boolean;
  isDefault: boolean;
  apiKeySet: boolean;
  apiKeyPreview: string | null;
  baseUrl: string | null;
  defaultModel: string | null;
  priority: number;
  config: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
};

export type ProviderInput = {
  providerType: ProviderType;
  name: string;
  apiKey?: string;
  baseUrl?: string;
  defaultModel?: string;
  enabled?: boolean;
  isDefault?: boolean;
  priority?: number;
  config?: Record<string, unknown>;
};

export type ProviderPatch = Partial<Omit<ProviderInput, "providerType">>;

export type TestProviderResult = {
  ok: boolean;
  sample: string | null;
  error: string | null;
  latencyMs: number;
};

export type UsageLog = {
  id: string;
  providerId: string | null;
  providerType: ProviderType | null;
  model: string | null;
  useCase: string | null;
  userId: string | null;
  promptTokens: number | null;
  completionTokens: number | null;
  totalTokens: number | null;
  latencyMs: number | null;
  status: "SUCCESS" | "ERROR";
  errorMessage: string | null;
  createdAt: string;
};

export const Providers = {
  list: () => api<Provider[]>(`/api/v1/admin/providers`, { baseUrl: AI_GATEWAY_BASE }),
  get: (id: string) =>
    api<Provider>(`/api/v1/admin/providers/${id}`, { baseUrl: AI_GATEWAY_BASE }),
  create: (input: ProviderInput) =>
    api<Provider>(`/api/v1/admin/providers`, {
      method: "POST",
      body: input,
      baseUrl: AI_GATEWAY_BASE,
    }),
  update: (id: string, patch: ProviderPatch) =>
    api<Provider>(`/api/v1/admin/providers/${id}`, {
      method: "PATCH",
      body: patch,
      baseUrl: AI_GATEWAY_BASE,
    }),
  delete: (id: string) =>
    api<void>(`/api/v1/admin/providers/${id}`, {
      method: "DELETE",
      baseUrl: AI_GATEWAY_BASE,
    }),
  test: (id: string) =>
    api<TestProviderResult>(`/api/v1/admin/providers/${id}/test`, {
      method: "POST",
      baseUrl: AI_GATEWAY_BASE,
    }),
};

export const Usage = {
  list: (page = 0, size = 50) =>
    api<Page<UsageLog>>(
      `/api/v1/admin/usage?page=${page}&size=${size}`,
      { baseUrl: AI_GATEWAY_BASE }
    ),
};

export type GenerateCourseInput = {
  topic: string;
  audience?: string;
  moduleCount?: number;
  lessonsPerModule?: number;
  providerId?: string;
  model?: string;
  maxTokens?: number;
};

export type GenerateCourseFromFileInput = {
  file: File;
  mode?: "ai" | "mechanical";
  topic?: string;
  audience?: string;
  moduleCount?: number;
  lessonsPerModule?: number;
  providerId?: string;
  model?: string;
  maxTokens?: number;
};

export const AiCourses = {
  generate: (input: GenerateCourseInput) =>
    api<Course>(`/api/v1/courses/generate`, { method: "POST", body: input }),
  generateFromFile: (input: GenerateCourseFromFileInput) => {
    const fd = new FormData();
    fd.append("file", input.file);
    if (input.mode) fd.append("mode", input.mode);
    if (input.topic) fd.append("topic", input.topic);
    if (input.audience) fd.append("audience", input.audience);
    if (input.moduleCount != null) fd.append("moduleCount", String(input.moduleCount));
    if (input.lessonsPerModule != null) fd.append("lessonsPerModule", String(input.lessonsPerModule));
    if (input.providerId) fd.append("providerId", input.providerId);
    if (input.model) fd.append("model", input.model);
    if (input.maxTokens != null) fd.append("maxTokens", String(input.maxTokens));
    return api<Course>(`/api/v1/courses/generate-from-file`, {
      method: "POST",
      body: fd,
    });
  },
};
