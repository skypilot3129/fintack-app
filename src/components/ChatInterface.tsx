'use client';

import React, { useState, useEffect, useRef } from 'react';
import { User } from 'firebase/auth';
import { Send, Mic } from 'lucide-react';
import AiMessage from './AiMessage';
import { useVoiceChat } from '@/hooks/useVoiceChat';
import { useChatStore } from '@/stores/chatStore';

type ChatInterfaceProps = {
  user: User;
};

export default function ChatInterface({ user }: ChatInterfaceProps) {
  const { messages, isAiTyping, initializeChat, sendMessage, reset } = useChatStore();
  
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (user) {
      const unsubscribe = initializeChat(user.uid, user.displayName);
      return () => {
        unsubscribe();
        reset(); // Reset state saat user berubah/logout
      };
    }
  }, [user, initializeChat, reset]);

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

  const submitTextMessage = () => {
    if (input.trim()) {
      sendMessage(user.uid, input, 'text');
      setInput('');
    }
  };

  const submitVoiceMessage = (transcript: string) => {
    sendMessage(user.uid, transcript, 'voice');
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submitTextMessage();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleFormSubmit(e);
    }
  };

  const { isListening, startListening, stopListening } = useVoiceChat(submitVoiceMessage);

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
