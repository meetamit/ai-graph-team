import { randomUUID, createHash } from 'crypto';
import { mkdir, writeFile } from 'fs/promises';
import path from 'path';
import { experimental_generateImage as generateImage, ImageModel } from 'ai';
import { FileRef } from './types';

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

