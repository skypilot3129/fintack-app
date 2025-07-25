'use client';

import BottomNav from '@/components/BottomNav';
import { Toaster } from 'react-hot-toast';
import { AnimatePresence, motion } from 'framer-motion';
import { usePathname } from 'next/navigation';
import { TourContextProvider } from '@/context/TourContext'; // <-- Impor provider baru

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    // Bungkus seluruh layout dengan TourContextProvider
    <TourContextProvider>
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
    </TourContextProvider>
  );
}
