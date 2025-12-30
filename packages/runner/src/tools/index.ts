import { tool, Tool as LLMTool } from 'ai';
import { z } from 'zod';
import { supportedToolsById as supportedTools } from '@ai-graph-team/llm-tools';
import { NodeToolConfig, FileRef } from '../types';
import type { NodeStepInput, ToolCallInput, ActivitiesDependencies } from '../activities';
import { generateImageTool } from './images';
import { writeFileTool, readFileTool } from './files';
import { resolveOutputTool } from './resolve';
import { extractUrlTextTool } from './web';
import { fetchUrlTool } from './fetch';

import { evaluateTemplate } from '../cel';
import { buildToolSettingsSchema, zodFromSchema, type Tool, type ToolSettingsSchema } from '@ai-graph-team/llm-tools';



export type NodeToolContext = {
  input: NodeStepInput;
  files: FileRef[];
};

export type CallableToolContext = {
  input: ToolCallInput;
  files: FileRef[];
  dependencies: ActivitiesDependencies;
};

function formatToolName(config: NodeToolConfig | string, differentiate: boolean = false): string {
  if (typeof config === 'string') return config;
  let name = config.type;
  if (config.name) {
    name = config.name
      .split(/\W/).filter(Boolean)
      .map((s,i) => i === 0 ? s : s.replace(/^./, c => c.toUpperCase()))
      .join('');
  } else if (differentiate && config.settings) {
    name += '_' + Object.values(config.settings)
      .map(v => v?.value).filter(v => v !== undefined)
      .map((s: string) => {
        const t = s.split(/\W/)
        return t.length === 1 ? t[0] : t.map(c => c.charAt(0)).join('')
      })
      .join('_')
  }
  return name;
}

function getConfiguredTool(
  config: string | NodeToolConfig, 
  ctx: NodeToolContext | CallableToolContext, 
  { isNodeStep }: { isNodeStep: boolean } = { isNodeStep: false }
): LLMTool | undefined {
  config = typeof config === 'string' ? { type: config } : config;
  const tool = supportedTools[config.type];
  if (!tool) {
    throw new Error(`Tool "${config.type}" ${config.name ? `(${config.name})` : ''} not supported`);
  }
  const nodeCtx: NodeToolContext = ctx as NodeToolContext;
  
  // If we're currently in a node step activity (as opposed to a tool call activity) — and unless the tool
  // is configured to already execute in this node step (which is the less common of cases) — then we delete
  // rather than pass the context into the tool factory function, which skips declaring the `execute` function.
  let toolCtx: CallableToolContext | undefined = ctx as CallableToolContext;
  if (isNodeStep && !tool.executeInNodeStep) toolCtx = undefined;

  switch (tool.id) {
    case 'generateImage':    return generateImageTool(toolCtx, config);
    case 'extractUrlText':   return extractUrlTextTool(toolCtx, config);
    case 'fetchUrl':         return fetchUrlTool(toolCtx, config);
    case 'writeFile':        return writeFileTool(nodeCtx, config);
    case 'readFile':         return readFileTool(nodeCtx, config);
    case 'collectUserInput': return buildLLMToolDef(supportedTools[tool.id], config);
    default: return undefined;
  }
}

// Add node-specific tools to the available tools
export function getNodeTools(
  ctx: NodeToolContext | CallableToolContext, 
  { isNodeStep, extraTools }: { isNodeStep: boolean, extraTools?: string[] }
): Record<string, LLMTool> {
  const nodeTools: Record<string, LLMTool> = (ctx.input.node.tools || []).concat(extraTools || [])
    .reduce((nodeTools, config: string | NodeToolConfig) => {
      const nodeTool: LLMTool | undefined = getConfiguredTool(config, ctx, { isNodeStep });
      if (nodeTool) {
        let toolName = formatToolName(config, false);
        if (nodeTools[toolName]) toolName = formatToolName(config, true);
        if (nodeTools[toolName]) throw new Error(`Tool "${toolName}" already defined`);
        nodeTools[toolName] = nodeTool;
      }
      return nodeTools;
    }, {} as Record<string, LLMTool>);
  return {
    ...nodeTools,
    resolveOutput: resolveOutputTool(ctx as NodeToolContext), // resolveOutput is always a node-specific tool
  };
}




export function prepareToolInput(input: any, opts: NodeToolConfig | undefined, ctx: NodeToolContext | CallableToolContext): any {
  const merged = { ...input }
  for (const [key, { value }] of Object.entries(opts?.settings || {})) {
    if (typeof value === 'string') {
      merged[key] = evaluateTemplate(value, ctx.input);
    } else if (value !== undefined) {
      merged[key] = value;
    }
  }
  return merged;
}

export function buildLLMToolDef(tool: Tool, config: NodeToolConfig | string | undefined): LLMTool {
  const settingsConfig: NodeToolConfig['settings'] = typeof config === 'string' ? undefined : config?.settings;
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
  const description = typeof config === 'string' || config?.description === undefined ? tool.description : config?.description;
  return { description, inputSchema };
}
