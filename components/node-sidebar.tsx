"use client";

import MessagesLog from "./graph-message-log";
import type { GraphNodeMessageGroup } from "@/lib/graphSchema";

interface NodeSidebarProps {
  messageGroups: GraphNodeMessageGroup[];
}

export default function NodeSidebar({ messageGroups }: NodeSidebarProps) {
  return (
    <div className="absolute right-0 top-0 h-full w-96 bg-white border-l border-gray-200 shadow-lg z-10 flex flex-col">
      <div className="flex-1 overflow-y-auto p-2">
        <MessagesLog messageGroups={messageGroups} />
      </div>
    </div>
  );
}
