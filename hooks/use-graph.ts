import { useMemo, useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Graph, GraphRun } from "@/lib/db/schema";
import type { 
  GraphJSON, NeededInput, ProvidedInput, NodeId,
  GraphRunEvent, GraphRunStatusEvent, GraphRunNeededInputEvent,GraphRunNodeOutputEvent, 
  GraphRunRecordEvent, GraphRunErrorEvent, GraphRunTranscriptEvent, GraphRunFilesEvent,
  NodeStatuses, GraphNodeMessage,
} from "@/lib/graph-schema";
import { toast } from "@/components/toast";

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

let timeout: NodeJS.Timeout;
const debounce = (func: (...args: any[]) => void, wait: number) => {
  return (...args: any[]) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

export function useGraph(graph: Graph) {
  const router = useRouter();
  const [title, setTitle] = useState(graph.title);
  const [data, setData] = useState<GraphJSON>(graph.data as GraphJSON);
  const [neededInput, setNeededInput] = useState<NeededInput[]>([]);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [run, setRun] = useState<GraphRun | null>(null);
  const [selectedNode, setSelectedNode] = useState<any | null>(null);
  const [transcripts, setTranscripts] = useState<Array<[NodeId, GraphNodeMessage[]]>>([]);
  const [error, setError] = useState<string | null>(null);
  const [nodeStatuses, setNodeStatuses] = useState<NodeStatuses>({});
  const [nodeOutputs, setNodeOutputs] = useState<Record<NodeId, any>>({});
  const creating = graph.id === '';

  const saveGraph = useCallback(async (savedData: GraphJSON = data, savedTitle: string = title) => {
    try {
      setSaving(true);
      setError(null);
      const res = await fetch(`/api/graph${creating ? '' : `/${graph.id}`}`, {
        method: creating ? "POST" : "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: savedTitle, data: savedData }),
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
  }, [title, data, creating, graph.id, router]);

  const saveGraphDebounced = useCallback(
    debounce(saveGraph, 1000),
    [saveGraph],
  );

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

  const runGraph = async (fromNode?: string) => {
    try {
      const res = await fetch(`/api/graph/${graph.id}/run`, { 
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fromNode, fromRun: run?.id }),
      });
      if (!res.ok) {
        const errorMessage = await res.text();
        toast({ type: 'error', description: errorMessage || `Failed to run graph (${res.status})` });
        throw new Error(errorMessage);
      }
      setTranscripts([]);
      setRun(await res.json());
      updateRun();
    } catch (e: any) {
      // If it's not already shown via toast (non-HTTP errors), show it
      if (!e.message) {
        toast({ type: 'error', description: "Failed to run graph" });
      }
    }
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
      setNodeStatuses(status);
    });

    onGraphRunEvent(eventSource, 'output', (payload: GraphRunNodeOutputEvent['payload']) => {
      console.log('OUTPUT', payload);
      const [nodeId, output] = payload;
      setNodeOutputs(prev => ({ ...prev, [nodeId]: output }));
    });

    onGraphRunEvent(eventSource, 'transcript', (payload: GraphRunTranscriptEvent['payload']) => {
      console.log('TRANSCRIPT', payload);
      setTranscripts(transcripts => [...transcripts, ...payload]);
    });

    onGraphRunEvent(eventSource, 'files', (payload: GraphRunFilesEvent['payload']) => {
      console.log('FILES', payload);
    });
    
    onGraphRunEvent(eventSource, 'needed', (payload: GraphRunNeededInputEvent['payload']) => {
      console.log('NEEDED', payload);
      setNeededInput(payload);
    });
    
    onGraphRunEvent(eventSource, 'run', (graphRun: GraphRunRecordEvent['payload']) => {
      console.log('RUN', graphRun);
      setRun(graphRun);
      if (graphRun?.outputs    ) { setNodeOutputs(graphRun.outputs as Record<NodeId, any>); }
      if (graphRun?.statuses   ) { setNodeStatuses(graphRun.statuses as NodeStatuses); }
      if (graphRun?.transcripts) { setTranscripts(graphRun.transcripts as Array<[NodeId, GraphNodeMessage[]]>); }
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
    selectedNode, setSelectedNode, transcripts,
    title, setTitle, data, setData, saving, setSaving, deleting, setDeleting, error, setError, creating,
    nodeStatuses, nodeOutputs,
    saveGraph, saveGraphDebounced, deleteGraph, runGraph,
  }), [neededInput, submitNeededInput, selectedNode, setSelectedNode, title, setTitle, data, setData, saving, setSaving, deleting, setDeleting, error, setError, creating, nodeStatuses, nodeOutputs]);
}