import type { GraphJSON } from '../graph-schema';
import { STARTER_GRAPH } from './starter';

const systemRules = 'You are a node in a DAG-based workflow. You must return a single JSON object. If required inputs are missing, request them using the available tools.';
const genericInstructions = [
  systemRules,
  '## Node JSON',
  '{{node}}',
  '## Upstream Inputs JSON',
  '{{inputs}}',
];

export const PRESCRIPTIVE_GRAPH: GraphJSON = {
  ...STARTER_GRAPH,
  nodes: [
    {
      ...STARTER_GRAPH.nodes[0],
      instructions: [...genericInstructions],
      output_schema: {
        type: "object",
        properties: {
          proposal: {
            type: "string",
            description: "The main proposal or topic to be debated"
          },
          special_considerations: {
            type: "string",
            description: "Any special considerations or context for the debate"
          }
        },
        required: ["proposal", "special_considerations"]
      },
    },
    {
      ...STARTER_GRAPH.nodes[1],
      instructions: [...genericInstructions],
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
    },
    {
      ...STARTER_GRAPH.nodes[2],
      instructions: [...genericInstructions],
      output_schema: {
        type: "object",
        properties: {
          argumentsAgainst: {
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
        required: ["argumentsAgainst"]
      },
    },
    {
      ...STARTER_GRAPH.nodes[3],
      instructions: [...genericInstructions],
      output_schema: {
        type: "object",
        properties: {
          synthesis: {
            type: "string",
            description: "The synthesis of the arguments"
          }
        },
        required: ["synthesis"]
      },
    },
  ],
};

