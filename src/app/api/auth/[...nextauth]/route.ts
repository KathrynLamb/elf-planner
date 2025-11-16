// src/app/api/auth/[...nextauth]/route.ts
import NextAuth from 'next-auth';
import { authConfig } from '@/lib/auth';

// Create a single handler from our config
const handler = NextAuth(authConfig);

// Export it as GET and POST for the App Router
export { handler as GET, handler as POST };
