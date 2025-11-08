import { fileURLToPath } from 'url';
import { describe, it, expect } from '@jest/globals';
import { MockLanguageModelV3, } from 'ai/test';
import { TextPart } from 'ai';
import sinon from 'sinon';
import { makeHarness, TestHarness, NeededInput, ProvidedInput, Graph } from './helpers/testEnv';
import { createActivities, NodeStepInput, NodeStepResult, ToolCallInput } from '../src/activities/createActivities';
import withUserInput from '../src/models/withUserInput';
import debatePanel from './fixtures/graphs/debatePanel.json' with { type: 'json' };

const workflowsPath = fileURLToPath(new URL('../src/workflows', import.meta.url));

describe('Graph workflow', () => {
  const taskQueue = 'test-graph-queue';
  const idBase = 'test-run-graph-';

  let h: TestHarness;
  afterEach(async () => {
    if (!h) return;
    await h.shutdown();
  });


  it('should run a simple graph workflow', async () => {
    h = await makeHarness({
      taskQueue, workflowsPath, idBase,
      activities: createActivities(({
        async nodeStepImpl(input: NodeStepInput): Promise<NodeStepResult> {
          const text = `Output from test node '${input.node.id}'`;
          return {
            messages: [{ role: 'assistant', content: [{ type: 'text', text }] }],
            finishReason: 'stop',
            files: [],
          }
        }
      })),
    });

    const result = await h.runner.runWorkflow({ graph: debatePanel as Graph });
    
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
    // Create a sinon spy for collectInput that returns the expected inputs
    const collectInput = sinon.spy(async (neededInput: NeededInput[]): Promise<ProvidedInput[]> => {
      return neededInput.map(needed => ({
        for: needed,
        value: `mock value for ${needed.name}`,
        nodeId: needed.nodeId,
      }));
    });
    
    h = await makeHarness({
      taskQueue, workflowsPath, idBase, collectInput,
      activities: createActivities(({ model: withUserInput({ delay: () => 0 }) })),
    });

    const result = await h.runner.runWorkflow({ graph: debatePanel as Graph });

    expect(result.transcripts).toHaveLength(14);

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

  it('should fail gracefully and run from a node', async () => {
    let simulateFailure: boolean;
    let failBeforeSiblingIsDone: boolean;
    let epoch: number = 0;
    const impl: MockLanguageModelV3 = withUserInput({ delay: () => failBeforeSiblingIsDone ? 100 : 0 /* 300 makes position_against fail before position_for finishes */ }) as MockLanguageModelV3;
    h = await makeHarness({
      taskQueue, workflowsPath, idBase,
      activities: createActivities(({
        model: new MockLanguageModelV3({ 
          doGenerate: async (args) => {
            if (simulateFailure && (args.prompt[1].content[1] as TextPart).text.includes('position_against')) {
              await new Promise(resolve => setTimeout(resolve, 50));// Wait a bit so that "position_for" can finish
              throw new Error('Simulated failure')
            }

            const result = await impl.doGenerate(args); // Generate the default result

            // Augment the node's message with the epoch number to make its uniqueness trackable
            const content0 = result.content[0];
            if (content0.type === 'tool-call' && content0.toolName === 'resolveOutput') {
              content0.input = content0.input.replace(/"message"\:"([^"]*)",/g, `"message":"${epoch}) $1",`);
            }
            return result;
          }
        })
      })),
    });

    const data = expect.objectContaining({});// reusable generic data object
    const graph = debatePanel as Graph;
    
    
    simulateFailure = true; // Make it fail
    failBeforeSiblingIsDone = false; // Make it wait for "position_for" to finish before failing
    epoch++;
    const partialResult = await h.runner.runWorkflow({ graph });
    expect(partialResult.outputs).toStrictEqual({
      user_input:       { message: "1) Collected and structured user inputs", data },
      position_for:     { message: "1) Fulfilled the node 'position_for'", data },
      position_against: { error: "Simulated failure" },
    });
    expect(partialResult.transcripts).toHaveLength(6);
    

    simulateFailure = false; // This time we won't fail!
    epoch++;
    const result = await h.runner.runWorkflow({
      graph,
      fromNode: 'position_against',
      initial: partialResult,
    });
    expect(result.outputs).toStrictEqual({
      // use_input and position_for should not have rerunm hence have the same message as the first run
      user_input:       { message: "1) Collected and structured user inputs", data },
      position_for:     { message: "1) Fulfilled the node 'position_for'", data },
      position_against: { message: "2) Fulfilled the node 'position_against'", data },
      judge_synthesis:  { message: "2) Fulfilled the node 'judge_synthesis'", data },
      red_team:         { message: "2) Fulfilled the node 'red_team'", data },
      finalize:         { message: "2) Fulfilled the node 'finalize'", data },
    });
    expect(result.transcripts).toHaveLength(14);


    // PART 2
    simulateFailure = true; // Make it fail
    failBeforeSiblingIsDone = true; // Make it wait for "position_for" to finish before failing
    epoch++;
    const partialResult2 = await h.runner.runWorkflow({ graph });
    expect(partialResult2.outputs).toStrictEqual({
      // position_for should not have finished, hence be missing
      user_input:       { message: "3) Collected and structured user inputs", data },
      position_against: { error: "Simulated failure" },
    });
    expect(partialResult2.transcripts).toHaveLength(4);
    
    
    simulateFailure = false; // This time we won't fail!
    epoch++;
    const result2 = await h.runner.runWorkflow({ graph, fromNode: 'position_against', initial: partialResult2 });
    expect(result2.outputs).toStrictEqual({
      // For the run to succeed, "position_for" will have to be auto-run when the run starts from "position_against"
      user_input:       { message: "3) Collected and structured user inputs", data },
      position_for:     { message: "4) Fulfilled the node 'position_for'", data },
      position_against: { message: "4) Fulfilled the node 'position_against'", data },
      judge_synthesis:  { message: "4) Fulfilled the node 'judge_synthesis'", data },
      red_team:         { message: "4) Fulfilled the node 'red_team'", data },
      finalize:         { message: "4) Fulfilled the node 'finalize'", data },
    });
    expect(result2.transcripts).toHaveLength(14);

  }, 20000);

});
