'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

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
      setQueue(prevQueue => prevQueue.slice(1));
    };

    audioElement.addEventListener('ended', handleAudioEnded);
    
    // --- PERBAIKAN UTAMA: CLEANUP OTOMATIS ---
    // Fungsi ini akan otomatis berjalan saat komponen yang menggunakan hook ini di-unmount
    return () => {
      audioElement.removeEventListener('ended', handleAudioEnded);
      // Hentikan audio dan reset source untuk mencegah memory leak
      audioElement.pause();
      audioElement.src = '';
    };
  }, []);

  const playNextInQueue = useCallback(() => {
    if (queue.length > 0 && audioRef.current) {
      const nextUrl = queue[0];
      // Hanya set src jika berbeda untuk menghindari interupsi yang tidak perlu
      if (audioRef.current.src !== nextUrl) {
          audioRef.current.src = nextUrl;
      }
      audioRef.current.play().catch(e => {
        console.error("Audio play failed:", e);
        setIsPlaying(false);
      });
      setIsPlaying(true);
    } else {
      setIsPlaying(false);
    }
  }, [queue]);

  useEffect(() => {
    if (isPlaying) { // Efek ini hanya berjalan jika state isPlaying aktif
      playNextInQueue();
    }
  }, [queue, isPlaying, playNextInQueue]);


  const startQueue = (urls: string[]) => {
    if (urls.length > 0) {
      setQueue(urls);
      setIsPlaying(true); // Cukup set state, biarkan useEffect yang menangani pemutaran
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

  return { isPlaying, startQueue, stopQueue };
};
