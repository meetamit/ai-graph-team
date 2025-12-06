import { mkdir, writeFile, readFile } from 'fs/promises';
import { randomUUID, createHash } from 'crypto';
import path from 'path';
import { tool, Tool } from 'ai';
import { NodeToolConfig, FileRef } from '../types';
import { supportedToolsById as tools } from '@ai-graph-team/llm-tools';
import { prepareToolInput, buildLLMToolDef, type NodeToolContext } from './index';


export function writeFileTool(ctx: NodeToolContext, opts?: NodeToolConfig): Tool {
  return tool({
    ...buildLLMToolDef(tools.writeFile, opts),
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

export function readFileTool(ctx: NodeToolContext, opts?: NodeToolConfig): Tool {
  return tool({
    ...buildLLMToolDef(tools.readFile, opts),
    execute: async (input: any) => {
      const { fileId } = prepareToolInput(input, opts, ctx);
      const fileRef: FileRef = ctx.input.files[fileId];
      if (!fileRef) { throw new Error(`File not found: ${fileId}`); }
      const content = await readTextFile(fileRef);
      return content;
    },
  });
}




const FILES_ROOT = process.env.FILES_ROOT || path.resolve(process.cwd(), '.run-files');

export function workspaceRootForRun(runId: string) {
  return path.join(FILES_ROOT, 'runs', runId);
}

const SAFE = /[^a-zA-Z0-9._-]/g;

export async function readTextFile(fileRef: FileRef): Promise<string> {
  if (!fileRef.uri.startsWith('file://')) throw new Error(`Unsupported storage: ${fileRef.uri}`);
  return await readFile(fileRef.uri.slice('file://'.length), 'utf8');
}

export async function writeTextFile(
  runId: string,
  nodeId: string | null,
  content: string,
  filenameHint = 'file.txt',
  mediaType = 'text/plain; charset=utf-8',
  directory: 'run' | 'uploads' = 'run'
): Promise<FileRef> {
  const id = randomUUID();
  const safeName = filenameHint.replaceAll(SAFE, '_');
  const dir = await ensureDir(runId, directory, nodeId || undefined);
  const filename = `${id}__${safeName}`;
  const full = path.join(dir, filename);

  const buf = Buffer.from(content, 'utf8');
  await writeFile(full, buf);

  const sha256 = createHash('sha256').update(buf).digest('hex');

  const uri = `file://${full}`;
  const ref: FileRef = {
    id,
    runId,
    nodeId: nodeId || undefined,
    kind: directory === 'uploads' ? 'upload' : 'generated',
    uri,
    filename: safeName,
    mediaType,
    bytes: buf.length,
    sha256,
    createdAt: new Date().toISOString(),
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
