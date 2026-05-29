import { useState, useEffect } from 'react';
import { Trophy, Star, Zap, Award, Gift, TrendingUp, CheckCircle, Ticket, X, Search, Copy } from 'lucide-react';
import Button from '../components/Button';
import { useAuth } from '../store/AuthContext';
import api from '../api/axios';

const RANK_STYLES = {
    1: { border: 'border-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/10', icon: '🥇', nameColor: 'text-amber-600 dark:text-amber-400' },
    2: { border: 'border-slate-400', bg: 'bg-slate-50 dark:bg-slate-800/30', icon: '🥈', nameColor: 'text-slate-600 dark:text-slate-300' },
    3: { border: 'border-orange-400', bg: 'bg-orange-50 dark:bg-orange-900/10', icon: '🥉', nameColor: 'text-orange-600 dark:text-orange-400' },
};

const REWARDS = [
    { id: 1, title: 'Voucer Makan Siang', points: 200, icon: '🍱', available: true },
    { id: 2, title: 'Voucer Belanja Rp50K', points: 500, icon: '🛒', available: true },
    { id: 3, title: 'Hari Libur Tambahan', points: 1000, icon: '🏖️', available: false },
    { id: 4, title: 'Merchandise K3 Premium', points: 750, icon: '🎁', available: true },
];

const baseLeaderboard = [
    { name: 'Ahmad Fauzi', dept: 'Produksi', points: 1240, reports: 32, badge: 'Safety Champion' },
    { name: 'Dewi Rahayu', dept: 'Warehouse', points: 980, reports: 26, badge: 'Hazard Hunter' },
    { name: 'Budi Santoso', dept: 'Maintenance', points: 810, reports: 21, badge: 'Risk Ranger' },
    { name: 'Siti Aminah', dept: 'QC', points: 650, reports: 17, badge: '' },
];

