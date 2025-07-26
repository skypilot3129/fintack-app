'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase';
import { collection, query, onSnapshot, orderBy, doc, deleteDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { Plus, TrendingUp, TrendingDown, Edit, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

import ArsenalSkeleton from '@/components/ArsenalSkeleton';
import AddAssetModal from '@/components/AddAssetModal';

// Tipe data yang lebih spesifik
interface AssetDetails {
    ticker?: string;
    shares?: number;
    price?: number;
}

interface AssetItem {
  id: string;
  name: string;
  value: number;
  category: string;
  details?: AssetDetails;
}

interface DataCardProps {
  title: string;
  amount: number;
  data: AssetItem[];
  Icon: React.ElementType;
  colorClass: string;
  onAddClick: () => void;
  onEditClick: (item: AssetItem) => void;
  onDeleteClick: (id: string) => void;
}

// Fungsi format
const formatCurrency = (value: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(value);

const DataCard = ({ title, amount, data, Icon, colorClass, onAddClick, onEditClick, onDeleteClick }: DataCardProps) => (
    <div className="bg-[#121212] p-6 rounded-lg border border-gray-800">
        <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-2">
                <Icon className={`${colorClass}`} size={20}/>
                <h3 className="font-bold text-lg">{title}</h3>
            </div>
            <button onClick={onAddClick} className="p-1 rounded-full text-gray-400 hover:bg-gray-700 hover:text-white">
                <Plus size={18}/>
            </button>
        </div>
        <p className={`text-2xl font-black ${colorClass}`}>{formatCurrency(amount)}</p>
        <hr className="border-gray-800 my-4"/>
        <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
            {data.map((item: AssetItem) => (
                <div key={item.id} className="group flex justify-between items-center text-sm hover:bg-gray-800/50 p-1 rounded">
                    <span>{item.name}</span>
                    <div className="flex items-center gap-2">
                        <span className="font-semibold">{formatCurrency(item.value)}</span>
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                             <button onClick={() => onEditClick(item)} className="p-1 text-gray-400 hover:text-white"><Edit size={14}/></button>
                             <button onClick={() => onDeleteClick(item.id)} className="p-1 text-gray-400 hover:text-red-400"><Trash2 size={14}/></button>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    </div>
);

export default function ArsenalPage() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();

    const [assets, setAssets] = useState<AssetItem[]>([]);
    const [liabilities, setLiabilities] = useState<AssetItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalType, setModalType] = useState<'asset' | 'liability'>('asset');
    const [editingItem, setEditingItem] = useState<AssetItem | null>(null);

    useEffect(() => {
        if (!user) {
            if (!authLoading) router.push('/');
            return;
        }

        const assetsQuery = query(collection(db, 'users', user.uid, 'assets'), orderBy('value', 'desc'));
        const liabilitiesQuery = query(collection(db, 'users', user.uid, 'liabilities'), orderBy('value', 'desc'));

        const unsubAssets = onSnapshot(assetsQuery, (snap) => {
            setAssets(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as AssetItem)));
            setIsLoading(false);
        });
        const unsubLiabilities = onSnapshot(liabilitiesQuery, (snap) => {
            setLiabilities(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as AssetItem)));
            setIsLoading(false);
        });

        return () => {
            unsubAssets();
            unsubLiabilities();
        };
    }, [user, authLoading, router]);

    const { totalAssets, totalLiabilities, netWorth } = useMemo(() => {
        const totalAssetsValue = assets.reduce((sum, a) => sum + a.value, 0);
        const totalLiabilitiesValue = liabilities.reduce((sum, l) => sum + l.value, 0);
        return { totalAssets: totalAssetsValue, totalLiabilities: totalLiabilitiesValue, netWorth: totalAssetsValue - totalLiabilitiesValue };
    }, [assets, liabilities]);

    const openModal = (type: 'asset' | 'liability', item: AssetItem | null = null) => {
        setModalType(type);
        setEditingItem(item);
        setIsModalOpen(true);
    };

    const handleDelete = async (id: string, type: 'asset' | 'liability') => {
        if (!user || !window.confirm("Yakin mau hapus item ini?")) return;
        
        const collectionName = type === 'asset' ? 'assets' : 'liabilities';
        const docRef = doc(db, 'users', user.uid, collectionName, id);
        try {
            await deleteDoc(docRef);
            toast.success("Item berhasil dihapus.");
        } catch (error) {
            toast.error("Gagal menghapus item.");
            console.error("Delete Error:", error);
        }
    };

    if (isLoading || authLoading) {
        return <ArsenalSkeleton />;
    }

    return (
        <>
            <main className="p-4 md:p-6 lg:p-8 bg-[#0A0A0A] pb-28 min-h-screen text-white">
                <div className="max-w-4xl mx-auto">
                    <h1 className="text-3xl font-black text-center uppercase">Arsenal Kekayaan</h1>
                    <p className="text-center text-gray-400 mt-2">Ukur total kekayaan bersihmu di sini.</p>

                    <div className="mt-8 p-4 bg-gradient-to-r from-[#a8ff00]/10 to-transparent rounded-lg border border-gray-800 text-center max-w-md mx-auto">
                        <p className="text-sm font-bold text-gray-400">Total Kekayaan Bersih</p>
                        <p className="text-4xl font-black text-[#A8FF00] mt-1">{formatCurrency(netWorth)}</p>
                    </div>

                    <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-8">
                        <DataCard title="Aset" amount={totalAssets} data={assets} Icon={TrendingUp} colorClass="text-green-400" 
                            onAddClick={() => openModal('asset')}
                            onEditClick={(item: AssetItem) => openModal('asset', item)}
                            onDeleteClick={(id: string) => handleDelete(id, 'asset')}
                        />
                        <DataCard title="Liabilitas" amount={totalLiabilities} data={liabilities} Icon={TrendingDown} colorClass="text-red-400"
                            onAddClick={() => openModal('liability')}
                            onEditClick={(item: AssetItem) => openModal('liability', item)}
                            onDeleteClick={(id: string) => handleDelete(id, 'liability')}
                        />
                    </div>
                </div>
            </main>
            <AddAssetModal 
                isOpen={isModalOpen} 
                onClose={() => setIsModalOpen(false)} 
                assetType={modalType}
                initialData={editingItem}
            />
        </>
    );
}
