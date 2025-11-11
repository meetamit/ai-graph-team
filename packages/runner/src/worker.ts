
import { Worker, NativeConnection } from '@temporalio/worker';
import { LanguageModel } from 'ai';
import { openai } from '@ai-sdk/openai';
import { simple, withUserInput } from '@ai-graph-team/runner/src/models';
import { createActivities, NodeStepInput } from './activities/createActivities';
import dotenv from 'dotenv';
dotenv.config({quiet: true});

async function run() {
  const connection = await NativeConnection.connect({
    address: process.env.TEMPORAL_ADDRESS,
  });

  const model = (name: string, input?: NodeStepInput): LanguageModel => {
    switch (name) {
      case 'test':       return withUserInput({ input, /* delay: 0 */ })
      case 'simple':     return simple();
      case 'llm':        return openai('gpt-4o-mini');
      default:           throw new Error(`Unknown model: ${name}`);
    }
  }

  const worker = await Worker.create({
    connection,
    workflowsPath: require.resolve('./workflows'),
    activities: createActivities({ model }),
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
