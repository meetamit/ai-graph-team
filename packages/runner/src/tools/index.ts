import { tool, Tool as LLMTool } from 'ai';
import { z } from 'zod';
import { supportedToolsById } from '@ai-graph-team/llm-tools';
import { NodeToolConfig, FileRef } from '../types';
import type { NodeStepInput, ToolCallInput, ActivitiesDependencies } from '../activities';
import { generateImageTool } from './images';
import { writeFileTool, readFileTool } from './files';
import { resolveOutputTool } from './resolve';
import { extractUrlTextTool } from './web';

import { evaluateTemplate } from '../cel';
import { buildToolSettingsSchema, zodFromSchema, type Tool, type ToolSettingsSchema } from '@ai-graph-team/llm-tools';




const tools: Record<string, LLMTool> = {
  collectUserInput: tool({
    description: 'Prompt the user for an input',
    inputSchema: z.object({
      name: z.string().describe('The internal name of the input'),
      prompt: z.string().describe('The prompt to ask the user for the input'),
      default: z.string().optional().describe('The default value for the input'),
    }),
  }),
};



export type NodeToolContext = {
  input: NodeStepInput;
  files: FileRef[];
};

export type CallableToolContext = {
  input: ToolCallInput;
  files: FileRef[];
  dependencies: ActivitiesDependencies;
};

export function getNodeTool(toolName: string, ctx: NodeToolContext | CallableToolContext, isNodeStep: boolean = false): LLMTool | undefined {
  let opts: NodeToolConfig | undefined = ctx.input.node.tools
    ?.find(t => typeof t !== 'string' && t.name === toolName) as NodeToolConfig | undefined;
  if (typeof opts === 'string') opts = { name: opts };

  const tool = supportedToolsById[toolName];
  const nodeCtx: NodeToolContext = ctx as NodeToolContext;
  
  // If we're currently in a node step activity (as opposed to a tool call activity) — and unless the tool
  // is configured to already execute in this node step (which is the less common of cases) — then we delete
  // rather than pass the context into the tool factory function, which skips declaring the `execute` function.
  let toolCtx: CallableToolContext | undefined = ctx as CallableToolContext;
  if (isNodeStep && !tool.executeInNodeStep) toolCtx = undefined;

  switch (toolName) {
    case 'generateImage': return generateImageTool(toolCtx, opts);
    case 'extractUrlText': return extractUrlTextTool(toolCtx, opts);
    case 'writeFile': return writeFileTool(nodeCtx, opts);
    case 'readFile': return readFileTool(nodeCtx, opts);
    default: return undefined;
  }
}

// Add node-specific tools to the available tools
export function getNodeTools(ctx: NodeToolContext): Record<string, LLMTool> {
  const nodeTools: Record<string, LLMTool> = (ctx.input.node.tools || [])
    .reduce((nodeTools, toolOpts: string | NodeToolConfig) => {
      const toolName = typeof toolOpts === 'string' ? toolOpts : toolOpts?.name;
      const nodeTool: LLMTool | undefined = getNodeTool(toolName, ctx, true);
      if (nodeTool) nodeTools[toolName] = nodeTool;
      return nodeTools;
    }, {} as Record<string, LLMTool>);

  return {
    ...tools,
    ...nodeTools,
    resolveOutput: resolveOutputTool(ctx),
  };
}




export function prepareToolInput(input: any, opts: NodeToolConfig | undefined, ctx: NodeToolContext | CallableToolContext): any {
  const merged = { ...input }
  for (const [key, { value }] of Object.entries(opts?.config || {})) {
    if (typeof value === 'string') {
      merged[key] = evaluateTemplate(value, ctx.input);
    } else if (value !== undefined) {
      merged[key] = value;
    }
  }
  return merged;
}

export function buildLLMToolDef(tool: Tool, config: NodeToolConfig | string | undefined): LLMTool {
  const settingsConfig: NodeToolConfig['config'] = typeof config === 'string' ? undefined : config?.config;
  const settingsSchema: ToolSettingsSchema = buildToolSettingsSchema(tool, config);
  const required: string[] = (settingsSchema?.required || []) as string[];
  const inputSchema = z.object(Object.fromEntries(
    Object.entries(settingsSchema.properties ?? {})
      // Only include settings that are not given and that don't have dependent settings
      .filter(([key]) => settingsConfig?.[key]?.value === undefined && !tool.dependentSettings?.[key])
      .map(([key, paramSchema]) => {
        let zodSchema = zodFromSchema(paramSchema);
        const defaultVal = settingsConfig?.[key]?.default
        if (defaultVal) {
          zodSchema = zodSchema.default(defaultVal);
        }
        if (!required.includes(key)) {
          zodSchema = zodSchema.optional();
        }
        return [key, zodSchema];
      })
  ));

  return { description: tool.description, inputSchema };
}
