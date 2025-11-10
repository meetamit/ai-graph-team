import { NextRequest } from 'next/server';
import { createReadStream, statSync } from 'fs';
import { headers } from 'next/headers';
import path from 'path';
// import { lookup as mimeLookup } from 'mime-types';
import { getFileRefById } from '@/lib/db/queries';
import { fileURLToPath } from 'url';

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = await params;
  const file = await getFileRefById({ id });
  if (!file) return new Response('Not found', { status: 404 });

  if (!file.uri.startsWith('file://')) {
    return new Response('Unsupported storage', { status: 501 });
  }

  const p = fileURLToPath(file.uri);
  const stat = statSync(p);
  const contentType = file.mediaType || (/* mimeLookup(file.filename) ||  */'application/octet-stream');

  const stream = createReadStream(p);
  const h = new Headers();
  h.set('Content-Type', String(contentType));
  h.set('Content-Length', String(stat.size));
  // h.set('Content-Disposition', `attachment; filename="${file.filename}"`);

  return new Response(stream as any, { headers: h });
}
