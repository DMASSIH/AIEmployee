export * from './client';
export * from './schema/index';

// Common query operators, re-exported so consumers use one drizzle-orm version.
// (`sql` is already re-exported via ./client.)
export { eq, and, or } from 'drizzle-orm';
