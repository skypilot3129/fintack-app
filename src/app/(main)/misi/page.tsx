'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase';
import { collection, query, onSnapshot, orderBy, doc, Timestamp } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import MissionCard from '@/components/MissionCard';
import Button from '@/components/Button';
import { motion } from 'framer-motion';
import { Lock } from 'lucide-react';

// Tipe data Misi diperbarui dengan pathName
interface Mission {
  id: string;
  title: string;
  description: string;
  status: 'active' | 'completed' | 'locked';
  pathName: string; 
  xpReward: number;
  href?: string;
  createdAt: Timestamp;
}

// Fungsi untuk mengelompokkan misi berdasarkan pathName
const groupMissionsByPath = (missions: Mission[]) => {
  const grouped: { [key: string]: Mission[] } = {};
  missions.forEach(mission => {
    const path = mission.pathName || 'Misi Tambahan';
    if (!grouped[path]) {
      grouped[path] = [];
    }
    grouped[path].push(mission);
  });
  // Urutkan grup berdasarkan nama path (opsional, tapi bagus untuk konsistensi)
  const orderedGrouped: { [key: string]: Mission[] } = {};
  Object.keys(grouped).sort().forEach(key => {
    orderedGrouped[key] = grouped[key];
  });
  return orderedGrouped;
};

export default function MissionsPage() {
  const { user, loading: authLoading } = useAuth();
  const [missions, setMissions] = useState<Mission[]>([]);
  const [loading, setLoading] = useState(true);
  const [completingId, setCompletingId] = useState<string | null>(null);

  const groupedMissions = useMemo(() => groupMissionsByPath(missions), [missions]);

  useEffect(() => {
    if (user) {
      setLoading(true);
      const missionsQuery = query(collection(db, `users/${user.uid}/missions`), orderBy('createdAt', 'asc'));
      const unsubscribe = onSnapshot(missionsQuery, (querySnapshot) => {
        const missionsData = querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Mission));
        setMissions(missionsData);
        setLoading(false);
      });
      return () => unsubscribe();
    }
  }, [user]);

  const handleCompleteMission = async (missionId: string, xpReward: number) => {
    setCompletingId(missionId);
    try {
      const functions = getFunctions();
      const completeMission = httpsCallable(functions, 'completeMission');
      await completeMission({ missionId: missionId, xpGained: xpReward });
      // Logika untuk unlock misi berikutnya bisa ditambahkan di sini atau di backend
      // Untuk sekarang, kita biarkan status diupdate oleh listener onSnapshot
    } catch (error) {
      console.error("Gagal menyelesaikan misi:", error);
      alert("Gagal menyelesaikan misi. Coba lagi.");
    } finally {
      setCompletingId(null);
    }
  };

  if (authLoading || loading) {
    return <main className="flex min-h-screen items-center justify-center bg-[#0A0A0A] text-white"><p>Memuat Peta Perang...</p></main>;
  }

  return (
    <main className="p-4 md:p-6 lg:p-8 bg-[#0A0A0A] pb-28 text-white max-w-4xl mx-auto">
      <h1 className="text-3xl font-black text-center uppercase text-[#A8FF00]">
        Peta Perang
      </h1>
      <p className="text-center text-gray-400 mt-2">
        Selesaikan jalur misi untuk menaklukkan setiap tahap keuangan.
      </p>

      <div className="mt-8 space-y-8">
        {Object.keys(groupedMissions).length === 0 ? (
            <div className="text-center py-10 bg-[#121212] rounded-lg">
                <p className="text-gray-500">Belum ada peta perang yang dibuat.</p>
                <p className="text-xs text-gray-600 mt-1">Konsultasi dengan Mentor AI untuk memulai.</p>
            </div>
        ) : (
            Object.entries(groupedMissions).map(([pathName, pathMissions]) => (
            <div key={pathName} className="bg-[#121212] p-6 rounded-lg border border-gray-800">
                <h2 className="text-xl font-bold text-white mb-4">{pathName}</h2>
                <div className="space-y-4">
                {pathMissions.map(mission => (
                    <motion.div 
                    key={mission.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className={`bg-gray-900/50 p-4 rounded-lg flex flex-col sm:flex-row justify-between items-center gap-4 ${mission.status === 'locked' ? 'opacity-50' : ''}`}
                    >
                    <MissionCard
                        title={mission.title}
                        description={mission.description}
                        status={mission.status}
                        href={'#'}
                    />
                    {mission.status === 'active' && (
                        <Button 
                            onClick={() => handleCompleteMission(mission.id, mission.xpReward)}
                            disabled={completingId === mission.id}
                            className="w-full sm:w-auto flex-shrink-0 text-xs py-2"
                        >
                            {completingId === mission.id ? 'Memproses...' : 'Selesaikan Misi'}
                        </Button>
                    )}
                    </motion.div>
                ))}
                </div>
            </div>
            ))
        )}
      </div>
    </main>
  );
}
