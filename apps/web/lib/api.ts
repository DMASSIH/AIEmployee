import type {
  ConversationView,
  CreateConversationInput,
  ListConversationsQuery,
  MessageView,
  PaginatedConversations,
  StreamEvent,
  UpdateConversationInput,
  CollectionView,
  CreateCollectionInput,
  CreateEmployeeInput,
  CreateManualDocumentInput,
  CreateOrganizationInput,
  CreatePromptVersionInput,
  DocumentView,
  EmployeeView,
  LoginInput,
  OrganizationWithRole,
  PaginatedCollections,
  PaginatedDocuments,
  PaginatedEmployees,
  PreviewPromptInput,
  PromptVersionView,
  PublicUser,
  RegisterInput,
  RetrievalResult,
  RetrieveQuery,
  UpdateCollectionInput,
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
  knowledge: {
    collections: {
      list: (page = 1, pageSize = 50) =>
        request<PaginatedCollections>(`/v1/knowledge/collections?page=${page}&pageSize=${pageSize}`),
      create: (input: CreateCollectionInput) =>
        request<CollectionView>('/v1/knowledge/collections', {
          method: 'POST',
          body: JSON.stringify(input),
        }),
      update: (id: string, input: UpdateCollectionInput) =>
        request<CollectionView>(`/v1/knowledge/collections/${id}`, {
          method: 'PATCH',
          body: JSON.stringify(input),
        }),
      remove: (id: string) =>
        request<void>(`/v1/knowledge/collections/${id}`, { method: 'DELETE' }),
    },
    documents: {
      list: (params: DocumentListParams = {}) =>
        request<PaginatedDocuments>(`/v1/knowledge/documents${toQuery(params)}`),
      get: (id: string) => request<DocumentView>(`/v1/knowledge/documents/${id}`),
      createManual: (input: CreateManualDocumentInput) =>
        request<DocumentView>('/v1/knowledge/documents', {
          method: 'POST',
          body: JSON.stringify(input),
        }),
      upload: async (file: File, opts: { name?: string; collectionId?: string } = {}) => {
        const form = new FormData();
        form.append('file', file);
        const res = await fetch(
          `${API_URL}/v1/knowledge/documents/upload${toQuery({ name: opts.name, collectionId: opts.collectionId })}`,
          { method: 'POST', credentials: 'include', body: form },
        );
        if (!res.ok) {
          let message = `Upload failed (${res.status})`;
          try {
            const body = (await res.json()) as { error?: string };
            message = body.error ?? message;
          } catch {
            /* non-JSON */
          }
          throw new ApiError(res.status, message);
        }
        return (await res.json()) as DocumentView;
      },
      retry: (id: string) =>
        request<DocumentView>(`/v1/knowledge/documents/${id}/retry`, { method: 'POST' }),
      remove: (id: string) =>
        request<void>(`/v1/knowledge/documents/${id}`, { method: 'DELETE' }),
    },
    retrieve: (query: RetrieveQuery) =>
      request<RetrievalResult>('/v1/knowledge/retrieve', {
        method: 'POST',
        body: JSON.stringify(query),
      }),
  },
  conversations: {
    list: (params: ConversationListParams = {}) =>
      request<PaginatedConversations>(`/v1/conversations${toQuery(params)}`),
    get: (id: string) => request<ConversationView>(`/v1/conversations/${id}`),
    messages: (id: string) => request<MessageView[]>(`/v1/conversations/${id}/messages`),
    create: (input: CreateConversationInput) =>
      request<ConversationView>('/v1/conversations', { method: 'POST', body: JSON.stringify(input) }),
    update: (id: string, input: UpdateConversationInput) =>
      request<ConversationView>(`/v1/conversations/${id}`, { method: 'PATCH', body: JSON.stringify(input) }),
    remove: (id: string) => request<void>(`/v1/conversations/${id}`, { method: 'DELETE' }),
    summarize: (id: string) =>
      request<ConversationView>(`/v1/conversations/${id}/summarize`, { method: 'POST' }),
    /** Stream a chat turn; invokes onEvent for each SSE StreamEvent. */
    streamMessage: async (
      id: string,
      content: string,
      onEvent: (event: StreamEvent) => void,
      signal?: AbortSignal,
    ) => {
      const res = await fetch(`${API_URL}/v1/conversations/${id}/messages/stream`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ content }),
        signal,
      });
      if (!res.ok || !res.body) {
        throw new ApiError(res.status, `Stream failed (${res.status})`);
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const frames = buffer.split('\n\n');
        buffer = frames.pop() ?? '';
        for (const frame of frames) {
          const line = frame.split('\n').find((l) => l.startsWith('data:'));
          if (!line) continue;
          const json = line.slice(5).trim();
          if (json) onEvent(JSON.parse(json) as StreamEvent);
        }
      }
    },
  },
};

export interface ConversationListParams {
  q?: string;
  status?: string;
  employeeId?: string;
  sort?: ListConversationsQuery['sort'];
  order?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
}

export interface DocumentListParams {
  q?: string;
  status?: string;
  collectionId?: string;
  sort?: 'createdAt' | 'updatedAt' | 'name';
  order?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
}

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
function toQuery(params: object): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') search.set(key, String(value));
  }
  const qs = search.toString();
  return qs ? `?${qs}` : '';
}
