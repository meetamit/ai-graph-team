import type { InferSelectModel } from 'drizzle-orm';
import { pgTable, varchar, uuid, text, timestamp, jsonb } from 'drizzle-orm/pg-core';

export const user = pgTable('user', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  email: varchar('email', { length: 64 }).notNull(),
  password: varchar('password', { length: 64 }),
});

export const graph = pgTable('graph', {
  id: uuid('id').defaultRandom().primaryKey(),
  ownerId: uuid('owner_id').references(() => user.id), 
  title: varchar('title', { length: 256 }).notNull(),
  data: jsonb('data').notNull(), // { nodes: [...], edges: [...] }
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type User = InferSelectModel<typeof user>;
export type Graph = InferSelectModel<typeof graph>;