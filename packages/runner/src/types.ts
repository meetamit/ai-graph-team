import { ModelMessage } from 'ai';

export type NodeId = string;
export type NodeType = 'input' | 'llm' | 'router';
export type Node = {
  id: NodeId;
  type: NodeType; 
  name: string;
  intent?: string;
  instructions?: string[];
  output_schema?: any;
};
export type Edge = { from: NodeId; to: NodeId };
export type Graph = { nodes: Node[]; edges: Edge[] };

export type NodeStatus = 'pending' | 'awaiting' | 'running' | 'done' | 'error';
export type NodeStatuses = Record<NodeId, NodeStatus>;

export type Transcript = Array<ModelMessage>;

export type RunState = {
  prompt?: any;
  status: NodeStatuses;
  pendingIn: Record<NodeId, number>; // in-degree remaining
  ready: NodeId[]; // nodes with in-degree 0 and not started
  outputs: Record<NodeId, any>; // node outputs available to downstream
  transcripts: Array<[NodeId, Transcript]>;
  error?: any;
};

export type NeededInput = {
  name: string;
  prompt: string;
  default?: string;
  nodeId: NodeId;
  resolve: (value: any) => void;
};

export type ProvidedInput = {
  for: NeededInput;
  value: any;
  nodeId: NodeId;
};
