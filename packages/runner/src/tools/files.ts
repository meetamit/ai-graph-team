import { tool, Tool } from 'ai';
import { z } from 'zod';
import { NodeToolConfig, FileRef } from '../types';
import { writeTextFile, readTextFile } from '../files';
import { prepareToolInput, type NodeToolContext } from './index';

export function createFileTool(ctx: NodeToolContext, opts: NodeToolConfig): Tool {
  const { input = {}, default: defaults = {} } = opts || {}
  const schema: Record<string, z.ZodType> = {};
  if (!input.filename) {
    schema['filename'] = z.string()
      .describe('The user-facing name of the file')
    if (defaults.filename) {
      schema['filename'] = schema['filename'].default(defaults.filename);
    }
  }
  if (!input.mediaType) {
    schema['mediaType'] = z.string()
      .describe('The media type of the file')
      .default(defaults.mediaType || 'text/plain')
      .optional();
  }
  if (!input.content) {
    schema['content'] = z.string()
      .describe('The content of the file')
  }
  const inputSchema = z.object(schema);
  return tool({
    description: 'Create a file',
    inputSchema,
    execute: async (input: z.infer<typeof inputSchema>) => {
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
  const inputSchema = z.object({
    fileId: z.string().describe('The id of the file to read'),
  });
  return tool({
    description: 'Read a file as text.',
    inputSchema,
    execute: async (input: z.infer<typeof inputSchema>) => {
      const { fileId } = prepareToolInput(input, opts, ctx);
      const fileRef: FileRef = ctx.input.files[fileId];
      if (!fileRef) { throw new Error(`File not found: ${fileId}`); }
      const content = await readTextFile(fileRef);
      return content;
    },
  });
}

