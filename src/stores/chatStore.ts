import { create } from 'zustand';
import { Content, Part } from '@/types/gemini';
import {
  getFirestore,
  collection,
  query,
  onSnapshot,
  orderBy,
  addDoc,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from '@/lib/firebase';

// Tipe untuk pesan di UI
type Message = {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  audioUrls?: string[] | null;
};

// --- INTERFACE BARU UNTUK STRUKTUR DATA DI FIRESTORE ---
interface ChatHistoryDoc {
    id: string;
    role: 'user' | 'model';
    parts: Part[];
    createdAt: Timestamp;
    audioUrls?: string[] | null;
}

// Tipe untuk state di dalam store
interface ChatState {
  messages: Message[];
  geminiHistory: Content[];
  isAiTyping: boolean;
  isInitialized: boolean;
  initializeChat: (uid: string, displayName: string | null) => () => void;
  sendMessage: (uid: string, messageText: string, inputType: 'text' | 'voice') => Promise<void>;
  reset: () => void;
}

const db = getFirestore(app);

export const useChatStore = create<ChatState>((set, get) => ({
  messages: [],
  geminiHistory: [],
  isAiTyping: false,
  isInitialized: false,

  initializeChat: (uid, displayName) => {
    if (get().isInitialized) return () => {};

    set({ isInitialized: true });
    const chatHistoryColRef = collection(db, 'users', uid, 'chatHistory');
    const q = query(chatHistoryColRef, orderBy('createdAt', 'asc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (snapshot.empty) {
        set({
          messages: [{ 
            id: 'welcome-message',
            text: `Selamat datang di Fintack, ${displayName || 'Pilot'}. Apa masalah keuangan terbesar lo sekarang? Langsung ke intinya! 🔥`, 
            sender: 'ai' 
          }],
        });
        return;
      }

      // --- PERBAIKAN DI SINI: Gunakan 'as' untuk memberi tahu TypeScript tipe datanya ---
      const historyFromDb = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as ChatHistoryDoc);
      
      const uiMessages: Message[] = historyFromDb.map(msg => ({
        id: msg.id,
        text: msg.parts[0].text,
        sender: msg.role === 'user' ? 'user' : 'ai',
        audioUrls: msg.audioUrls || null,
      }));
      const apiHistory: Content[] = historyFromDb.map(msg => ({
          role: msg.role,
          parts: msg.parts,
      }));
      
      set({ messages: uiMessages, geminiHistory: apiHistory });
    });

    return unsubscribe;
  },

  sendMessage: async (uid, messageText, inputType) => {
    if (messageText.trim() === '' || get().isAiTyping) return;

    addDoc(collection(db, 'users', uid, 'chatHistory'), {
        role: 'user',
        parts: [{ text: messageText }],
        createdAt: serverTimestamp(),
    });

    set({ isAiTyping: true });

    try {
        const functions = getFunctions();
        const askMentorAI = httpsCallable(functions, 'askMentorAI');
        
        const result = await askMentorAI({ 
            prompt: messageText, 
            history: get().geminiHistory,
            inputType: inputType 
        });
        
        const { textResponse, audioUrls } = result.data as { textResponse: string; audioUrls?: string[] | null };

        await addDoc(collection(db, 'users', uid, 'chatHistory'), {
            role: 'model',
            parts: [{ text: textResponse }],
            createdAt: serverTimestamp(),
            audioUrls: audioUrls || null, 
        });

    } catch (error) {
        console.error("Error calling cloud function:", error);
        await addDoc(collection(db, 'users', uid, 'chatHistory'), {
            role: 'model',
            parts: [{ text: "Gagal menghubungi mentor. Coba lagi nanti." }],
            createdAt: serverTimestamp(),
        });
    } finally {
        set({ isAiTyping: false });
    }
  },
  
  reset: () => {
    set({
      messages: [],
      geminiHistory: [],
      isAiTyping: false,
      isInitialized: false,
    });
  },
}));
