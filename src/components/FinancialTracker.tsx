'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { User } from 'firebase/auth';
import { app } from '@/lib/firebase'; // Pastikan path ini benar
import {
  getFirestore,
  collection,
  addDoc,
  query,
  onSnapshot,
  Timestamp,
  orderBy,
  limit,
} from 'firebase/firestore';
import Button from './Button'; // Menggunakan komponen Button yang sudah ada

// Tipe data untuk setiap transaksi
type Transaction = {
  id?: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
  category: string;
  date: Timestamp;
};

// Props untuk komponen ini, memerlukan objek 'user' untuk otentikasi
type FinancialTrackerProps = {
  user: User;
};

export default function FinancialTracker({ user }: FinancialTrackerProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [category, setCategory] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Inisialisasi Firestore
  const db = getFirestore(app);

  // Mengambil data transaksi dari Firestore secara real-time
  useEffect(() => {
    if (!user) return;

    const transactionsColRef = collection(db, 'users', user.uid, 'transactions');
    // Mengurutkan berdasarkan tanggal terbaru, dan membatasi 50 transaksi terakhir
    const q = query(transactionsColRef, orderBy('date', 'desc'), limit(50));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedTransactions = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Transaction[];
      setTransactions(fetchedTransactions);
      setIsLoading(false);
    });

    // Membersihkan listener saat komponen di-unmount
    return () => unsubscribe();
  }, [user, db]);

  // Menghitung ringkasan keuangan (pemasukan, pengeluaran, sisa)
  const summary = useMemo(() => {
    return transactions.reduce(
      (acc, curr) => {
        if (curr.type === 'income') {
          acc.totalIncome += curr.amount;
        } else {
          acc.totalExpense += curr.amount;
        }
        acc.balance = acc.totalIncome - acc.totalExpense;
        return acc;
      },
      { totalIncome: 0, totalExpense: 0, balance: 0 }
    );
  }, [transactions]);

  // Fungsi untuk menambahkan transaksi baru
  const handleAddTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description || !amount || !category) {
      alert('Semua field harus diisi, bro!');
      return;
    }

    const newTransaction: Transaction = {
      description,
      amount: parseFloat(amount),
      type,
      category,
      date: Timestamp.now(),
    };

    try {
      const transactionsColRef = collection(db, 'users', user.uid, 'transactions');
      await addDoc(transactionsColRef, newTransaction);
      // Reset form setelah berhasil
      setDescription('');
      setAmount('');
      setCategory('');
      setType('expense');
    } catch (error) {
      console.error('Error menambah transaksi:', error);
      alert('Gagal nambah transaksi, coba lagi nanti.');
    }
  };

  // Fungsi untuk format angka ke format Rupiah
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className="p-4 md:p-6 bg-[#0A0A0A] rounded-lg border border-gray-800 text-white">
      <h2 className="text-xl font-bold mb-4">Financial Tracker</h2>

      {/* Bagian Ringkasan */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-gray-800 p-4 rounded-lg">
          <p className="text-sm text-gray-400">Total Pemasukan</p>
          <p className="text-lg font-bold text-green-400">{formatCurrency(summary.totalIncome)}</p>
        </div>
        <div className="bg-gray-800 p-4 rounded-lg">
          <p className="text-sm text-gray-400">Total Pengeluaran</p>
          <p className="text-lg font-bold text-red-400">{formatCurrency(summary.totalExpense)}</p>
        </div>
        <div className="bg-gray-800 p-4 rounded-lg">
          <p className="text-sm text-gray-400">Cash Flow</p>
          <p className={`text-lg font-bold ${summary.balance >= 0 ? 'text-white' : 'text-red-500'}`}>
            {formatCurrency(summary.balance)}
          </p>
        </div>
      </div>

      {/* Bagian Form Tambah Transaksi */}
      <div className="mb-6">
        <h3 className="font-bold mb-2">Tambah Transaksi Baru</h3>
        <form onSubmit={handleAddTransaction} className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
          <div className="md:col-span-2">
            <label htmlFor="description" className="text-xs text-gray-400">Deskripsi</label>
            <input
              id="description"
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Gaji bulanan, makan siang..."
              className="w-full bg-gray-800 rounded-lg px-4 py-2 mt-1 text-sm focus:outline-none focus:ring-2 focus:ring-[#A8FF00]"
            />
          </div>
          <div>
            <label htmlFor="amount" className="text-xs text-gray-400">Jumlah (Rp)</label>
            <input
              id="amount"
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="50000"
              className="w-full bg-gray-800 rounded-lg px-4 py-2 mt-1 text-sm focus:outline-none focus:ring-2 focus:ring-[#A8FF00]"
            />
          </div>
          <div>
            <label htmlFor="category" className="text-xs text-gray-400">Kategori</label>
            <input
              id="category"
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="Makanan, Gaji, Transportasi"
              className="w-full bg-gray-800 rounded-lg px-4 py-2 mt-1 text-sm focus:outline-none focus:ring-2 focus:ring-[#A8FF00]"
            />
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center">
              <input type="radio" id="expense" name="type" value="expense" checked={type === 'expense'} onChange={() => setType('expense')} className="form-radio h-4 w-4 text-[#A8FF00] bg-gray-700 border-gray-600 focus:ring-[#A8FF00]"/>
              <label htmlFor="expense" className="ml-2 text-sm">Keluar</label>
            </div>
            <div className="flex items-center">
              <input type="radio" id="income" name="type" value="income" checked={type === 'income'} onChange={() => setType('income')} className="form-radio h-4 w-4 text-[#A8FF00] bg-gray-700 border-gray-600 focus:ring-[#A8FF00]"/>
              <label htmlFor="income" className="ml-2 text-sm">Masuk</label>
            </div>
          </div>
          <Button type="submit" className="w-full">Tambah</Button>
        </form>
      </div>

      {/* Bagian Daftar Transaksi */}
      <div>
        <h3 className="font-bold mb-2">Transaksi Terakhir</h3>
        <div className="max-h-64 overflow-y-auto">
          {isLoading ? (
            <p className="text-center text-gray-400">Memuat data...</p>
          ) : transactions.length === 0 ? (
            <p className="text-center text-gray-400">Belum ada transaksi. Catat pengeluaran pertama lo!</p>
          ) : (
            <ul className="space-y-2">
              {transactions.map((t) => (
                <li key={t.id} className="flex justify-between items-center bg-gray-800 p-3 rounded-lg">
                  <div>
                    <p className="font-semibold">{t.description}</p>
                    <p className="text-xs text-gray-400">{t.category} - {t.date.toDate().toLocaleDateString('id-ID')}</p>
                  </div>
                  <p className={`font-bold ${t.type === 'income' ? 'text-green-400' : 'text-red-400'}`}>
                    {t.type === 'expense' && '-'}
                    {formatCurrency(t.amount)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
