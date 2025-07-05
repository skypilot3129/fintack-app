// app/(main)/layout.tsx
import BottomNav from '@/components/BottomNav';
import { Toaster } from 'react-hot-toast';

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // 1. Buat div terluar mengisi seluruh layar dan menjadi flex container
    <div className="h-screen flex flex-col">
      <Toaster 
        position="top-center"
        toastOptions={{
          style: {
            background: '#333',
            color: '#fff',
          },
        }}
      />
      
      {/* 2. Jadikan area konten utama fleksibel dan bisa di-scroll */}
      <main className="flex-grow overflow-y-auto">
        {children}
      </main>
      
      {/* 3. BottomNav akan menempel di bawah tanpa mengganggu konten */}
      <div className="flex-shrink-0">
        <BottomNav />
      </div>
    </div>
  );
}
