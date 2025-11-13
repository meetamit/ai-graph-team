import { log } from '@temporalio/activity';
import {
  generateText, LanguageModel, ImageModel, tool,
  ModelMessage, TextPart, ToolCallPart, ToolResultPart, Tool, 
} from 'ai';
import { Node, Transcript, FileRef } from './types';
import { evaluateTemplate } from './cel';
import { getNodeTools, getCallableTools } from './tools';

export type Activities = ReturnType<typeof createActivities>;

export type NodeStepInput = {
  runId: string;
  node: Node;
  i: number;
  transcript: Transcript;
  files: Record<string, FileRef>;
  prompt: any;
  model?: string;
  imageModel?: string;
  inputs: Record<string, any>;
}

export type NodeStepResult = {
  finishReason: Awaited<ReturnType<typeof generateText>>['finishReason'];
  messages: Transcript,
  files: FileRef[],
};

export type ToolCallInput = {
  runId: string;
  toolCall: ToolCallPart;
  node: Node;
  model?: string;
  imageModel?: string;
}

export type ToolCallResult = {
  toolResult: ToolResultPart;
  files: FileRef[];
}

export type ActivitiesDependencies = {
  nodeStepImpl?: (input: NodeStepInput) => Promise<NodeStepResult>;
  toolCallImpl?: (toolCall: ToolCallInput) => Promise<ToolCallResult>;
  model?: LanguageModel | ((name: string, input?: NodeStepInput) => LanguageModel);
  imageModel?: ImageModel | ((name: string) => ImageModel);
};

export function createActivities(deps: ActivitiesDependencies = {}) {
  async function takeNodeStep(input: NodeStepInput): Promise<NodeStepResult> {    
    if (deps.nodeStepImpl) { return await deps.nodeStepImpl(input); }

    const files: FileRef[] = []; // Keep track of files created during this step

    try {
      const model = typeof deps.model === 'function' ? deps.model(input.model || 'ai', input) : deps.model;
      if (!model) { throw new Error(`Could not resolve model for node ${input.node.id}`); }
      const result = await generateText({
        model, 
        messages: input.transcript,
        tools: getNodeTools({ input, files }),
        toolChoice: 'required',
      });

      // Check for errors in the generateText output, which could arise from mal-formed tool calls
      const error: any = result.content.find((c:any) => c.error);
      if (error) {
        throw new Error(`Error in generateText output ${error.error}`);
      }
      
      // Convert the content to messages, including auto-resolved tool results
      const content = result.content.map(c =>  typeof c === 'string' ? { type: 'text', text: c } as TextPart : c as ToolCallPart | ToolResultPart);
      const messages: ModelMessage[] = content.reduce((messages, c) => {
        const role: ModelMessage['role'] = c.type === 'tool-result' ? 'tool' : 'assistant';
        const message = messages.find(m => m.role === role);
        if (c.type === 'tool-result') {
          c = {
            ...c, 
            output: {
              type: 'json',
              value: c.output,
            },
          }
        }
        if (message) {
          (message.content as Array<TextPart | ToolCallPart | ToolResultPart>).push(c);
        } else {
          messages.push({ role, content: [c] } as ModelMessage);
        }
        return messages;
      }, [] as ModelMessage[]);
      
      return {
        messages, files,
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
      }) as ModelMessage);


    // Prepend the prompt to the input transcript
    input.transcript.splice(0, 0, ...messages);
    const result = await takeNodeStep(input);

    // Prepend the prompt to the result messages
    result.messages.splice(0,0, ...messages);
    return result;
  }

  async function makeToolCall(input: ToolCallInput): Promise<ToolCallResult> {
    if (deps.toolCallImpl) { return await deps.toolCallImpl(input); }

    const files: FileRef[] = []; // Keep track of files created during this step

    // Clone the tools object and add input-specific execute function
    const callableTools = getCallableTools({ input, files, dependencies: deps });


    // Call the tool
    const toolName = input.toolCall.toolName;
    const toolDef: Tool = callableTools[toolName];
    let value: any;
    if (toolDef && toolDef.execute) {
      value = await (toolDef.execute as any)(input.toolCall.input);
    }
    if (!value) {
      throw new Error(`Unimplemented tool call "${input.toolCall.toolName}"`);
    }
    return {
      files,
      toolResult: {
        type: 'tool-result',
        toolName: input.toolCall.toolName,
        toolCallId: input.toolCall.toolCallId,
        output: { type: 'json', value } as any,
      },
    };
  }

  return {
    takeNodeStep,
    makeToolCall,
    takeNodeFirstStep,
    takeNodeFollowupStep: takeNodeStep,
  };
}
