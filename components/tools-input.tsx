"use client";
import { useState } from "react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import {
  PlusIcon, TextCursorInputIcon, FilePenLineIcon, FileOutputIcon,
  ImagePlusIcon, EditIcon, GlobeIcon, type LucideIcon
} from "lucide-react";
import { Label } from "./ui/label";
import { Button } from "./ui/button";
import ToolEditorModal from "./tool-editor";
import { supportedTools, buildToolConfig, type Tool } from "@ai-graph-team/llm-tools";
import type { NodeToolConfig } from "@/lib/graph-schema";

const ICONS: Record<string, LucideIcon> = {
  TextCursorInputIcon,
  FilePenLineIcon,
  FileOutputIcon,
  ImagePlusIcon,
  GlobeIcon,
};

export type ToolsInputProps = {
  tools: Array<string | NodeToolConfig>;
  onChange: (tools: Array<string | NodeToolConfig>) => void;
};

const getToolType = (tool: string | NodeToolConfig): string => {
  return typeof tool === "string" ? tool : tool.type;
};

const getTool = (toolName: string): Tool | undefined => {
  return supportedTools.find((t) => t.id === toolName);
};

export const getToolIcon = (toolName: string): LucideIcon => {
  return ICONS[getTool(toolName)?.icon as keyof typeof ICONS] || EditIcon;
};

export default function ToolsInput({ tools, onChange }: ToolsInputProps) {
  const [addingTool, setAddingTool] = useState<Tool | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const handleAddTool = (tool: Tool) => {
    setDropdownOpen(false);
    setAddingTool(tool);
  };

  const handleSaveAddTool = (toolConfig: NodeToolConfig | string) => {
    if (!addingTool) return;
    const newTools = [...tools, toolConfig];
    onChange(newTools);
    setAddingTool(null);
  };

  const handleRemoveTool = (toolConfig: NodeToolConfig | string) => {
    const newTools = tools.filter((tool) => tool !== toolConfig);
    onChange(newTools);
  };

  const handleSaveTool = (toolConfig: NodeToolConfig | string, initialConfig: NodeToolConfig | string | undefined) => {
    const newTools = tools.map((tool) => tool === initialConfig ? toolConfig : tool);
    onChange(newTools);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium text-gray-700">Tools</Label>

        <DropdownMenu.Root open={dropdownOpen} onOpenChange={setDropdownOpen}>
          <DropdownMenu.Trigger asChild>
            <Button type="button" size="sm" variant="ghost" title="Add tool">
              <PlusIcon size={12} />
            </Button>
          </DropdownMenu.Trigger>

          <DropdownMenu.Portal>
            <DropdownMenu.Content
              className="min-w-[200px] bg-white rounded-md shadow-lg border border-gray-200 p-1 z-50"
              sideOffset={5}
            >
              {supportedTools
                .filter((tool) => !tools.some((t: string | NodeToolConfig) => getToolType(t) === tool.id))
                .map((tool) => {
                  const Icon = getToolIcon(tool.id);
                  return (
                    <DropdownMenu.Item
                      key={tool.id}
                      className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 rounded hover:bg-gray-100 cursor-pointer outline-none"
                      onSelect={() => handleAddTool(tool)}
                    >
                      <Icon size={14} />
                      {tool.label}
                    </DropdownMenu.Item>
                  );
                })}
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </div>

      <div className="flex flex-wrap gap-2">
        {tools.map((config, i) => {
          const toolName = getToolType(config);
          const tool = getTool(toolName);
          if (tool === undefined) {
            return <div key={i} className="text-red-500">Tool '{toolName}' not found</div>;
          }
          return (
            <ToolEditorModal
              key={i}
              tool={tool}
              initialConfig={config === "string" ? undefined : config as NodeToolConfig}
              onSave={handleSaveTool}
              onDelete={() =>{ handleRemoveTool(config); }}
              onClose={() => {}}
            />
          );
        })}
        {addingTool && (
          <ToolEditorModal
            forceOpen={true}
            tool={addingTool}
            initialConfig={buildToolConfig(addingTool) as NodeToolConfig}
            onAdd={handleSaveAddTool}
            onClose={() => setAddingTool(null)}
          />
        )}
      </div>
    </div>
  );
}
