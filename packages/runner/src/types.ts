export type NodeId = string;
export type NodeType = 'input' | 'llm' | 'router';
export type Node = { id: NodeId; type: NodeType; };
export type Edge = { from: NodeId; to: NodeId };
export type Graph = { nodes: Node[]; edges: Edge[] };

export type NodeStatus = 'pending' | 'running' | 'done' | 'error';
export type NodesStatus = Record<NodeId, NodeStatus>;

export type RunState = {
  prompt?: any;
  status: NodesStatus;
  pendingIn: Record<NodeId, number>; // in-degree remaining
  ready: NodeId[]; // nodes with in-degree 0 and not started
  outputs: Record<NodeId, any>; // node outputs available to downstream
};

export type RunNodeInput = {
  node: Node;
  inputs: Record<string, any>;
  context: RunState;
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
