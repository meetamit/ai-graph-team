"use client";
import { useState } from "react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { PlusIcon, XIcon, TextCursorInputIcon, FilePenLineIcon, FileOutputIcon, ImagePlusIcon, EditIcon, GlobeIcon } from "lucide-react";
import { Label } from "./ui/label";
import { Button } from "./ui/button";
import ToolEditorModal from "./tool-editor-modal";
import type { NodeToolConfig } from "@/lib/graph-schema";

type Props = {
  tools: Array<string | NodeToolConfig>;
  onChange: (tools: Array<string | NodeToolConfig>) => void;
};

const AVAILABLE_TOOLS = [
  { id: "collectUserInput", label: "Collect User Input", icon: TextCursorInputIcon },
  { id: "generateImage", label: "Generate Image", icon: ImagePlusIcon },
  { id: "writeFile", label: "Write File", icon: FilePenLineIcon },
  { id: "readFile", label: "Read File", icon: FileOutputIcon },
  { id: "extractUrlText", label: "Extract URL Text", icon: GlobeIcon },
];

const getToolName = (tool: string | NodeToolConfig): string => {
  return typeof tool === "string" ? tool : tool.name;
};

const getToolIcon = (toolName: string) => {
  const tool = AVAILABLE_TOOLS.find(t => t.id === toolName);
  return tool?.icon || EditIcon;
};

const getToolDisplayName = (toolName: string): string => {
  const tool = AVAILABLE_TOOLS.find(t => t.id === toolName);
  return tool?.label || toolName;
};

export default function ToolsInput({ tools, onChange }: Props) {
  const [editingTool, setEditingTool] = useState<{ index: number; name: string; config?: NodeToolConfig } | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  
  const handleAddTool = (toolId: string) => {
    setDropdownOpen(false);
    // Open editor modal for the new tool
    setEditingTool({ index: -1, name: toolId });
  };

  const handleRemoveTool = (index: number) => {
    const newTools = [...tools];
    newTools.splice(index, 1);
    onChange(newTools);
  };

  const handleEditTool = (index: number) => {
    const tool = tools[index];
    const toolName = getToolName(tool);
    // Extract only input and default from the config
    const config = typeof tool === "object" 
      ? { 
          ...(tool.input && { input: tool.input }),
          ...(tool.default && { default: tool.default })
        }
      : undefined;
    setEditingTool({ index, name: toolName, config: config as NodeToolConfig | undefined });
  };

  const handleSaveTool = (config: { input?: Record<string, any>; default?: Record<string, any> } | null) => {
    if (!editingTool) return;

    const newTools = [...tools];
    
    if (config === null || (Object.keys(config).length === 0)) {
      // Save as string reference
      if (editingTool.index === -1) {
        newTools.push(editingTool.name);
      } else {
        newTools[editingTool.index] = editingTool.name;
      }
    } else {
      // Save as NodeToolConfig
      const toolConfig: NodeToolConfig = {
        name: editingTool.name,
        ...config,
      };
      
      if (editingTool.index === -1) {
        newTools.push(toolConfig);
      } else {
        newTools[editingTool.index] = toolConfig;
      }
    }
    
    onChange(newTools);
    setEditingTool(null);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium text-gray-700">
          Tools
        </Label>

        <DropdownMenu.Root open={dropdownOpen} onOpenChange={setDropdownOpen}>
          <DropdownMenu.Trigger asChild>
            <Button
              type="button"
              size="sm"
              variant="ghost"
            >
              <PlusIcon size={12} />
            </Button>
          </DropdownMenu.Trigger>

          <DropdownMenu.Portal>
            <DropdownMenu.Content
              className="min-w-[200px] bg-white rounded-md shadow-lg border border-gray-200 p-1 z-50"
              sideOffset={5}
            >
              {AVAILABLE_TOOLS
                .filter(tool => !tools.some((t: string | NodeToolConfig) => getToolName(t) === tool.id))
                .map((tool) => {
                  const Icon = tool.icon;
                  return (
                    <DropdownMenu.Item
                      key={tool.id}
                      className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 rounded hover:bg-gray-100 cursor-pointer outline-none"
                      onSelect={() => handleAddTool(tool.id)}
                    >
                      <Icon size={14} />
                      {tool.label}
                    </DropdownMenu.Item>
                  );
                })
              }
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>

      </div>

      <div className="flex flex-wrap gap-2">
        {tools.map((tool, index) => {
          const toolName = getToolName(tool);
          const Icon = getToolIcon(toolName);
          const isConfigured = typeof tool === "object";
          
          return (
            <div
              key={index}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-full text-sm group hover:bg-blue-100 transition-colors"
            >
              <span className="text-blue-600">
                <Icon size={14} />
              </span>
              <button
                onClick={() => handleEditTool(index)}
                className="text-blue-700 hover:text-blue-900 font-medium"
              >
                {getToolDisplayName(toolName)}
              </button>
              {isConfigured && (
                <span className="w-1.5 h-1.5 bg-blue-600 rounded-full" title="Configured" />
              )}
              <button
                onClick={() => handleRemoveTool(index)}
                className="text-blue-400 hover:text-red-600 transition-colors ml-1"
              >
                <XIcon size={14} />
              </button>
            </div>
          );
        })}
      </div>

      {editingTool && (
        <ToolEditorModal
          toolLabel={getToolDisplayName(editingTool.name)}
          initialConfig={editingTool.config}
          onSave={handleSaveTool}
          onClose={() => setEditingTool(null)}
        />
      )}
    </div>
  );
}

