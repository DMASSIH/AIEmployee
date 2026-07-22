'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CreateConversationInput, UpdateConversationInput } from '@aie/core';
import { api, type ConversationListParams } from '@/lib/api';

export const conversationKeys = {
  all: ['conversations'] as const,
  list: (params: ConversationListParams) => ['conversations', 'list', params] as const,
  detail: (id: string) => ['conversations', 'detail', id] as const,
  messages: (id: string) => ['conversations', 'messages', id] as const,
};

export function useConversations(params: ConversationListParams = {}) {
  return useQuery({
    queryKey: conversationKeys.list(params),
    queryFn: () => api.conversations.list(params),
    placeholderData: (prev) => prev,
  });
}

export function useConversation(id: string | undefined) {
  return useQuery({
    queryKey: conversationKeys.detail(id ?? ''),
    queryFn: () => api.conversations.get(id!),
    enabled: !!id,
  });
}

export function useMessages(id: string | undefined) {
  return useQuery({
    queryKey: conversationKeys.messages(id ?? ''),
    queryFn: () => api.conversations.messages(id!),
    enabled: !!id,
  });
}

export function useCreateConversation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateConversationInput) => api.conversations.create(input),
    onSuccess: () => void qc.invalidateQueries({ queryKey: conversationKeys.all }),
  });
}

export function useUpdateConversation(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateConversationInput) => api.conversations.update(id, input),
    onSuccess: (conv) => {
      qc.setQueryData(conversationKeys.detail(id), conv);
      void qc.invalidateQueries({ queryKey: conversationKeys.all });
    },
  });
}

export function useDeleteConversation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.conversations.remove(id),
    onSuccess: () => void qc.invalidateQueries({ queryKey: conversationKeys.all }),
  });
}
