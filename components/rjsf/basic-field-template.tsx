import type { FieldTemplateProps } from "@rjsf/utils";
import { cn } from '@/lib/utils';

export function BasicFieldTemplate(props: FieldTemplateProps) {
  const { id, label, required, errors, help, children, displayLabel, rawErrors = [], rawDescription } = props;
  return <div className='flex flex-col'>
    {displayLabel && (
      <label
        className={cn(
          'text-sm my-1 capitalize font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
          { ' text-destructive': rawErrors.length > 0 },
        )}
        htmlFor={id}
      >
        {label}
        {required ? '*' : null}
      </label>
    )}
    {children}
    {displayLabel && rawDescription && (
      <span className={cn(
        'text-xs font-medium text-muted-foreground', 
        { 'text-destructive': rawErrors.length > 0 }
      )} >
        {rawDescription}
      </span>
    )}
    {errors}
    {help}
  </div>
}

