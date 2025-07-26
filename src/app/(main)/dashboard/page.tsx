'use client';

import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, User, PanelLeftClose, PanelLeftOpen } from 'lucide-react';

import ChatInterface from '@/components/ChatInterface';
import Sidebar from '@/components/Sidebar';
import UserProfileCardSkeleton from '@/components/UserProfileCardSkeleton';
import { useMediaQuery } from '@/hooks/useMediaQuery';

// Tipe data yang jelas untuk props TabButton
interface TabButtonProps {
    label: string;
    icon: React.ElementType;
    isActive: boolean;
    onClick: () => void;
}

const TabButton = ({ label, icon: Icon, isActive, onClick }: TabButtonProps) => (
    <button
        onClick={onClick}
        className={`relative w-full flex flex-col items-center justify-center p-2 transition-colors duration-200 ${isActive ? 'text-[#A8FF00]' : 'text-gray-500 hover:text-white'}`}
    >
        <Icon size={24} />
        <span className="text-xs mt-1 font-medium">{label}</span>
        {isActive && (
            <motion.div
                className="absolute bottom-0 h-0.5 w-1/2 bg-[#A8FF00]"
                layoutId="underline"
            />
        )}
    </button>
);


export default function DashboardPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  // State untuk layout
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<'chat' | 'status'>('chat');

  // Deteksi ukuran layar
  const isDesktop = useMediaQuery('(min-width: 1024px)');

  if (loading) {
    return (
      <main className="min-h-screen bg-[#0A0A0A] p-4 md:p-6 lg:p-8 pb-24">
        <div className="max-w-7xl mx-auto"><UserProfileCardSkeleton /></div>
      </main>
    );
  }

  if (!user) {
    router.replace('/login');
    return null; 
  }

  return (
    <main className="min-h-screen bg-[#0A0A0A] pb-24 lg:pb-8">
      {isDesktop ? (
        // --- TAMPILAN DESKTOP ---
        <div className="flex h-screen">
          <AnimatePresence>
            {isSidebarOpen && (
              <motion.div
                initial={{ width: 0, opacity: 0, padding: 0 }}
                animate={{ width: 384, opacity: 1, padding: '1.5rem' }} // 384px = w-96, p-6
                exit={{ width: 0, opacity: 0, padding: 0 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
                className="flex-shrink-0 h-full overflow-y-auto"
              >
                <Sidebar user={user} />
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex-1 flex flex-col p-6 h-screen relative">
             <button
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="absolute top-4 left-4 z-10 p-2 text-gray-400 hover:text-white transition-colors lg:bg-[#121212] rounded-full"
                title={isSidebarOpen ? "Tutup Sidebar" : "Buka Sidebar"}
             >
                {isSidebarOpen ? <PanelLeftClose size={20} /> : <PanelLeftOpen size={20} />}
             </button>
             <div className="w-full h-full">
              <ChatInterface user={user} />
             </div>
          </div>
        </div>
      ) : (
        // --- TAMPILAN MOBILE ---
        <div>
          {/* Tab Navigation */}
          <div className="sticky top-0 z-10 bg-[#0A0A0A] border-b border-gray-800">
             <div className="flex justify-around max-w-md mx-auto relative">
                <TabButton label="Chat" icon={MessageSquare} isActive={activeTab === 'chat'} onClick={() => setActiveTab('chat')} />
                <TabButton label="Status" icon={User} isActive={activeTab === 'status'} onClick={() => setActiveTab('status')} />
             </div>
          </div>

          {/* Konten Tab */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="p-4"
            >
              {activeTab === 'chat' ? (
                <div className="h-[calc(100vh-135px)]">
                    <ChatInterface user={user} />
                </div>
              ) : (
                <Sidebar user={user} />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      )}
    </main>
  );
}
