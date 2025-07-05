// app/(main)/misi/audit/page.tsx
'use client';

import Button from '@/components/Button';
import { useRouter } from 'next/navigation';

export default function AuditMissionPage() {
  const router = useRouter();

  const handleCompleteMission = () => {
    alert("Misi Selesai! (Simulasi)");
    router.push('/misi'); // Kembali ke halaman daftar misi
  };

  return (
    <main className="p-4 md:p-6 lg:p-8 bg-[#0A0A0A] pb-28 min-h-screen text-white">
        <div className="max-w-2xl mx-auto">
            <h1 className="text-3xl font-black text-center uppercase text-[#A8FF00]">
                Misi 1: Audit Kebocoran Mindset
            </h1>
            <p className="text-center text-gray-400 mt-2">
                Identifikasi pengeluaran yang berakar dari mindset miskin. Jujurlah pada dirimu sendiri.
            </p>

            <div className="mt-8 space-y-6 bg-[#121212] p-6 rounded-lg border border-gray-800">
                <div className="flex flex-col">
                    <label htmlFor="cicilan" className="text-sm font-bold mb-2">1. Apakah kamu punya cicilan barang konsumtif (HP, Baju, dll) yang tidak menghasilkan uang?</label>
                    <input id="cicilan" type="text" placeholder="Contoh: Cicilan HP Rp 500.000/bulan" className="bg-gray-800 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#A8FF00]" />
                </div>
                <div className="flex flex-col">
                    <label htmlFor="langganan" className="text-sm font-bold mb-2">2. Sebutkan semua langganan bulanan yang jarang kamu pakai.</label>
                    <input id="langganan" type="text" placeholder="Contoh: Netflix, Spotify, Gym" className="bg-gray-800 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#A8FF00]" />
                </div>
                <div className="flex flex-col">
                    <label htmlFor="jajan" className="text-sm font-bold mb-2">3. Berapa rata-rata pengeluaran untuk 'jajan' atau makan/minum impulsif per minggu?</label>
                    <input id="jajan" type="number" placeholder="Contoh: 150000" className="bg-gray-800 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#A8FF00]" />
                </div>
            </div>

            <div className="mt-8">
                <Button onClick={handleCompleteMission}>
                    Selesaikan Misi
                </Button>
            </div>
        </div>
    </main>
  );
}