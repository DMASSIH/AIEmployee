'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  CreateEmployeeInput,
  CreatePromptVersionInput,
  UpdateEmployeeInput,
} from '@aie/core';
import { api, type EmployeeListParams } from '@/lib/api';

/** Query keys — one place so invalidations stay consistent. */
export const employeeKeys = {
  all: ['employees'] as const,
  list: (params: EmployeeListParams) => ['employees', 'list', params] as const,
  detail: (id: string) => ['employees', 'detail', id] as const,
  versions: (id: string) => ['employees', 'versions', id] as const,
};

export function useEmployees(params: EmployeeListParams = {}) {
  return useQuery({
    queryKey: employeeKeys.list(params),
    queryFn: () => api.employees.list(params),
    placeholderData: (prev) => prev, // keep the last page visible while refetching
  });
}

export function useEmployee(id: string | undefined) {
  return useQuery({
    queryKey: employeeKeys.detail(id ?? ''),
    queryFn: () => api.employees.get(id!),
    enabled: !!id,
  });
}

export function useEmployeeVersions(id: string | undefined) {
  return useQuery({
    queryKey: employeeKeys.versions(id ?? ''),
    queryFn: () => api.employees.versions(id!),
    enabled: !!id,
  });
}

export function useCreateEmployee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateEmployeeInput) => api.employees.create(input),
    onSuccess: () => void qc.invalidateQueries({ queryKey: employeeKeys.all }),
  });
}

export function useUpdateEmployee(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateEmployeeInput) => api.employees.update(id, input),
    onSuccess: (emp) => {
      qc.setQueryData(employeeKeys.detail(id), emp);
      void qc.invalidateQueries({ queryKey: employeeKeys.all });
    },
  });
}

export function useDeleteEmployee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.employees.remove(id),
    onSuccess: () => void qc.invalidateQueries({ queryKey: employeeKeys.all }),
  });
}

export function useDuplicateEmployee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.employees.duplicate(id),
    onSuccess: () => void qc.invalidateQueries({ queryKey: employeeKeys.all }),
  });
}

export function useSetPublished(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (published: boolean) =>
      published ? api.employees.publish(id) : api.employees.unpublish(id),
    onSuccess: (emp) => {
      qc.setQueryData(employeeKeys.detail(id), emp);
      void qc.invalidateQueries({ queryKey: employeeKeys.all });
    },
  });
}

export function useCreatePromptVersion(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreatePromptVersionInput) => api.employees.createVersion(id, input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: employeeKeys.versions(id) });
      void qc.invalidateQueries({ queryKey: employeeKeys.detail(id) });
    },
  });
}

export function useActivatePromptVersion(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (versionId: string) => api.employees.activateVersion(id, versionId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: employeeKeys.versions(id) });
      void qc.invalidateQueries({ queryKey: employeeKeys.detail(id) });
    },
  });
}

export function useRecompilePrompt(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.employees.recompile(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: employeeKeys.versions(id) });
      void qc.invalidateQueries({ queryKey: employeeKeys.detail(id) });
    },
  });
}
