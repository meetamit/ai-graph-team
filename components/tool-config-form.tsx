import { useMemo, useCallback, type ComponentType } from 'react';
import { IChangeEvent } from '@rjsf/core';
import Form from '@rjsf/shadcn'
import validator from '@rjsf/validator-ajv8';
import { XIcon } from 'lucide-react';
import { buildToolConfigSchema, buildToolConfig, type Tool } from '@ai-graph-team/llm-tools';
import type { NodeToolConfig } from '@/lib/graph-schema';
import { Button } from './ui/button';
import { ToolConfigRootTemplate } from './rjsf/tool-config-root-template';
import { ToolConfigRowTemplate } from './rjsf/tool-config-row-template';
import { BasicFieldTemplate } from './rjsf/basic-field-template';
import { TextWidget } from './rjsf/widgets/text-widget';
import { TextareaWidget } from './rjsf/widgets/textarea-widget';
import { SelectWidget } from './rjsf/widgets/select-widget';
import { RadioWidget } from './rjsf/widgets/radio-widget';

type ToolConfigFormProps = {
  tool: Tool;
  config?: NodeToolConfig | string;
  onConfigChange?: (config: NodeToolConfig | string) => void;
};

function clearable(Widget: ComponentType<any>) {
  return (props: any) => {
    if (!props.options?.clearable) return <Widget {...props} />; // Normal widget, no X
    return (
      <div className="flex gap-2 items-center">
        <div className="flex-grow"><Widget {...props} /></div>
        <Button
          variant="link"
          className="p-0"
          title="Clear the value (makes the LLM choose the value)"
          onClick={(e) => {
            props.onChange(null);
            e.preventDefault();
          }}
        ><XIcon className="size-4" /></Button>
      </div>
    );
  };
}

const widgets = {
  TextWidget: clearable(TextWidget),
  SelectWidget: clearable(SelectWidget),
  CheckboxWidget: clearable(RadioWidget),
  TextareaWidget: clearable(TextareaWidget),
  updown: clearable(props => <TextWidget {...props} type="number" />),
  radio: RadioWidget,
};

const templates = {
  FieldTemplate: BasicFieldTemplate,
};

export default function ToolConfigForm({
  tool,
  config,
  onConfigChange,
}: ToolConfigFormProps) {
  const { configSchema, uiSchema } = useMemo(() => {
    const configSchema = buildToolConfigSchema(tool, config);
    const settingsSchema: any = configSchema.properties?.settings ?? {};
    const settingsUi: Record<string, any> = Object.entries(settingsSchema.properties ?? {}).reduce((acc, [key, value]) => {
      const configured = (typeof config === 'string' ? undefined : config)?.settings;
      const defaultVal = configured?.[key]?.default ?? (value as any).properties.default?.default;
  
      acc[key] = {
        'ui:ObjectFieldTemplate': ToolConfigRowTemplate,
        mode: {
          'ui:label': false,
          'ui:widget': 'radio'
        },
        value: {
          'ui:label': false,
          'ui:placeholder': `Defaults to "${defaultVal}"`,
          'ui:widget': key === 'steps' ? 'updown' : undefined,
          'ui:options': { clearable: true },
        },
        default: {
          'ui:label': true,
          'ui:options': { clearable: true },
        },
        description: {
          'ui:label': true,
          'ui:widget': 'TextareaWidget'
        },
      };
      return acc;
    }, { 'ui:label': false } as Record<string, any>);

    const uiSchema = {
      'ui:ObjectFieldTemplate': ToolConfigRootTemplate, // Root object template
      name: { 'ui:widget': 'TextWidget' },
      description: { 'ui:widget': 'TextareaWidget' },
      settings: settingsUi, // Nested settings object: use ToolConfigRowTemplate for its children
    };

    return { configSchema, uiSchema };
  }, [tool, config]);

  const handleChange = useCallback(
    (evt: IChangeEvent<any>) => {
      const config = buildToolConfig(tool, evt.formData);
      console.log('config', JSON.stringify(config, null, 2));
      onConfigChange?.(config);
    },
    [tool.id, onConfigChange]
  );

  return (
    <Form
      schema={configSchema}
      validator={validator}
      onChange={handleChange}
      onSubmit={(e) => { debugger; }}
      onError={(errors) => console.log('errors', errors)}
      widgets={widgets}
      templates={templates}
      uiSchema={uiSchema}
      formData={typeof config === 'string' ? { type: tool.id } : config || { type: tool.id }}
    >{<>{/* empty children hides submit button */}</>}</Form>
  );
}
