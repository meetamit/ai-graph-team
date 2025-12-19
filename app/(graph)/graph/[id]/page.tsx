import { notFound, unauthorized } from "next/navigation";

import { auth } from "@/app/(auth)/auth";
import { getGraphById } from "@/lib/db/queries";
import { getGraphCapabilities } from "@/lib/graph-policy";
import EditGraph from "@/components/edit-graph";
import { Graph } from "@/lib/db/schema";

export default async function EditGraphPage({ params }: { params: { id: string } }) {
  const session = await auth();
  
  if (!session?.user?.id) return unauthorized();
  
  const { id } = await params;
  const graph: Graph | null = await getGraphById({ id });
  if (!graph) notFound();
  
  const capabilities = getGraphCapabilities({ user: session.user, graph });
  if (!capabilities.canView) return unauthorized();

  return (
    <section className="">
      <EditGraph graph={graph} capabilities={capabilities} />
    </section>
  );
}
