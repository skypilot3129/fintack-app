// src/components/CashflowPageSkeleton.tsx
import TransactionListSkeleton from './TransactionListSkeleton';

export default function CashflowPageSkeleton() {
  return (
    <main className="p-4 md:p-6 lg:p-8 bg-[#0A0A0A] pb-28 text-white animate-pulse">
      <div className="max-w-4xl mx-auto">
        {/* Skeleton untuk Judul */}
        <div className="h-8 w-3/4 mx-auto bg-gray-700 rounded"></div>
        <div className="h-5 w-1/2 mx-auto bg-gray-700 rounded mt-3"></div>
        
        {/* Skeleton untuk Tombol Aksi */}
        <div className="mt-8 flex flex-col items-center gap-4">
          <div className="h-12 w-full max-w-sm bg-gray-700 rounded-lg"></div>
          <div className="flex gap-4">
            <div className="h-12 w-36 bg-gray-800 rounded-lg"></div>
            <div className="h-12 w-36 bg-gray-800 rounded-lg"></div>
          </div>
        </div>

        {/* Skeleton untuk Kartu Ringkasan */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="h-24 bg-gray-800/50 rounded-lg"></div>
          <div className="h-24 bg-gray-800/50 rounded-lg"></div>
          <div className="h-24 bg-gray-800/50 rounded-lg"></div>
        </div>

        {/* Skeleton untuk Filter */}
        <div className="mt-8 h-12 bg-gray-800/50 rounded-lg"></div>

        {/* Skeleton untuk Daftar Transaksi (menggunakan komponen yang sudah ada) */}
        <TransactionListSkeleton />
      </div>
    </main>
  );
}
