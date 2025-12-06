"use client";

import equal from 'fast-deep-equal';
import { cn } from '@/lib/utils';
import { useState, useCallback, useRef } from "react";
import { XIcon, Trash2Icon, type LucideIcon } from "lucide-react";
import type { NodeToolConfig } from "@/lib/graph-schema";
import type { Tool } from "@ai-graph-team/llm-tools";
import {
  Dialog, DialogClose, DialogContent, DialogDescription, 
  DialogFooter, DialogHeader, DialogTitle, DialogTrigger 
} from "@/components/ui/dialog"
import ToolConfigForm from "./tool-config-form";
import { getToolIcon } from "./tools-input";
import { Button } from './ui/button';

type Props = {
  tool: Tool;
  initialConfig?: NodeToolConfig;
  onClose: () => void;
  onSave?: (config: NodeToolConfig | string, initialConfig: NodeToolConfig | string | undefined) => void;
  onAdd?: (config: NodeToolConfig | string) => void;
  onDelete?: () => void;
  forceOpen?: boolean;
};

export default function ToolEditorModal({
  tool,
  initialConfig,
  onSave,
  onAdd,
  onClose,
  onDelete,
  forceOpen,
}: Props) {
  const [config, setConfig] = useState<NodeToolConfig | string>(initialConfig || tool.id);
  const [shake, setShake] = useState(false);

  const handleSave = () => { 
    if (onSave) { onSave(config, initialConfig); }
    else if (onAdd) { onAdd(config); }
  };
  
  const handleOpenChange = useCallback((open: boolean) => {
    if (open && initialConfig) { setConfig(initialConfig); }
    if (!open && onClose) { onClose(); }
  }, [initialConfig, onClose]);

  const handleInteractOutside = useCallback((event: any) => {
    // Only allow background/Escape close if nothing has changed
    if (!equal(config, initialConfig)) {
      event.preventDefault();
      setShake(true);
    }
    else if (forceOpen) { onClose(); }
  }, [config, initialConfig, onClose, setShake]);

  const Icon = getToolIcon(tool.id);
  const isConfigured = typeof config === 'object' && Object.keys(config).length > 1;

  return (
    <Dialog open={forceOpen} onOpenChange={handleOpenChange} >
      <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-full text-sm group hover:bg-blue-100 transition-colors" >
        <DialogTrigger asChild>
          <Button variant="link" size="inline" className="!no-underline">
            <div className="text-blue-600"><Icon size={14} /></div>
            <span className="p-0 text-blue-700 hover:text-blue-900 font-medium cursor-pointer">{tool.label}</span>
            {isConfigured && <span title="Configured" className="w-1.5 h-1.5 bg-blue-600 rounded-full" />}
          </Button>
        </DialogTrigger>
        {onDelete && <Button
          variant="link" size="inline"
          onClick={event => {
            if (window.confirm('Are you sure you want to delete this tool?')) {
              event.stopPropagation();
              onDelete?.();
            }
          }}
          className="p-0 text-blue-400 hover:text-red-600 transition-colors ml-1"
        ><XIcon size={14} /></Button>}
      </div>

      <DialogContent
        className={cn('p-0', shake && 'animate-dialog-shake')}
        onInteractOutside={handleInteractOutside}
        onAnimationEnd={() => setShake(false)}
      >
        <DialogHeader className="px-6 pt-6">
          <DialogTitle>
            <Icon size={18} className="inline-block mr-2 align-bottom" />
            {onAdd ? 'Add' : 'Edit'} Tool: {tool.label}
          </DialogTitle>
        </DialogHeader>
        <div className="overflow-auto max-h-[70vh]">
          <ToolConfigForm
            tool={tool}
            config={config || undefined}
            onConfigChange={setConfig}
          />
        </div>
        <DialogFooter className="px-6 pb-4">
          {onDelete && <Button
            variant="link"
            size="icon"
            onClick={onDelete}
            className="rounded-md p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
            title="Remove tool"
          ><Trash2Icon size={18} /></Button>}
          <DialogClose asChild>
            <Button
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            >Cancel</Button>
          </DialogClose>
          <DialogClose asChild>
            <Button
              onClick={handleSave}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
            >{onSave ? 'Save' : 'Add'}</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
