'use client';

import { useState, useCallback, useEffect } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { X, UploadCloud, Camera } from 'lucide-react';
import Button from './Button';
import { getFunctions, httpsCallable } from 'firebase/functions';
import toast from 'react-hot-toast';

// Tipe data yang jelas
interface ScannedData {
  amount: number;
  description: string;
  category: string;
}

interface ScanReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanComplete: (data: ScannedData) => void;
}

// Fungsi untuk mengubah file menjadi base64
const toBase64 = (file: File): Promise<string> => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = error => reject(error);
});

export default function ScanReceiptModal({ isOpen, onClose, onScanComplete }: ScanReceiptModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      if (preview) {
        URL.revokeObjectURL(preview);
      }
      setPreview(URL.createObjectURL(selectedFile));
    }
  };

  const handleScan = async () => {
    if (!file) {
      return toast.error("Pilih gambar struk dulu, Bro!");
    }
    setIsLoading(true);
    const toastId = toast.loading("Mas Eugene lagi baca struknya...");

    try {
      const imageB64 = await toBase64(file);
      const functions = getFunctions();
      const scanReceipt = httpsCallable(functions, 'scanReceipt');
      
      const result = await scanReceipt({
        imageB64: imageB64,
        mimeType: file.type,
      });

      const { data } = result.data as { success: boolean, data: ScannedData };
      toast.success("Struk berhasil dibaca!", { id: toastId });
      onScanComplete(data);
    } catch (error: unknown) { // <-- PERBAIKAN DI SINI
      console.error("Error scanning receipt:", error);
      let errorMessage = "Gagal membaca struk. Coba foto lebih jelas.";
      // Cek apakah error adalah instance dari Error untuk akses .message yang aman
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      toast.error(errorMessage, { id: toastId });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleClose = useCallback(() => {
    setFile(null);
    if (preview) {
      URL.revokeObjectURL(preview);
    }
    setPreview(null);
    onClose();
  }, [preview, onClose]);

  useEffect(() => {
    if (!isOpen) {
        handleClose();
    }
  }, [isOpen, handleClose]);


  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/70 z-50 flex justify-center items-center p-4"
          onClick={handleClose}
        >
          <motion.div
            initial={{ scale: 0.95, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.95, y: 20 }}
            className="bg-[#18181B] border border-gray-700 rounded-lg w-full max-w-md m-4 relative"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-white flex items-center gap-2"><Camera size={20}/> Scan Struk Belanja</h3>
                <button onClick={handleClose} className="text-gray-500 hover:text-white"><X size={20} /></button>
              </div>
              
              <div className="space-y-4">
                <label htmlFor="dropzone-file" className="flex flex-col items-center justify-center w-full h-48 border-2 border-gray-600 border-dashed rounded-lg cursor-pointer bg-gray-800/50 hover:bg-gray-800">
                  <div className="relative w-full h-full flex flex-col items-center justify-center">
                    {preview ? (
                        <Image src={preview} alt="Preview Struk" layout="fill" objectFit="contain" className="rounded-lg p-1" />
                    ) : (
                        <>
                            <UploadCloud className="w-10 h-10 mb-4 text-gray-400" />
                            <p className="mb-2 text-sm text-gray-400"><span className="font-semibold">Klik untuk memilih</span></p>
                            <p className="text-xs text-gray-500">PNG atau JPG</p>
                        </>
                    )}
                  </div>
                  <input id="dropzone-file" type="file" className="hidden" onChange={handleFileChange} accept="image/png, image/jpeg" />
                </label>

                <Button onClick={handleScan} disabled={isLoading || !file} className="w-full">
                  {isLoading ? 'Memindai...' : 'Scan & Catat Transaksi'}
                </Button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}