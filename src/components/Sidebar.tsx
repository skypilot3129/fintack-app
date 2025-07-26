'use client';

import { User } from 'firebase/auth';
import UserProfileCard from './UserProfileCard';
import CommandCenter from './CommandCenter';
import BadgesDisplay from './BadgesDisplay';
import FinancialHealthScore from './FinancialHealthScore'; // <-- Impor komponen baru

interface SidebarProps {
  user: User;
}

export default function Sidebar({ user }: SidebarProps) {
  return (
    <aside className="w-full h-full flex flex-col space-y-6">
      <UserProfileCard user={user} />
      <FinancialHealthScore /> {/* <-- Letakkan di sini */}
      <CommandCenter />
      <BadgesDisplay />
    </aside>
  );
}
