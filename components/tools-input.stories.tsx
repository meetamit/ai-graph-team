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
    tools: ['collectUserInput', 'generateImage'],
  },
};

export const ConfiguredTools: Story = {
  args: {
    tools: [
      {
        type: 'readFile',
        settings: {
          fileId: { value: '{{inputs.file_creator.data.id}}' },
        },
      },
      {
        type: 'writeFile',
        name: 'customWriteFile',
        description: 'Custom description for writeFile tool',
        settings: {
          filename: { value: 'output.txt' },
          content: { default: 'Default content' },
        },
      },
    ],
  },
};

export const MultipleGenerateImage: Story = {
  args: {
    tools: [
      {
        type: 'generateImage',
        name: 'generateWithSD',
        description: 'Generate image using Stable Diffusion',
        settings: {
          model: { value: 'stable-diffusion-2-free' },
          prompt: { description: 'Describe the image to generate with SD' },
        },
      },
      'generateImage',
      {
        type: 'generateImage',
        name: 'generateWithDalle',
        description: 'Generate image using DALL-E 3',
        settings: {
          model: { value: 'dall-e-3' },
          prompt: { description: 'Describe the image to generate with DALL-E' },
        },
      },
      'extractUrlText',
    ],
  },
};

export const AllTools: Story = {
  args: {
    tools: supportedTools.map(tool => tool.id),
  },
};

