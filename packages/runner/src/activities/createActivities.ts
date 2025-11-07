import { log } from '@temporalio/activity';
import { Node, Transcript } from '../types';
import simpleLanguageModel from '../models/simple';
import { zodFromSchema } from '../json-schema-to-zod';
import { evaluateTemplate } from '../cel';
import {
  generateText, stepCountIs, LanguageModel, tool,
  ModelMessage, TextPart, ToolCallPart, ToolResultPart, Tool, 
} from 'ai';
import { z } from 'zod';

export type Activities = ReturnType<typeof createActivities>;

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
};

type Dependencies = {
  nodeStepImpl?: (input: NodeStepInput) => Promise<NodeStepResult>;
  toolCallImpl?: (toolCall: ToolCallInput) => Promise<ToolResultPart>;
  model?: LanguageModel;
};

export function createActivities(deps: Dependencies = {}) {
  async function takeNodeStep(input: NodeStepInput): Promise<NodeStepResult> {    
    if (deps.nodeStepImpl) { return await deps.nodeStepImpl(input); }

    // Add node-specific tools to the available tools
    const runTools: Record<string, Tool> = {
      ...tools,
      resolveNodeOutput: tool({
        description: 'Resolve the final output of a node once its work is done',
        inputSchema: z.object({
          message: z.string().describe('Human readable message sumarizing the work done by the node'),
          data: input.node.output_schema
            ? zodFromSchema(input.node.output_schema)
            : z.any(),
        }),
      }),
    };
    
    try {
      const result = await generateText({
        model: deps.model || simpleLanguageModel(), 
        messages: input.transcript,
        stopWhen: stepCountIs(1), // Only allow one step, no followup calls
        tools: runTools,
        toolChoice: 'required',
      });

      // Check for errors in the generateText output, which could arise from mal-formed tool calls
      if (result.content.some((c:any) => c.error)) {
        throw new Error(`Error in generateText output ${JSON.stringify(result.content, null, 2)}`);
      }

      const content = result.content.map(c =>  typeof c === 'string' ? { type: 'text', text: c } as TextPart : c as ToolCallPart);
      
      return {
        messages: [{ role: 'assistant', content }],
        finishReason: result.finishReason,
      };
    } catch (error) {
      log.error('Error in takeNodeStep', { error, nodeId: input.node.id });
      throw error;
    }
  }

  const systemRules = 'You are a node in a DAG-based workflow. You must return a single JSON object. If required inputs are missing, request them using the available tools.';
  const genericInstructions = [
    systemRules,
    '## Node JSON',
    '{{node}}',
    '## Upstream Inputs JSON',
    '{{inputs}}',
    '{{prompt != null ? "## User Prompt (exctract inputs from this if possible/needed)" : ""}}',
    '{{prompt != null ? prompt : ""}}',
  ];

  async function takeNodeFirstStep(input: NodeStepInput): Promise<NodeStepResult> {
    const instructions = input.node.instructions || genericInstructions;
    const templateContext = { ...input, prompt: input.prompt || null,  };
    const messages: ModelMessage[] = instructions
      .reduce(
        (acc: ModelMessage[], instruction: string, i) => {
          const evaluated = evaluateTemplate(instruction, templateContext);
          if (i === 0) {
            acc.push({ role: 'system', content: evaluated });
          } else if (i === 1) {
            acc[1] = { role: 'user', content: [{ type: 'text', text: evaluated }] };
          } else {
            (acc[1].content as TextPart[]).push({ type: 'text', text: evaluated });
          }
          return acc;
        },
        [] as ModelMessage[]
      )
      .filter(message => message.content.length > 0)
      .map(m => ({
        ...m,
        content: m.role === 'system' 
          ? m.content as string
          : (m.content as TextPart[]).filter(c => c.type !== 'text' || c.text.trim() !== '')
        }
      ) as ModelMessage);


    // Prepend the prompt to the input transcript
    input.transcript.splice(0, 0, ...messages);
    const result = await takeNodeStep(input);

    // Prepend the prompt to the result messages
    result.messages.splice(0,0, ...messages);
    return result;
  }

  async function makeToolCall(input: ToolCallInput): Promise<ToolResultPart> {
    if (deps.toolCallImpl) { return await deps.toolCallImpl(input); }
    const toolName = input.toolCall.toolName;
    const toolDef: Tool = tools[toolName];
    let value: any;
    if (toolDef && toolDef.execute) {
      value = await (toolDef.execute as any)(input.toolCall.input);
    }
    if (!value) {
      throw new Error(`Unimplemented tool call "${input.toolCall.toolName}"`);
    }
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

  return {
    takeNodeStep,
    makeToolCall,
    takeNodeFirstStep,
    takeNodeFollowupStep: takeNodeStep,
  };
}
