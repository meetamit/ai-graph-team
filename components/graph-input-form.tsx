"use client";

import { NeededInput, ProvidedInput } from "@/lib/graphSchema";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Button } from "./ui/button";
import { useState } from "react";

interface GraphInputFormProps {
  neededInput: NeededInput[];
  onSubmit: (inputs: ProvidedInput[]) => void;
  onCancel?: () => void;
}

export default function GraphInputForm({ neededInput, onSubmit, onCancel }: GraphInputFormProps) {
  const [inputs, setInputs] = useState<Record<string, string>>(() => {
    const initialInputs: Record<string, string> = {};
    neededInput.forEach((input) => {
      initialInputs[input.name] = input.default || "";
    });
    return initialInputs;
  });

  const handleInputChange = (name: string, value: string) => {
    setInputs(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(neededInput.map(i => ({ for: i, value: inputs[i.name], nodeId: i.nodeId })));
  };

  if (neededInput.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4 p-4 border border-primary rounded-md bg-muted/50" data-testid="graph-input-form">
      <h2 className="text-lg font-semibold">Required Inputs</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        {neededInput.map((input) => (
          <div key={input.name} className="space-y-2" data-testid="input-field" data-input-name={input.name}>
            <Label htmlFor={input.name} className="text-sm font-medium">
              {input.prompt}
            </Label>
            <Input
              id={input.name}
              name={input.name}
              type="text"
              value={inputs[input.name] || ""}
              onChange={(e) => handleInputChange(input.name, e.target.value)}
              placeholder={input.default ? `Default: ${input.default}` : "Enter value..."}
              className="w-full"
            />
          </div>
        ))}
        
        <div className="flex gap-2 pt-2">
          <Button type="submit" className="flex-1">
            Submit Inputs
          </Button>
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}
