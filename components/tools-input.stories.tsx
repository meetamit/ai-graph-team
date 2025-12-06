import { useState, type ComponentType } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import ToolsInput, { type ToolsInputProps } from './tools-input';
import { supportedTools } from '@ai-graph-team/llm-tools';

function withToolsState(Component: ComponentType<ToolsInputProps>): ComponentType<ToolsInputProps> {
  return function WithToolsState(props: ToolsInputProps) {
    const [tools, setTools] = useState(props.tools);
    return <Component {...props} tools={tools} onChange={setTools} />;
  };
}

const meta = {
  title: 'Graph/ToolsInput',
  component: withToolsState(ToolsInput),
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
    tools: ['collectUserInput', 'generateImage', ],
  },
};

export const ConfiguredTools: Story = {
  args: {
    tools: [
      {
        name: 'readFile',
        config: {
          fileId: { value: '{{inputs.file_creator.data.id}}' },
        },
      },
      {
        name: 'writeFile',
        config: {
          filename: { value: 'output.txt' },
          content: { default: 'Default content' },
        },
      },
    ],
  },
};

export const AllTools: Story = {
  args: {
    tools: supportedTools.map(tool => tool.id),
  },
};

