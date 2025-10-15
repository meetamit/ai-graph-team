import { useState, useCallback, useEffect } from "react";
import { ReactFlow, applyNodeChanges, NodeChange } from '@xyflow/react';

import '@xyflow/react/dist/style.css';

import BasicNode from "./graph-basic-node";
import { GraphJSON } from "@/lib/graphSchema";

type Props = {
  initialValue: GraphJSON;
  onChange?: (value: GraphJSON) => void;
};


const nodeTypes = {
  llm: BasicNode,
  user_input: BasicNode,
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
  const propagateChanges = useCallback(
    () => onChange?.({ ...initialValue, nodes }),
    [nodes],
  );
  return (
    <ReactFlow
      nodes={nodes}
      edges={initialValue.edges}
      onNodesChange={onNodesChange}
      onNodeDragStop={propagateChanges}
      nodeTypes={nodeTypes}
    />
  );
}