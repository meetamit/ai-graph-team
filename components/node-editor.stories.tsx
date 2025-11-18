import type { Meta, StoryObj } from '@storybook/react';
import NodeEditor from './node-editor';
import { basicNode, populatedNode } from './node-editor.fixtures';

const meta = {
  title: 'Graph/NodeEditor',
  component: NodeEditor,
  parameters: {
    layout: 'padded',
  },
  args: {
    node: basicNode,
    onChange: (node) => console.log('onChange', node),
  },
} satisfies Meta<typeof NodeEditor>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Basic: Story = {
  args: {
    node: basicNode,
  },
};
export const Populated: Story = {
  args: {
    node: populatedNode,
  },
};