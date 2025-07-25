// src/components/TourHighlight.tsx
'use client';

import { useTour } from '@/context/TourContext';
import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';
import Button from './Button';

interface TourHighlightProps {
  tourId: string;
  title: string;
  description: string;
  children: React.ReactNode;
}

export default function TourHighlight({ tourId, title, description, children }: TourHighlightProps) {
  const { seenTours, markTourAsSeen, isProfileLoading } = useTour();
  const [showTour, setShowTour] = useState(false);

  useEffect(() => {
    // Tampilkan tur hanya jika profil sudah dimuat dan tur ini belum pernah dilihat
    if (!isProfileLoading && !seenTours[tourId]) {
      // Tambahkan sedikit delay agar tidak muncul terlalu tiba-tiba
      const timer = setTimeout(() => setShowTour(true), 500);
      return () => clearTimeout(timer);
    }
  }, [isProfileLoading, seenTours, tourId]);

  const handleClose = () => {
    setShowTour(false);
    markTourAsSeen(tourId);
  };

  return (
    <>
      {children}
      <AnimatePresence>
        {showTour && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="relative bg-[#18181B] border border-gray-700 rounded-lg w-full max-w-sm p-6 text-center"
            >
              <h3 className="text-lg font-bold text-[#A8FF00] mb-2">{title}</h3>
              <p className="text-gray-400 text-sm mb-6">{description}</p>
              <Button onClick={handleClose}>Oke, Paham!</Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
