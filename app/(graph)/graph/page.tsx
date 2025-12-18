import { unauthorized } from "next/navigation";
import { auth } from '@/app/(auth)/auth'; 
import { getGraphsByUserId } from '@/lib/db/queries';

export default async function GraphListPage() {
  const session = await auth();
  if (!session || !session.user) return unauthorized();

  const graphs = await getGraphsByUserId({ id: session.user.id! });
  return (
    <section className="max-w-3xl mx-auto p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Your Graphs</h1>
        <a className="rounded bg-black text-white px-3 py-2" href="/graph/new">New</a>
      </div>
      <ul className="mt-4 space-y-2">
        {graphs.map(r => (
          <li key={r.id}>
            <a className="underline" href={`/graph/${r.id}`}>{r.title}</a>
            <span className="text-sm text-gray-500 ml-2">{new Date(r.createdAt).toLocaleString()}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
