// src/components/Sidebar.tsx
'use client';

import { User } from 'firebase/auth';
import UserProfileCard from './UserProfileCard';
import CommandCenter from './CommandCenter';

interface SidebarProps {
  user: User;
}

export default function Sidebar({ user }: SidebarProps) {
  return (
    <aside className="w-full h-full flex flex-col space-y-6">
      <UserProfileCard user={user} />
      <CommandCenter />
    </aside>
  );
}
