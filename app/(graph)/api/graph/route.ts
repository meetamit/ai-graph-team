import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/app/(auth)/auth";
import { getGraphsByUserId, saveGraph } from "@/lib/db/queries";
import { Graph } from "@/lib/db/schema";
import { GraphSchema } from "@/lib/graph-schema";
import { z } from "zod";

const CreateSchema = z.object({
  title: z.string().min(1),
  data: GraphSchema,
});

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session || !session.user || !session.user.id) {
    return new Response('Unauthorized', { status: 401 });
  }
  
  const graphs: Graph[] = await getGraphsByUserId({ id: session.user.id });
  return NextResponse.json(graphs);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || !session.user || !session.user.id) {
    return new Response('Unauthorized', { status: 401 });
  }
  const ownerId = session.user.id;
  const body = await req.json();
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { title, data } = parsed.data;
  const [inserted] = await saveGraph({ title, data, ownerId });

  return NextResponse.json(inserted, { status: 201 });
}
