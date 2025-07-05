// app/(main)/dashboard/page.tsx
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import ChatInterface from '@/components/ChatInterface';
import UserProfileCard from '@/components/UserProfileCard';

export default function DashboardPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/');
    }
  }, [user, loading, router]);

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0A0A0A] text-white">
        <p>Memuat data...</p>
      </div>
    );
  }

  return (
    // PERBAIKAN: Hapus semua kelas layout, biarkan layout utama yang mengatur
    <div className="p-4 md:p-6 lg:p-8 bg-[#0A0A0A] text-white">
      <div className="max-w-4xl mx-auto w-full space-y-6">
        <UserProfileCard user={user} />
        {/* Atur tinggi chat interface agar tidak melebihi sisa ruang */}
        <div className="h-[calc(100vh-250px)]"> 
            <ChatInterface user={user} />
        </div>
      </div>
    </div>
  );
}
