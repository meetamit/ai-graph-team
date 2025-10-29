import type { GraphJSON } from '../graph-schema';

// A friendly starter template for new graphs
export const STARTER_GRAPH: GraphJSON = {
  nodes: [
    {
      id: "user_input",
      type: "input",
      name: "User Input",
      intent: `Collect the user's proposal/topic or question to be debated. Pass this text unchanged to downstream nodes.`,
    },
    {
      id: "position_for",
      type: "llm",
      name: "Position For",
      intent: `Given the user's proposal, argue IN FAVOR. Produce 3 concise points supporting the proposal, each 1–2 sentences.`,
    },
    {
      id: "position_against",
      type: "llm",
      name: "Position Against",
      intent: `Given the user's proposal, argue AGAINST it. Produce 3 concise points opposing the proposal, each 1–2 sentences.`,
    },
    {
      id: "judge",
      type: "llm",
      name: "Judge & Summary",
      intent: `Read the FOR and AGAINST points. Write a brief, neutral synthesis and declare which side is stronger (for/against/tie) with a one-sentence justification.`,
    },
  ],
  edges: [
    { from: "user_input", to: "position_for" },
    { from: "user_input", to: "position_against" },
    { from: "position_for", to: "judge" },
    { from: "position_against", to: "judge" },
  ],
  layouts: {
    "user_input": { x: 250, y: 20 },
    "position_for": { x: 50, y: 170 },
    "position_against": { x: 450, y: 170 },
    "judge": { x: 250, y: 320 },
  },
};

