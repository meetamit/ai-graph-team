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