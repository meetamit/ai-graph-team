"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Graph } from "@/lib/db/schema";
import { GraphJSON } from "@/lib/graphSchema";
import GraphTextEditor from "./graph-text-editor";
import GraphFlowEditor from "./graph-flow-editor";
import { Button } from "./ui/button";
import { Input } from "./ui/input";

export default function EditGraph({ graph }: { graph: Graph }) {
  (graph.data as GraphJSON).nodes.forEach((node, i) => {
    node.data = node.data || {};
    node.position = node.position || { x: 20 + ((i+1) % 3) * 80, y: 20 + i * 40 };
  });

  const router = useRouter();
  const [title, setTitle] = React.useState(graph.title);
  const [data, setData] = React.useState<GraphJSON>(graph.data as GraphJSON);
  const [saving, setSaving] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const isNew = graph.id === '';
  
  return (
    <div className="space-y-3">
      <h1 className="text-2xl font-semibold">{isNew ? 'New Graph' : `Edit: ${graph?.title}`}</h1>
      <Input
        value={title}
        placeholder="Title"
        onChange={(e) => setTitle(e.target.value)}
      />
      <GraphTextEditor initialValue={data} onChange={setData} />
      <div className="h-96 border border-primary rounded-md">
        <GraphFlowEditor initialValue={data} onChange={setData} />
      </div>

      <div className="flex gap-2">
        {isNew 
          ? <Button
              disabled={saving || !title}
              onClick={async () => {
                try {
                  setSaving(true);
                  setError(null);
                  const res = await fetch("/api/graph", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ title, data }),
                  });
                  if (!res.ok) throw new Error(await res.text());
                  const created = await res.json();
                  router.push(`/graph/${created.id}`);
                } catch (e: any) {
                  setError(e?.message ?? "Failed to save");
                } finally {
                  setSaving(false);
                }
              }}
            >
              {saving ? "Saving..." : "Create Graph"}
            </Button>
          : <Button
            disabled={saving}
            onClick={async () => {
              try {
                setSaving(true);
                setError(null);
                const res = await fetch(`/api/graph/${graph.id}`, {
                  method: "PUT",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ title, data }),
                });
                if (!res.ok) throw new Error(await res.text());
                router.refresh();
              } catch (e: any) {
                setError(e?.message ?? "Failed to save");
              } finally {
                setSaving(false);
              }
            }}
          >
            {saving ? "Saving..." : "Save"}
          </Button>
        }

        {!isNew && <Button
          variant="destructive"
          disabled={deleting}
          onClick={async () => {
            if (!confirm("Delete this graph?")) return;
            try {
              setDeleting(true);
              const res = await fetch(`/api/graph/${graph.id}`, { method: "DELETE" });
              if (!res.ok) throw new Error(await res.text());
              router.push("/graph");
            } catch (e: any) {
              setError(e?.message ?? "Failed to delete");
            } finally {
              setDeleting(false);
            }
          }}
        >
          {deleting ? "Deleting..." : "Delete"}
        </Button>}
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

    </div>
  );
}
