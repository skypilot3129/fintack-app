'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import Preloader from './Preloader';
import { AnimatePresence, motion } from 'framer-motion';

export default function AppGate({ children }: { children: React.ReactNode }) {
  const { loading: authLoading } = useAuth();
  const [isPreloading, setIsPreloading] = useState(true);

  useEffect(() => {
    const minimumLoadingTime = 2500;

    const loadingTimer = setTimeout(() => {
      if (!authLoading) {
        setIsPreloading(false);
      }
    }, minimumLoadingTime);

    return () => clearTimeout(loadingTimer);
  }, [authLoading]);

  return (
    <AnimatePresence mode="wait">
      {isPreloading ? (
        <motion.div key="preloader">
          <Preloader />
        </motion.div>
      ) : (
        <motion.div
          key="content"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
