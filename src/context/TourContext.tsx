// src/context/TourContext.tsx
'use client';

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { db } from '@/lib/firebase';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';

// Tipe untuk data profil pengguna terkait tur
interface UserProfile {
  tours?: {
    [key: string]: boolean; // Contoh: { dashboard: true, cashflow: true }
  };
}

// Tipe untuk nilai context
interface TourContextType {
  seenTours: { [key: string]: boolean };
  markTourAsSeen: (tourId: string) => void;
  isProfileLoading: boolean;
}

const TourContext = createContext<TourContextType | undefined>(undefined);

export const TourContextProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [seenTours, setSeenTours] = useState<{ [key: string]: boolean }>({});
  const [isProfileLoading, setIsProfileLoading] = useState(true);

  useEffect(() => {
    if (user) {
      const profileRef = doc(db, 'users', user.uid);
      const unsubscribe = onSnapshot(profileRef, (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data() as UserProfile;
          setSeenTours(data.tours || {});
        }
        setIsProfileLoading(false);
      });
      return () => unsubscribe();
    } else {
      // Reset jika user logout
      setSeenTours({});
      setIsProfileLoading(true);
    }
  }, [user]);

  const markTourAsSeen = useCallback(async (tourId: string) => {
    if (!user) return;
    const newSeenTours = { ...seenTours, [tourId]: true };
    setSeenTours(newSeenTours);
    try {
      const profileRef = doc(db, 'users', user.uid);
      await setDoc(profileRef, { tours: newSeenTours }, { merge: true });
    } catch (error) {
      console.error("Failed to update tour status:", error);
    }
  }, [user, seenTours]);

  return (
    <TourContext.Provider value={{ seenTours, markTourAsSeen, isProfileLoading }}>
      {children}
    </TourContext.Provider>
  );
};

export const useTour = (): TourContextType => {
  const context = useContext(TourContext);
  if (context === undefined) {
    throw new Error("useTour must be used within a TourContextProvider");
  }
  return context;
};
