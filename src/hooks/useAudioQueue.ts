'use client';

import { useState, useEffect, useRef } from 'react';

export const useAudioQueue = () => {
  const [queue, setQueue] = useState<string[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Inisialisasi audio element dan event listener 'ended'
  useEffect(() => {
    if (typeof window !== 'undefined' && !audioRef.current) {
        audioRef.current = new Audio();
    }
    
    const audioElement = audioRef.current;
    if (!audioElement) return;

    const handleAudioEnded = () => {
      // Hapus item pertama dari antrian dan lanjutkan jika masih ada
      setQueue(prevQueue => {
          const newQueue = prevQueue.slice(1);
          if (newQueue.length === 0) {
              setIsPlaying(false); // Berhenti jika antrian habis
          }
          return newQueue;
      });
    };

    audioElement.addEventListener('ended', handleAudioEnded);
    
    return () => {
      audioElement.removeEventListener('ended', handleAudioEnded);
      if (audioElement) {
        audioElement.pause();
        audioElement.src = '';
      }
    };
  }, []);

  // Efek untuk memutar item berikutnya dalam antrian saat 'queue' atau 'isPlaying' berubah
  useEffect(() => {
    if (isPlaying && queue.length > 0 && audioRef.current) {
      const nextUrl = queue[0];
      if (audioRef.current.src !== nextUrl) {
          audioRef.current.src = nextUrl;
      }
      audioRef.current.play().catch(e => {
        console.error("Audio play failed:", e);
        setIsPlaying(false);
      });
    } else if (queue.length === 0) {
      setIsPlaying(false);
    }
  }, [queue, isPlaying]);


  // FUNGSI BARU: Hanya untuk menyiapkan antrian tanpa langsung memutar
  const loadQueue = (urls: string[]) => {
    if (urls && urls.length > 0) {
      setQueue(urls);
      setIsPlaying(false); // Pastikan tidak langsung berputar
    }
  };
  
  // FUNGSI BARU: Untuk memulai pemutaran dari awal antrian
  const playQueue = () => {
    if (queue.length > 0) {
      setIsPlaying(true);
    }
  };

  // FUNGSI LAMA (diubah nama menjadi 'startQueueFromUrls' untuk kejelasan)
  const startQueueFromUrls = (urls: string[]) => {
    if (urls && urls.length > 0) {
      setQueue(urls);
      setIsPlaying(true);
    }
  };

  const stopQueue = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setQueue([]);
    setIsPlaying(false);
  };

  return { isPlaying, loadQueue, playQueue, startQueue: startQueueFromUrls, stopQueue };
};
