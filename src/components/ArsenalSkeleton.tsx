// src/components/ArsenalSkeleton.tsx
const SkeletonList = () => (
  <div className="mt-4 space-y-2">
    <div className="h-10 bg-gray-800 rounded"></div>
    <div className="h-10 bg-gray-800 rounded"></div>
    <div className="h-10 bg-gray-800 rounded"></div>
  </div>
);

export default function ArsenalSkeleton() {
  return (
    <main className="p-4 md:p-6 lg:p-8 bg-[#0A0A0A] pb-28 text-white animate-pulse">
      <div className="max-w-4xl mx-auto">
        <div className="h-8 w-3/4 mx-auto bg-gray-700 rounded"></div>
        <div className="h-5 w-1/2 mx-auto bg-gray-700 rounded mt-3"></div>
        
        <div className="mt-8 p-4 bg-[#121212] rounded-lg border border-gray-800 text-center max-w-md mx-auto">
          <div className="h-4 w-1/3 mx-auto bg-gray-700 rounded"></div>
          <div className="h-10 w-2/3 mx-auto bg-gray-700 rounded mt-2"></div>
        </div>

        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-[#121212] p-6 rounded-lg border border-gray-800">
            <div className="h-6 w-1/4 bg-green-400/50 rounded"></div>
            <div className="h-10 bg-gray-800 rounded mt-4"></div>
            <div className="h-10 bg-gray-800 rounded mt-2"></div>
            <div className="h-10 bg-gray-700 rounded mt-4"></div>
            <SkeletonList />
          </div>
          <div className="bg-[#121212] p-6 rounded-lg border border-gray-800">
            <div className="h-6 w-1/4 bg-red-400/50 rounded"></div>
            <div className="h-10 bg-gray-800 rounded mt-4"></div>
            <div className="h-10 bg-gray-800 rounded mt-2"></div>
            <div className="h-10 bg-gray-700 rounded mt-4"></div>
            <SkeletonList />
          </div>
        </div>
      </div>
    </main>
  );
}
