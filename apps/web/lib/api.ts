import type {
  CreateEmployeeInput,
  CreateOrganizationInput,
  CreatePromptVersionInput,
  EmployeeView,
  LoginInput,
  OrganizationWithRole,
  PaginatedEmployees,
  PreviewPromptInput,
  PromptVersionView,
  PublicUser,
  RegisterInput,
  UpdateEmployeeInput,
} from '@aie/core';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

/** Typed fetch against the Fastify API. Sessions ride on the httpOnly cookie. */
async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    credentials: 'include',
    headers: init?.body ? { 'content-type': 'application/json' } : undefined,
    ...init,
  });
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const body = (await res.json()) as { error?: string; message?: string };
      message = body.error ?? body.message ?? message;
    } catch {
      /* non-JSON error body */
    }
    throw new ApiError(res.status, message);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export const api = {
  auth: {
    me: () => request<PublicUser>('/v1/me'),
    login: (input: LoginInput) =>
      request<PublicUser>('/v1/auth/login', { method: 'POST', body: JSON.stringify(input) }),
    register: (input: RegisterInput) =>
      request<PublicUser>('/v1/auth/register', { method: 'POST', body: JSON.stringify(input) }),
    logout: () => request<void>('/v1/auth/logout', { method: 'POST' }),
  },
  orgs: {
    list: () => request<OrganizationWithRole[]>('/v1/organizations'),
    current: () => request<OrganizationWithRole>('/v1/organizations/current'),
    create: (input: CreateOrganizationInput) =>
      request<OrganizationWithRole>('/v1/organizations', {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    switch: (organizationId: string) =>
      request<OrganizationWithRole>('/v1/organizations/switch', {
        method: 'POST',
        body: JSON.stringify({ organizationId }),
      }),
  },
  employees: {
    list: (params: EmployeeListParams = {}) =>
      request<PaginatedEmployees>(`/v1/employees${toQuery(params)}`),
    get: (id: string) => request<EmployeeView>(`/v1/employees/${id}`),
    create: (input: CreateEmployeeInput) =>
      request<EmployeeView>('/v1/employees', { method: 'POST', body: JSON.stringify(input) }),
    update: (id: string, input: UpdateEmployeeInput) =>
      request<EmployeeView>(`/v1/employees/${id}`, { method: 'PATCH', body: JSON.stringify(input) }),
    remove: (id: string) => request<void>(`/v1/employees/${id}`, { method: 'DELETE' }),
    restore: (id: string) =>
      request<EmployeeView>(`/v1/employees/${id}/restore`, { method: 'POST' }),
    duplicate: (id: string) =>
      request<EmployeeView>(`/v1/employees/${id}/duplicate`, { method: 'POST' }),
    publish: (id: string) =>
      request<EmployeeView>(`/v1/employees/${id}/publish`, { method: 'POST' }),
    unpublish: (id: string) =>
      request<EmployeeView>(`/v1/employees/${id}/unpublish`, { method: 'POST' }),
    previewPrompt: (input: PreviewPromptInput) =>
      request<PromptPreview>('/v1/employees/prompt/preview', {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    versions: (id: string) => request<PromptVersionView[]>(`/v1/employees/${id}/versions`),
    createVersion: (id: string, input: CreatePromptVersionInput) =>
      request<PromptVersionView>(`/v1/employees/${id}/versions`, {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    activateVersion: (id: string, versionId: string) =>
      request<PromptVersionView>(`/v1/employees/${id}/versions/${versionId}/activate`, {
        method: 'POST',
      }),
    recompile: (id: string) =>
      request<PromptVersionView>(`/v1/employees/${id}/recompile`, { method: 'POST' }),
  },
};

export interface PromptPreview {
  compiledPrompt: string;
  ok: boolean;
  variables: string[];
  errors: string[];
}

export interface EmployeeListParams {
  q?: string;
  status?: string;
  visibility?: string;
  includeDeleted?: boolean;
  sort?: 'createdAt' | 'updatedAt' | 'name';
  order?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
}

/** Serialize defined params into a `?a=1&b=2` string (empty when none). */
function toQuery(params: EmployeeListParams): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') search.set(key, String(value));
  }
  const qs = search.toString();
  return qs ? `?${qs}` : '';
}
