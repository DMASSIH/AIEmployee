'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CreateOrganizationInput } from '@aie/core';
import { api, ApiError } from '@/lib/api';

/** Organizations the signed-in user belongs to (real backend). */
export function useOrganizations() {
  return useQuery({ queryKey: ['orgs'], queryFn: api.orgs.list });
}

/** The session's active organization; null when none is selected yet. */
export function useCurrentOrg() {
  return useQuery({
    queryKey: ['orgs', 'current'],
    queryFn: async () => {
      try {
        return await api.orgs.current();
      } catch (err) {
        if (err instanceof ApiError && (err.status === 400 || err.status === 403)) return null;
        throw err;
      }
    },
  });
}

export function useCreateOrg() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateOrganizationInput) => api.orgs.create(input),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['orgs'] }),
  });
}

export function useSwitchOrg() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (organizationId: string) => api.orgs.switch(organizationId),
    onSuccess: (org) => {
      qc.setQueryData(['orgs', 'current'], org);
      void qc.invalidateQueries({ queryKey: ['orgs'] });
    },
  });
}
