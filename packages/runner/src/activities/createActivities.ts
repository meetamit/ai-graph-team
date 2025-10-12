import { log } from '@temporalio/activity';
import { Node } from '../types';
import simpleLanguageModel from '../models/simple';
import {
  generateText, stepCountIs, LanguageModel, tool,
  ModelMessage, TextPart, ToolCallPart, ToolResultPart, Tool, 
} from 'ai';
import { MockLanguageModelV3 } from 'ai/test';
import { z } from 'zod';

export type Activities = ReturnType<typeof createActivities>;

export type Transcript = Array<ModelMessage>;

export type NodeStepInput = {
  node: Node,
  i: number,
  transcript: Transcript,
  prompt: any,
  inputs: Record<string, any>,
}

type GenerateTextResponse = Awaited<ReturnType<typeof generateText>>;

export type NodeStepResult = {
  finishReason: GenerateTextResponse['finishReason'];
  messages: Transcript,
};

export type ToolCallInput = {
  toolCall: ToolCallPart,
}

const tools: Record<string, Tool> = {
  collectUserInput: tool({
    description: 'Prompt the user for an input',
    inputSchema: z.object({
      name: z.string().describe('The internal name of the input'),
      prompt: z.string().describe('The prompt to ask the user for the input'),
      default: z.string().optional().describe('The default value for the input'),
    }),
  }),

  resolveNodeOutput: tool({
    description: 'Resolve the final output of a node once its work is done',
    inputSchema: z.object({
      message: z.string().describe('Human readable message sumarizing the work done by the node'),
      data: z.any().describe('The output of the node'),
    }),
  })
};

type Dependencies = {
  nodeStepImpl?: (input: NodeStepInput) => Promise<NodeStepResult>;
  toolCallImpl?: (toolCall: ToolCallInput) => Promise<ToolResultPart>;
  model?: LanguageModel;
};

export function createActivities(deps: Dependencies = {}) {
  async function takeNodeStep(input: NodeStepInput): Promise<NodeStepResult> {
    if (deps.nodeStepImpl) { return await deps.nodeStepImpl(input); }
    try {
      const result = await generateText({
        model: deps.model || simpleLanguageModel(), 
        messages: input.transcript,
        stopWhen: stepCountIs(1), // Only allow one step, no followup calls
        tools,
      });

      const content = result.content.map(c => (typeof c === 'string' ? { type: 'text', text: c } : c) as TextPart | ToolCallPart);
      return {
        messages: [{ role: 'assistant', content }],
        finishReason: result.finishReason,
      };
    } catch (error) {
      log.error('Error in takeNodeStep', { error, nodeId: input.node.id });
      throw error;
    }
  }

  async function makeToolCall(input: ToolCallInput): Promise<ToolResultPart> {
    if (deps.toolCallImpl) { return await deps.toolCallImpl(input); }
    const toolDef: Tool = tools[input.toolCall.toolName];
    if (toolDef) {
      const value = toolDef.execute ? await (toolDef.execute as any)(input.toolCall.input) : {};
      return {
        type: 'tool-result',
        toolName: input.toolCall.toolName,
        toolCallId: input.toolCall.toolCallId,
        output: {
          type: 'json',
          value,
        } as any,
      };
    }
    throw new Error(`Unimplemented tool call "${input.toolCall.toolName}"`);
  }

  async function takeNodeFirstStep(input: NodeStepInput): Promise<NodeStepResult> {
    const systemRules = 'You are a node in a DAG-based workflow. You must return a single JSON object. If required inputs are missing, request them using the available tools.';
    
    // Keep rules in system:
    const messages: ModelMessage[] = [
      { role: 'system', content: systemRules },
    
      // Put data in the user turn, as separate parts for readability/streaming:
      {
        role: 'user',
        content: [
          { type: 'text', text: '## Node JSON' },
          { type: 'text', text: JSON.stringify(input.node) },
    
          { type: 'text', text: '## Upstream Inputs JSON' },
          { type: 'text', text: JSON.stringify(input.inputs) },
    
          input.prompt && { type: 'text', text: '## User Prompt (exctract inputs from this if possible/needed)' },
          input.prompt && { type: 'text', text: typeof input.prompt === 'string' ? input.prompt : JSON.stringify(input.prompt) },
        ].filter(Boolean),
      },
    ];

    // Prepend the prompt to the input transcript
    input.transcript.splice(0, 0, ...messages);
    const result = await takeNodeStep(input);

    // Prepend the prompt to the result messages
    result.messages.splice(0,0, ...messages);
    return result;
  }

  return {
    takeNodeStep,
    makeToolCall,
    takeNodeFirstStep,
    takeNodeFollowupStep: takeNodeStep,
  };
}
