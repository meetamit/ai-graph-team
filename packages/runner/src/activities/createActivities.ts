import { log } from '@temporalio/activity';
import { Node, Transcript, FileRef } from '../types';
import simpleLanguageModel from '../models/simple';
import { zodFromSchema } from '../json-schema-to-zod';
import { evaluateTemplate } from '../cel';
import { writeTextFile, readTextFile } from '../files';
import {
  generateText, LanguageModel, tool,
  ModelMessage, TextPart, ToolCallPart, ToolResultPart, Tool, 
} from 'ai';
import { z } from 'zod';

export type Activities = ReturnType<typeof createActivities>;

export type NodeStepInput = {
  runId: string;
  node: Node;
  i: number;
  transcript: Transcript;
  files: Record<string, FileRef>;
  prompt: any;
  inputs: Record<string, any>;
}

type GenerateTextResponse = Awaited<ReturnType<typeof generateText>>;

export type NodeStepResult = {
  finishReason: GenerateTextResponse['finishReason'];
  messages: Transcript,
  files: FileRef[],
};

export type ToolCallInput = {
  runId: string;
  toolCall: ToolCallPart;
  nodeId?: string;
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

    const files: FileRef[] = []; // Keep track of files created during this step

    // Add node-specific tools to the available tools
    const runTools: Record<string, Tool> = {
      ...tools,
      resolveOutput: tool({
        description: 'Resolve the final output once the work is done',
        inputSchema: z.object({
          message: z.string().describe('Human readable message sumarizing the work done by the node'),
          data: input.node.output_schema
            ? zodFromSchema(input.node.output_schema)
            : z.any(),
        }),
      }),
      createFile: tool({
        description: 'Create a file',
        inputSchema: z.object({
          filename: z.string().describe('The user-facing name of the file'),
          mediaType: z.string().optional().default('text/plain').describe('The media type of the file'),
          content: z.string().describe('The content of the file'),
        }),
        execute: async ({ content, filename, mediaType }: z.infer<typeof tools.createFile.inputSchema>) => {
          const fileRef = await writeTextFile(input.runId, input.node.id, content, filename, mediaType, 'run');
          files.push(fileRef)
          return fileRef;
        },
      }),
      readFile: tool({
        description: 'Read a file as text.',
        inputSchema: z.object({
          fileId: z.string().describe('The id of the file to read'),
        }),
        execute: async ({ fileId }: z.infer<typeof tools.readFile.inputSchema>) => {
          const fileRef: FileRef = input.files[fileId];
          // if (!fileRef) { throw new Error(`File not found: ${fileId}`); }
          if (!fileRef) { return { error: `File not found: ${fileId}` }; }
          const content = await readTextFile(fileRef);
          return content;
        },
      }),    
    };
    
    try {
      const result = await generateText({
        model: deps.model || simpleLanguageModel(), 
        messages: input.transcript,
        tools: runTools,
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
