'use client';

import ReactMarkdown from 'react-markdown';
import { useTypewriter } from '@/hooks/useTypewriter';

interface AiMessageProps {
  text: string;
  isStreaming: boolean; // Prop baru untuk kontrol animasi
}

export default function AiMessage({ text, isStreaming }: AiMessageProps) {
  // Gunakan hook useTypewriter HANYA jika isStreaming bernilai true
  const displayText = isStreaming ? useTypewriter(text, 20) : text;

  return (
    <div className="prose prose-sm prose-invert max-w-none">
      <ReactMarkdown>{displayText}</ReactMarkdown>
    </div>
  );
}
