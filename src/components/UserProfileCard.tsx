'use client';

import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { db, auth } from '@/lib/firebase';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';
import InsightBell from './InsightBell'; 

const LEVELS = [
  { name: 'Pemula Sadar Diri', xpRequired: 0 },
  { name: 'Pejuang Receh', xpRequired: 100 },
  { name: 'Calon Sultan', xpRequired: 300 },
  { name: 'Investor Muda', xpRequired: 700 },
  { name: 'Panglima Aset', xpRequired: 1500 },
];

const getUserLevel = (xp: number) => {
  let currentLevel = LEVELS[0];
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (xp >= LEVELS[i].xpRequired) {
      currentLevel = LEVELS[i];
      break;
    }
  }
  const nextLevelIndex = LEVELS.findIndex(l => l.xpRequired > xp);
  const xpForNextLevel = nextLevelIndex !== -1 ? LEVELS[nextLevelIndex].xpRequired : currentLevel.xpRequired;
  const xpForCurrentLevel = currentLevel.xpRequired;
  
  return { ...currentLevel, xpForNextLevel, xpForCurrentLevel };
};

interface UserProfileCardProps {
  user: User;
}

export default function UserProfileCard({ user }: UserProfileCardProps) {
  const [xp, setXp] = useState(0);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    if (!user) return;
    
    const profileRef = doc(db, 'users', user.uid);
    
    const unsubscribe = onSnapshot(profileRef, async (docSnap) => {
      if (docSnap.exists()) {
        setXp(docSnap.data().xp || 0);
      } else {
        await setDoc(profileRef, { xp: 0, level: 1, createdAt: new Date() });
        setXp(0);
      }
      setLoading(false);
    });
    
    return () => unsubscribe();
  }, [user]);

  const handleLogout = async () => {
    try {
      await auth.signOut();
      router.push('/');
    } catch (error) {
      console.error("Error signing out: ", error);
    }
  };

  const { name, xpForCurrentLevel, xpForNextLevel } = getUserLevel(xp);
  const progressPercentage = xpForNextLevel > xpForCurrentLevel 
    ? ((xp - xpForCurrentLevel) / (xpForNextLevel - xpForCurrentLevel)) * 100 
    : 100;

  if (loading) {
    return <div className="h-[124px] bg-[#121212] p-4 rounded-lg border border-gray-800 flex items-center justify-center text-sm">Memuat profil...</div>;
  }

  return (
    <div className="bg-[#121212] p-4 rounded-lg border border-gray-800">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-xl font-bold">Selamat Datang, {user.displayName || 'Pilot'}!</h2>
          <p className="text-sm text-[#A8FF00]">{name}</p>
        </div>
        <div className="flex items-center space-x-2">
            <InsightBell />
            <button 
              onClick={handleLogout} 
              className="p-2 text-gray-400 rounded-full hover:bg-gray-700 hover:text-white transition-colors"
              aria-label="Logout"
            >
              <LogOut size={20} />
            </button>
        </div>
      </div>
      <div className="mt-4">
        <div className="flex justify-between text-xs text-gray-400 mb-1">
          <span>XP: {xp} / {xpForNextLevel}</span>
          <span>Next Level</span>
        </div>
        <div className="w-full bg-gray-700 rounded-full h-2.5">
          <div className="bg-[#A8FF00] h-2.5 rounded-full transition-all duration-500" style={{ width: `${progressPercentage}%` }}></div>
        </div>
      </div>
    </div>
  );
}
