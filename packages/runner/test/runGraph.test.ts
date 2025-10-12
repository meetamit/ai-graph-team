import { describe, it, expect } from '@jest/globals';
import { makeHarness, TestHarness, NeededInput,ProvidedInput } from './helpers/testEnv';
import { createActivities, NodeStepInput, NodeStepResult, ToolCallInput } from '../src/activities/createActivities';
import { ToolCallPart, ToolResultPart } from 'ai';
import { MockLanguageModelV3, } from 'ai/test';
import sinon from 'sinon';

describe('Graph workflow', () => {
  const taskQueue = 'test-graph-queue';
  let h: TestHarness;
  afterEach(async () => {
    if (!h) return;
    await h.shutdown();
  });


  it('should run a simple graph workflow', async () => {
    h = await makeHarness({
      taskQueue,
      workflowsPath: require.resolve('../src/workflows'),
      activities: createActivities(({
        async nodeStepImpl(input: NodeStepInput): Promise<NodeStepResult> {
          const text = `Output from test node '${input.node.id}'`;
          return {
            messages: [{ role: 'assistant', content: [{ type: 'text', text }] }],
            finishReason: 'stop',
          }
        }
      })),
    });

    const result = await h.runner.runWorkflow(require('./fixtures/graphs/debatePanel.json'));
    
    expect(result.outputs).toStrictEqual({
      user_input:       { type: "text", text: "Output from test node 'user_input'" },
      position_for:     { type: "text", text: "Output from test node 'position_for'" },
      position_against: { type: "text", text: "Output from test node 'position_against'" },
      judge_synthesis:  { type: "text", text: "Output from test node 'judge_synthesis'" },
      red_team:         { type: "text", text: "Output from test node 'red_team'" },
      finalize:         { type: "text", text: "Output from test node 'finalize'" }
    });
  }, 10000);


  it('collects user input and resolves node output via tool calls', async () => {
    let uniqueId = 0;
    let step = -1;

    // Create a sinon spy for collectInput that returns the expected inputs
    const collectInput = sinon.spy(async (neededInput: NeededInput[]): Promise<ProvidedInput[]> => {
      return neededInput.map(needed => ({
        for: needed,
        value: `mock value for ${needed.nodeId}`,
        nodeId: needed.nodeId,
      }));
    });
    
    h = await makeHarness({
      taskQueue, collectInput,
      workflowsPath: require.resolve('../src/workflows'),
      activities: createActivities(({
        model: new MockLanguageModelV3({
          doGenerate: async (args): Promise<any> => {
            const { prompt, tools } = args;
            expect(prompt).toEqual(expect.arrayContaining([
              {
                role: 'system',
                content: expect.stringContaining('You are a node in a DAG-based workflow.'),
              },
              {
                role: 'user',
                content: [
                  { type: 'text', text: '## Node JSON' },
                  expect.objectContaining({ type: 'text' }),
                  { type: 'text', text: '## Upstream Inputs JSON' },
                  expect.objectContaining({ type: 'text' }),
                  { type: 'text', text: expect.stringContaining('## User Prompt') },
                  { type: 'text', text: 'Test prompt' },
                ],
              },
            ]));

            switch (++step) {
              case 0: {
                return {
                  usage: {},
                  finishReason: 'tool-calls',
                  content: [
                    { type: 'tool-call', toolCallId: `call_by_user_input_${uniqueId++}`, toolName: 'collectUserInput', input: JSON.stringify({ name: 'user_input_1', prompt: 'Question 1', default: 'Default 1' }) },
                    { type: 'tool-call', toolCallId: `call_by_user_input_${uniqueId++}`, toolName: 'collectUserInput', input: JSON.stringify({ name: 'user_input_2', prompt: 'Question 2', default: 'Default 2' }) },
                  ],
                };
              }
              case 1: {
                expect(prompt).toMatchObject([
                  { role: 'system' },
                  { role: 'user' },
                  {
                    role: 'assistant',
                    content: [
                      { type: 'tool-call' },
                      { type: 'tool-call' },
                    ],
                  },
                  {
                    role: 'tool',
                    content: [
                      { type: 'tool-result', toolName: 'collectUserInput', output: { type: 'json', value: { for: { name: 'user_input_1', prompt: 'Question 1', default: 'Default 1' }, value: 'mock value for user_input', nodeId: 'user_input' } } },
                      { type: 'tool-result', toolName: 'collectUserInput', output: { type: 'json', value: { for: { name: 'user_input_2', prompt: 'Question 2', default: 'Default 2' }, value: 'mock value for user_input', nodeId: 'user_input' } } },
                    ],
                  },
                ]);
                return {
                  usage: {},
                  finishReason: 'tool-calls',
                  content: [
                    {
                      type: 'tool-call', 
                      toolCallId: `call_by_user_input_${uniqueId++}`, 
                      toolName: 'resolveNodeOutput', 
                      input: JSON.stringify({
                        message: 'Collected and structured user inputs',
                        data: { x: 1, y: 2, z: 3 }
                      }) 
                    },
                  ],
                };       
              }
              case 2:
              case 3: {
                return (prompt[1].content[1] as any).text.includes('position_against') ? {
                  usage: {},
                  finishReason: 'tool-calls',
                  content: [
                    {
                      type: 'tool-call', 
                      toolCallId: `call_by_position_against_${uniqueId++}`, 
                      toolName: 'resolveNodeOutput', 
                      input: JSON.stringify({
                        message: 'Constructed the case against the proposal',
                        data: { x: 10, y: 20, z: 30 }
                      }) 
                    },
                  ],
                } : {
                  // test that it handles the case where the node output is set by setting `resultObject` —— not tool call
                  usage: {},
                  finishReason: 'stop',
                  content: [
                    {
                      type: 'text',
                      text: `Constructed the case for the proposal`
                    }
                  ],
                };    
              }
              case 4:
              case 5:
              case 6: {
                const nodeId: string = ['judge_synthesis', 'red_team', 'finalize'][step - 4];
                return {
                  usage: {},
                  finishReason: 'tool-calls',
                  content: [
                    {
                      type: 'tool-call', 
                      toolCallId: `call_by_${nodeId}_${uniqueId++}`, 
                      toolName: 'resolveNodeOutput', 
                      input: JSON.stringify({
                        message: `Fulfilled the node '${nodeId}'`,
                        data: { x: 100, y: 200, z: 300 }
                      }) 
                    },
                  ],
                };       
              } 
              default: {
                throw new Error(`Test does not implement doGenerate() for step "${step}\n\nPROMPT:\n\n${JSON.stringify(prompt, null, 2)}`);
              }
            }
          },
        }),
      })),
    });

    const result = await h.runner.runWorkflow(require('./fixtures/graphs/debatePanel.json'), 'Test prompt');

    expect(result.outputs).toStrictEqual({
      user_input:       { message: "Collected and structured user inputs", data: { x: 1, y: 2, z: 3 } },
      position_against: { message: "Constructed the case against the proposal", data: { x: 10, y: 20, z: 30 } },
      position_for:     { type: 'text', text: "Constructed the case for the proposal" },// it handled by setting `resultObject` —— not tool call
      judge_synthesis:  { message: "Fulfilled the node 'judge_synthesis'", data: { x: 100, y: 200, z: 300 } },
      red_team:         { message: "Fulfilled the node 'red_team'", data: { x: 100, y: 200, z: 300 } },
      finalize:         { message: "Fulfilled the node 'finalize'", data: { x: 100, y: 200, z: 300 } }
    });

    expect(collectInput.calledOnce).toBe(true);
    const callArgs = collectInput.getCall(0).args[0];
    expect(callArgs).toMatchObject([
      { prompt: 'Question 1' },
      { prompt: 'Question 2' },
    ]);
  }, 20000);
});
