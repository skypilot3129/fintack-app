'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase';
import { collection, query, onSnapshot, orderBy, doc } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import MissionCard from '@/components/MissionCard';
import Button from '@/components/Button';
import { motion } from 'framer-motion';
import { Lock } from 'lucide-react';
import TourHighlight from '@/components/TourHighlight';
import toast from 'react-hot-toast';

// Definisikan tipe data Misi & Level
interface Mission {
  id: string;
  title: string;
  description: string;
  status: 'active' | 'completed' | 'locked';
  levelRequirement: number;
  xpReward: number;
  href?: string;
  pathName: string;
}

const LEVELS = [
  { name: 'Pemula Sadar Diri', xpRequired: 0, level: 1 },
  { name: 'Pejuang Receh', xpRequired: 100, level: 2 },
  { name: 'Calon Sultan', xpRequired: 300, level: 3 },
  { name: 'Investor Muda', xpRequired: 700, level: 4 },
  { name: 'Panglima Aset', xpRequired: 1500, level: 5 },
];

const getUserLevel = (xp: number) => {
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (xp >= LEVELS[i].xpRequired) {
      return LEVELS[i];
    }
  }
  return LEVELS[0];
};

export default function MisiPage() {
  const { user, loading: authLoading } = useAuth();
  const [missions, setMissions] = useState<Mission[]>([]);
  const [xp, setXp] = useState(0);
  const [loading, setLoading] = useState(true);
  const [completingId, setCompletingId] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      const missionsQuery = query(collection(db, `users/${user.uid}/missions`), orderBy('createdAt', 'asc'));
      const unsubMissions = onSnapshot(missionsQuery, (snap) => {
        setMissions(snap.docs.map(doc => ({ ...doc.data(), id: doc.id } as Mission)));
      });

      const profileRef = doc(db, 'users', user.uid);
      const unsubProfile = onSnapshot(profileRef, (docSnap) => {
        if (docSnap.exists()) setXp(docSnap.data().xp || 0);
        setLoading(false);
      });

      return () => {
        unsubMissions();
        unsubProfile();
      };
    }
  }, [user]);

  const userLevel = useMemo(() => getUserLevel(xp), [xp]);

  const categorizedMissions = useMemo(() => {
    const definedPaths = ['Foundation', 'Attack', 'Growth'];
    return {
      foundation: missions.filter(m => m.pathName === 'Foundation'),
      attack: missions.filter(m => m.pathName === 'Attack'),
      growth: missions.filter(m => m.pathName === 'Growth'),
      // PERBAIKAN: Menangkap misi yang tidak memiliki pathName yang valid
      others: missions.filter(m => !definedPaths.includes(m.pathName)),
    };
  }, [missions]);

  const handleCompleteMission = async (missionId: string, xpGained: number) => {
    if (!user) return;
    setCompletingId(missionId);
    try {
      const functions = getFunctions();
      const completeMission = httpsCallable(functions, 'completeMission');
      await completeMission({ missionId, xpGained });
      toast.success(`Misi Selesai! +${xpGained} XP!`);
    } catch (error) {
      console.error("Gagal menyelesaikan misi:", error);
      toast.error("Gagal menyelesaikan misi.");
    } finally {
      setCompletingId(null);
    }
  };

  const MissionSection = ({ title, missions, requiredLevel }: { title: string; missions: Mission[]; requiredLevel?: number }) => {
    if (missions.length === 0) return null;
    const isLocked = requiredLevel ? userLevel.level < requiredLevel : false;
    
    return (
      <div className={`bg-[#121212] p-6 rounded-lg border border-gray-800 transition-opacity ${isLocked ? 'opacity-50' : ''}`}>
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold">{title}</h2>
          {isLocked && <div className="flex items-center text-xs text-yellow-400"><Lock size={14} className="mr-2" /> Level {requiredLevel} Dibutuhkan</div>}
        </div>
        {isLocked ? (
          <div className="text-center py-8 text-gray-500">Selesaikan misi sebelumnya untuk membuka tahap ini.</div>
        ) : (
          <div className="mt-4 space-y-4">
            {missions.map(mission => (
              <motion.div key={mission.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-gray-800/50 p-4 rounded-lg">
                <MissionCard {...mission} href={mission.href || '#'} />
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
        )}
      </div>
    );
  };

  if (authLoading || loading) {
    return <main className="flex min-h-screen items-center justify-center bg-[#0A0A0A] text-white"><p>Memuat Misi...</p></main>;
  }

  return (
    <TourHighlight
      tourId="misi"
      title="Selamat Datang di Pusat Misi!"
      description="Ini adalah papan rencanamu. Selesaikan misi yang aktif untuk mendapatkan XP, naik level, dan membuka tahap selanjutnya dalam perjalanan keuanganmu."
    >
      <main className="p-4 md:p-6 lg:p-8 bg-[#0A0A0A] pb-28 min-h-screen text-white max-w-4xl mx-auto">
        <h1 className="text-3xl font-black text-center uppercase text-[#A8FF00]">
          Pusat Misi
        </h1>
        <p className="text-center text-gray-400 mt-2">
          Selesaikan misi untuk naik level dan membangun kekayaanmu.
        </p>

        <div className="mt-8 space-y-8">
          {/* PERBAIKAN: Menampilkan misi "Lainnya" jika ada */}
          <MissionSection title="Misi Dari Mentor" missions={categorizedMissions.others} />
          <MissionSection title="Tahap Fondasi" missions={categorizedMissions.foundation} requiredLevel={1} />
          <MissionSection title="Tahap Serangan" missions={categorizedMissions.attack} requiredLevel={3} />
          <MissionSection title="Tahap Pertumbuhan" missions={categorizedMissions.growth} requiredLevel={5} />
        </div>
      </main>
    </TourHighlight>
  );
}
