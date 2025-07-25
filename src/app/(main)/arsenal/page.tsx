'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase';
import { collection, addDoc, onSnapshot, query, doc, deleteDoc, orderBy, Timestamp } from 'firebase/firestore';
import Button from '@/components/Button';
import TourHighlight from '@/components/TourHighlight';
import ArsenalSkeleton from '@/components/ArsenalSkeleton';
import FinancialProjection from '@/components/FinancialProjection'; // <-- Impor komponen baru
import { Trash2 } from 'lucide-react';
import CurrencyInput from '@/components/CurrencyInput';

// Tipe data untuk Aset & Liabilitas
interface ArsenalItem {
  id: string;
  name: string;
  value: number;
}
// Tipe data untuk Transaksi
interface Transaction {
  amount: number;
  type: 'income' | 'expense';
  createdAt: Timestamp;
};


export default function ArsenalPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  
  const [assetName, setAssetName] = useState('');
  const [assetValue, setAssetValue] = useState('');
  const [liabilityName, setLiabilityName] = useState('');
  const [liabilityValue, setLiabilityValue] = useState('');
  const [assets, setAssets] = useState<ArsenalItem[]>([]);
  const [liabilities, setLiabilities] = useState<ArsenalItem[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]); // <-- State baru untuk transaksi
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user) {
      let loadedCount = 0;
      const totalToLoad = 3;
      const doneLoading = () => {
        loadedCount++;
        if (loadedCount === totalToLoad) setLoading(false);
      };

      const unsubAssets = onSnapshot(query(collection(db, `users/${user.uid}/assets`), orderBy('name')), (snap) => {
        setAssets(snap.docs.map(doc => ({ ...doc.data(), id: doc.id } as ArsenalItem)));
        doneLoading();
      });

      const unsubLiabilities = onSnapshot(query(collection(db, `users/${user.uid}/liabilities`), orderBy('name')), (snap) => {
        setLiabilities(snap.docs.map(doc => ({ ...doc.data(), id: doc.id } as ArsenalItem)));
        doneLoading();
      });

      // Ambil data transaksi untuk kalkulasi cash flow
      const unsubTransactions = onSnapshot(query(collection(db, `users/${user.uid}/transactions`)), (snap) => {
        setTransactions(snap.docs.map(doc => doc.data() as Transaction));
        doneLoading();
      });

      return () => {
        unsubAssets();
        unsubLiabilities();
        unsubTransactions();
      };
    }
  }, [user]);

  const addAsset = async (e: React.FormEvent) => { e.preventDefault(); if (assetName.trim() && assetValue && user) { await addDoc(collection(db, `users/${user.uid}/assets`), { name: assetName, value: parseFloat(assetValue.replace(/[^0-9]/g, '')) }); setAssetName(''); setAssetValue(''); } };
  const addLiability = async (e: React.FormEvent) => { e.preventDefault(); if (liabilityName.trim() && liabilityValue && user) { await addDoc(collection(db, `users/${user.uid}/liabilities`), { name: liabilityName, value: parseFloat(liabilityValue.replace(/[^0-9]/g, '')) }); setLiabilityName(''); setLiabilityValue(''); } };
  const deleteItem = async (collectionName: 'assets' | 'liabilities', id: string) => { if (user) { await deleteDoc(doc(db, `users/${user.uid}/${collectionName}`, id)); } };

  const { totalAssets, totalLiabilities, netWorth, avgMonthlyCashflow } = useMemo(() => {
    const assetsSum = assets.reduce((s, a) => s + a.value, 0);
    const liabilitiesSum = liabilities.reduce((s, l) => s + l.value, 0);
    
    // Kalkulasi cash flow rata-rata dari 90 hari terakhir
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    
    const recentTransactions = transactions.filter(t => t.createdAt.toDate() > ninetyDaysAgo);
    const monthlyCashflow = recentTransactions.reduce((acc, curr) => {
        return acc + (curr.type === 'income' ? curr.amount : -curr.amount);
    }, 0) / 3; // Dibagi 3 untuk rata-rata bulanan

    return { 
      totalAssets: assetsSum,
      totalLiabilities: liabilitiesSum,
      netWorth: assetsSum - liabilitiesSum,
      avgMonthlyCashflow: monthlyCashflow > 0 ? monthlyCashflow : 0 // Hanya ambil cashflow positif sebagai surplus
    };
  }, [assets, liabilities, transactions]);

  const formatCurrency = (value: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(value);

  if (authLoading || loading || !user) {
    return <ArsenalSkeleton />;
  }

  return (
    <TourHighlight
      tourId="arsenal"
      title="Selamat Datang di Kekayaan Bersih!"
      description="Ini adalah neraca keuanganmu. Catat semua Aset (yang kamu miliki) dan Liabilitas (utangmu) untuk melihat total Kekayaan Bersih (Net Worth) secara real-time."
    >
      <main className="p-4 md:p-6 lg:p-8 bg-[#0A0A0A] pb-28 text-white">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-black text-center uppercase text-[#A8FF00]">Kekayaan Bersih</h1>
          <p className="text-center text-gray-400 mt-2 max-w-md mx-auto">Catat semua aset (yang lo miliki) dan liabilitas (utang lo) untuk melihat kekayaan bersihmu.</p>
          
          <div className="mt-8 p-4 bg-[#121212] rounded-lg border border-gray-800 text-center max-w-md mx-auto">
            <p className="text-sm uppercase text-gray-400">Total Kekayaan Bersih</p>
            <p className={`text-4xl font-black ${netWorth >= 0 ? 'text-white' : 'text-red-500'}`}>{formatCurrency(netWorth)}</p>
          </div>

          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-[#121212] p-6 rounded-lg border border-gray-800">
              <h2 className="text-xl font-bold text-green-400">ASET ({formatCurrency(totalAssets)})</h2>
              <p className="text-xs text-gray-500 mb-4">Apa saja yang kamu miliki?</p>
              <form onSubmit={addAsset} className="flex flex-col space-y-2">
                <input type="text" value={assetName} onChange={(e) => setAssetName(e.target.value)} placeholder="Nama Aset (e.g., Tabungan)" className="input-style w-full" />
                <CurrencyInput value={assetValue} onChange={setAssetValue} placeholder="Jumlah (e.g., Rp 5.000.000)" className="input-style w-full" />
                <Button type="submit" className="text-xs py-2 mt-2">Tambah Aset</Button>
              </form>
              <ul className="mt-4 space-y-2 max-h-60 overflow-y-auto pr-2">{assets.map(item => (<li key={item.id} className="flex justify-between items-center bg-gray-800 p-2 rounded"><span>{item.name}</span><div className="flex items-center space-x-2"><span>{formatCurrency(item.value)}</span><button onClick={() => deleteItem('assets', item.id)} className="text-gray-500 hover:text-red-500"><Trash2 size={16}/></button></div></li>))}</ul>
            </div>
            
            <div className="bg-[#121212] p-6 rounded-lg border border-gray-800">
              <h2 className="text-xl font-bold text-red-400">LIABILITAS ({formatCurrency(totalLiabilities)})</h2>
              <p className="text-xs text-gray-500 mb-4">Apa saja utangmu?</p>
              <form onSubmit={addLiability} className="flex flex-col space-y-2">
                <input type="text" value={liabilityName} onChange={(e) => setLiabilityName(e.target.value)} placeholder="Nama Utang (e.g., Cicilan HP)" className="input-style w-full" />
                <CurrencyInput value={liabilityValue} onChange={setLiabilityValue} placeholder="Jumlah (e.g., Rp 2.000.000)" className="input-style w-full" />
                <Button type="submit" className="text-xs py-2 mt-2">Tambah Liabilitas</Button>
              </form>
              <ul className="mt-4 space-y-2 max-h-60 overflow-y-auto pr-2">{liabilities.map(item => (<li key={item.id} className="flex justify-between items-center bg-gray-800 p-2 rounded"><span>{item.name}</span><div className="flex items-center space-x-2"><span>{formatCurrency(item.value)}</span><button onClick={() => deleteItem('liabilities', item.id)} className="text-gray-500 hover:text-red-500"><Trash2 size={16}/></button></div></li>))}</ul>
            </div>
          </div>
          
          {/* Menampilkan komponen proyeksi baru */}
          <FinancialProjection initialNetWorth={netWorth} avgMonthlyCashflow={avgMonthlyCashflow} />

        </div>
      </main>
    </TourHighlight>
  );
}
