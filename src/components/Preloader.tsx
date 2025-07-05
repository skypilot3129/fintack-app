'use client';

import { motion } from 'framer-motion';

// Varian animasi untuk SVG path (garis grafik)
const draw = {
  hidden: { pathLength: 0, opacity: 0 },
  visible: {
    pathLength: 1,
    opacity: 1,
    transition: {
      pathLength: { type: "spring", duration: 2, bounce: 0 },
      opacity: { duration: 0.01 }
    }
  }
};

// Varian animasi untuk teks logo "Fintack"
const textFadeIn = {
    hidden: { opacity: 0, y: 10 },
    visible: {
        opacity: 1,
        y: 0,
        transition: {
            delay: 1.5, // Muncul setelah garis selesai digambar
            duration: 0.8,
            ease: "easeInOut"
        }
    }
}

export default function Preloader() {
  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-[#0A0A0A] z-50">
      {/* Kontainer untuk SVG */}
      <motion.svg
        width="200"
        height="150"
        viewBox="0 0 200 150"
        initial="hidden"
        animate="visible"
      >
        {/* Garis Grafik yang Datar lalu Melesat Naik */}
        <motion.path
          d="M 10 120 L 80 120 L 150 40 L 190 10"
          stroke="#A8FF00"
          strokeWidth="8"
          fill="none"
          strokeLinecap="round"
          variants={draw}
        />
        {/* Teks Logo Fintack */}
        <motion.text
            x="50%"
            y="55%"
            dominantBaseline="middle"
            textAnchor="middle"
            fontSize="40"
            fontWeight="bold"
            fill="#FFFFFF"
            variants={textFadeIn}
        >
            Fintack
        </motion.text>
      </motion.svg>
      <p className="mt-4 text-gray-400 text-sm animate-pulse">Membangun Rencana...</p>
    </div>
  );
}
