'use client';

import { useState, useEffect } from 'react'; // 'useMemo' dihapus dari sini
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase';
import { collection, query, onSnapshot, orderBy, Timestamp, limit, doc, deleteDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { PlusCircle, ArrowDown, ArrowUp, Camera, BrainCircuit, Edit, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

// Impor komponen
import BudgetDisplay from '@/components/BudgetDisplay';
import TransactionModal from '@/components/TransactionModal';
import ScanReceiptModal from '@/components/ScanReceiptModal';
import FinancialAnalysisModal from '@/components/FinancialAnalysisModal';
import CashflowPageSkeleton from '@/components/CashflowPageSkeleton';
import TourHighlight from '@/components/TourHighlight';
import Button from '@/components/Button';

// Tipe data yang jelas
interface Transaction {
  id: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
  category: string;
  createdAt: Timestamp;
}

interface ScannedData {
    amount: number;
    description: string;
    category: string;
}

// Fungsi format
const formatCurrency = (value: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(value);
const formatDate = (timestamp: Timestamp) => timestamp.toDate().toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });

export default function CashflowPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // State untuk mengelola semua modal
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
  const [isScanModalOpen, setIsScanModalOpen] = useState(false);
  const [isAnalysisModalOpen, setIsAnalysisModalOpen] = useState(false);
  const [scannedData, setScannedData] = useState<ScannedData | null>(null);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  useEffect(() => {
    if (!user) {
      if (!authLoading) router.push('/');
      return;
    }
    const transactionsColRef = collection(db, 'users', user.uid, 'transactions');
    const q = query(transactionsColRef, orderBy('createdAt', 'desc'), limit(100));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedTransactions = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as Transaction[];
      setTransactions(fetchedTransactions);
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, [user, authLoading, router]);

  const handleScanComplete = (data: ScannedData) => {
    setScannedData(data);
    setIsTransactionModalOpen(true);
  };
  
  useEffect(() => {
    if (scannedData) {
      setIsTransactionModalOpen(true);
    }
  }, [scannedData]);
  
  const handleEditTransaction = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setIsTransactionModalOpen(true);
  };

  const handleDeleteTransaction = async (id: string) => {
    if (!user || !window.confirm("Yakin mau hapus transaksi ini?")) return;
    
    const docRef = doc(db, 'users', user.uid, 'transactions', id);
    try {
        await deleteDoc(docRef);
        toast.success("Transaksi berhasil dihapus.");
    } catch (error) {
        toast.error("Gagal menghapus transaksi.");
        console.error("Delete Error:", error);
    }
  };

  if (isLoading || authLoading) {
    return <CashflowPageSkeleton />;
  }

  return (
    <>
      <TourHighlight
        tourId="cashflow"
        title="Pusat Kontrol Uang Lo"
        description="Di sini lo bisa catat semua pemasukan & pengeluaran. Gunakan 'Amplop Digital' buat ngontrol budget bulanan lo biar gak boncos."
      >
        <main className="p-4 md:p-6 lg:p-8 bg-[#0A0A0A] pb-28 min-h-screen text-white">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-3xl font-black text-center uppercase">Catatan Uang</h1>
            <p className="text-center text-gray-400 mt-2">Lacak pergerakan uangmu dan kendalikan budget.</p>

            <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4 max-w-lg mx-auto">
              <Button onClick={() => setIsTransactionModalOpen(true)} className="md:col-span-3 flex items-center justify-center gap-2">
                <PlusCircle size={20} />
                Catat Manual
              </Button>
              <button onClick={() => setIsScanModalOpen(true)} className="w-full py-3 px-4 bg-gray-800 hover:bg-gray-700 text-white font-semibold rounded-lg transition-colors duration-300 flex flex-col items-center justify-center gap-2 text-sm">
                <Camera size={20} />
                Scan Struk
              </button>
              <button 
                onClick={() => setIsAnalysisModalOpen(true)}
                disabled={transactions.length === 0}
                className="w-full py-3 px-4 bg-gray-800 hover:bg-gray-700 text-white font-semibold rounded-lg transition-colors duration-300 flex flex-col items-center justify-center gap-2 text-sm disabled:bg-gray-800/50 disabled:text-gray-500 disabled:cursor-not-allowed"
              >
                <BrainCircuit size={20} />
                Minta Analisis
              </button>
            </div>

            <div className="mt-8">
              <BudgetDisplay />
            </div>

            <div className="mt-8">
              <h2 className="text-xl font-bold mb-4">Riwayat Transaksi</h2>
              {transactions.length === 0 ? (
                <div className="text-center py-10 bg-[#121212] rounded-lg">
                  <p className="text-gray-500">Belum ada transaksi. Ayo catat yang pertama!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {transactions.map((t, index) => (
                    <motion.div
                      key={t.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.05 }}
                      className="group flex justify-between items-center bg-[#121212] p-3 rounded-lg border border-gray-800"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-full ${t.type === 'income' ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
                          {t.type === 'income' ? <ArrowUp className="text-green-400" size={16}/> : <ArrowDown className="text-red-400" size={16}/>}
                        </div>
                        <div>
                          <p className="font-semibold">{t.description}</p>
                          <p className="text-xs text-gray-400">{t.category} • {formatDate(t.createdAt)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <p className={`font-bold ${t.type === 'income' ? 'text-green-400' : 'text-red-400'}`}>
                          {t.type === 'expense' && '-'}{formatCurrency(t.amount)}
                        </p>
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center">
                            <button onClick={() => handleEditTransaction(t)} className="p-1 text-gray-400 hover:text-white"><Edit size={14}/></button>
                            <button onClick={() => handleDeleteTransaction(t.id)} className="p-1 text-gray-400 hover:text-red-400"><Trash2 size={14}/></button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </main>
      </TourHighlight>

      <TransactionModal 
        isOpen={isTransactionModalOpen} 
        onClose={() => {
          setIsTransactionModalOpen(false);
          setEditingTransaction(null);
          setScannedData(null);
        }}
        initialData={editingTransaction || scannedData}
      />
      <ScanReceiptModal 
        isOpen={isScanModalOpen} 
        onClose={() => setIsScanModalOpen(false)}
        onScanComplete={handleScanComplete}
      />
      <FinancialAnalysisModal
        isOpen={isAnalysisModalOpen}
        onClose={() => setIsAnalysisModalOpen(false)}
        transactions={transactions}
      />
    </>
  );
}
