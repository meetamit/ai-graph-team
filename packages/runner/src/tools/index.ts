import { tool, Tool } from 'ai';
import { z } from 'zod';
import { NodeToolConfig, FileRef } from '../types';
import { evaluateTemplate } from '../cel';
import type { NodeStepInput, ToolCallInput, ActivitiesDependencies } from '../activities';
import { generateImageTool } from './images';
import { createFileTool, readFileTool } from './files';
import { resolveOutputTool } from './resolve';
import { extractUrlTextTool } from './web';

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
        : toolName === 'extractUrlText'? extractUrlTextTool(undefined, toolOpts)
        : toolName === 'createFile'    ? createFileTool(ctx, toolOpts)
        : toolName === 'readFile'      ? readFileTool(ctx, toolOpts)
        : undefined;
      if (nodeTool) { nodeTools[toolName] = nodeTool; }
      return nodeTools;
    }, {} as Record<string, Tool>);

  return {
    ...tools,
    ...nodeTools,
    resolveOutput: resolveOutputTool(ctx),
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
    extractUrlText: extractUrlTextTool(ctx, opts),
  }
}

// Used by tool factories to configure the schema of a tool based on the node tool config
export function configureSchema(schema: Record<string, z.ZodType>, opts: NodeToolConfig | undefined): Record<string, z.ZodType> {
  return Object.fromEntries(
    Object.entries(schema)
      .filter(([key]) => !opts?.input?.[key])
      .map(([key, paramSchema]) => opts?.default?.[key] ? [key, paramSchema.default(opts?.default?.[key])] : [key, paramSchema])
  )
}