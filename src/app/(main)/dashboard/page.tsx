// app/(main)/dashboard/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import ChatInterface from '@/components/ChatInterface';
import TourHighlight from '@/components/TourHighlight';
import Sidebar from '@/components/Sidebar'; // <-- Komponen baru
import { motion, AnimatePresence } from 'framer-motion';
import { Info, MessageSquare, PanelRightClose, PanelRightOpen } from 'lucide-react';

export default function DashboardPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  
  // State baru untuk mengontrol tab di mobile
  const [activeTab, setActiveTab] = useState<'chat' | 'status'>('chat');

  useEffect(() => {
    if (!loading && !user) {
      router.push('/');
    }
  }, [user, loading, router]);

  if (loading || !user) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#0A0A0A] text-white">
        <p>Memuat data...</p>
      </div>
    );
  }

  return (
    <TourHighlight
      tourId="dashboard"
      title="Selamat Datang di Dasbor!"
      description="Ini adalah pusat komandomu. Di sebelah kanan (desktop) atau di tab 'Status' (mobile) adalah panel intelijenmu, dan di sini adalah tempatmu berkonsultasi langsung dengan Mas Eugene."
    >
      <main className="h-screen flex flex-col bg-[#0A0A0A] text-white overflow-hidden">
        
        {/* Kontainer Utama */}
        <div className="flex-grow flex flex-col lg:grid lg:grid-cols-12 lg:gap-6 p-4 md:p-6 lg:p-8 pb-24 min-h-0">
          
          {/* Tampilan Desktop */}
          <motion.div 
            className="hidden lg:block relative lg:col-span-8 h-full min-h-0"
            layout
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          >
            <ChatInterface user={user} />
          </motion.div>
          <AnimatePresence>
            {isSidebarOpen && (
              <motion.div
                className="hidden lg:block col-span-4 h-full"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 50, transition: { duration: 0.2 } }}
                transition={{ duration: 0.3, ease: 'easeInOut' }}
              >
                <Sidebar user={user} />
              </motion.div>
            )}
          </AnimatePresence>
          
          {/* Tampilan Mobile dengan Tab */}
          <div className="lg:hidden flex flex-col h-full">
            {/* Navigasi Tab */}
            <div className="flex-shrink-0 border-b border-gray-800 mb-4">
              <div className="flex justify-around">
                <button onClick={() => setActiveTab('chat')} className={`w-full py-3 text-sm font-bold flex items-center justify-center gap-2 ${activeTab === 'chat' ? 'text-[#A8FF00] border-b-2 border-[#A8FF00]' : 'text-gray-500'}`}>
                  <MessageSquare size={16} /> Chat
                </button>
                <button onClick={() => setActiveTab('status')} className={`w-full py-3 text-sm font-bold flex items-center justify-center gap-2 ${activeTab === 'status' ? 'text-[#A8FF00] border-b-2 border-[#A8FF00]' : 'text-gray-500'}`}>
                  <Info size={16} /> Status
                </button>
              </div>
            </div>
            
            {/* Konten Tab */}
            <div className="flex-grow min-h-0">
              {activeTab === 'chat' ? (
                <ChatInterface user={user} />
              ) : (
                <div className="space-y-4">
                  <Sidebar user={user} />
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Tombol Toggle Sidebar (hanya untuk Desktop) */}
        <button 
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="hidden lg:block fixed top-5 right-5 z-40 p-2 text-gray-500 hover:text-white bg-gray-800/50 rounded-full transition-colors"
          title={isSidebarOpen ? "Sembunyikan Panel" : "Tampilkan Panel"}
        >
          {isSidebarOpen ? <PanelRightClose size={18} /> : <PanelRightOpen size={18} />}
        </button>
      </main>
    </TourHighlight>
  );
}
