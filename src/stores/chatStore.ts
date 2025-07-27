import { create } from 'zustand';
import { Content } from '@/types/gemini';
import {
  getFirestore,
  collection,
  query,
  onSnapshot,
  orderBy,
  addDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from '@/lib/firebase';

// Tipe untuk pesan di UI, tambahkan audioUrls
type Message = {
  text: string;
  sender: 'user' | 'ai';
  audioUrls?: string[] | null;
};

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
    // Cegah inisialisasi ganda
    if (get().isInitialized) return () => {};

    set({ isInitialized: true });
    const chatHistoryColRef = collection(db, 'users', uid, 'chatHistory');
    const q = query(chatHistoryColRef, orderBy('createdAt', 'asc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (snapshot.empty) {
        set({
          messages: [{ 
            text: `Selamat datang di Fintack, ${displayName || 'Pilot'}. Apa masalah keuangan terbesar lo sekarang? Langsung ke intinya! 🔥`, 
            sender: 'ai' 
          }],
        });
        return;
      }

      const historyFromDb = snapshot.docs.map(doc => doc.data());
      const uiMessages: Message[] = historyFromDb.map(msg => ({
        text: msg.parts[0].text,
        sender: msg.role === 'user' ? 'user' : 'ai',
        // Tambahkan audioUrls jika ada (meskipun data lama tidak akan punya)
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

    // Tambahkan pesan pengguna ke UI secara optimis
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

        // Simpan respons AI lengkap ke Firestore
        await addDoc(collection(db, 'users', uid, 'chatHistory'), {
            role: 'model',
            parts: [{ text: textResponse }],
            createdAt: serverTimestamp(),
            // Simpan juga audioUrls agar bisa diputar lagi jika user me-reload
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
