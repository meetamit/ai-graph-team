// .storybook/preview.tsx
import React from 'react';
import type { Preview, Decorator } from '@storybook/nextjs';
import { geist, geistMono } from '../lib/fonts';
import '../app/globals.css';
import '../components/react-flow-overrides.css';

const withFonts: Decorator = (Story) => {
  React.useEffect(() => {
    const root = document.documentElement;
    const body = document.body;

    // Add the next/font-generated classes to <html>
    root.classList.add(geist.variable, geistMono.variable);

    // Optional: mirror what your app does
    body.classList.add('antialiased');

    return () => {
      root.classList.remove(geist.variable, geistMono.variable);
      body.classList.remove('antialiased');
    };
  }, []);

  return <Story />;
};

const preview: Preview = {
  tags: ['autodocs'],
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    layout: 'centered',
    options: {
      storySort: {
        order: ['Auth', 'Graph', 'UI'],
      },
    },
  },
  decorators: [withFonts],
};

export default preview;
