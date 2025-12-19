"use client";

import { useMemo, useState, useEffect, useCallback } from "react";
import { EditIcon } from "lucide-react";
import { Graph, GraphRun } from "@/lib/db/schema";
import type { GraphJSON, GraphNodeMessageGroup } from "@/lib/graph-schema";
import type { GraphCapabilities } from "@/lib/graph-policy";
import { GRAPH_TEMPLATES } from "@/lib/templates";
import { useGraph } from "@/hooks/use-graph";
import GraphTextEditor from "./graph-text-editor";
import GraphFlowEditor from "./graph-flow-editor";
import NodeSidebar from "./node-sidebar";
import InputFormModal from "./input-form-modal";
import { Button } from "./ui/button";
import { Input } from "./ui/input";

type EditGraphProps = {
  graph: Graph;
  initialRun?: GraphRun;
  capabilities?: GraphCapabilities;
};

export default function EditGraph({ graph, initialRun, capabilities }: EditGraphProps) {
  // Default to full access if capabilities not provided (backward compatibility)
  const canEdit = capabilities?.canEdit ?? true;
  const canRun = capabilities?.canRun ?? true;
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
    saveGraph, saveGraphDebounced, deleteGraph, runGraph,
  } = useGraph(graph, initialRun);

  const [isTextEditorOpen, setIsTextEditorOpen] = useState(false);
  const [isInputFormOpen, setIsInputFormOpen] = useState(false);

  const handleChange = useCallback((data: GraphJSON) => {
    setData(data);
    !creating &&saveGraphDebounced(data);
  }, [setData, saveGraph, data]);

  const handleSave = useCallback(() => {
    saveGraph();
  }, [saveGraph]);

  const handleTitleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setTitle(e.target.value);
    !creating &&saveGraphDebounced(undefined, e.target.value);
  }, [setTitle, saveGraphDebounced, data]);

  const handleNodeChange = useCallback((updatedNode: GraphJSON['nodes'][number]) => {
    const updatedData = {
      ...data,
      nodes: data.nodes.map(node => 
        node.id === updatedNode.id ? updatedNode : node
      )
    };
    setData(updatedData);
    !creating && saveGraphDebounced(updatedData);
  }, [data, setData, saveGraphDebounced, creating]);

  const selectedNodeMessages: GraphNodeMessageGroup[] = useMemo(() => {
    return transcripts
      .filter(([nodeId]) => nodeId === selectedNode?.id)
      .map(([nodeId, transcript]) => ({ nodeId, messages: transcript }));
  }, [transcripts, selectedNode]);

  // Auto-open input form when neededInput.length > 0
  useEffect(() => {
    if (neededInput.length > 0) {
      setIsInputFormOpen(true);
    }
  }, [neededInput.length]);

  const handleTemplateSelect = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const templateId = e.target.value;
    if (!templateId) return;
    
    const template = GRAPH_TEMPLATES.find(t => t.id === templateId);
    if (template) {
      setData(template.data);
      !creating && saveGraphDebounced(template.data);
    }
    // Reset the select to placeholder
    e.target.value = "";
  }, [setData, saveGraphDebounced, creating]);

  return (
    <div className="h-screen flex flex-col">
      <div className="flex items-center justify-between p-2 border-b border-gray-200 bg-white">
        <div className="flex items-center gap-4">
          <Input
            value={title}
            placeholder="Title"
            onChange={handleTitleChange}
            className="w-64"
            disabled={!canEdit}
          />
          {canEdit && (
            <select
              onChange={handleTemplateSelect}
              className="px-3 py-1.5 border border-gray-300 rounded-md text-sm bg-white hover:bg-gray-50 cursor-pointer"
              defaultValue=""
            >
              <option value="" disabled>Load Template...</option>
              {GRAPH_TEMPLATES.map(template => (
                <option key={template.id} value={template.id}>
                  {template.name}
                </option>
              ))}
            </select>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {canEdit && (
            <Button
              disabled={saving || !title}
              onClick={handleSave}
              size="sm"
            >
              {saving ? "Saving..." : creating ? "Create Graph" : "Save"}
            </Button>
          )}

          {canEdit && !creating && (
            <Button
              variant="destructive"
              disabled={deleting}
              onClick={deleteGraph}
              size="sm"
            >
              {deleting ? "Deleting..." : "Delete"}
            </Button>
          )}

          {canRun && !creating && (
            <Button
              onClick={() => runGraph()}
              size="sm"
            >
              Run
            </Button>
          )}
        </div>
      </div>

      <div className="flex-1 relative">
        <div className="absolute inset-0 flex">
          {canEdit && isTextEditorOpen && <div className="flex-grow flex-shrink min-w-[50%] max-w-2xl h-full border-r">
            <GraphTextEditor 
              initialValue={data} 
              onChange={handleChange}
              className="h-full"
            />
          </div>}
          <div className="flex-grow flex-shrink min-w-[50%]">
            <GraphFlowEditor 
              initialValue={data} 
              onChange={handleChange} 
              onSelectNode={setSelectedNode}
              nodeStatuses={nodeStatuses}
              nodeOutputs={nodeOutputs}
              readOnly={!canEdit}
            />
          </div>
          {canEdit && (
            <div className="absolute bottom-4 left-16 z-10">
              <Button
                variant={isTextEditorOpen ? "default" : "outline"}
                size="sm"
                onClick={event => {
                  event.preventDefault();
                  setIsTextEditorOpen(!isTextEditorOpen);
                }}
                className="flex items-center gap-2"
              >
                <EditIcon size={16} />
                Edit as Text
              </Button>
            </div>
          )}
        </div>

        {selectedNode && <NodeSidebar 
          messageGroups={selectedNodeMessages}
          selectedNode={selectedNode}
          onNodeChange={canEdit ? handleNodeChange : undefined}
          runGraph={canRun && !creating ? runGraph : undefined}
          graphData={data}
          nodeStatuses={nodeStatuses}
        />}

        {isInputFormOpen && <InputFormModal
          onClose={() => setIsInputFormOpen(false)}
          neededInput={neededInput}
          onSubmit={(inputs) => { 
            submitNeededInput(inputs);
            setIsInputFormOpen(false);
          }}
        />}
      </div>

      {error && (
        <div className="absolute bottom-4 left-4 right-4 bg-red-50 border border-red-200 rounded-md p-3">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}
    </div>
  );
}
