import { TransformStream } from 'stream/web';
import { NextRequest, NextResponse } from "next/server";
import { unauthorized } from "next/navigation";

import { auth } from "@/app/(auth)/auth";
import { getLatestGraphRun, updateGraphRun, createFileRef } from "@/lib/db/queries";
import {
  GraphWorkflowClient, 
  NodeId,
  NodeStatuses, FileRef,
} from '@ai-graph-team/runner';
import {
  GraphNodeMessage,
  GraphRunEvent, GraphRunStatusEvent, GraphRunNodeOutputEvent, GraphRunRecordEvent, 
  GraphRunNeededInputEvent, GraphRunErrorEvent, GraphRunTranscriptEvent, GraphRunFilesEvent
} from "@/lib/graph-schema";

const runner: GraphWorkflowClient = new GraphWorkflowClient({
  taskQueue: 'graph-queue',
  idBase: 'team-run-',
});

const graphRunMask = { statuses: undefined, transcripts: undefined, outputs: undefined };

// Stream events for the latest graph run
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session || !session.user || !session.user.id) return unauthorized();

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
          let files: Record<string, FileRef> = {};
          let statuses: NodeStatuses = {};

          let event: GraphRunStatusEvent | GraphRunNodeOutputEvent | GraphRunNeededInputEvent | GraphRunTranscriptEvent | GraphRunFilesEvent;
          for await (event of runner.events(graphRun.workflowId)) {
            if (event.type === 'transcript') {
              transcripts.push(...event.payload);
            } else if (event.type === 'output') {
              outputs[event.payload[0]] = event.payload[1];
            } else if (event.type === 'status') {
              statuses = event.payload;
            } else if (event.type === 'files') {
              for (const fileRef of Object.values(event.payload)) {
                const file = await createFileRef(fileRef);
              }
            }
            await sendEvent(event);
          }
          const status = Object.values(statuses).every(s => s === 'done') ? 'done' : Object.values(statuses).some(s => s === 'error') ? 'error' : 'running';
          
          // Persist the graph run data so that it can be retrieved without using the workflow client
          const [updated] = await updateGraphRun({ id: graphRun.id, patch: { status, outputs, transcripts, statuses, files } });
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

