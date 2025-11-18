"use client";

import * as React from "react";
import { useState, useEffect, useMemo } from "react";
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { Label } from "./ui/label";
import SchemaEditor from "./schema-editor";
import { supportedModels } from '@ai-graph-team/llm-providers';
import type { NodeModelConfig } from "@/lib/graph-schema";

type Props = {
  value?: string | NodeModelConfig;
  onChange: (value?: string | NodeModelConfig) => void;
};

export default function ModelInput({ value, onChange }: Props) {
  // Normalize the current model name and args
  const currentModelName = typeof value === 'string' ? value : value?.name || '';
  const currentArgs = typeof value === 'object' ? value?.args : undefined;

  const [modelName, setModelName] = useState(currentModelName);
  const [args, setArgs] = useState<Record<string, any> | undefined>(currentArgs);
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  // Sync state when value prop changes
  useEffect(() => {
    const newModelName = typeof value === 'string' ? value : value?.name || '';
    const newArgs = typeof value === 'object' ? value?.args : undefined;
    setModelName(newModelName);
    setArgs(newArgs);
  }, [value]);

  // Filter models based on search term
  const filteredModels = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return supportedModels;
    return supportedModels.filter((m: any) => {
      const haystack = `${m.name} ${m.comment ?? ''} ${m.category ?? ''} ${m.provider ?? ''}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [searchTerm]);

  const handleModelSelect = (modelName: string) => {
    setModelName(modelName);
    setSearchTerm('');
    
    // Update parent with appropriate value
    if (args && Object.keys(args).length > 0) {
      onChange({ name: modelName, args });
    } else if (modelName) {
      onChange(modelName);
    } else {
      onChange(undefined);
    }
  };

  const handleArgsChange = (newArgs: any) => {
    setArgs(newArgs);
    
    // Update parent with appropriate value
    if (newArgs && Object.keys(newArgs).length > 0) {
      if (modelName) {
        onChange({ name: modelName, args: newArgs });
      } else {
        // If there are args but no model, just keep the args in state
        // but don't propagate until a model is selected
      }
    } else {
      // No args - use string format or undefined
      if (modelName) {
        onChange(modelName);
      } else {
        onChange(undefined);
      }
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-1 text-sm">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium text-gray-700">
            Model
          </Label>

          <DropdownMenu.Root open={isOpen} onOpenChange={setIsOpen}>
            <DropdownMenu.Trigger asChild>
              <button
                type="button"
                className="flex h-9 items-center justify-between rounded-md border border-neutral-300 bg-white px-3 text-sm text-neutral-900 shadow-sm hover:bg-neutral-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              >
                <span className="truncate">
                  {modelName || "Select a model..."}
                </span>
                <ChevronUpDownIcon className="ml-2 h-4 w-4 text-neutral-400" />
              </button>
            </DropdownMenu.Trigger>

            <DropdownMenu.Portal>
              <DropdownMenu.Content
                sideOffset={4}
                align="start"
                className="rounded-md border border-neutral-200 bg-white shadow-lg z-50"
              >
                {/* Search box */}
                <div className="px-2 py-2">
                  <input
                    autoFocus
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search models…"
                    className="w-full rounded-md border border-neutral-200 px-2 py-1 text-xs outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <DropdownMenu.Separator className="h-px bg-neutral-200" />

                {/* List */}
                <div className="max-h-72 overflow-y-auto py-1">
                  {filteredModels.length === 0 && (
                    <div className="px-3 py-2 text-xs text-neutral-500">
                      No models found.
                    </div>
                  )}

                  {(filteredModels as any[]).map((m) => {
                    const isSelected = m.name === modelName;
                    return (
                      <DropdownMenu.Item
                        key={m.provider + ':' + m.name}
                        onSelect={() => {
                          handleModelSelect(m.name);
                          setIsOpen(false);
                        }}
                        className="flex cursor-pointer items-start gap-2 px-3 py-2 text-sm outline-none data-[highlighted]:bg-neutral-100"
                      >
                        {/* Left: selected checkmark */}
                        <div className="mt-[2px] h-4 w-4 flex-shrink-0">
                          {isSelected && <CheckIcon className="h-4 w-4 text-blue-600" />}
                        </div>

                        {/* Right: name + comment */}
                        <div className="flex flex-col">
                          <span className="font-medium leading-tight">{m.name}</span>
                          {m.comment && (
                            <span className="text-xs text-neutral-500">
                              {m.comment}{`${m.name} ${m.comment ?? ''} ${m.category ?? ''} ${m.provider ?? ''}`}
                            </span>
                          )}
                        </div>
                      </DropdownMenu.Item>
                    );
                  })}
                </div>
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        </div>
        
      </div>

      {/* Args editor - only show if model is selected or args exist */}
      {(modelName || args) && (
        <div className="space-y-2">
          <Label htmlFor="model-args" className="text-sm font-medium text-gray-700">
            Model Arguments (JSON) <span className="text-gray-400 font-normal">- optional</span>
          </Label>
          <SchemaEditor
            value={args}
            onChange={handleArgsChange}
            className="border border-gray-300 rounded-md"
          />
          <p className="text-xs text-gray-500">
            Optional model-specific arguments like temperature, maxTokens, etc.
          </p>
        </div>
      )}
    </div>
  );
}

/* Small inline icons */

function ChevronUpDownIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" {...props}>
      <path
        d="M6 8l4-4 4 4M6 12l4 4 4-4"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CheckIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" {...props}>
      <path
        d="M5 11l3 3 7-7"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.7}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
