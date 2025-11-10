import type { GraphJSON } from '../graph-schema';

const fileSchema = {
  type: "object",
  properties: {
    id: {
      type: "string",
      description: "The id of the file"
    },
    uri: {
      type: "string",
      description: "The URI of the file"
    },
    filename: {
      type: "string",
      description: "The filename of the file"
    },
    mediaType: {
      type: "string",
      description: "The media type of the file"
    },
  },
  required: ["id", "uri", "filename", "mediaType"]
}

// A friendly starter template for new graphs
export const IMAGE_GRAPH: GraphJSON = {
  nodes: [
    {
      id: "user_input",
      type: "input",
      name: "User Input",
      intent: "Collect the user's image prompt.",
      instructions: [
        'You are a helpful receptionist to a service that generates images based on user requests. The user request may be zero or more pieces of information, which you distill them into a single, clear, and concise image prompt. If necessary (e.g. when zero information is provided in the initial request), use the available tools to ask the user for more information.',
        '## User Input: {{prompt != null ? prompt : "No input provided"}}',
      ],
      output_schema: {
        type: "object",
        properties: {
          prompt: {
            type: "string",
            description: "The image prompt"
          },
          special_instructions: {
            type: "string",
            description: "Any special instructions for the image generation"
          }
        },
        required: ["prompt"]
      }
    },
    {
      id: "image_generator",
      type: "llm",
      name: "Imager",
      intent: "Generate an provided prompt.",
      output_schema: {
        type: "object",
        properties: { file: fileSchema }
      }
    },
  ],
  edges: [
    { from: "user_input", to: "image_generator" },
  ],
  layouts: {
    "user_input": { x: 250, y: 20 },
    "image_generator": { x: 600, y: 250 },
  },
};
