// src/components/TransactionListSkeleton.tsx
const SkeletonItem = () => (
  <div className="flex justify-between items-center bg-[#121212] p-3 rounded-lg border border-gray-800 animate-pulse">
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 rounded-full bg-gray-700"></div>
      <div>
        <div className="h-4 w-32 bg-gray-700 rounded mb-2"></div>
        <div className="h-3 w-24 bg-gray-700 rounded"></div>
      </div>
    </div>
    <div className="h-6 w-20 bg-gray-700 rounded"></div>
  </div>
);

export default function TransactionListSkeleton() {
  return (
    <div className="space-y-3 mt-6">
      <SkeletonItem />
      <SkeletonItem />
      <SkeletonItem />
    </div>
  );
}
