import { customProvider, ImageModel } from 'ai';

export function stableDiffusionWebuiProvider({ baseURL }: { baseURL: string } = {
  baseURL: 'http://localhost:7860',
}) {
  const modelId = 'stable-diffusion-2-free';
  const provider = modelId;
  const imageModels: Record<string, ImageModel> = {
    [modelId]: {
      provider, modelId,
      maxImagesPerCall: 1,
      specificationVersion: 'v3',

      async doGenerate(options) {
        const { prompt, n = 1, size, seed, providerOptions } = options;

        // build payload for WebUI API
        const payload: any = {
          prompt,
          steps: providerOptions?.webui?.steps ?? 15,//100,//20,
          width: parseInt(size?.split('x')[0] ?? '512'),
          height: parseInt(size?.split('x')[1] ?? '512'),
          seed: seed ?? undefined,
          // add other parameters as needed
        };

        const resp = await fetch(`${baseURL}/sdapi/v1/txt2img`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (!resp.ok) {
          throw new Error(`WebUI API failed: ${resp.statusText}`);
        }
        const json: any = await resp.json();
        // WebUI returns e.g. { images: ["<base64>"], parameters: {...}, info: "..." }
        const images = json.images

        return {
          images,
          warnings: [],
          providerMetadata: {
            [provider]: { modelId: this.modelId, images }
          },
          response: { modelId, headers: {}, timestamp: new Date() },
        };
      },
    }
  }
  return customProvider({ imageModels });
}

const provider = stableDiffusionWebuiProvider();
export function stableDiffusionWebui(modeName: string) {
  return provider.imageModel(modeName);
}
