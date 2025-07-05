'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { MessageSquare, Target, Shield, ArrowLeftRight } from 'lucide-react';

const navItems = [
  { href: '/dashboard', icon: MessageSquare, label: 'Mentor' },
  // Perbarui label di sini
  { href: '/cashflow', icon: ArrowLeftRight, label: 'Cash Intel' },
  { href: '/arsenal', icon: Shield, label: 'Arsenal' },
  { href: '/misi', icon: Target, label: 'Misi' },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 w-full bg-[#0A0A0A] border-t border-gray-800">
      <div className="flex justify-around max-w-4xl mx-auto">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link key={item.href} href={item.href} passHref>
              <div className={`flex flex-col items-center justify-center p-3 w-24 transition-all duration-200 ${isActive ? 'text-[#A8FF00]' : 'text-gray-500 hover:text-white'}`}>
                <item.icon size={24} />
                <span className="text-xs mt-1">{item.label}</span>
              </div>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
