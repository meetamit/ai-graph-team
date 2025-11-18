import type { Meta, StoryObj } from '@storybook/react';
import { AuthForm } from './auth-form';
import { SubmitButton } from './submit-button';

const meta = {
  title: 'Auth/AuthForm',
  component: AuthForm,
  parameters: {
    layout: 'centered',
  },
  args: {
    action: async (formData: FormData) => {
      console.log('Form submitted:', {
        email: formData.get('email'),
        password: formData.get('password'),
      });
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 1000));
    },
    defaultEmail: '',
  },
} satisfies Meta<typeof AuthForm>;

export default meta;
type Story = StoryObj<typeof meta>;

// Default login form with submit button.
export const Login: Story = {
  args: {
    children: <SubmitButton isSuccessful={false}>Log in</SubmitButton>,
    defaultEmail: '',
  },
};

// Registration form.
export const Register: Story = {
  args: {
    children: <SubmitButton isSuccessful={false}>Sign up</SubmitButton>,
    defaultEmail: '',
  },
};

// Form with a pre-filled email address.
export const WithDefaultEmail: Story = {
  args: {
    children: <SubmitButton isSuccessful={false}>Log in</SubmitButton>,
    defaultEmail: 'user@example.com',
  },
};

// Form with error message displayed.
export const WithError: Story = {
  args: {
    children: (
      <>
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md p-3">
          Invalid email or password. Please try again.
        </div>
        <SubmitButton isSuccessful={false}>Log in</SubmitButton>
      </>
    ),
    defaultEmail: '',
  },
};

// Form with success message.
export const WithSuccess: Story = {
  args: {
    children: (
      <>
        <div className="text-sm text-green-600 bg-green-50 border border-green-200 rounded-md p-3">
          Account created successfully! Redirecting...
        </div>
        <SubmitButton isSuccessful={true}>Sign up</SubmitButton>
      </>
    ),
    defaultEmail: 'newuser@example.com',
  },
};

// Form with additional help text.
export const WithHelpText: Story = {
  args: {
    children: (
      <>
        <div className="text-sm text-gray-600">
          Don't have an account? <a href="/register" className="text-blue-600 hover:underline">Sign up</a>
        </div>
        <SubmitButton isSuccessful={false}>Log in</SubmitButton>
      </>
    ),
    defaultEmail: '',
  },
};

