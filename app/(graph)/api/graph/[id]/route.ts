import { NextRequest, NextResponse } from "next/server";
import { notFound, unauthorized } from "next/navigation";
import { z } from "zod";

import { auth } from "@/app/(auth)/auth";
import { Graph } from "@/lib/db/schema";
import { getGraphById, updateGraph, deleteGraph } from "@/lib/db/queries";
import { GraphSchema } from "@/lib/graph-schema";
import { getGraphCapabilities } from "@/lib/graph-policy";

const UpdateSchema = z.object({
  title: z.string().min(1).optional(),
  data: GraphSchema.optional(),
});

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) return unauthorized();

  const { id } = await params;
  const graph: Graph | null = await getGraphById({ id });
  if (!graph) notFound();

  const { canView } = getGraphCapabilities({ user: session.user, graph });
  if (!canView) return unauthorized();

  return NextResponse.json(graph);
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) return unauthorized();

  const { id } = await params;
  const graph: Graph | null = await getGraphById({ id });
  if (!graph) notFound();

  const { canEdit } = getGraphCapabilities({ user: session.user, graph });
  if (!canEdit) return unauthorized();
  
  const body = await req.json();
  const parsed = UpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const patch: Record<string, unknown> = { updatedAt: new Date() };
  if (parsed.data.title) patch.title = parsed.data.title;
  if (parsed.data.data) patch.data = parsed.data.data;

  const [updated] = await updateGraph({ id, ownerId: graph.ownerId!, patch });
  if (!updated) notFound();
  return NextResponse.json(updated);
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) return unauthorized();

  const { id } = await params;
  const graph: Graph | null = await getGraphById({ id });
  if (!graph) notFound();

  const { canEdit } = getGraphCapabilities({ user: session.user, graph });
  if (!canEdit) return unauthorized();

  const [deleted] = await deleteGraph({ id, ownerId: graph.ownerId! });
  if (!deleted) notFound();
  return NextResponse.json({ ok: true });
}
