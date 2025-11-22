import { type ImageModel } from 'ai';
import { openai } from '@ai-sdk/openai';
import { stableDiffusionWebui } from '@ai-graph-team/stable-diffusion-webui';
import { hasModel, openaiImageModels, stableDiffusionWebuiImageModels } from '@ai-graph-team/llm-providers';
import { NodeModelConfig } from '../types';

const defaultModelId = 'stable-diffusion-2-free';

export default function diffusionModel(model: string | NodeModelConfig): ImageModel {
  const modelName = (typeof model === 'string' ? model : model?.name) || defaultModelId;

  if (hasModel(openaiImageModels, modelName)) {
    return openai.image(modelName);
  } else if (hasModel(stableDiffusionWebuiImageModels, modelName)) {
    return stableDiffusionWebui(modelName);
  } else {
    throw new Error(`Unknown image model: ${modelName}`);
  }
}
