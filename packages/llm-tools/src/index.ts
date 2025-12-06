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
    description: 'Prompt the user for an input',
    settings: {
      name: z.string().describe('The internal name of the input'),
      prompt: z.string().describe('The prompt to ask the user for the input'),
      default: z.string().optional().describe('The default value for the input'),
    }
  },
  {
    id: "generateImage", label: "Generate Image", icon: "ImagePlusIcon",
    description: 'Generate an image using AI based on a text prompt',
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
    description: 'Create a file',
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
    description: 'Extract text from a URL',
    settings: {
      url: z.string().describe('The URL to extract text from'),
      include_images: z.boolean().describe('Include a list of images extracted from the URLs in the response').default(true).optional(),
      include_favicon: z.boolean().describe('Whether to include the favicon URL for each result').default(true).optional(),
      format: z.enum(['markdown', 'text']).describe('The format of the extracted text').default('markdown').optional(),
    }
  },
];

export const supportedToolsById: Record<string, Tool> = supportedTools.reduce((acc, tool) => {
  acc[tool.id] = tool;
  return acc;
}, {} as Record<string, Tool>);
