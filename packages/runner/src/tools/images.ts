import { z } from 'zod';
import path from 'path';
import { randomUUID, createHash } from 'crypto';
import { mkdir, writeFile } from 'fs/promises';
import { tool, Tool, experimental_generateImage as generateImage, ImageModel } from 'ai';
import { NodeToolConfig, FileRef } from '../types';
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



const FILES_ROOT = process.env.FILES_ROOT || path.resolve(process.cwd(), '.run-files');

export function workspaceRootForRun(runId: string) {
  return path.join(FILES_ROOT, 'runs', runId);
}

const SAFE = /[^a-zA-Z0-9._-]/g;

export type ImageGenerationOptions = {
  model: ImageModel;
  size?: '1024x1024' | '1792x1024' | '1024x1792';
  style?: 'vivid' | 'natural';
  quality?: 'standard' | 'hd';
};

export async function generateAndSaveImage(
  runId: string,
  nodeId: string | null,
  prompt: string,
  filenameHint = 'image.png',
  options: ImageGenerationOptions
): Promise<FileRef> {
  const {
    model,
    size = '1024x1024',
    style = 'vivid',
    quality = 'hd',
  } = options;

  const id = randomUUID();
  const safeName = filenameHint.replaceAll(SAFE, '_');
  const dir = await ensureDir(runId, 'run', nodeId || undefined);
  const filename = `${id}__${safeName}`;
  const full = path.join(dir, filename);

  // Generate the image
  const { image, providerMetadata, warnings } = await generateImage({
    prompt, size, model,
    providerOptions: { openai: { style, quality } },
    abortSignal: AbortSignal.timeout(120_000),
  });

  // Write the image to disk
  const buf = Buffer.from(image.uint8Array);
  await writeFile(full, buf);

  const sha256 = createHash('sha256').update(buf).digest('hex');

  const uri = `file://${full}`;
  const ref: FileRef = {
    id,
    runId,
    nodeId: nodeId || undefined,
    kind: 'generated',
    uri,
    filename: safeName,
    mediaType: 'image/png',
    bytes: buf.length,
    sha256,
    createdAt: new Date().toISOString(),
    metadata: {
      prompt,
      model,
      size,
      style,
      quality,
      revisedPrompt: (providerMetadata?.openai?.images?.[0] as any)?.revisedPrompt,
      warnings,
    },
  };

  return ref;
}

async function ensureDir(runId: string, scope: 'run' | 'uploads', nodeId?: string) {
  const root = workspaceRootForRun(runId);
  const parts = scope === 'uploads' ? [root, 'uploads'] : [root];
  const dir = path.join(...parts);
  await mkdir(dir, { recursive: true });
  return dir;
}