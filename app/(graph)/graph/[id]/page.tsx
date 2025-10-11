import { notFound } from "next/navigation";

import { getGraphById } from "@/lib/db/queries";
import EditGraph from "@/components/edit-graph";
import { Graph } from "@/lib/db/schema";

export default async function EditGraphPage({ params }: { params: { id: string } }) {
  const { id } = await params;
  const graph: Graph | null = await getGraphById({ id });

  if (!graph) {
    notFound();
  }

  return (
    <section className="max-w-3xl mx-auto p-6 space-y-4">
      <EditGraph graph={graph as Graph} />
    </section>
  );
}
