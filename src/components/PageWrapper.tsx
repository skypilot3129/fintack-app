'use client';

import { motion } from 'framer-motion';

const PageWrapper = ({ children }: { children: React.ReactNode }) => (
  <motion.div
    initial={{ opacity: 0, y: 15 }} // Mulai dari transparan dan sedikit di bawah
    animate={{ opacity: 1, y: 0 }}   // Animasikan menjadi terlihat dan ke posisi normal
    exit={{ opacity: 0, y: 15 }}      // Animasikan keluar saat halaman berganti
    transition={{ duration: 0.5, ease: 'easeInOut' }} // Durasi dan jenis animasi
  >
    {children}
  </motion.div>
);

export default PageWrapper;