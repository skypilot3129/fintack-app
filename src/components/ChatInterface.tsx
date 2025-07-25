'use client';

import React, { useState, useEffect, useRef } from 'react';
import { User } from 'firebase/auth';
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
} from 'firebase/firestore';
import { Content } from '@/types/gemini';
import { Send, Mic } from 'lucide-react';
import AiMessage from './AiMessage';
import { useVoiceChat } from '@/hooks/useVoiceChat';

type Message = {
  text: string;
  sender: 'user' | 'ai';
};

type ChatInterfaceProps = {
  user: User;
};

type AskMentorAIResponse = {
  textResponse: string;
  audioUrl?: string | null;
}

export default function ChatInterface({ user }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [geminiHistory, setGeminiHistory] = useState<Content[]>([]);
  const [input, setInput] = useState('');
  const [isAiTyping, setIsAiTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const db = getFirestore(app);

  useEffect(() => {
    if (!user) return;
    const chatHistoryColRef = collection(db, 'users', user.uid, 'chatHistory');
    const q = query(chatHistoryColRef, orderBy('createdAt', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (snapshot.empty) {
        setMessages([{ text: `Selamat datang di Fintack, ${user.displayName || 'Pilot'}. Apa masalah keuangan terbesar lo sekarang? Langsung ke intinya! 🔥`, sender: 'ai' }]);
        return;
      }
      const historyFromDb = snapshot.docs.map(doc => doc.data());
      const uiMessages: Message[] = historyFromDb.map(msg => ({ text: msg.parts[0].text, sender: msg.role === 'user' ? 'user' : 'ai' }));
      setMessages(uiMessages);
      const apiHistory: Content[] = historyFromDb.map(msg => ({ role: msg.role, parts: msg.parts }));
      setGeminiHistory(apiHistory);
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

  const submitMessage = async (messageText: string, inputType: 'text' | 'voice') => {
    if (messageText.trim() === '' || isAiTyping) return;

    await addDoc(collection(db, 'users', user.uid, 'chatHistory'), {
        role: 'user',
        parts: [{ text: messageText }],
        createdAt: serverTimestamp(),
    });

    setIsAiTyping(true);

    try {
      const functions = getFunctions();
      const askMentorAI = httpsCallable(functions, 'askMentorAI');
      const result = await askMentorAI({ 
        prompt: messageText, 
        history: geminiHistory,
        inputType: inputType 
      });
      
      const { textResponse, audioUrl } = result.data as AskMentorAIResponse;

      if (audioUrl) {
          if (audioRef.current) {
              audioRef.current.pause();
          }
          audioRef.current = new Audio(audioUrl);
          audioRef.current.play().catch(e => console.error("Audio play failed:", e));
      }

      await addDoc(collection(db, 'users', user.uid, 'chatHistory'), {
        role: 'model',
        parts: [{ text: textResponse }],
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
    if(input.trim()) {
        submitMessage(input, 'text');
        setInput('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleFormSubmit(e);
    }
  };

  // PERBAIKAN: Panggil 'stopListening' dari hook
  const { isListening, startListening, stopListening } = useVoiceChat((transcript) => {
      submitMessage(transcript, 'voice');
  });

  const lastMessageIndex = messages.length - 1;

  return (
    <div className="flex flex-col h-full bg-[#121212] rounded-lg border border-gray-800">
      <div className="p-4 border-b border-gray-800 flex-shrink-0">
        <h2 className="font-bold text-lg">Mas Eugene</h2>
        <p className="text-xs text-green-400">Online</p>
      </div>

      <div className="flex-1 p-4 overflow-y-auto">
        {messages.map((msg, index) => (
          <div key={index} className={`flex mb-4 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-xs md:max-w-md lg:max-w-lg px-4 py-2 rounded-lg ${msg.sender === 'user' ? 'bg-[#A8FF00] text-black' : 'bg-gray-800 text-white'}`}>
              <AiMessage text={msg.text} isStreaming={index === lastMessageIndex && isAiTyping} />
            </div>
          </div>
        ))}
        {isAiTyping && (
          <div className="flex justify-start mb-4">
            <div className="bg-gray-800 text-white px-4 py-2 rounded-lg">
              <p className="text-sm animate-pulse">Mas Eugene sedang berpikir...</p>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 border-t border-gray-800 flex-shrink-0">
        <form onSubmit={handleFormSubmit} className="flex items-end space-x-2">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ketik atau tekan mic untuk bicara..."
            className="flex-1 bg-gray-800 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#A8FF00] resize-none overflow-y-hidden"
            rows={1}
            disabled={isAiTyping || isListening}
          />
          
          {input.trim() ? (
            <button type="submit" className="..." disabled={isAiTyping}>
              <Send size={18} />
            </button>
          ) : (
            <button 
              type="button" 
              // PERBAIKAN: Logika toggle di sini
              onClick={isListening ? stopListening : startListening}
              disabled={isAiTyping}
              className={`bg-gray-700 text-white rounded-full p-3 transition-colors flex-shrink-0 disabled:bg-gray-600 disabled:cursor-not-allowed ${isListening ? 'bg-red-500 animate-pulse' : 'hover:bg-gray-600'}`}
              title={isListening ? "Hentikan Merekam" : "Bicara dengan Mentor"}
            >
              <Mic size={18} />
            </button>
          )}
        </form>
      </div>
    </div>
  );
}
