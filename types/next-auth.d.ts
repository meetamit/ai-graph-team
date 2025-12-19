import NextAuth, { DefaultSession } from 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      role: 'admin' | null;
    } & DefaultSession['user'];
  }

  interface User {
    id: string;
    role?: 'admin' | null;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    role: 'admin' | null;
  }
}

