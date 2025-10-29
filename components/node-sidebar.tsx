"use client";

import MessagesLog from "./graph-message-log";
import NodeEditor from "./node-editor";
import { Button } from "./ui/button";
import type { GraphNodeMessageGroup, GraphJSON, NodeStatuses } from "@/lib/graph-schema";

interface NodeSidebarProps {
  messageGroups: GraphNodeMessageGroup[];
  selectedNode?: {
    id: string;
    type: 'input' | 'llm' | 'router';
    name: string;
    intent?: string;
    instructions?: string[];
  };
  onNodeChange?: (updatedNode: {
    id: string;
    type: 'input' | 'llm' | 'router';
    name: string;
    intent?: string;
    instructions?: string[];
  }) => void;
  runGraph?: (fromNode?: string) => void;
  graphData?: GraphJSON;
  nodeStatuses?: NodeStatuses;
}

// Helper function to find all upstream nodes (nodes that this node depends on)
function getUpstreamNodes(nodeId: string, graphData: GraphJSON): string[] {
  const upstreamNodes = new Set<string>();
  const visited = new Set<string>();
  
  function traverse(currentNodeId: string) {
    if (visited.has(currentNodeId)) return;
    visited.add(currentNodeId);
    
    // Find all edges that point to the current node
    const incomingEdges = graphData.edges.filter(edge => edge.to === currentNodeId);
    
    for (const edge of incomingEdges) {
      upstreamNodes.add(edge.from);
      traverse(edge.from);
    }
  }
  
  traverse(nodeId);
  return Array.from(upstreamNodes);
}

export default function NodeSidebar({ messageGroups, selectedNode, onNodeChange, runGraph, graphData, nodeStatuses }: NodeSidebarProps) {
  // Check if all upstream nodes are done
  const canRunFromHere = selectedNode && runGraph && graphData && nodeStatuses && (() => {
    const upstreamNodes = getUpstreamNodes(selectedNode.id, graphData);
    return upstreamNodes.every(nodeId => nodeStatuses[nodeId] === 'done');
  })();

  return (
    <div className="absolute right-0 top-0 h-full w-96 bg-white border-l border-gray-200 shadow-lg z-10 flex flex-col">
      <div className="flex-1 overflow-y-auto p-2 space-y-4">
        {canRunFromHere && (
          <div className="">
            <Button
              onClick={() => runGraph!(selectedNode!.id)}
              size="sm"
              className="w-full"
            >
              Run from Here
            </Button>
          </div>
        )}
        {selectedNode && onNodeChange && (
          <NodeEditor 
            node={selectedNode} 
            onChange={onNodeChange}
          />
        )}
        {messageGroups?.length > 0 && <div className="">
          <h1 className="text-xl my-2">Messages</h1>
          <MessagesLog messageGroups={messageGroups} />
        </div>}
      </div>
    </div>
  );
}
