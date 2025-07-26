'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, BrainCircuit, Sparkles } from 'lucide-react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import toast from 'react-hot-toast';
import ReactMarkdown from 'react-markdown';
import { Timestamp } from 'firebase/firestore';

// Tipe data yang jelas
interface TransactionData {
  id: string;
  amount: number;
  category: string;
  createdAt: Timestamp;
  description: string;
  type: 'income' | 'expense';
}

interface FinancialAnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  transactions: TransactionData[];
}

export default function FinancialAnalysisModal({ isOpen, onClose, transactions }: FinancialAnalysisModalProps) {
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Bungkus dengan useCallback agar referensinya stabil
  const handleGetAnalysis = useCallback(async () => {
    setIsAnalyzing(true);
    setAnalysisResult(null);
    try {
        const functions = getFunctions();
        const getFinancialAnalysis = httpsCallable(functions, 'getFinancialAnalysis');
        // Kirim hanya data yang relevan untuk mengurangi payload
        const transactionPayload = transactions.map(({ amount, category, type }) => ({ amount, category, type }));
        const result = await getFinancialAnalysis({ transactions: transactionPayload });
        const { analysis } = result.data as { success: boolean, analysis: string };
        setAnalysisResult(analysis);
    } catch (error) {
        console.error("Error getting financial analysis:", error);
        toast.error("Gagal mendapatkan analisis dari Mas Eugene.");
        onClose();
    } finally {
        setIsAnalyzing(false);
    }
  }, [transactions, onClose]); // Tambahkan dependencies

  useEffect(() => {
    if (isOpen && !analysisResult) {
      handleGetAnalysis();
    }
    if (!isOpen) {
        setAnalysisResult(null);
    }
  }, [isOpen, analysisResult, handleGetAnalysis]); // Tambahkan dependencies yang benar

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/70 z-50 flex justify-center items-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.95, y: 20 }}
            className="bg-[#18181B] border border-gray-700 shadow-2xl shadow-lime-500/10 rounded-lg w-full max-w-lg m-4 relative"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <BrainCircuit size={20}/> Analisis Keuangan dari Mentor
                </h3>
                <button onClick={onClose} className="text-gray-500 hover:text-white"><X size={20} /></button>
              </div>
              
              <div className="max-h-[60vh] overflow-y-auto pr-2">
                {isAnalyzing && (
                    <div className="flex flex-col items-center justify-center text-center py-10">
                        <Sparkles className="w-12 h-12 text-lime-400 animate-spin mb-4" />
                        <p className="text-gray-300">Mas Eugene lagi mikir keras...</p>
                        <p className="text-xs text-gray-500">Menganalisis data transaksimu.</p>
                    </div>
                )}
                {analysisResult && (
                    <div className="prose prose-sm prose-invert max-w-none text-gray-300">
                        <ReactMarkdown>{analysisResult}</ReactMarkdown>
                    </div>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
