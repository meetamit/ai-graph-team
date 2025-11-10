import { MockLanguageModelV3 } from 'ai/test';
import { LanguageModel } from 'ai';
import { withUserInput } from '@ai-graph-team/runner/src/models';
import { NodeStepInput } from '../activities/createActivities';
import { fixtureFromSchema } from './utils';


export default function withImageGen({
  delay = () => 100 + Math.random() * 500,
  input,
}: {
  delay?: number | ((nodeId: string | undefined) => number),
  input?: NodeStepInput,
} = {} ): LanguageModel {
  const impl: MockLanguageModelV3 = withUserInput({ input, delay }) as MockLanguageModelV3;
  return new MockLanguageModelV3({
    doGenerate: async (args): Promise<any> => {
      const { node, inputs } = input || {};

      const { prompt } = args;
      const isFollowup = prompt.some(m => m.role === 'assistant');

      const imagePrompt = inputs?.['user_input']?.data?.prompt;
      if (node?.type === 'llm' && imagePrompt) {
        if (!isFollowup) {
          return {
            usage: {},
            finishReason: 'tool-calls',
            content: [
              {
                type: 'tool-call', toolCallId: `call_by_${node.id}_1`, toolName: 'generateImage', 
                input: JSON.stringify({
                  size: "1024x1024",
                  style: "vivid",
                  prompt: imagePrompt,
                  quality: "hd",
                  filename: "test_image.png"
                })
              },
            ],
          };
        } else {
          const toolResults = (prompt.find(m => m.role === 'tool')?.content.find(c => c.type === 'tool-result')?.output as any)?.value;
          return {
            usage: {},
            finishReason: 'tool-calls',
            content: [
              {
                type: 'tool-call', 
                toolCallId: `call_by_${node.id}_2`, 
                toolName: 'resolveOutput', 
                input: JSON.stringify({
                  message: `Fulfilled the node '${node.id}'`,
                  data: fixtureFromSchema(node.output_schema, { data: { file: toolResults } })
                }) 
              },
            ],
          };            
        }
      }
      return impl.doGenerate(args); // Generate the default result
    }
  })
}
