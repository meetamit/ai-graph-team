import { log } from '@temporalio/activity';
import {
  generateText, LanguageModel, ImageModel, tool,
  ModelMessage, TextPart, ToolCallPart, ToolResultPart, Tool, 
} from 'ai';
import { Node, NodeModelConfig, Edge, Transcript, FileRef } from './types';
import { evaluateTemplate } from './cel';
import { getNodeTools } from './tools';

export type Activities = ReturnType<typeof createActivities>;

export type NodeStepInput = {
  runId: string;
  node: Node;
  inputs: Record<string, any>;
  outgoing: Edge[];
  i: number;
  transcript: Transcript;
  files: Record<string, FileRef>;
  prompt: any;
  modelKind?: string;
  imageModelKind?: string;
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
  inputs: Record<string, any>;
  modelKind?: string;
  imageModelKind?: string;
}

export type ToolCallResult = {
  toolResult: ToolResultPart;
  files: FileRef[];
}

export type ModelWithArgs = {
  model: LanguageModel;
  args?: Record<string, any>;
};

export type ActivitiesDependencies = {
  nodeStepImpl?: (input: NodeStepInput) => Promise<NodeStepResult>;
  toolCallImpl?: (toolCall: ToolCallInput) => Promise<ToolCallResult>;
  model?: LanguageModel | ModelWithArgs | 
          ((name: string, input?: NodeStepInput) => LanguageModel | ModelWithArgs);
  imageModel?: ImageModel | ((name: string, model: string | NodeModelConfig) => ImageModel);
};

export function createActivities(deps: ActivitiesDependencies = {}) {
  async function takeNodeStep(input: NodeStepInput): Promise<NodeStepResult> {    
    if (deps.nodeStepImpl) { return await deps.nodeStepImpl(input); }

    const files: FileRef[] = []; // Keep track of files created during this step

    try {
      // Prep the model and generation args
      const configuredModel: LanguageModel | ModelWithArgs | undefined = typeof deps.model === 'function' 
        ? deps.model(input.modelKind || 'ai', input) 
        : deps.model;
      let model: LanguageModel | undefined;
      let generationArgs: Record<string, any> = {};
      if (configuredModel && configuredModel.hasOwnProperty('model')) {
        model = (configuredModel as ModelWithArgs).model;
        generationArgs = (configuredModel as ModelWithArgs).args || {};
      } else {
        model = configuredModel as LanguageModel;
      }

      // Make the LLM call
      const result = await generateText({
        model, ...generationArgs,
        messages: input.transcript,
        tools: getNodeTools(
          { input, files }, 
          {
            extraTools: input.node.type === 'input' ? ['collectUserInput'] : [],
            isNodeStep: true,
          }
        ),
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
          c = { ...c, output: { type: 'json', value: c.output } };
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
    const toolName = input.toolCall.toolName;
    const toolDef: Tool | undefined = getNodeTools(
      { input, files, dependencies: deps },
      { isNodeStep: false }
    )[toolName];
    let value: any;
    if (toolDef && toolDef.execute) {
      value = await (toolDef.execute as any)(input.toolCall.input); // Call the tool
    }
    if (!value) throw new Error(`Unimplemented tool call "${toolName}"`);
    return {
      files,
      toolResult: {
        type: 'tool-result',
        toolName: toolName,
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
