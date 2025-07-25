'use client';

import { useState } from 'react';
import { useAdmin } from '@/hooks/useAdmin';
import { getStorage, ref, uploadBytesResumable } from 'firebase/storage';
import { app } from '@/lib/firebase';
import { UploadCloud } from 'lucide-react';
import Button from '@/components/Button';
import toast from 'react-hot-toast';

export default function AdminMemoryPage() {
  const { isAdmin, loading: adminLoading } = useAdmin();
  const [file, setFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = () => {
    if (!file) {
      toast.error("Pilih file terlebih dahulu.");
      return;
    }

    const storage = getStorage(app);
    // File diunggah ke folder 'knowledge-uploads/' yang akan memicu Cloud Function
    const storageRef = ref(storage, `knowledge-uploads/${Date.now()}_${file.name}`);
    const uploadTask = uploadBytesResumable(storageRef, file);

    uploadTask.on('state_changed',
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        setUploadProgress(progress);
      },
      (error) => {
        console.error("Upload failed:", error);
        toast.error("Upload gagal. Cek console untuk detail.");
        setUploadProgress(null);
      },
      () => {
        toast.success(`File "${file.name}" berhasil diunggah! AI akan memprosesnya dalam beberapa menit.`);
        setUploadProgress(null);
        setFile(null);
      }
    );
  };

  if (adminLoading) {
    return <div className="flex h-screen items-center justify-center bg-[#0A0A0A] text-white">Memeriksa hak akses...</div>;
  }

  if (!isAdmin) {
    return <div className="flex h-screen items-center justify-center bg-[#0A0A0A] text-white">Akses Ditolak. Halaman ini hanya untuk admin.</div>;
  }

  return (
    <main className="p-8 bg-[#0A0A0A] text-white min-h-screen">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-black text-center uppercase text-[#A8FF00]">Memori Otak AI</h1>
        <p className="text-center text-gray-400 mt-2">Unggah file (.txt atau .pdf) berisi pengetahuan baru untuk Mentor AI.</p>

        <div className="mt-10">
          <div className="flex items-center justify-center w-full">
            <label htmlFor="dropzone-file" className="flex flex-col items-center justify-center w-full h-64 border-2 border-gray-600 border-dashed rounded-lg cursor-pointer bg-[#121212] hover:bg-gray-800">
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <UploadCloud className="w-10 h-10 mb-4 text-gray-400" />
                {file ? (
                  <>
                    <p className="mb-2 text-sm text-lime-400"><span className="font-semibold">{file.name}</span></p>
                    <p className="text-xs text-gray-500">{(file.size / 1024).toFixed(2)} KB</p>
                  </>
                ) : (
                  <>
                    <p className="mb-2 text-sm text-gray-400"><span className="font-semibold">Klik untuk memilih</span> atau seret file ke sini</p>
                    <p className="text-xs text-gray-500">TXT atau PDF (MAX. 5MB)</p>
                  </>
                )}
              </div>
              <input id="dropzone-file" type="file" className="hidden" onChange={handleFileChange} accept=".pdf,.txt" />
            </label>
          </div> 
        </div>

        {uploadProgress !== null && (
          <div className="mt-4 w-full bg-gray-700 rounded-full h-2.5">
            <div className="bg-[#A8FF00] h-2.5 rounded-full" style={{ width: `${uploadProgress}%` }}></div>
          </div>
        )}

        <div className="mt-6">
          <Button onClick={handleUpload} disabled={!file || uploadProgress !== null}>
            {uploadProgress !== null ? `Mengunggah... ${uploadProgress.toFixed(0)}%` : "Ajarkan AI Sekarang"}
          </Button>
        </div>

      </div>
    </main>
  );
}
