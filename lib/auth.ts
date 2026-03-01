import NextAuth, { User, Session } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials): Promise<User | null> {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const normalizedEmail = (credentials.email as string).toLowerCase().trim();
        const inputPassword = credentials.password as string;

        console.log(`Bypass check for: ${normalizedEmail}`);
        // Standard logic for all users
        try {
          const user = await prisma.user.findUnique({
            where: { email: normalizedEmail },
          });

          if (!user || !user.password) {
            return null;
          }

          const isValid = await bcrypt.compare(inputPassword, user.password);
          if (!isValid) return null;

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: (user as any).role,
          } as any;
        } catch (dbError) {
          console.error("Database connection failure during authorization:", dbError);
          return null; // Force graceful "Invalid Credentials" rejection securely
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
        token.isSuperuser = (user as any).isSuperuser;
        token.isTestUser = (user as any).isTestUser;
      }
      return token;
    },
    async session({ session, token }): Promise<Session> {
      if (token && session.user) {
        session.user.id = token.id as string;
        (session.user as any).role = token.role as string;
        (session.user as any).isSuperuser = !!token.isSuperuser;
        (session.user as any).isTestUser = !!token.isTestUser;
      }
      return session;
    },
  },
  pages: {
    signIn: '/auth/signin',
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  secret: process.env.NEXTAUTH_SECRET,
});
