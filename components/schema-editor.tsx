"use client";
import { useEffect, useState, useCallback } from "react";
import dynamic from "next/dynamic";
import { json } from "@codemirror/lang-json";
import { z } from "zod";

// Use dynamic import so SSR doesn't choke on window
const CodeMirror = dynamic(() => import("@uiw/react-codemirror"), { ssr: false });

type Props = {
  value: any;
  onChange: (value: any) => void;
  className?: string;
};

export default function SchemaEditor({ value, onChange, className }: Props) {
  const [text, setText] = useState(() => {
    if (value === undefined || value === null) {
      return "";
    }
    return JSON.stringify(value, null, 2);
  });
  const [error, setError] = useState<string | null>(null);

  // Sync state when value prop changes
  useEffect(() => {
    if (value === undefined || value === null) {
      setText("");
    } else {
      setText(JSON.stringify(value, null, 2));
    }
  }, [value]);

  const handleChange = useCallback((value: string) => {
    setText(value);
    
    if (value.trim() === "") {
      setError(null);
      onChange(undefined);
      return;
    }

    try {
      const parsed = JSON.parse(value);
      setError(null);
      onChange(parsed);
    } catch (e) {
      if (e instanceof SyntaxError) {
        setError(e.message);
      } else {
        setError("Invalid JSON");
      }
    }
  }, [onChange]);

  return (
    <div className={`${className} relative`}>
      <CodeMirror
        value={text}
        height="120px"
        style={{ height: "120px" }}
        extensions={[json()]}
        onChange={handleChange}
        basicSetup={{ 
          lineNumbers: false, 
          bracketMatching: true, 
          autocompletion: true,
          foldGutter: false,
          dropCursor: false,
          allowMultipleSelections: false,
          indentOnInput: true,
          bracketMatching: true,
          closeBrackets: true,
          autocompletion: true,
          highlightSelectionMatches: false
        }}
      />
      {error && (
        <div className="absolute top-0 left-0 right-0 bg-white bg-opacity-90 p-1 border-b border-gray-200">
          <p className="text-xs text-red-600">
            {error}
          </p>
        </div>
      )}
    </div>
  );
}
