'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CreateMemoryInput, SearchMemoriesInput, UpdateMemoryInput } from '@aie/core';
import { api, type MemoryListParams } from '@/lib/api';

export const memoryKeys = {
  all: ['memory'] as const,
  list: (params: MemoryListParams) => ['memory', 'list', params] as const,
  detail: (id: string) => ['memory', 'detail', id] as const,
  summary: (conversationId: string) => ['memory', 'summary', conversationId] as const,
};

/* ------------------------------- memories --------------------------------- */

export function useMemories(params: MemoryListParams = {}) {
  return useQuery({
    queryKey: memoryKeys.list(params),
    queryFn: () => api.memory.list(params),
    placeholderData: (prev) => prev,
  });
}

export function useMemory(id: string | null) {
  return useQuery({
    queryKey: memoryKeys.detail(id ?? ''),
    queryFn: () => api.memory.get(id!),
    enabled: !!id,
  });
}

export function useCreateMemory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateMemoryInput) => api.memory.create(input),
    onSuccess: () => void qc.invalidateQueries({ queryKey: memoryKeys.all }),
  });
}

export function useUpdateMemory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: { id: string; input: UpdateMemoryInput }) =>
      api.memory.update(args.id, args.input),
    onSuccess: () => void qc.invalidateQueries({ queryKey: memoryKeys.all }),
  });
}

export function useDeleteMemory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.memory.remove(id),
    onSuccess: () => void qc.invalidateQueries({ queryKey: memoryKeys.all }),
  });
}

export function useRestoreMemory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.memory.restore(id),
    onSuccess: () => void qc.invalidateQueries({ queryKey: memoryKeys.all }),
  });
}

/* -------------------------------- search ---------------------------------- */

export function useSearchMemories() {
  return useMutation({
    mutationFn: (input: SearchMemoriesInput) => api.memory.search(input),
  });
}

/* -------------------------- conversation summary -------------------------- */

export function useConversationSummary(conversationId: string | null) {
  return useQuery({
    queryKey: memoryKeys.summary(conversationId ?? ''),
    queryFn: () => api.memory.conversationSummary(conversationId!),
    enabled: !!conversationId,
  });
}

export function useRegenerateSummary() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (conversationId: string) => api.memory.regenerateSummary(conversationId),
    onSuccess: (_res, conversationId) =>
      void qc.invalidateQueries({ queryKey: memoryKeys.summary(conversationId) }),
  });
}
