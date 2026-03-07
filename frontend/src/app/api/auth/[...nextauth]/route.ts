// Phase 1 stub — NextAuth.js v5 credentials provider
// Full implementation in Phase 2 when backend auth is wired

import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';

const BACKEND_URL = process.env.BACKEND_URL ?? 'http://localhost:8000';

const { handlers } = NextAuth({
  providers: [
    Credentials({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        try {
          const res = await fetch(`${BACKEND_URL}/api/v1/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: credentials.email,
              password: credentials.password,
            }),
          });

          if (!res.ok) return null;

          const { user } = await res.json() as { user: { id: string; name: string; email: string } };
          return user;
        } catch {
          // Phase 1: allow mock login for development
          if (credentials.email === 'achyuth@crowe.com') {
            return {
              id: 'user1',
              name: 'Achyuth',
              email: 'achyuth@crowe.com',
            };
          }
          return null;
        }
      },
    }),
  ],
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: 'jwt',
  },
});

export const { GET, POST } = handlers;
