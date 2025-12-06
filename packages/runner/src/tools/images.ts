import { z, toJSONSchema } from 'zod';
import path from 'path';
import { randomUUID, createHash } from 'crypto';
import { mkdir, writeFile } from 'fs/promises';
import { tool, Tool, experimental_generateImage as generateImage, ImageModel } from 'ai';
import { NodeToolConfig, FileRef } from '../types';
import { supportedToolsById } from '@ai-graph-team/llm-tools';
import { supportedImageModels, type ImageProvider } from '@ai-graph-team/llm-providers';
import { prepareToolInput, buildLLMToolDef, type CallableToolContext } from './index';

/** Look up the provider for a given image model name */
function getImageProvider(modelName: string): ImageProvider | undefined {
  return supportedImageModels.find(m => m.name === modelName)?.provider;
}

export function generateImageTool(ctx: CallableToolContext | undefined, opts: NodeToolConfig | undefined): Tool {
  const def = buildLLMToolDef(supportedToolsById.generateImage, opts);
  if (!ctx) { return tool(def); }
  return tool({
    ...def,
    execute: async (args) => {
      const { dependencies, input } = ctx;
      const { prompt, filename, size, style, quality, steps, model: modelName } = prepareToolInput(args, opts, ctx);

      const model: ImageModel | undefined = typeof dependencies.imageModel === 'function' 
        ? dependencies.imageModel(input.imageModelKind || 'ai', modelName || 'stable-diffusion-2-free') 
        : dependencies.imageModel;

      if (!model) {
        throw new Error(`Could not resolve image model for node ${input.node.id}`);
      }

      const provider = getImageProvider(modelName);

      const fileRef = await generateAndSaveImage(
        input.runId,
        input.node.id,
        prompt,
        filename,
        { model, provider, size, style, quality, steps }
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
  provider?: ImageProvider;
  // Common
  size?: string;
  // OpenAI (DALL-E) specific
  style?: 'vivid' | 'natural';
  quality?: 'standard' | 'hd';
  // Stable Diffusion specific
  steps?: number;
};

/** Build provider-specific options for generateImage */
function buildProviderOptions(
  provider: ImageProvider | undefined,
  options: Pick<ImageGenerationOptions, 'style' | 'quality' | 'steps'>
) {
  const { style, quality, steps } = options;
  
  switch (provider) {
    case 'openai':
      return { openai: { style: style ?? 'vivid', quality: quality ?? 'hd' } };
    case 'stable-diffusion-webui':
      return { webui: { steps: steps ?? 20 } };
    default:
      return {};
  }
}

export async function generateAndSaveImage(
  runId: string,
  nodeId: string | null,
  prompt: string,
  filenameHint = 'image.png',
  options: ImageGenerationOptions
): Promise<FileRef> {
  const {
    model,
    provider,
    size,
    style,
    quality,
    steps,
  } = options;

  // Default size based on provider
  const defaultSize = provider === 'stable-diffusion-webui' ? '512x512' : '1024x1024';
  const resolvedSize = size ?? defaultSize;

  const id = randomUUID();
  const safeName = filenameHint.replaceAll(SAFE, '_');
  const dir = await ensureDir(runId, 'run', nodeId || undefined);
  const filename = `${id}__${safeName}`;
  const full = path.join(dir, filename);

  // Build provider-specific options
  const providerOptions = buildProviderOptions(provider, { style, quality, steps });

  // Generate the image
  const { image, providerMetadata, warnings } = await generateImage({
    model, prompt,
    size: resolvedSize as '1024x1024' | '1792x1024' | '1024x1792',
    providerOptions: providerOptions as Parameters<typeof generateImage>[0]['providerOptions'],
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
      provider,
      size: resolvedSize,
      // Provider-specific options stored for reference
      ...(provider === 'openai' && { style, quality }),
      ...(provider === 'stable-diffusion-webui' && { steps }),
      // OpenAI may return a revised prompt
      ...(providerMetadata?.openai?.images?.[0] && {
        revisedPrompt: (providerMetadata.openai.images[0] as any)?.revisedPrompt,
      }),
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
