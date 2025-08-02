'use client';

import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useState } from 'react';
import { ArrowRight, Check, ChevronDown, MessageSquare, Shield, Target, Wallet } from 'lucide-react';

// Komponen-komponen kecil untuk Landing Page
const NavLink = ({ href, children }: { href: string; children: React.ReactNode }) => (
  <a href={href} className="text-gray-400 hover:text-white transition-colors duration-300">
    {children}
  </a>
);

const FeatureCard = ({ icon: Icon, title, children }: { icon: React.ElementType; title: string; children: React.ReactNode }) => (
  <div className="bg-[#121212] p-6 rounded-lg border border-gray-800 transform hover:-translate-y-1 transition-transform duration-300">
    <div className="bg-[#A8FF00]/10 p-3 rounded-full w-max mb-4">
      <Icon className="text-[#A8FF00]" size={24} />
    </div>
    <h3 className="text-xl font-bold mb-2">{title}</h3>
    <p className="text-gray-400">{children}</p>
  </div>
);

const TestimonialCard = ({ name, role, children }: { name: string; role: string; children: React.ReactNode }) => (
    <div className="bg-[#121212] p-6 rounded-lg border border-gray-800">
        <p className="text-gray-300 italic">&quot;{children}&quot;</p>
        <div className="mt-4">
            <p className="font-bold text-white">{name}</p>
            <p className="text-sm text-gray-500">{role}</p>
        </div>
    </div>
);

const PricingTier = ({ title, price, description, features, buttonText, isRecommended, onClick }: { title: string; price: string; description: string; features: { text: string; included: boolean }[]; buttonText: string; isRecommended?: boolean; onClick?: () => void; }) => (
    <div className={`border rounded-lg p-6 flex flex-col ${isRecommended ? 'border-[#A8FF00]' : 'border-gray-800'}`}>
        {isRecommended && <p className="text-center text-sm font-bold text-[#A8FF00] mb-2">PALING POPULER</p>}
        <div className="flex-grow">
            <h3 className="text-2xl font-bold text-center">{title}</h3>
            <p className="text-center text-gray-400 mt-2">{description}</p>
            <p className="text-5xl font-black text-center my-6">{price}<span className="text-lg font-medium text-gray-400">{title !== 'Warrior' ? '' : '/bulan'}</span></p>
            <ul className="space-y-3 mb-8">
                {features.map((feature, i) => (
                    <li key={i} className="flex items-center gap-3">
                        <Check size={18} className={feature.included ? 'text-green-500' : 'text-gray-600'} />
                        <span className={feature.included ? 'text-gray-300' : 'text-gray-600 line-through'}>{feature.text}</span>
                    </li>
                ))}
            </ul>
        </div>
        <button 
            onClick={onClick}
            className={`w-full font-bold py-3 px-6 rounded-lg transition-colors duration-300 ${isRecommended ? 'bg-[#A8FF00] text-black hover:bg-lime-400' : 'bg-gray-800 text-white hover:bg-gray-700'}`}
        >
            {buttonText}
        </button>
    </div>
);

