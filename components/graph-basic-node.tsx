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

export default function GraphBasicNode({ id, type, data, selected }: { id: string, type: string, data: any, selected: boolean }) {
  return <>
    <Handle type="target" position={Position.Top} />
    <div
      className={cn('w-[200px]', nodeVariants({ status: data.status, selected }), `node-status-${data.status}`)}
      data-gnid={id}
      data-gntype={type}
    >
      <div className="text-m">{data.label}</div>
      <div className="text-xs">{data.output && ['done', 'error'].includes(data.status) && (
        data.output.message && data.output.data
          ? <>
              <div>{data.output.message}</div>
              <JsonView data={data.output.data} style={defaultStyles} shouldExpandNode={collapseAllNested} />
            </>
        : data.output.type === 'text'
          ? <div>{data.output.text}</div>
        : data.output.error
          ? <div>{data.output.error}</div>
          : <JsonView data={data.output} />
      )}</div>
    </div>
    <Handle type="source" position={Position.Bottom} />
  </>
}
