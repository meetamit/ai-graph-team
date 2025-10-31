import { fileURLToPath } from 'url';
import { evaluateTemplate } from '../src/cel';
import { makeHarness, TestHarness, Graph } from './helpers/testEnv';
import { createActivities } from '../src/activities/createActivities';
import withUserInput from '../src/models/withUserInput';

const inputter = {
  id: 'inputter',
  name: 'Input Node',
  type: 'input',
  output_schema: {
    type: "object",
    properties: {
      input1: { type: "string" },
      input2: { type: "string" },
    },
    required: ["input1", "input2"],
  },
};

const prompter = {
  id: 'prompter',
  name: 'Prompt Node',
  type: 'llm',
};

const edges = [{ from: inputter.id, to: prompter.id }];
const graph: Graph = { nodes: [inputter, prompter], edges } as Graph;

describe('CEL Template', () => {
  describe('evaluateTemplate', () => {
    it('replaces basic expressions', () => {
      expect(
        evaluateTemplate(
          "{{greeting + ' ' + audience + '!'}} In this literal text we can do CEL math: {{ x + 2.0 }}. Yay!",
          { greeting: 'Hello', audience: 'world', x: 5 }
        )
      ).toBe("Hello world! In this literal text we can do CEL math: 7. Yay!");
    });

    it('stringifies objects', () => {
      expect(
        evaluateTemplate(
          'User: {{ user }}',
          { user: { id: 1, name: 'Ada' } }
        )
      ).toBe('User: {"id":1,"name":"Ada"}');
    });

    it('supports escaping', () => {
      expect(
        evaluateTemplate(
          String.raw`\{{ notEvaluated }} and real: {{ 1 + 1 }}`,
          {}
        )
      ).toBe('{{ notEvaluated }} and real: 2');
    });

    it('check for nulls', () => {
      let template = `Vars {{ foo == null ? "has no foo" : "has foo " + foo }}`;
      expect(evaluateTemplate(template, { foo: null })).toBe('Vars has no foo');
      expect(evaluateTemplate(template, { foo: 'bar' })).toBe('Vars has foo bar');

      // Wish these were supported, but cel-js doesn't support them:
      let error: Error | null = null;
      try { expect(evaluateTemplate(template, { foo: undefined })).toBe('Vars has no foo'); }
      catch (e) { error = e as Error; }
      finally { expect(error?.message).toContain('Message: Unknown variable: foo'); error = null; }

      try { expect(evaluateTemplate(template, {})).toBe('Vars has no foo'); }
      catch (e) { error = e as Error; }
      finally { expect(error?.message).toContain('Message: Unknown variable: foo'); error = null; }
    });
  });


  describe('prompt generation', () => {
    const workflowsPath = fileURLToPath(new URL('../src/workflows', import.meta.url));
    const taskQueue = 'test-graph-queue';
    let h: TestHarness;
    afterEach(async () => {
      if (!h) return;
      await h.shutdown();
    });
  
    it('generates prompts from instructions containing CEL expressions', async () => {
      h = await makeHarness({
        taskQueue,
        workflowsPath,
        activities: createActivities(({ model: withUserInput({ delay: () => 0 }) })),
      });

      const instructions = [
        "Use the user inputs to generate a prompt",
        "{{node}}",
      ];
      const graph: Graph = { nodes: [inputter, { ...prompter, instructions }], edges } as Graph;
      const result = await h.runner.runWorkflow({ graph });

      expect(result.transcripts[4]).toStrictEqual(['prompter', [
        { role: 'system', content: "Use the user inputs to generate a prompt" },
        { role: 'user', content: [{ type: 'text', text: JSON.stringify(graph.nodes[1]) }] },
        expect.objectContaining({ role: 'assistant' }),
      ]]);
    });

    it ('generates prompts from default instructions and containing top-level prompt — when supplied', async () => {
      h = await makeHarness({
        taskQueue,
        workflowsPath,
        activities: createActivities(({ model: withUserInput({ delay: () => 0 }) })),
      });

      const result = await h.runner.runWorkflow({ graph, prompt: 'Test prompt' });

      expect(result.transcripts[4]).toStrictEqual(['prompter', [
        { role: 'system', content: expect.stringContaining('You are a node in a DAG-based workflow.') },
        {
          role: 'user',
          content: [
            { type: 'text', text: '## Node JSON' }, 
            { type: 'text', text: JSON.stringify(graph.nodes[1]) }, 
            { type: 'text', text: '## Upstream Inputs JSON' }, 
            { type: 'text', text: JSON.stringify({ inputter: result.outputs[inputter.id] }) }, 
            { type: 'text', text: '## User Prompt (exctract inputs from this if possible/needed)' },
            { type: 'text', text: result.prompt },
          ]
        },
        expect.objectContaining({ role: 'assistant', content: expect.arrayContaining([]) }),
      ]]);
    });

    it ('generates prompts from default instructions and handles missing top-level prompt', async () => {
      h = await makeHarness({
        taskQueue,
        workflowsPath,
        activities: createActivities(({ model: withUserInput({ delay: () => 0 }) })),
      });

      const result = await h.runner.runWorkflow({ graph, /* NO PROMPT */ });

      expect(result.transcripts[4]).toStrictEqual(['prompter', [
        { role: 'system', content: expect.stringContaining('You are a node in a DAG-based workflow.') },
        {
          role: 'user',
          content: [
            { type: 'text', text: '## Node JSON' }, 
            { type: 'text', text: JSON.stringify(graph.nodes[1]) }, 
            { type: 'text', text: '## Upstream Inputs JSON' }, 
            { type: 'text', text: JSON.stringify({ inputter: result.outputs[inputter.id] }) }, 
          ]
        },
        expect.objectContaining({ role: 'assistant', content: expect.arrayContaining([]) }),
      ]]);
    });
  });
});

