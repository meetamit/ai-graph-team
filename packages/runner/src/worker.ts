
import { Worker, NativeConnection } from '@temporalio/worker';
import { LanguageModel } from 'ai';
import { openai } from '@ai-sdk/openai';
import { llm, simple, withUserInput, withImageGen, testImageGenModel } from './models';
import { createActivities, NodeStepInput, ModelWithArgs } from './activities';
import dotenv from 'dotenv';
dotenv.config({quiet: true});

async function run() {
  const connection = await NativeConnection.connect({
    address: process.env.TEMPORAL_ADDRESS,
  });

  const model = (kind: string, input?: NodeStepInput): LanguageModel | ModelWithArgs => {
    switch (kind) {
      case 'test':     return withUserInput({ input, delay: 0 })
      case 'imageGen': return withImageGen({ input });
      case 'delayed':  return withUserInput({ input, delay: () => 100 + Math.random() * 500 })
      case 'simple':   return simple();
      case 'ai':       return llm({ input });
      default:         throw new Error(`Unknown model: ${kind}`);
    }
  }

  const imageModel = (kind: string) => {
    switch (kind) {
      case 'test': return testImageGenModel();
      case 'ai':   return openai.image('dall-e-3');
      default:     throw new Error(`Unknown image model: ${kind}`);
    }
  }

  const worker = await Worker.create({
    connection,
    workflowsPath: require.resolve('./workflows'),
    activities: createActivities({ model, imageModel }),
    taskQueue: 'graph-queue',
    namespace: process.env.TEMPORAL_NAMESPACE || 'default',
  });

  console.log('Starting Temporal worker...');
  await worker.run();
}

run().catch((err) => {
  console.error('Worker failed to start:', err);
  process.exit(1);
});
