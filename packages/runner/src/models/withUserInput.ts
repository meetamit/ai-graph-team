import { MockLanguageModelV3 } from 'ai/test';
import { LanguageModel } from 'ai';
import { fixtureFromSchema } from './utils';
import { NodeStepInput } from '../activities';

export default function deterministicLanguageModel({
  delay = () => 100 + Math.random() * 500,
  input,
}: {
  delay?: number | ((nodeId: string | undefined) => number)
  input?: NodeStepInput,
} = {} ): LanguageModel {
  return new MockLanguageModelV3({
    doGenerate: async (args): Promise<any> => {
      const { prompt, tools } = args;
      
      const toolsById = (tools || []).reduce((acc, tool) => {
        acc[tool.name] = tool;
        return acc;
      }, {} as Record<string, any>);

      const { id: nodeId, type: nodeType, output_schema } = input?.node || {};

      await new Promise(resolve => setTimeout(resolve, typeof delay === 'function' ? delay(nodeId) : delay));
      
      if (nodeType === 'input') {
        if (prompt.length === 2 && toolsById['collectUserInput']) {
          // First request; returns tool calls to collect user input. Use input schema, if provided, to generate the collected inputs.
          return {
            usage: {},
            finishReason: 'tool-calls',
            content: Object.entries(
              output_schema?.properties || {
                [`${nodeId}_1`]: { description: 'Question 1', default: 'Default 1' },
                [`${nodeId}_2`]: { description: 'Question 2', default: 'Default 2' },
              }
            ).map(([key, value]: [string, any]) => ({
              type: 'tool-call',
              toolCallId: `call_by_${nodeId}_${key}`,
              toolName: 'collectUserInput',
              input: JSON.stringify({ name: key, prompt: value.description || `Enter ${key}`, default: value.default }) 
            })),
          };
        } else if (prompt.length === 4 && toolsById['resolveOutput']) {
          // Followup request after user input collection; returns tool call to resolve node output
          const toolResults = Object.fromEntries(
            // Extract input-collection tool results from the prompt and use them to resolve the node output
            (prompt[3].content as any[]).map(r => [r.output.value.for.name, r.output.value.value])
          );
          return {
            usage: {},
            finishReason: 'tool-calls',
            content: [
              { type: 'tool-call', toolCallId: `call_by_${nodeId}_3`, toolName: 'resolveOutput', input: JSON.stringify({ message: 'Collected and structured user inputs', data: toolResults }) },
            ],
          };
        } else {
          // If no tool calls can be mocked, return a generic stop message
          return {
            usage: {},
            content: [{ type: 'text', text: `Fulfilled the node '${nodeId}'` }],
            finishReason: 'stop',
          }
        }
      } else if (nodeId && nodeType === 'llm') {
        if (toolsById['resolveOutput']) {
          // Extract tool results from the prompt. If they exist, use them to resolve the node output.
          let toolResults: any[] | any = prompt
            .filter(m => m.role === 'tool')
            .flatMap(m => m.content)
            .filter(c => c.type === 'tool-result')
            .map(c => (c.output as any)?.value)
            .filter(Boolean);
          toolResults = toolResults.length === 1 ? toolResults[0] : toolResults;

          // Resolve via tool call, if available. Use output schema, if provided, to generate the resolved output.
          return {
            usage: {},
            finishReason: 'tool-calls',
            content: [
              {
                type: 'tool-call', 
                toolCallId: `call_by_${nodeId}_1`, 
                toolName: 'resolveOutput', 
                input: JSON.stringify({
                  message: `Fulfilled the node '${nodeId}'`,
                  data: output_schema
                    ? fixtureFromSchema(output_schema, { data: toolResults })
                    : toolResults || { x: 100, y: 200, z: 300 }
                }) 
              },
            ],
          };  
        } else {
          // If no tool calls can be mocked, return a generic stop message
          return {
            usage: {},
            content: [{ type: 'text', text: `Fulfilled the node '${nodeId}'` }],
            finishReason: 'stop',
          }
        }
      }
      throw new Error(`Unknown node id "${nodeId}" and type "${nodeType}"`);
    },
  })
};