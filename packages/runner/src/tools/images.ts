import { tool, Tool } from 'ai';
import { z } from 'zod';
import { NodeToolConfig } from '../types';
import { generateAndSaveImage } from '../images';
import { prepareToolInput, type CallableToolContext } from './index';

export function generateImageTool(ctx: CallableToolContext | undefined, opts: NodeToolConfig | undefined): Tool {
  const { input = {}, default: defaults = {} } = opts || {}
  const schema: Record<string, z.ZodType> = {};
  if (!input.prompt) {
    schema['prompt'] = z.string()
      .describe('A detailed description of the image to generate');
    if (defaults.prompt) {
      schema['prompt'] = schema['prompt'].default(defaults.prompt);
    }
  }
  if (!input.filename) {
    schema['filename'] = z.string()
      .describe('The user-facing name of the image file')
      .default(defaults.filename || 'generated-image.png');
  }
  if (!input.size) {
    schema['size'] = z.string()
      .describe('The size of the generated image')
      .default(defaults.size || '1024x1024');
  }
  if (!input.style) {
    schema['style'] = z.enum(['vivid', 'natural'])
      .describe('The style of the image: vivid (hyper-real and dramatic) or natural (more natural, less hyper-real)')
      .default(defaults.style || 'vivid');
  }
  if (!input.quality) {
    schema['quality'] = z.enum(['standard', 'hd'])
      .describe('The quality of the image')
      .default(defaults.quality || 'standard');
  }
  
  const inputSchema = z.object(schema);
  const def = {
    description: 'Generate an image using AI based on a text prompt',
    inputSchema,
  }
  if (!ctx) { return tool(def); }
  
  return tool({
    ...def,
    execute: async (input) => {
      const { prompt, filename, size, style, quality } = prepareToolInput(input, opts, ctx);
      const imageModel = typeof ctx.dependencies.imageModel === 'function' 
        ? ctx.dependencies.imageModel(ctx.input.imageModel || 'ai') 
        : ctx.dependencies.imageModel;
      if (!imageModel) {
        throw new Error(`Could not resolve image model for node ${ctx.input.node.id}`);
      }
      
      const fileRef = await generateAndSaveImage(
        ctx.input.runId,
        ctx.input.node.id,
        prompt,
        filename,
        { model: imageModel, size, style, quality }
      );  
      ctx.files.push(fileRef);
      return fileRef;
    }
  })
}