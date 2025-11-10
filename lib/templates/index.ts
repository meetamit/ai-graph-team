import type { GraphJSON } from '../graph-schema';
import { STARTER_GRAPH } from './starter';
import { PRESCRIPTIVE_GRAPH } from './prescriptive';
import { SVG_GRAPH } from './svg-generator';
import { IMAGE_GRAPH } from './image-generator';

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
    id: 'svg-generator',
    name: 'SVG Generator',
    description: 'A graph that generates an SVG image and another SVG image framing it.',
    data: SVG_GRAPH,
  },
  {
    id: 'image-generator',
    name: 'Image Generator',
    description: 'A graph that generates animage.',
    data: IMAGE_GRAPH,
  },
];

// Re-export individual templates for backward compatibility
export { STARTER_GRAPH, PRESCRIPTIVE_GRAPH };

