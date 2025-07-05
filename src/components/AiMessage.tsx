'use client';

import ReactMarkdown from 'react-markdown';
import { useTypewriter } from '@/hooks/useTypewriter';

interface AiMessageProps {
  text: string;
  isStreaming: boolean;
}

export default function AiMessage({ text, isStreaming }: AiMessageProps) {
  // Selalu panggil hook di level atas
  const typedText = useTypewriter(text, 20);
  
  // Gunakan kondisi untuk menentukan teks mana yang akan ditampilkan
  const displayText = isStreaming ? typedText : text;

  return (
    <div className="prose prose-sm prose-invert max-w-none">
      <ReactMarkdown>{displayText}</ReactMarkdown>
    </div>
  );
}
