"use server";

import React from "react";
import { STARTER_GRAPH } from "@/lib/templates/starter";
import EditGraph from "@/components/edit-graph";

export default async function NewGraphPage() {
  return (
    <form
      className=""
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
