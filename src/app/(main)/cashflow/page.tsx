'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, query, Timestamp, orderBy } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import Button from '@/components/Button';
// PERBAIKAN: Impor komponen FinancialCharts dari file terpisah
import FinancialCharts from '@/components/FinancialCharts'; 
import { Plus, TrendingDown, TrendingUp } from 'lucide-react';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

interface Transaction {
  id?: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
  category: string;
  createdAt: Timestamp; // Menggunakan 'createdAt'
};

export default function CashflowPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [category, setCategory] = useState('');
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user) {
      const q = query(collection(db, `users/${user.uid}/transactions`), orderBy('createdAt', 'desc'));
      const unsubscribe = onSnapshot(q, (snap) => {
        setTransactions(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction)));
        setLoading(false);
      });
      return () => unsubscribe();
    }
  }, [user]);

  const handleAddTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description || !amount || !category || !user) {
        toast.error("Semua field harus diisi.");
        return;
    }
    setIsSubmitting(true);

    const formData = { description, amount, type, category };
    
    setDescription('');
    setAmount('');
    setCategory('');
    setType('expense');
    setShowForm(false);

    try {
        const functions = getFunctions();
        const addTransaction = httpsCallable(functions, 'addTransaction');
        const result = await addTransaction({
            description: formData.description,
            amount: parseFloat(formData.amount),
            type: formData.type,
            category: formData.category,
        });
        
        toast.success((result.data as any).message || 'Transaksi berhasil! +5 XP');

    } catch (error) {
        console.error("Gagal menambah transaksi:", error);
        toast.error("Gagal menambah transaksi. Coba lagi nanti.");
    } finally {
        setIsSubmitting(false);
    }
  };

  const formatCurrency = (value: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(value);
  
  const cashFlowSummary = useMemo(() => {
    return transactions.reduce((acc, curr) => {
      if (curr.type === 'income') acc.totalIncome += curr.amount;
      else acc.totalExpense += curr.amount;
      acc.balance = acc.totalIncome - acc.totalExpense;
      return acc;
    }, { totalIncome: 0, totalExpense: 0, balance: 0 });
  }, [transactions]);

  if (authLoading || loading || !user) {
    return <main className="flex min-h-screen items-center justify-center bg-[#0A0A0A] text-white"><p>Memuat data Arus Kas...</p></main>;
  }

  return (
    <main className="p-4 md:p-6 lg:p-8 bg-[#0A0A0A] pb-28 text-white">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
            <h1 className="text-3xl font-black uppercase text-[#A8FF00]">Arus Kas</h1>
            <p className="text-gray-400 mt-2">Lacak pemasukan dan pengeluaran untuk melihat kesehatan keuanganmu.</p>
        </div>
        
        <FinancialCharts transactions={transactions} />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 my-8">
          <div className="bg-gray-800 p-4 rounded-lg"><p className="text-sm text-gray-400">Total Pemasukan</p><p className="text-lg font-bold text-green-400">{formatCurrency(cashFlowSummary.totalIncome)}</p></div>
          <div className="bg-gray-800 p-4 rounded-lg"><p className="text-sm text-gray-400">Total Pengeluaran</p><p className="text-lg font-bold text-red-400">{formatCurrency(cashFlowSummary.totalExpense)}</p></div>
          <div className="bg-gray-800 p-4 rounded-lg"><p className="text-sm text-gray-400">Sisa Uang</p><p className={`text-lg font-bold ${cashFlowSummary.balance >= 0 ? 'text-white' : 'text-red-500'}`}>{formatCurrency(cashFlowSummary.balance)}</p></div>
        </div>

        <div className="bg-[#121212] p-4 rounded-lg border border-gray-800">
            <button onClick={() => setShowForm(!showForm)} className="w-full flex justify-between items-center font-bold">
                <span>Tambah Transaksi Baru</span>
                <Plus size={20} className={`transition-transform duration-300 ${showForm ? 'rotate-45' : ''}`} />
            </button>
            <AnimatePresence>
              {showForm && (
                  <motion.form 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    onSubmit={handleAddTransaction} 
                    className="overflow-hidden grid grid-cols-1 md:grid-cols-2 gap-4 items-end"
                  >
                      <div className="mt-4"><label htmlFor="description" className="text-xs text-gray-400">Deskripsi</label><input id="description" type="text" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Gaji bulanan, makan siang..." className="w-full bg-gray-800 rounded-lg px-4 py-2 mt-1 text-sm focus:outline-none focus:ring-2 focus:ring-[#A8FF00]"/></div>
                      <div className="mt-4"><label htmlFor="amount" className="text-xs text-gray-400">Jumlah (Rp)</label><input id="amount" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="50000" className="w-full bg-gray-800 rounded-lg px-4 py-2 mt-1 text-sm focus:outline-none focus:ring-2 focus:ring-[#A8FF00]"/></div>
                      <div className="mt-4"><label htmlFor="category" className="text-xs text-gray-400">Kategori</label><input id="category" type="text" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Makanan, Gaji" className="w-full bg-gray-800 rounded-lg px-4 py-2 mt-1 text-sm focus:outline-none focus:ring-2 focus:ring-[#A8FF00]"/></div>
                      <div className="flex items-center space-x-4 pt-6 mt-4"><div className="flex items-center"><input type="radio" id="expense" name="type" value="expense" checked={type === 'expense'} onChange={() => setType('expense')} className="form-radio h-4 w-4 text-[#A8FF00] bg-gray-700 border-gray-600 focus:ring-[#A8FF00]"/><label htmlFor="expense" className="ml-2 text-sm">Keluar</label></div><div className="flex items-center"><input type="radio" id="income" name="type" value="income" checked={type === 'income'} onChange={() => setType('income')} className="form-radio h-4 w-4 text-[#A8FF00] bg-gray-700 border-gray-600 focus:ring-[#A8FF00]"/><label htmlFor="income" className="ml-2 text-sm">Masuk</label></div></div>
                      <div className="md:col-span-2"><Button type="submit" className="w-full" disabled={isSubmitting}>{isSubmitting ? 'Menyimpan...' : 'Tambah'}</Button></div>
                  </motion.form>
              )}
            </AnimatePresence>
        </div>

        <div className="mt-8">
          <h3 className="font-bold mb-4 text-lg">Transaksi Terakhir</h3>
          <ul className="space-y-3">{transactions.map((t) => (
            <li key={t.id} className="flex items-center bg-gray-800 p-3 rounded-lg">
                <div className={`mr-4 p-2 rounded-full ${t.type === 'income' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                    {t.type === 'income' ? <TrendingUp size={20}/> : <TrendingDown size={20}/>}
                </div>
                <div className="flex-grow">
                    <p className="font-semibold">{t.description}</p>
                    <p className="text-xs text-gray-400">{t.category}</p>
                </div>
                <div className="text-right">
                    <p className={`font-bold text-base ${t.type === 'income' ? 'text-green-400' : 'text-red-400'}`}>{t.type === 'expense' && '-'}{formatCurrency(t.amount)}</p>
                    <p className="text-xs text-gray-500">{t.createdAt.toDate().toLocaleDateString('id-ID')}</p>
                </div>
            </li>
          ))}</ul>
        </div>
      </div>
    </main>
  );
}
