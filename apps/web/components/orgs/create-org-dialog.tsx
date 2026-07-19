'use client';

import { useState, type FormEvent } from 'react';
import {
  Alert,
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  Field,
  Input,
  toast,
} from '@aie/ui';
import { ApiError } from '@/lib/api';
import { useCreateOrg } from '@/hooks/use-orgs';

const slugify = (v: string) =>
  v
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50);

/** Real backend: POST /v1/organizations — the new org becomes the active one. */
export function CreateOrgDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const create = useCreateOrg();
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setName('');
    setSlug('');
    setSlugTouched(false);
    setError(null);
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    create.mutate(
      { name, slug },
      {
        onSuccess: (org) => {
          toast.success(`${org.name} created`, 'It is now your active organization.');
          onOpenChange(false);
          reset();
        },
        onError: (err) =>
          setError(err instanceof ApiError ? err.message : 'Could not create the organization.'),
      },
    );
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (!v) reset();
      }}
    >
      <DialogContent>
        <DialogHeader
          title="Create organization"
          description="A workspace for your team and its AI employees."
        />
        <form onSubmit={submit} className="flex flex-col gap-5">
          {error && <Alert tone="danger" title={error} />}
          <Field label="Organization name" required>
            {(p) => (
              <Input
                {...p}
                required
                placeholder="Acme Co"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (!slugTouched) setSlug(slugify(e.target.value));
                }}
              />
            )}
          </Field>
          <Field label="URL slug" hint="Lowercase letters, digits and hyphens — at least 3 characters." required>
            {(p) => (
              <Input
                {...p}
                required
                minLength={3}
                placeholder="acme-co"
                value={slug}
                onChange={(e) => {
                  setSlugTouched(true);
                  setSlug(slugify(e.target.value));
                }}
              />
            )}
          </Field>
          <DialogFooter className="mt-1">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={create.isPending} disabled={slug.length < 3}>
              Create organization
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
