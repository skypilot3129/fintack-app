'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase';
import { collection, query, onSnapshot, orderBy, doc, updateDoc, Timestamp } from 'firebase/firestore';
import { Bell, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';

interface Insight {
    id: string;
    text: string;
    isRead: boolean;
    createdAt: Timestamp;
}

export default function InsightBell() {
    const { user } = useAuth();
    const [insights, setInsights] = useState<Insight[]>([]);
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        if (!user) return;

        const insightsQuery = query(collection(db, `users/${user.uid}/insights`), orderBy('createdAt', 'desc'));
        const unsubscribe = onSnapshot(insightsQuery, (snapshot) => {
            setInsights(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Insight)));
        });

        return () => unsubscribe();
    }, [user]);

    const unreadCount = insights.filter(insight => !insight.isRead).length;

    const handleOpen = async () => {
        setIsOpen(true);
        // Tandai semua insight sebagai sudah dibaca saat modal dibuka
        for (const insight of insights) {
            if (!insight.isRead) {
                const insightRef = doc(db, `users/${user.uid}/insights`, insight.id);
                await updateDoc(insightRef, { isRead: true });
            }
        }
    };

    return (
        <div>
            <button onClick={handleOpen} className="relative p-2 text-gray-400 rounded-full hover:bg-gray-700 hover:text-white transition-colors">
                <Bell size={20} />
                {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                    </span>
                )}
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/70 z-40 flex justify-center items-center p-4"
                        onClick={() => setIsOpen(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.95, y: 20 }}
                            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                            className="bg-[#18181B] border border-gray-700 shadow-2xl shadow-lime-500/10 rounded-lg w-full max-w-md m-4 p-6 relative"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-lg font-bold text-white">Laporan Intel Terbaru</h3>
                                <button onClick={() => setIsOpen(false)} className="text-gray-500 hover:text-white"><X size={20} /></button>
                            </div>
                            
                            <div className="max-h-[60vh] overflow-y-auto space-y-4 pr-2">
                                {insights.length === 0 ? (
                                    <div className="text-center py-10">
                                        <p className="text-gray-500">Belum ada laporan dari mentor.</p>
                                        <p className="text-xs text-gray-600 mt-1">Laporan akan dibuat otomatis oleh AI.</p>
                                    </div>
                                ) : (
                                    insights.map(insight => (
                                        <div key={insight.id} className="p-4 bg-gray-800/50 border border-gray-700 rounded-lg">
                                            <div className="prose prose-sm prose-invert max-w-none text-gray-300">
                                                <ReactMarkdown>{insight.text}</ReactMarkdown>
                                            </div>
                                            <p className="text-xs text-gray-500 mt-3 text-right">{insight.createdAt.toDate().toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
                                        </div>
                                    ))
                                )}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}