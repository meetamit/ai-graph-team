"use client";

import { Graph } from "@/lib/db/schema";
import { GraphJSON } from "@/lib/graphSchema";
import GraphTextEditor from "./graph-text-editor";
import GraphFlowEditor from "./graph-flow-editor";
import GraphInputForm from "./graph-input-form";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { useGraph } from "@/hooks/use-graph";


export default function EditGraph({ graph }: { graph: Graph }) {
  (graph.data as GraphJSON).nodes.forEach((node, i) => {
    node.type = node.type || 'llm';
    node.data = node.data || {};
    node.position = node.position || { x: 20 + ((i+1) % 3) * 80, y: 20 + i * 40 };
  });

  const {
    neededInput, submitNeededInput,
    title, setTitle, data, setData, saving, deleting, error, creating,
    saveGraph, deleteGraph, runGraph,
  } = useGraph(graph);
  
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
        <GraphFlowEditor initialValue={data} onChange={setData} />
      </div>

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
