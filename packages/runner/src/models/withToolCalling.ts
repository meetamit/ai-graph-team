import { MockLanguageModelV3 } from 'ai/test';
import { LanguageModel, ToolCallPart } from 'ai';
import { fixtureFromSchema } from './utils';
import { messagesToolCalls } from '../utils';
import { NodeStepInput } from '../activities';
import withUserInput from './withUserInput';

export default function deterministicLanguageModel({
  delay = () => 100 + Math.random() * 500,
  input,
  onGenerate = () => {},
}: {
  delay?: number | ((nodeId: string | undefined) => number)
  input?: NodeStepInput,
  onGenerate?: (data: { args: any, gen: any, input: any }) => void,
} = {} ): LanguageModel {
  const impl: MockLanguageModelV3 = withUserInput({ input, delay }) as MockLanguageModelV3;
  return new MockLanguageModelV3({
    doGenerate: async (args): Promise<any> => {
      const { prompt, tools } = args;

      const calledTools = messagesToolCalls(prompt);
      const uncalledTools = tools?.filter(
        (tool:any) => tool.name !== 'resolveOutput' && 
          !calledTools.some((call:any) => call.toolName === tool.name)
      );

      let gen: any;
      if (uncalledTools && uncalledTools.length > 0) {
        gen = {
          usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0, },
          finishReason: 'tool-calls',
          content: uncalledTools?.map((tool:any, i:number) => ({
            type: 'tool-call', 
            toolCallId: `call_by_${input?.node?.id || 'unknown'}_${i+1}`, 
            toolName: tool.name, 
            input: JSON.stringify(fixtureFromSchema(tool.inputSchema))
          })) || [] as ToolCallPart[],
          warnings: [],
        };
      } else {
        gen = await impl.doGenerate(args);
      }
      onGenerate?.({ args, gen, input });
      return gen;
    }
  });
}
