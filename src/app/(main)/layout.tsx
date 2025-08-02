// src/app/(main)/layout.tsx

'use client';

import BottomNav from '@/components/BottomNav';
import { Toaster } from 'react-hot-toast';
import { TourContextProvider } from '@/context/TourContext';
import { AuthContextProvider } from '@/context/AuthContext';
import AppGate from '@/components/AppGate';

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthContextProvider>
      <TourContextProvider>
        {/* AppGate akan menangani Preloader & Onboarding */}
        <AppGate />

        <div className="bg-[#0A0A0A] text-white min-h-screen">
          <Toaster 
            position="top-center"
            toastOptions={{
              style: {
                background: '#333',
                color: '#fff',
              },
            }}
          />
          
          {/* PERBAIKAN: 
            Komponen <AnimatePresence> dan <motion.div> dihapus dari sini. 
            Ini adalah penyebab utama mengapa state pada halaman Mentor (dan mungkin halaman lain) 
            hilang saat navigasi. Dengan menghapusnya, kita memastikan komponen halaman 
            tidak di-unmount secara paksa selama transisi, sehingga menjaga koneksi data 
            dan state internalnya tetap hidup.
          */}
          {children}
          
          <BottomNav />
        </div>
      </TourContextProvider>
    </AuthContextProvider>
  );
}
