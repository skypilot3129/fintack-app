'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

export const useAudioQueue = () => {
  const [queue, setQueue] = useState<string[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Inisialisasi audio element hanya di client-side
    if (typeof window !== 'undefined' && !audioRef.current) {
        audioRef.current = new Audio();
    }
  }, []);

  const playNextInQueue = useCallback(() => {
    if (queue.length > 0 && audioRef.current) {
      const nextUrl = queue[0];
      audioRef.current.src = nextUrl;
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
    const audioElement = audioRef.current;
    if (!audioElement) return;

    const handleAudioEnded = () => {
      // Hapus item yang sudah selesai dari antrean dan mainkan berikutnya
      setQueue(prevQueue => prevQueue.slice(1));
    };

    audioElement.addEventListener('ended', handleAudioEnded);
    return () => {
      audioElement.removeEventListener('ended', handleAudioEnded);
    };
  }, []);

  useEffect(() => {
    // Jika queue berubah (setelah item dihapus), mainkan item berikutnya
    if (isPlaying) {
      playNextInQueue();
    }
  }, [queue, isPlaying, playNextInQueue]);


  const startQueue = (urls: string[]) => {
    if (urls.length > 0) {
      setQueue(urls);
      // Memulai pemutaran pertama kali secara manual
      if (audioRef.current) {
        audioRef.current.src = urls[0];
        audioRef.current.play().catch(e => console.error("Audio play failed:", e));
        setIsPlaying(true);
      }
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
