'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import Button from './Button';
import CurrencyInput from './CurrencyInput';
import toast from 'react-hot-toast';
import { db } from '@/lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { useAuth } from '@/context/AuthContext';
import { getFunctions, httpsCallable } from 'firebase/functions';

// Tipe data yang jelas
interface TransactionInitialData {
  id?: string;
  amount: number | string;
  description: string;
  category: string;
  type?: 'income' | 'expense';
}

interface AddTransactionResult {
    success: boolean;
    message: string;
}

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: TransactionInitialData | null;
}

export default function TransactionModal({ isOpen, onClose, initialData }: TransactionModalProps) {
  const { user } = useAuth();
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [category, setCategory] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const isEditMode = !!(initialData && initialData.id);

  const resetForm = useCallback(() => {
    setDescription('');
    setAmount('');
    setType('expense');
    setCategory('');
  }, []);

  useEffect(() => {
    if (initialData && isOpen) {
      setDescription(initialData.description || '');
      setAmount(initialData.amount?.toString() || '');
      setCategory(initialData.category || '');
      setType(initialData.type || 'expense');
    } else {
      resetForm();
    }
  }, [initialData, isOpen, resetForm]);

  const handleClose = () => {
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!description || !amount || !category) {
      return toast.error('Semua kolom wajib diisi, Bro!');
    }
    setIsLoading(true);
    const toastId = toast.loading(isEditMode ? 'Memperbarui transaksi...' : 'Mencatat transaksi...');

    try {
        if (isEditMode && initialData?.id) {
            const docRef = doc(db, 'users', user.uid, 'transactions', initialData.id);
            await updateDoc(docRef, { 
                description, 
                amount: parseFloat(amount), 
                type, 
                category 
            });
            toast.success("Transaksi berhasil diperbarui!", { id: toastId });
        } else {
            const functions = getFunctions();
            const addTransaction = httpsCallable(functions, 'addTransaction');
            const result = await addTransaction({ description, amount, type, category });
            const resultData = result.data as AddTransactionResult;
            toast.success(resultData.message, { id: toastId });
        }
        handleClose();
    } catch (error) {
        console.error("Error saving transaction:", error);
        toast.error("Gagal menyimpan transaksi.", { id: toastId });
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/70 z-50 flex justify-center items-center p-4"
          onClick={handleClose}
        >
          <motion.div
            initial={{ scale: 0.95, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.95, y: 20 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            className="bg-[#18181B] border border-gray-700 shadow-2xl shadow-lime-500/10 rounded-lg w-full max-w-md m-4 relative"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold text-white">{isEditMode ? 'Edit Transaksi' : 'Catat Transaksi Baru'}</h3>
                    <button onClick={handleClose} className="text-gray-500 hover:text-white"><X size={20} /></button>
                </div>
                
                <form onSubmit={handleSubmit} className="space-y-4">
                    <input
                        type="text"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Deskripsi (e.g., Kopi Kenangan)"
                        className="input-style w-full"
                        disabled={isLoading}
                    />
                    <CurrencyInput
                        value={amount}
                        onChange={setAmount}
                        placeholder="Jumlah (e.g., Rp 25.000)"
                        className="input-style w-full"
                    />
                    <input
                        type="text"
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        placeholder="Kategori (e.g., Jajan)"
                        className="input-style w-full"
                        disabled={isLoading}
                    />
                    <div className="flex gap-4">
                        <button type="button" onClick={() => setType('expense')} className={`w-full py-3 rounded-lg text-sm font-bold transition-colors ${type === 'expense' ? 'bg-red-500/20 text-red-400 ring-2 ring-red-500' : 'bg-gray-700 text-gray-400'}`}>
                            Pengeluaran
                        </button>
                        <button type="button" onClick={() => setType('income')} className={`w-full py-3 rounded-lg text-sm font-bold transition-colors ${type === 'income' ? 'bg-green-500/20 text-green-400 ring-2 ring-green-500' : 'bg-gray-700 text-gray-400'}`}>
                            Pemasukan
                        </button>
                    </div>
                    <Button type="submit" disabled={isLoading} className="w-full !mt-6">
                        {isLoading ? 'Menyimpan...' : 'Simpan Transaksi'}
                    </Button>
                </form>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
