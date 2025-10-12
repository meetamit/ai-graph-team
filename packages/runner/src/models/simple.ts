import { MockLanguageModelV3 } from 'ai/test';
import { LanguageModel } from 'ai';

export default function simpleLanguageModel(): LanguageModel {
  return new MockLanguageModelV3({
    doGenerate: async (args): Promise<any> => {
      await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 500));
      return {
        usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
        content: [{ type: 'text', text: `Message from \`defaultLanguageModel\` at ${new Date().toISOString()}` }],
        finishReason: 'stop',
      }
    }
  });
};
