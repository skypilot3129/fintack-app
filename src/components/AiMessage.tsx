'use client';

import ReactMarkdown from 'react-markdown';
import { useTypewriter } from '@/hooks/useTypewriter';

interface AiMessageProps {
  text: string;
  isStreaming: boolean; // Prop baru untuk kontrol animasi
}

export default function AiMessage({ text, isStreaming }: AiMessageProps) {
  // PERBAIKAN: Panggil hook di level atas komponen tanpa syarat.
  const typedText = useTypewriter(text, 30); // Kecepatan bisa disesuaikan

  // Gunakan hasilnya secara kondisional saat me-render.
  const displayText = isStreaming ? typedText : text;

  return (
    <div className="prose prose-sm prose-invert max-w-none">
      <ReactMarkdown>{displayText}</ReactMarkdown>
    </div>
  );
}
