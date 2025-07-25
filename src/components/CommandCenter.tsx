// src/components/CommandCenter.tsx
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot, orderBy, limit } from 'firebase/firestore';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Target, Bell, ArrowRight } from 'lucide-react';

// Tipe data untuk Misi dan Insight
interface Mission {
  id: string;
  title: string;
  description: string;
}

interface Insight {
  id: string;
  text: string;
}

export default function CommandCenter() {
  const { user } = useAuth();
  const [activeMission, setActiveMission] = useState<Mission | null>(null);
  const [latestInsight, setLatestInsight] = useState<Insight | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    // Listener untuk misi aktif
    const missionQuery = query(
      collection(db, `users/${user.uid}/missions`),
      where('status', '==', 'active'),
      limit(1)
    );
    const unsubMission = onSnapshot(missionQuery, (snapshot) => {
      if (!snapshot.empty) {
        const missionDoc = snapshot.docs[0];
        setActiveMission({ ...missionDoc.data(), id: missionDoc.id } as Mission);
      } else {
        setActiveMission(null);
      }
      setLoading(false);
    });

    // Listener untuk insight terbaru yang belum dibaca
    const insightQuery = query(
      collection(db, `users/${user.uid}/insights`),
      where('isRead', '==', false),
      orderBy('createdAt', 'desc'),
      limit(1)
    );
    const unsubInsight = onSnapshot(insightQuery, (snapshot) => {
      if (!snapshot.empty) {
        const insightDoc = snapshot.docs[0];
        setLatestInsight({ ...insightDoc.data(), id: insightDoc.id } as Insight);
      } else {
        setLatestInsight(null);
      }
    });

    return () => {
      unsubMission();
      unsubInsight();
    };
  }, [user]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="h-24 bg-gray-800/50 rounded-lg animate-pulse"></div>
        <div className="h-24 bg-gray-800/50 rounded-lg animate-pulse"></div>
      </div>
    );
  }

  // Jangan render apapun jika tidak ada misi aktif atau insight baru
  if (!activeMission && !latestInsight) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Kartu Misi Aktif */}
      {activeMission && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <Link href="/misi" className="block p-4 bg-[#121212] border border-gray-800 rounded-lg hover:bg-gray-800 transition-colors group">
            <div className="flex items-start">
              <div className="p-2 bg-blue-500/20 rounded-full mr-4">
                <Target className="text-blue-400" size={20} />
              </div>
              <div className="flex-grow">
                <p className="text-xs text-blue-400 font-bold">MISI AKTIF</p>
                <h3 className="font-semibold text-white">{activeMission.title}</h3>
                <p className="text-xs text-gray-400 line-clamp-1">{activeMission.description}</p>
              </div>
              <ArrowRight className="text-gray-600 group-hover:translate-x-1 transition-transform" size={20} />
            </div>
          </Link>
        </motion.div>
      )}

      {/* Kartu Insight Terbaru */}
      {latestInsight && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <div className="p-4 bg-[#121212] border border-gray-800 rounded-lg">
             <div className="flex items-start">
              <div className="p-2 bg-yellow-500/20 rounded-full mr-4">
                <Bell className="text-yellow-400" size={20} />
              </div>
              <div className="flex-grow">
                <p className="text-xs text-yellow-400 font-bold">LAPORAN INTEL BARU</p>
                <p className="text-sm text-gray-300 line-clamp-2 mt-1">{latestInsight.text}</p>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
