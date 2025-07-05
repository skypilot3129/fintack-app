'use client';

import Link from 'next/link';
import { ArrowRight, Lock } from 'lucide-react';

interface MissionCardProps {
  title: string;
  description: string;
  status: 'active' | 'completed' | 'locked';
  href: string; // <-- Prop 'href' dikembalikan
}

export default function MissionCard({ title, description, status, href }: MissionCardProps) {
  const isLocked = status === 'locked';
  const isCompleted = status === 'completed';

  const cardContent = (
    <>
      <div className="flex-grow">
        <div className={`border-l-4 ${isCompleted ? 'border-l-gray-500' : 'border-l-[#A8FF00]'}`}>
          <div className="pl-4">
            <h3 className={`font-bold ${isCompleted ? 'line-through text-gray-400' : 'text-white'}`}>
              {title}
            </h3>
            <p className="text-xs text-gray-400 mt-1">{description}</p>
          </div>
        </div>
      </div>
      <div className="flex-shrink-0">
        {isLocked ? <Lock size={20} className="text-red-500" /> : <ArrowRight size={20} />}
      </div>
    </>
  );

  if (isLocked || href === '#') {
    return (
      <div className={`flex justify-between items-center w-full ${isLocked ? 'opacity-50 cursor-not-allowed' : ''}`}>
        {cardContent}
      </div>
    );
  }

  return (
    <Link href={href} className="flex justify-between items-center w-full">
      {cardContent}
    </Link>
  );
}
