import { tool, Tool } from 'ai';
import { z } from 'zod';
import { zodFromSchema } from '@ai-graph-team/llm-tools';
import { Node, Edge, NodeRoutingMode, RouteDef } from '../types';
import type { NodeToolContext } from './index';

export function resolveOutputTool(ctx: NodeToolContext): Tool {
  const { routing, output_schema } = ctx.input.node as Node;

  const schema: Record<string, z.ZodType> = {};
  schema['message'] = z.string().describe('Human readable message sumarizing the work done by the node');
  schema['data'] = output_schema ? zodFromSchema(output_schema) : z.any();

  if (!routing || routing.mode === 'broadcast') {
    // do nothing
  } else if (routing.mode === 'llm-switch' || !routing.mode) {
    let routes: RouteDef[] = routing.routes || [];
    let { allowMultiple, required } = routing;
    if (!routes.length) {
      routes = ctx.input.outgoing.map((e: Edge) => ({ id: e.to }) as RouteDef);
      if (!allowMultiple) {
        schema['route'] = z.enum(routes.map(r => r.id));
        if (required === false) {
          schema['route'] = schema['route'].optional();
        }
      } else {
        schema['routes'] = z.array(z.enum(routes.map(r => r.id)));
        if (required === false) {
          schema['routes'] = schema['routes'].optional();
        }
      }
    }
  }

  return tool({
    description: 'Resolve the final output once the work is done',
    inputSchema: z.object(schema),
  })
}

