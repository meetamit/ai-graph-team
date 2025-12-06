import { ModelMessage, ToolCallPart, ToolResultPart } from 'ai';
import { proxyActivities, log, defineSignal, defineQuery, setHandler, workflowInfo } from '@temporalio/workflow';
import { 
  RunState, NeededInput, ProvidedInput, NodeStatuses,
  Transcript, FileRef,
  NodeId, Node, Edge, Graph, 
} from './types';
import { Activities, NodeStepResult } from './activities';
import { zodFromSchema } from '@ai-graph-team/llm-tools';
import { messagesToolCalls, messagesToolResults, initRunState } from './utils';

const { makeToolCall, takeNodeFirstStep, takeNodeFollowupStep } = proxyActivities<Activities>({
  startToCloseTimeout: '10 minutes',
  retry: { maximumAttempts: 1 },
});

export const receiveInput = defineSignal<[ProvidedInput[]]>('receiveInput');
export const getNeededInput = defineQuery<NeededInput[]>('getNeededInput');
export const getNodeStatuses = defineQuery<NodeStatuses>('getNodeStatuses');
export const getNodeOutput = defineQuery<Record<string, any>, [NodeId]>('getNodeOutput');
export const getTranscripts = defineQuery<Array<[NodeId, Transcript]>, [number]>('getTranscripts');
export const getFiles = defineQuery<Record<string, FileRef>>('getFiles');

export async function runGraphWorkflow({
  graph, prompt, fromNode, initial, modelKind, imageModelKind
}: {
  graph: Graph, prompt?: any, fromNode?: NodeId, initial?: RunState,
  modelKind?: string, imageModelKind?: string,
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
  setHandler(getFiles, () => state.files);
  
  const nodeById = Object.fromEntries(graph.nodes.map(n => [n.id, n]));

  const { runId } = workflowInfo();
  let state: RunState;
  try {
    state = initRunState(runId, graph, prompt, fromNode, initial);
  } catch (e: any) {
    state = {
      runId,
      outputs: {},
      status: {},
      pendingIn: {},
      ready: [],
      transcripts: [],
      files: {},
      error: e.message,
    }
    return state;
  }

  type RunNodeInput = {
    node: Node;
    inputs: Record<string, any>;
    outgoing: Array<Edge>;
    state: RunState;
  };
    
  async function runNodeWorkflow(input: RunNodeInput): Promise<any> {
    const MAX_STEPS = 10;
    let transcript: Transcript = [];
    let stepResult: NodeStepResult | undefined;
    let resultObject: any;
    for (let i = 0; i < MAX_STEPS && !resultObject; i++) {
      stepResult = await (i === 0 ? takeNodeFirstStep : takeNodeFollowupStep)({
        transcript, i, runId, modelKind, imageModelKind,
        prompt: input.state.prompt, 
        node: input.node, 
        inputs: input.inputs,
        outgoing: input.outgoing,
        files: input.state.files,
      });

      // Append the generated messages to the transcript
      transcript.splice(transcript.length, 0, ...stepResult.messages);
      state.transcripts.push([input.node.id, stepResult.messages]);

      // Append any files created during the step to the state
      for (let fileRef of stepResult.files) { state.files[fileRef.id] = fileRef }

      // If the step is done, extract the result. This is unlikely to happen, because we're forcing the LLM to resolve via tools.
      if (stepResult.finishReason === 'stop') {
        const content = transcript[transcript.length - 1]?.content;
        resultObject = content.length === 1 ? content[0] : content;
        break;
      }
      // If the step is resolved via tool calls (ATM it's the only expect way to resolve), extract the results
      else if (stepResult.finishReason === 'tool-calls') {
        // Some tools (like createFile) are auto-called in the node step and therefore will have been called already.
        // So we need to discover them to determine which tool calls are still actionable here.
        const autoResults: ToolResultPart[] = messagesToolResults(stepResult.messages)

        const toolCalls: ToolCallPart[] = messagesToolCalls(stepResult.messages)
          .filter((c: ToolCallPart) => !autoResults.some(r => r.toolCallId === c.toolCallId)) // exclude auto results
        
        // If there are tool calls that were not auto-resolved, call them
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
            } else if (toolCall.toolName === 'resolveOutput') {
              if (input.node.output_schema) {
                try {
                  const validator = zodFromSchema(input.node.output_schema);
                  validator.parse((toolCall.input as any).data);
                } catch (error) {
                  console.log('Validation errors: ' + error);
                  throw error;
                }
              }

              // If the node is a router, and the tool call is for a route, mark the skipped routes as 'skipped'
              const routes = (toolCall.input as any).routes || [(toolCall.input as any).route].filter(Boolean)
              if (routes.length) {
                for (const outgoing of input.outgoing) {
                  if (!routes.includes(outgoing.to)) {
                    state.status[outgoing.to] = 'skipped';
                  }
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
              const result = await makeToolCall({
                toolCall, modelKind, imageModelKind,
                runId: state.runId,
                node: input.node,
                inputs: input.inputs,
              });
              toolResult = result.toolResult;
              for (const file of result.files) { state.files[file.id] = file; }
            }
            return toolResult;
          })
        )

        if (toolCallResults.length > 0) {
          const toolMessage: ModelMessage = { role: 'tool', content: toolCallResults }
          transcript.push(toolMessage);
          state.transcripts.push([input.node.id, [toolMessage] as Transcript]);
        }
      } else {
        throw new Error(`Unexpected finish reason: ${stepResult.finishReason}`);
      }
    }

    return resultObject;
  }

  const SKIPPED = Symbol('skipped');
  async function skipNode(input: RunNodeInput): Promise<any> {
    return SKIPPED;
  }

  function runNextWave(resolve: (value: unknown) => void, reject: (reason?: any) => void) {
    while (state.ready.length) {
      const id: NodeId = state.ready.shift()!;
      const node: Node = nodeById[id]!;
  
      const inputs: Record<NodeId, any> = Object.fromEntries(
        graph.edges.filter(e => e.to === id).map(e => [e.from, state.outputs[e.from]]) as [NodeId, any][]
      );
      const outgoing: Array<Edge> = graph.edges.filter(e => e.from === id);

      const skip: boolean = state.status[id] === 'skipped'
        || (Object.keys(inputs).length > 0 && Object.keys(inputs).every(k => state.status[k] === 'skipped'));
      if (!skip) { state.status[id] = 'running'; }

      (skip ? skipNode : runNodeWorkflow)({ node, inputs, outgoing, state })
        .then((output) => {
          if (!output) {
            return reject(new Error('No output from node'));
          } else if (output === SKIPPED) {
            state.status[id] = 'skipped';
          } else {
            state.status[id] = 'done';
            state.outputs[id] = output;            
          }

          const deps: NodeId[] = graph.edges.filter(e => e.from === id).map(e => e.to);
          for (const dId of deps) {
            state.pendingIn[dId] -= 1;
            if (state.pendingIn[dId] === 0) {
              state.ready.push(dId);
            }
          }
          state.ready.sort(); // stable order after each wave
          runNextWave(resolve, reject);
          if (Object.values(state.status).every(s => s === 'done' || s === 'skipped')) {
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
