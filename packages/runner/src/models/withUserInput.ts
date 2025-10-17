import { MockLanguageModelV3 } from 'ai/test';
import { LanguageModel, TextPart } from 'ai';

export default function deterministicLanguageModel(): LanguageModel {
  return new MockLanguageModelV3({
    doGenerate: async (args): Promise<any> => {
      await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 500));
      const { prompt, tools } = args;

      // Extract node params from the prompt message where it was injected by the workflow engine
      const { id: nodeId, type: nodeType } = JSON.parse((prompt[1].content[1] as TextPart).text as string)
      
      if (nodeType === 'user_input') {
        if (prompt.length === 2) {
          // Initial request for user_input node; returns tool call to collect user input
          return {
            usage: {},
            finishReason: 'tool-calls',
            content: [
              { type: 'tool-call', toolCallId: `call_by_${nodeId}_1`, toolName: 'collectUserInput', input: JSON.stringify({ name: `${nodeId}_1`, prompt: 'Question 1', default: 'Default 1' }) },
              { type: 'tool-call', toolCallId: `call_by_${nodeId}_2`, toolName: 'collectUserInput', input: JSON.stringify({ name: `${nodeId}_2`, prompt: 'Question 2', default: 'Default 2' }) },
            ],
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
                data: { x: 100, y: 200, z: 300 }
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