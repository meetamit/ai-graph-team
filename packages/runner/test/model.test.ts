import { fileURLToPath } from 'url';
import { describe, it, expect } from '@jest/globals';
import { LanguageModel } from 'ai';
import { MockLanguageModelV3 } from 'ai/test';
import { makeHarness, TestHarness, Graph } from './helpers/testEnv';
import { createActivities, type ModelWithArgs } from '../src/activities';
import withUserInput from '../src/models/withUserInput';
import { default as llm, defaultArgs, defaultModelId } from '../src/models/llm';
import testImageGenModel from '../src/models/testImageGenModel';

const workflowsPath = fileURLToPath(new URL('../src/workflows.ts', import.meta.url));

describe('Graph models', () => {
  const taskQueue = 'test-graph-queue';
  const idBase = 'test-run-models-';

  let h: TestHarness;
  afterEach(async () => {
    if (!h) return;
    await h.shutdown();
  });

  it('runs a workflow with model config on each node', async () => {
    const models: Record<string, LanguageModel | ModelWithArgs> = {};
    h = await makeHarness({
      taskQueue, workflowsPath, idBase,
      activities: createActivities({
        imageModel: testImageGenModel(),
        model: (kind, input) => {
          const mock: MockLanguageModelV3 = withUserInput({ input, delay: 0 }) as MockLanguageModelV3;
          const real = llm({ input });
          if (input?.node?.id) { models[input.node.id] = real; }
          return new MockLanguageModelV3({ 
            doGenerate: async (args) => {
              return mock.doGenerate(args);
            }
          });
        },
      }),
    });

    const result = await h.runner.runWorkflow({ graph: {
      nodes: [
        {
          id: 'node1',
          type: 'llm',
          // no model
        },
        {
          id: 'node2',
          type: 'llm',
          model: 'gpt-5-mini',// string model
        },
        {
          id: 'node3',
          type: 'llm',
          model: { name: 'gpt-5-mini' },
        },
        {
          id: 'node3',
          type: 'llm',
          model: { name: 'claude-3-opus-20240229' },
        },
        {
          id: 'node4',
          type: 'llm',
          model: { name: 'gpt-5-mini', args: { temperature: 0.5 } },
        },
        {
          id: 'node5',
          type: 'llm',
          model: { args: { temperature: 0.5, someArg: 'someValue' } },
        },
      ],
      edges: [
        { from: 'node1', to: 'node2' },
        { from: 'node2', to: 'node3' },
      ],
    } as Graph });

    expect(result.status).toEqual({ node1: 'done', node2: 'done', node3: 'done', node4: 'done', node5: 'done' });

    expect(models).toMatchObject({
      'node1': { 
        model: expect.objectContaining({
          modelId: defaultModelId,
          config: expect.objectContaining({
            provider: expect.stringContaining('openai')
          }),
        }),
        args: defaultArgs,
      },
      'node2': { 
        model: expect.objectContaining({ modelId: 'gpt-5-mini' }),
        args: defaultArgs,
      },
      'node3': { 
        model: expect.objectContaining({
          modelId: 'claude-3-opus-20240229',
          config: expect.objectContaining({
            provider: expect.stringContaining('anthropic')
          }),
        }),
        args: defaultArgs,
      },
      'node4': { 
        model: expect.objectContaining({ modelId: 'gpt-5-mini' }),
        args: { ...defaultArgs, temperature: 0.5 },
      },
      'node5': { 
        model: expect.objectContaining({ modelId: defaultModelId }),
        args: { ...defaultArgs, temperature: 0.5, someArg: 'someValue' },
      },
    });

    console.log(models.node4.model)
  });
});

