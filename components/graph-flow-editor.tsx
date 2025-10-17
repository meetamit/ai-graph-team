import { useState, useCallback, useEffect } from "react";
import {
  ReactFlow, ReactFlowProvider, useOnSelectionChange, applyNodeChanges, 
  type NodeChange, type Node
} from '@xyflow/react';

import '@xyflow/react/dist/style.css';

import BasicNode from "./graph-basic-node";
import { GraphJSON } from "@/lib/graphSchema";

type Props = {
  initialValue: GraphJSON;
  onChange?: (value: GraphJSON) => void;
  onSelectNode?: (node: Node) => void;
};


const nodeTypes = {
  llm: BasicNode,
  user_input: BasicNode,
};

function GraphFlowEditor({ initialValue, onChange, onSelectNode }: Props) {
  const [nodes, setNodes] = useState(initialValue.nodes);

  useOnSelectionChange({ onChange: useCallback(({ nodes: [node] }: { nodes: Node[] }) => {
    onSelectNode && onSelectNode(node as Node);
  }, [onSelectNode]) });
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

export default function FlowWithProvider(props: Props) {
  return (
    <ReactFlowProvider>
      <GraphFlowEditor {...props} />
    </ReactFlowProvider>
  );
}