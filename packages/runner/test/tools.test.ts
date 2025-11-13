import { fileURLToPath } from 'url';
import { describe, it, expect } from '@jest/globals';
import sinon from 'sinon';
import { ToolCallPart } from 'ai';
import { MockLanguageModelV3, } from 'ai/test';
import { makeHarness, TestHarness, Graph } from './helpers/testEnv';
import { createActivities } from '../src/activities';
import { messagesToolCalls } from '../src/utils';
import { fixtureFromSchema } from '../src/models/utils';
import withUserInput from '../src/models/withUserInput';
import testImageGenModel from '../src/models/testImageGenModel';

const workflowsPath = fileURLToPath(new URL('../src/workflows.ts', import.meta.url));

describe('Graph tools', () => {
  const taskQueue = 'test-graph-queue';
  const idBase = 'test-run-tools-';

  let h: TestHarness;
  afterEach(async () => {
    if (!h) return;
    await h.shutdown();
  });

  it('makes node-specific tools available to the model', async () => {
    const trackCall = sinon.spy((input, args) => {});
    h = await makeHarness({
      taskQueue, workflowsPath, idBase,
      activities: createActivities({
        imageModel: testImageGenModel(),
        model: (name, input) => {
          const impl: MockLanguageModelV3 = withUserInput({ input, delay: 0 }) as MockLanguageModelV3;
          return new MockLanguageModelV3({ 
            doGenerate: async (args) => {
              const { prompt, tools } = args;
              trackCall(input?.node.id, tools);

              const calledTools = messagesToolCalls(prompt);
              const uncalledTools = tools?.filter(
                (tool:any) => tool.name !== 'resolveOutput' && 
                  !calledTools.some((call:any) => call.toolName === tool.name)
              );

              if (uncalledTools && uncalledTools.length > 0) {
                return {
                  usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0, },
                  finishReason: 'tool-calls',
                  content: uncalledTools?.map((tool:any, i:number) => ({
                    type: 'tool-call', 
                    toolCallId: `call_by_${input?.node?.id || 'unknown'}_${i+1}`, 
                    toolName: tool.name, 
                    input: JSON.stringify(fixtureFromSchema(tool.inputSchema))
                  })) || [] as ToolCallPart[],
                  warnings: [],
                };
              }
              return impl.doGenerate(args);
            }
          });
        },
      }),
    });

    const result = await h.runner.runWorkflow({ graph: {
      nodes: [
        {
          id: 'user_input',
          type: 'input',
        },
        {
          id: 'image_generator',
          type: 'llm',
          tools: ['generateImage'],
        },
        {
          id: 'weird_generator',
          type: 'llm',
          tools: [{
            name: 'generateImage', 
            input: {
              filename: 'weird.bmp', 
              size: '32x32', 
              quality: 'hd'
            },
            default: {
              prompt: 'Make it weird',
              style: 'natural',
            }
          }],
        },
        {
          id: 'file_creator',
          type: 'llm',
          tools: ['createFile'],
        },
        {
          id: 'summary',
          type: 'llm',
          tools: [
            'collectUserInput',
            {
              name: 'readFile',
              input: {
                fileId: '{{inputs.file_creator.data.id}}',
              },
            },
            {
              name: 'createFile',
              input: {
                filename: 'summary.txt',
              },
            }
          ],
        }
      ],
      edges: [
        { from: 'user_input', to: 'image_generator' },
        { from: 'user_input', to: 'file_creator' },
        { from: 'user_input', to: 'weird_generator' },
        { from: 'image_generator', to: 'summary' },
        { from: 'file_creator', to: 'summary' },
        { from: 'weird_generator', to: 'summary' },
      ],
    } as Graph });

    expect(trackCall.callCount).toBe(10);

    function expectTool(tools: Record<string, any>[], toolName: string, expected: any) {
      const tool = tools.find((tool:any) => tool.name === toolName);
      expect(tool).toBeDefined();
      expect(tool).toEqual(expected);
    }

    // Helper function to verify that the expected tools were available
    function expectTools(tools: Record<string, any>[], expected: string[]) {
      expect(tools).toHaveLength(expected.length);
      const toolNames = tools.map((tool:any) => tool.name);
      expected.forEach((toolName:string) => {
        expect(toolNames).toContain(toolName);
      });
    }

    // Verify that the expected tools were available depending on the node
    for (const [nodeId, tools] of trackCall.args) {
      if (nodeId === 'user_input') {
        expectTools(tools, ['collectUserInput', 'resolveOutput']);
      } else if (nodeId === 'image_generator') {
        expectTools(tools, ['generateImage', 'resolveOutput']);
        expectTool(tools, 'generateImage', expect.objectContaining({
          inputSchema: expect.objectContaining({
            type: "object",
            properties: {
              prompt: {
                type: "string",
                description: "A detailed description of the image to generate",
              },
              filename: {
                type: "string",
                description: "The user-facing name of the image file",
                default: "generated-image.png",
              },
              size: {
                type: "string",
                description: "The size of the generated image",
                default: "1024x1024",
              },
              style: {
                type: "string",
                enum: ["vivid", "natural"],
                description: "The style of the image: vivid (hyper-real and dramatic) or natural (more natural, less hyper-real)",
                default: "vivid",
              },
              quality: {
                type: "string",
                enum: ["standard", "hd"],
                description: "The quality of the image",
                default: "standard",
              },
            },
            required: ["prompt", "filename", "size", "style", "quality"],
          })
        }));
      }
      else if (nodeId === 'weird_generator') {
        expectTools(tools, ['generateImage', 'resolveOutput']);
        expectTool(tools, 'generateImage', expect.objectContaining({
          inputSchema: expect.objectContaining({
            type: "object",
            properties: {
              prompt: {
                type: "string",
                description: "A detailed description of the image to generate",
                default: "Make it weird",
              },
              style: {
                type: "string",
                enum: ["vivid", "natural"],
                description: "The style of the image: vivid (hyper-real and dramatic) or natural (more natural, less hyper-real)",
                default: "natural",
              }
            },
            required: ["prompt", "style"],
          })
        }));
      }
      else if (nodeId === 'file_creator') {
        expectTools(tools, ['createFile', 'resolveOutput']);
        expectTool(tools, 'createFile', expect.objectContaining({
          inputSchema: expect.objectContaining({
            type: "object",
            properties: {
              filename: {
                type: "string",
                description: "The user-facing name of the file",
              },
              mediaType: {
                type: "string",
                description: "The media type of the file",
                default: "text/plain",
              },
              content: {
                type: "string",
                description: "The content of the file",
              },
            },
            required: ["filename", "content"],
          })
        }));
      } else if (nodeId === 'summary') {
        expectTools(tools, ['readFile', 'createFile', 'collectUserInput', 'resolveOutput']);
        expectTool(tools, 'createFile', expect.objectContaining({
          inputSchema: expect.objectContaining({
            type: "object",
            properties: {
              mediaType: {
                type: "string",
                description: "The media type of the file",
                default: "text/plain",
              },
              content: {
                type: "string",
                description: "The content of the file",
              },
            },
            required: ["content"],
          })
        }));
      } else {
        throw new Error(`Unexpected node id: ${nodeId}`);
      }
    }

    const string = expect.stringContaining('');
    expect(result.outputs).toStrictEqual({
      user_input: {
        message: "Collected and structured user inputs",
        data: { 'string 1': 'string 3' }
      },
      file_creator: {
        message: "Fulfilled the node 'file_creator'",
        data: {
          id: string,
          runId: string,
          nodeId: "file_creator",
          kind: "generated",
          uri: string,
          filename: string,
          mediaType: string,
          bytes: 8,
          sha256: string,
          createdAt: string,
        }
      },
      image_generator: {
        message: "Fulfilled the node 'image_generator'",
        data: {
          id: string,
          runId: string,
          nodeId: "image_generator",
          kind: "generated",
          uri: string,
          filename: string,
          mediaType: "image/png",
          bytes: 16774,
          sha256: string,
          createdAt: string,
          metadata: expect.objectContaining({})
        }
      },
      weird_generator: {
        message: "Fulfilled the node 'weird_generator'",
        data: {
          id: string,
          runId: string,
          nodeId: "weird_generator",
          kind: "generated",
          uri: string,
          filename: "weird.bmp",
          mediaType: "image/png",
          bytes: 16774,
          sha256: string,
          createdAt: string,
          metadata: expect.objectContaining({}),
        }
      },
      summary: {
        message: "Fulfilled the node 'summary'",
        data: [
          string,
          {
            id: string,
            runId: string,
            nodeId: "summary",
            kind: "generated",
            uri: string,
            filename: "summary.txt",
            mediaType: string,
            bytes: 8,
            sha256: string,
            createdAt: string,
          },
          {
            for: {
              name: string,
              prompt: string,
              default: string,
              nodeId: "summary"
            },
            value: string,
            nodeId: "summary"
          }
        ]
      }
    });
  });
});
