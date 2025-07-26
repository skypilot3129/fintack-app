'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  signInWithPopup,
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  AuthError, // <-- Impor tipe AuthError
} from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import Button from '@/components/Button';

// Komponen Ikon Google
const GoogleIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 48 48">
    <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4C12.955 4 4 12.955 4 24s8.955 20 20 20s20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z" />
    <path fill="#FF3D00" d="M6.306 14.691c-1.229 1.996-1.996 4.312-1.996 6.836c0 2.524 0.767 4.84 2.023 6.861L12.012 21.6l-5.706-6.909z" />
    <path fill="#4CAF50" d="M24 48c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 39.056 26.715 40 24 40c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 43.477 16.227 48 24 48z" />
    <path fill="#1976D2" d="M43.611 20.083L48 20v-.001C48 8.954 39.045 0 28 0v0l-6 4.959c2.117-1.885 4.905-3.039 7.961-3.039c6.627 0 12 5.373 12 12c0 1.341-.138-2.65-.389-3.917z" />
  </svg>
);

export default function LoginPage() {
  const router = useRouter();
  const [isRegister, setIsRegister] = useState(false);
  
  // State untuk form
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginIdentifier, setLoginIdentifier] = useState('');

  const [isLoading, setIsLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      
      const userDocRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);
      
      if (!userDoc.exists()) {
        await setDoc(userDocRef, {
          uid: user.uid,
          displayName: user.displayName,
          email: user.email,
          createdAt: serverTimestamp(),
          xp: 0,
          hasCompletedOnboarding: false,
        });
      }
      toast.success('Berhasil masuk!');
      router.push('/dashboard');
    } catch (error) {
      toast.error('Gagal masuk dengan Google.');
      console.error("Google Sign-In Error:", error); // Gunakan variabel 'error'
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !username) {
      return toast.error('Semua kolom wajib diisi.');
    }
    if (username.includes('@')) {
        return toast.error('Username tidak boleh mengandung karakter "@".');
    }
    setIsLoading(true);
    
    const usernameRef = doc(db, 'usernames', username.toLowerCase());
    const usernameDoc = await getDoc(usernameRef);
    if (usernameDoc.exists()) {
      toast.error('Username sudah digunakan, coba yang lain.');
      setIsLoading(false);
      return;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      await updateProfile(user, { displayName: username });

      const userDocRef = doc(db, 'users', user.uid);
      await setDoc(userDocRef, {
        uid: user.uid,
        displayName: username,
        email: user.email,
        createdAt: serverTimestamp(),
        xp: 0,
        hasCompletedOnboarding: false,
      });
      await setDoc(usernameRef, { uid: user.uid, email: user.email });

      toast.success('Registrasi berhasil!');
      router.push('/dashboard');

    } catch (error) {
      const authError = error as AuthError; // Gunakan tipe AuthError
      if (authError.code === 'auth/email-already-in-use') {
        toast.error('Email sudah terdaftar.');
      } else if (authError.code === 'auth/weak-password') {
        toast.error('Password minimal 6 karakter.');
      } else {
        toast.error('Registrasi gagal, coba lagi.');
      }
      console.error("Register Error:", authError);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginIdentifier || !password) {
      return toast.error('Semua kolom wajib diisi.');
    }
    setIsLoading(true);

    let finalEmail = loginIdentifier;

    if (!loginIdentifier.includes('@')) {
      const usernameRef = doc(db, 'usernames', loginIdentifier.toLowerCase());
      try {
        const usernameDoc = await getDoc(usernameRef);
        if (usernameDoc.exists()) {
          finalEmail = usernameDoc.data().email;
        } else {
          toast.error('Username tidak ditemukan.');
          setIsLoading(false);
          return;
        }
      } catch (error) {
        toast.error('Gagal memverifikasi username.');
        console.error("Username lookup error:", error);
        setIsLoading(false);
        return;
      }
    }
    
    try {
      await signInWithEmailAndPassword(auth, finalEmail, password);
      toast.success('Berhasil masuk!');
      router.push('/dashboard');
    } catch (error) {
      const authError = error as AuthError; // Gunakan tipe AuthError
      if (authError.code === 'auth/user-not-found' || authError.code === 'auth/wrong-password' || authError.code === 'auth/invalid-credential') {
        toast.error('Email/Username atau password salah.');
      } else {
        toast.error('Login gagal, coba lagi.');
      }
      console.error("Login Error:", authError);
    } finally {
      setIsLoading(false);
    }
  };


  const formVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 },
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0A0A0A] p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-black text-white">Fintack</h1>
          <p className="text-gray-400">Ambil alih kendali keuanganmu.</p>
        </div>

        <div className="bg-[#121212] p-8 rounded-lg border border-gray-800">
          <AnimatePresence mode="wait">
            {isRegister ? (
              // --- FORM REGISTRASI ---
              <motion.form
                key="register"
                variants={formVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                onSubmit={handleRegister}
                className="space-y-4"
              >
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email"
                  className="input-style w-full"
                  disabled={isLoading}
                />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Username (tanpa @)"
                  className="input-style w-full"
                  disabled={isLoading}
                />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  className="input-style w-full"
                  disabled={isLoading}
                />
                <Button type="submit" disabled={isLoading} className="w-full">
                  {isLoading ? 'Mendaftar...' : 'Daftar'}
                </Button>
              </motion.form>
            ) : (
              // --- FORM LOGIN ---
              <motion.form
                key="login"
                variants={formVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                onSubmit={handleLogin}
                className="space-y-4"
              >
                <input
                  type="text"
                  value={loginIdentifier}
                  onChange={(e) => setLoginIdentifier(e.target.value)}
                  placeholder="Email atau Username"
                  className="input-style w-full"
                  disabled={isLoading}
                />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  className="input-style w-full"
                  disabled={isLoading}
                />
                <Button type="submit" disabled={isLoading} className="w-full">
                  {isLoading ? 'Masuk...' : 'Masuk'}
                </Button>
              </motion.form>
            )}
          </AnimatePresence>

          <div className="mt-6 text-center">
            <button onClick={() => setIsRegister(!isRegister)} className="text-sm text-gray-400 hover:text-white">
              {isRegister ? 'Sudah punya akun? Masuk' : 'Belum punya akun? Daftar'}
            </button>
          </div>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-700"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="bg-[#121212] px-2 text-gray-500">ATAU</span>
            </div>
          </div>
          
          <button
            onClick={handleGoogleSignIn}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-gray-800 hover:bg-gray-700 text-white font-semibold rounded-lg transition-colors duration-300 disabled:bg-gray-600"
          >
            <GoogleIcon />
            Lanjutkan dengan Google
          </button>
        </div>
      </div>
    </div>
  );
}
