'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  CreateCollectionInput,
  CreateManualDocumentInput,
  RetrieveQuery,
} from '@aie/core';
import { api, type DocumentListParams } from '@/lib/api';

export const knowledgeKeys = {
  all: ['knowledge'] as const,
  collections: ['knowledge', 'collections'] as const,
  documents: (params: DocumentListParams) => ['knowledge', 'documents', params] as const,
};

/* ------------------------------ collections ------------------------------- */

export function useCollections() {
  return useQuery({
    queryKey: knowledgeKeys.collections,
    queryFn: () => api.knowledge.collections.list(),
  });
}

export function useCreateCollection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateCollectionInput) => api.knowledge.collections.create(input),
    onSuccess: () => void qc.invalidateQueries({ queryKey: knowledgeKeys.collections }),
  });
}

export function useDeleteCollection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.knowledge.collections.remove(id),
    onSuccess: () => void qc.invalidateQueries({ queryKey: knowledgeKeys.all }),
  });
}

/* -------------------------------- documents ------------------------------- */

/** Documents list. Auto-refetches while any document is still processing. */
export function useDocuments(params: DocumentListParams = {}) {
  return useQuery({
    queryKey: knowledgeKeys.documents(params),
    queryFn: () => api.knowledge.documents.list(params),
    placeholderData: (prev) => prev,
    refetchInterval: (query) => {
      const items = query.state.data?.items ?? [];
      return items.some((d) => d.status === 'pending' || d.status === 'processing') ? 2500 : false;
    },
  });
}

export function useUploadDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: { file: File; collectionId?: string }) =>
      api.knowledge.documents.upload(args.file, { collectionId: args.collectionId }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['knowledge', 'documents'] }),
  });
}

export function useCreateManualDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateManualDocumentInput) => api.knowledge.documents.createManual(input),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['knowledge', 'documents'] }),
  });
}

export function useRetryDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.knowledge.documents.retry(id),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['knowledge', 'documents'] }),
  });
}

export function useDeleteDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.knowledge.documents.remove(id),
    onSuccess: () => void qc.invalidateQueries({ queryKey: knowledgeKeys.all }),
  });
}

/* ------------------------------- retrieval -------------------------------- */

export function useRetrieve() {
  return useMutation({
    mutationFn: (query: RetrieveQuery) => api.knowledge.retrieve(query),
  });
}
