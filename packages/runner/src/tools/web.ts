import { tool, Tool } from 'ai';
import { tavily } from  '@tavily/core';
import { NodeToolConfig } from '../types';
import { prepareToolInput, buildLLMToolDef, type CallableToolContext } from './index';
import { supportedToolsById } from '@ai-graph-team/llm-tools';

const tvly = tavily({ apiKey: "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" });

export function extractUrlTextTool(ctx: CallableToolContext | undefined, opts: NodeToolConfig | undefined): Tool {
  const def = buildLLMToolDef(supportedToolsById.extractUrlText, opts);
  if (!ctx) { return tool(def); }
  return tool({
    ...def,
    execute: async (input) => {
      const { url, include_images, include_favicon, format } = prepareToolInput(input, opts, ctx);
      const response = await tvly.extract([url], { include_images, include_favicon, format });
      const result = response.results[0];
      return result.rawContent;
    },
  });
}
