import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../store/AuthContext';
import { useTheme } from '../store/ThemeContext';
import api from '../api/axios';
import {
    User, Shield, Moon, Sun, Monitor, Bell, Lock, X, Camera,
    Check, AlertCircle, Phone, BadgeCheck, Briefcase, MapPin, Lock as LockIcon,
    Globe, Key, Brain, CloudSun, Cpu, MessageCircle, QrCode, RefreshCw, Send, Wifi, WifiOff, ChevronDown
} from 'lucide-react';
import Button from '../components/Button';
import Input from '../components/Input';

const ReadOnlyField = ({ icon: Icon, label, value, hint }) => (
    <div className="flex items-start gap-3 p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-700/50 group">
        <div className="p-1.5 bg-slate-200/60 dark:bg-slate-700/60 rounded-xl shrink-0 mt-0.5">
            <Icon size={14} className="text-slate-500 dark:text-slate-400" />
        </div>
        <div className="flex-1 min-w-0">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">{label}</p>
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">
                {value || <span className="text-slate-400 italic font-normal">Belum diisi</span>}
            </p>
            {hint && <p className="text-[10px] text-slate-400 mt-1">{hint}</p>}
        </div>
        <div className="shrink-0 self-center opacity-0 group-hover:opacity-100 transition-opacity" title="Hanya Admin yang bisa mengubah field ini">
            <LockIcon size={12} className="text-slate-300 dark:text-slate-600" />
        </div>
    </div>
);

