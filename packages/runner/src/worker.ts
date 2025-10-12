import { Worker, NativeConnection } from '@temporalio/worker';
import { createActivities } from './activities/createActivities';
import { simple, withUserInput } from '@ai-graph-team/runner/src/models';
import dotenv from 'dotenv';
dotenv.config({quiet: true});

async function run() {
  const connection = await NativeConnection.connect({
    address: process.env.TEMPORAL_ADDRESS,
  });

  // const model = simple();
  const model = withUserInput();
  
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
