export type Provider = 'openai' | 'anthropic';

export interface Model {
  name: string;
  provider: Provider;
  category: string;
  comment: string;
  categoryComment: string;
  // you could add fields like `reasoning?: boolean`, `legacy?: boolean`, etc.
}

/**
* OpenAI – main text / multimodal / reasoning models
* As of ~Nov 2025. Includes current + important legacy ones.
*/
export const openaiModels: Model[] = [
 {
   // GPT-5.x – reasoning-centric series
   category: 'gpt-5.x',
   comment: 'reasoning-centric series',
   models: [
     { name: 'gpt-5.1',    comment: 'flagship reasoning / agents' }, // :contentReference[oaicite:1]{index=1}
     { name: 'gpt-5',      comment: 'earlier GPT-5 reasoning model' }, // :contentReference[oaicite:2]{index=2}
     { name: 'gpt-5-mini', comment: 'cheaper reasoning variant' }, // :contentReference[oaicite:3]{index=3}
     { name: 'gpt-5-nano', comment: 'fastest / cheapest reasoning variant' }, // :contentReference[oaicite:4]{index=4}
   ],
 },
 {
   // GPT-4.1 family – non-reasoning flagships
   category: 'gpt-4.1',
   comment: 'non-reasoning flagships',
   models: [
     { name: 'gpt-4.1',      comment: 'main non-reasoning flagship' }, // :contentReference[oaicite:5]{index=5}
     { name: 'gpt-4.1-mini', comment: 'power / cost balance' }, // :contentReference[oaicite:6]{index=6}
     { name: 'gpt-4.1-nano', comment: 'speed / cost optimized' }, // :contentReference[oaicite:7]{index=7}
   ],
 },
 {
   // GPT-4o family – multimodal workhorses (still useful esp. for audio)
   category: 'gpt-4o',
   comment: 'multimodal workhorses (esp. for audio)',
   models: [
     { name: 'gpt-4o',      comment: 'general multimodal + audio support' }, // :contentReference[oaicite:8]{index=8}
     { name: 'gpt-4o-mini', comment: 'cheaper multimodal (text+image+audio)' }, // :contentReference[oaicite:9]{index=9}
   ],
 },
 {
   // o-series – o1 family reasoning models
   category: 'o-series',
   comment: 'o1 family reasoning',
   models: [
     { name: 'o1-pro',     comment: 'high-end o1 reasoning' }, // :contentReference[oaicite:11]{index=11}
     { name: 'o1',         comment: 'standard o1 reasoning' }, // :contentReference[oaicite:12]{index=12}
     { name: 'o1-mini',    comment: 'cheaper o1-family reasoning' }, // :contentReference[oaicite:13]{index=13}
     { name: 'o1-preview', comment: 'older o1 preview id' }, // :contentReference[oaicite:14]{index=14}
   ],
 },
 {
   // o3 / o4 series – older reasoning models, mostly superseded but still live in API
   category: 'o3/o4',
   comment: 'older reasoning models (superseded by newer series)',
   models: [
     { name: 'o3',      comment: 'superseded by newer reasoning models' }, // :contentReference[oaicite:15]{index=15}
     { name: 'o3-pro',  comment: 'higher-compute o3' }, // :contentReference[oaicite:16]{index=16}
     { name: 'o4-mini', comment: 'legacy small reasoning model' }, // :contentReference[oaicite:17]{index=17}
   ],
 },
 {
   // Open-weight GPT models (via OpenAI “open models”)
   category: 'gpt-oss',
   comment: 'open-weight GPT models via OpenAI “open models”',
   models: [
     { name: 'gpt-oss-120b', comment: 'open-weight, MoE' }, // :contentReference[oaicite:18]{index=18}
     { name: 'gpt-oss-20b',  comment: 'smaller open-weight' }, // :contentReference[oaicite:19]{index=19}
   ],
 },
].flatMap(({ category, comment, models }) =>
 models.map(model => ({
   ...model,
   category,
   categoryComment: comment,
   provider: 'openai',
 }))
);

/**
* Anthropic – Claude models
* Includes Claude 4.5 / Opus 4.1 plus important 4.x / 3.x snapshots.
* IDs here are the *Claude API model ids*, not Bedrock/Vertex ids.
*/
export const anthropicModels: Model[] = [
 {
   // Latest Claude 4.5 – current recommended family
   category: 'claude-4.5',
   comment: 'latest Claude 4.5 family',
   models: [
     { name: 'claude-sonnet-4-5-20250929', comment: 'alias: claude-sonnet-4-5' }, // :contentReference[oaicite:20]{index=20}
     { name: 'claude-haiku-4-5-20251001',  comment: 'alias: claude-haiku-4-5' }, // :contentReference[oaicite:21]{index=21}
   ],
 },
 {
   // Claude 4 & 3.7 – “legacy but still recommended to migrate away from”
   category: 'claude-4 / 3.7',
   comment: 'Claude 4 & 3.7 (older but still in use)',
   models: [
     { name: 'claude-sonnet-4-20250514',   comment: 'alias: claude-sonnet-4-0' }, // :contentReference[oaicite:23]{index=23}
     { name: 'claude-opus-4-20250514',     comment: 'alias: claude-opus-4-0' }, // :contentReference[oaicite:24]{index=24}
     { name: 'claude-3-7-sonnet-20250219', comment: 'alias: claude-3-7-sonnet-latest' }, // :contentReference[oaicite:25]{index=25}
   ],
 },
 {
   // Claude 3.5 family (still widely used; some now marked “legacy”)
   category: 'claude-3.5',
   comment: 'Claude 3.5 family (widely used)',
   models: [
     { name: 'claude-3-5-sonnet-20241022', comment: 'popular mid-tier model' }, // :contentReference[oaicite:26]{index=26}
     { name: 'claude-3-5-haiku-20241022',  comment: 'alias: claude-3-5-haiku-latest' }, // :contentReference[oaicite:27]{index=27}
   ],
 },
 {
   // Claude 3 family – older but still present in lots of code
   category: 'claude-3',
   comment: 'Claude 3 family (older, legacy)',
   models: [
     { name: 'claude-3-opus-20240229',   comment: 'Claude 3 Opus snapshot' },
     { name: 'claude-3-sonnet-20240229', comment: 'Claude 3 Sonnet snapshot' },
     { name: 'claude-3-haiku-20240307',  comment: 'still listed as legacy' }, // :contentReference[oaicite:28]{index=28}
   ],
 },
].flatMap(({ category, comment, models }) =>
 models.map(model => ({
   ...model,
   category,
   categoryComment: comment,
   provider: 'anthropic',
 }))
);

// Master list of all supported models
export const supportedModels: Model[] = [...openaiModels, ...anthropicModels];

// Image models
export type ImageProvider = 'stable-diffusion-webui' | 'openai';

export type ImageModel = {
  name: string;
  provider: ImageProvider;
  category: string;
  comment: string;
}

export const openaiImageModels: ImageModel[] = [
  {
    name: 'dall-e-3',
    provider: 'openai',
    category: 'OpenAI Image Generation',
    comment: 'DALL-E 3',
  },
];

export const stableDiffusionWebuiImageModels: ImageModel[] = [
  {
    name: 'stable-diffusion-2-free',
    provider: 'stable-diffusion-webui',
    category: 'Local Image Generation',
    comment: 'Stable Diffusion v2 — Free',
  },
];

export const supportedImageModels: ImageModel[] = [...openaiImageModels, ...stableDiffusionWebuiImageModels];

export function hasModel(models: { name: string }[], modelName: string): boolean {
  return models.some(m => m.name === modelName);
} 