const GamificationPage = () => {
    const { user, updateUser } = useAuth();
    const [showRewards, setShowRewards] = useState(false);
    const [loading, setLoading] = useState(false);
    const [vouchers, setVouchers] = useState([]);
    const [showVouchersDrawer, setShowVouchersDrawer] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    const myPoints = user?.points || 0;
    const isHseOrAdmin = user?.role === 'HSE' || user?.role === 'Admin';

    useEffect(() => {
        if (showVouchersDrawer) {
            fetchVouchers();
        }
    }, [showVouchersDrawer]);

    const fetchVouchers = async () => {
        try {
            const url = isHseOrAdmin ? '/vouchers/all' : '/vouchers/my';
            const res = await api.get(url);
            setVouchers(res.data);
        } catch (err) {
            console.error('Failed to fetch vouchers:', err);
        }
    };

    const handleRedeem = async (reward) => {
        setLoading(true);
        try {
            const res = await api.post('/auth/redeem', {
                rewardId: reward.id,
                rewardTitle: reward.title,
                points: reward.points
            });
            updateUser({ ...user, points: res.data.points });
            alert(`Berhasil menukarkan poin dengan: ${reward.title}!\nKode Voucher Anda: ${res.data.voucher.code}\n\nSilakan tunjukkan kode voucher di menu 'Voucher Saya' ke HSE Officer.`);
            setShowRewards(false);
        } catch (err) {
            console.error(err);
            alert(err.response?.data?.message || 'Gagal menukarkan poin');
        } finally {
            setLoading(false);
        }
    };

    const handleClaimVoucher = async (voucherId) => {
        if (!window.confirm('Tandai voucher ini sebagai sudah diklaim secara fisik?')) return;
        try {
            await api.patch(`/vouchers/${voucherId}/claim`);
            alert('Voucher berhasil diklaim secara fisik!');
            fetchVouchers();
        } catch (err) {
            console.error('Failed to claim voucher:', err);
            alert('Gagal mengeklaim voucher');
        }
    };

    const userInLeaderboard = {
        name: user?.nama || 'Anda',
        dept: user?.role || 'Safety Team',
        points: myPoints,
        reports: ['Staff', 'Operator'].includes(user?.role) ? 13 : 5,
        badge: myPoints > 1000 ? 'Safety Champion' : myPoints > 500 ? 'Hazard Hunter' : ''
    };

    const sortedLeaderboard = [...baseLeaderboard.filter(u => u.name !== user?.nama), userInLeaderboard]
        .sort((a, b) => b.points - a.points)
        .map((u, index) => ({ ...u, rank: index + 1 }));

    const myRank = sortedLeaderboard.find(u => u.name === user?.nama)?.rank || 5;

    const filteredVouchers = vouchers.filter(v => {
        const search = searchTerm.toLowerCase();
        return (
            v.code.toLowerCase().includes(search) ||
            v.reward_title.toLowerCase().includes(search) ||
            (v.User && v.User.nama.toLowerCase().includes(search))
        );
    });

    return (
        <div className="space-y-8 animate-in fade-in duration-500 relative">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter flex items-center gap-3">
                        <Trophy size={28} className="text-amber-500" /> Safety Rewards
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 text-sm font-medium mt-1">Peroleh poin dari setiap laporan bahaya valid. Tukarkan dengan rewards eksklusif!</p>
                </div>
                <div className="flex gap-3 w-full sm:w-auto">
                    <button
                        className="flex-1 sm:flex-none flex items-center justify-center rounded-2xl py-5 px-6 font-black text-xs uppercase tracking-wider bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-all border border-slate-200 dark:border-slate-700 active:scale-98"
                        onClick={() => setShowVouchersDrawer(true)}
                    >
                        <Ticket size={16} className="mr-2 text-blue-500" />
                        {isHseOrAdmin ? 'Klaim Voucher' : 'Voucher Saya'}
                    </button>
                    <Button
                        className="flex-1 sm:flex-none rounded-2xl py-5 px-8 shadow-xl shadow-amber-500/20 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
                        onClick={() => setShowRewards(true)}
                    >
                        <Gift size={18} className="mr-2" /> Tukar Poin
                    </Button>
                </div>
            </div>

            {/* My Points Card */}
            <div className="bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 rounded-[2rem] p-8 text-white shadow-2xl shadow-blue-500/20">
                <div className="flex flex-col md:flex-row justify-between items-center gap-8">
                    <div>
                        <p className="text-blue-200 text-sm font-bold uppercase tracking-widest mb-1">Total Poin Anda</p>
                        <div className="flex items-baseline gap-3">
                            <span className="text-7xl font-black">{myPoints.toLocaleString()}</span>
                            <Star size={32} className="text-amber-400 fill-amber-400" />
                        </div>
                        <p className="text-blue-200 text-sm mt-2">Anda berada di <strong className="text-white">Posisi #{myRank}</strong> bulan ini</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4 w-full md:w-auto">
                        {[
                            { label: 'Laporan Valid', value: ['Staff', 'Operator'].includes(user?.role) ? '13' : '5', icon: <CheckCircle size={20} /> },
                            { label: 'Poin Bulan Ini', value: `+${myPoints}`, icon: <TrendingUp size={20} /> },
                            { label: 'Badge Diraih', value: myPoints > 1000 ? '2' : myPoints > 500 ? '1' : '0', icon: <Award size={20} /> },
                            { label: 'Rewards Ditukar', value: myPoints < 1200 ? '1' : '0', icon: <Gift size={20} /> },
                        ].map(s => (
                            <div key={s.label} className="bg-white/10 backdrop-blur-sm rounded-2xl p-4">
                                <div className="text-blue-200 mb-1">{s.icon}</div>
                                <p className="text-2xl font-black">{s.value}</p>
                                <p className="text-[10px] text-blue-200 font-bold uppercase tracking-wider mt-0.5">{s.label}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Leaderboard */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
                <div className="px-8 py-6 border-b border-slate-100 dark:border-slate-800">
                    <h2 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tighter flex items-center gap-3">
                        <Trophy size={22} className="text-amber-500" /> Leaderboard Bulanan
                    </h2>
                </div>
                <div className="divide-y divide-slate-50 dark:divide-slate-800/50">
                    {sortedLeaderboard.map((person) => {
                        const style = RANK_STYLES[person.rank] || {};
                        const isMe = person.name === user?.nama;
                        return (
                            <div
                                key={person.rank}
                                className={`flex items-center gap-5 px-8 py-5 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/30 ${isMe ? 'bg-blue-50 dark:bg-blue-900/10' : ''} ${style.border ? `border-l-4 ${style.border}` : ''}`}
                            >
                                <div className="text-2xl w-8 text-center">{style.icon || `#${person.rank}`}</div>
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <p className={`font-black text-sm ${style.nameColor || 'text-slate-900 dark:text-white'}`}>{person.name}</p>
                                        {isMe && <span className="text-[9px] font-black text-blue-600 bg-blue-500/10 px-2 py-0.5 rounded-full">ANDA</span>}
                                        {person.badge && (
                                            <span className="text-[9px] font-black text-purple-600 bg-purple-500/10 px-2 py-0.5 rounded-full flex items-center gap-1">
                                                <Award size={8} /> {person.badge}
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-xs text-slate-400 mt-0.5">{person.dept} · {person.reports} laporan valid</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-lg font-black text-slate-900 dark:text-white">{person.points.toLocaleString()}</p>
                                    <p className="text-[10px] text-amber-500 font-black uppercase">Poin</p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Rewards Modal */}
            {showRewards && (
                <div 
                    onClick={() => setShowRewards(false)}
                    className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4"
                >
                    <div 
                        onClick={(e) => e.stopPropagation()}
                        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-md rounded-3xl p-8 shadow-2xl animate-in zoom-in-95 duration-200"
                    >
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-black uppercase tracking-tighter text-slate-900 dark:text-white flex items-center gap-2">
                                <Gift size={22} className="text-amber-500" /> Tukar Poin
                            </h2>
                            <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-500/10 rounded-xl">
                                <Star size={14} className="text-amber-500 fill-amber-500" />
                                <span className="font-black text-amber-600 text-sm">{myPoints} Poin</span>
                            </div>
                        </div>
                        <div className="space-y-3 mb-6">
                            {REWARDS.map(r => (
                                <div key={r.id} className={`flex items-center gap-4 p-4 rounded-2xl border transition-all ${r.available && myPoints >= r.points ? 'border-slate-200 dark:border-slate-700 hover:border-amber-400 cursor-pointer' : 'border-slate-100 dark:border-slate-800 opacity-50 cursor-not-allowed'}`}>
                                    <div className="text-3xl">{r.icon}</div>
                                    <div className="flex-1">
                                        <p className="font-bold text-slate-900 dark:text-white text-sm">{r.title}</p>
                                        <p className="text-[10px] text-amber-600 font-black">{r.points} Poin</p>
                                    </div>
                                    {myPoints >= r.points && r.available
                                        ? <Button className="text-xs rounded-xl py-2 px-3" onClick={() => handleRedeem(r)} loading={loading}>Tukar</Button>
                                        : <span className="text-[10px] text-slate-400 font-bold">{myPoints < r.points ? 'Poin kurang' : 'Habis'}</span>
                                    }
                                </div>
                            ))}
                        </div>
                        <Button variant="ghost" className="w-full rounded-2xl" onClick={() => setShowRewards(false)}>Tutup</Button>
                    </div>
                </div>
            )}

            {/* Vouchers Slide-out Drawer */}
            {showVouchersDrawer && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[99] transition-opacity duration-300" onClick={() => setShowVouchersDrawer(false)} />
            )}
            <div className={`fixed inset-y-0 right-0 w-full sm:w-[480px] bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 z-[100] transform transition-transform duration-300 ease-in-out shadow-2xl flex flex-col ${showVouchersDrawer ? 'translate-x-0' : 'translate-x-full'}`}>
                {/* Header */}
                <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-black uppercase tracking-tighter text-slate-900 dark:text-white flex items-center gap-2">
                            <Ticket size={22} className="text-blue-500" />
                            {isHseOrAdmin ? 'Klaim Voucher Karyawan' : 'Voucher Saya'}
                        </h2>
                        <p className="text-xs text-slate-400 mt-1">
                            {isHseOrAdmin ? 'Kelola dan lakukan verifikasi penukaran voucher fisik karyawan.' : 'Gunakan kode unik voucher Anda untuk mengklaim hadiah fisik dari HSE Officer.'}
                        </p>
                    </div>
                    <button onClick={() => setShowVouchersDrawer(false)} className="p-2 text-slate-400 hover:text-slate-650 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Search for HSE/Admin */}
                {isHseOrAdmin && (
                    <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800/50 bg-slate-50 dark:bg-slate-900/50">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                            <input
                                type="text"
                                placeholder="Cari nama karyawan atau kode voucher..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium"
                            />
                        </div>
                    </div>
                )}

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    {filteredVouchers.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-center p-10 opacity-60">
                            <Ticket size={48} className="text-slate-350 dark:text-slate-750 mb-3" />
                            <p className="text-slate-500 font-bold text-sm">Belum ada voucher terdaftar</p>
                            <p className="text-xs text-slate-400 mt-1">Silakan lakukan penukaran poin terlebih dahulu.</p>
                        </div>
                    ) : (
                        filteredVouchers.map(v => {
                            const isPending = v.status === 'Pending';
                            const rewardIcon = REWARDS.find(r => r.id === v.reward_id)?.icon || '🎁';

                            return (
                                <div key={v.id_voucher} className={`p-5 rounded-3xl border-2 transition-all ${isPending ? 'border-blue-500/20 bg-blue-500/5' : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 opacity-75'}`}>
                                    <div className="flex justify-between items-start mb-3">
                                        <div className="flex items-center gap-3">
                                            <span className="text-3xl">{rewardIcon}</span>
                                            <div>
                                                <h4 className="font-bold text-slate-900 dark:text-white text-sm leading-tight">{v.reward_title}</h4>
                                                <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">
                                                    {new Date(v.createdAt).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                </p>
                                            </div>
                                        </div>
                                        <span className={`text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg ${isPending ? 'bg-amber-500/10 text-amber-600' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
                                            {isPending ? 'Menunggu Klaim' : 'Sudah Diklaim'}
                                        </span>
                                    </div>

                                    {isHseOrAdmin && v.User && (
                                        <p className="text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-500/5 dark:bg-blue-500/10 w-fit px-3 py-1 rounded-lg mb-3">
                                            Karyawan: {v.User.nama} ({v.User.role})
                                        </p>
                                    )}

                                    {/* Voucher Code Box */}
                                    <div className="flex items-center gap-2 mt-4">
                                        <div className="flex-1 font-mono font-black text-center bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 py-3 rounded-xl text-lg tracking-wider text-slate-800 dark:text-slate-200 select-all relative group">
                                            {v.code}
                                            <button
                                                onClick={() => { navigator.clipboard.writeText(v.code); alert('Kode voucher berhasil disalin!'); }}
                                                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-slate-400 hover:text-slate-650 opacity-0 group-hover:opacity-100 transition-opacity"
                                                title="Salin Kode"
                                            >
                                                <Copy size={12} />
                                            </button>
                                        </div>

                                        {isHseOrAdmin && isPending && (
                                            <button
                                                onClick={() => handleClaimVoucher(v.id_voucher)}
                                                className="px-4 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-colors shadow-lg shadow-emerald-500/15"
                                            >
                                                Klaim Fisik
                                            </button>
                                        )}
                                    </div>

                                    {!isPending && v.claimedAt && (
                                        <p className="text-[10px] text-slate-400 italic mt-3 text-right">
                                            Fisik diklaim pada: {new Date(v.claimedAt).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                        </p>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </div>
    );
};

export default GamificationPage;
