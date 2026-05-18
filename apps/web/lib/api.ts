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
  role: UserRole;
  managerEmail?: string | null;
  department?: string | null;
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
  microsoftCallback: (code: string, redirectUri: string, codeVerifier?: string) =>
    api<LoginResponse>(`/api/v1/auth/microsoft/callback`, {
      method: "POST",
      body: { code, redirectUri, codeVerifier },
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

export type UserRole = "USER" | "ADMIN" | "INSTRUCTOR" | "HR";
export type UserStatus = "ACTIVE" | "DISABLED";

export type MicrosoftConfigView = {
  tenantId: string | null;
  clientId: string | null;
  clientSecretConfigured: boolean;
  roleSyncEnabled: boolean;
  appRolePrefix: string;
  adminGroupConfigured: boolean;
  hrGroupConfigured: boolean;
  instructorGroupConfigured: boolean;
};

export const AuthConfig = {
  microsoft: () =>
    api<MicrosoftConfigView>(`/api/v1/admin/auth/microsoft`, { baseUrl: AUTH_BASE }),
};

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
  create: (input: {
    email: string;
    password: string;
    displayName: string;
    role?: UserRole;
    managerEmail?: string;
    department?: string;
  }) =>
    api<AuthUser>(`/api/v1/admin/users`, {
      method: "POST",
      body: input,
      baseUrl: AUTH_BASE,
    }),
  update: (
    id: string,
    patch: {
      displayName?: string;
      role?: UserRole;
      status?: UserStatus;
      managerEmail?: string | null;
      department?: string | null;
    },
  ) =>
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

function base64UrlEncode(bytes: ArrayBuffer | Uint8Array): string {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let str = "";
  for (let i = 0; i < arr.byteLength; i++) str += String.fromCharCode(arr[i]);
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/**
 * Build the Microsoft Entra ID authorize URL with PKCE (S256). The
 * verifier must be stored client-side and passed back to the auth-service
 * on the callback so Entra can verify it during token exchange.
 */
export async function buildMicrosoftAuthorizeUrl(
  state: string,
): Promise<{ url: string; codeVerifier: string }> {
  const random = new Uint8Array(32);
  crypto.getRandomValues(random);
  const codeVerifier = base64UrlEncode(random);
  const challengeBytes = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(codeVerifier),
  );
  const codeChallenge = base64UrlEncode(challengeBytes);

  const params = new URLSearchParams({
    client_id: MICROSOFT_CLIENT_ID,
    response_type: "code",
    redirect_uri: MICROSOFT_REDIRECT_URI,
    response_mode: "query",
    scope: "openid profile email",
    state,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
  });
  const url = `https://login.microsoftonline.com/${MICROSOFT_TENANT}/oauth2/v2.0/authorize?${params}`;
  return { url, codeVerifier };
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
  videoUrl?: string | null;
  videoProvider?: "YOUTUBE" | "VIMEO" | "FILE" | "URL" | null;
};

export type Course = {
  id: string;
  title: string;
  description: string | null;
  summary: string | null;
  coverColor: string | null;
  tags: string[];
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

export type CourseUpdatePatch = {
  title?: string;
  description?: string;
  summary?: string | null;
  coverColor?: string | null;
  tags?: string[];
  status?: CourseStatus;
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
  update: (id: string, patch: CourseUpdatePatch) =>
    api<Course>(`/api/v1/courses/${id}`, { method: "PATCH", body: patch }),
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

export type CatalogResult = { courses: Course[]; tags: string[] };

export const Catalog = {
  browse: (params: { q?: string; tag?: string } = {}) => {
    const qs = new URLSearchParams();
    if (params.q) qs.set("q", params.q);
    if (params.tag) qs.set("tag", params.tag);
    const s = qs.toString();
    return api<CatalogResult>(`/api/v1/catalog/courses${s ? `?${s}` : ""}`);
  },
  enrollMe: (courseId: string) =>
    api<Enrollment>(`/api/v1/courses/${courseId}/enroll-me`, { method: "POST" }),
};

// ---- Learning paths ----

export type LearningPathStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";

export type PathCourseDto = {
  linkId: string;
  courseId: string;
  courseTitle: string;
  courseStatus: string;
  courseSummary: string | null;
  position: number;
  required: boolean;
};

export type LearningPath = {
  id: string;
  title: string;
  description: string | null;
  summary: string | null;
  coverColor: string | null;
  tags: string[];
  status: LearningPathStatus;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
  courseCount: number;
  courses: PathCourseDto[];
};

export type PathAssignment = {
  id: string;
  pathId: string;
  pathTitle: string;
  pathCoverColor: string | null;
  userId: string;
  userEmail: string;
  userName: string | null;
  status: EnrollmentStatus;
  mandatory: boolean;
  assignedAt: string;
  dueAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  progressPct: number;
  overdue: boolean;
};

export const LearningPaths = {
  list: () => api<LearningPath[]>(`/api/v1/learning-paths`),
  get: (id: string) => api<LearningPath>(`/api/v1/learning-paths/${id}`),
  create: (input: {
    title: string;
    description?: string;
    summary?: string;
    coverColor?: string;
    tags?: string[];
  }) =>
    api<LearningPath>(`/api/v1/learning-paths`, { method: "POST", body: input }),
  update: (
    id: string,
    patch: {
      title?: string;
      description?: string;
      summary?: string | null;
      coverColor?: string | null;
      tags?: string[];
      status?: LearningPathStatus;
    },
  ) => api<LearningPath>(`/api/v1/learning-paths/${id}`, { method: "PATCH", body: patch }),
  delete: (id: string) =>
    api<void>(`/api/v1/learning-paths/${id}`, { method: "DELETE" }),
  addCourse: (pathId: string, courseId: string, required = true) =>
    api<PathCourseDto>(`/api/v1/learning-paths/${pathId}/courses`, {
      method: "POST",
      body: { courseId, required },
    }),
  removeCourse: (linkId: string) =>
    api<void>(`/api/v1/learning-path-courses/${linkId}`, { method: "DELETE" }),
  reorderCourses: (pathId: string, linkIds: string[]) =>
    api<void>(`/api/v1/learning-paths/${pathId}/courses/order`, {
      method: "PATCH",
      body: { ids: linkIds },
    }),
  assign: (
    pathId: string,
    input: {
      learners: AssignLearner[];
      dueAt?: string | null;
      mandatory?: boolean;
    },
  ) =>
    api<{ created: number; skipped: number; assignments: PathAssignment[] }>(
      `/api/v1/learning-paths/${pathId}/assignments`,
      { method: "POST", body: input },
    ),
  roster: (pathId: string) =>
    api<PathAssignment[]>(`/api/v1/learning-paths/${pathId}/assignments`),
  unassign: (assignmentId: string) =>
    api<void>(`/api/v1/learning-path-assignments/${assignmentId}`, {
      method: "DELETE",
    }),
  mine: () => api<PathAssignment[]>(`/api/v1/me/learning-paths`),
};

// ---- Discussion ----

export type DiscussionPost = {
  id: string;
  courseId: string;
  parentId: string | null;
  authorUserId: string;
  authorEmail: string;
  authorName: string | null;
  body: string;
  pinned: boolean;
  createdAt: string;
  updatedAt: string;
  replies: DiscussionPost[];
};

export const Discussion = {
  list: (courseId: string) =>
    api<DiscussionPost[]>(`/api/v1/courses/${courseId}/discussion`),
  create: (courseId: string, body: string) =>
    api<DiscussionPost>(`/api/v1/courses/${courseId}/discussion`, {
      method: "POST",
      body: { body },
    }),
  reply: (parentId: string, body: string) =>
    api<DiscussionPost>(`/api/v1/discussion/${parentId}/replies`, {
      method: "POST",
      body: { body },
    }),
  pin: (id: string, pinned: boolean) =>
    api<DiscussionPost>(
      `/api/v1/discussion/${id}/pin?pinned=${pinned}`,
      { method: "POST" },
    ),
  delete: (id: string) =>
    api<void>(`/api/v1/discussion/${id}`, { method: "DELETE" }),
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
  update: (
    id: string,
    patch: { title?: string; content?: string; durationSecs?: number; videoUrl?: string | null },
  ) =>
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

// ---- Directory (auth-service, HR/admin only) ----

export type DirectoryUser = {
  id: string;
  email: string;
  displayName: string | null;
  role: UserRole;
  status: UserStatus;
  department: string | null;
  managerEmail: string | null;
};

export const Directory = {
  search: (params: { q?: string; department?: string; page?: number; size?: number } = {}) => {
    const qs = new URLSearchParams();
    if (params.q) qs.set("q", params.q);
    if (params.department) qs.set("department", params.department);
    qs.set("page", String(params.page ?? 0));
    qs.set("size", String(params.size ?? 50));
    return api<Page<DirectoryUser>>(`/api/v1/directory/users?${qs}`, {
      baseUrl: AUTH_BASE,
    });
  },
  byIds: (ids: string[]) => {
    const qs = new URLSearchParams();
    ids.forEach((id) => qs.append("ids", id));
    return api<DirectoryUser[]>(`/api/v1/directory/users/by-ids?${qs}`, {
      baseUrl: AUTH_BASE,
    });
  },
};

// ---- Enrollments (course-service) ----

export type EnrollmentStatus =
  | "ASSIGNED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "WAIVED";

export type Enrollment = {
  id: string;
  courseId: string;
  courseTitle: string;
  userId: string;
  userEmail: string;
  userName: string | null;
  managerEmail: string | null;
  department: string | null;
  status: EnrollmentStatus;
  mandatory: boolean;
  assignedByEmail: string | null;
  assignedAt: string;
  dueAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  progressPct: number;
  overdue: boolean;
};

export type AssignLearner = {
  userId: string;
  email: string;
  displayName?: string | null;
  managerEmail?: string | null;
  department?: string | null;
};

export type AssignResponse = {
  created: number;
  skipped: number;
  enrollments: Enrollment[];
};

export const Enrollments = {
  assign: (
    courseId: string,
    input: { learners: AssignLearner[]; dueAt?: string | null; mandatory?: boolean },
  ) =>
    api<AssignResponse>(`/api/v1/courses/${courseId}/enrollments`, {
      method: "POST",
      body: input,
    }),
  listForCourse: (courseId: string, status?: EnrollmentStatus) => {
    const qs = status ? `?status=${status}` : "";
    return api<Enrollment[]>(`/api/v1/courses/${courseId}/enrollments${qs}`);
  },
  unassign: (id: string) =>
    api<void>(`/api/v1/enrollments/${id}`, { method: "DELETE" }),
  waive: (id: string) =>
    api<Enrollment>(`/api/v1/enrollments/${id}/waive`, { method: "POST" }),
  mine: (status?: EnrollmentStatus) => {
    const qs = status ? `?status=${status}` : "";
    return api<Enrollment[]>(`/api/v1/me/enrollments${qs}`);
  },
};

export type LessonProgressStatus = "STARTED" | "COMPLETED";

export type LessonProgress = {
  id: string;
  userId: string;
  lessonId: string;
  courseId: string;
  status: LessonProgressStatus;
  startedAt: string;
  completedAt: string | null;
  watchPct: number;
};

export const Progress = {
  markStarted: (lessonId: string) =>
    api<LessonProgress>(`/api/v1/me/lessons/${lessonId}/start`, { method: "POST" }),
  markCompleted: (lessonId: string) =>
    api<LessonProgress>(`/api/v1/me/lessons/${lessonId}/complete`, { method: "POST" }),
  markWatched: (lessonId: string, watchPct: number) =>
    api<LessonProgress>(`/api/v1/me/lessons/${lessonId}/watch`, {
      method: "POST",
      body: { watchPct },
    }),
  forCourse: (courseId: string) =>
    api<LessonProgress[]>(`/api/v1/me/courses/${courseId}/progress`),
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

// ---- PPT designer (extract then commit, no AI) ----

export type ProposedLesson = {
  title: string;
  content: string | null;
  durationSecs: number | null;
};

export type ProposedModule = {
  title: string;
  lessons: ProposedLesson[];
};

export type ProposedCourse = {
  title: string;
  description: string | null;
  modules: ProposedModule[];
};

export const PptDesigner = {
  extract: (input: { file: File; topic?: string; lessonsPerModule?: number }) => {
    const fd = new FormData();
    fd.append("file", input.file);
    if (input.topic) fd.append("topic", input.topic);
    if (input.lessonsPerModule != null) fd.append("lessonsPerModule", String(input.lessonsPerModule));
    return api<ProposedCourse>(`/api/v1/courses/extract-from-file`, {
      method: "POST",
      body: fd,
    });
  },
  createFromStructure: (proposed: ProposedCourse) =>
    api<Course>(`/api/v1/courses/from-structure`, {
      method: "POST",
      body: proposed,
    }),
};

// ---- Quizzes (course-service) ----

export type QuestionType =
  | "MCQ_SINGLE"
  | "MCQ_MULTI"
  | "TRUE_FALSE"
  | "SHORT_ANSWER";

export type QuizStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";

export type Question = {
  id: string;
  type: QuestionType;
  prompt: string;
  options: string[] | null;
  correct: unknown[] | null;
  points: number;
  explanation: string | null;
  position: number;
};

export type Quiz = {
  id: string;
  courseId: string;
  moduleId: string | null;
  lessonId: string | null;
  title: string;
  description: string | null;
  passScore: number;
  timeLimitMins: number | null;
  maxAttempts: number | null;
  shuffleQuestions: boolean;
  status: QuizStatus;
  position: number;
  createdAt: string;
  updatedAt: string;
  totalQuestions: number;
  totalPoints: number;
  questions: Question[];
};

export type AttemptAnswer = {
  questionId: string;
  response: unknown[];
  pointsAwarded: number;
  correct: boolean;
};

export type Attempt = {
  id: string;
  quizId: string;
  userId: string;
  userEmail: string | null;
  userName: string | null;
  startedAt: string;
  submittedAt: string | null;
  score: number | null;
  maxScore: number | null;
  scorePct: number | null;
  passed: boolean | null;
  answers: AttemptAnswer[];
};

export type QuizCreate = {
  title: string;
  description?: string;
  moduleId?: string;
  lessonId?: string;
  passScore?: number;
  timeLimitMins?: number;
  maxAttempts?: number;
  shuffleQuestions?: boolean;
};

export type QuestionCreate = {
  type: QuestionType;
  prompt: string;
  options?: string[];
  correct: unknown[];
  points?: number;
  explanation?: string;
};

export type QuizGenerateInput = {
  lessonId?: string;
  moduleId?: string;
  questionCount?: number;
  types?: QuestionType[];
  difficulty?: "easy" | "medium" | "hard";
  providerId?: string;
  model?: string;
  maxTokens?: number;
};

export const Quizzes = {
  listForCourse: (courseId: string) =>
    api<Quiz[]>(`/api/v1/courses/${courseId}/quizzes`),
  get: (id: string) => api<Quiz>(`/api/v1/quizzes/${id}`),
  create: (courseId: string, input: QuizCreate) =>
    api<Quiz>(`/api/v1/courses/${courseId}/quizzes`, {
      method: "POST",
      body: input,
    }),
  update: (
    id: string,
    patch: Partial<QuizCreate> & { status?: QuizStatus },
  ) =>
    api<Quiz>(`/api/v1/quizzes/${id}`, {
      method: "PATCH",
      body: patch,
    }),
  delete: (id: string) =>
    api<void>(`/api/v1/quizzes/${id}`, { method: "DELETE" }),
  addQuestion: (quizId: string, input: QuestionCreate) =>
    api<Question>(`/api/v1/quizzes/${quizId}/questions`, {
      method: "POST",
      body: input,
    }),
  updateQuestion: (id: string, patch: Partial<QuestionCreate>) =>
    api<Question>(`/api/v1/questions/${id}`, {
      method: "PATCH",
      body: patch,
    }),
  deleteQuestion: (id: string) =>
    api<void>(`/api/v1/questions/${id}`, { method: "DELETE" }),
  generate: (quizId: string, input: QuizGenerateInput) =>
    api<Quiz>(`/api/v1/quizzes/${quizId}/generate`, {
      method: "POST",
      body: input,
    }),
  listAttempts: (quizId: string) =>
    api<Attempt[]>(`/api/v1/quizzes/${quizId}/attempts`),
  myAttempts: (quizId: string) =>
    api<Attempt[]>(`/api/v1/me/quizzes/${quizId}/attempts`),
  startAttempt: (quizId: string) =>
    api<Attempt>(`/api/v1/quizzes/${quizId}/attempts`, { method: "POST" }),
  submitAttempt: (attemptId: string, answers: Record<string, unknown[]>) =>
    api<Attempt>(`/api/v1/attempts/${attemptId}/submit`, {
      method: "POST",
      body: { answers },
    }),
  getAttempt: (id: string) => api<Attempt>(`/api/v1/attempts/${id}`),
  analytics: (quizId: string) =>
    api<QuestionAnalytics[]>(`/api/v1/quizzes/${quizId}/analytics`),
};

export type QuestionAnalytics = {
  questionId: string;
  type: QuestionType;
  prompt: string;
  position: number;
  totalResponses: number;
  correctResponses: number;
  correctPct: number;
  optionPickCounts: number[] | null;
};

// ---- Reports (course-service, HR/admin only) ----

export type OrgOverview = {
  totalCourses: number;
  publishedCourses: number;
  totalEnrollments: number;
  activeEnrollments: number;
  completedEnrollments: number;
  overdueEnrollments: number;
  mandatoryOutstanding: number;
  totalLearners: number;
  totalQuizAttempts: number;
  passedQuizAttempts: number;
};

export type CourseReport = {
  courseId: string;
  courseTitle: string;
  status: string;
  totalEnrolled: number;
  assigned: number;
  inProgress: number;
  completed: number;
  waived: number;
  overdue: number;
  mandatoryEnrolled: number;
  mandatoryCompleted: number;
  avgProgressPct: number;
  avgQuizScorePct: number | null;
  totalQuizAttempts: number;
  passedQuizAttempts: number;
};

export type LearnerReport = {
  userId: string;
  userEmail: string | null;
  userName: string | null;
  totalEnrollments: number;
  completedEnrollments: number;
  overdueEnrollments: number;
  totalAttempts: number;
  passedAttempts: number;
  avgQuizScorePct: number | null;
  enrollments: Enrollment[];
  recentAttempts: Attempt[];
};

async function downloadCsv(path: string, filename: string): Promise<void> {
  const session = getSession();
  const res = await fetch(`${API_BASE}${path}`, {
    headers: session ? { Authorization: `Bearer ${session.token}` } : {},
  });
  if (!res.ok) {
    throw new ApiError(res.status, `${res.status} ${res.statusText}`, await res.text());
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export type TeamReport = {
  managerEmail: string;
  totalReports: number;
  activeEnrollments: number;
  completedEnrollments: number;
  overdueEnrollments: number;
  directReports: {
    userId: string;
    userEmail: string;
    userName: string | null;
    department: string | null;
    totalEnrollments: number;
    activeEnrollments: number;
    completedEnrollments: number;
    overdueEnrollments: number;
    avgProgressPct: number;
  }[];
};

export const Reports = {
  overview: () => api<OrgOverview>(`/api/v1/reports/overview`),
  courses: () => api<CourseReport[]>(`/api/v1/reports/courses`),
  course: (id: string) => api<CourseReport>(`/api/v1/reports/courses/${id}`),
  team: (manager?: string) => {
    const qs = manager ? `?manager=${encodeURIComponent(manager)}` : "";
    return api<TeamReport>(`/api/v1/reports/team${qs}`);
  },
  roster: (id: string, status?: EnrollmentStatus) => {
    const qs = status ? `?status=${status}` : "";
    return api<Enrollment[]>(`/api/v1/reports/courses/${id}/roster${qs}`);
  },
  downloadRosterCsv: (id: string, status?: EnrollmentStatus) => {
    const qs = status ? `?status=${status}` : "";
    return downloadCsv(`/api/v1/reports/courses/${id}/roster.csv${qs}`, `course-${id}-roster.csv`);
  },
  overdue: () => api<Enrollment[]>(`/api/v1/reports/overdue`),
  downloadOverdueCsv: () =>
    downloadCsv(`/api/v1/reports/overdue.csv`, `overdue.csv`),
  learner: (userId: string) => api<LearnerReport>(`/api/v1/reports/learners/${userId}`),
};

// ---- Notifications (course-service) ----

export type NotificationChannel = "IN_APP" | "EMAIL";

export type NotificationType =
  | "DUE_SOON"
  | "OVERDUE"
  | "ESCALATION"
  | "MANUAL"
  | "COMPLETED";

export type NotificationStatus = "PENDING" | "SENT" | "FAILED" | "READ";

export type AppNotification = {
  id: string;
  recipientUserId: string;
  recipientEmail: string;
  channel: NotificationChannel;
  type: NotificationType;
  subject: string;
  body: string;
  enrollmentId: string | null;
  courseId: string | null;
  status: NotificationStatus;
  createdByEmail: string | null;
  createdAt: string;
  sentAt: string | null;
  readAt: string | null;
};

export const Notifications = {
  mine: (page = 0, size = 50) =>
    api<AppNotification[]>(`/api/v1/me/notifications?page=${page}&size=${size}`),
  unreadCount: () =>
    api<{ unread: number }>(`/api/v1/me/notifications/unread-count`),
  markRead: (id: string) =>
    api<void>(`/api/v1/me/notifications/${id}/read`, { method: "POST" }),
  markAllRead: () =>
    api<void>(`/api/v1/me/notifications/read-all`, { method: "POST" }),
  sendReminder: (
    enrollmentId: string,
    input: { channel: NotificationChannel; subject: string; body: string },
  ) =>
    api<AppNotification>(`/api/v1/enrollments/${enrollmentId}/reminder`, {
      method: "POST",
      body: input,
    }),
  runScheduler: () =>
    api<void>(`/api/v1/admin/notifications/run-reminders`, { method: "POST" }),
};

// ---- Certificates ----

export type AppCertificate = {
  id: string;
  enrollmentId: string;
  courseId: string;
  courseTitle: string;
  userId: string;
  userEmail: string;
  userName: string | null;
  issuedAt: string;
  serial: string;
};

export const Certificates = {
  mine: () => api<AppCertificate[]>(`/api/v1/me/certificates`),
  get: (id: string) => api<AppCertificate>(`/api/v1/certificates/${id}`),
  downloadPdf: async (id: string, serial: string) => {
    const session = getSession();
    const res = await fetch(`${API_BASE}/api/v1/certificates/${id}/pdf`, {
      headers: session ? { Authorization: `Bearer ${session.token}` } : {},
    });
    if (!res.ok) {
      throw new ApiError(res.status, `${res.status} ${res.statusText}`, await res.text());
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `certificate-${serial}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  },
  viewUrl: (id: string) => `${API_BASE}/api/v1/certificates/${id}/pdf`,
};

