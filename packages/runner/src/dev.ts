import readline from 'node:readline/promises';
import { openai } from '@ai-sdk/openai';
import { Connection } from '@temporalio/client';
import { Worker, NativeConnection } from '@temporalio/worker';
import { createActivities } from './activities/createActivities';
import { GraphWorkflowClient, NeededInput, ProvidedInput } from './GraphWorkflowClient';
import dotenv from 'dotenv';
dotenv.config({quiet: true});

async function startWorker() {
  const connection = await NativeConnection.connect({
    address: process.env.TEMPORAL_ADDRESS,
  });

  const worker = await Worker.create({
    connection,
    workflowsPath: require.resolve('./workflows'),
    activities: createActivities({ model: openai('gpt-5-nano')}),
    taskQueue: 'graph-queue',
    namespace: process.env.TEMPORAL_NAMESPACE || 'default',
  });

  console.log('Starting Temporal worker...');
  worker.run();
  return worker;
}

async function runClient() {
  const connection = await Connection.connect({
    address: process.env.TEMPORAL_ADDRESS,
  });

  try {
    const graph = require('../test/fixtures/graphs/debatePanel.json');
    const runner = new GraphWorkflowClient({ 
      connection, 
      collectInput: collectInputViaTerminal 
    });
    
    return await runner.runWorkflow(
      graph, 
      `Should we write a workflow engine that runs DAGs of heavily LLM-backed nodes that process inputs, perform tasks using tools, and forward or route outputs downstream?`
    );
  } catch (error) {
    console.error('Error running workflow:', error);
  } finally {
    await connection.close();
  }
}

async function run() {
  const worker = await startWorker();
  await new Promise(resolve => setTimeout(resolve, 1000));
  await runClient();
  worker.shutdown();
  process.exit(0);
}

run().catch((err) => {
  console.error('Application failed to start:', err);
  process.exit(1);
});



async function collectInputViaTerminal(neededInput: NeededInput[]) {
  neededInput = [...neededInput];
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const answers: ProvidedInput[] = [];
  while (neededInput.length) {
    const needed: NeededInput = neededInput.shift()!;
    const answer: string = await rl.question(`${needed.prompt}: ${needed.default ? `(${needed.default}) ` : ''}`);
    answers.push({
      for: needed,
      value: answer || needed.default || '', 
      nodeId: needed.nodeId, 
    });
  }
  rl.close();
  return answers;
}