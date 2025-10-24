import { MockLanguageModelV3 } from 'ai/test';
import { LanguageModel, TextPart } from 'ai';
import { Node as NodeType } from '../types';
import { fixtureFromSchema } from './generate';

export default function deterministicLanguageModel(): LanguageModel {
  return new MockLanguageModelV3({
    doGenerate: async (args): Promise<any> => {
      await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 500));
      const { prompt, tools } = args;

      // Extract node params from the prompt message where it was injected by the workflow engine
      const { id: nodeId, type: nodeType, output_schema } = JSON.parse((prompt[1].content[1] as TextPart).text as string) as NodeType;
      
      if (nodeType === 'input') {
        if (prompt.length === 2) {
          return {
            usage: {},
            finishReason: 'tool-calls',
            content: Object.entries(
              output_schema?.properties || {
                1: { description: 'Question 1', default: 'Default 1' },
                2: { description: 'Question 2', default: 'Default 2' },
              }
            ).map(([key, value]: [string, any]) => ({
              type: 'tool-call',
              toolCallId: `call_by_${nodeId}_${key}`,
              toolName: 'collectUserInput',
              input: JSON.stringify({ name: `${nodeId}_${key}`, prompt: value.description, default: value.default }) 
            })),
          };
        } else if (prompt.length === 4) {
          // Extract tool results from the prompt to include in the mock node output
          const toolResults = Object.fromEntries(
            (prompt[3].content as any[]).map(r => [r.output.value.for.name, r.output.value.value]));

          // Followup request after user input collection; returns tool call to resolve node output
          return {
            usage: {},
            finishReason: 'tool-calls',
            content: [
              { type: 'tool-call', toolCallId: `call_by_${nodeId}_3`, toolName: 'resolveNodeOutput', input: JSON.stringify({ message: 'Collected and structured user inputs', data: toolResults }) },
            ],
          };
        }
      } else if (nodeId && nodeType === 'llm') {
        return {
          usage: {},
          finishReason: 'tool-calls',
          content: [
            {
              type: 'tool-call', 
              toolCallId: `call_by_${nodeId}_1`, 
              toolName: 'resolveNodeOutput', 
              input: JSON.stringify({
                message: `Fulfilled the node '${nodeId}'`,
                data: output_schema
                  ? fixtureFromSchema(output_schema)
                  : { x: 100, y: 200, z: 300 }
              }) 
            },
          ],
        };  
      } else {
        throw new Error(`Unknown node id "${nodeId}" and type "${nodeType}"`);
      }
    },
  })
};
