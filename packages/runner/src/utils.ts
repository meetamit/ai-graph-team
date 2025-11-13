import { ModelMessage, TextPart, ToolCallPart, ToolResultPart } from 'ai';
import { RunState, Transcript, FileRef, NodeId, Graph } from './types';

export const messagesToolCalls = (messages: ModelMessage[]): ToolCallPart[] => messages
  .flatMap((m: ModelMessage) => (typeof m.content === 'string' ? [{ type: 'text', text: m.content }] : m.content).map(c => c as TextPart | ToolCallPart))
  .filter((c: TextPart | ToolCallPart) => c.type === 'tool-call')
  .map(({ type, toolCallId, toolName, input }: ToolCallPart) => ({ type, toolCallId, toolName, input }));

export const messagesToolResults = (messages: ModelMessage[]): ToolResultPart[] => messages
  .flatMap((m: ModelMessage) => (typeof m.content === 'string' ? [{ type: 'text', text: m.content }] : m.content).map(c => c as TextPart | ToolResultPart))
  .filter((c: TextPart | ToolResultPart) => c.type === 'tool-result')
  .map(({ type, toolCallId, toolName, output }: ToolResultPart) => ({ type, toolCallId, toolName, output: { type: 'json', value: output } } as ToolResultPart));



export class InvalidInputError extends Error {
  constructor(
    message: string,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'InvalidInput'; // error "type"
  }
}
  
export function initRunState(runId: string, graph: Graph, prompt?: any, fromNode?: NodeId, pre?: RunState): RunState {
  const status: RunState['status'] = {};
  const pendingIn: RunState['pendingIn'] = {};
  const outputs: RunState['outputs'] = {};
  const files: RunState['files'] = {};
  const transcripts: Array<[NodeId, Transcript]> = [];
  let ready: NodeId[];
  
  // Initialize all nodes as pending with 0 pending dependencies
  for (const n of graph.nodes) { 
    status[n.id] = 'pending'; 
    pendingIn[n.id] = 0; 
  }

  if (fromNode) {
    // 1. Verify that pre is supplied
    if (!pre) { throw new InvalidInputError('pre state must be supplied when fromNode is provided'); }
    
    // 2. Verify that the run can start from that node
    // Find all upstream and downstream nodes of `fromNode`
    const upstreamNodes = new Set<NodeId>();
    let visited = new Set<NodeId>();
    function findUpstream(nodeId: NodeId) {
      if (visited.has(nodeId)) return;
      visited.add(nodeId);
      
      const incomingEdges = graph.edges.filter(e => e.to === nodeId);
      for (const edge of incomingEdges) {
        upstreamNodes.add(edge.from);
        findUpstream(edge.from);
      }
    }
    findUpstream(fromNode);

    const downstreamNodes = new Set<NodeId>([fromNode]);
    visited = new Set<NodeId>();
    function findDownstream(nodeId: NodeId) {
      if (visited.has(nodeId)) return;
      visited.add(nodeId);
      
      const outgoingEdges = graph.edges.filter(e => e.from === nodeId);
      for (const edge of outgoingEdges) {
        downstreamNodes.add(edge.to);
        findDownstream(edge.to);
      }
    }
    findDownstream(fromNode);

    // Sibling nodes are the ones that are not upstream or downstream of `fromNode`. Their run data gets reused unless missing, in which case they're auto-run
    const siblingNodes = new Set<NodeId>(graph.nodes.map(n => n.id).filter(id => !upstreamNodes.has(id) && !downstreamNodes.has(id)));

    // Check that all upstream nodes are done and have valid outputs
    for (const uId of upstreamNodes) {
      if (pre.status[uId] !== 'done') {
        throw new InvalidInputError(`Cannot start from node ${fromNode}: upstream node ${uId} is not done (status: ${pre.status[uId]})`);
      }
      if (!pre.outputs[uId]) {
        throw new InvalidInputError(`Cannot start from node ${fromNode}: upstream node ${uId} has no output`);
      }
    }
    
    // 3. Initialize state by copying upstream data from pre state

    // We will copy fileRefs for nodes that are upstream or siblings.
    type FileRefsByNode = Record<NodeId, Record<string, FileRef>>;
    const filesByNode: FileRefsByNode = Object.values(pre.files).reduce((m, file) => {
      if (file.nodeId) {
        m[file.nodeId] = m[file.nodeId] || {};
        m[file.nodeId][file.id] = file;
      }
      return m;
    }, {} as FileRefsByNode);

    // Set status and copy outputs for upstream and (done) sibling nodes
    for (const id of [...upstreamNodes, ...siblingNodes]) {
      // only copy if the node is done, which only matters for siblings
      if (pre.status[id] === 'done') {
        status[id] = pre.status[id];
        outputs[id] = pre.outputs[id];
        Object.assign(files, filesByNode[id] || {})
      }
    }
    
    // Calculate initial pending dependencies
    for (const n of graph.nodes) { pendingIn[n.id] = 0; }
    for (const e of graph.edges) {
      if (status[e.from] === 'done') { continue; }
      pendingIn[e.to] += 1;
    }

    // 4. Prepare the transcripts
    for (const [nodeId, transcript] of pre.transcripts) {
      if (upstreamNodes.has(nodeId) || siblingNodes.has(nodeId)) { 
        transcripts.push([nodeId, transcript]);
      }
    }

    ready = graph.nodes
      .filter(n => pendingIn[n.id] === 0 && status[n.id] === 'pending')
      .map(n => n.id)
      .sort(); // sort for determinism
  } else {
    // Calculate initial pending dependencies
    for (const e of graph.edges) pendingIn[e.to] += 1;

    ready = graph.nodes.filter(n => pendingIn[n.id] === 0).map(n => n.id).sort(); // sort for determinism
  }
  
  return { runId, prompt, status, pendingIn, ready, outputs, transcripts, files };
}

