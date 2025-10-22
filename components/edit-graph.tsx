"use client";

import { useMemo } from "react";
import { Graph } from "@/lib/db/schema";
import type { GraphJSON, GraphNodeMessageGroup } from "@/lib/graphSchema";
import GraphTextEditor from "./graph-text-editor";
import GraphFlowEditor from "./graph-flow-editor";
import GraphInputForm from "./graph-input-form";
import MessagesLog from "./graph-message-log";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { useGraph } from "@/hooks/use-graph";

export default function EditGraph({ graph }: { graph: Graph }) {
  // Ensure the graph data has the proper structure with layouts
  const graphData = graph.data as GraphJSON;
  if (!graphData.layouts) {
    graphData.layouts = {};
    graphData.nodes.forEach((node, i) => {
      graphData.layouts![node.id] = { x: 20 + ((i+1) % 3) * 80, y: 20 + i * 40 };
    });
  }

  const {
    neededInput, submitNeededInput, 
    selectedNode, setSelectedNode, transcripts,
    title, setTitle, data, setData, saving, deleting, error, creating,
    nodeStatuses, nodeOutputs,
    saveGraph, deleteGraph, runGraph,
  } = useGraph(graph);

  const selectedNodeMessages: GraphNodeMessageGroup[] = useMemo(() => {
    return transcripts
      .filter(([nodeId]) => nodeId === selectedNode?.id)
      .map(([nodeId, transcript]) => ({ nodeId, messages: transcript }));
  }, [transcripts, selectedNode]);

  return (
    <div className="space-y-3">
      <h1 className="text-2xl font-semibold">{creating ? 'New Graph' : `Edit: ${graph?.title}`}</h1>
      <Input
        value={title}
        placeholder="Title"
        onChange={(e) => setTitle(e.target.value)}
      />
      <GraphTextEditor initialValue={data} onChange={setData} />
      <div className="h-96 border border-primary rounded-md">
        <GraphFlowEditor 
          initialValue={data} 
          onChange={setData} 
          onSelectNode={setSelectedNode}
          nodeStatuses={nodeStatuses}
          nodeOutputs={nodeOutputs}
        />
      </div>

      <MessagesLog messageGroups={selectedNodeMessages} />

      <GraphInputForm 
        neededInput={neededInput} 
        onSubmit={(inputs) => { submitNeededInput(inputs); }}
      />

      <div className="flex gap-2">
        <Button
          disabled={saving || !title}
          onClick={saveGraph}
        >
          {saving ? "Saving..." : creating ?"Create Graph" : "Save"}
        </Button>

        {!creating && <Button
          variant="destructive"
          disabled={deleting}
          onClick={deleteGraph}
        >
          {deleting ? "Deleting..." : "Delete"}
        </Button>}

        {!creating && <Button
          onClick={runGraph}
        >Run</Button>}
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

    </div>
  );
}
