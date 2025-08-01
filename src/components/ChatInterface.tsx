'use client';

import React, { useState, useEffect, useRef } from 'react';
import { User } from 'firebase/auth';
import { Send, Mic, Square, Play, Pause } from 'lucide-react';
import AiMessage from './AiMessage';
import { useVoiceChat } from '@/hooks/useVoiceChat';
import { useChatStore } from '@/stores/chatStore';
import { useAudioQueue } from '@/hooks/useAudioQueue';

type ChatInterfaceProps = {
  user: User;
};

export default function ChatInterface({ user }: ChatInterfaceProps) {
  const { messages, isAiTyping, initializeChat, sendMessage, reset } = useChatStore();
  
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { isPlaying, loadQueue, playQueue, stopQueue } = useAudioQueue();
  
  const [loadedAudioMessageId, setLoadedAudioMessageId] = useState<string | null>(null);

  // ==================================================================
  // PERBAIKAN FINAL: Mengatasi Infinite Loop dengan Dependency Array yang Benar
  // ==================================================================
  useEffect(() => {
    let unsubscribe: (() => void) | null = null;

    if (user) {
      unsubscribe = initializeChat(user.uid, user.displayName);
    } else {
      reset();
    }

    return () => {
      if (unsubscribe) {
        console.log("Cleaning up chat listener for user:", user?.uid);
        unsubscribe();
      }
      stopQueue();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]); // <-- KUNCI PERBAIKAN: Dependency array HANYA berisi 'user'


  useEffect(() => {
    const lastMessage = messages[messages.length - 1];
    if (
      lastMessage?.id &&
      lastMessage.id !== loadedAudioMessageId &&
      lastMessage.sender === 'ai' &&
      lastMessage.audioUrls &&
      lastMessage.audioUrls.length > 0
    ) {
      console.log(`Loading audio for message ID: ${lastMessage.id}`);
      loadQueue(lastMessage.audioUrls);
      setLoadedAudioMessageId(lastMessage.id);
    }
  }, [messages, loadQueue, loadedAudioMessageId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isAiTyping]);
  
  useEffect(() => {
    if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
        textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [input]);

  const submitTextMessage = () => {
    if (input.trim()) {
      stopQueue();
      sendMessage(user.uid, input, 'text');
      setInput('');
    }
  };

  const submitVoiceMessage = (transcript: string) => {
    stopQueue();
    sendMessage(user.uid, transcript, 'voice');
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submitTextMessage();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submitTextMessage();
    }
  };

  const { isListening, startListening, stopListening } = useVoiceChat(submitVoiceMessage);
  
  const lastMessageIndex = messages.length - 1;

  const getPlaceholderText = () => {
    if (isListening) return "Mendengarkan... bicaralah yang jelas.";
    if (isAiTyping) return "Mas Eugene sedang mengetik...";
    return "Ketik atau tekan mic untuk bicara...";
  };

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
              {msg.sender === 'ai' ? (
                <>
                  <AiMessage text={msg.text} isStreaming={index === lastMessageIndex && isAiTyping && !isPlaying} />
                  {msg.audioUrls && msg.audioUrls.length > 0 && (
                     <div className="mt-2">
                        <button 
                            onClick={isPlaying ? stopQueue : playQueue}
                            className="flex items-center gap-2 text-xs text-lime-300 bg-gray-700/50 px-3 py-1 rounded-full hover:bg-gray-700"
                        >
                            {isPlaying ? <Pause size={14} /> : <Play size={14} />}
                            <span>{isPlaying ? 'Berhenti' : 'Putar Suara'}</span>
                        </button>
                    </div>
                  )}
                </>
              ) : (
                <p>{msg.text}</p>
              )}
            </div>
          </div>
        ))}
        {isAiTyping && !isPlaying && (
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
            placeholder={getPlaceholderText()}
            className={`flex-1 bg-gray-800 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#A8FF00] resize-none overflow-y-hidden transition-all ${isListening ? 'placeholder:text-lime-400' : 'placeholder:text-gray-500'}`}
            rows={1}
            disabled={isAiTyping || isListening}
          />
          
          {isPlaying ? (
            <button type="button" onClick={stopQueue} className="bg-red-500 text-white rounded-full p-3 flex-shrink-0" title="Hentikan Suara">
              <Square size={18} />
            </button>
          ) : input.trim() ? (
            <button type="submit" className="bg-[#A8FF00] text-black rounded-full p-3 hover:bg-lime-400 transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed flex-shrink-0" disabled={isAiTyping}>
              <Send size={18} />
            </button>
          ) : (
            <button 
              type="button" 
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
