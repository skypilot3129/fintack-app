// src/components/FinancialProjection.tsx
'use client';

import { useState, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import Button from './Button';
import { Sparkles, Info, X } from 'lucide-react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';

interface FinancialProjectionProps {
  initialNetWorth: number;
  avgMonthlyCashflow: number;
}

interface AnalysisResponse {
    success: boolean;
    analysis?: string;
}

const formatCurrency = (value: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(value);

export default function FinancialProjection({ initialNetWorth, avgMonthlyCashflow }: FinancialProjectionProps) {
  const [additionalInvestment, setAdditionalInvestment] = useState(0);
  const [annualReturn, setAnnualReturn] = useState(7);
  const [years, setYears] = useState(10);
  
  // State untuk analisis AI
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showAnalysisModal, setShowAnalysisModal] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);

  const projectionData = useMemo(() => {
    const data = [];
    let currentValue = initialNetWorth;
    const monthlyReturn = Math.pow(1 + annualReturn / 100, 1 / 12) - 1;
    const totalMonthlyInvestment = avgMonthlyCashflow + additionalInvestment;

    for (let i = 0; i <= years * 12; i++) {
      if (i % 12 === 0) {
        data.push({ year: i / 12, value: currentValue });
      }
      currentValue *= (1 + monthlyReturn);
      if (totalMonthlyInvestment > 0) {
        currentValue += totalMonthlyInvestment;
      }
    }
    return data;
  }, [initialNetWorth, avgMonthlyCashflow, additionalInvestment, annualReturn, years]);

  const finalValue = projectionData.length > 0 ? projectionData[projectionData.length - 1].value : 0;

  // PERBAIKAN: Fungsi untuk memanggil Cloud Function
  const handleAnalysisRequest = async () => {
    setIsAnalyzing(true);
    const toastId = toast.loading('Meminta analisis dari mentor...');
    try {
        const functions = getFunctions();
        const getProjectionAnalysis = httpsCallable<unknown, AnalysisResponse>(functions, 'getProjectionAnalysis');
        const result = await getProjectionAnalysis({
            initialNetWorth,
            finalNetWorth: finalValue,
            years,
            avgMonthlyCashflow,
            additionalInvestment
        });

        if(result.data.success && result.data.analysis) {
            setAnalysisResult(result.data.analysis);
            setShowAnalysisModal(true);
            toast.success('Analisis Selesai!', { id: toastId });
        } else {
            throw new Error("Gagal mendapatkan analisis.");
        }
    } catch (error) {
        console.error("Error requesting analysis:", error);
        toast.error('Gagal meminta analisis dari AI.', { id: toastId });
    } finally {
        setIsAnalyzing(false);
    }
  };

  return (
    <>
      <div className="mt-8 bg-[#121212] p-6 rounded-lg border border-gray-800">
        <h2 className="text-2xl font-bold text-center">Simulasi Proyeksi Kekayaan</h2>
        <p className="text-center text-gray-400 text-sm mt-2">Lihat potensi pertumbuhan kekayaanmu di masa depan.</p>
        
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label htmlFor="investment" className="text-xs text-gray-400">Tambah Investasi / Bulan</label>
            <input id="investment" type="number" value={additionalInvestment} onChange={(e) => setAdditionalInvestment(Number(e.target.value))} className="input-style w-full mt-1" />
          </div>
          <div>
            <label htmlFor="return" className="text-xs text-gray-400">Asumsi Imbal Hasil (% / Tahun)</label>
            <input id="return" type="number" value={annualReturn} onChange={(e) => setAnnualReturn(Number(e.target.value))} className="input-style w-full mt-1" />
          </div>
          <div>
            <label htmlFor="years" className="text-xs text-gray-400">Jangka Waktu (Tahun)</label>
            <input id="years" type="number" value={years} onChange={(e) => setYears(Number(e.target.value))} className="input-style w-full mt-1" />
          </div>
        </div>

        <div className="mt-8 text-center">
          <p className="text-gray-400">Dalam {years} tahun, proyeksi kekayaan bersihmu menjadi:</p>
          <p className="text-4xl font-black text-[#A8FF00] mt-2">{formatCurrency(finalValue)}</p>
        </div>

        <div className="mt-8 h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={projectionData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
              <XAxis dataKey="year" unit=" thn" stroke="#888888" />
              <YAxis tickFormatter={(value) => `Rp${new Intl.NumberFormat('id-ID').format(value / 1000000)}jt`} stroke="#888888" />
              <Tooltip
                formatter={(value: number) => formatCurrency(value)}
                contentStyle={{ backgroundColor: '#18181B', border: '1px solid #374151', borderRadius: '0.5rem' }}
                labelStyle={{ color: '#9CA3AF' }}
              />
              <Legend />
              <Line type="monotone" dataKey="value" name="Kekayaan Bersih" stroke="#A8FF00" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        
        <div className="mt-8 flex flex-col items-center">
          <Button onClick={handleAnalysisRequest} disabled={isAnalyzing} className="w-full max-w-sm flex items-center justify-center gap-2">
              <Sparkles size={18} /> {isAnalyzing ? 'Menganalisis...' : 'Minta Analisis Proyeksi dari Mentor'}
          </Button>
          <div className="flex items-center text-xs text-gray-500 mt-3">
              <Info size={14} className="mr-2" />
              <p>Cash flow rata-rata bulananmu ({formatCurrency(avgMonthlyCashflow)}) sudah dimasukkan dalam kalkulasi.</p>
          </div>
        </div>
      </div>

      {/* PERBAIKAN: Tambahkan Modal untuk menampilkan hasil analisis */}
      <AnimatePresence>
        {showAnalysisModal && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/70 z-50 flex justify-center items-center p-4" onClick={() => setShowAnalysisModal(false)}>
                <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }} transition={{ type: 'spring', stiffness: 400, damping: 25 }} className="bg-[#18181B] border border-gray-700 shadow-2xl shadow-lime-500/10 rounded-lg w-full max-w-lg m-4 p-6 relative" onClick={(e) => e.stopPropagation()}>
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-bold text-white">Analisis Proyeksi dari Mentor</h3>
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
    </>
  );
}
