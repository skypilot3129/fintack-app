// src/hooks/useAdmin.ts
import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';

export function useAdmin() {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAdminStatus = async () => {
      if (user) {
        try {
          // Paksa refresh token untuk mendapatkan custom claim terbaru
          const idTokenResult = await user.getIdTokenResult(true);
          const isAdminClaim = !!idTokenResult.claims.admin;
          setIsAdmin(isAdminClaim);
        } catch (error) {
          console.error("Error checking admin status:", error);
          setIsAdmin(false);
        }
      } else {
        setIsAdmin(false);
      }
      setLoading(false);
    };

    checkAdminStatus();
  }, [user]);

  return { isAdmin, loading };
}
