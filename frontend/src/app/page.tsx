import { redirect } from 'next/navigation';

export default function Home() {
  // For now, redirect to login page
  // Later this will check auth status and redirect accordingly
  redirect('/login');
}
