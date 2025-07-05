'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase';
import { collection, query, onSnapshot, orderBy, doc } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import MissionCard from '@/components/MissionCard';
import Button from '@/components/Button';
import { motion } from 'framer-motion';
import { Lock } from 'lucide-react'; // Impor ikon gembok

// Definisikan tipe data Misi & Level
interface Mission {
  id: string;
  title: string;
  description: string;
  status: 'active' | 'completed' | 'locked';
  levelRequirement: number;
  xpReward: number;
  href?: string;
}

const LEVELS = [
  { name: 'Pemula Sadar Diri', xpRequired: 0, level: 1 },
  { name: 'Pejuang Receh', xpRequired: 100, level: 2 },
  { name: 'Calon Sultan', xpRequired: 300, level: 3 },
  { name: 'Investor Muda', xpRequired: 700, level: 4 },
  { name: 'Panglima Aset', xpRequired: 1500, level: 5 },
];

const getUserLevel = (xp: number) => {
  let currentLevel = LEVELS[0];
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (xp >= LEVELS[i].xpRequired) {
      currentLevel = LEVELS[i];
      break;
    }
  }
  return currentLevel;
};

// Fungsi untuk mengkategorikan misi berdasarkan level requirement
const categorizeMissions = (missions: Mission[]) => {
  const foundation = missions.filter(m => m.levelRequirement <= 5);
  const attack = missions.filter(m => m.levelRequirement > 5 && m.levelRequirement <= 10);
  const growth = missions.filter(m => m.levelRequirement > 10);
  return { foundation, attack, growth };
};


export default function MissionsPage() {
  const { user, loading: authLoading } = useAuth();
  const [missions, setMissions] = useState<Mission[]>([]);
  const [userXP, setUserXP] = useState(0);
  const [loading, setLoading] = useState(true);
  const [completingId, setCompletingId] = useState<string | null>(null);

  const userLevel = useMemo(() => getUserLevel(userXP), [userXP]);
  const categorizedMissions = useMemo(() => categorizeMissions(missions), [missions]);

  // Mengambil data misi & profil pengguna
  useEffect(() => {
    if (user) {
      setLoading(true);
      
      const missionsQuery = query(collection(db, `users/${user.uid}/missions`), orderBy('createdAt', 'desc'));
      const unsubMissions = onSnapshot(missionsQuery, (snap) => {
        setMissions(snap.docs.map(doc => ({ ...doc.data(), id: doc.id } as Mission)));
      });

      const profileRef = doc(db, 'users', user.uid);
      const unsubProfile = onSnapshot(profileRef, (docSnap) => {
        setUserXP(docSnap.data()?.xp || 0);
      });
      
      setLoading(false);
      
      return () => {
        unsubMissions();
        unsubProfile();
      };
    }
  }, [user]);

  const handleCompleteMission = async (missionId: string, xpReward: number) => {
    setCompletingId(missionId);
    try {
      const functions = getFunctions();
      const completeMission = httpsCallable(functions, 'completeMission');
      await completeMission({ missionId: missionId, xpGained: xpReward });
    } catch (error) {
      console.error("Gagal menyelesaikan misi:", error);
      alert("Gagal menyelesaikan misi. Coba lagi.");
    } finally {
      setCompletingId(null);
    }
  };

  const MissionSection = ({ title, missions, requiredLevel }: { title: string, missions: Mission[], requiredLevel: number }) => {
    const isLocked = userLevel.level < requiredLevel;
    
    return (
      <div className="bg-[#121212] p-6 rounded-lg border border-gray-800">
        <h2 className="text-xl font-bold text-white mb-4 flex items-center">
          {isLocked && <Lock className="mr-2 text-red-500" size={20} />}
          {title}
        </h2>
        {isLocked ? (
          <p className="text-gray-500 text-sm">Selesaikan misi sebelumnya untuk membuka tahap ini.</p>
        ) : (
          <div className="space-y-4">
            {missions.length === 0 ? (
              <p className="text-gray-500 text-sm">Belum ada misi di tahap ini.</p>
            ) : (
              missions.map(mission => (
                <motion.div 
                  key={mission.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                  className="bg-gray-900/50 p-4 rounded-lg flex flex-col sm:flex-row justify-between items-center gap-4"
                >
                  <MissionCard
                    title={mission.title}
                    description={mission.description}
                    status={mission.status}
                    href={mission.href || '#'}
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
              ))
            )}
          </div>
        )}
      </div>
    );
  };

  if (authLoading || loading) {
    return <main className="flex min-h-screen items-center justify-center bg-[#0A0A0A] text-white"><p>Memuat Misi...</p></main>;
  }

  return (
    <main className="p-4 md:p-6 lg:p-8 bg-[#0A0A0A] pb-28 min-h-screen text-white max-w-4xl mx-auto">
      <h1 className="text-3xl font-black text-center uppercase text-[#A8FF00]">
        Pusat Misi
      </h1>
      <p className="text-center text-gray-400 mt-2">
        Selesaikan misi untuk naik level dan membangun kekayaanmu.
      </p>

      <div className="mt-8 space-y-8">
        <MissionSection title="Tahap Fondasi" missions={categorizedMissions.foundation} requiredLevel={1} />
        <MissionSection title="Tahap Serangan" missions={categorizedMissions.attack} requiredLevel={6} />
        <MissionSection title="Tahap Pertumbuhan" missions={categorizedMissions.growth} requiredLevel={11} />
      </div>
    </main>
  );
}
