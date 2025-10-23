"use client";

import MessagesLog from "./graph-message-log";
import NodeEditor from "./node-editor";
import type { GraphNodeMessageGroup } from "@/lib/graphSchema";

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
}

export default function NodeSidebar({ messageGroups, selectedNode, onNodeChange }: NodeSidebarProps) {
  return (
    <div className="absolute right-0 top-0 h-full w-96 bg-white border-l border-gray-200 shadow-lg z-10 flex flex-col">
      <div className="flex-1 overflow-y-auto p-2">
        {selectedNode && onNodeChange && (
          <NodeEditor 
            node={selectedNode} 
            onChange={onNodeChange}
          />
        )}
        {messageGroups?.length > 0 &&<div className="mt-4">
          <h1 className="text-xl my-2">Messages</h1>
          <MessagesLog messageGroups={messageGroups} />
        </div>}
      </div>
    </div>
  );
}
