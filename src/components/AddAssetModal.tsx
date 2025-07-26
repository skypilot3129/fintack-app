'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search } from 'lucide-react';
import Button from './Button';
import CurrencyInput from './CurrencyInput';
import toast from 'react-hot-toast';
import { db } from '@/lib/firebase';
import { collection, addDoc, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '@/context/AuthContext';
import { getFunctions, httpsCallable } from 'firebase/functions';

// Tipe data yang jelas
interface AssetDetails {
    ticker?: string;
    shares?: number;
    price?: number;
}

interface AssetItem {
  id: string;
  name: string;
  value: number;
  category: string;
  details?: AssetDetails;
}

interface AddAssetModalProps {
  isOpen: boolean;
  onClose: () => void;
  assetType: 'asset' | 'liability';
  initialData?: AssetItem | null;
}

type AssetCategory = 'Saham' | 'Reksadana' | 'Properti' | 'Tunai & Bank' | 'Lainnya';

export default function AddAssetModal({ isOpen, onClose, assetType, initialData }: AddAssetModalProps) {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  // Common fields
  const [name, setName] = useState('');
  const [value, setValue] = useState('');
  const [category, setCategory] = useState<AssetCategory | string>('Saham');

  // Stock specific fields
  const [ticker, setTicker] = useState('');
  const [shares, setShares] = useState('');
  const [currentPrice, setCurrentPrice] = useState(0);

  const isEditMode = !!initialData;

  const resetForm = useCallback(() => {
    setName(''); 
    setValue(''); 
    setCategory(assetType === 'asset' ? 'Saham' : '');
    setTicker(''); 
    setShares(''); 
    setCurrentPrice(0);
  }, [assetType]);

  useEffect(() => {
    if (isOpen && initialData) {
      setName(initialData.name || '');
      setValue(initialData.value?.toString() || '');
      const initialCategory = initialData.category === 'Investasi Saham' ? 'Saham' : initialData.category;
      setCategory(initialCategory || 'Lainnya');
      if (initialData.category === 'Investasi Saham' && initialData.details) {
        setTicker(initialData.details.ticker || '');
        setShares(initialData.details.shares?.toString() || '');
        setCurrentPrice(initialData.details.price || 0);
      }
    } else {
      resetForm();
    }
  }, [initialData, isOpen, resetForm]);

  const handleClose = () => {
    onClose();
  };

  const handlePriceCheck = async () => {
    if (!ticker) return toast.error("Masukkan kode saham dulu.");
    setIsLoading(true);
    try {
        const functions = getFunctions();
        const getStockPrice = httpsCallable(functions, 'getStockPrice');
        const result = await getStockPrice({ ticker });
        const { price } = result.data as { success: boolean; price: number };
        setCurrentPrice(price);
        if (shares) {
            setValue((price * parseFloat(shares)).toString());
        }
        toast.success(`Harga ${ticker.toUpperCase()} ditemukan: Rp ${price.toLocaleString('id-ID')}`);
    } catch (error: unknown) { // <-- PERBAIKAN 1 DI SINI
        let errorMessage = "Gagal cek harga.";
        if (error instanceof Error) {
            errorMessage = error.message;
        }
        toast.error(errorMessage);
    } finally {
        setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    let dataToSave = {};
    const collectionName = assetType === 'asset' ? 'assets' : 'liabilities';
    const currentCategory = assetType === 'asset' ? category : (category || 'Lainnya');

    if (assetType === 'asset' && currentCategory === 'Saham') {
        if (!ticker || !shares || !value) return toast.error("Kode saham, jumlah lembar, dan nilai wajib diisi.");
        dataToSave = { 
            name: `${ticker.toUpperCase()} (${shares} lembar)`,
            value: parseFloat(value),
            category: 'Investasi Saham',
            details: { ticker: ticker.toUpperCase(), shares: parseFloat(shares), price: currentPrice },
        };
    } else {
        if (!name || !value) return toast.error("Nama dan nilai wajib diisi.");
        dataToSave = { name, value: parseFloat(value), category: currentCategory };
    }

    setIsLoading(true);
    try {
        if (isEditMode && initialData?.id) {
            const docRef = doc(db, 'users', user.uid, collectionName, initialData.id);
            await updateDoc(docRef, dataToSave);
            toast.success(`${assetType === 'asset' ? 'Aset' : 'Liabilitas'} berhasil diperbarui!`);
        } else {
            await addDoc(collection(db, 'users', user.uid, collectionName), {
                ...dataToSave,
                createdAt: serverTimestamp(),
            });
            toast.success(`${assetType === 'asset' ? 'Aset' : 'Liabilitas'} berhasil ditambahkan!`);
        }
        handleClose();
    } catch (error: unknown) { // <-- PERBAIKAN 2 DI SINI
        console.error("Save Error:", error);
        toast.error("Gagal menyimpan data.");
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/70 z-50 flex justify-center items-center p-4"
          onClick={handleClose}
        >
          <motion.div
            initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
            className="bg-[#18181B] border border-gray-700 rounded-lg w-full max-w-md m-4 relative"
            onClick={(e) => e.stopPropagation()}
          >
             <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold text-white">{isEditMode ? 'Edit' : 'Tambah'} {assetType === 'asset' ? 'Aset' : 'Liabilitas'}</h3>
                    <button onClick={handleClose} className="text-gray-500 hover:text-white"><X size={20} /></button>
                </div>
                
                {assetType === 'asset' && (
                    <div className="flex border-b border-gray-700 mb-4">
                        {(['Saham', 'Reksadana', 'Properti', 'Tunai & Bank'] as AssetCategory[]).map(tab => (
                            <button key={tab} onClick={() => setCategory(tab)} className={`px-4 py-2 text-sm font-semibold transition-colors ${category === tab ? 'text-[#A8FF00] border-b-2 border-[#A8FF00]' : 'text-gray-400'}`}>
                                {tab}
                            </button>
                        ))}
                    </div>
                )}
                
                <form onSubmit={handleSubmit} className="space-y-4">
                    {assetType === 'asset' && category === 'Saham' ? (
                        <>
                            <div className="flex items-end gap-2">
                                <div className="flex-grow">
                                    <label className="text-xs text-gray-400">Kode Saham (e.g., BBCA)</label>
                                    <input type="text" value={ticker} onChange={e => setTicker(e.target.value)} className="input-style w-full"/>
                                </div>
                                <button type="button" onClick={handlePriceCheck} disabled={isLoading} className="bg-[#A8FF00] text-black rounded-lg p-3 hover:bg-lime-400 transition-colors flex-shrink-0">
                                    <Search size={18}/>
                                </button>
                            </div>
                            <div>
                                <label className="text-xs text-gray-400">Jumlah Lembar Saham</label>
                                <input type="number" value={shares} onChange={e => setShares(e.target.value)} className="input-style w-full"/>
                            </div>
                            <div>
                                <label className="text-xs text-gray-400">Total Nilai Saat Ini (Otomatis/Manual)</label>
                                <CurrencyInput value={value} onChange={setValue} className="input-style w-full bg-gray-900" />
                            </div>
                        </>
                    ) : (
                        <>
                            <div>
                                <label className="text-xs text-gray-400">Nama {assetType === 'asset' ? 'Aset' : 'Liabilitas'}</label>
                                <input type="text" value={name} onChange={e => setName(e.target.value)} className="input-style w-full"/>
                            </div>
                            <div>
                                <label className="text-xs text-gray-400">Nilai (Rp)</label>
                                <CurrencyInput value={value} onChange={setValue} className="input-style w-full"/>
                            </div>
                            {assetType === 'liability' && (
                                <div>
                                    <label className="text-xs text-gray-400">Kategori</label>
                                    <input type="text" value={category} onChange={e => setCategory(e.target.value)} placeholder="e.g., Cicilan KPR, Utang Kartu Kredit" className="input-style w-full"/>
                                </div>
                            )}
                        </>
                    )}
                     <Button type="submit" disabled={isLoading} className="w-full !mt-6">
                        {isLoading ? 'Menyimpan...' : 'Simpan'}
                    </Button>
                </form>
             </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}