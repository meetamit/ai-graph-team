import { randomUUID, createHash } from 'crypto';
import { mkdir, writeFile, readFile } from 'fs/promises';
import path from 'path';
// import { fileTypeFromBuffer } from 'file-type';
import { FileRef } from './types';

const FILES_ROOT = process.env.FILES_ROOT || path.resolve(process.cwd(), '.run-files');

export function workspaceRootForRun(runId: string) {
  return path.join(FILES_ROOT, 'runs', runId);
}

const SAFE = /[^a-zA-Z0-9._-]/g;

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

/* export async function writeBinaryFile(
  runId: string,
  nodeId: string | null,
  base64: string,
  filenameHint: string,
  mediaType?: string,
  directory: 'run' | 'uploads' = 'run'
): Promise<FileRef> {
  const id = randomUUID();
  const safeName = filenameHint.replaceAll(SAFE, '_');
  const dir = await ensureDir(runId, directory, nodeId || undefined);
  const filename = `${id}__${safeName}`;
  const full = path.join(dir, filename);

  const buf = Buffer.from(base64, 'base64');
  await writeFile(full, buf);

  // sniff if not provided
  let mt = mediaType;
  if (!mt) {
    const ft = await fileTypeFromBuffer(buf);
    mt = ft?.mime || 'application/octet-stream';
  }

  const sha256 = createHash('sha256').update(buf).digest('hex');

  const uri = `file://${full}`;
  const ref: FileRef = {
    id,
    runId,
    nodeId: nodeId || undefined,
    kind: directory === 'uploads' ? 'upload' : 'generated',
    uri,
    filename: safeName,
    mediaType: mt!,
    bytes: buf.length,
    sha256,
    createdAt: new Date().toISOString(),
  };

  return ref;
} */

export async function readTextFile(fileRef: FileRef): Promise<string> {
  if (!fileRef.uri.startsWith('file://')) throw new Error(`Unsupported storage: ${fileRef.uri}`);
  return await readFile(fileRef.uri.slice('file://'.length), 'utf8');
}

async function ensureDir(runId: string, scope: 'run' | 'uploads', nodeId?: string) {
  const root = workspaceRootForRun(runId);
  const parts = scope === 'uploads' ? [root, 'uploads'] : [root];
  const dir = path.join(...parts);
  await mkdir(dir, { recursive: true });
  return dir;
}