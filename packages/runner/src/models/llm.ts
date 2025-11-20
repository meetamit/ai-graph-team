import { openai } from '@ai-sdk/openai';
import { anthropic } from '@ai-sdk/anthropic';
import { LanguageModel } from 'ai';
import { ModelWithArgs, NodeStepInput } from '../activities';
// import { openaiModels, anthropicModels, type Model } from './llm-providers';
// import { openaiModels, anthropicModels, type Model } from '@ai-graph-team/llm-providers';
import { openaiModels, anthropicModels, type Provider } from '@ai-graph-team/llm-providers';

// export type Provider = 'openai' | 'anthropic';

export interface Model {
  name: string;
  provider: Provider;
  // you could add fields like `reasoning?: boolean`, `legacy?: boolean`, etc.
}

// const openaiModels = [], anthropicModels = [];

export const defaultModelId = 'gpt-4o-mini';

export const defaultArgs = {
  temperature: 0.7,
  maxTokens: 1000,
};

function hasModel(models: Model[], modelName: string): boolean {
  return models.some(m => m.name === modelName);
} 

// Get the appropriate provider's language model based on the model name
export function getProviderModel(modelName: string): LanguageModel {
  if (hasModel(openaiModels, modelName)) {
    return openai(modelName);
  } else if (hasModel(anthropicModels, modelName)) {
    return anthropic(modelName);
  } else {
    return openai(modelName); // Default to OpenAI if model not found in any list
  }
}

export default function llm({ input }: { input?: NodeStepInput } = {}): LanguageModel | ModelWithArgs {
  const model = input?.node?.model
  const modelName = typeof model === 'string' ? model : model?.name;
  return {
    model: getProviderModel(modelName || defaultModelId),
    args: {
      ...defaultArgs,
      ...(typeof model === 'object' ? model.args || {} : {}),
    },
  } as ModelWithArgs;
}
