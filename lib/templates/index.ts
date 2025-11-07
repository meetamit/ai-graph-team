import type { GraphJSON } from '../graph-schema';
import { STARTER_GRAPH } from './starter';
import { PRESCRIPTIVE_GRAPH } from './prescriptive';
import { IMAGER_GRAPH } from './imager';

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
  {
    id: 'imager',
    name: 'Imager',
    description: 'A graph that generates an image based on the user\'s input.',
    data: IMAGER_GRAPH,
  },
];

// Re-export individual templates for backward compatibility
export { STARTER_GRAPH, PRESCRIPTIVE_GRAPH };

