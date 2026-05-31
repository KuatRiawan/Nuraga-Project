import { useState, useEffect } from 'react';
import { Trophy, Star, Zap, Award, Gift, TrendingUp, CheckCircle, Ticket, X, Search, Copy, CheckCircle2, XCircle } from 'lucide-react';
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

const baseLeaderboard = [];

const GamificationPage = () => {
    const { user, updateUser } = useAuth();
    const [showRewards, setShowRewards] = useState(false);
    const [loading, setLoading] = useState(false);
    const [vouchers, setVouchers] = useState([]);
    const [showVouchersDrawer, setShowVouchersDrawer] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [notification, setNotification] = useState(null);
    const [userStats, setUserStats] = useState({ rewardsClaimed: 0, hazardsReported: 0 });
    const [showClaimModal, setShowClaimModal] = useState(false);
    const [selectedVoucherId, setSelectedVoucherId] = useState(null);

    // Fetch real leaderboard and rewards from backend
    const [leaderboard, setLeaderboard] = useState([]);
    const [rewards, setRewards] = useState([]);
    const [leaderboardLoading, setLeaderboardLoading] = useState(false);
    const [rewardsLoading, setRewardsLoading] = useState(false);

    const myPoints = user?.points || 0;
    const isHseOrAdmin = user?.role === 'HSE' || user?.role === 'Admin';

    const showNotification = (message, type = 'success') => {
        setNotification({ message, type });
        setTimeout(() => setNotification(null), 4000);
    };

    useEffect(() => {
        fetchLeaderboard();
        fetchRewards();
        fetchUserStats();
    }, []);

    useEffect(() => {
        if (showVouchersDrawer) {
            fetchVouchers();
        }
    }, [showVouchersDrawer]);

    const fetchLeaderboard = async () => {
        setLeaderboardLoading(true);
        try {
            const res = await api.get('/auth/leaderboard');
            setLeaderboard(res.data);
        } catch (err) {
            console.error('Failed to fetch leaderboard:', err);
        } finally {
            setLeaderboardLoading(false);
        }
    };

    const fetchRewards = async () => {
        setRewardsLoading(true);
        try {
            const res = await api.get('/auth/rewards');
            setRewards(res.data);
        } catch (err) {
            console.error('Failed to fetch rewards:', err);
        } finally {
            setRewardsLoading(false);
        }
    };

    const fetchVouchers = async () => {
        try {
            const url = isHseOrAdmin ? '/vouchers/all' : '/vouchers/my';
            const res = await api.get(url);
            setVouchers(res.data);
        } catch (err) {
            console.error('Failed to fetch vouchers:', err);
        }
    };

    const fetchUserStats = async () => {
        try {
            const res = await api.get('/auth/user-stats');
            setUserStats(res.data);
        } catch (err) {
            console.error('Failed to fetch user stats:', err);
            // Fallback to counting from vouchers if endpoint doesn't exist
            try {
                const voucherRes = await api.get('/vouchers/my');
                setUserStats({ rewardsClaimed: voucherRes.data.length, hazardsReported: 0 });
            } catch (voucherErr) {
                console.error('Failed to fetch vouchers for stats:', voucherErr);
            }
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
            showNotification(`Berhasil menukarkan poin dengan: ${reward.title}!\nKode Voucher: ${res.data.voucher.code}`, 'success');
            fetchRewards(); // Update quotas
            fetchLeaderboard(); // Update positions
            fetchUserStats(); // Update user stats
            setShowRewards(false);
        } catch (err) {
            console.error(err);
            showNotification(err.response?.data?.message || 'Gagal menukarkan poin', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleClaimVoucher = async (voucherId) => {
        setSelectedVoucherId(voucherId);
        setShowClaimModal(true);
    };

    const confirmClaimVoucher = async () => {
        setShowClaimModal(false);
        try {
            await api.patch(`/vouchers/${selectedVoucherId}/claim`);
            showNotification('Voucher berhasil diklaim secara fisik!', 'success');
            fetchVouchers();
        } catch (err) {
            console.error('Failed to claim voucher:', err);
            showNotification('Gagal mengeklaim voucher', 'error');
        }
    };

    const sortedLeaderboard = leaderboard.length > 0
        ? leaderboard.map((u, index) => ({ ...u, rank: index + 1 }))
        : [
            {
                name: user?.nama || 'Anda',
                dept: user?.role || 'Safety Team',
                points: myPoints,
                reports: 0,
                badge: myPoints > 1000 ? 'Safety Champion' : myPoints > 500 ? 'Hazard Hunter' : '',
                rank: 1
            }
          ];

    const myRank = sortedLeaderboard.find(u => u.name === user?.nama)?.rank || 1;

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
            {/* Notification Toast */}
            {notification && (
                <div className={`fixed top-4 right-4 z-[200] flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl animate-in slide-in-from-right duration-300 ${
                    notification.type === 'success' 
                        ? 'bg-emerald-600 text-white' 
                        : 'bg-red-600 text-white'
                }`}>
                    {notification.type === 'success' ? (
                        <CheckCircle2 size={20} className="shrink-0" />
                    ) : (
                        <XCircle size={20} className="shrink-0" />
                    )}
                    <p className="text-sm font-medium whitespace-pre-line">{notification.message}</p>
                    <button
                        onClick={() => setNotification(null)}
                        className="p-1 hover:bg-white/20 rounded-lg transition-colors"
                    >
                        <X size={16} />
                    </button>
                </div>
            )}

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
                            { label: 'Laporan Valid', value: userStats.hazardsReported || '0', icon: <CheckCircle size={20} /> },
                            { label: 'Poin Bulan Ini', value: `+${myPoints}`, icon: <TrendingUp size={20} /> },
                            { label: 'Badge Diraih', value: myPoints > 1000 ? '2' : myPoints > 500 ? '1' : '0', icon: <Award size={20} /> },
                            { label: 'Rewards Ditukar', value: userStats.rewardsClaimed || '0', icon: <Gift size={20} /> },
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
                            {(rewards.length > 0 ? rewards : REWARDS).map(r => {
                                const hasQuotaInfo = r.remaining !== undefined;
                                return (
                                    <div key={r.id} className={`flex items-center gap-4 p-4 rounded-2xl border transition-all ${r.available && myPoints >= r.points ? 'border-slate-200 dark:border-slate-700 hover:border-amber-400 cursor-pointer' : 'border-slate-100 dark:border-slate-800 opacity-50 cursor-not-allowed'}`}>
                                        <div className="text-3xl">{r.icon}</div>
                                        <div className="flex-1">
                                            <p className="font-bold text-slate-900 dark:text-white text-sm">{r.title}</p>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <span className="text-[10px] text-amber-600 font-black">{r.points} Poin</span>
                                                {hasQuotaInfo && (
                                                    <span className={`text-[9px] px-2 py-0.5 rounded-lg font-bold ${r.remaining > 0 ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400' : 'bg-red-500/10 text-red-500'}`}>
                                                        Kuota: {r.remaining} sisa
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        {myPoints >= r.points && r.available
                                            ? <Button className="text-xs rounded-xl py-2 px-3" onClick={() => handleRedeem(r)} loading={loading}>Tukar</Button>
                                            : <span className="text-[10px] text-slate-400 font-bold">{myPoints < r.points ? 'Poin kurang' : 'Habis'}</span>
                                        }
                                    </div>
                                );
                            })}
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
                                                onClick={() => { navigator.clipboard.writeText(v.code); showNotification('Kode voucher berhasil disalin!', 'success'); }}
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

            {/* Claim Confirmation Modal */}
            {showClaimModal && (
                <div 
                    onClick={() => setShowClaimModal(false)}
                    className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-50 flex items-center justify-center p-4"
                >
                    <div 
                        onClick={(e) => e.stopPropagation()}
                        className="bg-white dark:bg-slate-800 w-full max-w-md rounded-3xl p-6 md:p-8 shadow-2xl animate-in zoom-in-95 duration-200"
                    >
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tighter flex items-center gap-2">
                                <Ticket className="text-blue-600" size={24} /> Konfirmasi Klaim Voucher
                            </h2>
                            <button onClick={() => setShowClaimModal(false)} className="text-slate-400 hover:text-red-500 transition-colors">
                                <X size={20} />
                            </button>
                        </div>
                        <p className="text-sm text-slate-600 dark:text-slate-300 mb-6 leading-relaxed">
                            Tandai voucher ini sebagai sudah diklaim secara fisik? Tindakan ini tidak dapat dibatalkan.
                        </p>
                        <div className="flex gap-4">
                            <button
                                onClick={() => setShowClaimModal(false)}
                                className="flex-1 py-4 rounded-2xl flex items-center justify-center gap-2 border-2 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                            >
                                Batal
                            </button>
                            <button
                                onClick={confirmClaimVoucher}
                                className="flex-1 py-4 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20"
                            >
                                <CheckCircle2 size={18} /> Ya, Klaim
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default GamificationPage;
