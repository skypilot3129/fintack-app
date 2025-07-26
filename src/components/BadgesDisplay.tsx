'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { Award, Trophy } from 'lucide-react';
import { motion } from 'framer-motion';

// Tipe data untuk Lencana
interface Badge {
  id: string;
  name: string;
  earnedAt: {
    toDate: () => Date;
  };
}

// Komponen untuk satu item lencana
const BadgeItem = ({ badge, index }: { badge: Badge; index: number }) => {
  return (
    <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3, delay: index * 0.1 }}
        className="flex items-center gap-3 bg-gray-800/50 p-3 rounded-lg"
    >
        <div className="p-2 bg-yellow-500/20 rounded-full">
            <Award className="text-yellow-400" size={20} />
        </div>
        <div>
            <p className="font-bold text-sm text-white">{badge.name}</p>
            <p className="text-xs text-gray-400">
                Didapat pada {badge.earnedAt.toDate().toLocaleDateString('id-ID')}
            </p>
        </div>
    </motion.div>
  );
};

export default function BadgesDisplay() {
  const { user } = useAuth();
  const [badges, setBadges] = useState<Badge[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const badgesRef = collection(db, 'users', user.uid, 'badges');
    const q = query(badgesRef, orderBy('earnedAt', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedBadges = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as Badge[];
      setBadges(fetchedBadges);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [user]);
  
  // Skeleton loading
  if (isLoading) {
    return (
        <div className="bg-[#121212] p-4 rounded-lg border border-gray-800 animate-pulse">
            <div className="h-5 w-1/3 bg-gray-700 rounded mb-4"></div>
            <div className="space-y-3">
                <div className="h-12 bg-gray-800/50 rounded-lg"></div>
                <div className="h-12 bg-gray-800/50 rounded-lg"></div>
            </div>
        </div>
    );
  }

  return (
    <div className="bg-[#121212] p-4 rounded-lg border border-gray-800">
        <h3 className="text-md font-bold flex items-center gap-2 mb-4">
            <Trophy size={18} className="text-[#A8FF00]"/>
            Pencapaian
        </h3>
        {badges.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">Belum ada lencana yang didapat. Terus berjuang!</p>
        ) : (
            <div className="space-y-3">
                {badges.map((badge, index) => (
                    <BadgeItem key={badge.id} badge={badge} index={index} />
                ))}
            </div>
        )}
    </div>
  );
}