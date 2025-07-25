// src/components/CurrencyInput.tsx
'use client';

import React from 'react';

// Tipe props untuk komponen Input Mata Uang
interface CurrencyInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

const CurrencyInput: React.FC<CurrencyInputProps> = ({ value, onChange, placeholder, className }) => {
  
  // Fungsi untuk memformat angka ke format Rupiah
  const format = (numStr: string) => {
    if (!numStr) return '';
    const number = parseInt(numStr.replace(/[^0-9]/g, ''), 10);
    if (isNaN(number)) return '';
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(number);
  };

  // Fungsi untuk meng-unformat string Rupiah kembali menjadi angka
  const unformat = (formattedValue: string) => {
    return formattedValue.replace(/[^0-9]/g, '');
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = unformat(e.target.value);
    onChange(rawValue);
  };

  return (
    <input
      type="text"
      value={format(value)}
      onChange={handleChange}
      placeholder={placeholder}
      className={className}
      inputMode="numeric" // Menampilkan keyboard numerik di mobile
    />
  );
};

export default CurrencyInput;
