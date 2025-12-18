import { notFound, unauthorized } from "next/navigation";

import { auth } from "@/app/(auth)/auth";
import { getGraphById, getGraphRunsByGraphId } from "@/lib/db/queries";

export default async function GraphRunsPage({ params }: { params: { id: string } }) {
  const session = await auth();
  if (!session || !session.user) {
    return unauthorized();
  }
  
  const { id } = await params;
  const graph = await getGraphById({ id });
  
  if (!graph) notFound();
  if (graph.ownerId !== session.user.id) return unauthorized();
  
  const runs = await getGraphRunsByGraphId({ graphId: id });

  return (
    <section className="max-w-3xl mx-auto p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Runs for: {graph.title}</h1>
        <a className="underline text-sm" href={`/graph/${id}`}>← Back to Graph</a>
      </div>
      <ul className="mt-4 space-y-2">
        {runs.length === 0 ? (
          <li className="text-gray-500">No runs yet</li>
        ) : (
          runs.map(run => (
            <li key={run.id} className="flex items-center gap-3">
              <span className={`text-xs px-2 py-0.5 rounded ${
                run.status === 'done' ? 'bg-green-100 text-green-800' :
                run.status === 'error' ? 'bg-red-100 text-red-800' :
                'bg-yellow-100 text-yellow-800'
              }`}>
                {run.status}
              </span>
              <a href={`/graph/${id}/run/${run.id}`} className="font-mono text-sm underline">{run.id}</a>
              <span className="text-sm text-gray-500">
                {new Date(run.createdAt).toLocaleString()}
              </span>
            </li>
          ))
        )}
      </ul>
    </section>
  );
}
