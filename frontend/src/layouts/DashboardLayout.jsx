import { useState, useCallback, useEffect, useRef } from 'react';
import Sidebar from '../components/Sidebar';
import { Menu, Shield, Bell, AlertTriangle, FileText, CheckCircle, Sun, Moon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../store/AuthContext';
import { useTheme } from '../store/ThemeContext';
import { useSocket } from '../hooks/useSocket';
import api from '../api/axios';

const compileNotifications = (permits, hazards, actions, leaves, activeUser) => {
    if (!activeUser) return [];
    const compiled = [];
    const userRole = activeUser.role;
    const userId = activeUser.id_user || activeUser.id;

    // 1. PTW Notifications
    permits.forEach(p => {
        const permitId = `permit-${p.id_permit}-${p.updatedAt || p.createdAt}`;
        const isOwner = p.id_user === userId;

        if (p.status === 'Pending') {
            if (isOwner && p.approval_step > 1) {
                const stepMessage = p.approval_step === 2
                    ? 'Disetujui Supervisor, menunggu persetujuan HSE.'
                    : 'Disetujui HSE, menunggu persetujuan Manager.';
                compiled.push({
                    id: permitId,
                    type: 'permit',
                    title: 'Progress e-PTW Diperbarui',
                    message: `e-PTW #${p.id_permit}: ${stepMessage}`,
                    time: new Date(p.updatedAt || p.createdAt),
                    link: '/permits'
                });
            }

            // Approver notifications
            if (userRole === 'Supervisor' && p.approval_step === 1) {
                compiled.push({
                    id: permitId,
                    type: 'permit',
                    title: 'Persetujuan e-PTW Baru (SPV)',
                    message: `e-PTW baru di ${p.lokasi} oleh ${p.User?.nama || 'Staff'} memerlukan persetujuan Anda.`,
                    time: new Date(p.createdAt),
                    link: '/permits'
                });
            } else if (userRole === 'HSE' && p.approval_step === 2) {
                compiled.push({
                    id: permitId,
                    type: 'permit',
                    title: 'Persetujuan e-PTW Baru (HSE)',
                    message: `e-PTW baru di ${p.lokasi} oleh ${p.User?.nama || 'Staff'} memerlukan persetujuan Anda.`,
                    time: new Date(p.createdAt),
                    link: '/permits'
                });
            } else if (userRole === 'Manager' && p.approval_step === 3) {
                compiled.push({
                    id: permitId,
                    type: 'permit',
                    title: 'Persetujuan e-PTW Baru (Manager)',
                    message: `e-PTW baru di ${p.lokasi} oleh ${p.User?.nama || 'Staff'} memerlukan persetujuan Anda.`,
                    time: new Date(p.createdAt),
                    link: '/permits'
                });
            } else if (userRole === 'Admin') {
                compiled.push({
                    id: permitId,
                    type: 'permit',
                    title: `Persetujuan e-PTW Baru (Step ${p.approval_step})`,
                    message: `e-PTW baru di ${p.lokasi} oleh ${p.User?.nama || 'Staff'} membutuhkan persetujuan.`,
                    time: new Date(p.createdAt),
                    link: '/permits'
                });
            }
        } else {
            // Owner status updates
            if (isOwner) {
                compiled.push({
                    id: permitId,
                    type: 'permit',
                    title: 'Status e-PTW Diperbarui',
                    message: `Status e-PTW #${p.id_permit} Anda diperbarui menjadi: ${p.status}.`,
                    time: new Date(p.updatedAt || p.createdAt),
                    link: '/permits'
                });
            }
        }
    });

    // 2. Leave Notifications
    leaves.forEach(l => {
        const leaveId = `leave-${l.id_leave}-${l.updatedAt || l.createdAt}`;
        const isOwner = l.id_user === userId;
        const requesterName = l.User?.nama || l.userName || 'Pekerja';

        if (l.status === 'Pending') {
            if (userRole === 'Admin') {
                compiled.push({
                    id: leaveId,
                    type: 'leave',
                    title: 'Persetujuan Cuti/Izin Baru',
                    message: `${requesterName} mengajukan ${l.type} untuk ${l.start_date} s/d ${l.end_date}.`,
                    time: new Date(l.createdAt),
                    link: '/attendance'
                });
            }
        } else if (isOwner) {
            compiled.push({
                id: leaveId,
                type: 'leave',
                title: 'Status Cuti/Izin Diperbarui',
                message: `Pengajuan ${l.type} Anda telah ${l.status === 'Approved' ? 'disetujui' : 'ditolak'}.`,
                time: new Date(l.updatedAt || l.createdAt),
                link: '/attendance'
            });
        }
    });

    // 2. Hazard Notifications
    hazards.forEach(h => {
        const hazardId = `hazard-${h.id_hazard}-${h.updatedAt || h.createdAt}`;
        const isOwner = h.id_user === userId;

        if (!h.is_verified) {
            if (userRole === 'HSE' || userRole === 'Admin') {
                compiled.push({
                    id: hazardId,
                    type: 'hazard',
                    title: 'Validasi Laporan Bahaya',
                    message: `Laporan bahaya baru di ${h.lokasi} membutuhkan verifikasi K3.`,
                    time: new Date(h.createdAt),
                    link: '/hazards'
                });
            }
        } else {
            if (isOwner) {
                compiled.push({
                    id: hazardId,
                    type: 'hazard',
                    title: 'Laporan Bahaya Terverifikasi',
                    message: `Laporan bahaya #${h.id_hazard} Anda telah diverifikasi oleh HSE (+100 Poin).`,
                    time: new Date(h.updatedAt || h.createdAt),
                    link: '/hazards'
                });
            }
        }
    });

    // 3. CAPA Notifications
    actions.forEach(a => {
        const actionId = `action-${a.id_action}-${a.updatedAt || a.createdAt}`;
        if (a.assigned_to === userId && a.status === 'Open') {
            compiled.push({
                id: actionId,
                type: 'action',
                title: 'Tugas Perbaikan Baru (CAPA)',
                message: `Tugas perbaikan baru ditugaskan kepada Anda: ${a.description}`,
                time: new Date(a.createdAt),
                link: '/corrective-actions'
            });
        }
    });

    // Sort by time descending
    return compiled.sort((a, b) => b.time - a.time);
};

const DashboardLayout = ({ children }) => {
    const { user } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const { socket } = useSocket();
    const [isSidebarOpen, setSidebarOpen] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const [isNotifOpen, setNotifOpen] = useState(false);
    const [readNotifIds, setReadNotifIds] = useState(() => {
        if (!user) return [];
        const userId = user.id_user || user.id;
        return JSON.parse(localStorage.getItem(`read_notifications_${userId}`) || '[]');
    });
    const notifRef = useRef(null);

    useEffect(() => {
        if (!user) return;
        const userId = user.id_user || user.id;
        setReadNotifIds(JSON.parse(localStorage.getItem(`read_notifications_${userId}`) || '[]'));
    }, [user]);

    const fetchNotifications = useCallback(async () => {
        if (!user) return;
        try {
            const canReviewLeaves = user.role === 'Admin';
            const leaveEndpoint = canReviewLeaves ? '/attendance/all' : '/attendance/my-history';
            const [permitsRes, hazardsRes, actionsRes, attendanceRes] = await Promise.all([
                api.get('/permits').catch(() => ({ data: [] })),
                api.get('/hazards').catch(() => ({ data: [] })),
                api.get('/actions').catch(() => ({ data: [] })),
                api.get(leaveEndpoint).catch(() => ({ data: { leaves: [] } }))
            ]);

            const compiled = compileNotifications(
                permitsRes.data.data || permitsRes.data || [],
                hazardsRes.data.data || hazardsRes.data || [],
                actionsRes.data.data || actionsRes.data || [],
                attendanceRes.data?.leaves || [],
                user
            );
            setNotifications(compiled);
        } catch (error) {
            console.error('[DashboardLayout] Error fetching notifications:', error);
        }
    }, [user]);

    useEffect(() => {
        if (!user) return;

        fetchNotifications();
        const interval = setInterval(fetchNotifications, 60000); // Poll every 60 seconds (WebSocket handles real-time updates)

        return () => clearInterval(interval);
    }, [fetchNotifications, user]);

    useEffect(() => {
        if (!socket || !user) return;

        const refresh = () => fetchNotifications();

        const handleLeaveRequestUpdate = (data) => {
            const userId = user?.id_user || user?.id;
            if (data.id_user === userId || user?.role === 'Admin') {
                fetchNotifications();
            }
        };

        const handleNewLeaveRequest = () => {
            if (user?.role === 'Admin') {
                fetchNotifications();
            }
        };

        socket.on('NEW_LEAVE_REQUEST', handleNewLeaveRequest);
        socket.on('LEAVE_REQUEST_UPDATE', handleLeaveRequestUpdate);
        socket.on('PTW_REQUEST_CREATED', refresh);
        socket.on('PTW_STATUS_UPDATE', refresh);

        return () => {
            socket.off('NEW_LEAVE_REQUEST', handleNewLeaveRequest);
            socket.off('LEAVE_REQUEST_UPDATE', handleLeaveRequestUpdate);
            socket.off('PTW_REQUEST_CREATED', refresh);
            socket.off('PTW_STATUS_UPDATE', refresh);
        };
    }, [fetchNotifications, socket, user]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (notifRef.current && !notifRef.current.contains(event.target)) {
                setNotifOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const unreadCount = notifications.filter(n => !readNotifIds.includes(n.id)).length;

    const handleMarkRead = (id) => {
        if (readNotifIds.includes(id)) return;
        const updated = [...readNotifIds, id];
        setReadNotifIds(updated);
        if (user) {
            const userId = user.id_user || user.id;
            localStorage.setItem(`read_notifications_${userId}`, JSON.stringify(updated));
        }
    };

    const handleMarkAllRead = () => {
        const allIds = notifications.map(n => n.id);
        setReadNotifIds(allIds);
        if (user) {
            const userId = user.id_user || user.id;
            localStorage.setItem(`read_notifications_${userId}`, JSON.stringify(allIds));
        }
    };

    return (
        <div className="flex h-screen bg-slate-50 dark:bg-[#020617] text-slate-900 dark:text-white overflow-hidden transition-colors duration-500">
            {/* Desktop Sidebar */}
            <div className="hidden lg:block w-72 h-full flex-shrink-0">
                <Sidebar />
            </div>

            {/* Mobile Sidebar Overlay */}
            <div
                className={`fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 lg:hidden transition-opacity duration-500 ${isSidebarOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
                onClick={() => setSidebarOpen(false)}
            />

            {/* Mobile Sidebar Drawer */}
            <div className={`fixed inset-y-0 left-0 w-72 bg-white dark:bg-slate-900 z-50 transform transition-transform duration-500 ease-in-out lg:hidden ${isSidebarOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'}`}>
                <Sidebar onClose={() => setSidebarOpen(false)} />
            </div>

            <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">

                {/* Decorative background glow */}
                <div className="absolute top-0 right-0 w-1/2 h-1/2 bg-blue-500/5 blur-[120px] pointer-events-none -z-10"></div>
                <div className="absolute bottom-0 left-0 w-1/2 h-1/2 bg-indigo-500/5 blur-[120px] pointer-events-none -z-10"></div>

                <header className="h-20 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-6 md:px-10 bg-white/70 dark:bg-slate-900/70 backdrop-blur-md z-30 transition-colors duration-500">
                    <div className="flex items-center gap-5">
                        <button
                            onClick={() => setSidebarOpen(true)}
                            className="p-2.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl lg:hidden text-slate-600 dark:text-slate-400 active:scale-95 transition-all"
                        >
                            <Menu size={24} />
                        </button>
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight hidden sm:block">Nuraga Safety</h2>
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight sm:hidden">Nuraga</h2>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-blue-500/10 text-blue-600 dark:text-blue-500 rounded-lg text-xs font-black uppercase tracking-widest border border-blue-500/20">
                            <Shield size={14} /> System Secure
                        </div>

                        {/* Theme Toggle Button */}
                        <button
                            onClick={toggleTheme}
                            className="p-2.5 bg-slate-105 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl transition-all active:scale-95"
                            title={theme === 'dark' ? 'Ganti ke Mode Terang' : 'Ganti ke Mode Gelap'}
                        >
                            {theme === 'dark' ? <Sun size={20} className="text-amber-500" /> : <Moon size={20} className="text-indigo-600" />}
                        </button>

                        {/* Notification Dropdown */}
                        <div className="relative" ref={notifRef}>
                            <button
                                onClick={() => setNotifOpen(!isNotifOpen)}
                                className="p-2.5 bg-slate-105 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl transition-all relative active:scale-95"
                            >
                                <Bell size={20} />
                                {unreadCount > 0 && (
                                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-600 text-white text-[9px] font-black rounded-full flex items-center justify-center border-2 border-white dark:border-slate-900 animate-in zoom-in-50 duration-200">
                                        {unreadCount}
                                    </span>
                                )}
                            </button>

                            {isNotifOpen && (
                                <div className="absolute right-0 mt-3 w-80 sm:w-96 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-3 duration-250">
                                    <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                                        <h3 className="font-black text-sm uppercase tracking-tight text-slate-900 dark:text-white">Notifikasi</h3>
                                        {unreadCount > 0 && (
                                            <button
                                                onClick={handleMarkAllRead}
                                                className="text-[10px] font-black uppercase tracking-wider text-blue-600 hover:underline dark:text-blue-400"
                                            >
                                                Tandai Semua Dibaca
                                            </button>
                                        )}
                                    </div>
                                    <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                                        {notifications.length > 0 ? (
                                            notifications.map((n) => {
                                                const isUnread = !readNotifIds.includes(n.id);
                                                return (
                                                    <Link
                                                        key={n.id}
                                                        to={n.link}
                                                        onClick={() => {
                                                            handleMarkRead(n.id);
                                                            setNotifOpen(false);
                                                        }}
                                                        className={`p-4 flex gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors ${isUnread ? 'bg-blue-50/20 dark:bg-blue-950/10' : ''}`}
                                                    >
                                                        <div className="mt-0.5 shrink-0">
                                                            {n.type === 'permit' ? (
                                                                <div className="p-2 bg-blue-100 dark:bg-blue-950/40 text-blue-600 rounded-xl">
                                                                    <FileText size={16} />
                                                                </div>
                                                            ) : n.type === 'hazard' ? (
                                                                <div className="p-2 bg-amber-100 dark:bg-amber-950/40 text-amber-600 rounded-xl">
                                                                    <AlertTriangle size={16} />
                                                                </div>
                                                            ) : (
                                                                <div className="p-2 bg-purple-100 dark:bg-purple-950/40 text-purple-600 rounded-xl">
                                                                    <CheckCircle size={16} />
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className="flex-1 space-y-1">
                                                            <div className="flex items-center justify-between">
                                                                <p className={`text-xs font-black uppercase tracking-tight ${isUnread ? 'text-blue-600 dark:text-blue-400 font-extrabold' : 'text-slate-500'}`}>
                                                                    {n.title}
                                                                </p>
                                                                {isUnread && (
                                                                    <span className="w-1.5 h-1.5 bg-blue-600 rounded-full shrink-0" />
                                                                )}
                                                            </div>
                                                            <p className="text-xs font-medium text-slate-700 dark:text-slate-300 leading-relaxed">
                                                                {n.message}
                                                            </p>
                                                            <p className="text-[10px] text-slate-400 dark:text-slate-550 font-bold">
                                                                {new Date(n.time).toLocaleString('id-ID', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })}
                                                            </p>
                                                        </div>
                                                    </Link>
                                                );
                                            })
                                        ) : (
                                            <div className="p-8 text-center text-slate-400 dark:text-slate-500">
                                                <Bell className="mx-auto mb-2 text-slate-200 dark:text-slate-700" size={32} />
                                                <p className="text-xs font-medium italic">Tidak ada notifikasi baru</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto p-6 md:p-10 scroll-smooth">
                    <div className="max-w-7xl mx-auto h-full">
                        {children}
                    </div>
                </div>
            </main>
        </div>
    );
};

export default DashboardLayout;
