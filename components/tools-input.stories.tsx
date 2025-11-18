import type { Meta, StoryObj } from '@storybook/react';
import ToolsInput from './tools-input';

const meta = {
  title: 'Graph/ToolsInput',
  component: ToolsInput,
  parameters: {
    layout: 'padded',
  },
  args: {
    tools: [],
    onChange: (tools) => console.log('onChange', tools),
  },
} satisfies Meta<typeof ToolsInput>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {
  args: {
    tools: [],
  },
};

export const SimpleTools: Story = {
  args: {
    tools: [
      'collectUserInput',
      'generateImage',
    ],
  },
};

export const ConfiguredTools: Story = {
  args: {
    tools: [
      {
        name: 'readFile',
        input: {
          fileId: '{{inputs.file_creator.data.id}}',
        },
      },
      {
        name: 'writeFile',
        input: {
          filename: 'output.txt',
        },
        default: {
          content: 'Default content',
        },
      },
    ],
  },
};

export const MixedTools: Story = {
  args: {
    tools: [
      'collectUserInput',
      {
        name: 'readFile',
        input: {
          fileId: '{{inputs.file_creator.data.id}}',
        },
      },
      {
        name: 'writeFile',
        input: {
          filename: 'summary.txt',
        },
      },
      'generateImage',
    ],
  },
};

export const AllTools: Story = {
  args: {
    tools: [
      'collectUserInput',
      'generateImage',
      'writeFile',
      'readFile',
    ],
  },
};

