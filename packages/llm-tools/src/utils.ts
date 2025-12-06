import { z, toJSONSchema } from 'zod';
import type { JSONSchema7 } from 'json-schema';
import type { NodeToolConfig } from '@ai-graph-team/runner';
import type { Tool, ToolConfigSchema, ToolSettingsSchema } from './index';

export function buildToolSettingsSchema(tool: Tool, config: NodeToolConfig | string | undefined): ToolSettingsSchema {
  const schema = toJSONSchema(z.object(tool.settings)) as any;
  const formData = typeof config === 'object' ? config.settings : {};
  const settings = { ...tool.settings };
  const resolvedValues =  Object.keys(settings).reduce((acc, prop) => {
    const datum = formData?.[prop];
    acc[prop] = datum?.value ?? datum?.default ?? schema.properties[prop].default;
    return acc;
  }, {} as Record<string, any>);
  for (const prop of Object.keys(tool.dependentSettings || {})) {
    for (const [val, additional] of Object.entries(tool.dependentSettings?.[prop] || {})) {
      if (resolvedValues[prop] === val) {
        Object.assign(settings, additional);
      }
    }
  }
  return toJSONSchema(z.object(settings)) as ToolSettingsSchema;
}

export function buildToolConfigSchema(tool: Tool, config: NodeToolConfig | string | undefined): ToolConfigSchema {
  const settingsSchema = buildToolSettingsSchema(tool, config);
  const required = Object.keys(tool.dependentSettings || {}); // Fields that dependentSettings depends on are required (in edit here)
  const originalProps = (settingsSchema.properties ?? {}) as Record<string, JSONSchema7>;
  const configFieldProps: Record<string, JSONSchema7> = {};
  for (const [propName, propSchema] of Object.entries(originalProps)) {
    configFieldProps[propName] = {
      type: 'object',
      title: propName,
      properties: {
        value: {
          ...propSchema,
          default: required.includes(propName) ? propSchema.default : undefined,
          type: (typeof propSchema.type === 'string' ? [propSchema.type] : propSchema.type ?? []).concat('null'),
        },
        default: {
          ...propSchema,
          description: 'The default value used if the LLM does not provide one',
        },
        description: {
          type: 'string',
          default: propSchema.description,
          description: 'The description of the input, as seen by the LLM',
        },
        mode: {
          type: 'string',
          enum: ['Given', 'Prompted'],
          default: 'Given',
        },
      },
    };
  }

  return {
    type: 'object',
    properties: {
      type: { type: 'string' },
      name: {
        type: 'string',
        description: 'The name of the tool'
      },
      description: {
        type: 'string',
        default: tool.description,
        description: 'The description of the tool as seen by the LLM',
      },
      settings: {
        type: 'object',
        properties: configFieldProps,
        required,
      }
    }
  } satisfies JSONSchema7;
}



export function buildToolConfig(tool: Tool, rawConfig?: NodeToolConfig): NodeToolConfig | string {
  const configSchema = buildToolConfigSchema(tool, rawConfig);
  const settingsSchema = configSchema.properties?.settings;
  const cleanSettings: NodeToolConfig['settings'] = {};
  for (const [fieldName, fieldConfig] of Object.entries(rawConfig?.settings || {})) {
    const setting = (settingsSchema?.properties?.[fieldName] as JSONSchema7)?.properties
    const f = { ...fieldConfig }
    if (f.value === undefined || f.value === null) delete f.value;
    if (f.default === null) { delete f.default; }
    if (f.default === (setting?.default as JSONSchema7)?.default) { delete f.default; }
    if (f.description === (setting?.description as JSONSchema7)?.default) delete f.description;
    if (f.mode === 'Given') delete f.mode;
    if (Object.keys(f).length > 0) { cleanSettings[fieldName] = f; }
  }
  for (const fieldName of settingsSchema?.required || []) {
    if (!cleanSettings[fieldName]) {
      const setting = settingsSchema?.properties?.[fieldName] as JSONSchema7
      cleanSettings[fieldName] = { value: (setting?.properties?.value as JSONSchema7)?.default };
    }
  }
  
  const config: NodeToolConfig = { type: tool.id };
  if (Object.keys(cleanSettings).length > 0) config.settings = cleanSettings;
  if (rawConfig?.name && rawConfig?.name !== tool.id) config.name = rawConfig.name;
  if (rawConfig?.description && rawConfig?.description !== tool.description) config.description = rawConfig.description;
  if (Object.keys(config).length === 1 /* only type; no customization */) return tool.id;
  return config
}
