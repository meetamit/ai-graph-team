import { fileURLToPath } from 'url';
import { describe, it, expect } from '@jest/globals';
import sinon from 'sinon';
import { MockLanguageModelV3 } from 'ai/test';
import { makeHarness, TestHarness, Graph, Node, Edge } from './helpers/testEnv';
import { createActivities, type ModelWithArgs } from '../src/activities';
import withUserInput from '../src/models/withUserInput';
const workflowsPath = fileURLToPath(new URL('../src/workflows.ts', import.meta.url));

const routerNode = {
  id: 'router',
  type: 'llm',
  name: 'router',
  output_schema: {
    type: 'object',
    properties: { greeting: { type: 'string' } },
    required: ['greeting'],
  },
} as Node;

const nonRouterNodes = [
  { id: 'even', type: 'llm' },
  { id: 'odd', type: 'llm' },
  { id: 'other', type: 'llm' },

  // "after" nodes, to test whether skipping propagaes properly
  { id: 'aft_even', type: 'llm' },
  { id: 'aft_odd', type: 'llm' },
  { id: 'aft_other', type: 'llm' },

  // "agg" nodes to test multi-input potentially-skipped dependencies
  { id: 'agg_all', type: 'llm' },
  { id: 'agg_some', type: 'llm' },
] as Node[];

const edges = [
  { from: 'router', to: 'even' },
  { from: 'router', to: 'odd' },
  { from: 'router', to: 'other' },

  // "after" nodes, to test whether skipping propagaes properly
  { from: 'even', to: 'aft_even' },
  { from: 'odd', to: 'aft_odd' },
  { from: 'other', to: 'aft_other' },

  // "agg" nodes to test multi-input potentially-skipped dependencies
  { from: 'aft_even', to: 'agg_all' },
  { from: 'aft_odd', to: 'agg_all' },
  { from: 'aft_other', to: 'agg_all' },
  { from: 'aft_odd', to: 'agg_some' },
  { from: 'aft_other', to: 'agg_some' },
] as Edge[];

const routerToolCall = (route: string | string[]) => {
  return {
    usage: {},
    finishReason: 'tool-calls',
    content: [{
      type: 'tool-call',
      toolCallId: 'call_by_router_1',
      toolName: 'resolveOutput',
      input: JSON.stringify({
        message: 'Router output',
        [typeof route === 'string' ? 'route' : 'routes']: route,
        data: { greeting: `Hello ${typeof route === 'string' ? route : route.join(' and ')}` },
      }),
    }],
  };
};

const expectedRouteResolveArgs = {
  data: {
    type: "object",
    properties: { greeting: { type: "string", } },
    required: ["greeting"],
    additionalProperties: false,
  },
  message: {
    description: "Human readable message sumarizing the work done by the node",
    type: "string",
  },
};
const expectedDoneNode = {
  message: expect.stringContaining('Fulfilled the node'),
  data: { test: true },
}

describe('Graph node resolution', () => {
  const taskQueue = 'test-graph-queue';
  const idBase = 'test-run-resolution-';

  let h: TestHarness;
  afterEach(async () => {
    if (!h) return;
    await h.shutdown();
  });

  it('routes node output to one of multiple downstream nodes', async () => {
    const trackCall = sinon.spy(args => args);
    h = await makeHarness({
      taskQueue, workflowsPath, idBase,
      activities: createActivities({
        model: (kind, input) => {
          const impl: MockLanguageModelV3 = withUserInput({ input, delay: 0 }) as MockLanguageModelV3;
          return new MockLanguageModelV3({ 
            doGenerate: async (args): Promise<any> => {
              if (input?.node?.id === 'router') {
                trackCall(args.tools);
                return routerToolCall(input?.prompt % 2 === 0 ? 'even' : 'odd');
              }
              return impl.doGenerate(args);
            }
          });
        },
      }),
    });

    const graph: Graph = {
      nodes: [
        { ...routerNode, routing: { allowMultiple: false } },
        ...nonRouterNodes,
      ],
      edges
    } as Graph;

    const resultEven = await h.runner.runWorkflow({ graph, prompt: 42 });
    expect(resultEven.status).toEqual({
      router: 'done', even: 'done', odd: 'skipped', other: 'skipped', 
      aft_even: 'done', aft_odd: 'skipped', aft_other: 'skipped',
      agg_all: 'done', agg_some: 'skipped'
    });
    expect(resultEven.outputs).toStrictEqual({
      router: {
        message: 'Router output',
        data: { greeting: 'Hello even' },
        route: 'even',
      },
      even: expectedDoneNode,
      aft_even: expectedDoneNode,
      agg_all: expectedDoneNode,
    });
    expect(trackCall.args[0][0][0].inputSchema.properties).toEqual({
      ...expectedRouteResolveArgs,
      route: { type: 'string', enum: ['even', 'odd', 'other'] },
    });

    const resultOdd = await h.runner.runWorkflow({ graph, prompt: 7 });
    expect(resultOdd.status).toEqual({
      router: 'done', even: 'skipped', odd: 'done', other: 'skipped',
      aft_even: 'skipped', aft_odd: 'done', aft_other: 'skipped',
      agg_all: 'done', agg_some: 'done'
    });
    expect(resultOdd.outputs).toStrictEqual({
      router: {
        message: 'Router output',
        data: { greeting: 'Hello odd' },
        route: 'odd',
      },
      odd: expectedDoneNode,
      aft_odd: expectedDoneNode,
      agg_all: expectedDoneNode,
      agg_some: expectedDoneNode,
    });
    expect(trackCall.args[1][0][0].inputSchema.properties).toEqual({
      ...expectedRouteResolveArgs,
      route: { type: 'string', enum: ['even', 'odd', 'other'] },
    });
  });


  it('routes node output to some of multiple downstream nodes', async () => {
    const trackCall = sinon.spy(args => args);
    h = await makeHarness({
      taskQueue, workflowsPath, idBase,
      activities: createActivities({
        model: (kind, input) => {
          const impl: MockLanguageModelV3 = withUserInput({ input, delay: 0 }) as MockLanguageModelV3;
          return new MockLanguageModelV3({ 
            doGenerate: async (args): Promise<any> => {
              if (input?.node?.id === 'router') {
                trackCall(args.tools);
                return routerToolCall(['even', 'odd']);
              }
              return impl.doGenerate(args);
            }
          });
        },
      }),
    });

    const graph: Graph = {
      nodes: [
        { ...routerNode, routing: { allowMultiple: true } },
        ...nonRouterNodes,
      ],
      edges
    } as Graph;

    const resultEven = await h.runner.runWorkflow({ graph });
    expect(resultEven.status).toEqual({
      router: 'done', even: 'done', odd: 'done', other: 'skipped', 
      aft_even: 'done', aft_odd: 'done', aft_other: 'skipped',
      agg_all: 'done', agg_some: 'done'
    });
    expect(resultEven.outputs).toStrictEqual({
      router: {
        message: 'Router output',
        data: { greeting: 'Hello even and odd' },
        routes: ['even', 'odd'],
      },
      even: expectedDoneNode,
      odd: expectedDoneNode,
      aft_even: expectedDoneNode,
      aft_odd: expectedDoneNode,
      agg_all: expectedDoneNode,
      agg_some: expectedDoneNode,
    });
    expect(trackCall.args[0][0][0].inputSchema.properties).toEqual({
      ...expectedRouteResolveArgs,
      routes: { type: 'array', items: { type: 'string', enum: ['even', 'odd', 'other'] } },
    });
  });
});
