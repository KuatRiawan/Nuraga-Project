import { useState, useEffect } from 'react';
import api from '../api/axios';
import { History, Search, Shield, User, Clock, Info, RefreshCw, FileText, Check, AlertCircle } from 'lucide-react';
import Button from '../components/Button';

const ACTION_COLORS = {
    LOGIN: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20',
    CREATE_USER: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20',
    UPDATE_USER: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20',
    DELETE_USER: 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20',
    REQUEST_PTW: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20',
    APPROVE_PTW_STEP1: 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20',
    APPROVE_PTW_STEP2: 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20',
    APPROVE_PTW_FINAL: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20',
    REJECT_PTW: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20',
    CLOSE_PTW: 'bg-slate-500/10 text-slate-650 dark:text-slate-400 border border-slate-500/20',
    CREATE_HAZARD: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20',
    VERIFY_HAZARD: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20',
    OVERRIDE_HAZARD_RISK: 'bg-fuchsia-500/10 text-fuchsia-600 dark:text-fuchsia-400 border border-fuchsia-500/20',
    UPDATE_CONFIG: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20',
};

const ROLE_COLORS = {
    Admin: 'bg-red-550/15 text-red-655 dark:text-red-400 border border-red-500/10',
    HSE: 'bg-emerald-550/15 text-emerald-655 dark:text-emerald-400 border border-emerald-500/10',
    Supervisor: 'bg-indigo-550/15 text-indigo-655 dark:text-indigo-400 border border-indigo-500/10',
    Manager: 'bg-blue-550/15 text-blue-655 dark:text-blue-400 border border-blue-500/10',
    Staff: 'bg-amber-550/15 text-amber-655 dark:text-amber-450 border border-amber-500/10',
    Operator: 'bg-amber-550/15 text-amber-655 dark:text-amber-450 border border-amber-500/10',
    Vendor: 'bg-slate-550/15 text-slate-655 dark:text-slate-400 border border-slate-500/10',
    Kontraktor: 'bg-slate-550/15 text-slate-655 dark:text-slate-400 border border-slate-500/10',
    SYSTEM: 'bg-violet-550/15 text-violet-655 dark:text-violet-400 border border-violet-500/10',
};

