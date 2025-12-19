import { notFound, unauthorized } from "next/navigation";

import { auth } from "@/app/(auth)/auth";
import { getGraphById, getGraphRunById } from "@/lib/db/queries";
import { getGraphCapabilities } from "@/lib/graph-policy";
import EditGraph from "@/components/edit-graph";
import { Graph } from "@/lib/db/schema";
import { GraphJSON } from "@/lib/graph-schema";

export default async function ViewGraphRunPage({ 
  params 
}: { 
  params: { id: string; runId: string } 
}) {
  const session = await auth();
  if (!session?.user?.id) return unauthorized();

  const { id: graphId, runId } = await params;

  const graph = await getGraphById({ id: graphId });
  if (!graph) notFound();

  const capabilities = getGraphCapabilities({ user: session.user, graph });
  if (!capabilities.canView) return unauthorized();

  const run = await getGraphRunById({ id: runId });
  if (!run || run.graphId !== graphId) {
    notFound();
  }

  // Use the graph data from the run, not the current graph version
  // This preserves the exact state the graph was in when this run executed
  const graphFromRun: Graph = {
    ...graph,
    data: run.graph as GraphJSON,
  };

  return (
    <section className="">
      <EditGraph graph={graphFromRun} initialRun={run} capabilities={capabilities} />
    </section>
  );
}

