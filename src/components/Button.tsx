'use client';

import { motion } from 'framer-motion';

// Tipe props untuk komponen Button
type ButtonProps = {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  type?: 'button' | 'submit' | 'reset';
  disabled?: boolean;
};

export default function Button({ 
  children, 
  onClick, 
  className = '', 
  type = 'button',
  disabled = false 
}: ButtonProps) {
  return (
    // 1. Ubah <button> menjadi motion.button
    <motion.button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`w-full font-bold py-3 px-6 rounded-lg border-2 border-[#A8FF00] text-[#A8FF00] transition-colors duration-300 hover:bg-[#A8FF00] hover:text-black disabled:bg-gray-600 disabled:border-gray-600 disabled:text-gray-400 disabled:cursor-not-allowed ${className}`}
      // 2. Tambahkan animasi saat di-hover dan ditekan
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 400, damping: 17 }}
    >
      {children}
    </motion.button>
  );
}
