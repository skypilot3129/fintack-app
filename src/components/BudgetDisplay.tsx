'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase';
import { collection, query, onSnapshot, where } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { motion } from 'framer-motion';
import { PiggyBank, Sparkles } from 'lucide-react';
import Button from './Button';
import toast from 'react-hot-toast';

// Tipe data yang jelas
interface Budget {
  id: string;
  categoryName: string;
  budgetedAmount: number;
  spentAmount: number;
}

interface GenerateBudgetsResult {
    success: boolean;
    message: string;
}

// Fungsi format
const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(value);
};

// Komponen untuk progress bar individual
const BudgetBar = ({ budget }: { budget: Budget }) => {
  const percentage = budget.budgetedAmount > 0 ? (budget.spentAmount / budget.budgetedAmount) * 100 : 0;
  const isOverBudget = percentage > 100;
  const barColor = isOverBudget ? 'bg-red-500' : 'bg-[#A8FF00]';

  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <span className="font-bold">{budget.categoryName}</span>
        <span className={isOverBudget ? 'text-red-400 font-bold' : 'text-gray-300'}>
          {formatCurrency(budget.spentAmount)} / {formatCurrency(budget.budgetedAmount)}
        </span>
      </div>
      <div className="w-full bg-gray-700 rounded-full h-2.5">
        <div 
          className={`${barColor} h-2.5 rounded-full transition-all duration-500`} 
          style={{ width: `${Math.min(percentage, 100)}%` }}
        ></div>
      </div>
    </div>
  );
};

export default function BudgetDisplay() {
  const { user } = useAuth();
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    if (!user) return;

    const currentMonthStr = new Date().toISOString().slice(0, 7); // Format: YYYY-MM
    const budgetsColRef = collection(db, 'users', user.uid, 'budgets');
    const q = query(budgetsColRef, where('month', '==', currentMonthStr));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedBudgets = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as Budget[];
      setBudgets(fetchedBudgets);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const handleGenerateBudgets = async () => {
    setIsGenerating(true);
    const toastId = toast.loading('Mas Eugene sedang menganalisis pengeluaranmu...');
    try {
        const functions = getFunctions();
        const setupInitialBudgets = httpsCallable(functions, 'setupInitialBudgets');
        const result = await setupInitialBudgets();
        // Gunakan tipe data yang sudah didefinisikan
        const resultData = result.data as GenerateBudgetsResult;
        toast.success(resultData.message, { id: toastId });
    } catch (error) {
        console.error("Error generating budgets:", error);
        toast.error("Gagal membuat rekomendasi budget.", { id: toastId });
    } finally {
        setIsGenerating(false);
    }
  };

  if (isLoading) {
    return <div className="bg-[#121212] p-6 rounded-lg border border-gray-800 h-48 animate-pulse"></div>;
  }

  if (budgets.length === 0) {
    return (
      <div className="bg-[#121212] p-8 rounded-lg border border-dashed border-gray-700 text-center">
        <PiggyBank className="mx-auto h-12 w-12 text-gray-500" />
        <h3 className="mt-4 text-lg font-bold text-white">Buat Amplop Digital Pertamamu</h3>
        <p className="mt-2 text-sm text-gray-400">
          Biar Mas Eugene analisis pengeluaranmu sebulan terakhir dan bikinin rekomendasi budget otomatis buat lo.
        </p>
        <div className="mt-6">
            <Button onClick={handleGenerateBudgets} disabled={isGenerating}>
                <Sparkles className="w-4 h-4 mr-2" />
                {isGenerating ? 'Menganalisis...' : 'Buatkan Rekomendasi Budget'}
            </Button>
        </div>
      </div>
    );
  }

  return (
    <motion.div 
      className="bg-[#121212] p-6 rounded-lg border border-gray-800"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <h2 className="text-xl font-bold mb-4">Amplop Digital Bulan Ini</h2>
      <div className="space-y-4">
        {budgets.map(budget => (
          <BudgetBar key={budget.id} budget={budget} />
        ))}
      </div>
    </motion.div>
  );
}
