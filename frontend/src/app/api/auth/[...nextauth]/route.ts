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

          const data = await res.json() as { user: { id: string; name: string; email: string }; token: string };
          // Return user + backend JWT so callbacks can expose it as accessToken
          return { ...data.user, accessToken: data.token };
        } catch {
          // Development fallback
          if (credentials.email === 'achyuth@crowe.com') {
            return { id: 'user1', name: 'Achyuth', email: 'achyuth@crowe.com', accessToken: 'dev-token' };
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
  callbacks: {
    async jwt({ token, user }) {
      // On initial sign-in, user contains the authorize() return value
      if (user) {
        token.accessToken = (user as typeof user & { accessToken: string }).accessToken;
      }
      return token;
    },
    async session({ session, token }) {
      // Expose the backend token on the session object
      (session as typeof session & { accessToken: string }).accessToken = token.accessToken as string;
      return session;
    },
  },
});

export const { GET, POST } = handlers;
