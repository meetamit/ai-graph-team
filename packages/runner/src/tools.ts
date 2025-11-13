import {
  generateText, LanguageModel, ImageModel, tool,
  ModelMessage, TextPart, ToolCallPart, ToolResultPart, Tool, 
} from 'ai';
import { z } from 'zod';
import { Node, Transcript, FileRef } from './types';
import { zodFromSchema } from './json-schema-to-zod';
import { writeTextFile, readTextFile } from './files';
import { generateAndSaveImage } from './images';
import { NodeStepInput, ToolCallInput, ActivitiesDependencies } from './activities';

const tools: Record<string, Tool> = {
  collectUserInput: tool({
    description: 'Prompt the user for an input',
    inputSchema: z.object({
      name: z.string().describe('The internal name of the input'),
      prompt: z.string().describe('The prompt to ask the user for the input'),
      default: z.string().optional().describe('The default value for the input'),
    }),
  }),
  generateImage: tool({
    description: 'Generate an image using AI based on a text prompt',
    inputSchema: z.object({
      prompt: z.string().describe('A detailed description of the image to generate'),
      filename: z.string().optional().default('generated-image.png').describe('The user-facing name of the image file'),
      size: z.enum(['1024x1024', '1792x1024', '1024x1792']).optional().default('1024x1024').describe('The size of the generated image'),
      style: z.enum(['vivid', 'natural']).optional().default('vivid').describe('The style of the image: vivid (hyper-real and dramatic) or natural (more natural, less hyper-real)'),
      quality: z.enum(['standard', 'hd']).optional().default('hd').describe('The quality of the image'),
    }),
  }),
};

type NodeToolContext = {
  input: NodeStepInput;
  files: FileRef[];
};

// Add node-specific tools to the available tools
export function getNodeTools({input, files}: NodeToolContext): Record<string, Tool> {
  return {
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
}

type CallableToolContext = {
  input: ToolCallInput;
  files: FileRef[];
  dependencies: ActivitiesDependencies;
};
// Clone the tools object and add input-specific execute function
export function getCallableTools({input, files, dependencies}: CallableToolContext): Record<string, Tool> {
  return {
    ...tools,
    generateImage: tool({
      ...tools['generateImage'],
      execute: async ({ prompt, filename, size, style, quality }: z.infer<typeof tools.generateImage.inputSchema>) => {
        const imageModel = typeof dependencies.imageModel === 'function' 
          ? dependencies.imageModel(input.imageModel || 'ai') 
          : dependencies.imageModel;
        if (!imageModel) {
          throw new Error(`Could not resolve image model for node ${input.node.id}`);
        }
        
        const fileRef = await generateAndSaveImage(
          input.runId,
          input.node.id,
          prompt,
          filename,
          { model: imageModel, size, style, quality }
        );  
        files.push(fileRef);
        return fileRef;
      },
    })
  }

}