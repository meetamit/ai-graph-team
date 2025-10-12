import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Graph } from "@/lib/db/schema";
import { GraphJSON } from "@/lib/graphSchema";

export function useGraph(graph: Graph) {
  const router = useRouter();
  const [title, setTitle] = useState(graph.title);
  const [data, setData] = useState<GraphJSON>(graph.data as GraphJSON);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const creating = graph.id === '';

  const saveGraph = async () => {
    try {
      setSaving(true);
      setError(null);
      const res = await fetch("/api/graph", {
        method: creating ? "POST" : "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, data }),
      });
      if (!res.ok) throw new Error(await res.text());

      if (creating) {
        const created = await res.json();
        router.push(`/graph/${created.id}`);
      } else {
        router.refresh();
      }
    } catch (e: any) {
      setError(e?.message ?? "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  const deleteGraph = async () => {
    if (!confirm("Delete this graph?")) return;
    try {
      setDeleting(true);
      const res = await fetch(`/api/graph/${graph.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(await res.text());
      router.push("/graph");
    } catch (e: any) {
      setError(e?.message ?? "Failed to delete");
    } finally {
      setDeleting(false);
    }
  }

  return useMemo(() => ({
    title, setTitle, data, setData, saving, setSaving, deleting, setDeleting, error, setError, creating,
    saveGraph, deleteGraph,
  }), [title, setTitle, data, setData, saving, setSaving, deleting, setDeleting, error, setError, creating]);
}