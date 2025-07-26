'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Button from './Button';
import { getFunctions, httpsCallable } from 'firebase/functions';
import toast from 'react-hot-toast';

// Definisikan langkah-langkah tutorial
const steps = [
  {
    id: 'welcome',
    emoji: '👋',
    title: 'Selamat Datang di Fintack!',
    description: 'Ini bukan aplikasi buat ngatur recehan. Ini markas lo buat ngubah cara main dan menyerang kondisi finansial lo.',
    buttonText: 'Gue Siap!',
  },
  {
    id: 'gender',
    emoji: '👤',
    title: 'Biar Gue Kenal Lo',
    description: 'Pilih sapaan yang paling pas buat lo. Ini penting biar komunikasi kita nyambung.',
  },
  {
    id: 'map',
    emoji: '🗺️',
    title: 'Kenali Peta Perang Lo',
    description: 'Di Mentor, lo konsultasi sama gue. Di Laporan Intel, kita mata-matai duit lo. Di Arsenal, kita hitung amunisi lo. Dan di Misi, lo eksekusi rencana.',
    buttonText: 'Gue Ngerti.',
  },
  {
    id: 'mission',
    emoji: '🚀',
    title: 'Misi Pertama Lo',
    description: 'Cukup basa-basinya. Tugas pertama lo simpel: pergi ke halaman Mentor dan jawab pertanyaan ini: "Apa masalah keuangan terbesar lo saat ini?"',
    buttonText: 'Tancap Gas!',
  },
];

export default function OnboardingModal() {
  const [step, setStep] = useState(0);
  const [isCompleting, setIsCompleting] = useState(false);

  const handleGenderSelect = async (gender: 'male' | 'female') => {
    setIsCompleting(true);
    const toastId = toast.loading('Menyimpan pilihan...');
    try {
        const functions = getFunctions();
        const updateUserProfile = httpsCallable(functions, 'updateUserProfile');
        await updateUserProfile({ gender });
        toast.success('Sip, gue catat!', { id: toastId });
        setStep(step + 1); // Lanjut ke langkah berikutnya
    } catch (error) {
        console.error("Gagal menyimpan gender:", error);
        toast.error("Gagal menyimpan. Coba lagi.", { id: toastId });
    } finally {
        setIsCompleting(false);
    }
  };

  const handleNext = async () => {
    if (step < steps.length - 1) {
      setStep(step + 1);
    } else {
      setIsCompleting(true);
      try {
        const functions = getFunctions();
        const markOnboardingComplete = httpsCallable(functions, 'markOnboardingComplete');
        await markOnboardingComplete();
      } catch (error) {
        console.error("Gagal menyelesaikan onboarding:", error);
        toast.error("Gagal memulai. Coba refresh halaman.");
        setIsCompleting(false);
      }
    }
  };

  const currentStep = steps[step];

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
          <div className="text-6xl mb-4">{currentStep.emoji}</div>
          <h2 className="text-2xl font-bold text-white mb-2">{currentStep.title}</h2>
          <p className="text-gray-400 mb-6">{currentStep.description}</p>
          
          {currentStep.id === 'gender' ? (
            <div className="space-y-3">
                {/* Perbaikan di sini: ganti kutip satu dengan &apos; */}
                <Button onClick={() => handleGenderSelect('male')} disabled={isCompleting}>
                    Panggil gue &apos;Bro&apos;
                </Button>
                <Button onClick={() => handleGenderSelect('female')} disabled={isCompleting}>
                    Panggil gue &apos;Mbak / Kak&apos;
                </Button>
            </div>
          ) : (
            <Button onClick={handleNext} disabled={isCompleting}>
              {isCompleting ? 'Memproses...' : currentStep.buttonText}
            </Button>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
