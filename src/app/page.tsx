'use client';

import { useRouter } from 'next/navigation';
import { motion, useScroll, useTransform } from 'framer-motion';
import { useRef } from 'react';
import Button from '@/components/Button';
import { ArrowDown, MessageSquare, Target, Wallet } from 'lucide-react';

// Komponen untuk setiap bagian cerita yang dianimasikan
const StorySection = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <section className={`h-screen flex flex-col items-center justify-center text-center p-6 snap-center ${className}`}>
    {children}
  </section>
);

export default function HomePage() {
  const router = useRouter();
  const targetRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: targetRef,
    offset: ["start start", "end end"]
  });

  const handleStart = () => {
    router.push('/login');
  };

  // PERBAIKAN 1: Mengatur ulang rentang animasi untuk mencegah tumpang tindih
  // Bagian pertama (Hero) akan memudar sepenuhnya di 20% awal scroll
  const heroOpacity = useTransform(scrollYProgress, [0, 0.2], [1, 0]);
  const heroScale = useTransform(scrollYProgress, [0, 0.2], [1, 0.8]);

  // Bagian kedua (Fitur) akan muncul setelah hero memudar, dan menghilang sebelum bagian akhir muncul
  const featureOpacity = useTransform(scrollYProgress, [0.25, 0.35, 0.65, 0.75], [0, 1, 1, 0]);
  const featureScale = useTransform(scrollYProgress, [0.25, 0.35], [0.9, 1]);

  // Bagian terakhir (CTA) hanya akan muncul di 15% akhir scroll
  const ctaOpacity = useTransform(scrollYProgress, [0.85, 1], [0, 1]);
  const ctaScale = useTransform(scrollYProgress, [0.85, 1], [0.95, 1]);

  return (
    // Container utama dengan tinggi yang disesuaikan untuk 4 "slide"
    <div ref={targetRef} className="relative h-[400vh] bg-[#0A0A0A] text-white">
      <div className="sticky top-0 h-screen overflow-hidden">
        
        {/* Bagian 1: Hero */}
        <motion.div style={{ opacity: heroOpacity, scale: heroScale }}>
          <StorySection>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-black uppercase tracking-wider">
              Arsitek Keuangan Pribadi
            </h1>
            <p className="mt-4 text-lg text-gray-400 max-w-xl mx-auto">
              Uang Bukan Masalahmu. Pola Pikirmu Masalahnya.
            </p>
            <motion.div 
              className="mt-12 flex flex-col items-center text-gray-500"
              animate={{ y: [0, 10, 0] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
            >
              <p className="text-sm">Scroll untuk memulai</p>
              <ArrowDown className="mt-1" />
            </motion.div>
          </StorySection>
        </motion.div>

        {/* Bagian 2: Fitur */}
        <motion.div 
          style={{ opacity: featureOpacity, scale: featureScale }} 
          className="absolute top-0 left-0 w-full h-full"
        >
          <StorySection>
            <h2 className="text-3xl font-bold mb-12">Ini Bukan Aplikasi Biasa. Ini Markas Besarmu.</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              {/* PERBAIKAN 2: Mengubah teks menjadi lebih ramah pengguna awam */}
              <div className="flex flex-col items-center p-4">
                <MessageSquare className="text-[#A8FF00]" size={40} />
                <h3 className="text-xl font-bold mt-4">Mentor AI</h3>
                <p className="mt-2 text-gray-400">Konsultasi strategi keuanganmu, bukan cuma teman curhat.</p>
              </div>
              <div className="flex flex-col items-center p-4">
                <Wallet className="text-[#A8FF00]" size={40} />
                <h3 className="text-xl font-bold mt-4">Catatan Uang</h3>
                <p className="mt-2 text-gray-400">Lacak semua pemasukan & pengeluaran untuk tahu ke mana uangmu pergi.</p>
              </div>
              <div className="flex flex-col items-center p-4">
                <Target className="text-[#A8FF00]" size={40} />
                <h3 className="text-xl font-bold mt-4">Pusat Misi</h3>
                <p className="mt-2 text-gray-400">Selesaikan tantangan finansial untuk mencapai tujuanmu selangkah demi selangkah.</p>
              </div>
            </div>
          </StorySection>
        </motion.div>

        {/* Bagian 3: Call to Action */}
        <motion.div 
          style={{ opacity: ctaOpacity, scale: ctaScale }}
          className="absolute top-0 left-0 w-full h-full"
        >
          <StorySection>
            <h2 className="text-4xl sm:text-5xl font-black">Siap Mengubah Cara Main?</h2>
            <p className="mt-4 text-lg text-gray-400 max-w-xl mx-auto">
              Hentikan kebiasaan lama. Mulai bangun masa depan yang layak kamu dapatkan.
            </p>
            <div className="mt-12 w-full max-w-xs mx-auto">
              <Button onClick={handleStart}>
                Mulai Sekarang
              </Button>
            </div>
          </StorySection>
        </motion.div>

      </div>
    </div>
  );
}
