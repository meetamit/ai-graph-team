import { z } from 'zod';
import type { NodeToolConfig } from '@/lib/graph-schema';

// No initial config (empty configuration)
export const emptyConfig: NodeToolConfig = { name: "Empty" };
export const noConfig = undefined;

export const generateImageWithGivenFilenameAndSize = {
  name: "Generate Image",
  config: {
    filename: { value: "anime.png" },
    size: { value: "1792x1024" },
  }
};

export const writeFileWithGivensAndDefaults = {
  name: "Write File",
  config: {
    filename: { value: "output.txt" },
    mediaType: { value: "text/plain" },
    content: { default: "This is the default content" }
  }
};

