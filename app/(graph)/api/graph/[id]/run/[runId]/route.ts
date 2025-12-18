import { NextRequest, NextResponse } from "next/server";
import { notFound, unauthorized } from "next/navigation";

import { auth } from "@/app/(auth)/auth";
import { getGraphById, getGraphRunById } from "@/lib/db/queries";

// Get a single graph run by run id
export async function GET(
  request: NextRequest, 
  { params }: { params: { id: string; runId: string } }
) {
  const session = await auth();
  if (!session || !session.user || !session.user.id) return unauthorized();

  const { id: graphId, runId } = await params;

  const graph = await getGraphById({ id: graphId });
  if (!graph) notFound();
  if (graph.ownerId !== session.user.id) return unauthorized();

  const graphRun = await getGraphRunById({ id: runId });
  if (!graphRun || graphRun.graphId !== graphId) notFound();

  return NextResponse.json(graphRun, { status: 200 });
}

