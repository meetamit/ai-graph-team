import type { Meta, StoryObj } from '@storybook/react';
import InstructionsInput from './instructions-input';

const meta = {
  title: 'Graph/InstructionsInput',
  component: InstructionsInput,
  parameters: {
    layout: 'padded',
  },
  args: {
    instructions: [],
    onChange: (instructions) => console.log('onChange', instructions),
  },
} satisfies Meta<typeof InstructionsInput>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {
  args: {
    instructions: [],
  },
};

export const SingleInstruction: Story = {
  args: {
    instructions: [
      'You are a helpful assistant. Provide clear and concise answers.',
    ],
  },
};

export const MultipleInstructions: Story = {
  args: {
    instructions: [
      'You are a node in a DAG-based workflow. You must return a single JSON object. If required inputs are missing, request them using the available tools.',
      '## Node JSON',
      '{{node}}',
      '## Upstream Inputs JSON',
      '{{inputs}}',
    ],
  },
};

export const CreativeWriting: Story = {
  args: {
    instructions: [
      'You are a creative writing assistant specializing in storytelling.',
      'Use vivid imagery and descriptive language.',
      'Keep responses engaging and maintain narrative flow.',
    ],
  },
};

