import { TransformStream } from 'stream/web';
import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/app/(auth)/auth";
import { getGraphById, createGraphRun, getLatestGraphRun, getGraphRunById, updateGraphRun } from "@/lib/db/queries";
import {
  GraphWorkflowClient, 
  Graph, NodeType, NodeId,
  NeededInput, ProvidedInput,
  NodeStatuses, 
} from '@ai-graph-team/runner';
import {
  GraphJSON, GraphNodeMessage,
  GraphRunEvent, GraphRunStatusEvent, GraphRunNodeOutputEvent, GraphRunRecordEvent, GraphRunNeededInputEvent, GraphRunErrorEvent, GraphRunTranscriptEvent
} from "@/lib/graphSchema";

const runner: GraphWorkflowClient = new GraphWorkflowClient({
  taskQueue: 'graph-queue',
  idBase: 'team-run-',
});

const graphRunMask = { statuses: undefined, transcripts: undefined, outputs: undefined };
// Stream events for a graph run
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session || !session.user || !session.user.id) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const { id } = await params;
  const graphRun = await getLatestGraphRun({ id });

  const responseStream = new TransformStream();
  const writer: WritableStreamDefaultWriter = responseStream.writable.getWriter();
  const res = new Response(responseStream.readable as ReadableStream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
    },
  });
  ;(async function() {
    const encoder = new TextEncoder();
    async function sendEvent(event: GraphRunEvent) {
      await writer.write(
        encoder.encode(`event: ${event.type}\ndata: ${JSON.stringify(event.payload)}\n\n`)
      );
    }
    try {
      if (!graphRun) {
        await sendEvent({ type: 'run', payload: null } as GraphRunRecordEvent);
      } else {
        const { statuses, transcripts, outputs } = graphRun;
        if (['done', 'error'].includes(graphRun.status) && statuses && transcripts && outputs) {
          // If the graph run is done and data is available, send it in one event instead of streaming many events
          await sendEvent({ type: 'run', payload: graphRun } as GraphRunRecordEvent);
          } else {
          // Stream events for the graph run
          await sendEvent({ type: 'run', payload: {...graphRun, ...graphRunMask} } as GraphRunRecordEvent);
          
          const transcripts: Array<[NodeId, GraphNodeMessage[]]> = [];
          const outputs: Record<NodeId, any> = {};
          let statuses: NodeStatuses = {};

          let event: GraphRunStatusEvent | GraphRunNodeOutputEvent | GraphRunNeededInputEvent | GraphRunTranscriptEvent;
          for await (event of runner.events(graphRun.workflowId)) {
            await sendEvent(event);
            if (event.type === 'transcript') {
              transcripts.push(...event.payload);
            } else if (event.type === 'output') {
              outputs[event.payload[0]] = event.payload[1];
            } else if (event.type === 'status') {
              statuses = event.payload;
            }
          }
          const status = Object.values(statuses).every(s => s === 'done') ? 'done' : Object.values(statuses).some(s => s === 'error') ? 'error' : 'running';
          
          // Persist the graph run data so that it can be retrieved without using the workflow client
          const [updated] = await updateGraphRun({ id: graphRun.id, patch: { status, outputs, transcripts, statuses } });
          if (!updated) { throw new Error('Failed to update graph run'); }

          await sendEvent({ type: 'run', payload: { ...updated, graph: undefined, ...graphRunMask } } as GraphRunRecordEvent);
        }
      }
    } catch (error) {
      console.error('Error streaming events:', error);
      await sendEvent({ type: 'error', payload: { error: String(error) } } as GraphRunErrorEvent);
    } finally {
      await sendEvent({ type: 'done', payload: {} });
      writer.close();
    }
  })();
  return res;
}

// Run a graph
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session || !session.user || !session.user.id) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const { id } = await params;
  const graph = await getGraphById({ id });
  if (!graph) {
    return new NextResponse('Graph not found', { status: 404 });
  }

  if (graph.ownerId !== session.user.id) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const workflowId = `team-run-${graph.id}-${Date.now()}`;
  runner.runWorkflow(graph.data as Graph, undefined, workflowId)
  const [graphRun] = await createGraphRun({
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
  if (!session || !session.user || !session.user.id) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const { id } = await params;
  const { runId, inputs } = await request.json() as { runId: string, inputs: ProvidedInput[] };

  const graphRun = await getGraphRunById({ id: runId });
  if (!graphRun || graphRun.graphId !== id) {
    return new NextResponse('Graph run not found', { status: 404 });
  }

  await runner.provideInput(graphRun.workflowId, inputs);
  return NextResponse.json({ success: true }, { status: 200 });
}