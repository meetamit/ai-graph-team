import { fileURLToPath } from 'url';
import { MockLanguageModelV3 } from 'ai/test';
import { makeHarness, TestHarness, Graph } from './helpers/testEnv';
import { createActivities } from '../src/activities/createActivities';
import withUserInput from '../src/models/withUserInput';

describe('File tools', () => {
  const workflowsPath = fileURLToPath(new URL('../src/workflows', import.meta.url));
  const taskQueue = 'test-files-queue';
  const idBase = 'test-run-files-';
  let h: TestHarness;
  afterEach(async () => {
    if (!h) return;
    await h.shutdown();
  });

  it('creates, reads, and lists files', async () => {
    h = await makeHarness({
      taskQueue, workflowsPath, idBase,
      activities: createActivities({
        model: (name, input) => {
          const impl: MockLanguageModelV3 = withUserInput({ input, delay: 0 }) as MockLanguageModelV3;
          return new MockLanguageModelV3({
            doGenerate: async (args): Promise<any> => {
              const { prompt, tools } = args;
              const { id: nodeId } = input?.node || {};

              if (nodeId?.startsWith('file_creator_') && prompt.length === 2) {
                return {
                  usage: {},
                  finishReason: 'tool-calls',
                  content: [{
                    type: 'tool-call',
                    toolCallId: `call_by_${nodeId}`,
                    toolName: 'createFile',
                    input: JSON.stringify({ filename: `test_${nodeId}.txt`, content: `Hello, world! ${nodeId}` }) 
                  }],
                };
              }
              else if (nodeId === 'file_reader' && prompt.length === 2) {
                const fileId = input && input.inputs.file_creator_1.data.id;
                return {
                  usage: {},
                  finishReason: 'tool-calls',
                  content: [{
                    type: 'tool-call',
                    toolCallId: `call_by_${nodeId}`,
                    toolName: 'readFile',
                    input: JSON.stringify({ fileId }) 
                  }],
                };
              }
              return impl.doGenerate(args); // Generate the default result
            }
          });
        }
      }),
    });

    const fileCreator = {
      type: 'llm',
      intent: 'Create a file',
      output_schema: {
        type: "object",
        properties: { id: { type: "string" }, uri: { type: "string" }, filename: { type: "string" } },
        required: ["id", "uri", "filename"],
      },
    };
    const graph: Graph = {
      nodes: [
        {
          id: 'file_creator_1',
          name: 'File Creator 1',
          ...fileCreator,
        },
        {
          id: 'file_creator_2',
          name: 'File Creator 2',
          ...fileCreator,
        },
        {
          id: 'file_reader',
          type: 'llm',
          name: 'File Reader',
          intent: 'Read a file',
        },
      ], 
      edges:[
        { from: 'file_creator_1', to: 'file_reader' },
        { from: 'file_creator_2', to: 'file_reader' },
      ]
    } as Graph;

    const result1 = await h.runner.runWorkflow({ graph });

    const expectedOutputs = {
      file_creator_1: {
        data: {
          id: expect.stringMatching(/[0-9a-f-]+/),
          uri: expect.stringMatching(/file:\/\/\/.*\/.*_test_file_creator_1\.txt/),
          filename: 'test_file_creator_1.txt',
        },
        message: "Fulfilled the node 'file_creator_1'",
      },
      file_creator_2: {
        data: {
          id: expect.stringMatching(/[0-9a-f-]+/),
          uri: expect.stringMatching(/file:\/\/\/.*\/.*_test_file_creator_2\.txt/),
          filename: 'test_file_creator_2.txt',
        },
        message: "Fulfilled the node 'file_creator_2'",
      },
      file_reader: {
        data: 'Hello, world! file_creator_1',
        message: "Fulfilled the node 'file_reader'",
      },
    };
    expect(result1.outputs).toStrictEqual(expectedOutputs);

    const { id: fileId1, uri: fileUri1 } = result1.outputs.file_creator_1.data;
    const { id: fileId2, uri: fileUri2 } = result1.outputs.file_creator_2.data;

    const expectedFileRef1 = {
      id: fileId1, 
      uri: fileUri1,
      runId: result1.runId,
      nodeId: 'file_creator_1',
      kind: 'generated',
      filename: 'test_file_creator_1.txt',
      mediaType: 'text/plain',
      bytes: 28,
      sha256: expect.stringMatching(/[0-9a-f-]+/),
      createdAt: expect.stringMatching(/[0-9-T:Z]/),
    };
    const expectedFileRef2 = {
      id: fileId2, 
      uri: fileUri2,
      runId: result1.runId,
      nodeId: 'file_creator_2',
      kind: 'generated',
      filename: 'test_file_creator_2.txt',
      mediaType: 'text/plain',
      bytes: 28,
      sha256: expect.stringMatching(/[0-9a-f-]+/),
      createdAt: expect.stringMatching(/[0-9-T:Z]/),
    };
    expect(result1.files).toStrictEqual({
      [fileId1]: expectedFileRef1,
      [fileId2]: expectedFileRef2,
    });

    // Re-run the workflow, starting from file_creator_2
    const result2 = await h.runner.runWorkflow({ graph, fromNode: 'file_creator_2', initial: result1 });
    const { id: fileId2b, uri: fileUri2b } = result2.outputs.file_creator_2.data;
    expect(result2.outputs).toStrictEqual(expectedOutputs);

    // The file_creator_2 node should have a new file ref, but the file_creator_1 node should have the file ref from the first run
    expect(result2.files).toStrictEqual({
      [fileId1]: expectedFileRef1,
      [fileId2b]: {
        ...expectedFileRef2,
        id: fileId2b,
        uri: fileUri2b,
        runId: result2.runId,
      },
    });
  });
});

