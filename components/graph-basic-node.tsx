import { cn, cva } from "@/lib/utils";
import { Handle, Position } from '@xyflow/react';
import { JsonView, collapseAllNested, defaultStyles } from 'react-json-view-lite';

import 'react-json-view-lite/dist/index.css';


const nodeVariants = cva(
  'overflow-hidden bg-background text-primary px-2 py-1 rounded-md border',
  {
    variants: {
      status: {
        error: 'bg-primary-foreground text-chart-1 border-chart-1',
        unknown: 'bg-primary-foreground text-primary text-muted-foreground',
        pending: 'bg-muted text-muted-foreground',
        running: 'bg-popover text-popover-foreground border-primary',
        done: 'bg-primary-foreground text-primary border-primary',
      },
      selected: {
        true: 'border-double border-4',
        false: '',
      },
    },
    defaultVariants: {
      status: 'unknown',
    },
  },
);

export default function GraphBasicNode({ 
  id, type, data, selected, 
}: { 
  id: string, type: string, data: any, selected: boolean, 
}) {
  const { output, status } = data;
  return <>
    <Handle type="target" position={Position.Top} />
    <div
      className={cn('w-[200px]', nodeVariants({ status: status as any, selected }), `node-status-${status}`)}
      data-gnid={id}
      data-gntype={type}
    >
      <div className="text-m">{data.def.name}</div>
      <div className="text-xs">{output && ['done', 'error'].includes(status) && (
        output.message && output.data
          ? <>
              <div>{output.message}</div>
              <JsonView data={output.data} style={defaultStyles} shouldExpandNode={collapseAllNested} />
            </>
        : output.type === 'text'
          ? <div>{output.text}</div>
        : output.error
          ? <div>{output.error}</div>
          : <JsonView data={output} />
      )}</div>
    </div>
    <Handle type="source" position={Position.Bottom} />
  </>
}
