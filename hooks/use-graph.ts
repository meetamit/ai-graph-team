import { useMemo, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Graph, GraphRun } from "@/lib/db/schema";
import { GraphJSON, NeededInput, ProvidedInput, GraphRunEvent, GraphRunStatusEvent, GraphRunNeededInputEvent,GraphRunNodeOutputEvent, GraphRunRecordEvent, GraphRunErrorEvent } from "@/lib/graphSchema";

type GraphRunPayloadByType<T extends GraphRunEvent['type']> = Extract<GraphRunEvent, { type: T }>['payload'];

function onGraphRunEvent<T extends GraphRunEvent['type']>(
  eventSource: EventSource,
  type: T,
  handler: (data: GraphRunPayloadByType<T>) => void
) {
  eventSource.addEventListener(type as string, (event) => {
    handler(JSON.parse(event.data) as unknown as GraphRunPayloadByType<T>);
  });
}

export function useGraph(graph: Graph) {
  const router = useRouter();
  const [title, setTitle] = useState(graph.title);
  const [data, setData] = useState<GraphJSON>(graph.data as GraphJSON);
  const [neededInput, setNeededInput] = useState<NeededInput[]>([]);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [run, setRun] = useState<GraphRun | null>(null);
  const [error, setError] = useState<string | null>(null);
  const creating = graph.id === '';

  const saveGraph = async () => {
    try {
      setSaving(true);
      setError(null);
      const res = await fetch(`/api/graph${creating ? '' : `/${graph.id}`}`, {
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

  const runGraph = async () => {
    const res = await fetch(`/api/graph/${graph.id}/run`, { method: "POST" });
    if (!res.ok) throw new Error(await res.text());
    setRun(await res.json());
    updateRun();
  }

  const submitNeededInput = async (inputs: ProvidedInput[]) => {
    if (!run) return;
    const res = await fetch(`/api/graph/${graph.id}/run`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ runId: run.id, inputs }),
    });
    if (!res.ok) throw new Error(await res.text());
  }

  const updateRun = async () => {
    const eventSource = new EventSource(`/api/graph/${graph.id}/run`);
    
    onGraphRunEvent(eventSource, 'status', (status: GraphRunStatusEvent['payload']) => {
      console.log('STATUS', status);
      setData(data => ({
        ...data,
        nodes: data.nodes.map((node) => {
          return node.data.status !== status[node.id] ? { ...node, data: { ...node.data, status: status[node.id] } } : node
        })
      }));
    });

    onGraphRunEvent(eventSource, 'output', (payload: GraphRunNodeOutputEvent['payload']) => {
      console.log('OUTPUT', payload);
      const [nodeId, output] = payload
      setData(data => ({
        ...data,
        nodes: data.nodes.map((node) => {
          return nodeId === node.id ? { ...node, data: { ...node.data, output } } : node
        })
      }));
    });
    
    onGraphRunEvent(eventSource, 'needed', (payload: GraphRunNeededInputEvent['payload']) => {
      console.log('NEEDED', payload);
      setNeededInput(payload);
    });
    
    onGraphRunEvent(eventSource, 'run', (graphRun: GraphRunRecordEvent['payload']) => {
      setRun(graphRun);
    });
    
    onGraphRunEvent(eventSource, 'done', () => {
      eventSource.close(); // Stream completed successfully. Gracefully close the connection
    });
    
    onGraphRunEvent(eventSource, 'error', (error: GraphRunErrorEvent['payload']) => {
      console.error('Stream error event', error);
      eventSource.close();
    });
    
    eventSource.onerror = (error) => {
      // This will only fire for actual connection errors
      console.error('EventSource connection error', error);
      eventSource.close();
    }
  }

  useEffect(() => {
    if (creating) {
      return;
    } else if (!run) {
      updateRun();
    }
  }, [run, creating]);

  return useMemo(() => ({
    neededInput, submitNeededInput,
    title, setTitle, data, setData, saving, setSaving, deleting, setDeleting, error, setError, creating,
    saveGraph, deleteGraph, runGraph,
  }), [neededInput, submitNeededInput, title, setTitle, data, setData, saving, setSaving, deleting, setDeleting, error, setError, creating]);
}