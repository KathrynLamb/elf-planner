
// src/app/login/page.tsx
import { redirect } from 'next/navigation';
import { currentUser } from '@/lib/currentUser';
import { LoginForm } from './LoginForm'; // or whatever your form component is

export default async function LoginPage() {
  const session = await currentUser();

  // If already signed in, don't show the login form again.
  // Pick where you want logged-in users to land:
  const loggedInDestination = '/'; // or '/plans' etc.

  if (session) {
    redirect(loggedInDestination);
  }

  return <LoginForm />;
}
