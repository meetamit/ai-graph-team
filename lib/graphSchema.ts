import { z } from "zod";

// Database schema - matches packages/runner/src/types.ts
export const NodeSchema = z.object({
  id: z.string(),
  type: z.enum(['input', 'llm', 'router']),
  name: z.string(),
  intent: z.string().optional(),
  instructions: z.array(z.string()).optional(),
  output_schema: z.any().optional(),
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

export const EMPTY_GRAPH: GraphJSON = { nodes: [], edges: [] };

// A friendly starter template for new graphs
export const STARTER_GRAPH: GraphJSON = {
  nodes: [
    {
      id: "user_input",
      type: "input",
      name: "User Input",
      intent: `Collect the user's proposal/topic or question to be debated. Pass this text unchanged to downstream nodes.`,
    },
    {
      id: "position_for",
      type: "llm",
      name: "Position For",
      intent: `Given the user's proposal, argue IN FAVOR. Produce 3 concise points supporting the proposal, each 1–2 sentences.`,
    },
    {
      id: "position_against",
      type: "llm",
      name: "Position Against",
      intent: `Given the user's proposal, argue AGAINST it. Produce 3 concise points opposing the proposal, each 1–2 sentences.`,
    },
    {
      id: "judge",
      type: "llm",
      name: "Judge & Summary",
      intent: `Read the FOR and AGAINST points. Write a brief, neutral synthesis and declare which side is stronger (for/against/tie) with a one-sentence justification.`,
    },
  ],
  edges: [
    { from: "user_input", to: "position_for" },
    { from: "user_input", to: "position_against" },
    { from: "position_for", to: "judge" },
    { from: "position_against", to: "judge" },
  ],
  layouts: {
    "user_input": { x: 250, y: 20 },
    "position_for": { x: 50, y: 170 },
    "position_against": { x: 450, y: 170 },
    "judge": { x: 250, y: 320 },
  },
};

const systemRules = 'You are a node in a DAG-based workflow. You must return a single JSON object. If required inputs are missing, request them using the available tools.';
const genericInstructions = [
  systemRules,
  '## Node JSON',
  '{{node}}',
  '## Upstream Inputs JSON',
  '{{inputs}}',
];
export const PRESCRIPTIVE_GRAPH: GraphJSON = {
  ...STARTER_GRAPH,
  nodes: [
    {
      ...STARTER_GRAPH.nodes[0],
      instructions: [...genericInstructions],
      output_schema: {
        type: "object",
        properties: {
          proposal: {
            type: "string",
            description: "The main proposal or topic to be debated"
          },
          special_considerations: {
            type: "string",
            description: "Any special considerations or context for the debate"
          }
        },
        required: ["proposal", "special_considerations"]
      },
    },
    {
      ...STARTER_GRAPH.nodes[1],
      instructions: [...genericInstructions],
      output_schema: {
        type: "object",
        properties: {
          arguments: {
            type: "array",
            items: {
              type: "object",
              properties: {
                argument: {
                  type: "string",
                  description: "The content or statement of the argument"
                },
                weight: {
                  type: "number",
                  description: "The strength or importance of the argument"
                }
              }
            },
            required: ["argument", "weight"]
          }
        },
        required: ["arguments"]
      },
    },
    {
      ...STARTER_GRAPH.nodes[2],
      instructions: [...genericInstructions]
    },
    {
      ...STARTER_GRAPH.nodes[3],
      instructions: [...genericInstructions]
    },
  ],
};

import type {
  NodeId, NodeStatus, NodeStatuses, NeededInput, ProvidedInput, 
  GraphStatusEvent, GraphNodeOutputEvent, GraphNeededInputEvent, GraphTranscriptEvent,
  ModelMessage, AssistantModelMessage, UserModelMessage, SystemModelMessage, ToolModelMessage,
  ToolCallPart, ToolResultPart, TextPart,
} from '@ai-graph-team/runner';
import { GraphRun } from "./db/schema";

export type { NodeId, NodeStatus, NodeStatuses, NeededInput, ProvidedInput };

export type GraphRunStatusEvent = GraphStatusEvent;
export type GraphRunNodeOutputEvent = GraphNodeOutputEvent;
export type GraphRunNeededInputEvent = GraphNeededInputEvent;
export type GraphRunTranscriptEvent = GraphTranscriptEvent;
export type GraphRunRecordEvent = { type: 'run'; payload: GraphRun | null };
export type GraphRunDoneEvent = { type: 'done'; payload: {} };
export type GraphRunErrorEvent = { type: 'error'; payload: { error: string } };

export type GraphRunEvent = GraphRunRecordEvent | GraphRunStatusEvent | GraphRunNeededInputEvent | GraphRunNodeOutputEvent | GraphRunTranscriptEvent | GraphRunDoneEvent | GraphRunErrorEvent;
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