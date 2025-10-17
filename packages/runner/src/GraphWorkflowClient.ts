import { Connection, Client, WorkflowHandle, WorkflowNotFoundError } from '@temporalio/client';
import { NativeConnection } from '@temporalio/worker';
import { runGraphWorkflow, receiveInput } from './workflows';
import type { NeededInput, ProvidedInput, Graph, NodesStatus, NodeStatus, NodeId } from './types';
import type { Transcript } from './activities/createActivities';

export type { NeededInput, ProvidedInput };

type WorkflowEventType = 'status' |'result' | 'output' | 'needInput';
type WorkflowEvent = { type: WorkflowEventType; payload: any };

export type GraphNodeOutputEvent = { type: 'output'; payload: [NodeId, any] };
export type GraphStatusEvent = { type: 'status'; payload: NodesStatus };
export type GraphNeededInputEvent = { type: 'needed'; payload: NeededInput[] };
export type GraphTranscriptEvent = { type: 'transcript'; payload: Array<[NodeId, Transcript]>; };



export type GraphWorkflowClientOptions = {
  connection?: Connection | NativeConnection;
  collectInput?: (neededInput: NeededInput[]) => Promise<ProvidedInput[]>;
  taskQueue?: string;
  idBase?: string;
};

export class GraphWorkflowClient {
  private connection: Connection | NativeConnection | undefined;
  private collectInput?: (neededInput: NeededInput[]) => Promise<ProvidedInput[]>;
  private taskQueue: string;
  private idBase: string;

  constructor(options: GraphWorkflowClientOptions) {
    this.connection = options.connection || undefined;
    this.collectInput = options.collectInput;
    this.taskQueue = options.taskQueue || 'graph-queue';
    this.idBase = options.idBase || 'run-graph-';
  }

  async getClient(): Promise<Client> {
    this.connection = this.connection || await Connection.connect({
      address: process.env.TEMPORAL_ADDRESS,
    });
    return new Client({
      connection: this.connection,
      namespace: process.env.TEMPORAL_NAMESPACE || 'default',
    });
  }

  async runWorkflow(graph: Graph, prompt?: any, workflowId?: string): Promise<any> {
    const client = await this.getClient();

    try {
      const handle: WorkflowHandle = await client.workflow.start(runGraphWorkflow, {
        args: [{ graph, prompt }],
        taskQueue: this.taskQueue,
        workflowId: workflowId ?? this.idBase + Date.now(),
      });

      console.log(`Started workflow ${handle.workflowId}`);

      if (!this.collectInput) {
        return handle.result();
      }
      
      // if we have a collectInput function, we need to poll until the workflow needs input
      const resultPromise = handle.result().then((r: any) => ({ type: 'result' as const, payload: r }));

      let event: WorkflowEvent;
      while (true) {
        event = await Promise.race<WorkflowEvent>([
          resultPromise,
          this.pollUntilNeedsInput(handle).then((s) => ({ type: 'needInput' as const, payload: s })),
        ]);
        if (event.type === 'needInput') {
          const neededInput: NeededInput[] = event.payload || [] as NeededInput[];
          const receivedInput = await this.collectInput(neededInput);
          await handle.signal(receiveInput, receivedInput);
        } else if (event.type === 'result') {
          break;
        }
      }

      if (event.type === 'result') {
        const result = event.payload;
        return result;
      } else {
        throw new Error(`Expected result, got:\n\n${JSON.stringify(event, null, 2)}`);
      }
    } catch (error) {
      console.error('Error running workflow:', error);
      throw error;
    }
  }

  async provideInput(workflowId: string, inputs: ProvidedInput[]): Promise<void> {
    const client = await this.getClient();
    const handle: WorkflowHandle = await client.workflow.getHandle(workflowId);
    await handle.signal(receiveInput, inputs);
  }

  async *events(workflowId: string): AsyncGenerator<GraphStatusEvent | GraphNeededInputEvent | GraphNodeOutputEvent | GraphTranscriptEvent> {
    const client = await this.getClient();
    const handle: WorkflowHandle = await client.workflow.getHandle(workflowId);
    try {
      const description = await handle.describe();
      if (description?.status?.name === 'FAILED') { return }
      if (description?.status?.name === 'TERMINATED') { return }
    } catch (e) {
      if (e instanceof WorkflowNotFoundError) { return; }
      throw e;
    }

    let t0 = Date.now();
    let lastStatus: NodesStatus = {};
    let lastNeeded: NeededInput[] = [];
    let lastTranscripts: Array<[NodeId, Transcript]> = [];
    while (true && Date.now() - t0 < 10 * 60e3 /* 10 minutes timeout */) {
      const status: NodesStatus = await handle.query('getNodesStatus') as NodesStatus;
      const changed: Array<[NodeId, NodeStatus]> = Object.entries(status).filter(([nodeId, status]) => status !== lastStatus[nodeId])
      if (changed.length) {
        yield { type: 'status', payload: status };
      }
      for (let [nodeId, status] of changed) {
        if (status === 'done' || status === 'error') {
          yield { type: 'output', payload: [nodeId, await handle.query('getNodeOutput', nodeId)] };
        }
      }
      
      if (
        Object.values(status).some(s => s === 'awaiting') ||
        Object.values(lastStatus).some(s => s === 'awaiting')
      ) {
        const neededInput: NeededInput[] = await handle.query('getNeededInput');
        if (lastNeeded.length !== neededInput?.length || lastNeeded.some((n, i) => n.nodeId !== neededInput?.[i]?.nodeId)) {
          yield { type: 'needed', payload: neededInput };
        }
        if (Object.values(status).every(s => s === 'done')) {
          break;
        }
        lastNeeded = neededInput;
      }
      
      if (
        Object.entries(status).some(([nodeId, status]) => status === 'running' || lastStatus[nodeId] !== status)
      ) {
        const newTranscripts: Array<[NodeId, Transcript]> = await handle.query('getTranscripts', lastTranscripts.length);
        if (newTranscripts.length) {
          yield { type: 'transcript', payload: newTranscripts };
          lastTranscripts = [...lastTranscripts, ...newTranscripts];
        }
      }

      lastStatus = status;

      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  private async pollUntilNeedsInput(handle: WorkflowHandle, intervalMs = 800): Promise<NeededInput[]> {
    // Resolves when the workflow reports it needs input
    return new Promise<NeededInput[]>((resolve) => {
      const t = setInterval(async () => {
        try {
          const neededInput: NeededInput[] = await handle.query('getNeededInput');
          if (neededInput?.length) {
            clearInterval(t);
            resolve(neededInput);
          }
        } catch {
          // ignore transient query errors between state transitions
        }
      }, intervalMs);
    });
  }
}


