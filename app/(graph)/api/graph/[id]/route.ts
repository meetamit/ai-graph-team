import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/app/(auth)/auth";
import { graph, Graph } from "@/lib/db/schema";
import { getGraphById, updateGraph, deleteGraph } from "@/lib/db/queries";
import { eq } from "drizzle-orm";
import { GraphSchema } from "@/lib/graph-schema";

const UpdateSchema = z.object({
  title: z.string().min(1).optional(),
  data: GraphSchema.optional(),
});

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session || !session.user || !session.user.id) {
    return new Response('Unauthorized', { status: 401 });
  }

  const { id } = await params;
  const graph: Graph | null = await getGraphById({ id });
  if (!graph) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (graph.ownerId !== session.user.id) {
    return new Response('Unauthorized', { status: 401 });
  }

  return NextResponse.json(graph);
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session || !session.user || !session.user.id) {
    return new Response('Unauthorized', { status: 401 });
  }
  
  const body = await req.json();
  const parsed = UpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const patch: Record<string, unknown> = { updatedAt: new Date() };
  if (parsed.data.title) patch.title = parsed.data.title;
  if (parsed.data.data) patch.data = parsed.data.data;

  const { id } = await params;
  const [updated] = await updateGraph({ id, ownerId: session.user.id, patch });
  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(updated);
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session || !session.user || !session.user.id) {
    return new Response('Unauthorized', { status: 401 });
  }

  const { id } = await params;
  const [deleted] = await deleteGraph({ id, ownerId: session.user.id });
  if (!deleted) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
