// app/layout.tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthContextProvider } from "@/context/AuthContext";
import AppGate from "@/components/AppGate";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Fintack",
  description: "Bangun Kekayaanmu. Bukan Cuma Tabunganmu.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // Menambahkan suppressHydrationWarning adalah praktik terbaik
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body className={`${inter.className} bg-black text-white`}>
        <AuthContextProvider>
          {/* AppGate sekarang berfungsi sebagai overlay di atas segalanya */}
          <AppGate />
          {/* Konten utama ({children}) selalu dirender di server dan klien */}
          {children}
        </AuthContextProvider>
      </body>
    </html>
  );
}
