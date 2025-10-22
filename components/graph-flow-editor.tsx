import { useState, useCallback, useEffect } from "react";
import {
  ReactFlow, ReactFlowProvider, Background, useOnSelectionChange, applyNodeChanges, 
  type NodeChange, type Node
} from '@xyflow/react';

import '@xyflow/react/dist/style.css';
import './react-flow-overrides.css'

import BasicNode from "./graph-basic-node";
import { GraphJSON } from "@/lib/graphSchema";

type Props = {
  initialValue: GraphJSON;
  onChange?: (value: GraphJSON) => void;
  onSelectNode?: (node: Node) => void;
  nodeStatuses?: Record<string, string>;
  nodeOutputs?: Record<string, any>;
};

type ReactFlowGraphJSON = {
  nodes: {
    id: string;
    type: string;
    data: {
      def: GraphJSON["nodes"][number];
      status: string;
      output: any;
    };
    position: { x: number; y: number };
  }[];
  edges: { id: string; source: string; target: string }[];
};


const nodeTypes = {
  llm: BasicNode,
  input: BasicNode,
};

// Conversion functions between database and React Flow schemas
function toReactFlow(
  dbGraph: GraphJSON, 
  nodeStatuses?: Record<string, string>, 
  nodeOutputs?: Record<string, any>,
): ReactFlowGraphJSON {
  const nodes = dbGraph.nodes.map(node => ({
    id: node.id,
    type: node.type,
    data: {
      def: node,
      status: nodeStatuses?.[node.id] || 'unknown',
      output: nodeOutputs?.[node.id]
    },
    position: dbGraph.layouts?.[node.id] || { x: 0, y: 0 }
  }));

  const edges = dbGraph.edges.map((edge, index) => ({
    id: `e${index}`,
    source: edge.from,
    target: edge.to
  }));

  return {
    nodes: nodes,
    edges: edges
  };
}

function fromReactFlow(rfGraph: ReactFlowGraphJSON): GraphJSON {
  return {
    nodes: rfGraph.nodes.map(node => node.data.def as GraphJSON["nodes"][number]),
    edges: rfGraph.edges.map(edge => ({ from: edge.source, to: edge.target })),
    layouts: Object.fromEntries(rfGraph.nodes.map(node => [node.id, node.position]))
  };
}

function GraphFlowEditor({ initialValue, onChange, onSelectNode, nodeStatuses, nodeOutputs }: Props) {
  const [graph, setGraph] = useState<ReactFlowGraphJSON>(toReactFlow(initialValue, nodeStatuses, nodeOutputs));

  useOnSelectionChange({ onChange: useCallback(({ nodes: [node] }: { nodes: Node[] }) => {
    onSelectNode && onSelectNode(node as Node);
  }, [onSelectNode]) });
  
  useEffect(
    () => { setGraph(toReactFlow(initialValue, nodeStatuses, nodeOutputs)); }, 
    [initialValue, nodeStatuses, nodeOutputs],
  );

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => setGraph((currentGraph) => {
      const updatedNodes = applyNodeChanges(changes, currentGraph.nodes) as ReactFlowGraphJSON["nodes"];
      return { ...currentGraph, nodes: updatedNodes };
    }),
    [],
  );
  
  const propagateChanges = useCallback(
    () => onChange?.(fromReactFlow(graph)),
    [graph, onChange]
  );
  
  return (
    <ReactFlow
      nodes={graph.nodes}
      edges={graph.edges}
      onNodesChange={onNodesChange}
      onNodeDragStop={propagateChanges}
      nodeTypes={nodeTypes}
    >
      <Background gap={15} size={1.5} />
    </ReactFlow>
  );
}

export default function FlowWithProvider(props: Props) {
  return (
    <ReactFlowProvider>
      <GraphFlowEditor {...props} />
    </ReactFlowProvider>
  );
}