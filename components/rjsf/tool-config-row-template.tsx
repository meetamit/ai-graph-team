import type { FC, ReactNode } from 'react';
import type { ObjectFieldTemplateProps } from "@rjsf/utils";
import { cn } from '@/lib/utils';

export const ToolConfigRowTemplate: FC<ObjectFieldTemplateProps> = (props) => {
  const { title, schema, properties, formData, required } = props;

  // Get description from the `value` sub-schema if present
  const valueSchema = (schema.properties?.value ?? {}) as any;
  const description: string = (valueSchema && valueSchema.description) || (schema as any).description || "";

  // Find the children we care about
  const fields: Record<string, ReactNode> = ['value', 'default', 'description', 'mode'].reduce(
    (acc, fieldName) => {
      const field = properties.find((p) => p.name === fieldName);
      if (field) { acc[fieldName] = field.content; }
      return acc;
    },
    {} as Record<string, ReactNode>
  );

  return (
    <div
      role="group" aria-label={title} 
      className={cn("py-3 px-6", formData?.mode === 'Given' ? "" : "bg-secondary")}
    >
      <div className="flex gap-2 items-center flex-1">
        {title && <label
          htmlFor={`${(fields.value as Record<string, any>)?.props?.fieldPathId?.$id}_value`}
          className="text-lg font-medium capitalize"
        >
          {title}
          {required ? <span className="text-lg leading-none">*</span> : null}
        </label>}
        <div className="ml-auto">{fields.mode}</div>
      </div>
      <div className="flex gap-2 items-start flex-1">
        <div className="flex-grow">{
          formData?.mode === 'Given'
            ? <>
                {fields.value}
                {description && (<div className="text-xs opacity-80">{description}</div>)}
              </>
            : <div className="space-y-4">
              {fields.default}
              {fields.description}
            </div>
        }</div>
        </div>
    </div>
  );
};

