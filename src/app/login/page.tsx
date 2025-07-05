'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import Button from '@/components/Button';

export default function LoginPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  const handleSignIn = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Error signing in with Google: ", error);
    }
  };

  useEffect(() => {
    if (!loading && user) {
      router.push('/dashboard');
    }
  }, [user, loading, router]);

  if (loading) return <main className="flex min-h-screen items-center justify-center"><p>Loading...</p></main>;

  if (!user) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-24">
        <div className="text-center">
          <h1 className="text-3xl sm:text-4xl font-black uppercase">
            Masuk untuk Memulai
          </h1>
          <p className="mt-2 text-gray-400">
            Gunakan akun Google untuk melanjutkan perjalananmu.
          </p>
          <div className="mt-8 w-full max-w-xs mx-auto">
            <Button onClick={handleSignIn}>
              Masuk dengan Google
            </Button>
          </div>
        </div>
      </main>
    );
  }

  return null;
}
