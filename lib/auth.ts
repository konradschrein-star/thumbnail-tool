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

        // --- DEMO ACCOUNT JIT PROVISIONING ---
        // Ensure the test@test.ai account exists so demo logins work reliably
        if (normalizedEmail === 'test@test.ai') {
          try {
            const demoUser = await prisma.users.findUnique({ where: { email: 'test@test.ai' } });
            if (!demoUser) {
              const hashedPassword = await bcrypt.hash('test', 10);
              await prisma.users.create({
                data: {
                  email: 'test@test.ai',
                  password: hashedPassword,
                  name: 'Demo Architect',
                  role: 'USER', // Kept as standard USER so the 10/day rate limit applies
                }
              });
              console.log('Demo user test@test.ai auto-created for the database.');
            }
          } catch (e) {
            console.error('Failed to auto-provision demo user:', e);
          }
        }
        // ------------------------------------

        // Standard logic for all users
        try {
          console.error(`[AUTH DEBUG] Looking up user: ${normalizedEmail}`);
          const user = await prisma.users.findUnique({
            where: { email: normalizedEmail },
          });

          console.error(`[AUTH DEBUG] User found: ${!!user}, has password: ${!!user?.password}`);

          if (!user || !user.password) {
            console.error(`[AUTH DEBUG] User not found or no password`);
            return null;
          }

          console.error(`[AUTH DEBUG] Comparing password...`);
          const isValid = await bcrypt.compare(inputPassword, user.password);
          console.error(`[AUTH DEBUG] Password valid: ${isValid}`);

          if (!isValid) {
            console.error(`[AUTH DEBUG] Password comparison failed`);
            return null;
          }

          console.error(`[AUTH DEBUG] Authentication successful!`);
          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: (user as any).role,
          } as any;
        } catch (dbError) {
          console.error("[AUTH DEBUG] Database error:", dbError);
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
