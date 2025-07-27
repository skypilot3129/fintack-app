'use client';

import { useAudioQueue } from '@/hooks/useAudioQueue';
import { Play, Pause } from 'lucide-react';

interface AudioPlayerProps {
  audioUrls: string[];
}

export default function AudioPlayer({ audioUrls }: AudioPlayerProps) {
  const { isPlaying, startQueue, stopQueue } = useAudioQueue();

  const handlePlay = () => {
    if (isPlaying) {
      stopQueue();
    } else {
      startQueue(audioUrls);
    }
  };

  return (
    <div className="mt-2">
      <button 
        onClick={handlePlay}
        className="flex items-center gap-2 text-xs text-lime-300 bg-gray-700/50 px-3 py-1 rounded-full hover:bg-gray-700"
      >
        {isPlaying ? <Pause size={14} /> : <Play size={14} />}
        <span>{isPlaying ? 'Berhenti' : 'Putar Suara'}</span>
      </button>
    </div>
  );
}
