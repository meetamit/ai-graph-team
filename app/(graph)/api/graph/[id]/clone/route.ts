import { NextRequest, NextResponse } from "next/server";
import { notFound, unauthorized } from "next/navigation";
import { z } from "zod";

import { auth } from "@/app/(auth)/auth";
import { Graph } from "@/lib/db/schema";
import { getGraphById, cloneGraph } from "@/lib/db/queries";
import { getGraphCapabilities } from "@/lib/graph-policy";

const CloneSchema = z.object({
  title: z.string().min(1),
});

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) return unauthorized();

  const { id } = await params;
  const originalGraph: Graph | null = await getGraphById({ id });
  if (!originalGraph) notFound();

  const { canView } = getGraphCapabilities({ user: session.user, graph: originalGraph });
  if (!canView) return unauthorized();

  const body = await req.json();
  const parsed = CloneSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { title } = parsed.data;
  const [cloned] = await cloneGraph({ id, ownerId: session.user.id, title });

  return NextResponse.json(cloned, { status: 201 });
}

