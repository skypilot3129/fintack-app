'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase';
import { doc, onSnapshot, Timestamp } from 'firebase/firestore';
import { motion } from 'framer-motion';
import { TrendingUp, Target, Shield, PiggyBank, Scale } from 'lucide-react';

// Tipe data untuk Skor
interface ScoreData {
    total: number;
    netWorth: { score: number; value: number };
    savingsRate: { score: number; value: number };
    emergencyFund: { score: number; value: number };
    budgetAdherence: { score: number; value: number };
    lastCalculated: Timestamp;
}

// Komponen untuk Detail Skor
const ScoreDetail = ({ Icon, label, value, score }: { Icon: React.ElementType, label: string, value: string, score: number }) => (
    <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
            <Icon className="text-gray-400" size={14} />
            <span className="text-gray-300">{label}</span>
        </div>
        <div className="font-semibold">
            <span className="text-white">{value}</span>
            <span className="text-gray-500"> ({score} pts)</span>
        </div>
    </div>
);


export default function FinancialHealthScore() {
  const { user } = useAuth();
  const [scoreData, setScoreData] = useState<ScoreData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const userProfileRef = doc(db, 'users', user.uid);
    const unsubscribe = onSnapshot(userProfileRef, (docSnap) => {
        if (docSnap.exists() && docSnap.data().financialHealthScore) {
            setScoreData(docSnap.data().financialHealthScore);
        }
        setIsLoading(false);
    });

    return () => unsubscribe();
  }, [user]);
  
  const getScoreColor = (score: number) => {
    if (score < 400) return '#EF4444'; // red-500
    if (score < 700) return '#FBBF24'; // amber-400
    return '#A8FF00'; // lime-400
  };

  if (isLoading) {
    return <div className="bg-[#121212] p-6 rounded-lg border border-gray-800 h-64 animate-pulse"></div>;
  }
  
  if (!scoreData) {
    return (
        <div className="bg-[#121212] p-6 rounded-lg border border-gray-800 text-center">
             <h3 className="text-md font-bold flex items-center justify-center gap-2 mb-2">
                <TrendingUp size={18} className="text-[#A8FF00]"/>
                Financial Health Score
            </h3>
            <p className="text-sm text-gray-500">Skor pertamamu akan dihitung dalam 24 jam setelah kamu mulai mencatat transaksi dan aset.</p>
        </div>
    );
  }

  const score = scoreData.total;
  const color = getScoreColor(score);
  const circumference = 2 * Math.PI * 45; // 2 * pi * radius

  return (
    <div className="bg-[#121212] p-6 rounded-lg border border-gray-800">
        <h3 className="text-md font-bold flex items-center gap-2 mb-4">
            <TrendingUp size={18} className="text-[#A8FF00]"/>
            Financial Health Score
        </h3>
        <div className="flex flex-col items-center gap-6">
            {/* Radial Progress Bar */}
            <div className="relative w-40 h-40">
                <svg className="w-full h-full" viewBox="0 0 100 100">
                    {/* Background Circle */}
                    <circle cx="50" cy="50" r="45" fill="none" stroke="#374151" strokeWidth="10" />
                    {/* Progress Circle */}
                    <motion.circle
                        cx="50" cy="50" r="45"
                        fill="none"
                        stroke={color}
                        strokeWidth="10"
                        strokeLinecap="round"
                        transform="rotate(-90 50 50)"
                        strokeDasharray={circumference}
                        initial={{ strokeDashoffset: circumference }}
                        animate={{ strokeDashoffset: circumference - (score / 1000) * circumference }}
                        transition={{ duration: 1.5, ease: "easeOut" }}
                    />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-4xl font-black" style={{ color: color }}>
                        {score}
                    </span>
                    <span className="text-xs text-gray-400">/ 1000</span>
                </div>
            </div>

            {/* Rincian Skor */}
            <div className="w-full space-y-3">
                <ScoreDetail Icon={Scale} label="Kekayaan Bersih" value={scoreData.netWorth.value > 0 ? 'Positif' : 'Negatif'} score={scoreData.netWorth.score} />
                <ScoreDetail Icon={PiggyBank} label="Tingkat Tabungan" value={`${(scoreData.savingsRate.value * 100).toFixed(1)}%`} score={scoreData.savingsRate.score} />
                <ScoreDetail Icon={Shield} label="Dana Darurat" value={`${scoreData.emergencyFund.value.toFixed(1)} bln`} score={scoreData.emergencyFund.score} />
                <ScoreDetail Icon={Target} label="Kepatuhan Budget" value={`${(scoreData.budgetAdherence.value * 100).toFixed(0)}%`} score={scoreData.budgetAdherence.score} />
            </div>
        </div>
    </div>
  );
}
