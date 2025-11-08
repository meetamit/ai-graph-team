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

export type FileRef = {
  id: string;                 // uuid
  runId: string;              // which run created/uses it
  nodeId?: string | null;     // which node created it (if any)
  kind: 'generated' | 'upload' | 'external';
  uri: string;                // 'file://…' now; 's3://…' later. Never relative.
  filename: string;           // user-facing name; safe, sanitized
  mediaType: string;          // 'text/plain', 'image/png', 'application/json', ...
  bytes: number;              // size
  sha256: string;             // content hash for de-dupe/integrity
  createdAt: string;          // ISO
  metadata?: Record<string, any>; // optional (e.g. tool that produced it, prompt hash, etc.)
};

export type RunState = {
  runId: string;
  prompt?: any;
  status: NodeStatuses;
  pendingIn: Record<NodeId, number>; // in-degree remaining
  ready: NodeId[]; // nodes with in-degree 0 and not started
  outputs: Record<NodeId, any>; // node outputs available to downstream
  transcripts: Array<[NodeId, Transcript]>;
  files: Record<string, FileRef>;
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
