import { pgTable, uuid, text, timestamp, bigint, index } from 'drizzle-orm/pg-core';
import { organizations } from './organizations';
import { users } from './users';
import { fileStatusEnum, filePurposeEnum } from './enums';

/**
 * Every uploaded object, whatever it's for. The S3 key is derived, never
 * user-controlled: orgs/{orgId}/files/{fileId}. `status` gates use: nothing
 * downstream (ingestion, serving) touches a file until it's `ready`
 * (post virus-scan + magic-byte type check).
 */
export const files = pgTable(
  'files',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orgId: uuid('org_id')
      .notNull()
      .references(() => organizations.id),
    storageKey: text('storage_key').notNull().unique(),
    filename: text('filename').notNull(),
    /** Sniffed from magic bytes server-side — NOT trusted from the client. */
    mimeType: text('mime_type').notNull(),
    sizeBytes: bigint('size_bytes', { mode: 'number' }).notNull(),
    sha256: text('sha256'),
    purpose: filePurposeEnum('purpose').notNull().default('other'),
    status: fileStatusEnum('status').notNull().default('pending'),
    error: text('error'),
    uploadedBy: uuid('uploaded_by').references(() => users.id),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (t) => [index('files_org_purpose_idx').on(t.orgId, t.purpose, t.createdAt)],
);
