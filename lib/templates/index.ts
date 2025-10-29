import type { GraphJSON } from '../graph-schema';
import { STARTER_GRAPH } from './starter';
import { PRESCRIPTIVE_GRAPH } from './prescriptive';

export interface GraphTemplate {
  id: string;
  name: string;
  description: string;
  data: GraphJSON;
}

export const GRAPH_TEMPLATES: GraphTemplate[] = [
  {
    id: 'starter',
    name: 'Debate Panel (Starter)',
    description: 'A simple debate panel with for/against positions and a judge',
    data: STARTER_GRAPH,
  },
  {
    id: 'prescriptive',
    name: 'Debate Panel (Prescriptive)',
    description: 'A structured debate panel with defined output schemas and instructions',
    data: PRESCRIPTIVE_GRAPH,
  },
];

// Re-export individual templates for backward compatibility
export { STARTER_GRAPH, PRESCRIPTIVE_GRAPH };

