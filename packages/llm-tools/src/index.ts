"use client";

import { z } from 'zod';
import { supportedImageModels as imageModels } from '@ai-graph-team/llm-providers';

export { buildToolSettingsSchema, buildToolConfigSchema, buildToolConfig } from './utils';
export { zodFromSchema } from './json-schema-to-zod';

export type Tool = {
  id: string;
  label: string;
  icon: string;
  description: string;
  settings?: Record<string, any>;
  dependentSettings?: Record<string, Record<string, any>>;

  // Whether the tool should be executed immediately,within the same node step as 
  // the (Temporal) activity that received the tool call, instead of the default,
  // which executes it in a separate tool call step. The latter leads to more ranular
  // Temporal activity tracking, but the former is more efficient as it avoids passing
  // lots of data (e.g. the contents of a file to be written) between the Temporal
  // activities and the workflow that orchestrates them.
  executeInNodeStep?: boolean;
};

// The schema used to configure the tool in the node editor
export type ToolConfigSchema = {
  type: 'object';
  properties: {
    type: { type: 'string'; };
    name?: { type: 'string'; description: string };
    description?: { type: 'string'; description: string, default?: string };
    settings: ToolSettingsSchema;
  };
};

// Nested within ToolConfigSchema, the schema used to configure the tool's settings that will be passed to execute() function
export type ToolSettingsSchema = {
  type: 'object';
  properties: Record<string, any>;
  required: string[];
};

export const supportedTools: Tool[] = [
  { id: "collectUserInput", label: "Collect User Input", icon: "TextCursorInputIcon",
    description: 'Prompts the user for additional information or clarification during execution\nUse when: Node needs to ask the user questions or gather additional input beyond the initial prompt',
    settings: {
      name: z.string().describe('The internal name of the input'),
      prompt: z.string().describe('The prompt to ask the user for the input'),
      default: z.string().optional().describe('The default value for the input'),
    }
  },
  {
    id: "generateImage", label: "Generate Image", icon: "ImagePlusIcon",
    description: 'Generates images from text prompts using AI image generation models (DALL-E, Stable Diffusion, etc.)\nUse when: Node needs to create, generate, or produce images',
    settings: {
      model: z.enum(imageModels.map(model => model.name)).describe('The model to use for image generation').default('stable-diffusion-2-free'),
      prompt: z.string().describe('A detailed description of the image to generate'),
      filename: z.string().describe('The user-facing name of the image file').default('generated-image.png'),
    },
    dependentSettings: {
      model: {
        'stable-diffusion-2-free': {
          size: z.enum(['256x256', '512x512', '1024x1024']).describe('The size of the generated image').default('512x512'),
          steps: z.number().int().min(5).max(200).default(20).describe('The number of steps to generate the image'),
        },
        'dall-e-3': {
          size: z.enum(['1024x1024', '1792x1024', '1024x1792']).describe('The size of the generated image').default('1024x1024'),
          style: z.enum(['vivid', 'natural']).describe('The style of the image: vivid (hyper-real and dramatic) or natural (more natural, less hyper-real)').default('vivid'),
          quality: z.enum(['standard', 'hd']).describe('The quality of the image').default('standard'),    
        },
      }
    }
  },
  {
    id: "writeFile", label: "Write File", icon: "FilePenLineIcon",
    description: 'Saves content to a file (text, SVG, HTML, etc.)\nUse when: Node needs to persist generated content as a file',
    executeInNodeStep: true,
    settings: {
      filename: z.string().describe('The user-facing name of the file'),
      mediaType: z.string().describe('The media type of the file').default('text/plain').optional(),
      content: z.string().describe('The content of the file'),
    }
  },
  { id: "readFile", label: "Read File", icon: "FileOutputIcon",
    description: 'Read a file as text.',
    executeInNodeStep: true,
    settings: {
      fileId: z.string().describe('The id of the file to read'),
    }
  },
  { id: "extractUrlText", label: "Extract URL Text", icon: "GlobeIcon",
    description: 'Fetches and extracts text content from web URLs\nUse when: Node needs to read, scrape, or extract content from websites or web pages',
    settings: {
      url: z.string().describe('The URL to extract text from'),
      include_images: z.boolean().describe('Include a list of images extracted from the URLs in the response').default(true).optional(),
      include_favicon: z.boolean().describe('Whether to include the favicon URL for each result').default(true).optional(),
      format: z.enum(['markdown', 'text']).describe('The format of the extracted text').default('markdown').optional(),
    }
  },
  { id: "fetchUrl", label: "Fetch URL", icon: "DownloadIcon",
    description: 'Fetches data from a URL, supporting both JSON and plain text formats\nUse when: Node needs to retrieve raw data from an API endpoint or URL',
    settings: {
      url: z.string().describe('The URL to fetch data from'),
      format: z.enum(['json', 'text']).describe('The expected format of the response: json (parsed JSON object) or text (plain text)').default('text').optional(),
    }
  },
];

export const supportedToolsById: Record<string, Tool> = supportedTools.reduce((acc, tool) => {
  acc[tool.id] = tool;
  return acc;
}, {} as Record<string, Tool>);
