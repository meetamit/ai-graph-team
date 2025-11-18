import type { Meta, StoryObj } from '@storybook/react';
import ModelInput from './model-input';

const meta = {
  title: 'Graph/ModelInput',
  component: ModelInput,
  parameters: {
    layout: 'padded',
  },
  args: {
    onChange: (value) => console.log('onChange', value),
  },
} satisfies Meta<typeof ModelInput>;

export default meta;
type Story = StoryObj<typeof meta>;

// Default empty state
export const Empty: Story = {
  args: {
    value: undefined,
  },
};

// Simple string model
export const StringModel: Story = {
  args: {
    value: 'gpt-4o-mini',
  },
};

// Object with model name only
export const ObjectModelNameOnly: Story = {
  args: {
    value: { name: 'gpt-4o-mini' },
  },
};

// Object with different provider (Anthropic)
export const AnthropicModel: Story = {
  args: {
    value: { name: 'claude-3-5-sonnet-20241022' },
  },
};

// Object with model name and arguments
export const ModelWithArgs: Story = {
  args: {
    value: { 
      name: 'gpt-4o-mini', 
      args: { 
        temperature: 0.5,
        maxTokens: 2000,
      } 
    },
  },
};

// Model with complex arguments
export const ModelWithComplexArgs: Story = {
  args: {
    value: { 
      name: 'claude-3-5-sonnet-20241022', 
      args: { 
        temperature: 0.7,
        maxTokens: 4000,
        topP: 0.9,
        frequencyPenalty: 0.2,
      } 
    },
  },
};

// Arguments only (edge case)
export const ArgsOnly: Story = {
  args: {
    value: { 
      args: { 
        temperature: 0.5,
        someArg: 'someValue',
      } 
    } as any,
  },
};

