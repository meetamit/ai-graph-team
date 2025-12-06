import { fileURLToPath } from 'url';
import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import sinon from 'sinon';
import { makeHarness, TestHarness, Graph } from './helpers/testEnv';
import { createActivities } from '../src/activities';
import withToolCalling from '../src/models/withToolCalling';
import testImageGenModel from '../src/models/testImageGenModel';
import toolsGraph from './fixtures/graphs/toolsGraph.json';

const workflowsPath = fileURLToPath(new URL('../src/workflows.ts', import.meta.url));

function expectToolNames(tools: Record<string, any>[], expected: string[]) {
  expect(tools).toHaveLength(expected.length);
  const toolNames = tools.map((tool: any) => tool.name);
  expected.forEach((toolName) => {
    expect(toolNames).toContain(toolName);
  });
}

function expectToolSchema(tools: Record<string, any>[], toolName: string, expected: any) {
  const tool = tools.find((t: any) => t.name === toolName);
  expect(tool).toBeDefined();
  expect(tool).toEqual(expected);
}

function getToolsForNode(trackCall: sinon.SinonSpy, nodeId: string): Record<string, any>[] {
  const call = trackCall.args.find(([id]) => id === nodeId);
  return call ? call[1] : [];
}

const anyString = expect.stringContaining('');

function fileOutput(nodeId: string, overrides = {}) {
  return {
    id: anyString,
    runId: anyString,
    nodeId,
    kind: 'generated',
    uri: anyString,
    filename: anyString,
    mediaType: anyString,
    bytes: expect.any(Number),
    sha256: anyString,
    createdAt: anyString,
    ...overrides,
  };
}


describe('Graph tools', () => {
  const taskQueue = 'test-run-tools-queue';
  const idBase = 'test-run-tools-';

  let h: TestHarness;
  let trackCall: sinon.SinonSpy;
  let result: Awaited<ReturnType<typeof h.runner.runWorkflow>>;

  beforeAll(async () => {
    trackCall = sinon.spy((_input, _args) => {});
    h = await makeHarness({
      taskQueue,
      workflowsPath,
      idBase,
      activities: createActivities({
        imageModel: testImageGenModel(),
        model: (_name, input) => {
          function onGenerate({ args, input }: { args: any; input: any }) {
            trackCall(input?.node.id, args.tools);
          }
          return withToolCalling({ input, onGenerate, delay: 0 });
        },
      }),
    });

    // Run once, assert many times
    result = await h.runner.runWorkflow({ graph: toolsGraph as Graph });

    // Sanity check that the tools were called the expected number of times
    expect(trackCall.callCount).toBe(12)
  });

  afterAll(async () => {
    if (h) await h.shutdown();
  });

  it('user_input: provides collectUserInput and resolveOutput', () => {
    const tools = getToolsForNode(trackCall, 'user_input');
    expectToolNames(tools, ['collectUserInput', 'resolveOutput']);

    expect(result.outputs.user_input).toMatchObject({
      message: 'Collected and structured user inputs',
      data: { 'string 1': 'string 3' },
    });
  });

  it('image_generator: provides generateImage with default schema', () => {
    const tools = getToolsForNode(trackCall, 'image_generator');

    expectToolNames(tools, ['generateImage', 'resolveOutput']);
    expectToolSchema(tools, 'generateImage', expect.objectContaining({
      description: 'Generate an image using AI based on a text prompt',
      inputSchema: expect.objectContaining({
        type: 'object',
        properties: {
          prompt: { type: 'string', description: 'A detailed description of the image to generate' },
          filename: { type: 'string', description: 'The user-facing name of the image file', default: 'generated-image.png' },
          size: { type: 'string', description: 'The size of the generated image', default: '512x512', enum: ['256x256', '512x512', '1024x1024'] },
          steps: { type: 'integer', description: 'The number of steps to generate the image', default: 20, minimum: 5, maximum: 200 },
        },
        required: ['prompt', 'filename', 'size', 'steps'],
      }),
    }));

    expect(result.outputs.image_generator).toMatchObject({
      message: "Fulfilled the node 'image_generator'",
      data: fileOutput('image_generator', { mediaType: 'image/png', bytes: 16774, metadata: expect.objectContaining({}) }),
    });
  });

  it('weird_generator: applies custom tool config overrides', () => {
    const tools = getToolsForNode(trackCall, 'weird_generator');

    expectToolNames(tools, ['weirdo', 'resolveOutput']);
    expectToolSchema(tools, 'weirdo', expect.objectContaining({
      name: 'weirdo',
      description: 'Weird description',
      inputSchema: expect.objectContaining({
        type: 'object',
        properties: {
          prompt: { type: 'string', description: 'A detailed description of the image to generate', default: 'Make it weird' },
          style: { type: 'string', enum: ['vivid', 'natural'], description: expect.any(String), default: 'natural' },
        },
        required: ['prompt', 'style'],
      }),
    }));

    expect(result.outputs.weird_generator).toMatchObject({
      message: "Fulfilled the node 'weird_generator'",
      data: fileOutput('weird_generator', { filename: 'weird.bmp', mediaType: 'image/png', bytes: 16774, metadata: expect.objectContaining({}) }),
    });
  });

  it('file_creator: provides writeFile tool', () => {
    const tools = getToolsForNode(trackCall, 'file_creator');

    expectToolNames(tools, ['writeFile', 'resolveOutput']);
    expectToolSchema(tools, 'writeFile', expect.objectContaining({
      description: 'Create a file',
      inputSchema: expect.objectContaining({
        properties: {
          filename: { type: 'string', description: 'The user-facing name of the file' },
          mediaType: { type: 'string', description: 'The media type of the file', default: 'text/plain' },
          content: { type: 'string', description: 'The content of the file' },
        },
        required: ['filename', 'content'],
      }),
    }));

    expect(result.outputs.file_creator).toMatchObject({
      message: "Fulfilled the node 'file_creator'",
      data: fileOutput('file_creator', { bytes: 8 }),
    });
  });

  it('multi_tool_same_type: provides multiple tools with the same type', () => {
    const tools = getToolsForNode(trackCall, 'multi_tool_same_type');
    expectToolNames(tools, ['generateImage', 'hiRez', 'generateImage_sd2f_512x512_isd2fp', 'resolveOutput']);
  });
  
  it('summary: provides multiple tools with merged settings', () => {
    const tools = getToolsForNode(trackCall, 'summary');

    expectToolNames(tools, ['readFile', 'writeFile', 'collectUserInput', 'resolveOutput']);
    // writeFile should have filename pre-filled, so not required
    expectToolSchema(tools, 'writeFile', expect.objectContaining({
      inputSchema: expect.objectContaining({
        required: ['content'], // filename is pre-filled
      }),
    }));

    expect(result.outputs.summary).toMatchObject({
      message: "Fulfilled the node 'summary'",
      data: expect.arrayContaining([
        anyString,
        fileOutput('summary', { filename: 'summary.txt', bytes: 8 }),
      ]),
    });
  });
});
