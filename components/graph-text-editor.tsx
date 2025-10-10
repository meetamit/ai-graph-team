"use client";
import { useEffect, useState, useCallback } from "react";
import dynamic from "next/dynamic";
import { json } from "@codemirror/lang-json";
import { GraphSchema, GraphJSON } from "@/lib/graphSchema";
import { z } from "zod";

// Use dynamic import so SSR doesn't choke on window
const CodeMirror = dynamic(() => import("@uiw/react-codemirror"), { ssr: false });

type Props = {
  initialValue: GraphJSON;
  onChange?: (value: GraphJSON) => void;
  className?: string;
};

export default function GraphEditor({ initialValue, onChange, className }: Props) {
  const [text, setText] = useState(() => JSON.stringify(initialValue, null, 2));
  const [error, setError] = useState<string | null>(null);

  // Sync state when initialValue prop changes
  useEffect(() => {
    setText(JSON.stringify(initialValue, null, 2));
  }, [initialValue]);

  const handleChange = useCallback((value: string) => {
    setText(value);
    try {
      const parsed = JSON.parse(value);
      const validated = GraphSchema.parse(parsed);
      setError(null);
      onChange?.(validated);
    } catch (e) {
      if (e instanceof z.ZodError) {
        setError(e.issues.map(i => `${i.path.join(".")}: ${i.message}`).join("\n"));
      } else if (e instanceof SyntaxError) {
        setError(e.message);
      } else {
        setError("Unknown error");
      }
    }
  }, [onChange]);

  return (
    <div className={className}>
      <CodeMirror
        value={text}
        height="400px"
        extensions={[json()]}
        onChange={handleChange}
        basicSetup={{ lineNumbers: true, bracketMatching: true, autocompletion: true }}
      />
      {error && (
        <p className="mt-2 whitespace-pre-wrap text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
