'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Button from './Button';
import { getFunctions, httpsCallable } from 'firebase/functions';
import toast from 'react-hot-toast';

// Definisikan langkah-langkah tutorial
const steps = [
  {
    emoji: '👋',
    title: 'Selamat Datang di Fintack!',
    description: 'Ini bukan aplikasi buat ngatur recehan. Ini markas lo buat ngubah cara main dan menyerang kondisi finansial lo.',
    buttonText: 'Gue Siap!',
  },
  {
    emoji: '🗺️',
    title: 'Kenali Peta Perang Lo',
    description: 'Di Mentor, lo konsultasi sama gue. Di Laporan Intel, kita mata-matai duit lo. Di Arsenal, kita hitung amunisi lo. Dan di Misi, lo eksekusi rencana.',
    buttonText: 'Gue Ngerti.',
  },
  {
    emoji: '🚀',
    title: 'Misi Pertama Lo',
    description: 'Cukup basa-basinya. Tugas pertama lo simpel: pergi ke halaman Mentor dan jawab pertanyaan ini: "Apa masalah keuangan terbesar lo saat ini?"',
    buttonText: 'Tancap Gas!',
  },
];

export default function OnboardingModal() {
  const [step, setStep] = useState(0);
  const [isCompleting, setIsCompleting] = useState(false);

  const handleNext = async () => {
    if (step < steps.length - 1) {
      setStep(step + 1);
    } else {
      // Langkah terakhir: panggil backend untuk menandai onboarding selesai
      setIsCompleting(true);
      try {
        const functions = getFunctions();
        const markOnboardingComplete = httpsCallable(functions, 'markOnboardingComplete');
        await markOnboardingComplete();
        // State di komponen parent akan menangani penutupan modal
      } catch (error) {
        console.error("Gagal menyelesaikan onboarding:", error);
        toast.error("Gagal memulai. Coba refresh halaman.");
        setIsCompleting(false);
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          transition={{ duration: 0.3, ease: 'easeInOut' }}
          className="bg-[#121212] border border-gray-800 rounded-lg w-full max-w-sm p-8 text-center"
        >
          <div className="text-6xl mb-4">{steps[step].emoji}</div>
          <h2 className="text-2xl font-bold text-white mb-2">{steps[step].title}</h2>
          <p className="text-gray-400 mb-6">{steps[step].description}</p>
          <Button onClick={handleNext} disabled={isCompleting}>
            {isCompleting ? 'Memulai...' : steps[step].buttonText}
          </Button>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
