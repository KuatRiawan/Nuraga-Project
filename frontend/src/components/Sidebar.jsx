import { NavLink } from 'react-router-dom';
import {
    LayoutDashboard, AlertCircle, FileText, CheckSquare, Settings, LogOut,
    Shield, Award, Zap, FileCheck, Sun, Moon, X, Users, ClipboardList, Trophy, History
} from 'lucide-react';
import { useAuth } from '../store/AuthContext';
import { useTheme } from '../store/ThemeContext';

const ROLE_COLORS = {
    Admin: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
    HSE: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
    Supervisor: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    Manager: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
    Operator: 'bg-slate-500/10 text-slate-600 dark:text-slate-400',
    Kontraktor: 'bg-orange-500/10 text-orange-600 dark:text-orange-400',
};

const Sidebar = ({ onClose }) => {
    const { user, logout } = useAuth();
    const { theme, toggleTheme } = useTheme();

    const allMenuItems = [
        {
            section: 'UTAMA',
            items: [
                { name: 'Dashboard', icon: <LayoutDashboard size={20} />, path: '/', roles: ['Admin', 'HSE', 'Supervisor', 'Manager', 'Operator', 'Kontraktor'] },
            ],
        },
        {
            section: 'PELAPORAN',
            items: [
                { name: 'Laporan Bahaya', icon: <AlertCircle size={20} />, path: '/hazards', roles: ['Admin', 'HSE', 'Supervisor', 'Manager', 'Operator', 'Kontraktor'] },
                { name: 'Laporan Insiden', icon: <FileText size={20} />, path: '/incidents', roles: ['Admin', 'HSE', 'Supervisor', 'Manager', 'Operator'] },
            ],
        },
        {
            section: 'OPERASIONAL',
            items: [
                { name: 'Izin Kerja (e-PTW)', icon: <FileCheck size={20} />, path: '/permits', roles: ['Admin', 'HSE', 'Supervisor', 'Manager', 'Operator', 'Kontraktor'] },
                { name: 'Safety Audit', icon: <CheckSquare size={20} />, path: '/audits', roles: ['Admin', 'HSE', 'Supervisor'] },
                { name: 'Tindakan Perbaikan', icon: <ClipboardList size={20} />, path: '/corrective-actions', roles: ['Admin', 'HSE', 'Supervisor', 'Manager'] },
                { name: 'Sertifikasi', icon: <Award size={20} />, path: '/certifications', roles: ['Admin', 'HSE', 'Supervisor', 'Manager', 'Operator', 'Kontraktor'] },
            ],
        },
        {
            section: 'DARURAT',
            items: [
                { name: 'Emergency Response', icon: <Zap size={20} />, path: '/emergency', roles: ['Admin', 'HSE', 'Supervisor', 'Manager'] },
            ],
        },
        {
            section: 'ADMINISTRASI',
            items: [
                { name: 'Safety Rewards', icon: <Trophy size={20} />, path: '/gamification', roles: ['Admin', 'HSE', 'Supervisor', 'Manager', 'Operator'] },
                { name: 'Manajemen User', icon: <Users size={20} />, path: '/users', roles: ['Admin'] },
                { name: 'Log Sistem', icon: <History size={20} />, path: '/logs', roles: ['Admin'] },
                { name: 'Pengaturan', icon: <Settings size={20} />, path: '/settings', roles: ['Admin', 'HSE', 'Supervisor', 'Manager', 'Operator', 'Kontraktor'] },
            ],
        },
    ];

    const roleColor = ROLE_COLORS[user?.role] || ROLE_COLORS.Operator;

    return (
        <div className="flex flex-col h-full bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 transition-colors duration-300">
            {/* Logo */}
            <div className="p-6 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-blue-600 rounded-xl text-white shadow-lg shadow-blue-500/20">
                        <Shield size={22} />
                    </div>
                    <div>
                        <h2 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">Nuraga</h2>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Safety Intelligence</p>
                    </div>
                </div>
                {onClose && (
                    <button onClick={onClose} className="lg:hidden p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">
                        <X size={20} />
                    </button>
                )}
            </div>

            {/* Theme Toggle */}
            <div className="px-4 mb-3">
                <button
                    onClick={toggleTheme}
                    className="w-full flex items-center gap-3 px-4 py-2.5 bg-slate-50 dark:bg-slate-800 rounded-2xl text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-white transition-all border border-slate-100 dark:border-slate-700/50"
                >
                    <div className="w-7 h-7 rounded-lg bg-white dark:bg-slate-700 flex items-center justify-center shadow-sm">
                        {theme === 'dark' ? <Sun size={16} className="text-amber-500" /> : <Moon size={16} className="text-indigo-600" />}
                    </div>
                    <span className="text-sm font-bold">{theme === 'dark' ? 'Mode Terang' : 'Mode Gelap'}</span>
                </button>
            </div>

            {/* Navigation Sections */}
            <div className="flex-1 px-3 space-y-4 overflow-y-auto pb-4">
                {allMenuItems.map((section) => {
                    const visibleItems = section.items.filter(item => item.roles.includes(user?.role));
                    if (visibleItems.length === 0) return null;
                    return (
                        <div key={section.section}>
                            <p className="text-[9px] font-black text-slate-300 dark:text-slate-600 uppercase tracking-widest px-4 mb-2">{section.section}</p>
                            <div className="space-y-0.5">
                                {visibleItems.map((item) => (
                                    <NavLink
                                        key={item.path}
                                        to={item.path}
                                        end={item.path === '/'}
                                        onClick={() => onClose && onClose()}
                                        className={({ isActive }) =>
                                            `flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group
                                            ${isActive
                                                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                                                : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                                            }`
                                        }
                                    >
                                        <div className="transition-transform group-hover:scale-110">{item.icon}</div>
                                        <span className="font-bold text-sm">{item.name}</span>
                                    </NavLink>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* User Profile */}
            <div className="p-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
                <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-700/50">
                    {user?.foto ? (
                        <img
                            src={`/uploads/${user.foto}`}
                            alt={user.nama}
                            className="w-10 h-10 rounded-full object-cover border border-blue-200 dark:border-blue-500/20 shrink-0"
                        />
                    ) : (
                        <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-600/20 flex items-center justify-center text-blue-600 dark:text-blue-400 font-black text-sm border border-blue-200 dark:border-blue-500/20 shrink-0">
                            {user?.nama?.charAt(0).toUpperCase()}
                        </div>
                    )}
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-black text-slate-900 dark:text-white truncate">{user?.nama}</p>
                        <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${roleColor}`}>
                            {user?.role}
                        </span>
                    </div>
                </div>

                <button
                    onClick={logout}
                    className="flex items-center gap-3 w-full px-4 py-2.5 text-slate-500 dark:text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-all group"
                >
                    <LogOut size={18} className="group-hover:translate-x-1 transition-transform" />
                    <span className="font-bold text-sm">Keluar Sistem</span>
                </button>
            </div>
        </div>
    );
};

export default Sidebar;
