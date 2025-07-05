'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import Preloader from './Preloader';
import OnboardingModal from './OnboardingModal';
import { AnimatePresence, motion } from 'framer-motion';

export default function AppGate() {
  const { user, loading: authLoading } = useAuth();
  const [status, setStatus] = useState<'preloading' | 'onboarding' | 'ready'>('preloading');

  useEffect(() => {
    // Logika untuk Preloader
    const minimumLoadingTime = 2500; // 2.5 detik
    const startTime = Date.now();

    const checkLoadingStatus = () => {
      const elapsedTime = Date.now() - startTime;
      if (!authLoading && elapsedTime >= minimumLoadingTime) {
        // Jika auth selesai dan waktu minimum tercapai, berhenti preloading
        // dan biarkan useEffect berikutnya menentukan status selanjutnya.
      } else {
        requestAnimationFrame(checkLoadingStatus);
      }
    };
    requestAnimationFrame(checkLoadingStatus);
    
    // Logika untuk Onboarding
    if (!authLoading && user) {
        const profileRef = doc(db, 'users', user.uid);
        const unsubscribe = onSnapshot(profileRef, (docSnap) => {
            const hasCompleted = docSnap.exists() && docSnap.data().hasCompletedOnboarding === true;
            
            // Tentukan status berdasarkan data onboarding
            if (hasCompleted) {
                setStatus('ready');
            } else {
                setStatus('onboarding');
            }
        });
        return () => unsubscribe();
    } else if (!authLoading && !user) {
        // Jika tidak ada user setelah loading, anggap siap (akan diarahkan ke halaman login)
        setStatus('ready');
    }

  }, [authLoading, user]);


  return (
    <AnimatePresence>
      {status === 'preloading' && (
        <motion.div key="preloader" exit={{ opacity: 0 }}>
          <Preloader />
        </motion.div>
      )}
      {status === 'onboarding' && (
        <motion.div key="onboarding">
          <OnboardingModal />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
