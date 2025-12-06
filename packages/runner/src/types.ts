import { ModelMessage } from 'ai';

export type NodeId = string;
export type NodeType = 'input' | 'llm' | 'router';

export type NodeToolConfig = {
  type: string;
  name?: string; // optional name to override the tool's default name
  description?: string; // optional description to override the tool's default description
  settings?: Record<string, {
    value?: any;// optional, given (essentially hard-coded) input value that the LLM won't even have to think about
    default?: any; // optional, default value to use; side effect of encouraging the LLM to use that value or tool
    description?: string; // optional, description to override the tool's default description
    mode?: 'Given' | 'Prompted'; // optional, mode to use for the input
  }>;
};

export type NodeModelConfig = {
  name: string;
  args?: Record<string, any>; // optional model-specific args like temperature, maxTokens, etc.
};

export type NodeRoutingMode =
  | { mode: 'broadcast' } // default, send to all downstream edges
  | {
      mode?: 'llm-switch'; // LLM picks 1 or more routes
      routes?: RouteDef[];
      allowMultiple?: boolean; // false => exactly one
      required?: boolean;      // true => must pick at least one
    }
  | {
      mode: 'expression-switch'; // deterministic routing via CEL
      exprLanguage: 'cel';
      routes: {
        id: string;       // 'success' | 'retry' | 'dead_letter'
        expr: string;     // e.g. `output.score > 0.8`
      }[];
      defaultRoute?: string;
    };

export type RouteDef = {
  id: string;               // stable route id, referenced by edges and tools
  label?: string;           // display label
  description?: string;     // fed to the LLM: “Use this when…”
};

export type Node = {
  id: NodeId;
  type: NodeType; 
  name: string;
  intent?: string;
  instructions?: string[];
  tools?: Array<string | NodeToolConfig>;
  model?: string | NodeModelConfig;
  output_schema?: any;
  routing?: NodeRoutingMode;
};
export type Edge = { from: NodeId; to: NodeId };
export type Graph = { nodes: Node[]; edges: Edge[] };

export type NodeStatus = 'pending' | 'awaiting' | 'running' | 'done' | 'error' | 'skipped';
export type NodeStatuses = Record<NodeId, NodeStatus>;

export type Transcript = Array<ModelMessage>;

export type FileRef = {
  id: string;                 // uuid
  runId: string;              // which run created/uses it
  nodeId?: string;            // which node created it (if any)
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
