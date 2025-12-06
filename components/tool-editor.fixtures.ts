import type { NodeToolConfig } from '@/lib/graph-schema';

// No initial config (empty configuration)
export const emptyConfig: NodeToolConfig = { type: "Empty" };
export const noConfig = undefined;

export const generateImageWithGivenFilenameAndSize = {
  type: "generateImage",
  settings: {
    filename: { value: "anime.png" },
    size: { value: "1792x1024" },
  }
};

export const writeFileWithGivensAndDefaults = {
  type: "Write File",
  settings: {
    filename: { value: "output.txt" },
    mediaType: { value: "text/plain" },
    content: { default: "This is the default content" }
  }
};

