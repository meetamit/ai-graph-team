import type { Meta, StoryObj } from '@storybook/react';
import MessagesLog from './graph-message-log';
import { emptyMessages, imageGenerationMessages } from './graph-message-log.fixtures';

const meta = {
  title: 'Graph/MessagesLog',
  component: MessagesLog,
  parameters: {
    layout: 'padded',
  },
  args: {
    messageGroups: emptyMessages,
  },
  argTypes: {
    messageGroups: {},
  },
} satisfies Meta<typeof MessagesLog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Empty: Story = {
  args: {
    messageGroups: emptyMessages,
  },
};

export const WithToolCalls: Story = {
  args: {
    messageGroups: imageGenerationMessages,
  },
};

