'use client';

import React from 'react';
import ReactMarkdown from 'react-markdown';
import { JsonView, allExpanded } from 'react-json-view-lite';
import { GraphNodeToolCallPart, GraphNodeToolResultPart, GraphNodeTextPart, GraphNodeMessageGroup } from '@/lib/graph-schema';

function tryParseJson(maybe: string): { ok: true; value: unknown } | { ok: false } {
  try {
    // tolerate extra whitespace / code fences
    const trimmed = maybe.trim();
    if (!trimmed) return { ok: false };
    // Basic guard: must start with { or [
    if (!/^[{\[]/.test(trimmed)) return { ok: false };
    return { ok: true, value: JSON.parse(trimmed) };
  } catch {
    return { ok: false };
  }
}

function TextOrJson({ text }: { text: string }) {
  const parsed = tryParseJson(text);
  if (parsed.ok) {
    return <ObjectInspector data={parsed.value as any} />;
  }
  return (
    <div className="text-xs [&_p]:my-1">
      <ReactMarkdown>{text}</ReactMarkdown>
    </div>
  );
}

function ToolCall({
  toolName,
  toolCallId,
  input,
}: {
  toolName: string;
  toolCallId: string;
  input: unknown;
}) {
  return (
    <div className="text-xs">
      <span className="mb-1 mr-2 text-xs uppercase tracking-wide">
        Tool Call
      </span>
      <span className="text-xs font-medium">
        {toolName} <span className="text-muted-foreground">({toolCallId})</span>
      </span>
      <ObjectInspector data={input as any} />
    </div>
  );
}

function ToolResult({
  toolName,
  toolCallId,
  output,
}: {
  toolName: string;
  toolCallId: string;
  output: unknown;
}) {
  return (
    <div className="text-xs">
      <span className="mb-1 mr-2 text-xs uppercase tracking-wide">
        Tool Result
      </span>
      <span className="text-xs font-medium">
        {toolName} <span className="text-muted-foreground">({toolCallId})</span>
      </span>
      <ObjectInspector data={output as any} />
    </div>
  );
}

function renderContentItem(
  item: GraphNodeToolCallPart | GraphNodeToolResultPart | GraphNodeTextPart, 
  idx: number
) {
  switch (item.type) {
    case 'text':
      return (
        <div key={idx} className="my-1">
          <TextOrJson text={item.text} />
        </div>
      );
    case 'tool-call':
      return (
        <div key={idx} className="my-1">
          <ToolCall toolName={item.toolName} toolCallId={item.toolCallId} input={item.input} />
        </div>
      );
    case 'tool-result':
      // Some tool payloads wrap content like { type: 'json', value: {...} }
      const normalized =
        (item as any)?.output && typeof (item as any).output === 'object'
          ? (item as any).output
          : item.output;
      return (
        <div key={idx} className="my-1">
          <ToolResult toolName={item.toolName} toolCallId={item.toolCallId} output={normalized} />
        </div>
      );
    default:
      return (
        <p key={idx} className="my-1 text-xs text-muted-foreground">
          Unsupported content item
        </p>
      );
  }
}

function ObjectInspector({ data }: { data: unknown }) {
  return (
    <div className="text-xs mx-[-.5rem] my-1">
      <JsonView data={data as any} shouldExpandNode={allExpanded} />
    </div>
  );
}

export default function MessagesLog({ messageGroups }: { messageGroups: GraphNodeMessageGroup[] }) {
  return (
    <div className="space-y-4">
      {messageGroups.map((group, groupIndex) => (
        <div key={groupIndex} className="pb-4 border-dashed border-b-2">
          
          <div className="space-y-3">
            {group.messages.map((m, i) => {
              const isArray = Array.isArray(m.content);
              return (
                <section key={i} className="rounded border p-2 bg-white">
                  <header className="mb-2">
                    <span className="inline-flex text-xs font-semibold uppercase tracking-wide">
                      {m.role}
                    </span>
                  </header>

                  {/* Each entry in message.content as its own element */}
                  {isArray ? (
                    <div>{(m.content as any[]).map((c, idx) => renderContentItem(c, idx))}</div>
                  ) : (
                    // content is a string (e.g., system message)
                    <div className="my-1">
                      <TextOrJson text={String(m.content)} />
                    </div>
                  )}
                </section>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