const AuditLogPage = () => {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedAction, setSelectedAction] = useState('ALL');
    const [selectedRole, setSelectedRole] = useState('ALL');

    useEffect(() => {
        fetchLogs();
    }, []);

    const fetchLogs = async () => {
        setLoading(true);
        setError('');
        try {
            const res = await api.get('/logs');
            setLogs(res.data);
        } catch (err) {
            setError(err.response?.data?.message || 'Gagal memuat log audit.');
        } finally {
            setLoading(false);
        }
    };

    const actionsList = [
        { value: 'ALL', label: 'Semua Kategori' },
        { value: 'LOGIN', label: 'Login' },
        { value: 'CREATE_USER', label: 'Tambah User' },
        { value: 'UPDATE_USER', label: 'Update User' },
        { value: 'DELETE_USER', label: 'Hapus User' },
        { value: 'REQUEST_PTW', label: 'Pengajuan PTW' },
        { value: 'APPROVE_PTW', label: 'Persetujuan PTW' },
        { value: 'CLOSE_PTW', label: 'Penutupan PTW' },
        { value: 'CREATE_HAZARD', label: 'Temuan Bahaya' },
        { value: 'VERIFY_HAZARD', label: 'Validasi Bahaya' },
        { value: 'OVERRIDE_HAZARD_RISK', label: 'Ubah Risiko Bahaya' },
        { value: 'UPDATE_CONFIG', label: 'Ubah Konfigurasi' }
    ];

    const rolesList = [
        { value: 'ALL', label: 'Semua Role' },
        { value: 'Admin', label: 'Admin' },
        { value: 'HSE', label: 'HSE' },
        { value: 'Supervisor', label: 'Supervisor' },
        { value: 'Manager', label: 'Manager' },
        { value: 'Staff', label: 'Staff' },
        { value: 'Operator', label: 'Operator' },
        { value: 'Vendor', label: 'Vendor' },
        { value: 'Kontraktor', label: 'Kontraktor' },
        { value: 'SYSTEM', label: 'System' }
    ];

    const filteredLogs = logs.filter(log => {
        const matchesSearch =
            (log.nama_user && log.nama_user.toLowerCase().includes(searchQuery.toLowerCase())) ||
            (log.details && log.details.toLowerCase().includes(searchQuery.toLowerCase())) ||
            (log.action && log.action.toLowerCase().includes(searchQuery.toLowerCase())) ||
            (log.ip_address && log.ip_address.includes(searchQuery));

        const matchesAction = selectedAction === 'ALL'
            ? true
            : selectedAction === 'APPROVE_PTW'
                ? log.action.startsWith('APPROVE_PTW')
                : log.action === selectedAction;

        const matchesRole = selectedRole === 'ALL' ? true : log.role_user === selectedRole;

        return matchesSearch && matchesAction && matchesRole;
    });

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter flex items-center gap-2">
                        <History className="text-blue-600 dark:text-blue-450" /> Log Aktivitas Sistem
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Rekaman jejak audit perubahan data, keamanan, dan otorisasi K3.</p>
                </div>
                <Button onClick={fetchLogs} variant="ghost" className="flex items-center gap-2 w-full sm:w-auto justify-center rounded-2xl py-3 px-5 border border-slate-200 dark:border-slate-800">
                    <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Segarkan Log
                </Button>
            </div>

            {error && (
                <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/30 rounded-2xl">
                    <AlertCircle className="text-red-550 shrink-0" size={18} />
                    <p className="text-sm font-medium text-red-800 dark:text-red-400">{error}</p>
                </div>
            )}

            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200 dark:border-slate-800">
                <div className="relative md:col-span-2 group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />
                    <input
                        type="text"
                        placeholder="Cari berdasarkan pelaksana, rincian, atau IP..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-11 pr-4 py-2.5 bg-slate-50 dark:bg-slate-850/50 border border-slate-200 dark:border-slate-800 rounded-2xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    />
                </div>

                <div>
                    <select
                        value={selectedAction}
                        onChange={(e) => setSelectedAction(e.target.value)}
                        className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-850/50 border border-slate-200 dark:border-slate-800 rounded-2xl text-slate-950 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-semibold"
                    >
                        {actionsList.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                    </select>
                </div>

                <div>
                    <select
                        value={selectedRole}
                        onChange={(e) => setSelectedRole(e.target.value)}
                        className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-850/50 border border-slate-200 dark:border-slate-800 rounded-2xl text-slate-950 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-semibold"
                    >
                        {rolesList.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-left">
                        <thead>
                            <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850/50 text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider">
                                <th className="px-6 py-4">Waktu</th>
                                <th className="px-6 py-4">Pelaksana</th>
                                <th className="px-6 py-4">Role</th>
                                <th className="px-6 py-4">Kategori Aksi</th>
                                <th className="px-6 py-4">Rincian Perubahan</th>
                                <th className="px-6 py-4">IP Address</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                            {loading ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-16 text-center">
                                        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-600 mx-auto"></div>
                                        <p className="text-slate-400 text-sm mt-3 font-medium">Memuat log sistem...</p>
                                    </td>
                                </tr>
                            ) : filteredLogs.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-16 text-center">
                                        <FileText size={40} className="mx-auto mb-3 text-slate-350 dark:text-slate-700" />
                                        <p className="text-slate-400 font-medium text-sm">Tidak ada log sistem yang cocok dengan kriteria filter.</p>
                                    </td>
                                </tr>
                            ) : (
                                filteredLogs.map((log) => {
                                    return (
                                        <tr key={log.id_log} className="hover:bg-slate-550/10 dark:hover:bg-slate-800/30 transition-colors">
                                            <td className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap">
                                                <div className="flex items-center gap-1.5">
                                                    <Clock size={12} />
                                                    {new Date(log.createdAt).toLocaleString('id-ID')}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-350 font-bold flex items-center justify-center text-[10px] uppercase border border-slate-200 dark:border-slate-700">
                                                        {log.nama_user ? log.nama_user.charAt(0) : 'S'}
                                                    </div>
                                                    <span className="font-extrabold text-slate-800 dark:text-slate-200 text-sm">{log.nama_user || 'SYSTEM'}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center gap-1 text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider ${ROLE_COLORS[log.role_user] || ROLE_COLORS.SYSTEM}`}>
                                                    <Shield size={9} /> {log.role_user || 'SYSTEM'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center gap-1 text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider ${ACTION_COLORS[log.action] || 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20'}`}>
                                                    {log.action}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-sm font-semibold text-slate-700 dark:text-slate-300 leading-relaxed max-w-xs md:max-w-md">
                                                {log.details}
                                            </td>
                                            <td className="px-6 py-4 text-xs font-mono font-bold text-slate-500 dark:text-slate-400">
                                                {log.ip_address || '127.0.0.1'}
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
                <div className="px-6 py-4 bg-slate-50 dark:bg-slate-850/30 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center text-xs text-slate-400 font-medium">
                    <span>Menampilkan {filteredLogs.length} entri log</span>
                    <span>Hak Cipta © {new Date().getFullYear()} Nuraga Safety IQ</span>
                </div>
            </div>
        </div>
    );
};

export default AuditLogPage;
