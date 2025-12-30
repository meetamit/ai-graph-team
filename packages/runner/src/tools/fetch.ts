import { tool, Tool } from 'ai';
import { NodeToolConfig } from '../types';
import { prepareToolInput, buildLLMToolDef, type CallableToolContext } from './index';
import { supportedToolsById } from '@ai-graph-team/llm-tools';

export function fetchUrlTool(ctx: CallableToolContext | undefined, opts: NodeToolConfig | undefined): Tool {
  const def = buildLLMToolDef(supportedToolsById.fetchUrl, opts);
  if (!ctx) { return tool(def); }
  return tool({
    ...def,
    execute: async (input) => {
      const { url, format } = prepareToolInput(input, opts, ctx);
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch URL: ${response.status} ${response.statusText}`);
      }
      
      const contentType = response.headers.get('content-type') || '';
      const isJson = format === 'json' || contentType.includes('application/json');
      
      if (isJson) {
        const json = await response.json();
        return JSON.stringify(json, null, 2);
      } else {
        const text = await response.text();
        return text;
      }
    },
  });
}

