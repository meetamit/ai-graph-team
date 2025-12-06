import type { Meta, StoryObj } from '@storybook/react';
import ToolEditorModal from './tool-editor';
import {
  generateImageWithGivenFilenameAndSize,
  writeFileWithGivensAndDefaults,
  emptyConfig, noConfig,
} from './tool-editor.fixtures';
import { supportedToolsById as tools } from '@/packages/llm-tools';

const meta = {
  title: 'Graph/ToolEditorModal',
  component: ToolEditorModal,
  parameters: {
    layout: 'centered',
  },
  args: {
    forceOpen: true,
    onSave: (config) => console.log('onSave', config),
    onClose: () => console.log('onClose'),
    onDelete: () => console.log('onDelete'),
  },
} satisfies Meta<typeof ToolEditorModal>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WriteFileTool: Story = {
  args: {
    tool: tools['writeFile'],
    initialConfig: writeFileWithGivensAndDefaults,
  },
};
export const ExtractUrlTextTool: Story = {
  args: {
    tool: tools['extractUrlText'],
    initialConfig: emptyConfig,
  },
};
export const GenerateImageTool: Story = {
  args: {
    tool: tools['generateImage'],
    initialConfig: generateImageWithGivenFilenameAndSize,
  },
};

export const CollectUserInputTool: Story = {
  args: {
    tool: tools['collectUserInput'],
    initialConfig: emptyConfig,
  },
};

export const ReadFileTool: Story = {
  args: {
    tool: tools['readFile'],
    initialConfig: emptyConfig,
  },
};

