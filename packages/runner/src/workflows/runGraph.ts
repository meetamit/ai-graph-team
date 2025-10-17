import { proxyActivities, log, defineSignal, defineQuery, setHandler, condition, upsertSearchAttributes } from '@temporalio/workflow';
import { NodeId, NodeType, Node, Edge, Graph, RunState, RunNodeInput, NeededInput, ProvidedInput, NodesStatus } from '../types';
import { Activities, NodeStepResult, Transcript } from '../activities/createActivities';
import { ModelMessage, TextPart, ToolCallPart, ToolResultPart } from 'ai';

const { makeToolCall, takeNodeFirstStep, takeNodeFollowupStep } = proxyActivities<Activities>({
  startToCloseTimeout: '1 minute',
  retry: { maximumAttempts: 1 },
});

function initRunState(graph: Graph, prompt?: any): RunState {
  const status: RunState['status'] = {};
  const pendingIn: RunState['pendingIn'] = {};
  for (const n of graph.nodes) { status[n.id] = 'pending'; pendingIn[n.id] = 0; }
  for (const e of graph.edges) pendingIn[e.to] += 1;
  const ready = graph.nodes.filter(n => pendingIn[n.id] === 0).map(n => n.id).sort(); // sort for determinism
  return { prompt, status, pendingIn, ready, outputs: {} };
}

export const receiveInput = defineSignal<[ProvidedInput[]]>('receiveInput');
export const getNeededInput = defineQuery<NeededInput[]>('getNeededInput');
export const getNodesStatus = defineQuery<NodesStatus>('getNodesStatus');
export const getNodeOutput = defineQuery<Record<string, any>, [NodeId]>('getNodeOutput');
export const getTranscripts = defineQuery<Array<[NodeId, Transcript]>, [number]>('getTranscripts');

export async function runGraphWorkflow({graph, prompt}: {graph: Graph, prompt?: any}): Promise<RunState> {
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
  setHandler(getNodesStatus, () => state.status);
  setHandler(getNodeOutput, (nodeId: NodeId) => state.outputs[nodeId]);
  setHandler(getTranscripts, (offset: number) => transcripts.slice(offset || 0));

  const nodeById = Object.fromEntries(graph.nodes.map(n => [n.id, n]));
  const state = initRunState(graph, prompt);
  const transcripts: Array<[NodeId, Transcript]> = [];

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
      transcripts.push([input.node.id, stepResult.messages]);

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
        transcripts.push([input.node.id, [toolMessage] as Transcript]);
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
          reject(e)
        });
    }  
  }
  await new Promise((resolve, reject) => runNextWave(resolve, reject));

  return state;
}
