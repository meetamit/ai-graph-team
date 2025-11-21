import { tool, Tool } from 'ai';
import { z } from 'zod';
import { tavily } from  '@tavily/core';
import { NodeToolConfig, FileRef } from '../types';
import { prepareToolInput, configureSchema, type CallableToolContext } from './index';

const tvly = tavily({ apiKey: "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" });

export function extractUrlTextTool(ctx: CallableToolContext | undefined, opts: NodeToolConfig | undefined): Tool {
  const def = {
    description: 'Extract text from a URL',
    inputSchema: z.object(configureSchema({
      url: z.string().describe('The URL to extract text from'),
      include_images: z.boolean().describe('Include a list of images extracted from the URLs in the response').default(true).optional(),
      include_favicon: z.boolean().describe('Whether to include the favicon URL for each result').default(true).optional(),
      format: z.enum(['markdown', 'text']).describe('The format of the extracted text').default('markdown').optional(),
    }, opts)),
  };
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
