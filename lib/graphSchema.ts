import { z } from "zod";

export const NodeSchema = z.object({
  id: z.string(),
  type: z.string().optional(),
  data: z.record(z.string(), z.unknown()),
  position: z.object({
    x: z.number(),
    y: z.number()
  })
});

export const EdgeSchema = z.object({
  id: z.string(),
  source: z.string(),
  target: z.string(),
  label: z.string().optional(),
  data: z.record(z.string(), z.any()).optional(),
});

export const GraphSchema = z.object({
  nodes: z.array(NodeSchema),
  edges: z.array(EdgeSchema),
});

export type GraphJSON = z.infer<typeof GraphSchema>;

export const EMPTY_GRAPH: GraphJSON = { nodes: [], edges: [] };

// A friendly starter template for new graphs
export const STARTER_GRAPH: GraphJSON = {
  nodes: [
    { id: "user_input",       type: "user_input", data: { label: "User Input", }, position: { x: 250, y: 50 } },
    { id: "position_for",     type: "llm",        data: { label: "For", },        position: { x: 50,  y: 150 } },
    { id: "position_against", type: "llm",        data: { label: "Against", },    position: { x: 450, y: 150 } },
    { id: "judge",            type: "llm",        data: { label: "Judge", },      position: { x: 250, y: 250 } },
  ],
  edges: [
    { id: "e1", source: "user_input",       target: "position_for" },
    { id: "e2", source: "user_input",       target: "position_against" },
    { id: "e3", source: "position_for",     target: "judge" },
    { id: "e4", source: "position_against", target: "judge" },
  ],
};

import type { NodeId, NodeStatus, NodesStatus, NeededInput, ProvidedInput, GraphStatusEvent, GraphNodeOutputEvent, GraphNeededInputEvent } from '@ai-graph-team/runner';
import { GraphRun } from "./db/schema";

export type { NodeId, NodeStatus, NodesStatus, NeededInput, ProvidedInput };

export type GraphRunStatusEvent = GraphStatusEvent;
export type GraphRunNodeOutputEvent = GraphNodeOutputEvent;
export type GraphRunNeededInputEvent = GraphNeededInputEvent;
export type GraphRunRecordEvent = { type: 'run'; payload: GraphRun | null };
export type GraphRunDoneEvent = { type: 'done'; payload: {} };
export type GraphRunErrorEvent = { type: 'error'; payload: { error: string } };

export type GraphRunEvent = GraphRunRecordEvent | GraphRunStatusEvent | GraphRunNeededInputEvent | GraphRunNodeOutputEvent | GraphRunDoneEvent | GraphRunErrorEvent;
export type GraphRunEventType = GraphRunEvent['type'];
