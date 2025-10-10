import { useState, useCallback, useEffect } from "react";
import { applyNodeChanges, ReactFlow, NodeChange } from '@xyflow/react';
import { GraphJSON } from "@/lib/graphSchema";
import '@xyflow/react/dist/style.css';

type Props = {
  initialValue: GraphJSON;
  onChange?: (value: GraphJSON) => void;
};

export default function GraphFlowEditor({ initialValue, onChange }: Props) {
  const [nodes, setNodes] = useState(initialValue.nodes);

  useEffect(
    () => { setNodes(initialValue.nodes); }, 
    [initialValue],
  );

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => setNodes((nodesSnapshot) => applyNodeChanges(changes, nodesSnapshot)),
    [],
  );
  const bubbleUpChanges = useCallback(
    () => onChange?.({ ...initialValue, nodes }),
    [nodes],
  );
  return (
    <ReactFlow
      nodes={nodes}
      edges={initialValue.edges}
      onNodesChange={onNodesChange}
      onNodeDragStop={bubbleUpChanges}
    />
  );
}