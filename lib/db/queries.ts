import 'server-only';

import { genSaltSync, hashSync } from 'bcrypt-ts';
import { GraphJSON, GraphNodeMessage, NodeId, NodeStatuses, FileRef } from '@/lib/graph-schema';
import { and, asc, desc, eq, gt, gte, inArray } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import {
  user,
  type User,
  graph,
  type Graph,
  graphRun,
  type GraphRun,
  file,
  type File,
} from './schema';

// Optionally, if not using email/pass login, you can
// use the Drizzle adapter for Auth.js / NextAuth
// https://authjs.dev/reference/adapter/drizzle

// biome-ignore lint: Forbidden non-null assertion.
const client = postgres(process.env.POSTGRES_URL!);
const db = drizzle(client);

export async function getUser(email: string): Promise<Array<User>> {
  try {
    return await db.select().from(user).where(eq(user.email, email));
  } catch (error) {
    console.error('Failed to get user from database');
    throw error;
  }
}

export async function createUser(email: string, password: string) {
  const salt = genSaltSync(10);
  const hash = hashSync(password, salt);

  try {
    return await db.insert(user).values({ email, password: hash });
  } catch (error) {
    console.error('Failed to create user in database');
    throw error;
  }
}

export async function getGraphsByUserId({ id }: { id: string }): Promise<Array<Graph>> {
  try {
    return await db.select().from(graph).where(eq(graph.ownerId, id));
  } catch (error) {
    console.error('Failed to get graphs by user id from database');
    throw error;
  }
}

export async function saveGraph({
  title,
  data,
  ownerId,
}: {
  title: string;
  data: GraphJSON;
  ownerId: string;
}) {
  try {
    return  await db.insert(graph).values({ title, data, ownerId, }).returning();
  } catch (error) {
    console.error('Failed to save graph in database');
    throw error;
  }
}

export async function getGraphById({ id }: { id: string }): Promise<Graph | null> {
  try {
    const [selectedGraph] = await db.select().from(graph).where(eq(graph.id, id));
    return selectedGraph;
  } catch (error) {
    console.error('Failed to get graph by id from database');
    throw error;
  }
}

export async function updateGraph({ id, ownerId, patch }: { id: string, ownerId: string, patch: Record<string, unknown> }) {
  try {
    return await db.update(graph)
      .set({ ...patch, updatedAt: new Date() })
      .where(and(eq(graph.id, id), eq(graph.ownerId, ownerId)))
      .returning();
  } catch (error) {
    console.error('Failed to update graph in database');
    throw error;
  }
}

export async function deleteGraph({ id, ownerId }: { id: string, ownerId: string }) {
  try {
    return await db.delete(graph).where(and(eq(graph.id, id), eq(graph.ownerId, ownerId))).returning();
  } catch (error) {
    console.error('Failed to delete graph in database');
    throw error;
  }
}

export async function createGraphRun({ id, graphId, ownerId, graph, workflowId }: { id: string, graphId: string, ownerId: string, graph: GraphJSON, workflowId: string }): Promise<GraphRun[]> {
  try {
    return await db.insert(graphRun).values({ id, graphId, ownerId, graph, workflowId }).returning();
  } catch (error) {
    console.error('Failed to create graph run in database');
    throw error;
  }
}

export async function getGraphRunById({ id }: { id: string }): Promise<GraphRun | null> {
  try {
    const [selectedGraphRun] = await db.select().from(graphRun).where(eq(graphRun.id, id));
    return selectedGraphRun;
  } catch (error) {
    console.error('Failed to get graph run by id from database');
    throw error;
  }
}

export async function getLatestGraphRun({ id }: { id: string }): Promise<GraphRun | null> {
  try {
    const [selectedGraphRun] = await db.select().from(graphRun).where(eq(graphRun.graphId, id)).orderBy(desc(graphRun.createdAt)).limit(1);
    return selectedGraphRun;
  } catch (error) {
    console.error('Failed to get latest graph run in database');
    throw error;
  }
}

export async function updateGraphRun(
  { id, patch }: { 
    id: string, 
    patch: {
      status: string,
      outputs?: Record<NodeId, any>,
      transcripts?: Array<[NodeId, GraphNodeMessage[]]>,
      statuses?: NodeStatuses,
      files?: Record<string, FileRef>,
    } 
  }): Promise<GraphRun[]> {
  try {
    return await db.update(graphRun).set(patch).where(eq(graphRun.id, id)).returning();
  } catch (error) {
    console.error('Failed to update graph run in database');
    throw error;
  }
}

export async function createFileRef({
  id, runId, nodeId, kind, uri, filename, mediaType, bytes, sha256, metadata,
}: {
  id: string;
  runId: string;
  nodeId?: string | null;
  kind: 'generated' | 'upload' | 'external';
  uri: string;
  filename: string;
  mediaType: string;
  bytes: number;
  sha256: string;
  metadata?: any;
}): Promise<File[]> {
  try {
    return await db.insert(file).values({
      id, runId, nodeId, kind, uri, filename, mediaType, bytes, sha256, metadata,
    }).returning();
  } catch (error) {
    console.error('Failed to create file in database');
    throw error;
  }
}

export async function getFileRefById({ id }: { id: string }): Promise<File | null> {
  try {
    const [selectedFile] = await db.select().from(file).where(eq(file.id, id));
    return selectedFile;
  } catch (error) {
    console.error('Failed to get file by id from database');
    throw error;
  }
}

