import { MockLanguageModelV3 } from 'ai/test';
import { LanguageModel } from 'ai';

export default function deterministicLanguageModel(): LanguageModel {
  return new MockLanguageModelV3({
    doGenerate: async (args): Promise<any> => {
      // await new Promise(resolve => setTimeout(resolve, 100*5/25 + Math.random() * 500*5/25));
      const { prompt, tools } = args;

      const nodeIdRegex = /"id":\s?"(user_input|position_for|position_against|judge)"/;
      const nodeId: 'user_input' | 'position_for' | 'position_against' | 'judge' | null = (prompt[1].content[1] as any).text.match(nodeIdRegex)?.[1] || null;

      const nodeTypeRegex = /"type":\s?"(user_input|llm)"/;
      const nodeType: 'user_input' | 'llm' | null = (prompt[1].content[1] as any).text.match(nodeTypeRegex)?.[1] || null;
      
      if (nodeType === 'user_input') {
        if (prompt.length === 2) {
          // Initial request for user_input node; returns tool call to collect user input
          return {
            usage: {},
            finishReason: 'tool-calls',
            content: [
              { type: 'tool-call', toolCallId: `call_by_${nodeId}_1`, toolName: 'collectUserInput', input: JSON.stringify({ name: '${nodeId}_1', prompt: 'Question 1', default: 'Default 1' }) },
              { type: 'tool-call', toolCallId: `call_by_${nodeId}_2`, toolName: 'collectUserInput', input: JSON.stringify({ name: '${nodeId}_2', prompt: 'Question 2', default: 'Default 2' }) },
            ],
          };
        } else if (prompt.length === 4) {
          // Followup request after user input collection; returns tool call to resolve node output
          return {
            usage: {},
            finishReason: 'tool-calls',
            content: [
              { type: 'tool-call', toolCallId: `call_by_${nodeId}_3`, toolName: 'resolveNodeOutput', input: JSON.stringify({ message: 'Collected and structured user inputs', data: { x: 1, y: 2, z: 3 } }) },
            ],
          };
        }
      } else if (nodeId === 'position_for') {
        return {
          // test that it handles the case where the node output is set by setting `resultObject` —— not tool call
          usage: {},
          finishReason: 'stop',
          content: [
            {
              type: 'text',
              text: `Constructed the case for the proposal`
            }
          ],
        }
      } else if (nodeId === 'position_against') {
        return {
          usage: {},
          finishReason: 'tool-calls',
          content: [
            { type: 'tool-call', toolCallId: `call_by_position_against_1`, toolName: 'resolveNodeOutput', input: JSON.stringify({ message: 'Constructed the case against the proposal', data: { x: 10, y: 20, z: 30 } }) },
          ],
        }
      } else if (nodeId === 'judge') {
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
        throw new Error('Unknown node id: ' + nodeId);
      }
    },
  })
};