const SettingsPage = () => {
    const { user, updateUser } = useAuth();
    const { theme, toggleTheme } = useTheme();

    const [activeTab, setActiveTab] = useState('account'); // 'account' or 'integration'

    // Edit Profile Modal State
    const [showProfileModal, setShowProfileModal] = useState(false);
    const [email, setEmail] = useState(user?.email || '');
    const [noWhatsapp, setNoWhatsapp] = useState(user?.no_whatsapp || '');
    const [jenisKelamin, setJenisKelamin] = useState(user?.jenis_kelamin || 'Laki-laki');
    const [file, setFile] = useState(null);
    const [preview, setPreview] = useState(null);
    const [profileLoading, setProfileLoading] = useState(false);
    const [profileError, setProfileError] = useState('');
    const [profileSuccess, setProfileSuccess] = useState('');
    const fileInputRef = useRef(null);

    // Change Password Modal State
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [passwordLoading, setPasswordLoading] = useState(false);
    const [passwordError, setPasswordError] = useState('');
    const [passwordSuccess, setPasswordSuccess] = useState('');

    // System Configurations State (Admin-only)
    const [configs, setConfigs] = useState({
        whatsapp_gateway_number: '',
        whatsapp_api_key: '',
        ai_fastapi_endpoint: '',
        open_meteo_endpoint: ''
    });
    const [configLoading, setConfigLoading] = useState(false);
    const [configSuccess, setConfigSuccess] = useState('');
    const [configError, setConfigError] = useState('');

    // WhatsApp Baileys State
    const [waStatus, setWaStatus] = useState('disconnected'); // 'disconnected' | 'qr_ready' | 'connected'
    const [waQR, setWaQR] = useState(null);
    const [waNumber, setWaNumber] = useState('');
    const [waTestPhone, setWaTestPhone] = useState('');
    const [waTestLoading, setWaTestLoading] = useState(false);
    const [waTestMsg, setWaTestMsg] = useState('');
    const [waLogoutLoading, setWaLogoutLoading] = useState(false);
    const eventSourceRef = useRef(null);

    useEffect(() => {
        if (user?.role === 'Admin') {
            fetchConfigs();
            initWaStream();
        }
        return () => {
            if (eventSourceRef.current) eventSourceRef.current.close();
        };
    }, [user]);

    const initWaStream = () => {
        // Close any existing stream
        if (eventSourceRef.current) eventSourceRef.current.close();

        const token = localStorage.getItem('token');
        const es = new EventSource(
            `/api/wa/stream?token=${encodeURIComponent(token)}`
        );
        eventSourceRef.current = es;

        es.onmessage = (e) => {
            try {
                const data = JSON.parse(e.data);
                if (data.type === 'qr') {
                    setWaQR(data.qr);
                    setWaStatus('qr_ready');
                } else if (data.type === 'status') {
                    setWaStatus(data.status);
                    setWaNumber(data.number || '');
                    if (data.status !== 'qr_ready') setWaQR(null);
                }
            } catch (_) { }
        };

        es.onerror = () => {
            // SSE will auto-reconnect; just keep trying
        };
    };

    const handleWaLogout = async () => {
        setWaLogoutLoading(true);
        try {
            await api.post('/wa/logout');
            setWaStatus('disconnected');
            setWaQR(null);
            setWaNumber('');
        } catch (err) {
            console.error('[WA] Logout error:', err);
        } finally {
            setWaLogoutLoading(false);
        }
    };

    const handleWaTest = async () => {
        if (!waTestPhone) return;
        setWaTestLoading(true);
        setWaTestMsg('');
        try {
            await api.post('/wa/test', { phone: waTestPhone });
            setWaTestMsg('✅ Test message berhasil dikirim!');
        } catch (err) {
            setWaTestMsg('❌ ' + (err.response?.data?.message || 'Gagal mengirim pesan.'));
        } finally {
            setWaTestLoading(false);
            setTimeout(() => setWaTestMsg(''), 4000);
        }
    };

    const fetchConfigs = async () => {
        setConfigLoading(true);
        setConfigError('');
        try {
            const res = await api.get('/config');
            setConfigs({
                whatsapp_gateway_number: res.data.whatsapp_gateway_number || '',
                whatsapp_api_key: res.data.whatsapp_api_key || '',
                ai_fastapi_endpoint: res.data.ai_fastapi_endpoint || '',
                open_meteo_endpoint: res.data.open_meteo_endpoint || ''
            });
        } catch (err) {
            console.error('[Settings] Error fetching config:', err);
            setConfigError(err.response?.data?.message || 'Gagal memuat konfigurasi integrasi.');
        } finally {
            setConfigLoading(false);
        }
    };

    const handleConfigSubmit = async (e) => {
        e.preventDefault();
        setConfigLoading(true);
        setConfigSuccess('');
        setConfigError('');
        try {
            await api.post('/config', configs);
            setConfigSuccess('Konfigurasi integrasi sistem berhasil disimpan!');
            setTimeout(() => setConfigSuccess(''), 3000);
        } catch (err) {
            console.error('[Settings] Error saving config:', err);
            setConfigError(err.response?.data?.message || 'Gagal menyimpan konfigurasi.');
        } finally {
            setConfigLoading(false);
        }
    };

    const handleFileChange = (e) => {
        const selectedFile = e.target.files[0];
        setFile(selectedFile);
        if (selectedFile) {
            setPreview(URL.createObjectURL(selectedFile));
        }
    };

    const handleProfileSubmit = async (e) => {
        e.preventDefault();
        setProfileLoading(true);
        setProfileError('');
        setProfileSuccess('');

        // Validate WhatsApp format
        if (noWhatsapp && !noWhatsapp.startsWith('+62')) {
            setProfileError('Nomor WhatsApp harus dimulai dengan +62 (contoh: +6281234567890)');
            setProfileLoading(false);
            return;
        }

        const formData = new FormData();
        formData.append('email', email);
        formData.append('no_whatsapp', noWhatsapp);
        formData.append('jenis_kelamin', jenisKelamin);
        if (file) {
            formData.append('foto', file);
        }

        try {
            const res = await api.put('/auth/profile', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            updateUser(res.data.user);
            setProfileSuccess('Profil berhasil diperbarui!');
            setTimeout(() => {
                setShowProfileModal(false);
                setPreview(null);
                setFile(null);
            }, 1000);
        } catch (err) {
            console.error(err);
            setProfileError(err.response?.data?.message || 'Gagal memperbarui profil');
        } finally {
            setProfileLoading(false);
        }
    };

    const handlePasswordSubmit = async (e) => {
        e.preventDefault();
        setPasswordLoading(true);
        setPasswordError('');
        setPasswordSuccess('');

        if (newPassword !== confirmPassword) {
            setPasswordError('Password baru dan konfirmasi password tidak cocok');
            setPasswordLoading(false);
            return;
        }

        try {
            await api.put('/auth/change-password', { currentPassword, newPassword });
            setPasswordSuccess('Password berhasil diubah!');
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
            setTimeout(() => setShowPasswordModal(false), 1000);
        } catch (err) {
            console.error(err);
            setPasswordError(err.response?.data?.message || 'Gagal mengubah password');
        } finally {
            setPasswordLoading(false);
        }
    };

    const openProfileModal = () => {
        setEmail(user?.email || '');
        setNoWhatsapp(user?.no_whatsapp || '');
        setJenisKelamin(user?.jenis_kelamin || 'Laki-laki');
        setPreview(null);
        setFile(null);
        setProfileError('');
        setProfileSuccess('');
        setShowProfileModal(true);
    };

    const openPasswordModal = () => {
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setPasswordError('');
        setPasswordSuccess('');
        setShowPasswordModal(true);
    };

    const avatarUrl = user?.foto ? `/uploads/${user.foto}` : null;

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-black text-slate-905 dark:text-white uppercase tracking-tighter">Pengaturan</h1>
                    <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Kelola preferensi akun personal dan parameter sistem K3.</p>
                </div>
            </div>

            {/* Tab Switched Header (Only visible for Admins) */}
            {user?.role === 'Admin' && (
                <div className="flex border-b border-slate-200 dark:border-slate-800 gap-6">
                    <button
                        onClick={() => setActiveTab('account')}
                        className={`pb-3 text-xs font-black uppercase tracking-wider transition-all border-b-2 ${activeTab === 'account'
                                ? 'border-blue-600 text-blue-600 dark:text-white font-black'
                                : 'border-transparent text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                            }`}
                    >
                        Pengaturan Akun
                    </button>
                    <button
                        onClick={() => setActiveTab('integration')}
                        className={`pb-3 text-xs font-black uppercase tracking-wider transition-all border-b-2 ${activeTab === 'integration'
                                ? 'border-blue-600 text-blue-600 dark:text-white font-black'
                                : 'border-transparent text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                            }`}
                    >
                        Integrasi Sistem
                    </button>
                </div>
            )}

            {activeTab === 'account' ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {/* Profile Section */}
                    <div className="md:col-span-1 space-y-6">
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 text-center shadow-sm">
                            {avatarUrl ? (
                                <img
                                    src={avatarUrl}
                                    alt={user?.nama}
                                    className="w-24 h-24 rounded-full object-cover mx-auto mb-4 border-4 border-white dark:border-slate-800 shadow-xl"
                                />
                            ) : (
                                <div className="w-24 h-24 bg-blue-600/10 text-blue-600 dark:text-blue-500 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-white dark:border-slate-800 shadow-xl font-bold text-xl">
                                    {user?.nama?.charAt(0).toUpperCase()}
                                </div>
                            )}
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white">{user?.nama}</h2>
                            <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-1">{user?.role}</p>
                            {user?.jabatan && (
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">{user.jabatan}</p>
                            )}
                            {user?.area_kerja && (
                                <span className="inline-block mt-2 text-[10px] font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 px-3 py-1 rounded-full border border-blue-500/20">
                                    📍 {user.area_kerja}
                                </span>
                            )}
                            <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-800">
                                <Button variant="secondary" className="w-full text-xs rounded-2xl py-3" onClick={openProfileModal}>Edit Profil</Button>
                            </div>
                        </div>
                    </div>

                    {/* Settings Sections */}
                    <div className="md:col-span-2 space-y-6">
                        {/* Data Identitas Operasional K3 */}
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 shadow-sm">
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-lg">
                                        <BadgeCheck size={20} />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-slate-900 dark:text-white">Data Identitas K3</h3>
                                        <p className="text-xs text-slate-400">Data operasional untuk validasi PTW & SOS</p>
                                    </div>
                                </div>
                                <span className="flex items-center gap-1.5 text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-3 py-1.5 rounded-full border border-amber-500/20">
                                    <LockIcon size={10} />
                                    Hanya Admin
                                </span>
                            </div>

                            <div className="space-y-3">
                                <ReadOnlyField
                                    icon={BadgeCheck}
                                    label="ID Pekerja / NIK"
                                    value={user?.nik}
                                    hint="Identitas unik untuk validasi setiap pelaporan"
                                />
                                <ReadOnlyField
                                    icon={Briefcase}
                                    label="Jabatan / Job Title"
                                    value={user?.jabatan}
                                    hint="Digunakan untuk validasi kewenangan mengajukan PTW"
                                />
                                <ReadOnlyField
                                    icon={MapPin}
                                    label="Area Kerja / Departemen"
                                    value={user?.area_kerja}
                                    hint="Digunakan untuk routing notifikasi SOS ke petugas yang tepat"
                                />
                            </div>

                            {/* Contact - partially editable */}
                            <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Informasi Personal & Kontak</p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="flex items-start gap-3 p-4 bg-emerald-50 dark:bg-emerald-900/10 rounded-2xl border border-emerald-200 dark:border-emerald-800/30">
                                        <div className="p-1.5 bg-emerald-500/10 rounded-xl shrink-0 mt-0.5">
                                            <Phone size={14} className="text-emerald-600 dark:text-emerald-400" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest mb-0.5">WhatsApp</p>
                                            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                                                {user?.no_whatsapp || <span className="text-slate-400 italic font-normal">Belum diisi — penting untuk alert SOS!</span>}
                                            </p>
                                        </div>
                                        <button
                                            onClick={openProfileModal}
                                            className="shrink-0 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline"
                                        >
                                            Edit
                                        </button>
                                    </div>

                                    <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-900/10 rounded-2xl border border-blue-200 dark:border-blue-800/30">
                                        <div className="p-1.5 bg-blue-500/10 rounded-xl shrink-0 mt-0.5">
                                            <User size={14} className="text-blue-600 dark:text-blue-400" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-0.5">Jenis Kelamin</p>
                                            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                                                {user?.jenis_kelamin || 'Laki-laki'}
                                            </p>
                                        </div>
                                        <button
                                            onClick={openProfileModal}
                                            className="shrink-0 text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:underline"
                                        >
                                            Edit
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Appearance */}
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 shadow-sm">
                            <div className="flex items-center gap-3 mb-8">
                                <div className="p-2 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-lg">
                                    <Monitor size={20} />
                                </div>
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Appearance</h3>
                            </div>

                            <div className="space-y-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="font-bold text-slate-900 dark:text-white">Dark Mode</p>
                                        <p className="text-sm text-slate-500 dark:text-slate-400">Adjust the system's visual theme.</p>
                                    </div>
                                    <button
                                        onClick={toggleTheme}
                                        className={`w-14 h-8 rounded-full p-1 transition-colors duration-300 flex items-center ${theme === 'dark' ? 'bg-blue-600' : 'bg-slate-200'}`}
                                    >
                                        <div className={`w-6 h-6 rounded-full bg-white shadow-md flex items-center justify-center transition-transform duration-300 ${theme === 'dark' ? 'translate-x-6' : 'translate-x-0'}`}>
                                            {theme === 'dark' ? <Moon size={14} className="text-blue-600" /> : <Sun size={14} className="text-amber-500" />}
                                        </div>
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Security */}
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 shadow-sm">
                            <div className="flex items-center gap-3 mb-8">
                                <div className="p-2 bg-red-500/10 text-red-600 dark:text-red-400 rounded-lg">
                                    <Lock size={20} />
                                </div>
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Security</h3>
                            </div>

                            <div className="space-y-4">
                                <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-700/50">
                                    <div className="flex items-center gap-3">
                                        <Shield size={18} className="text-slate-400" />
                                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Account Role</span>
                                    </div>
                                    <span className="text-xs font-black text-blue-600 dark:text-blue-400 uppercase">{user?.role} Access</span>
                                </div>
                                <Button variant="ghost" className="w-full text-left justify-start px-4 py-3 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-800" onClick={openPasswordModal}>Change Password</Button>
                            </div>
                        </div>

                        {/* Notifications */}
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 shadow-sm">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-2 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-lg">
                                    <Bell size={20} />
                                </div>
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Notifications</h3>
                            </div>
                            {user?.no_whatsapp ? (
                                <div className="flex items-center gap-3 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl">
                                    <Check size={16} className="text-emerald-600 shrink-0" />
                                    <div>
                                        <p className="text-sm font-bold text-emerald-800 dark:text-emerald-400">WhatsApp Aktif</p>
                                        <p className="text-xs text-emerald-700 dark:text-emerald-500">Alert darurat SOS akan dikirim ke {user.no_whatsapp}</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex items-center gap-3 p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl">
                                    <AlertCircle size={16} className="text-amber-600 shrink-0" />
                                    <div>
                                        <p className="text-sm font-bold text-amber-800 dark:text-amber-400">Nomor WhatsApp Belum Diisi</p>
                                        <p className="text-xs text-amber-700 dark:text-amber-500">Isi nomor WhatsApp agar bisa menerima alert darurat SOS</p>
                                    </div>
                                    <button onClick={openProfileModal} className="ml-auto shrink-0 text-xs font-bold text-amber-600 dark:text-amber-400 hover:underline whitespace-nowrap">
                                        Isi Sekarang →
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            ) : (
                /* INTEGRASI SISTEM TAB (ADMIN-ONLY) */
                <div className="max-w-2xl mx-auto">
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 shadow-sm">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-lg">
                                <Globe size={20} />
                            </div>
                            <div>
                                <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tighter">Integrasi API & Gateway</h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Ubah endpoint API eksternal dan gateway notifikasi secara dinamis.</p>
                            </div>
                        </div>

                        {configSuccess && (
                            <div className="flex items-center gap-3 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl mb-6 animate-in slide-in-from-top-4 duration-300">
                                <Check className="text-emerald-600 dark:text-emerald-400" size={16} />
                                <p className="text-sm font-medium text-emerald-800 dark:text-emerald-400">{configSuccess}</p>
                            </div>
                        )}

                        {configError && (
                            <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/30 rounded-2xl mb-6 animate-in slide-in-from-top-4 duration-300">
                                <AlertCircle className="text-red-650 dark:text-red-405" size={16} />
                                <p className="text-sm font-medium text-red-800 dark:text-red-400">{configError}</p>
                            </div>
                        )}

                        <form onSubmit={handleConfigSubmit} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                                        <Phone size={12} className="text-slate-450" /> WhatsApp Gateway Number
                                    </label>
                                    <Input
                                        placeholder="Contoh: +6281234567890"
                                        value={configs.whatsapp_gateway_number}
                                        onChange={(e) => setConfigs({ ...configs, whatsapp_gateway_number: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                                        <Key size={12} className="text-slate-455" /> WhatsApp API Key / Token
                                    </label>
                                    <Input
                                        type="password"
                                        placeholder="Token otorisasi gateway"
                                        value={configs.whatsapp_api_key}
                                        onChange={(e) => setConfigs({ ...configs, whatsapp_api_key: e.target.value })}
                                        required
                                    />
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                                    <Brain size={12} className="text-slate-450" /> AI FastAPI Service Endpoint
                                </label>
                                <Input
                                    placeholder="Contoh: http://localhost:8000/api/v1"
                                    value={configs.ai_fastapi_endpoint}
                                    onChange={(e) => setConfigs({ ...configs, ai_fastapi_endpoint: e.target.value })}
                                    required
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                                    <CloudSun size={12} className="text-slate-450" /> Open-Meteo Weather API URL
                                </label>
                                <Input
                                    placeholder="Contoh: https://api.open-meteo.com/v1/forecast"
                                    value={configs.open_meteo_endpoint}
                                    onChange={(e) => setConfigs({ ...configs, open_meteo_endpoint: e.target.value })}
                                    required
                                />
                            </div>

                            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                                <Button type="submit" className="px-6 rounded-2xl py-3.5 shadow-xl shadow-blue-500/20" loading={configLoading}>
                                    Simpan Integrasi
                                </Button>
                            </div>
                        </form>
                    </div>

                    {/* ── WhatsApp Baileys Connection Panel ── */}
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 shadow-sm mt-6">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-lg">
                                    <MessageCircle size={20} />
                                </div>
                                <div>
                                    <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tighter">WhatsApp Baileys</h3>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Koneksi langsung via scan QR — tanpa biaya API</p>
                                </div>
                            </div>
                            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${waStatus === 'connected' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30' : waStatus === 'qr_ready' ? 'bg-amber-500/10 text-amber-600 border-amber-500/30' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700'}`}>
                                {waStatus === 'connected' ? <Wifi size={11} /> : <WifiOff size={11} />}
                                <span className="ml-1">{waStatus === 'connected' ? 'Terhubung' : waStatus === 'qr_ready' ? 'Scan QR' : 'Terputus'}</span>
                            </div>
                        </div>

                        {waStatus === 'connected' && (
                            <div className="space-y-4">
                                <div className="flex items-center gap-3 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl">
                                    <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse" />
                                    <div>
                                        <p className="text-sm font-bold text-emerald-800 dark:text-emerald-400">WhatsApp Aktif & Terhubung</p>
                                        {waNumber && <p className="text-xs text-emerald-600 dark:text-emerald-500">Nomor: {waNumber}</p>}
                                    </div>
                                </div>
                                <div className="flex gap-3">
                                    <input type="tel" placeholder="Nomor test: +62812..." value={waTestPhone} onChange={(e) => setWaTestPhone(e.target.value)} className="flex-1 px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                                    <button onClick={handleWaTest} disabled={waTestLoading || !waTestPhone} className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-colors">
                                        {waTestLoading ? <RefreshCw size={14} className="animate-spin" /> : <Send size={14} />} Test Kirim
                                    </button>
                                </div>
                                {waTestMsg && <p className="text-xs font-bold text-center py-2">{waTestMsg}</p>}
                                <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                                    <Button variant="ghost" className="w-full text-red-600 dark:text-red-400 hover:bg-red-500/10 rounded-2xl py-3 text-xs" onClick={handleWaLogout} loading={waLogoutLoading}>Putuskan Sesi & Reset QR</Button>
                                </div>
                            </div>
                        )}

                        {waStatus === 'qr_ready' && waQR && (
                            <div className="text-center space-y-4">
                                <div className="inline-block p-4 bg-white dark:bg-slate-800 border-4 border-amber-400/40 rounded-3xl shadow-xl">
                                    <img src={waQR} alt="WhatsApp QR Code" className="w-56 h-56 mx-auto" />
                                </div>
                                <div className="space-y-1">
                                    <p className="text-sm font-bold text-slate-800 dark:text-slate-200">Scan QR ini dengan HP Anda</p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">WhatsApp → Perangkat Tertaut → Tautkan Perangkat → Scan</p>
                                    <p className="text-[10px] text-amber-600 font-bold animate-pulse">QR diperbarui otomatis setiap ~30 detik</p>
                                </div>
                            </div>
                        )}

                        {waStatus === 'disconnected' && !waQR && (
                            <div className="text-center py-8 space-y-3">
                                <WifiOff size={48} className="mx-auto text-slate-200 dark:text-slate-700" />
                                <p className="text-sm font-bold text-slate-500">WhatsApp tidak terhubung</p>
                                <p className="text-xs text-slate-400">Backend sedang mencoba menyambung... QR akan muncul otomatis.</p>
                                <button onClick={initWaStream} className="flex items-center gap-2 mx-auto text-xs font-bold text-blue-600 hover:text-blue-700">
                                    <RefreshCw size={12} /> Refresh Status
                                </button>
                            </div>
                        )}

                        <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-800">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Cara Kerja</p>
                            <div className="grid grid-cols-3 gap-3 text-center">
                                {[{ n: '1', t: 'Scan QR', d: 'WA → Perangkat Tertaut' }, { n: '2', t: 'Session Tersimpan', d: 'Tidak perlu scan ulang' }, { n: '3', t: 'Notif Otomatis', d: 'PTW, SOS, Insiden terkirim' }].map(s => (
                                    <div key={s.n} className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl">
                                        <div className="w-7 h-7 bg-emerald-500/10 text-emerald-600 font-black text-xs rounded-full flex items-center justify-center mx-auto mb-2">{s.n}</div>
                                        <p className="text-[10px] font-bold text-slate-700 dark:text-slate-300">{s.t}</p>
                                        <p className="text-[9px] text-slate-400 mt-0.5">{s.d}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Profile Modal */}
            {showProfileModal && (
                <div 
                    onClick={() => setShowProfileModal(false)}
                    className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4"
                >
                    <div 
                        onClick={(e) => e.stopPropagation()}
                        className="bg-white dark:bg-slate-900 border-t-8 border-blue-600 w-full max-w-md rounded-3xl p-6 md:p-8 shadow-2xl animate-in zoom-in-95 duration-200"
                    >
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Edit Profil</h2>
                                <p className="text-xs text-slate-400 mt-0.5">Foto, Email & WhatsApp dapat Anda ubah sendiri</p>
                            </div>
                            <button onClick={() => setShowProfileModal(false)} className="p-2 text-slate-400 hover:text-slate-600 transition-colors">
                                <X size={18} />
                            </button>
                        </div>

                        <form onSubmit={handleProfileSubmit} className="space-y-5">
                            {/* Avatar Picker */}
                            <div className="flex flex-col items-center gap-3">
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    className="hidden"
                                    accept="image/*"
                                    onChange={handleFileChange}
                                />
                                <div className="relative group cursor-pointer" onClick={() => fileInputRef.current.click()}>
                                    {preview ? (
                                        <img src={preview} alt="Preview" className="w-24 h-24 rounded-full object-cover border-4 border-blue-500/30" />
                                    ) : avatarUrl ? (
                                        <img src={avatarUrl} alt={user?.nama} className="w-24 h-24 rounded-full object-cover border-4 border-slate-200 dark:border-slate-800" />
                                    ) : (
                                        <div className="w-24 h-24 bg-blue-600/10 text-blue-600 dark:text-blue-500 rounded-full flex items-center justify-center border-4 border-slate-200 dark:border-slate-800 font-bold text-xl">
                                            {user?.nama?.charAt(0).toUpperCase()}
                                        </div>
                                    )}
                                    <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Camera size={20} className="text-white" />
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current.click()}
                                    className="text-xs text-blue-600 dark:text-blue-400 font-bold hover:underline"
                                >
                                    Pilih Foto Profil
                                </button>
                            </div>

                            {/* Read-only name info */}
                            <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-700/50">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Nama Lengkap (Dikunci)</p>
                                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{user?.nama}</p>
                            </div>

                            <Input
                                label="Email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />

                            <div className="flex flex-col gap-1.5 w-full">
                                <label className="text-sm font-medium text-slate-600 dark:text-slate-300">
                                    Nomor WhatsApp
                                    <span className="ml-2 text-[10px] text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-full">Penting untuk alert SOS</span>
                                </label>
                                <input
                                    type="tel"
                                    placeholder="+62812345678"
                                    value={noWhatsapp}
                                    onChange={(e) => setNoWhatsapp(e.target.value)}
                                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                />
                                <p className="text-[10px] text-slate-400 pl-1">Format wajib: +62xxx (kode negara Indonesia)</p>
                            </div>

                            <div className="flex flex-col gap-1.5 w-full">
                                <label className="text-sm font-medium text-slate-600 dark:text-slate-300">Jenis Kelamin</label>
                                <div className="relative w-full">
                                    <select
                                        value={jenisKelamin}
                                        onChange={(e) => setJenisKelamin(e.target.value)}
                                        required
                                        className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all appearance-none pr-10 font-medium"
                                    >
                                        <option value="Laki-laki">Laki-laki</option>
                                        <option value="Perempuan">Perempuan</option>
                                    </select>
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 dark:text-slate-500">
                                        <ChevronDown size={18} />
                                    </div>
                                </div>
                            </div>

                            {profileError && (
                                <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 text-red-600 text-xs font-bold rounded-xl">
                                    <AlertCircle size={14} />
                                    <span>{profileError}</span>
                                </div>
                            )}

                            {profileSuccess && (
                                <div className="flex items-center gap-2 p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 text-xs font-bold rounded-xl">
                                    <Check size={14} />
                                    <span>{profileSuccess}</span>
                                </div>
                            )}

                            <div className="flex gap-4 pt-2">
                                <Button type="button" variant="ghost" onClick={() => setShowProfileModal(false)} className="flex-1 rounded-2xl py-4">Batal</Button>
                                <Button type="submit" className="flex-1 rounded-2xl py-4 shadow-xl shadow-blue-500/20" loading={profileLoading}>
                                    {profileLoading ? 'Menyimpan...' : 'Simpan'}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Change Password Modal */}
            {showPasswordModal && (
                <div 
                    onClick={() => setShowPasswordModal(false)}
                    className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4"
                >
                    <div 
                        onClick={(e) => e.stopPropagation()}
                        className="bg-white dark:bg-slate-900 border-t-8 border-blue-600 w-full max-w-md rounded-3xl p-6 md:p-8 shadow-2xl animate-in zoom-in-95 duration-200"
                    >
                        <div className="flex justify-between items-start mb-6">
                            <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Ganti Password</h2>
                            <button onClick={() => setShowPasswordModal(false)} className="p-2 text-slate-400 hover:text-slate-600 transition-colors">
                                <X size={18} />
                            </button>
                        </div>

                        <form onSubmit={handlePasswordSubmit} className="space-y-5">
                            <Input
                                label="Password Saat Ini"
                                type="password"
                                value={currentPassword}
                                onChange={(e) => setCurrentPassword(e.target.value)}
                                required
                            />

                            <Input
                                label="Password Baru"
                                type="password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                required
                            />

                            <Input
                                label="Konfirmasi Password Baru"
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                            />

                            {passwordError && (
                                <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 text-red-600 text-xs font-bold rounded-xl">
                                    <AlertCircle size={14} />
                                    <span>{passwordError}</span>
                                </div>
                            )}

                            {passwordSuccess && (
                                <div className="flex items-center gap-2 p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 text-xs font-bold rounded-xl">
                                    <Check size={14} />
                                    <span>{passwordSuccess}</span>
                                </div>
                            )}

                            <div className="flex gap-4 pt-2">
                                <Button type="button" variant="ghost" onClick={() => setShowPasswordModal(false)} className="flex-1 rounded-2xl py-4">Batal</Button>
                                <Button type="submit" className="flex-1 rounded-2xl py-4 shadow-xl shadow-blue-500/20" loading={passwordLoading}>
                                    {passwordLoading ? 'Memproses...' : 'Ubah Password'}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SettingsPage;
