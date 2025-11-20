"use client";

import { useState, useEffect } from "react";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import InstructionsInput from "./instructions-input";
import SchemaEditor from "./schema-editor";
import ToolsInput from "./tools-input";
import ModelInput from "./model-input";
import type { NodeToolConfig, NodeModelConfig } from "@/lib/graph-schema";

interface NodeEditorProps {
  node: {
    id: string;
    type: 'input' | 'llm' | 'router';
    name: string;
    intent?: string;
    instructions?: string[];
    output_schema?: any;
    tools?: Array<string | NodeToolConfig>;
    model?: string | NodeModelConfig;
  };
  onChange: (updatedNode: {
    id: string;
    type: 'input' | 'llm' | 'router';
    name: string;
    intent?: string;
    instructions?: string[];
    output_schema?: any;
    tools?: Array<string | NodeToolConfig>;
    model?: string | NodeModelConfig;
  }) => void;
}

export default function NodeEditor({ node, onChange }: NodeEditorProps) {
  const [name, setName] = useState(node.name);
  const [intent, setIntent] = useState(node.intent || "");
  const [instructions, setInstructions] = useState(node.instructions || []);
  const [outputSchema, setOutputSchema] = useState(node.output_schema);
  const [tools, setTools] = useState(node.tools || []);
  const [model, setModel] = useState(node.model);

  // Update local state when node prop changes
  useEffect(() => {
    setName(node.name);
    setIntent(node.intent || "");
    setInstructions(node.instructions || []);
    setOutputSchema(node.output_schema);
    setTools(node.tools || []);
    setModel(node.model);
  }, [node.id, node.name, node.intent, node.instructions, node.output_schema, node.tools, node.model]);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newName = e.target.value;
    setName(newName);
    onChange({
      ...node,
      name: newName,
    });
  };

  const handleIntentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newIntent = e.target.value;
    setIntent(newIntent);
    onChange({
      ...node,
      intent: newIntent,
    });
  };

  const handleInstructionsChange = (newInstructions: string[]) => {
    setInstructions(newInstructions);
    onChange({
      ...node,
      instructions: newInstructions,
    });
  };

  const handleOutputSchemaChange = (newOutputSchema: any) => {
    setOutputSchema(newOutputSchema);
    onChange({
      ...node,
      output_schema: newOutputSchema,
    });
  };

  const handleToolsChange = (newTools: Array<string | NodeToolConfig>) => {
    setTools(newTools);
    onChange({
      ...node,
      tools: newTools,
    });
  };

  const handleModelChange = (newModel?: string | NodeModelConfig) => {
    setModel(newModel);
    onChange({
      ...node,
      model: newModel,
    });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="node-name" className="text-sm font-medium text-gray-700">
          Name
        </Label>
        <Input
          id="node-name"
          value={name}
          onChange={handleNameChange}
          placeholder="Enter node name"
          className="w-full"
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="node-intent" className="text-sm font-medium text-gray-700">
          Intent
        </Label>
        <textarea
          id="node-intent"
          value={intent}
          onChange={handleIntentChange}
          placeholder="Describe what this node should do..."
          className="w-full min-h-[100px] px-3 py-2 text-sm border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-vertical"
          rows={4}
        />
      </div>

      <InstructionsInput
        instructions={instructions}
        onChange={handleInstructionsChange}
      />

      <div className="space-y-2">
        <ToolsInput
          tools={tools}
          onChange={handleToolsChange}
        />
      </div>

      <ModelInput
        value={model}
        onChange={handleModelChange}
      />

      <div className="space-y-2">
        <Label htmlFor="node-output-schema" className="text-sm font-medium text-gray-700">
          Output Schema (JSON)
        </Label>
        <SchemaEditor
          value={outputSchema}
          onChange={handleOutputSchemaChange}
          className="border border-gray-300 rounded-md"
        />
      </div>
    </div>
  );
}
