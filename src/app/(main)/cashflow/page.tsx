'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, query, Timestamp, orderBy, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import Button from '@/components/Button';
import FinancialCharts from '@/components/FinancialCharts';
import CurrencyInput from '@/components/CurrencyInput';
import TourHighlight from '@/components/TourHighlight';
import CashflowPageSkeleton from '@/components/CashflowPageSkeleton'; // <-- Impor Skeleton
import { Plus, TrendingDown, TrendingUp, Camera, Sparkles, X, Trash2, Pencil, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import React from 'react';

// Tipe data untuk Transaksi
interface Transaction {
  id: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
  category: string;
  createdAt: Timestamp;
};

interface ScannedData {
    amount?: number;
    description?: string;
    category?: string;
}

interface AnalysisResponse {
    success: boolean;
    analysis?: string;
}

type FilterType = 'all' | 'week' | 'month';

export default function CashflowPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState<Transaction | null>(null);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [category, setCategory] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [isScanning, setIsScanning] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showAnalysisModal, setShowAnalysisModal] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const [activeFilter, setActiveFilter] = useState<FilterType>('month');
  const [searchTerm, setSearchTerm] = useState('');
  
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user) {
      const q = query(collection(db, `users/${user.uid}/transactions`), orderBy('createdAt', 'desc'));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        setTransactions(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Transaction)));
        setIsLoading(false);
      });
      return () => unsubscribe();
    }
  }, [user]);

  const filteredTransactions = useMemo(() => {
    const now = new Date();
    const oneWeekAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    return transactions.filter(t => {
      const transactionDate = t.createdAt.toDate();
      
      let dateFilterPassed = false;
      if (activeFilter === 'all') {
        dateFilterPassed = true;
      } else if (activeFilter === 'week') {
        dateFilterPassed = transactionDate >= oneWeekAgo;
      } else if (activeFilter === 'month') {
        dateFilterPassed = transactionDate >= firstDayOfMonth;
      }

      const searchTermLower = searchTerm.toLowerCase();
      const searchFilterPassed = t.description.toLowerCase().includes(searchTermLower) || t.category.toLowerCase().includes(searchTermLower);

      return dateFilterPassed && searchFilterPassed;
    });
  }, [transactions, activeFilter, searchTerm]);

  const summary = useMemo(() => {
    return filteredTransactions.reduce(
      (acc, curr) => {
        if (curr.type === 'income') acc.totalIncome += curr.amount;
        else acc.totalExpense += curr.amount;
        return acc;
      },
      { totalIncome: 0, totalExpense: 0 }
    );
  }, [filteredTransactions]);

  const openModal = (transactionToEdit: Transaction | null = null) => {
    if (transactionToEdit) {
      setIsEditing(transactionToEdit);
      setDescription(transactionToEdit.description);
      setAmount(String(transactionToEdit.amount));
      setType(transactionToEdit.type);
      setCategory(transactionToEdit.category);
    } else {
      setIsEditing(null);
      setDescription('');
      setAmount('');
      setType('expense');
      setCategory('');
    }
    setIsModalOpen(true);
  };

  const closeModal = () => setIsModalOpen(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !description || !amount || !category) {
      toast.error('Semua field harus diisi, bro!');
      return;
    }
    setIsSubmitting(true);
    const amountNumber = parseFloat(amount.replace(/[^0-9]/g, ''));

    try {
        if (isEditing) {
            const transactionRef = doc(db, `users/${user.uid}/transactions`, isEditing.id);
            await updateDoc(transactionRef, { description, amount: amountNumber, type, category });
            toast.success('Transaksi berhasil diperbarui!');
        } else {
            const functions = getFunctions();
            const addTransaction = httpsCallable(functions, 'addTransaction');
            await addTransaction({ description, amount: amountNumber, type, category });
            toast.success('Transaksi berhasil ditambah. +5 XP!');
        }
        closeModal();
    } catch (error) {
        console.error("Error submitting transaction:", error);
        toast.error("Gagal menyimpan transaksi.");
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (user && confirm("Yakin mau hapus transaksi ini?")) {
        try {
            await deleteDoc(doc(db, `users/${user.uid}/transactions`, id));
            toast.success("Transaksi berhasil dihapus.");
        // PERBAIKAN: Menghapus '(error)' yang tidak digunakan
        } catch { 
            toast.error("Gagal menghapus transaksi.");
        }
    }
  }

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    setIsScanning(true);
    const toastId = toast.loading('Memindai struk...');

    try {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onloadend = async () => {
            const base64String = (reader.result as string).split(',')[1];
            const functions = getFunctions();
            const scanReceipt = httpsCallable<unknown, { success: boolean; data: ScannedData }>(functions, 'scanReceipt');
            const result = await scanReceipt({ imageB64: base64String, mimeType: file.type });

            if (result.data.success && result.data.data) {
                const { amount, description, category } = result.data.data;
                setAmount(amount ? String(amount) : '');
                setDescription(description || '');
                setCategory(category || '');
                setType('expense');
                setIsEditing(null);
                setIsModalOpen(true);
                toast.success('Data struk berhasil dipindai!', { id: toastId });
            } else {
                throw new Error('Gagal memindai data dari struk.');
            }
        };
    } catch (error) {
        console.error("Error scanning receipt:", error);
        toast.error('Gagal memindai struk.', { id: toastId });
    } finally {
        setIsScanning(false);
        if(fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleAnalysis = async () => {
      if (!user || filteredTransactions.length === 0) {
          toast.error("Tidak ada data untuk dianalisis pada periode ini.");
          return;
      }
      setIsAnalyzing(true);
      const toastId = toast.loading('Meminta analisis dari mentor AI...');
      try {
          const functions = getFunctions();
          const getFinancialAnalysis = httpsCallable<unknown, AnalysisResponse>(functions, 'getFinancialAnalysis');
          const result = await getFinancialAnalysis({ transactions: filteredTransactions.slice(0, 50) });
          
          if (result.data.success && result.data.analysis) {
              setAnalysisResult(result.data.analysis);
              setShowAnalysisModal(true);
              toast.success("Analisis selesai!", { id: toastId });
          } else {
              throw new Error("Gagal mendapatkan analisis.");
          }
      } catch (error) {
          console.error("Error getting analysis:", error);
          toast.error("Gagal mendapatkan analisis dari AI.", { id: toastId });
      } finally {
          setIsAnalyzing(false);
      }
  };

  const formatCurrency = (value: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(value);

  // PERBAIKAN: Ganti teks loading dengan komponen skeleton
  if (authLoading || isLoading || !user) {
    return <CashflowPageSkeleton />;
  }

  return (
    <TourHighlight
      tourId="cashflow"
      title="Selamat Datang di Catatan Uang!"
      description="Ini adalah pusat datamu. Catat semua pemasukan dan pengeluaran secara manual atau pakai fitur scan struk. Minta analisis dari AI untuk mendapatkan insight dari datamu."
    >
      <main className="p-4 md:p-6 lg:p-8 bg-[#0A0A0A] pb-28 text-white">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-black text-center uppercase text-[#A8FF00]">Catatan Uang</h1>
          <p className="text-center text-gray-400 mt-2">Lacak pergerakan uangmu untuk mendapatkan laporan intelijen dari AI.</p>
          
          <div className="mt-8 flex flex-col items-center gap-4">
              <Button onClick={handleAnalysis} disabled={isAnalyzing} className="w-full max-w-sm flex items-center justify-center gap-2 bg-gray-700 border-gray-700 text-white hover:bg-gray-600">
                  <Sparkles size={18} /> {isAnalyzing ? 'Menganalisis...' : 'Minta Analisis dari Mentor'}
              </Button>
              <div className="flex flex-wrap justify-center items-center gap-4">
                  <Button onClick={() => openModal()} className="flex items-center justify-center gap-2">
                      <Plus size={18} /> Tambah Manual
                  </Button>
                  <Button onClick={() => fileInputRef.current?.click()} disabled={isScanning} className="flex items-center justify-center gap-2 bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700 hover:text-white">
                      <Camera size={18} /> {isScanning ? 'Memindai...' : 'Scan Struk'}
                  </Button>
              </div>
              <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
          </div>

          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700">
              <p className="text-sm text-gray-400">Total Pemasukan</p>
              <p className="text-xl font-bold text-green-400">{formatCurrency(summary.totalIncome)}</p>
            </div>
            <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700">
              <p className="text-sm text-gray-400">Total Pengeluaran</p>
              <p className="text-xl font-bold text-red-400">{formatCurrency(summary.totalExpense)}</p>
            </div>
            <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700">
              <p className="text-sm text-gray-400">Cash Flow</p>
              <p className={`text-xl font-bold ${summary.totalIncome - summary.totalExpense >= 0 ? 'text-white' : 'text-red-500'}`}>
                {formatCurrency(summary.totalIncome - summary.totalExpense)}
              </p>
            </div>
          </div>

          <div className="mt-8">
              <div className="flex flex-col sm:flex-row gap-4">
                  <div className="relative flex-grow">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                      <input 
                          type="text"
                          placeholder="Cari deskripsi atau kategori..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="input-style w-full pl-10"
                      />
                  </div>
                  <div className="flex-shrink-0 bg-[#121212] border border-gray-800 rounded-lg p-1 flex items-center space-x-1">
                      {(['month', 'week', 'all'] as FilterType[]).map(filter => (
                          <button 
                              key={filter}
                              onClick={() => setActiveFilter(filter)}
                              className={`px-3 py-1.5 text-sm font-semibold rounded-md transition-colors ${activeFilter === filter ? 'bg-[#A8FF00] text-black' : 'text-gray-400 hover:bg-gray-700'}`}
                          >
                              {filter === 'month' ? 'Bulan Ini' : filter === 'week' ? 'Minggu Ini' : 'Semua'}
                          </button>
                      ))}
                  </div>
              </div>
          </div>

          <div className="mt-6">
              <h3 className="font-bold mb-4">Riwayat Transaksi</h3>
              <div className="space-y-3">
                  {filteredTransactions.length > 0 ? filteredTransactions.map((t) => (
                      <div key={t.id} className="flex justify-between items-center bg-[#121212] p-3 rounded-lg border border-gray-800">
                          <div className="flex items-center gap-3">
                              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${t.type === 'income' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                                  {t.type === 'income' ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
                              </div>
                              <div>
                                  <p className="font-semibold">{t.description}</p>
                                  <p className="text-xs text-gray-400">{t.category} - {t.createdAt.toDate().toLocaleDateString('id-ID')}</p>
                              </div>
                          </div>
                          <div className="flex items-center gap-4">
                              <p className={`font-bold ${t.type === 'income' ? 'text-green-400' : 'text-red-400'}`}>
                                  {formatCurrency(t.amount)}
                              </p>
                              <button onClick={() => openModal(t)} className="text-gray-500 hover:text-white"><Pencil size={16}/></button>
                              <button onClick={() => handleDelete(t.id)} className="text-gray-500 hover:text-red-500"><Trash2 size={16}/></button>
                          </div>
                      </div>
                  )) : (
                      <div className="text-center py-10 bg-[#121212] rounded-lg border border-gray-800">
                          <p className="text-gray-500">Tidak ada transaksi yang cocok dengan filter.</p>
                      </div>
                  )}
              </div>
          </div>
          
          <FinancialCharts transactions={filteredTransactions} />
        </div>

        <AnimatePresence>
          {isModalOpen && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/70 z-50 flex justify-center items-center p-4" onClick={closeModal}>
              <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} className="bg-[#18181B] border border-gray-700 rounded-lg w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
                <h2 className="text-lg font-bold mb-6">{isEditing ? 'Edit Transaksi' : 'Tambah Transaksi Baru'}</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                      <button type="button" onClick={() => setType('expense')} className={`py-3 rounded-lg font-bold text-sm transition-colors ${type === 'expense' ? 'bg-red-500 text-white' : 'bg-gray-700 text-gray-300'}`}>Pengeluaran</button>
                      <button type="button" onClick={() => setType('income')} className={`py-3 rounded-lg font-bold text-sm transition-colors ${type === 'income' ? 'bg-green-500 text-white' : 'bg-gray-700 text-gray-300'}`}>Pemasukan</button>
                  </div>
                  <div>
                    <label htmlFor="amount" className="text-xs text-gray-400">Jumlah</label>
                    <CurrencyInput value={amount} onChange={setAmount} placeholder="Rp 0" className="input-style w-full mt-1 text-lg" />
                  </div>
                  <div>
                    <label htmlFor="description" className="text-xs text-gray-400">Deskripsi</label>
                    <input id="description" type="text" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Makan siang, Gaji, dll." className="input-style w-full mt-1" />
                  </div>
                  <div>
                    <label htmlFor="category" className="text-xs text-gray-400">Kategori</label>
                    <input id="category" type="text" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Makanan, Transportasi, Gaji" className="input-style w-full mt-1" />
                  </div>
                  <div className="pt-4 flex space-x-3">
                      <Button type="button" onClick={closeModal} className="bg-gray-600 border-gray-600 text-white hover:bg-gray-500">Batal</Button>
                      <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Menyimpan...' : 'Simpan Transaksi'}</Button>
                  </div>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showAnalysisModal && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/70 z-50 flex justify-center items-center p-4" onClick={() => setShowAnalysisModal(false)}>
                  <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }} transition={{ type: 'spring', stiffness: 400, damping: 25 }} className="bg-[#18181B] border border-gray-700 shadow-2xl shadow-lime-500/10 rounded-lg w-full max-w-lg m-4 p-6 relative" onClick={(e) => e.stopPropagation()}>
                      <div className="flex justify-between items-center mb-4">
                          <h3 className="text-lg font-bold text-white">Hasil Analisis Intelijen</h3>
                          <button onClick={() => setShowAnalysisModal(false)} className="text-gray-500 hover:text-white"><X size={20} /></button>
                      </div>
                      <div className="max-h-[60vh] overflow-y-auto pr-2">
                          <div className="prose prose-sm prose-invert max-w-none text-gray-300">
                              <ReactMarkdown>{analysisResult || ''}</ReactMarkdown>
                          </div>
                      </div>
                  </motion.div>
              </motion.div>
          )}
        </AnimatePresence>
      </main>
    </TourHighlight>
  );
}
