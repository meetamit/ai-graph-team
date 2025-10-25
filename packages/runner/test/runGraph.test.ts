import { describe, it, expect } from '@jest/globals';
import { makeHarness, TestHarness, NeededInput,ProvidedInput } from './helpers/testEnv';
import { MockLanguageModelV3, } from 'ai/test';
import sinon from 'sinon';
import { createActivities, NodeStepInput, NodeStepResult, ToolCallInput } from '../src/activities/createActivities';
import withUserInput from '../src/models/withUserInput';

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
        value: `mock value for ${needed.name}`,
        nodeId: needed.nodeId,
      }));
    });
    
    h = await makeHarness({
      taskQueue, collectInput,
      workflowsPath: require.resolve('../src/workflows'),
      activities: createActivities(({ model: withUserInput({ delay: () => 0 }) })),
    });

    const result = await h.runner.runWorkflow(require('./fixtures/graphs/debatePanel.json'), 'Test prompt');

    expect(result.outputs).toStrictEqual({
      user_input: {
        data: {
          alternatives: "mock value for alternatives",
          criteria: "mock value for criteria",
          constraints: "mock value for constraints",
          decision_context: "mock value for decision_context",
          proposal: "mock value for proposal",
          risk_appetite: "mock value for risk_appetite",
          stakeholders: "mock value for stakeholders",
          style_guidelines: "mock value for style_guidelines",
          word_limits: "mock value for word_limits",
        },
        message: "Collected and structured user inputs"
      },
      position_against: {
        message: "Fulfilled the node 'position_against'",
        data: {
          argsAgainst: expect.arrayContaining([
            expect.objectContaining({ 
              assumptions: expect.arrayContaining([]),
              claim: expect.stringContaining(''),
              criteria_impacts: expect.arrayContaining([
                expect.objectContaining({
                  criterion: expect.stringContaining(''),
                  direction: expect.stringContaining(''),
                  magnitude: expect.stringContaining(''),
                  reason: expect.stringContaining(''),
                }),
              ]),
              rationale: expect.stringContaining(''),
              risks: expect.arrayContaining([]),
            }),
          ]),
          top_line: expect.stringContaining(''),
        },
      },
      position_for: {
        message: "Fulfilled the node 'position_for'",
        data: {
          argsFor: expect.arrayContaining([
            expect.objectContaining({ 
              assumptions: expect.arrayContaining([]),
              claim: expect.stringContaining(''),
            }),
          ]),
          top_line: expect.stringContaining(''),
        },
      },
      judge_synthesis: {
        message: "Fulfilled the node 'judge_synthesis'",
        data: {
          scorecard: expect.arrayContaining([]),
          tentativeRec: expect.arrayContaining([]),
          tradeoffs: expect.arrayContaining([]),
          uncertainties: expect.arrayContaining([]),
        },
      },
      red_team: {
        message: "Fulfilled the node 'red_team'",
        data: {
          hard_questions: expect.arrayContaining([]),
          missing_info: expect.arrayContaining([]),
          vulnerabilities: expect.arrayContaining([]),
        },
      },
      finalize: expect.objectContaining({
        message: "Fulfilled the node 'finalize'",
        data: {
          decision_memo: expect.stringContaining(''),
          executive_summary: expect.stringContaining(''),
          finalRec: expect.arrayContaining([]),
        },
      }),
    });

    expect(collectInput.calledOnce).toBe(true);
    const callArgs = collectInput.getCall(0).args[0];
    expect(callArgs).toMatchObject([
      { prompt: 'Enter proposal' },
      { prompt: 'Enter alternatives' },
      { prompt: 'Enter decision_context' },
      { prompt: 'Enter criteria' },
      { prompt: 'Enter constraints' },
      { prompt: 'Enter risk_appetite' },
      { prompt: 'Enter stakeholders' },
      { prompt: 'Enter style_guidelines' },
      { prompt: 'Enter word_limits' },
    ]);
  }, 20000);
});
