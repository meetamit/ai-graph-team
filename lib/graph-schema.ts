import { z } from "zod";
import type {
  NodeId, NodeStatus, NodeStatuses, NeededInput, ProvidedInput, FileRef, NodeToolConfig,
  GraphStatusEvent, GraphNodeOutputEvent, GraphNeededInputEvent, GraphTranscriptEvent, GraphFilesEvent,
  ModelMessage, AssistantModelMessage, UserModelMessage, SystemModelMessage, ToolModelMessage,
  ToolCallPart, ToolResultPart, TextPart,
} from '@ai-graph-team/runner';
import { GraphRun } from "./db/schema";

// Database schema - matches packages/runner/src/types.ts
export const NodeSchema = z.object({
  id: z.string(),
  type: z.enum(['input', 'llm', 'router']),
  name: z.string(),
  intent: z.string().optional(),
  instructions: z.array(z.string()).optional(),
  output_schema: z.any().optional(),
  tools: z.array(z.any()).optional(),
});

export const EdgeSchema = z.object({
  from: z.string(),
  to: z.string(),
});

export const GraphSchema = z.object({
  nodes: z.array(NodeSchema),
  edges: z.array(EdgeSchema),
  layouts: z.record(z.string(), z.object({
    x: z.number(),
    y: z.number()
  })).optional(),
});

export type GraphJSON = z.infer<typeof GraphSchema>;

export type { NodeId, NodeStatus, NodeStatuses, NeededInput, ProvidedInput, NodeToolConfig, FileRef };

export type GraphRunStatusEvent = GraphStatusEvent;
export type GraphRunNodeOutputEvent = GraphNodeOutputEvent;
export type GraphRunNeededInputEvent = GraphNeededInputEvent;
export type GraphRunTranscriptEvent = GraphTranscriptEvent;
export type GraphRunFilesEvent = GraphFilesEvent;
export type GraphRunRecordEvent = { type: 'run'; payload: GraphRun | null };
export type GraphRunDoneEvent = { type: 'done'; payload: {} };
export type GraphRunErrorEvent = { type: 'error'; payload: { error: string } };

export type GraphRunEvent = GraphRunRecordEvent | GraphRunStatusEvent | GraphRunNeededInputEvent | GraphRunNodeOutputEvent | 
                            GraphRunTranscriptEvent | GraphRunDoneEvent | GraphRunErrorEvent | GraphRunFilesEvent;
export type GraphRunEventType = GraphRunEvent['type'];

export type GraphNodeMessage = ModelMessage;

export type GraphNodeAssistantModel = AssistantModelMessage;
export type GraphNodeUserModel = UserModelMessage;
export type GraphNodeSystemModel = SystemModelMessage;
export type GraphNodeToolModel = ToolModelMessage;

export type GraphNodeToolCallPart = ToolCallPart;
export type GraphNodeToolResultPart = ToolResultPart;
export type GraphNodeTextPart = TextPart;

export type GraphNodeMessageGroup = { nodeId: NodeId, messages: GraphNodeMessage[]};