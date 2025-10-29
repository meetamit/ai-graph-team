import { proxyActivities, log, defineSignal, defineQuery, setHandler } from '@temporalio/workflow';
import { NodeId, Node, Graph, RunState, RunNodeInput, NeededInput, ProvidedInput, NodeStatuses, Transcript } from '../types';
import { Activities, NodeStepResult } from '../activities/createActivities';
import { ModelMessage, TextPart, ToolCallPart, ToolResultPart } from 'ai';
import { zodFromSchema } from '../json-schema-to-zod';


const { makeToolCall, takeNodeFirstStep, takeNodeFollowupStep } = proxyActivities<Activities>({
  startToCloseTimeout: '1 minute',
  retry: { maximumAttempts: 1 },
});

export class InvalidInputError extends Error {
  constructor(
    message: string,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'InvalidInput'; // error "type"
  }
}

function initRunState(graph: Graph, prompt?: any, fromNode?: NodeId, pre?: RunState): RunState {
  const status: RunState['status'] = {};
  const pendingIn: RunState['pendingIn'] = {};
  const outputs: RunState['outputs'] = {};
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
    for (const upstreamNodeId of upstreamNodes) {
      if (pre.status[upstreamNodeId] !== 'done') {
        throw new InvalidInputError(`Cannot start from node ${fromNode}: upstream node ${upstreamNodeId} is not done (status: ${pre.status[upstreamNodeId]})`);
      }
      if (!pre.outputs[upstreamNodeId]) {
        throw new InvalidInputError(`Cannot start from node ${fromNode}: upstream node ${upstreamNodeId} has no output`);
      }
    }
    
    // 3. Initialize state by copying upstream data from pre state
    // Set status and copy outputs for upstream nodes
    for (const upstreamNodeId of upstreamNodes) {
      status[upstreamNodeId] = pre.status[upstreamNodeId];
      outputs[upstreamNodeId] = pre.outputs[upstreamNodeId];
    }
    // Set status and copy outputs for sibling nodes that are done
    for (const siblingNodeId of siblingNodes) {
      if (pre.status[siblingNodeId] === 'done') {
        status[siblingNodeId] = pre.status[siblingNodeId];
        outputs[siblingNodeId] = pre.outputs[siblingNodeId];
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
  
  return { prompt, status, pendingIn, ready, outputs, transcripts };
}

export const receiveInput = defineSignal<[ProvidedInput[]]>('receiveInput');
export const getNeededInput = defineQuery<NeededInput[]>('getNeededInput');
export const getNodeStatuses = defineQuery<NodeStatuses>('getNodeStatuses');
export const getNodeOutput = defineQuery<Record<string, any>, [NodeId]>('getNodeOutput');
export const getTranscripts = defineQuery<Array<[NodeId, Transcript]>, [number]>('getTranscripts');

export async function runGraphWorkflow({
  graph, prompt, fromNode, initial
}: {
  graph: Graph, prompt?: any, fromNode?: NodeId, initial?: RunState
}): Promise<RunState> {
  let neededInput: NeededInput[] = [];
  setHandler(receiveInput, (provided: ProvidedInput[]) => {
    const resolved: Array<[NeededInput, ProvidedInput]> = [];
    // Extract and removefrom neededInput the ones that are provided, then resolve them
    neededInput = neededInput.filter((n: NeededInput) => {
      const p: ProvidedInput | undefined = provided.find((p: ProvidedInput) => {
        return n.name === p.for.name && n.nodeId === p.nodeId
      });
      if (p) {
        resolved.push([n, p]);
        return false;
      }
      return true;
    });
    resolved.forEach(([n, p]) => n.resolve(p));
  });
  setHandler(getNeededInput, () => neededInput);
  setHandler(getNodeStatuses, () => state.status);
  setHandler(getNodeOutput, (nodeId: NodeId) => state.outputs[nodeId]);
  setHandler(getTranscripts, (offset: number) => state.transcripts.slice(offset || 0));

  const nodeById = Object.fromEntries(graph.nodes.map(n => [n.id, n]));

  let state: RunState;
  try {
    state = initRunState(graph, prompt, fromNode, initial);
  } catch (e: any) {
    state = {
      outputs: {},
      status: {},
      pendingIn: {},
      ready: [],
      transcripts: [],
      error: e.message,
    }
    return state;
  }

  async function runNodeWorkflow(input: RunNodeInput): Promise<any> {
    const MAX_STEPS = 10;
    let transcript: Transcript = [];
    let stepResult: NodeStepResult | undefined;
    let resultObject: any;
    for (let i = 0; i < MAX_STEPS && !resultObject; i++) {
      stepResult = await (i === 0 ? takeNodeFirstStep : takeNodeFollowupStep)({
        transcript, i, 
        prompt: input.context.prompt, 
        node: input.node, 
        inputs: input.inputs
      });

      // Append the generated messages to the transcript
      // transcript.splice(transcript.length, 0, ...(stepResult.messages.map(({ role, content }) => ({ role, content })) as ModelMessage[]));
      transcript.splice(transcript.length, 0, ...stepResult.messages);
      state.transcripts.push([input.node.id, stepResult.messages]);

      if (stepResult.finishReason === 'stop') {
        const content = transcript[transcript.length - 1]?.content;
        resultObject = content.length === 1 ? content[0] : content;
        break;
      } else if (stepResult.finishReason === 'tool-calls') {
        const toolCalls: ToolCallPart[] = stepResult.messages
          .flatMap(m => (typeof m.content === 'string' ? [{ type: 'text', text: m.content }] : m.content).map(c => c as TextPart | ToolCallPart))
          .filter(c => c.type === 'tool-call')
          .map(({ type, toolCallId, toolName, input }) => ({ type, toolCallId, toolName, input }));
        
        if (toolCalls.length === 0) {
          throw new Error('No tool calls found');
        }

        const toolCallResults: ToolResultPart[] = await Promise.all(
          toolCalls.map(async (toolCall: ToolCallPart) => {
            let toolResult: ToolResultPart;
            if (toolCall.toolName === 'collectUserInput') {
              // Input collection gets initiated and resolved without actually calling a tool
              toolResult = {
                type: 'tool-result',
                toolName: toolCall.toolName,
                toolCallId: toolCall.toolCallId,
                output: {
                  type: 'json',
                  value: await new Promise(resolve => {
                    // Append the requested input to the neededInput array.
                    // `resolve` will be called once the input is provided via the signal.
                    neededInput = (neededInput || []).concat({
                      ...(toolCall.input as { name: string, prompt: string, default: string }), 
                      nodeId: input.node.id, 
                      resolve,// will be resolved when the input is provided
                    });

                    // Set the node status to awaiting
                    state.status[input.node.id] = 'awaiting';
                  })
                },
              }
              // Set the node status back to running after the input is collected
              state.status[input.node.id] = 'running';
            } else if (toolCall.toolName === 'resolveNodeOutput') {
              if (input.node.output_schema) {
                try {
                  const validator = zodFromSchema(input.node.output_schema);
                  validator.parse((toolCall.input as any).data);
                } catch (error) {
                  console.log('Validation errors: ' + error);
                  throw error;
                }
              }
              // Output resolution is handled by setting `resultObject` —— not tool call
              resultObject = Object.assign(resultObject || {}, toolCall.input);
              toolResult = {
                type: 'tool-result',
                toolName: toolCall.toolName,
                toolCallId: toolCall.toolCallId,
                output: {
                  type: 'json',
                  value: resultObject,
                },
              }
            } else {
              toolResult = await makeToolCall({ toolCall });
            }
            return toolResult;
          })
        )
        const toolMessage: ModelMessage = { role: 'tool', content: toolCallResults }
        transcript.push(toolMessage);
        state.transcripts.push([input.node.id, [toolMessage] as Transcript]);
      } else {
        throw new Error(`Unexpected finish reason: ${stepResult.finishReason}`);
      }
    }

    return resultObject;
  }

  function runNextWave(resolve: (value: unknown) => void, reject: (reason?: any) => void) {
    while (state.ready.length) {
      const id: NodeId = state.ready.shift()!;
      const node: Node = nodeById[id]!;
      state.status[id] = 'running';
  
      const inputs: Record<NodeId, any> = Object.fromEntries(
        graph.edges.filter(e => e.to === id).map(e => [e.from, state.outputs[e.from]]) as [NodeId, any][]
      );
      runNodeWorkflow({ node, inputs, context: state })
        .then((output: RunState) => {
          if (!output) { return reject(new Error('No output from node')); }
          state.status[id] = 'done';
          state.outputs[id] = output;
          const deps: NodeId[] = graph.edges.filter(e => e.from === id).map(e => e.to);
          for (const dId of deps) {
            state.pendingIn[dId] -= 1;
            if (state.pendingIn[dId] === 0) {
              state.ready.push(dId);
            }
          }
          state.ready.sort(); // stable order after each wave
          runNextWave(resolve, reject);
          if (Object.values(state.status).every(s => s === 'done')) {
            resolve(state);
          }
        })
        .catch(e => {
          state.status[id] = 'error';
          state.outputs[id] = { error: e.cause?.message || e.message };
          resolve(state);
        });
    }  
  }
  await new Promise((resolve, reject) => runNextWave(resolve, reject));

  return state;
}
