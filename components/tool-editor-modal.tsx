"use client";
import { useState, useEffect } from "react";
import { XIcon } from "lucide-react";
import dynamic from "next/dynamic";
import { json } from "@codemirror/lang-json";

// Use dynamic import so SSR doesn't choke on window
const CodeMirror = dynamic(() => import("@uiw/react-codemirror"), { ssr: false });

type Props = {
  toolLabel: string;
  initialConfig?: { input?: Record<string, any>; default?: Record<string, any> };
  onSave: (config: { input?: Record<string, any>; default?: Record<string, any> } | null) => void;
  onClose: () => void;
};

export default function ToolEditorModal({ toolLabel, initialConfig, onSave, onClose }: Props) {
  const initialText = initialConfig 
    ? JSON.stringify(initialConfig, null, 2)
    : "{\n  \n}";
  
  const [text, setText] = useState(initialText);
  const [error, setError] = useState<string | null>(null);

  const handleSave = () => {
    try {
      const parsed = JSON.parse(text);
      
      // If the object is empty or only has whitespace, treat as null (string reference)
      if (Object.keys(parsed).length === 0) {
        onSave(null);
      } else {
        // Validate that only input and default are present
        const validKeys = Object.keys(parsed).filter(key => key === 'input' || key === 'default');
        if (validKeys.length === 0) {
          onSave(null);
        } else {
          const config: { input?: Record<string, any>; default?: Record<string, any> } = {};
          if (parsed.input) config.input = parsed.input;
          if (parsed.default) config.default = parsed.default;
          onSave(config);
        }
      }
    } catch (e) {
      if (e instanceof SyntaxError) {
        setError("Invalid JSON: " + e.message);
      } else {
        setError("Unknown error");
      }
    }
  };

  const handleChange = (value: string) => {
    setText(value);
    setError(null);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-[600px] max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold">
            Edit Tool: {toolLabel}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <XIcon size={20} />
          </button>
        </div>
        
        <div className="flex-1 overflow-hidden p-4">
          <p className="text-sm text-gray-600 mb-3">
            Define optional <code className="bg-gray-100 px-1 py-0.5 rounded">input</code> (fixed values) and{" "}
            <code className="bg-gray-100 px-1 py-0.5 rounded">default</code> (suggested values) for this tool.
            Leave empty to use the tool with no customization.
          </p>
          
          <div className="border border-gray-300 rounded-md overflow-hidden" style={{ height: "300px" }}>
            <CodeMirror
              value={text}
              height="300px"
              extensions={[json()]}
              onChange={handleChange}
              basicSetup={{ lineNumbers: true, bracketMatching: true, autocompletion: true }}
            />
          </div>
          
          {error && (
            <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}
        </div>
        
        <div className="flex items-center justify-end gap-2 p-4 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

