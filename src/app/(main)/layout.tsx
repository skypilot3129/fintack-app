'use client';

import BottomNav from '@/components/BottomNav';
import { Toaster } from 'react-hot-toast';
import { AnimatePresence, motion } from 'framer-motion';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import OnboardingModal from '@/components/OnboardingModal'; // 1. Impor OnboardingModal
import { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { user } = useAuth(); // Kita hanya butuh 'user' di sini
  const [showOnboarding, setShowOnboarding] = useState(false);

  // 2. useEffect untuk mengecek status onboarding pengguna
  useEffect(() => {
    if (user) {
      const profileRef = doc(db, 'users', user.uid);
      const unsubscribe = onSnapshot(profileRef, (docSnap) => {
        // Tampilkan modal jika field 'hasCompletedOnboarding' tidak ada atau bernilai false
        if (!docSnap.exists() || docSnap.data().hasCompletedOnboarding === false) {
          setShowOnboarding(true);
        } else {
          setShowOnboarding(false);
        }
      });
      return () => unsubscribe();
    }
  }, [user]);

  return (
    <div className="h-screen bg-[#0A0A0A] flex flex-col">
      <Toaster 
        position="top-center"
        toastOptions={{
          style: {
            background: '#333',
            color: '#fff',
          },
        }}
      />
      
      {/* 3. Tampilkan modal sebagai overlay jika diperlukan */}
      <AnimatePresence>
        {showOnboarding && <OnboardingModal />}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        <motion.main
          key={pathname}
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 15 }}
          transition={{ duration: 0.3, ease: 'easeInOut' }}
          className="flex-grow overflow-y-auto"
        >
          {children}
        </motion.main>
      </AnimatePresence>
      
      <div className="flex-shrink-0">
        <BottomNav />
      </div>
    </div>
  );
}
