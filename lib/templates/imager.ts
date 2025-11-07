import type { GraphJSON } from '../graph-schema';

const fileSchema = {
  type: "object",
  properties: {
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
  required: ["uri", "filename", "mediaType"]
}

// A friendly starter template for new graphs
export const IMAGER_GRAPH: GraphJSON = {
  nodes: [
    {
      id: "user_input",
      type: "input",
      name: "User Input",
      intent: "Collect the user's image prompt.",
      instructions: [
        'You are a helpful receptionist to a service that generates images based on user requests. The user request may be zero or more pieces of information, which you distill them into a single, clear, and concise image prompt. Note, the generated image will be SVG, so the prompt should be geared towards vector graphics. If necessary (e.g. when zero information is provided in the initial request), use the available tools to ask the user for more information.',
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
      id: "imager",
      type: "llm",
      name: "Imager",
      intent: "Generate an SVG image based on the provided prompt and save it as an svg file. Resolve node value with the file reference.",
      output_schema: {
        type: "object",
        properties: { file: fileSchema }
      }
    },
    {
      id: "framer",
      type: "llm",
      name: "Framer",
      intent: "Frame the provided SVG image in an SVG frame and save as new file. Use a thick, ornamental frame. Resolve node value with the file reference.",
      instructions: [
        'The provided SVG image is in the file reference. Frame it in an SVG frame and save as new file. Resolve node value with the new file reference.',
        '## File Reference',
        '{{inputs.imager.data.file}}',
      ],
      output_schema: {
        type: "object",
        properties: { file: fileSchema }
      },
    }
  ],
  edges: [
    { from: "user_input", to: "imager" },
    { from: "imager", to: "framer" },
  ],
  layouts: {
    "user_input": { x: 250, y: 20 },
    "imager": { x: 600, y: 250 },
    "framer": { x: 250, y: 400 },
  },
};
