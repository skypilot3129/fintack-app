'use client';

import { useState, useEffect } from 'react';
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
const formatDate = (timestamp: Timestamp) => timestamp.toDate().toLocaleDateString('id-ID', { day: '2-digit', month: 'long' });

// Komponen untuk Ringkasan
const SummaryCard = ({ title, amount, Icon, colorClass }: { title: string, amount: number, Icon: React.ElementType, colorClass: string }) => (
  <div className="bg-gray-800/50 p-4 rounded-lg">
    <div className="flex items-center gap-2">
      <Icon className={`w-5 h-5 ${colorClass}`} />
      <p className="text-sm text-gray-400">{title}</p>
    </div>
    <p className={`text-2xl font-bold mt-1 ${colorClass}`}>{formatCurrency(amount)}</p>
  </div>
);


export default function CashflowPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
  const [isScanModalOpen, setIsScanModalOpen] = useState(false);
  const [isAnalysisModalOpen, setIsAnalysisModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [scannedData, setScannedData] = useState<ScannedData | null>(null);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    const transactionsColRef = collection(db, 'users', user.uid, 'transactions');
    const q = query(transactionsColRef, orderBy('createdAt', 'desc'), limit(50));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedTransactions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Transaction[];
      setTransactions(fetchedTransactions);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching transactions:", error);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [user]);

  const summary = transactions.reduce((acc, curr) => {
    if (curr.type === 'income') acc.totalIncome += curr.amount;
    else acc.totalExpense += curr.amount;
    acc.cashflow = acc.totalIncome - acc.totalExpense;
    return acc;
  }, { totalIncome: 0, totalExpense: 0, cashflow: 0 });

  const handleEditTransaction = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setIsTransactionModalOpen(true);
  };
  
  const handleDeleteTransaction = async (id: string) => {
    if (!user) return;
    if (confirm("Yakin mau hapus transaksi ini?")) {
      try {
        await deleteDoc(doc(db, 'users', user.uid, 'transactions', id));
        toast.success("Transaksi berhasil dihapus.");
      } catch (error) {
        toast.error("Gagal menghapus transaksi.");
        console.error("Error deleting transaction: ", error);
      }
    }
  };

  const handleScanComplete = (data: ScannedData) => {
    setScannedData(data);
    setIsScanModalOpen(false);
    setIsTransactionModalOpen(true);
  };

  if (authLoading || loading) {
    return <CashflowPageSkeleton />;
  }
  
  if (!user) {
    router.push('/login');
    return null;
  }

  return (
    <>
      <TourHighlight
        tourId="cashflow"
        title="Ini Dia Peta Uangmu!"
        description="Di sini kamu bisa melacak setiap rupiah yang masuk dan keluar. Semakin rajin mencatat, semakin akurat analisis dari Mas Eugene."
      >
        <main className="p-4 md:p-6 lg:p-8 bg-[#0A0A0A] pb-28 min-h-screen text-white">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-3xl font-black text-center uppercase text-[#A8FF00]">Catatan Uang</h1>
            <p className="text-center text-gray-400 mt-2">Lacak arus kasmu untuk mengambil keputusan yang lebih cerdas.</p>
            
            <div className="mt-8 flex flex-col items-center gap-4">
              <div className="w-full max-w-sm">
                <Button onClick={() => setIsTransactionModalOpen(true)}>
                  <PlusCircle className="w-5 h-5 mr-2" />
                  Catat Transaksi Manual
                </Button>
              </div>
              <div className="flex gap-4">
                <button onClick={() => setIsScanModalOpen(true)} className="flex items-center gap-2 text-sm text-gray-400 hover:text-white"><Camera size={16}/> Scan Struk</button>
                <button onClick={() => setIsAnalysisModalOpen(true)} className="flex items-center gap-2 text-sm text-gray-400 hover:text-white"><BrainCircuit size={16}/> Minta Analisis</button>
              </div>
            </div>

            <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
              <SummaryCard title="Total Pemasukan" amount={summary.totalIncome} Icon={ArrowUp} colorClass="text-green-400" />
              <SummaryCard title="Total Pengeluaran" amount={summary.totalExpense} Icon={ArrowDown} colorClass="text-red-400" />
              <SummaryCard title="Cash Flow" amount={summary.cashflow} Icon={summary.cashflow >= 0 ? ArrowUp : ArrowDown} colorClass={summary.cashflow >= 0 ? "text-white" : "text-red-400"} />
            </div>

            <div className="mt-8">
              <BudgetDisplay />
            </div>

            <div className="mt-8">
              <h2 className="text-xl font-bold mb-4">Transaksi Terakhir</h2>
              {transactions.length === 0 ? (
                <p className="text-center text-gray-500 py-8">Belum ada transaksi. Ayo catat yang pertama!</p>
              ) : (
                <div className="space-y-3">
                  {transactions.map((t, index) => (
                    <motion.div 
                      key={t.id}
                      className="flex justify-between items-center bg-[#121212] p-3 rounded-lg border border-gray-800 group"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.05 }}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${t.type === 'income' ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
                          {t.type === 'income' ? <ArrowUp className="text-green-400"/> : <ArrowDown className="text-red-400"/>}
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
                        {/* PERBAIKAN: 
                          - `opacity-100` ditambahkan sebagai default agar terlihat di mobile.
                          - `md:opacity-0` dan `md:group-hover:opacity-100` ditambahkan agar efek hover
                            hanya berlaku di layar medium ke atas (desktop).
                        */}
                        <div className="opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity flex items-center">
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
