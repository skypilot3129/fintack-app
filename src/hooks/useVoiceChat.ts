// src/hooks/useVoiceChat.ts
import { useState, useRef, useCallback } from 'react';

export function useVoiceChat(onTranscriptReady: (transcript: string) => void) {
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  const startListening = useCallback(() => {
    // PERBAIKAN: Tidak perlu lagi 'as any' karena tipe sudah dideklarasikan secara global
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("Maaf, browser Anda tidak mendukung fitur suara.");
      return;
    }

    if (!recognitionRef.current) {
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.lang = 'id-ID';
        recognition.interimResults = false;
        
        recognition.onresult = (event: SpeechRecognitionEvent) => {
            const transcript = event.results[0][0].transcript;
            onTranscriptReady(transcript);
        };

        recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
            if (event.error === 'no-speech') {
                console.warn('Speech recognition: Tidak ada suara terdeteksi.');
            } else {
                console.error('Speech recognition error:', event.error);
            }
        };
        
        recognition.onend = () => {
            setIsListening(false);
        };

        recognitionRef.current = recognition;
    }
    
    if (!isListening) {
        recognitionRef.current.start();
        setIsListening(true);
    }
  }, [isListening, onTranscriptReady]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  }, [isListening]);

  return { isListening, startListening, stopListening };
}
