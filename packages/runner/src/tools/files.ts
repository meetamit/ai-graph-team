import { tool, Tool } from 'ai';
import { z } from 'zod';
import { NodeToolConfig, FileRef } from '../types';
import { writeTextFile, readTextFile } from '../files';
import { prepareToolInput, configureSchema, type NodeToolContext } from './index';

export function createFileTool(ctx: NodeToolContext, opts: NodeToolConfig): Tool {
  return tool({
    description: 'Create a file',
    inputSchema: z.object(configureSchema({
      filename: z.string().describe('The user-facing name of the file'),
      mediaType: z.string().describe('The media type of the file').default('text/plain').optional(),
      content: z.string().describe('The content of the file'),
    }, opts)),
    execute: async (input: any) => {
      const { content, filename, mediaType } = prepareToolInput(input, opts, ctx);
      const fileRef = await writeTextFile(
        ctx.input.runId, ctx.input.node.id, 
        content as string, 
        filename as string, 
        mediaType as string, 
        'run'
      );
      ctx.files.push(fileRef)
      return fileRef;
    },
  });
}

export function readFileTool(ctx: NodeToolContext, opts: NodeToolConfig): Tool {
  return tool({
    description: 'Read a file as text.',
    inputSchema: z.object(configureSchema({
      fileId: z.string().describe('The id of the file to read'),
    }, opts)),
    execute: async (input: any) => {
      const { fileId } = prepareToolInput(input, opts, ctx);
      const fileRef: FileRef = ctx.input.files[fileId];
      if (!fileRef) { throw new Error(`File not found: ${fileId}`); }
      const content = await readTextFile(fileRef);
      return content;
    },
  });
}

