'use client';

// Hapus Link, ArrowRight, dan Lock karena tidak digunakan di sini
interface MissionCardProps {
  title: string;
  description: string;
  status: 'active' | 'completed' | 'locked';
  // Hapus prop 'href' karena tidak digunakan
}

export default function MissionCard({ title, description, status }: MissionCardProps) {
  const isCompleted = status === 'completed';

  const statusStyles = {
    active: 'border-l-4 border-l-[#A8FF00]',
    completed: 'border-l-4 border-l-gray-500 opacity-60',
    locked: 'border-l-4 border-l-red-500',
  };

  return (
    <div className="flex-grow">
      <div className={statusStyles[status]}>
        <div className="pl-4">
          <h3 className={`font-bold ${isCompleted ? 'line-through text-gray-400' : 'text-white'}`}>
            {title}
          </h3>
          <p className="text-xs text-gray-400 mt-1">{description}</p>
        </div>
      </div>
    </div>
  );
}
