import type { NodeSchema } from '@/lib/graph-schema';
import { z } from 'zod';

type Node = z.infer<typeof NodeSchema>;
export const basicNode: Node = {
  id: 'llm-1',
  type: 'llm',
  name: 'LLM node',
  intent: '',
  instructions: [],
  tools: [],
};

export const populatedNode: Node = {
  id: 'llm-2',
  type: 'llm' as const,
  name: 'Helpful Assistant',
  intent: 'Provide helpful and concise responses to user queries',
  instructions: [
    'You are a node in a DAG-based workflow. You must return a single JSON object. If required inputs are missing, request them using the available tools.',
    '## Node JSON',
    '{{node}}',
    '## Upstream Inputs JSON',
    '{{inputs}}',
  ],
  tools: [
    'collectUserInput',
    {
      type: 'readFile',
      settings: {
        fileId: { value: '{{inputs.file_creator.data.id}}' }
      }
    },
    {
      type: 'writeFile',
      settings: {
        filename: { value: 'summary.txt' },
      }
    }
  ],
  output_schema: {
    type: "object",
    properties: {
      argumentsFor: {
        type: "array",
        items: {
          type: "object",
          properties: {
            argument: {
              type: "string",
              description: "The content or statement of the argument"
            },
            weight: {
              type: "number",
              description: "The strength or importance of the argument"
            }
          }
        },
        required: ["argument", "weight"]
      }
    },
    required: ["argumentsFor"]
  },
};

export const nodeWithSimpleModel: Node = {
  id: 'llm-3',
  type: 'llm',
  name: 'GPT-4 Node',
  intent: 'Use GPT-4 for complex reasoning',
  instructions: ['Answer the question thoroughly'],
  tools: [],
  model: 'gpt-4o',
};

export const nodeWithModelAndArgs: Node = {
  id: 'llm-4',
  type: 'llm',
  name: 'Claude with Custom Settings',
  intent: 'Use Claude with specific temperature and token settings',
  instructions: ['Provide creative responses'],
  tools: [],
  model: {
    name: 'claude-3-5-sonnet-20241022',
    args: {
      temperature: 0.9,
      maxTokens: 2000,
    },
  },
};
