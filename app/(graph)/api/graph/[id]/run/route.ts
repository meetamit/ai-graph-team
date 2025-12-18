import { NextRequest, NextResponse } from "next/server";
import { notFound, unauthorized } from "next/navigation";

import { auth } from "@/app/(auth)/auth";
import { getGraphById, getGraphRunById, getGraphRunsByGraphId, createGraphRun } from "@/lib/db/queries";
import { GraphRun } from '@/lib/db/schema'
import {
  GraphWorkflowClient, 
  Graph, NodeType, NodeId,
  NeededInput, ProvidedInput,
  NodeStatuses, FileRef,
} from '@ai-graph-team/runner';
import { GraphJSON, GraphNodeMessage } from "@/lib/graph-schema";

const runner: GraphWorkflowClient = new GraphWorkflowClient({
  taskQueue: 'graph-queue',
  idBase: 'team-run-',
});

// Get all graph runs for a graph
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session || !session.user || !session.user.id) return unauthorized();

  const { id: graphId } = await params;

  const graph = await getGraphById({ id: graphId });
  if (!graph) notFound();
  if (graph.ownerId !== session.user.id) return unauthorized();

  const graphRuns = await getGraphRunsByGraphId({ graphId });
  return NextResponse.json(graphRuns, { status: 200 });
}

// Run a graph
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session || !session.user || !session.user.id) return unauthorized();

  const { id: graphId } = await params;
  const body = await request.json().catch(() => ({}));
  const { fromNode, fromRun: fromRunId } = body as { fromNode?: string, fromRun?: string };

  let fromRun: GraphRun | null = null;
  if (fromNode) {
    if (!fromRunId) {
      throw new Error('Must provide run id to run from a node');
    }
    fromRun = await getGraphRunById({ id: fromRunId });
    if (!fromRun) {
      throw new Error('Invalid run id');
    }
  }
  
  const graph = await getGraphById({ id: graphId });
  if (!graph) notFound();
  if (graph.ownerId !== session.user.id) return unauthorized();

  const workflowId = `team-run-${graph.id}-${Date.now()}`;
  const { description: { runId } } = await runner.startWorkflow({ 
    graph: graph.data as Graph, 
    workflowId: workflowId,
    modelKind: request.headers.get('X-Test-Model') || undefined,
    imageModelKind: request.headers.get('X-Test-ImageModel') || undefined,
    fromNode,
    initial: fromRun ? {
      runId: fromRun.id,
      status: fromRun.statuses as any/*  as NodeStatuses */,
      outputs: fromRun.outputs as any/*  as Record<NodeId, any> */,
      transcripts: fromRun.transcripts as any/*  as Array<[NodeId, GraphNodeMessage[]]> */,
      files: fromRun.files as any/*  as Record<string, FileRef> */,
    } : undefined
  })
  const [graphRun] = await createGraphRun({
    id: runId,
    workflowId: workflowId,
    graphId: graph.id,
    ownerId: session.user.id,
    graph: graph.data as GraphJSON,
  });
  return NextResponse.json(graphRun, { status: 200 });
}

// Submit needed input for a graph run
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session || !session.user || !session.user.id) return unauthorized();

  const { id: graphId } = await params;
  const { runId, inputs } = await request.json() as { runId: string, inputs: ProvidedInput[] };

  const graphRun = await getGraphRunById({ id: runId });
  if (!graphRun || graphRun.graphId !== graphId) notFound();

  await runner.provideInput(graphRun.workflowId, inputs);
  return NextResponse.json({ success: true }, { status: 200 });
}
