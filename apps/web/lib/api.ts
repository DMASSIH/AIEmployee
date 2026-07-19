import type {
  CreateOrganizationInput,
  LoginInput,
  OrganizationWithRole,
  PublicUser,
  RegisterInput,
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
};
