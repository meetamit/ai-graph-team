"use client";

import { useState, useEffect } from "react";
import { PlusIcon, XIcon } from "lucide-react";
import { Label } from "./ui/label";
import { Button } from "./ui/button";

interface InstructionsInputProps {
  instructions: string[];
  onChange: (instructions: string[]) => void;
}

export default function InstructionsInput({ instructions, onChange }: InstructionsInputProps) {
  const [localInstructions, setLocalInstructions] = useState<string[]>(instructions || []);

  // Update local state when instructions prop changes
  useEffect(() => {
    setLocalInstructions(instructions || []);
  }, [instructions]);

  const handleInstructionChange = (index: number, value: string) => {
    const newInstructions = [...localInstructions];
    newInstructions[index] = value;
    setLocalInstructions(newInstructions);
    onChange(newInstructions);
  };

  const addInstruction = () => {
    const newInstructions = [...localInstructions, ""];
    setLocalInstructions(newInstructions);
    onChange(newInstructions);
  };

  const removeInstruction = (index: number) => {
    const newInstructions = localInstructions.filter((_, i) => i !== index);
    setLocalInstructions(newInstructions);
    onChange(newInstructions);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium text-gray-700">
          Instructions
        </Label>
        <Button
          type="button"
          onClick={addInstruction}
          size="sm"
          variant="ghost"
        >
          <PlusIcon size={12} />
        </Button>
      </div>

      {localInstructions.length === 0 ? (
        <div className="text-sm text-gray-500 italic">
          No instructions added yet. Click <span className="inline-block vertical-top mx-[.2em] mb-[-1px]"><PlusIcon size={12} /></span>to get started.
        </div>
      ) : (
        <div className="space-y-3">
          {localInstructions.map((instruction, index) => (
            <div key={index} className="relative">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-gray-500">Instruction {index + 1}</span>
                <button
                  type="button"
                  onClick={() => removeInstruction(index)}
                  className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                  title="Remove instruction"
                >
                  <XIcon size={14} />
                </button>
              </div>
              <textarea
                value={instruction}
                onChange={(e) => handleInstructionChange(index, e.target.value)}
                placeholder="Enter instruction..."
                className="w-full min-h-[80px] px-3 py-2 text-sm border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-vertical"
                rows={3}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
