import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/app/(auth)/auth";
import { getGraphById, getGraphRunById } from "@/lib/db/queries";

// Get a single graph run by run id
export async function GET(
  request: NextRequest, 
  { params }: { params: { id: string; runId: string } }
) {
  const session = await auth();
  if (!session || !session.user || !session.user.id) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const { id: graphId, runId } = await params;

  const graph = await getGraphById({ id: graphId });
  if (!graph) {
    return new NextResponse('Graph not found', { status: 404 });
  }

  if (graph.ownerId !== session.user.id) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const graphRun = await getGraphRunById({ id: runId });
  if (!graphRun || graphRun.graphId !== graphId) {
    return new NextResponse('Graph run not found', { status: 404 });
  }

  return NextResponse.json(graphRun, { status: 200 });
}

