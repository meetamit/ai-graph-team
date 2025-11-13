import { TestWorkflowEnvironment } from '@temporalio/testing';
import { Worker, WorkerOptions, NativeConnection } from '@temporalio/worker';
import { Connection } from '@temporalio/client';
import { GraphWorkflowClient, NeededInput, ProvidedInput, Graph } from '../../src/GraphWorkflowClient';
import { createActivities } from '../../src/activities';
import withUserInput from '../../src/models/withUserInput';
import dotenv from 'dotenv';
dotenv.config({quiet: true});

export type TestHarness = {
  env: TestWorkflowEnvironment;
  runner: GraphWorkflowClient;
  worker: Worker;
  shutdown: () => Promise<void>;
};

export type { NeededInput, ProvidedInput, Graph };

export async function makeHarness(opts: {
  workflowsPath: string;
  activities?: Record<string, any>;
  taskQueue: string;
  idBase?: string;
  collectInput?: (neededInput: NeededInput[]) => Promise<ProvidedInput[]>;
}): Promise<TestHarness> {
  const env = await TestWorkflowEnvironment.createTimeSkipping();
  const workerOptions: WorkerOptions = {
    taskQueue: opts.taskQueue,
    workflowsPath: opts.workflowsPath,
    activities: opts.activities || createActivities(({ model: (name, input) => withUserInput({ input, delay: () => 0 }) })),
    connection: env.nativeConnection
  }
  
  let connection: Connection | NativeConnection = env.nativeConnection;
  
  if (process.env.TEST_WITH_REAL_TEMPORAL === 'true') {
    connection = await Connection.connect({ address: process.env.TEMPORAL_ADDRESS });
    delete workerOptions.connection
  }

  const worker = await Worker.create(workerOptions);
  
  // Default mock input collector for tests
  const defaultCollectInput = async (neededInput: NeededInput[]): Promise<ProvidedInput[]> => {
    return neededInput.map(needed => ({
      for: needed,
      value: needed.default || `mock value for ${needed.name}`,
      nodeId: needed.nodeId,
    }));
  };

  const runner = new GraphWorkflowClient({
    connection,
    collectInput: opts.collectInput || defaultCollectInput,
    taskQueue: opts.taskQueue,
    idBase: opts.idBase || 'test-run-',
  });
  
  // Start the worker in the background for the duration of the test file
  (async () => worker.run())(); // don't await
  
  const shutdown = async () => {
    await worker.shutdown();
    await new Promise(resolve => setTimeout(resolve, 100)); // delay to avoid reference errors
    await env.teardown();
  };
  
  return { env, runner, worker, shutdown };
}
