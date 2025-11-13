import { tool, Tool } from 'ai';
import { z } from 'zod';
import { NodeToolConfig, FileRef } from '../types';
import { zodFromSchema } from '../json-schema-to-zod';
import { evaluateTemplate } from '../cel';
import type { NodeStepInput, ToolCallInput, ActivitiesDependencies } from '../activities';
import { generateImageTool } from './images';
import { createFileTool, readFileTool } from './files';

const tools: Record<string, Tool> = {
  collectUserInput: tool({
    description: 'Prompt the user for an input',
    inputSchema: z.object({
      name: z.string().describe('The internal name of the input'),
      prompt: z.string().describe('The prompt to ask the user for the input'),
      default: z.string().optional().describe('The default value for the input'),
    }),
  }),
};

export function prepareToolInput(input: any, opts: NodeToolConfig | undefined, ctx: NodeToolContext | CallableToolContext): any {
  const merged = {...input, ...(opts?.input || {})}
  for (const [key, value] of Object.entries(opts?.input || {})) {
    if (typeof value === 'string') {
      merged[key] = evaluateTemplate(value, ctx.input);
    }
  }
  return merged;
}

export type NodeToolContext = {
  input: NodeStepInput;
  files: FileRef[];
};

// Add node-specific tools to the available tools
export function getNodeTools(ctx: NodeToolContext): Record<string, Tool> {
  const { input, files } = ctx;
  const nodeTools: Record<string, Tool> = (input.node.tools || [])
    .reduce((nodeTools, toolOpts: string | NodeToolConfig) => {
      const toolName = typeof toolOpts === 'string' ? toolOpts : toolOpts.name;
      toolOpts = typeof toolOpts === 'string' ? { name: toolOpts } : toolOpts
      const nodeTool: Tool | undefined = !toolName ? undefined
        : toolName === 'generateImage' ? generateImageTool(undefined, toolOpts)
        : toolName === 'createFile'    ? createFileTool(ctx, toolOpts)
        : toolName === 'readFile'      ? readFileTool(ctx, toolOpts)
        : undefined;
      if (nodeTool) { nodeTools[toolName] = nodeTool; }
      return nodeTools;
    }, {} as Record<string, Tool>);

  return {
    ...tools,
    ...nodeTools,
    resolveOutput: tool({
      description: 'Resolve the final output once the work is done',
      inputSchema: z.object({
        message: z.string().describe('Human readable message sumarizing the work done by the node'),
        data: input.node.output_schema
          ? zodFromSchema(input.node.output_schema)
          : z.any(),
      }),
    }),
  };
}


export type CallableToolContext = {
  input: ToolCallInput;
  files: FileRef[];
  dependencies: ActivitiesDependencies;
};

// Clone the tools object and add input-specific execute function
export function getCallableTools(ctx: CallableToolContext): Record<string, Tool> {
  const opts: NodeToolConfig | undefined = ctx.input.node.tools?.find(t => typeof t !== 'string' && t.name === 'generateImage') as NodeToolConfig | undefined;
  return {
    ...tools,
    generateImage: generateImageTool(ctx, opts),
  }

}