'use client';

import { useRouter } from 'next/navigation';
import Button from '@/components/Button';

export default function HomePage() {
  const router = useRouter();

  const handleStart = () => {
    router.push('/login');
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="text-center">
        <h1 className="text-4xl sm:text-5xl font-black uppercase tracking-wider">
          Arsitek Keuangan Pribadi
        </h1>
        <p className="mt-4 text-lg text-gray-400 max-w-md">
          Uang Bukan Masalahmu. Pola Pikirmu Masalahnya.
        </p>
        <div className="mt-12 w-full max-w-xs mx-auto">
          <Button onClick={handleStart}>
            Ubah Cara Main
          </Button>
        </div>
      </div>
    </main>
  );
}