const FaqItem = ({ question, children }: { question: string; children: React.ReactNode }) => {
    const [isOpen, setIsOpen] = useState(false);
    return (
        <div className="border-b border-gray-800 py-4">
            <button onClick={() => setIsOpen(!isOpen)} className="w-full flex justify-between items-center text-left">
                <h4 className="font-semibold text-lg">{question}</h4>
                <ChevronDown className={`transform transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-3 text-gray-400"
                >
                    {children}
                </motion.div>
            )}
        </div>
    );
};

// Komponen Utama Landing Page
export default function LandingPage() {
  const router = useRouter();

  const handleNavigate = (path: string) => () => router.push(path);

  return (
    <div className="bg-[#0A0A0A] text-white font-sans">
      {/* Navbar */}
      <header className="sticky top-0 z-50 bg-[#0A0A0A]/80 backdrop-blur-lg border-b border-gray-900">
        <nav className="container mx-auto px-6 py-4 flex justify-between items-center">
          <div className="text-2xl font-black">FINTACK</div>
          <div className="hidden md:flex items-center gap-8">
            <NavLink href="#fitur">Fitur</NavLink>
            <NavLink href="#harga">Harga</NavLink>
            <NavLink href="#testimoni">Testimoni</NavLink>
            <NavLink href="#faq">FAQ</NavLink>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={handleNavigate('/login')} className="hidden sm:block text-white font-semibold hover:text-gray-300 transition-colors">Masuk</button>
            <button onClick={handleNavigate('/login')} className="bg-[#A8FF00] text-black font-bold py-2 px-5 rounded-lg hover:bg-lime-400 transition-colors">
              Daftar Gratis
            </button>
          </div>
        </nav>
      </header>

      <main>
        {/* Hero Section */}
        <section className="py-20 md:py-32 text-center">
          <div className="container mx-auto px-6">
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="text-4xl md:text-6xl font-black uppercase tracking-wide"
            >
              Bukan Aplikasi Budget Biasa.
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="mt-4 text-lg text-gray-400 max-w-2xl mx-auto"
            >
              Ini markas besarmu untuk menyerang kondisi finansial. Dapatkan mentor AI pribadi yang akan menemanimu membangun kekayaan, bukan cuma tabungan.
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }} 
              className="mt-10"
            >
              <button onClick={handleNavigate('/login')} className="bg-[#A8FF00] text-black font-bold py-4 px-8 rounded-lg text-lg hover:bg-lime-400 transition-colors flex items-center gap-2 mx-auto">
                Mulai Uji Coba Gratis <ArrowRight size={20} />
              </button>
            </motion.div>
          </div>
        </section>

        {/* Fitur Section */}
        <section id="fitur" className="py-20 bg-[#121212]">
            <div className="container mx-auto px-6">
                <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">Semua Amunisi yang Kamu Butuhkan</h2>
                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
                    <FeatureCard icon={MessageSquare} title="Mentor AI 24/7">
                        Dapatkan analisis dan strategi keuangan blak-blakan dari Mas Eugene, kapan pun kamu butuh.
                    </FeatureCard>
                    <FeatureCard icon={Wallet} title="Catatan Uang Cerdas">
                        Lacak setiap pemasukan dan pengeluaran dengan mudah, bahkan dari hasil scan struk.
                    </FeatureCard>
                    <FeatureCard icon={Shield} title="Arsenal Kekayaan Bersih">
                        Pantau total aset dan utangmu secara real-time. Lihat nilai investasimu bertumbuh.
                    </FeatureCard>
                    <FeatureCard icon={Target} title="Pusat Misi Terarah">
                        Selesaikan misi dan tantangan finansial yang dirancang khusus untukmu untuk naik level.
                    </FeatureCard>
                </div>
            </div>
        </section>

        {/* Testimoni Section */}
        <section id="testimoni" className="py-20">
            <div className="container mx-auto px-6">
                <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">Kata Mereka yang Sudah Berubah</h2>
                <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                    <TestimonialCard name="Budi" role="Freelancer">
                        Awalnya kaget sama &apos;Mas Eugene&apos; yang suka ngatain. Tapi justru itu yang bikin gue sadar bocornya pengeluaran di mana. Net worth gue positif untuk pertama kalinya.
                    </TestimonialCard>
                    <TestimonialCard name="Sarah" role="Karyawan Swasta">
                        Akhirnya ada aplikasi yang nggak cuma nyuruh nabung. Fintack ngasih misi yang jelas buat lunasin utang kartu kredit. Recommended!
                    </TestimonialCard>
                </div>
            </div>
        </section>

        {/* Harga Section */}
        <section id="harga" className="py-20 bg-[#121212]">
            <div className="container mx-auto px-6">
                <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">Pilih Rencana Perangmu</h2>
                <p className="text-center text-gray-400 mb-12 max-w-xl mx-auto">Mulai dengan uji coba gratis. Upgrade saat kamu siap untuk menyerang lebih serius.</p>
                <div className="grid lg:grid-cols-2 gap-8 max-w-4xl mx-auto">
                    <PricingTier
                        title="Uji Coba Gratis"
                        price="Gratis"
                        description="Coba semua fitur Warrior selama 2 minggu."
                        buttonText="Mulai Uji Coba Gratis"
                        onClick={handleNavigate('/login')}
                        features={[
                            { text: "Semua fitur di paket Warrior", included: true },
                            { text: "Analisis & Laporan Intel Mingguan", included: true },
                            { text: "Simulasi Proyeksi Kekayaan", included: true },
                            { text: "Semua Misi Terbuka", included: true },
                            { text: "Prioritas Chat dengan Mentor AI", included: true },
                        ]}
                    />
                    <PricingTier
                        title="Warrior"
                        price="Rp 99rb"
                        description="Untuk eksekutor yang siap tancap gas."
                        buttonText="Pilih Paket Warrior"
                        isRecommended
                        onClick={handleNavigate('/login')}
                        features={[
                            { text: "Semua fitur di paket Uji Coba", included: true },
                            { text: "Analisis & Laporan Intel Mingguan", included: true },
                            { text: "Simulasi Proyeksi Kekayaan", included: true },
                            { text: "Semua Misi Terbuka", included: true },
                            { text: "Prioritas Chat dengan Mentor AI", included: true },
                        ]}
                    />
                </div>
            </div>
        </section>

        {/* FAQ Section */}
        <section id="faq" className="py-20">
            <div className="container mx-auto px-6 max-w-3xl">
                <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">Yang Sering Ditanyakan</h2>
                <FaqItem question="Apakah data keuangan saya aman?">
                    Sangat aman. Kami menggunakan standar enkripsi terbaik dari Firebase (Google) untuk melindungi datamu. Kami tidak akan pernah menjual atau membagikan datamu ke pihak ketiga.
                </FaqItem>
                <FaqItem question="Siapa itu 'Mas Eugene'?">
                    Mas Eugene adalah mentor keuangan AI yang kami kembangkan. Personanya dirancang untuk menjadi teman diskusi yang jujur, blak-blakan, dan fokus pada hasil, bukan cuma nasihat basi.
                </FaqItem>
                <FaqItem question="Bagaimana cara kerja uji coba gratis?">
                    Kamu bisa mengakses semua fitur premium di paket Warrior selama 14 hari tanpa biaya. Setelah masa uji coba berakhir, kamu bisa memilih untuk berlangganan atau akunmu akan otomatis kembali ke paket gratis dengan fitur terbatas.
                </FaqItem>
                <FaqItem question="Bisakah saya mengubah atau membatalkan langganan?">
                    Tentu saja. Kamu bisa mengelola langgananmu kapan saja melalui halaman pengaturan. Tidak ada ikatan kontrak jangka panjang.
                </FaqItem>
            </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-[#121212] border-t border-gray-900 py-12">
        <div className="container mx-auto px-6 text-center text-gray-500">
            <p>&copy; {new Date().getFullYear()} Fintack. Semua Hak Dilindungi.</p>
            <div className="flex justify-center gap-6 mt-4">
                <a href="#" className="hover:text-white">Kebijakan Privasi</a>
                <a href="#" className="hover:text-white">Syarat & Ketentuan</a>
            </div>
        </div>
      </footer>
    </div>
  );
}
