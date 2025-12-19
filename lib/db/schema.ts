import type { InferSelectModel } from 'drizzle-orm';
import { pgTable, pgEnum, varchar, uuid, text, timestamp, jsonb, bigint, boolean } from 'drizzle-orm/pg-core';

// Enums
export const userRoleEnum = pgEnum('user_role', ['admin']);
export const graphVisibilityEnum = pgEnum('graph_visibility', ['private', 'unlisted', 'listed']);

export const user = pgTable('user', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  email: varchar('email', { length: 64 }).notNull(),
  password: varchar('password', { length: 64 }),
  role: userRoleEnum('role'), // null = normal user, 'admin' = admin
});

export const graph = pgTable('graph', {
  id: uuid('id').defaultRandom().primaryKey(),
  ownerId: uuid('owner_id').references(() => user.id), 
  title: varchar('title', { length: 256 }).notNull(),
  data: jsonb('data').notNull(), // { nodes: [...], edges: [...] }
  visibility: graphVisibilityEnum('visibility').notNull().default('private'),
  publicViewEnabled: boolean('public_view_enabled').notNull().default(false),
  publicRunEnabled: boolean('public_run_enabled').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const graphRun = pgTable('graph_run', {
  id: uuid('id').defaultRandom().primaryKey(),
  graphId: uuid('graph_id').references(() => graph.id),
  ownerId: uuid('owner_id').references(() => user.id),
  workflowId: varchar('workflow_id', { length: 128 }).notNull(),
  status: varchar('status', { length: 16 }).notNull().default('running'),
  graph: jsonb('graph').notNull(), // { nodes: [...], edges: [...] }
  outputs: jsonb('outputs'),
  statuses: jsonb('statuses'),
  files: jsonb('files'),
  transcripts: jsonb('transcripts'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const file = pgTable('file', {
  id: uuid('id').defaultRandom().primaryKey(),
  runId: uuid('run_id').notNull().references(() => graphRun.id, { onDelete: 'cascade' }),
  nodeId: text('node_id'),
  kind: varchar('kind', { length: 16 }).notNull().$type<'generated' | 'upload' | 'external'>(),
  uri: text('uri').notNull(),
  filename: text('filename').notNull(),
  mediaType: text('media_type').notNull(),
  bytes: bigint('bytes', { mode: 'number' }).notNull(),
  sha256: text('sha256').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  metadata: jsonb('metadata'),
});

export type User = InferSelectModel<typeof user>;
export type Graph = InferSelectModel<typeof graph>;
export type GraphRun = InferSelectModel<typeof graphRun>;
export type File = InferSelectModel<typeof file>;
