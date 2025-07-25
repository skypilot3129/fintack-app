// src/components/UserProfileCardSkeleton.tsx
export default function UserProfileCardSkeleton() {
  return (
    <div className="bg-[#121212] p-4 rounded-lg border border-gray-800 animate-pulse">
      <div className="flex justify-between items-start">
        <div>
          <div className="h-6 w-48 bg-gray-700 rounded mb-2"></div>
          <div className="h-4 w-32 bg-gray-700 rounded"></div>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-gray-700 rounded-full"></div>
          <div className="w-8 h-8 bg-gray-700 rounded-full"></div>
        </div>
      </div>
      <div className="mt-4">
        <div className="flex justify-between h-4 bg-gray-700 rounded mb-1"></div>
        <div className="w-full bg-gray-700 rounded-full h-2.5"></div>
      </div>
    </div>
  );
}
