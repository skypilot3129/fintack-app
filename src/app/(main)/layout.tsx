// src/app/(main)/layout.tsx

'use client';

import BottomNav from '@/components/BottomNav';
import { Toaster } from 'react-hot-toast';
import { AnimatePresence, motion } from 'framer-motion';
import { usePathname } from 'next/navigation';
import { TourContextProvider } from '@/context/TourContext';
import { AuthContextProvider } from '@/context/AuthContext';
import AppGate from '@/components/AppGate';

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <AuthContextProvider>
      <TourContextProvider>
        {/* AppGate akan menangani Preloader & Onboarding */}
        <AppGate />

        {/* DIUBAH: Hapus `h-screen`, `flex`, dan `overflow-hidden` dari sini */}
        <div className="bg-[#0A0A0A] text-white">
          <Toaster 
            position="top-center"
            toastOptions={{
              style: {
                background: '#333',
                color: '#fff',
              },
            }}
          />
          
          <AnimatePresence mode="wait">
            {/* DIUBAH: Hapus semua class styling dari motion.div.
              Biarkan komponen ini hanya fokus pada animasi.
              Layout akan ditangani oleh setiap halaman.
            */}
            <motion.div
              key={pathname}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
          
          {/* BottomNav sekarang menjadi komponen yang "melayang" di atas konten.
            Konten halaman akan diberi padding bawah agar tidak tertutup.
          */}
          <BottomNav />
        </div>
      </TourContextProvider>
    </AuthContextProvider>
  );
}