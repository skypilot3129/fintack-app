'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase';
import { collection, addDoc, onSnapshot, query, doc, deleteDoc } from 'firebase/firestore';
import Button from '@/components/Button';
import { Trash2 } from 'lucide-react';

// Tipe data untuk Aset & Liabilitas
interface ArsenalItem {
  id: string;
  name: string;
  value: number;
}

export default function ArsenalPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  
  const [assetName, setAssetName] = useState('');
  const [assetValue, setAssetValue] = useState('');
  const [liabilityName, setLiabilityName] = useState('');
  const [liabilityValue, setLiabilityValue] = useState('');
  const [assets, setAssets] = useState<ArsenalItem[]>([]);
  const [liabilities, setLiabilities] = useState<ArsenalItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Redirect jika user tidak login
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/');
    }
  }, [user, authLoading, router]);

  // Mengambil data Aset & Liabilitas
  useEffect(() => {
    if (user) {
      const unsubAssets = onSnapshot(query(collection(db, `users/${user.uid}/assets`)), (snap) => {
        setAssets(snap.docs.map(doc => ({ ...doc.data(), id: doc.id } as ArsenalItem)));
        setLoading(false);
      });

      const unsubLiabilities = onSnapshot(query(collection(db, `users/${user.uid}/liabilities`)), (snap) => {
        setLiabilities(snap.docs.map(doc => ({ ...doc.data(), id: doc.id } as ArsenalItem)));
        setLoading(false);
      });

      return () => {
        unsubAssets();
        unsubLiabilities();
      };
    }
  }, [user]);

  const addAsset = async (e: React.FormEvent) => { e.preventDefault(); if (assetName.trim() && assetValue && user) { await addDoc(collection(db, `users/${user.uid}/assets`), { name: assetName, value: parseFloat(assetValue) }); setAssetName(''); setAssetValue(''); } };
  const addLiability = async (e: React.FormEvent) => { e.preventDefault(); if (liabilityName.trim() && liabilityValue && user) { await addDoc(collection(db, `users/${user.uid}/liabilities`), { name: liabilityName, value: parseFloat(liabilityValue) }); setLiabilityName(''); setLiabilityValue(''); } };
  const deleteItem = async (collectionName: 'assets' | 'liabilities', id: string) => { if (user) { await deleteDoc(doc(db, `users/${user.uid}/${collectionName}`, id)); } };

  const { netWorth } = useMemo(() => {
    const totalAssets = assets.reduce((s, a) => s + a.value, 0);
    const totalLiabilities = liabilities.reduce((s, l) => s + l.value, 0);
    return { netWorth: totalAssets - totalLiabilities };
  }, [assets, liabilities]);

  const formatCurrency = (value: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(value);

  if (authLoading || loading || !user) {
    return <main className="flex min-h-screen items-center justify-center bg-[#0A0A0A] text-white"><p>Memuat data Arsenal...</p></main>;
  }

  return (
    <main className="p-4 md:p-6 lg:p-8 bg-[#0A0A0A] pb-28 text-white">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-black text-center uppercase text-[#A8FF00]">Arsenal Keuangan</h1>
        <p className="text-center text-gray-400 mt-2 max-w-md mx-auto">Catat semua aset (yang lo miliki) dan liabilitas (utang lo) untuk melihat kekayaan bersihmu.</p>
        
        <div className="mt-8 p-4 bg-[#121212] rounded-lg border border-gray-800 text-center max-w-md mx-auto">
          <p className="text-sm uppercase text-gray-400">Total Kekayaan Bersih</p>
          <p className={`text-4xl font-black ${netWorth >= 0 ? 'text-white' : 'text-red-500'}`}>{formatCurrency(netWorth)}</p>
        </div>

        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-[#121212] p-6 rounded-lg border border-gray-800">
            <h2 className="text-xl font-bold text-green-400">ASET</h2>
            <p className="text-xs text-gray-500 mb-4">Apa saja yang kamu miliki?</p>
            <form onSubmit={addAsset} className="flex flex-col space-y-2">
              <input type="text" value={assetName} onChange={(e) => setAssetName(e.target.value)} placeholder="Nama Aset (e.g., Tabungan)" className="bg-gray-800 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#A8FF00]" />
              <input type="number" value={assetValue} onChange={(e) => setAssetValue(e.target.value)} placeholder="Jumlah (e.g., 5000000)" className="bg-gray-800 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#A8FF00]" />
              <Button type="submit" className="text-xs py-2 mt-2">Tambah Aset</Button>
            </form>
            <ul className="mt-4 space-y-2 max-h-60 overflow-y-auto">{assets.map(item => (<li key={item.id} className="flex justify-between items-center bg-gray-800 p-2 rounded"><span>{item.name}</span><div className="flex items-center space-x-2"><span>{formatCurrency(item.value)}</span><button onClick={() => deleteItem('assets', item.id)} className="text-gray-500 hover:text-red-500"><Trash2 size={16}/></button></div></li>))}</ul>
          </div>
          <div className="bg-[#121212] p-6 rounded-lg border border-gray-800">
            <h2 className="text-xl font-bold text-red-400">LIABILITAS</h2>
            <p className="text-xs text-gray-500 mb-4">Apa saja utangmu?</p>
            <form onSubmit={addLiability} className="flex flex-col space-y-2">
              <input type="text" value={liabilityName} onChange={(e) => setLiabilityName(e.target.value)} placeholder="Nama Utang (e.g., Cicilan HP)" className="bg-gray-800 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#A8FF00]" />
              <input type="number" value={liabilityValue} onChange={(e) => setLiabilityValue(e.target.value)} placeholder="Jumlah (e.g., 2000000)" className="bg-gray-800 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#A8FF00]" />
              <Button type="submit" className="text-xs py-2 mt-2">Tambah Liabilitas</Button>
            </form>
            <ul className="mt-4 space-y-2 max-h-60 overflow-y-auto">{liabilities.map(item => (<li key={item.id} className="flex justify-between items-center bg-gray-800 p-2 rounded"><span>{item.name}</span><div className="flex items-center space-x-2"><span>{formatCurrency(item.value)}</span><button onClick={() => deleteItem('liabilities', item.id)} className="text-gray-500 hover:text-red-500"><Trash2 size={16}/></button></div></li>))}</ul>
          </div>
        </div>
      </div>
    </main>
  );
}
