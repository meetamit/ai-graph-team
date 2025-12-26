import { unauthorized } from "next/navigation";
import { auth } from '@/app/(auth)/auth'; 
import { getGraphsByUserId } from '@/lib/db/queries';
import { GraphListItem } from './graph-list-item';

export default async function GraphListPage() {
  const session = await auth();
  if (!session || !session.user) return unauthorized();

  const graphs = await getGraphsByUserId({ id: session.user.id! });
  
  // Group graphs into Active and Deleted
  const activeGraphs = graphs.filter(g => !g.deletedAt);
  const deletedGraphs = graphs.filter(g => g.deletedAt);
  
  return (
    <section className="max-w-3xl mx-auto p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Your Graphs</h1>
        <a className="rounded bg-black text-white px-3 py-2" href="/graph/new">New</a>
      </div>
      
      {activeGraphs.length > 0 && (
        <div className="mt-4">
          <ul className="space-y-2">
            {activeGraphs.map(r => (
              <GraphListItem key={r.id} graph={r} />
            ))}
          </ul>
        </div>
      )}
      
      {deletedGraphs.length > 0 && (
        <div className="mt-8">
          <h2 className="text-lg font-semibold text-gray-500 mb-2">Deleted</h2>
          <ul className="space-y-2">
            {deletedGraphs.map(r => (
              <GraphListItem key={r.id} graph={r} />
            ))}
          </ul>
        </div>
      )}
      
      {graphs.length === 0 && (
        <p className="mt-4 text-gray-500">No graphs yet. Create your first graph!</p>
      )}
    </section>
  );
}
