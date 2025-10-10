"use server";

import React from "react";
import { STARTER_GRAPH } from "@/lib/graphSchema";
import EditGraph from "@/components/edit-graph";

export default async function NewGraphPage() {
  return (
    <form
      className="max-w-3xl mx-auto p-6 space-y-4"
    >
      <EditGraph graph={{
        id: '',
        data: STARTER_GRAPH,
        title: '',
        ownerId: '',
        createdAt: new Date(),
        updatedAt: new Date(),
      }} />
    </form>
  );
}
