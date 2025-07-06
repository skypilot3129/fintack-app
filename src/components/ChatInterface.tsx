// src/components/ChatInterface.tsx
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { User } from 'firebase/auth';
// PERBAIKAN: Hapus 'Button' yang tidak digunakan
import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from '@/lib/firebase';
import {
  getFirestore,
  collection,
  addDoc,
  query,
  onSnapshot,
  orderBy,
  serverTimestamp,
  // PERBAIKAN: Hapus 'Timestamp' yang tidak digunakan
} from 'firebase/firestore';
import { Content } from '@/types/gemini'; // Menggunakan tipe lokal
import { Send } from 'lucide-react';
import AiMessage from './AiMessage';

type Message = {
  text: string;
  sender: 'user' | 'ai';
};

type ChatInterfaceProps = {
  user: User;
};

// PERBAIKAN: Tambahkan tipe untuk response dari AI
type AskMentorAIResponse = {
  response: string;
}

export default function ChatInterface({ user }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [geminiHistory, setGeminiHistory] = useState<Content[]>([]);
  const [input, setInput] = useState('');
  const [isAiTyping, setIsAiTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  const db = getFirestore(app);

  useEffect(() => {
    if (!user) return;

    const chatHistoryColRef = collection(db, 'users', user.uid, 'chatHistory');
    const q = query(chatHistoryColRef, orderBy('createdAt', 'asc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (snapshot.empty) {
        setMessages([{ text: `Selamat datang di Fintack, ${user.displayName || 'Pilot'}. Apa masalah keuangan terbesar lo sekarang? Langsung ke intinya! 🔥`, sender: 'ai' }]);
        setIsInitialLoad(false);
        return;
      }

      const historyFromDb = snapshot.docs.map(doc => doc.data());

      const uiMessages: Message[] = historyFromDb.map(msg => ({
        text: msg.parts[0].text,
        sender: msg.role === 'user' ? 'user' : 'ai',
      }));
      setMessages(uiMessages);

      const apiHistory: Content[] = historyFromDb.map(msg => ({
          role: msg.role,
          parts: msg.parts,
      }));
      setGeminiHistory(apiHistory);
      
      setIsInitialLoad(false);
    });

    return () => unsubscribe();
  }, [user, db]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isAiTyping]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const scrollHeight = textareaRef.current.scrollHeight;
      textareaRef.current.style.height = `${scrollHeight}px`;
    }
  }, [input]);

  // PERBAIKAN: Pisahkan logika pengiriman pesan agar bisa dipanggil dari mana saja
  const submitMessage = async () => {
    if (input.trim() === '' || isAiTyping) return;

    const userMessageText = input;
    setInput('');

    await addDoc(collection(db, 'users', user.uid, 'chatHistory'), {
        role: 'user',
        parts: [{ text: userMessageText }],
        createdAt: serverTimestamp(),
    });

    setIsAiTyping(true);

    try {
      const functions = getFunctions();
      const askMentorAI = httpsCallable(functions, 'askMentorAI');
      
      const result = await askMentorAI({
        prompt: userMessageText,
        history: geminiHistory,
      });

      // PERBAIKAN: Gunakan tipe yang sudah didefinisikan
      const aiResponseText = (result.data as AskMentorAIResponse).response;

      await addDoc(collection(db, 'users', user.uid, 'chatHistory'), {
        role: 'model',
        parts: [{ text: aiResponseText }],
        createdAt: serverTimestamp(),
      });

    } catch (error) {
      console.error("Error calling cloud function:", error);
      await addDoc(collection(db, 'users', user.uid, 'chatHistory'), {
        role: 'model',
        parts: [{ text: "Gagal menghubungi mentor. Coba lagi nanti." }],
        createdAt: serverTimestamp(),
      });
    } finally {
      setIsAiTyping(false);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submitMessage();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submitMessage();
    }
  };

  const lastAiMessageIndex = messages.findLastIndex(msg => msg.sender === 'ai');

  return (
    <div className="flex flex-col h-full bg-[#121212] rounded-lg border border-gray-800">
      <div className="p-4 border-b border-gray-800 flex-shrink-0">
        <h2 className="font-bold text-lg">Mentor AI</h2>
        <p className="text-xs text-green-400">Online</p>
      </div>

      <div className="flex-1 p-4 overflow-y-auto">
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`flex mb-4 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-xs md:max-w-md lg:max-w-lg px-4 py-2 rounded-lg ${
                msg.sender === 'user'
                  ? 'bg-[#A8FF00] text-black'
                  : 'bg-gray-800 text-white'
              }`}
            >
              {msg.sender === 'ai' ? (
                <AiMessage text={msg.text} isStreaming={index === lastAiMessageIndex && !isInitialLoad} />
              ) : (
                <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
              )}
            </div>
          </div>
        ))}
        {isAiTyping && (
          <div className="flex justify-start mb-4">
            <div className="bg-gray-800 text-white px-4 py-2 rounded-lg">
              <p className="text-sm animate-pulse">AI is typing...</p>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 border-t border-gray-800 flex-shrink-0">
        <form onSubmit={handleFormSubmit} className="flex items-end space-x-3">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Tanya apa saja..."
            className="flex-1 bg-gray-800 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#A8FF00] resize-none overflow-y-hidden"
            rows={1}
            disabled={isAiTyping}
          />
          <button 
            type="submit" 
            className="bg-[#A8FF00] text-black rounded-full p-3 hover:bg-lime-400 transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed flex-shrink-0" 
            disabled={!input.trim() || isAiTyping}
          >
            <Send size={18} />
          </button>
        </form>
      </div>
    </div>
  );
}
