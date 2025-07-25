'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { MessageSquare, Target, Shield, Wallet } from 'lucide-react';
import { motion } from 'framer-motion';

const navItems = [
  { href: '/dashboard', icon: MessageSquare, label: 'Mentor' },
  { href: '/cashflow', icon: Wallet, label: 'Catatan Uang' },
  { href: '/arsenal', icon: Shield, label: 'Kekayaan Bersih' },
  { href: '/misi', icon: Target, label: 'Misi' },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 w-full bg-[#0A0A0A] border-t border-gray-800 z-30">
      <div className="flex justify-around max-w-4xl mx-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
          
          return (
            <Link key={item.href} href={item.href} passHref>
              <motion.div 
                className={`relative flex flex-col items-center justify-center p-3 w-full sm:w-24 transition-colors duration-200 group ${isActive ? 'text-[#A8FF00]' : 'text-gray-500 hover:text-white'}`}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
              >
                <item.icon size={24} />
                {/* PERBAIKAN: Label disembunyikan di mobile, muncul di desktop */}
                <span className="text-xs mt-1 font-medium hidden sm:inline">{item.label}</span>
                
                {/* Tooltip untuk mobile */}
                <div className="sm:hidden absolute bottom-full mb-2 px-2 py-1 text-xs text-white bg-gray-800 rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                  {item.label}
                </div>
              </motion.div>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
