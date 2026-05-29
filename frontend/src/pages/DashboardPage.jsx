import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { AlertCircle, FileText, CheckCircle, Clock, Zap, Download, Shield, Trophy, X, Sun, Thermometer, ClipboardCheck, Activity, AlertTriangle, Star, Users } from 'lucide-react';
import EmergencyControls from '../components/EmergencyControls';
import SafetyCharts from '../components/SafetyCharts';
import { generateMonthlyReport } from '../utils/reportGenerator';
import Button from '../components/Button';
import { useAuth } from '../store/AuthContext';

const FFD_QUESTIONS = [
    { id: 1, text: 'Apakah Anda tidur cukup (lebih dari 6 jam) semalam?' },
    { id: 2, text: 'Apakah Anda dalam kondisi sehat fisik hari ini?' },
    { id: 3, text: 'Apakah Anda bebas dari pengaruh obat-obatan atau alkohol?' },
];

const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return 'Selamat Pagi';
    if (hour >= 12 && hour < 15) return 'Selamat Siang';
    if (hour >= 15 && hour < 19) return 'Selamat Sore';
    return 'Selamat Malam';
};

const SAFETY_SLOGANS = [
    "Utamakan Keselamatan dan Kesehatan Kerja!",
    "Kerja Aman, Pulang Selamat!",
    "Safety Starts with Me – Keselamatan Mulai Dari Saya!",
    "Keluarga Menanti Anda di Rumah, Selalu Bekerja dengan Aman!",
    "Hati-hati dalam Bekerja, Patuhi Selalu Prosedur K3!",
    "Zero Accident Adalah Target Kita Bersama!"
];

const DashboardPage = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [stats, setStats] = useState({
        totalHazards: 0,
        totalIncidents: 0,
        totalAudits: 0,
        pendingActions: 0,
    });
    const [loading, setLoading] = useState(true);
    const [hasTimeout, setHasTimeout] = useState(false);
    const [retryCount, setRetryCount] = useState(0);
    const [totalUsersCount, setTotalUsersCount] = useState(0);
    const [sloganIndex, setSloganIndex] = useState(0);

    // Fit for Duty state — must be before any early returns
    const [ffdState, setFfdState] = useState(() => {
        const savedStatus = localStorage.getItem('ffd_status');
        const savedDate = localStorage.getItem('ffd_date');
        const today = new Date().toDateString();
        if (savedStatus && savedDate === today) {
            return savedStatus;
        }
        return 'pending';
    });
    const [ffdAnswers, setFfdAnswers] = useState({ 1: null, 2: null, 3: null });

    const [activePermitsCount, setActivePermitsCount] = useState(0);
    const [permits, setPermits] = useState([]);
    const [nearMissCount, setNearMissCount] = useState(0);
    const [auditsLast30Days, setAuditsLast30Days] = useState(0);
    const [expiringCertifications, setExpiringCertifications] = useState([]);
    const [expiredCertifications, setExpiredCertifications] = useState([]);
    const [weatherData, setWeatherData] = useState({
        temp: 31.5,
        aqi: 45,
        aqiStatus: 'Baik',
        heatStress: 'AMAN',
        loading: true
    });

    const fetchWeather = async (latitude, longitude) => {
        try {
            const [weatherRes, aqiRes] = await Promise.all([
                fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m`).then(r => r.json()),
                fetch(`https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${latitude}&longitude=${longitude}&current=us_aqi`).then(r => r.json())
            ]);

            const temp = weatherRes.current?.temperature_2m ?? 31.5;
            const aqi = aqiRes.current?.us_aqi ?? 45;

            let aqiStatus = 'Baik';
            if (aqi > 100) {
                aqiStatus = 'Tidak Sehat';
            } else if (aqi > 50) {
                aqiStatus = 'Sedang';
            }

            const heatStress = temp > 35 ? 'WASPADA / BAHAYA' : 'AMAN';

            setWeatherData({
                temp,
                aqi,
                aqiStatus,
                heatStress,
                loading: false
            });
        } catch (err) {
            console.error('Failed to fetch weather data:', err);
            setWeatherData(prev => ({ ...prev, loading: false }));
        }
    };

    const handleStartCheckIn = () => {
        if (expiredCertifications.length > 0) {
            alert(`Akses Diblokir! SIO/Lisensi Anda (${expiredCertifications.map(c => c.jenis_sertifikasi).join(', ')}) telah kedaluwarsa. Harap segera melapor ke Safety Officer.`);
            return;
        }
        setFfdState('answering');
    };

    const [myHazards, setMyHazards] = useState([]);
    const [myActions, setMyActions] = useState([]);
    const [complianceChecklist, setComplianceChecklist] = useState([
        { id: 1, text: 'Penyediaan APD lengkap & layak pakai', checked: true },
        { id: 2, text: 'Pemberlakuan Sistem Izin Kerja Aman (PTW)', checked: true },
        { id: 3, text: 'Pemeriksaan & kalibrasi berkala alat K3/APAR', checked: false },
        { id: 4, text: 'Pembentukan P2K3 & penunjukan Ahli K3', checked: true },
        { id: 5, text: 'Pelatihan induksi K3 bagi seluruh pekerja baru', checked: false },
    ]);

    const handleToggleCompliance = (id) => {
        const updated = complianceChecklist.map(item =>
            item.id === id ? { ...item, checked: !item.checked } : item
        );
        setComplianceChecklist(updated);
    };

    const complianceScore = Math.round(
        (complianceChecklist.filter(item => item.checked).length / complianceChecklist.length) * 100
    );

    const handleDownloadReport = async () => {
        try {
            const res = await api.get('/stats/report-data');
            generateMonthlyReport(res.data);
        } catch (err) {
            console.error(err);
            alert('Failed to generate report');
        }
    };
    const handleExportProactiveStats = () => {
        const headers = ['Indikator', 'Realisasi', 'Target', 'Pencapaian (%)', 'Keterangan'];
        const rows = [
            ['Rasio Pelaporan Near Miss', nearMissCount, 10, `${Math.min((nearMissCount / 10) * 100, 100)}%`, 'Mengukur keaktifan temuan hampir celaka'],
            ['Penyelesaian Safety Patrol', auditsLast30Days, 12, `${Math.round(Math.min((auditsLast30Days / 12) * 100, 100))}%`, 'Inspeksi rutin dalam 30 hari terakhir']
        ];
        const csvContent = "data:text/csv;charset=utf-8,\uFEFF"
            + [headers.map(h => `"${h}"`).join(','), ...rows.map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))].join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "indikator_k3_proaktif.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleExportComplianceStats = () => {
        const headers = ['ID', 'Persyaratan Kepatuhan K3', 'Status'];
        const rows = complianceChecklist.map(item => [
            item.id,
            item.text,
            item.checked ? 'Patuh / Terpenuhi' : 'Belum Terpenuhi'
        ]);
        const csvContent = "data:text/csv;charset=utf-8,\uFEFF"
            + [headers.map(h => `"${h}"`).join(','), ...rows.map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))].join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `kepatuhan_regulasi_k3_${complianceScore}percent.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };


    useEffect(() => {
        let isMounted = true;
        setHasTimeout(false);
        setLoading(true);

        const timer = setTimeout(() => {
            if (isMounted) {
                setHasTimeout(true);
                setLoading(false);
            }
        }, 8000);

        const fetchStats = async () => {
            try {
                const certsUrl = (user?.role === 'Operator' || user?.role === 'Kontraktor')
                    ? '/certifications/my'
                    : '/certifications/all';

                const usersPromise = user?.role === 'Admin'
                    ? api.get('/users').catch(() => ({ data: [] }))
                    : Promise.resolve({ data: [] });

                const [statsRes, permitsRes, reportRes, incidentsRes, certsRes, hazardsRes, actionsRes, usersRes] = await Promise.all([
                    api.get('/stats').catch(() => ({ data: { totalHazards: 0, totalIncidents: 0, totalAudits: 0, pendingActions: 0 } })),
                    api.get('/permits').catch(() => ({ data: [] })),
                    api.get('/stats/report-data').catch(() => ({ data: { summary: { audits: 0 } } })),
                    api.get('/incidents').catch(() => ({ data: [] })),
                    api.get(certsUrl).catch(() => ({ data: [] })),
                    api.get('/hazards').catch(() => ({ data: [] })),
                    api.get('/actions').catch(() => ({ data: [] })),
                    usersPromise
                ]);

                if (!isMounted) return;

                clearTimeout(timer);

                setStats(statsRes.data);
                setPermits(permitsRes.data);

                // 'Approved' = menunggu mulai pekerjaan, 'Active' = sedang berjalan
                const activeCount = permitsRes.data.filter(p =>
                    p.status === 'Approved' || p.status === 'Active'
                ).length;
                setActivePermitsCount(activeCount);

                setAuditsLast30Days(reportRes.data?.summary?.audits || 0);

                const thirtyDaysAgo = new Date();
                thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
                const nearMisses = incidentsRes.data.filter(i =>
                    i.kategori === 'Near Miss' && new Date(i.createdAt) >= thirtyDaysAgo
                );
                setNearMissCount(nearMisses.length);

                const now = new Date();
                const expiring = certsRes.data.filter(cert => {
                    const expDate = new Date(cert.tanggal_expired);
                    const diffTime = expDate - now;
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                    return diffDays > 0 && diffDays <= 30;
                });
                setExpiringCertifications(expiring);

                const expired = certsRes.data.filter(cert => {
                    const expDate = new Date(cert.tanggal_expired);
                    return expDate < now;
                });
                setExpiredCertifications(expired);

                if (user) {
                    const userId = user.id_user || user.id;
                    const userHazards = hazardsRes.data.filter(h => h.id_user === userId);
                    setMyHazards(userHazards);

                    const userActions = actionsRes.data.filter(a => a.assigned_to === userId);
                    setMyActions(userActions);

                    if (user.role === 'Admin') {
                        setTotalUsersCount(usersRes.data.length);
                    }
                }
            } catch (err) {
                console.error(err);
            } finally {
                if (isMounted) {
                    clearTimeout(timer);
                    setLoading(false);
                }
            }
        };
        fetchStats();

        // Get weather data dynamically
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    if (isMounted) fetchWeather(position.coords.latitude, position.coords.longitude);
                },
                (error) => {
                    console.warn("Geolocation denied/failed, using fallback (Jakarta):", error.message);
                    if (isMounted) fetchWeather(-6.2088, 106.8456);
                }
            );
        } else {
            if (isMounted) fetchWeather(-6.2088, 106.8456);
        }

        return () => {
            isMounted = false;
            clearTimeout(timer);
        };
    }, [user, retryCount]);

    useEffect(() => {
        const interval = setInterval(() => {
            setSloganIndex((prev) => (prev + 1) % SAFETY_SLOGANS.length);
        }, 5000);
        return () => clearInterval(interval);
    }, []);

    const handleFfdAnswer = (questionId, answer) => {
        const updated = { ...ffdAnswers, [questionId]: answer };
        setFfdAnswers(updated);

        // Check if all answered
        const allAnswered = Object.values(updated).every(v => v !== null);
        if (allAnswered) {
            const allYes = Object.values(updated).every(v => v === true);
            const status = allYes ? 'passed' : 'blocked';
            setTimeout(() => {
                setFfdState(status);
                localStorage.setItem('ffd_status', status);
                localStorage.setItem('ffd_date', new Date().toDateString());
            }, 400);
        }
    };

    const statCards = [
        {
            title: 'Total Insiden',
            value: stats.totalIncidents,
            icon: <FileText className="text-red-400" />,
            trend: 'Reported',
            trendPercentage: stats.totalIncidents > 0 ? '+12%' : '0%',
            trendColor: stats.totalIncidents > 0 ? 'text-red-500' : 'text-slate-400 dark:text-slate-500',
            color: 'bg-red-500/10'
        },
        {
            title: 'Total Bahaya',
            value: stats.totalHazards,
            icon: <AlertCircle className="text-amber-400" />,
            trend: 'Active',
            trendPercentage: stats.totalHazards > 0 ? '+8%' : '0%',
            trendColor: stats.totalHazards > 0 ? 'text-red-500' : 'text-slate-400 dark:text-slate-500',
            color: 'bg-amber-500/10'
        },
        {
            title: 'TRIR Index',
            value: '1.24',
            icon: <Zap className="text-emerald-400" />,
            trend: 'Target < 1.5',
            trendPercentage: '-4%',
            trendColor: 'text-emerald-500',
            color: 'bg-emerald-500/10'
        },
        {
            title: 'LTI Rate',
            value: '0.00',
            icon: <CheckCircle className="text-blue-400" />,
            trend: '365 Hari Terakhir',
            trendPercentage: '0%',
            trendColor: 'text-slate-400 dark:text-slate-500',
            color: 'bg-blue-500/10'
        },
    ];

    const handleRetry = () => {
        setRetryCount(prev => prev + 1);
    };

    if (hasTimeout) return (
        <div className="flex flex-col items-center justify-center p-8 md:p-12 bg-white dark:bg-slate-900 border border-red-500/20 rounded-[2.5rem] shadow-sm max-w-xl mx-auto my-12 text-center animate-in fade-in duration-300">
            <AlertTriangle className="text-red-500 w-16 h-16 mb-4 animate-bounce" />
            <h2 className="text-2xl font-black text-slate-950 dark:text-white uppercase tracking-tight">Koneksi Lambat / Sinyal Lemah</h2>
            <p className="text-slate-500 dark:text-slate-400 mt-2 mb-6 font-medium text-sm leading-relaxed">
                Kami mendeteksi waktu tunggu koneksi habis (Timeout 8 detik). Ini mungkin disebabkan jaringan internet lapangan yang tidak stabil. Silakan periksa koneksi Anda dan coba lagi.
            </p>
            <Button
                onClick={handleRetry}
                className="px-8 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-black uppercase text-xs tracking-wider rounded-xl shadow-lg shadow-blue-500/20 transition-all active:scale-95 min-h-[48px] flex items-center justify-center"
            >
                Coba Lagi
            </Button>
        </div>
    );

    if (loading) return (
        <div className="space-y-8 animate-pulse">
            {/* Header/Banner Skeleton */}
            <div className="h-40 bg-slate-200 dark:bg-slate-800 rounded-[2.5rem]"></div>

            {/* Grid Stats Skeleton */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="h-32 bg-slate-200 dark:bg-slate-800 rounded-3xl"></div>
                <div className="h-32 bg-slate-200 dark:bg-slate-800 rounded-3xl"></div>
                <div className="h-32 bg-slate-200 dark:bg-slate-800 rounded-3xl"></div>
                <div className="h-32 bg-slate-200 dark:bg-slate-800 rounded-3xl"></div>
            </div>

            {/* Split Page Columns Skeleton */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-6">
                    <div className="h-64 bg-slate-200 dark:bg-slate-800 rounded-[2.5rem]"></div>
                    <div className="h-96 bg-slate-200 dark:bg-slate-800 rounded-[2.5rem]"></div>
                </div>
                <div className="space-y-6">
                    <div className="h-80 bg-slate-200 dark:bg-slate-800 rounded-[2.5rem]"></div>
                    <div className="h-80 bg-slate-200 dark:bg-slate-800 rounded-[2.5rem]"></div>
                </div>
            </div>
        </div>
    );

    const isFieldRole = user?.role === 'Operator' || user?.role === 'Kontraktor';

    return (
        <div className="space-y-8 animate-in fade-in duration-500">            {/* === FIT FOR DUTY CHECK-IN === */}
            {user?.role === 'Admin' ? (
                ffdState === 'answering' ? (
                    <div className="bg-white dark:bg-slate-900 border-2 border-blue-500 rounded-[2rem] p-8 shadow-2xl shadow-blue-500/10 animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-start mb-8">
                            <div>
                                <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tighter flex items-center gap-3">
                                    <Shield size={24} className="text-blue-600" /> Fit For Duty — Kuisioner Harian
                                </h2>
                                <p className="text-slate-505 text-sm mt-1">Jawab 3 pertanyaan singkat berikut dengan jujur.</p>
                            </div>
                            <button onClick={() => setFfdState('pending')} className="p-2 text-slate-400 hover:text-slate-600 transition-colors">
                                <X size={18} />
                            </button>
                        </div>
                        <div className="space-y-6">
                            {FFD_QUESTIONS.map((q, i) => (
                                <div key={q.id} className="p-5 bg-slate-50 dark:bg-slate-800 rounded-2xl">
                                    <p className="font-bold text-slate-800 dark:text-slate-200 mb-4">
                                        <span className="text-blue-600 font-black mr-2">{i + 1}.</span>{q.text}
                                    </p>
                                    <div className="flex gap-3">
                                        <button
                                            onClick={() => handleFfdAnswer(q.id, true)}
                                            className={`flex-1 py-3 rounded-xl font-black text-sm transition-all ${ffdAnswers[q.id] === true ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:border-emerald-400'}`}
                                        >
                                            ✓ Ya
                                        </button>
                                        <button
                                            onClick={() => handleFfdAnswer(q.id, false)}
                                            className={`flex-1 py-3 rounded-xl font-black text-sm transition-all ${ffdAnswers[q.id] === false ? 'bg-red-500 text-white shadow-lg shadow-red-500/20' : 'bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:border-red-400'}`}
                                        >
                                            ✗ Tidak
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2rem] shadow-sm flex flex-col md:flex-row items-stretch justify-between gap-6">
                        {/* System Alerts & Pending Approvals */}
                        <div className="flex-1 flex flex-col justify-center">
                            <div className="flex items-center gap-3">
                                <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-red-500/20">
                                    <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                                </span>
                                <h3 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tighter">System Alerts & Pending Approvals</h3>
                            </div>
                            <div className="mt-2.5 flex flex-wrap gap-3">
                                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs font-bold text-emerald-600 dark:text-emerald-400">
                                    <CheckCircle size={12} />
                                    Database Sync: Connected
                                </span>
                                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 border border-red-500/20 rounded-xl text-xs font-bold text-red-600 dark:text-red-400">
                                    <AlertTriangle size={12} className="animate-pulse" />
                                    System Alert: WhatsApp API Gateway Latency High
                                </span>
                                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs font-bold text-amber-600 dark:text-amber-400">
                                    <Clock size={12} />
                                    Akun Menunggu Persetujuan: 3
                                </span>
                            </div>
                        </div>

                        {/* Compact Fit for Duty Widget */}
                        <div className="shrink-0 flex items-center bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/50 p-4 rounded-2xl md:min-w-[280px]">
                            {ffdState === 'pending' && (
                                <div className="w-full flex items-center justify-between gap-4">
                                    <div className="flex items-center gap-2">
                                        <Shield size={20} className="text-blue-500" />
                                        <div>
                                            <p className="text-[11px] font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">Fit for Duty</p>
                                            <p className="text-[9px] text-slate-400 font-medium">Belum Check-in</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={handleStartCheckIn}
                                        className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[10px] font-black uppercase tracking-wider transition-all duration-200 active:scale-95"
                                    >
                                        Mulai
                                    </button>
                                </div>
                            )}
                            {ffdState === 'passed' && (
                                <div className="w-full flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                                    <CheckCircle size={20} className="shrink-0" />
                                    <div>
                                        <p className="text-[11px] font-black uppercase tracking-wider">Fit for Duty</p>
                                        <p className="text-[9px] text-emerald-500 font-medium">Confirmed (Layak Kerja)</p>
                                    </div>
                                </div>
                            )}
                            {ffdState === 'blocked' && (
                                <div className="w-full flex items-center justify-between gap-2 text-red-600 dark:text-red-400">
                                    <div className="flex items-center gap-2">
                                        <AlertTriangle size={20} className="shrink-0 animate-pulse" />
                                        <div>
                                            <p className="text-[11px] font-black uppercase tracking-wider">Fit for Duty</p>
                                            <p className="text-[9px] text-red-505 font-medium">Not Fit for Duty</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => {
                                            setFfdState('pending');
                                            setFfdAnswers({ 1: null, 2: null, 3: null });
                                            localStorage.removeItem('ffd_status');
                                            localStorage.removeItem('ffd_date');
                                        }}
                                        className="px-2.5 py-1 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg text-[9px] font-black uppercase tracking-wider"
                                    >
                                        Ulangi
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                )
            ) : (
                <>
                    {ffdState === 'pending' && (
                        <div className="p-8 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-[2rem] text-white shadow-2xl shadow-blue-500/20 flex flex-col md:flex-row items-center justify-between gap-8">
                            <div className="flex items-center gap-6">
                                <div className="p-5 bg-white/20 rounded-3xl backdrop-blur-md shrink-0">
                                    <Shield size={40} />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-black uppercase tracking-tighter">Fit For Duty Check-in</h2>
                                    <p className="text-blue-100 font-medium mt-1">Pastikan kesiapan fisik & mental Anda sebelum memulai shift hari ini.</p>
                                    <div className="text-[11px] font-black uppercase tracking-wider text-blue-200 bg-white/10 backdrop-blur-md border border-white/20 px-3 py-1.5 rounded-xl w-fit flex items-center gap-1.5 mt-3.5 animate-pulse">
                                        <span className="relative flex h-2 w-2">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-300 opacity-75"></span>
                                            <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-100"></span>
                                        </span>
                                        K3 Slogan: "{SAFETY_SLOGANS[sloganIndex]}"
                                    </div>
                                    {expiredCertifications.length > 0 && (
                                        <div className="mt-3 flex items-center gap-2 text-xs font-black text-red-200 bg-red-950/40 border border-red-500/30 px-3 py-1.5 rounded-xl w-fit">
                                            <AlertTriangle size={14} className="text-red-400 fill-red-400 animate-pulse" />
                                            <span>SIO KEDALUWARSA - AKSES DIBLOKIR</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <button
                                className={`w-full md:w-auto px-10 py-5 rounded-2xl font-black uppercase tracking-widest text-sm shadow-xl shrink-0 transition-all duration-200 ${expiredCertifications.length > 0
                                    ? 'bg-slate-400 text-slate-200 cursor-not-allowed opacity-50'
                                    : 'bg-white text-blue-600 hover:bg-blue-50 active:scale-95'
                                    }`}
                                onClick={handleStartCheckIn}
                            >
                                Mulai Check-in
                            </button>
                        </div>
                    )}

                    {ffdState === 'answering' && (
                        <div className="bg-white dark:bg-slate-900 border-2 border-blue-500 rounded-[2rem] p-8 shadow-2xl shadow-blue-500/10 animate-in zoom-in-95 duration-200">
                            <div className="flex justify-between items-start mb-8">
                                <div>
                                    <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tighter flex items-center gap-3">
                                        <Shield size={24} className="text-blue-600" /> Fit For Duty — Kuisioner Harian
                                    </h2>
                                    <p className="text-slate-500 text-sm mt-1">Jawab 3 pertanyaan singkat berikut dengan jujur.</p>
                                </div>
                                <button onClick={() => setFfdState('pending')} className="p-2 text-slate-400 hover:text-slate-600 transition-colors">
                                    <X size={18} />
                                </button>
                            </div>
                            <div className="space-y-6">
                                {FFD_QUESTIONS.map((q, i) => (
                                    <div key={q.id} className="p-5 bg-slate-50 dark:bg-slate-800 rounded-2xl">
                                        <p className="font-bold text-slate-800 dark:text-slate-200 mb-4">
                                            <span className="text-blue-600 font-black mr-2">{i + 1}.</span>{q.text}
                                        </p>
                                        <div className="flex gap-3">
                                            <button
                                                onClick={() => handleFfdAnswer(q.id, true)}
                                                className={`flex-1 py-3 rounded-xl font-black text-sm transition-all ${ffdAnswers[q.id] === true ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:border-emerald-400'}`}
                                            >
                                                ✓ Ya
                                            </button>
                                            <button
                                                onClick={() => handleFfdAnswer(q.id, false)}
                                                className={`flex-1 py-3 rounded-xl font-black text-sm transition-all ${ffdAnswers[q.id] === false ? 'bg-red-500 text-white shadow-lg shadow-red-500/20' : 'bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:border-red-400'}`}
                                            >
                                                ✗ Tidak
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {ffdState === 'blocked' && (
                        <div className="p-8 bg-gradient-to-br from-red-600 to-rose-700 rounded-[2rem] text-white text-center shadow-2xl shadow-red-500/30 animate-in zoom-in-95 duration-200">
                            <div className="text-6xl mb-4">🚫</div>
                            <h2 className="text-2xl font-black uppercase tracking-tighter">Tidak Layak Kerja (Not Fit for Duty)</h2>
                            <p className="text-red-100 mt-2 mb-6 font-medium">Anda menjawab "Tidak" pada salah satu pertanyaan. Harap laporkan kondisi Anda ke HSE Officer sebelum memulai aktivitas kerja.</p>
                            <button
                                className="w-full md:w-auto px-8 py-4 bg-white text-red-600 hover:bg-red-50 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl active:scale-95 transition-all duration-200"
                                onClick={() => {
                                    setFfdState('pending');
                                    setFfdAnswers({ 1: null, 2: null, 3: null });
                                    localStorage.removeItem('ffd_status');
                                    localStorage.removeItem('ffd_date');
                                }}
                            >
                                Ulangi Check-in
                            </button>
                        </div>
                    )}

                    {ffdState === 'passed' && (
                        <div className="p-5 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center gap-4 animate-in slide-in-from-top-4 duration-300">
                            <div className="p-2 bg-emerald-500 rounded-xl text-white"><CheckCircle size={20} /></div>
                            <div>
                                <p className="font-black text-emerald-700 dark:text-emerald-400 text-sm uppercase tracking-wider">Fit For Duty — Confirmed</p>
                                <p className="text-xs text-slate-500">Anda dinyatakan layak kerja hari ini. Tetap waspada!</p>
                            </div>
                        </div>
                    )}
                </>
            )}

            {isFieldRole ? (
                // ==========================================
                // === OPERATOR & KONTRAKTOR LAYOUT (TAKTIK) ===
                // ==========================================
                <>
                    {/* Greeting & Quick Emergency */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch">
                        <div className="lg:col-span-2 flex flex-col justify-center bg-slate-50 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800/60 p-8 rounded-[2rem]">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div>
                                    <h1 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">
                                        {getGreeting()}, {user?.nama || 'Operator'}!
                                    </h1>
                                    <p className="text-slate-500 dark:text-slate-400 font-semibold mt-1 leading-relaxed">
                                        Monitor status perizinan kerja, tugas perbaikan (*Corrective Actions*), dan kirimkan laporan keselamatan secara langsung dari lapangan.
                                    </p>
                                </div>
                                <div className="flex flex-row sm:flex-col gap-2 shrink-0">
                                    <div className="flex items-center gap-1.5 px-4 py-2 bg-amber-500/10 border border-amber-500/20 rounded-2xl text-amber-600 dark:text-amber-400 shadow-sm animate-in slide-in-from-right-4 duration-300">
                                        <Star size={16} className="fill-amber-500 text-amber-500" />
                                        <span className="text-sm font-black uppercase tracking-wider">{user?.points || 0} Poin Safety</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 px-4 py-2 bg-blue-500/10 border border-blue-500/20 rounded-2xl text-blue-600 dark:text-blue-400 shadow-sm">
                                        <Trophy size={16} className="text-blue-500" />
                                        <span className="text-xs font-black uppercase tracking-wider">
                                            {(user?.points || 0) >= 1000 ? 'Safety Champion' : (user?.points || 0) >= 500 ? 'Hazard Hunter' : 'Basic Level'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="bg-gradient-to-br from-red-500/5 to-rose-500/10 dark:from-red-950/20 dark:to-rose-950/30 border-2 border-red-200 dark:border-red-800/60 rounded-[2rem] p-6 shadow-lg shadow-red-100/50 dark:shadow-none flex flex-col justify-between">
                            <div className="flex items-center gap-2 mb-3">
                                <Zap size={18} className="text-red-500 fill-red-500 animate-pulse" />
                                <span className="text-xs font-black uppercase tracking-widest text-red-600 dark:text-red-400">Quick Emergency — Tahan 3 Detik</span>
                            </div>
                            <EmergencyControls compact />
                        </div>
                    </div>

                    {/* Quick Actions (Lapor Bahaya Cepat & Lapor Insiden) */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Lapor Bahaya */}
                        <div
                            onClick={() => navigate('/hazards', { state: { openForm: true } })}
                            className="cursor-pointer group relative overflow-hidden bg-gradient-to-br from-amber-500 to-orange-600 rounded-[2.5rem] p-8 text-white shadow-xl shadow-orange-500/20 hover:shadow-2xl hover:shadow-orange-500/30 transition-all duration-300 transform hover:-translate-y-1 active:scale-[0.98]"
                        >
                            <div className="absolute right-0 bottom-0 translate-x-6 translate-y-6 opacity-10 group-hover:scale-125 transition-transform duration-500">
                                <AlertTriangle size={200} />
                            </div>
                            <div className="flex items-center gap-4 mb-4">
                                <div className="p-4 bg-white/20 rounded-2xl backdrop-blur-md">
                                    <AlertTriangle size={32} className="text-white" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-black uppercase tracking-tighter">Lapor Bahaya Cepat</h3>
                                    <p className="text-amber-100 text-xs font-medium">Temuan Unsafe Action / Condition</p>
                                </div>
                            </div>
                            <p className="text-sm text-amber-50 font-medium leading-relaxed">
                                Laporkan potensi bahaya atau kondisi fisik kerja yang tidak aman secara instan untuk mendapatkan mitigasi dini didukung analisis risiko kecerdasan buatan (AI).
                            </p>
                            <div className="mt-6 flex items-center gap-1.5 text-xs font-black uppercase tracking-wider bg-white/10 w-fit px-4 py-2 rounded-xl">
                                Mulai Laporan Bahaya <span className="group-hover:translate-x-1 transition-transform inline-block">→</span>
                            </div>
                        </div>

                        {/* Lapor Insiden */}
                        <div
                            onClick={() => navigate('/incidents', { state: { openForm: true } })}
                            className="cursor-pointer group relative overflow-hidden bg-gradient-to-br from-red-600 to-rose-700 rounded-[2.5rem] p-8 text-white shadow-xl shadow-red-600/20 hover:shadow-2xl hover:shadow-red-600/30 transition-all duration-300 transform hover:-translate-y-1 active:scale-[0.98]"
                        >
                            <div className="absolute right-0 bottom-0 translate-x-6 translate-y-6 opacity-10 group-hover:scale-125 transition-transform duration-500">
                                <Zap size={200} />
                            </div>
                            <div className="flex items-center gap-4 mb-4">
                                <div className="p-4 bg-white/20 rounded-2xl backdrop-blur-md">
                                    <Zap size={32} className="text-white fill-white" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-black uppercase tracking-tighter">Lapor Insiden Cepat</h3>
                                    <p className="text-red-100 text-xs font-medium">Kecelakaan Kerja / Near Miss</p>
                                </div>
                            </div>
                            <p className="text-sm text-red-50 font-medium leading-relaxed">
                                Laporkan insiden kecelakaan kerja, cedera personel, kerusakan aset properti, atau insiden hampir celaka (*Near Miss*) secara transparan.
                            </p>
                            <div className="mt-6 flex items-center gap-1.5 text-xs font-black uppercase tracking-wider bg-white/10 w-fit px-4 py-2 rounded-xl">
                                Laporkan Kejadian <span className="group-hover:translate-x-1 transition-transform inline-block">→</span>
                            </div>
                        </div>
                    </div>

                    {/* Status Izin Kerja & Tugas Perbaikan Saya */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* PTW Card */}
                        <div className="glass-card p-6 flex flex-col justify-between">
                            <div className="flex items-center justify-between mb-4">
                                <div className="p-3 bg-blue-500/10 rounded-xl text-blue-500">
                                    <FileText size={24} />
                                </div>
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg">e-PTW Saya</span>
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 mb-1">Status Izin Kerja (PTW) Saya</h3>
                                <div className="grid grid-cols-2 gap-2 mt-4">
                                    <div className="bg-slate-50 dark:bg-slate-800/40 p-3 rounded-2xl border border-slate-100 dark:border-slate-800/50 text-center">
                                        <p className="text-2xl font-black text-amber-500">{permits.filter(p => p.status === 'Pending').length}</p>
                                        <p className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mt-1">Menunggu</p>
                                    </div>
                                    <div className="bg-slate-50 dark:bg-slate-800/40 p-3 rounded-2xl border border-slate-100 dark:border-slate-800/50 text-center">
                                        <p className="text-2xl font-black text-blue-500">{permits.filter(p => p.status === 'Approved').length}</p>
                                        <p className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mt-1">Disetujui</p>
                                    </div>
                                    <div className="bg-slate-50 dark:bg-slate-800/40 p-3 rounded-2xl border border-slate-100 dark:border-slate-800/50 text-center">
                                        <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{permits.filter(p => p.status === 'Active').length}</p>
                                        <p className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mt-1">Berjalan</p>
                                    </div>
                                    <div className="bg-slate-50 dark:bg-slate-800/40 p-3 rounded-2xl border border-slate-100 dark:border-slate-800/50 text-center">
                                        <p className="text-2xl font-black text-slate-500 dark:text-slate-400">{permits.filter(p => p.status === 'Closed').length}</p>
                                        <p className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mt-1">Selesai</p>
                                    </div>
                                    <div className="bg-slate-50 dark:bg-slate-800/40 p-3 rounded-2xl border border-slate-100 dark:border-slate-800/50 text-center">
                                        <p className="text-2xl font-black text-red-500">{permits.filter(p => p.status === 'Rejected').length}</p>
                                        <p className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mt-1">Ditolak</p>
                                    </div>
                                    <div className="bg-slate-50 dark:bg-slate-800/40 p-3 rounded-2xl border border-slate-100 dark:border-slate-800/50 text-center">
                                        <p className="text-2xl font-black text-orange-500">{permits.filter(p => p.status === 'Expired').length}</p>
                                        <p className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mt-1">Expired</p>
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={() => navigate('/permits')}
                                className="mt-4 w-full py-3.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 rounded-xl text-xs font-black uppercase tracking-wider transition-colors active:scale-98"
                            >
                                Buka Halaman e-PTW →
                            </button>
                        </div>

                        {/* CAPA Card */}
                        <div className="glass-card p-6 flex flex-col justify-between">
                            <div className="flex items-center justify-between mb-4">
                                <div className="p-3 bg-purple-500/10 rounded-xl text-purple-500">
                                    <ClipboardCheck size={24} />
                                </div>
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg">Tugas Perbaikan (CAPA)</span>
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 mb-1">Tugas Perbaikan Anda</h3>
                                <div className="grid grid-cols-3 gap-3 mt-4 text-center">
                                    <div className="bg-slate-50 dark:bg-slate-800/40 p-3 rounded-2xl border border-slate-100 dark:border-slate-800/50">
                                        <p className="text-2xl font-black text-red-500">{myActions.filter(a => a.status === 'Open').length}</p>
                                        <p className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mt-1">Menunggu</p>
                                    </div>
                                    <div className="bg-slate-50 dark:bg-slate-800/40 p-3 rounded-2xl border border-slate-100 dark:border-slate-800/50">
                                        <p className="text-2xl font-black text-amber-500">{myActions.filter(a => a.status === 'In Progress').length}</p>
                                        <p className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mt-1">Berjalan</p>
                                    </div>
                                    <div className="bg-slate-50 dark:bg-slate-800/40 p-3 rounded-2xl border border-slate-100 dark:border-slate-800/50">
                                        <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{myActions.filter(a => a.status === 'Closed').length}</p>
                                        <p className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mt-1">Selesai</p>
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={() => navigate('/corrective-actions')}
                                className="mt-6 w-full py-3.5 bg-purple-500/10 hover:bg-purple-500/20 text-purple-600 dark:text-purple-400 rounded-xl text-xs font-black uppercase tracking-wider transition-colors active:scale-98"
                            >
                                Lihat Semua Tindakan Perbaikan →
                            </button>
                        </div>
                    </div>

                    {/* Riwayat Pelaporan Saya & Kesiapan/Lingkungan */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Riwayat Pelaporan Saya */}
                        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2rem] p-6 md:p-8 flex flex-col justify-between shadow-sm">
                            <div>
                                <div className="flex justify-between items-center mb-6">
                                    <div>
                                        <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tighter flex items-center gap-2">
                                            <Activity size={20} className="text-blue-500" /> Riwayat Pelaporan Saya
                                        </h3>
                                        <p className="text-xs text-slate-500 mt-1">Laporan bahaya (*hazard reports*) yang pernah Anda ajukan di lapangan.</p>
                                    </div>
                                    <button
                                        onClick={() => navigate('/hazards')}
                                        className="text-xs text-blue-600 dark:text-blue-400 font-bold hover:underline"
                                    >
                                        Lihat Semua →
                                    </button>
                                </div>
                                {myHazards.length === 0 ? (
                                    <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/20 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                                        <AlertCircle className="mx-auto mb-2 text-slate-400" size={32} />
                                        <p className="text-xs text-slate-400 font-medium">Anda belum memiliki riwayat laporan bahaya.</p>
                                    </div>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="w-full">
                                            <thead>
                                                <tr className="text-left text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800 pb-3">
                                                    <th className="pb-3">Lokasi</th>
                                                    <th className="pb-3">Tingkat Risiko</th>
                                                    <th className="pb-3">Tanggal</th>
                                                    <th className="pb-3">Status</th>
                                                </tr>
                                            </thead>
                                            <tbody className="text-xs font-bold">
                                                {myHazards.slice(0, 5).map((h) => {
                                                    const riskColors = {
                                                        Low: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
                                                        Medium: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
                                                        High: 'bg-orange-500/10 text-orange-600 dark:text-orange-400',
                                                        Critical: 'bg-red-500/10 text-red-600 dark:text-red-400',
                                                    };
                                                    const statusColors = {
                                                        Open: 'text-blue-500 bg-blue-500/10 px-2 py-0.5 rounded-lg',
                                                        'In Progress': 'text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-lg',
                                                        Resolved: 'text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-lg',
                                                        Closed: 'text-slate-500 bg-slate-500/10 px-2 py-0.5 rounded-lg',
                                                    };
                                                    return (
                                                        <tr key={h.id_hazard} className="border-b border-slate-50 dark:border-slate-800/50 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                                                            <td className="py-4 text-slate-900 dark:text-slate-200">{h.lokasi}</td>
                                                            <td className="py-4">
                                                                <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${riskColors[h.risiko] || riskColors.Low}`}>
                                                                    {h.risiko}
                                                                </span>
                                                            </td>
                                                            <td className="py-4 text-slate-500">
                                                                {new Date(h.createdAt).toLocaleDateString('id-ID')}
                                                            </td>
                                                            <td className="py-4">
                                                                <span className={statusColors[h.status] || 'text-slate-500 bg-slate-500/10 px-2 py-0.5 rounded-lg'}>
                                                                    {h.status}
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Kesiapan & Konteks Lingkungan */}
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2rem] p-6 flex flex-col justify-between shadow-sm gap-6">
                            <div className="space-y-4">
                                <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tighter flex items-center gap-2">
                                    <Shield className="text-amber-500" size={18} /> Kesiapan SIO Anda
                                </h3>
                                {expiredCertifications.length > 0 || expiringCertifications.length > 0 ? (
                                    <div className="space-y-2">
                                        {expiredCertifications.map(cert => (
                                            <div key={cert.id_certification} className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center justify-between gap-2">
                                                <div>
                                                    <p className="text-[10px] font-bold text-red-800 dark:text-red-400">{cert.jenis_sertifikasi}</p>
                                                    <p className="text-[9px] text-red-700/80 dark:text-red-500/80 mt-0.5">Kedaluwarsa: {new Date(cert.tanggal_expired).toLocaleDateString('id-ID')}</p>
                                                </div>
                                                <span className="text-[8px] font-black uppercase bg-red-500/20 text-red-700 dark:text-red-400 px-1.5 py-0.5 rounded shrink-0">
                                                    Expired
                                                </span>
                                            </div>
                                        ))}
                                        {expiringCertifications.map(cert => (
                                            <div key={cert.id_certification} className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center justify-between gap-2">
                                                <div>
                                                    <p className="text-[10px] font-bold text-amber-800 dark:text-amber-400">{cert.jenis_sertifikasi}</p>
                                                    <p className="text-[9px] text-amber-700/80 dark:text-amber-500/80 mt-0.5">Exp: {new Date(cert.tanggal_expired).toLocaleDateString('id-ID')}</p>
                                                </div>
                                                <span className="text-[8px] font-black uppercase bg-amber-500/20 text-amber-700 dark:text-amber-400 px-1.5 py-0.5 rounded shrink-0">
                                                    Habis
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
                                        <CheckCircle size={14} />
                                        <span className="text-[11px] font-bold">Lisensi & SIO Anda Aktif Valid</span>
                                    </div>
                                )}
                            </div>

                            <div className="border-t border-slate-100 dark:border-slate-800/50 pt-4 space-y-4">
                                <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tighter flex items-center gap-2">
                                    <Sun className="text-orange-500" size={18} /> Kondisi Lingkungan {weatherData.loading ? '(Loading...)' : ''}
                                </h3>
                                <div className="grid grid-cols-2 gap-2">
                                    <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800/50 flex items-center gap-2">
                                        <Thermometer className="text-orange-500" size={18} />
                                        <div>
                                            <p className="text-sm font-black text-slate-900 dark:text-white">{weatherData.temp}°C</p>
                                            <p className="text-[8px] text-slate-400 font-bold uppercase">Suhu</p>
                                        </div>
                                    </div>
                                    <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800/50 flex items-center gap-2">
                                        <Activity className="text-emerald-500" size={18} />
                                        <div>
                                            <p className="text-sm font-black text-slate-900 dark:text-white">{weatherData.aqi} AQI</p>
                                            <p className="text-[8px] text-slate-400 font-bold uppercase">Udara ({weatherData.aqiStatus})</p>
                                        </div>
                                    </div>
                                </div>
                                <div className={`p-3 rounded-xl flex items-center gap-2 ${weatherData.heatStress === 'AMAN' ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400' : 'bg-red-500/10 border border-red-500/20 text-red-700 dark:text-red-400'}`}>
                                    <CheckCircle size={14} className="shrink-0" />
                                    <div>
                                        <p className="text-[10px] font-bold uppercase">Heat Stress: {weatherData.heatStress}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            ) : (
                // ==========================================
                // === HSE & MANAGEMENT LAYOUT (ANALITIS) ===
                // ==========================================
                <>
                    {/* === HEADER & EMERGENCY CONTROLS === */}
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                        <div>
                            <h1 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">
                                {getGreeting()}, {user?.nama || 'User'}!
                            </h1>
                            <p className="text-slate-500 dark:text-slate-400 font-medium">Monitor performa keselamatan kerja perusahaan secara real-time.</p>
                        </div>

                        <div className="flex flex-col sm:flex-row items-center gap-4">
                            <Button
                                variant="primary"
                                className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-2xl py-4 px-6 shadow-xl shadow-blue-500/20 transition-all active:scale-95 text-sm font-black uppercase"
                                onClick={handleDownloadReport}
                            >
                                <Download size={18} /> Unduh Laporan Bulanan (PDF)
                            </Button>

                            <div className="bg-red-50/50 dark:bg-red-950/20 border-2 border-red-200 dark:border-red-800/60 rounded-3xl p-5 shadow-lg shadow-red-100/50 dark:shadow-none w-full lg:min-w-[400px] transition-all">
                                <div className="flex items-center gap-2 mb-3 px-2">
                                    <Zap size={16} className="text-red-500 fill-red-500" />
                                    <span className="text-[10px] font-black uppercase tracking-widest text-red-600 dark:text-red-400">Quick Emergency — Tahan 3 Detik</span>
                                </div>
                                <EmergencyControls compact />
                            </div>
                        </div>
                    </div>

                    {/* === STAT CARDS === */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        {statCards.map((stat, i) => (
                            <div key={i} className="glass-card p-6 group">
                                <div className="flex items-center justify-between mb-4">
                                    <div className={`p-3 ${stat.color} rounded-xl group-hover:scale-110 transition-transform`}>
                                        {stat.icon}
                                    </div>
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-600 dark:text-slate-300">{stat.trend}</span>
                                </div>
                                <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 mb-1">{stat.title}</h3>
                                <div className="flex items-baseline gap-2">
                                    <p className="text-3xl font-black text-slate-900 dark:text-white">{stat.value}</p>
                                    <span className={`text-xs font-bold ${stat.trendColor}`}>{stat.trendPercentage}</span>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* === ANALYTICS CHARTS === */}
                    <SafetyCharts />

                    {/* === ENVIRONMENT & READINESS === */}
                    <div className="p-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm animate-in fade-in duration-500">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            {/* Left: Kesiapan Personel & Alat */}
                            <div className="space-y-6">
                                <div>
                                    <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tighter flex items-center gap-2">
                                        <Shield className="text-amber-500" size={22} /> Kesiapan Personel & Alat
                                    </h3>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Memantau kelayakan izin lisensi operator (SIO) dan sertifikasi.</p>
                                </div>

                                {/* License Expiration Alerts */}
                                <div className="space-y-3">
                                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider">Masa Berlaku SIO / Lisensi (30 Hari)</h4>
                                    {expiringCertifications.length > 0 ? (
                                        <div className="space-y-2">
                                            {expiringCertifications.map(cert => (
                                                <div key={cert.id_certification} className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-center justify-between gap-4">
                                                    <div>
                                                        <p className="text-xs font-bold text-amber-800 dark:text-amber-400">{cert.nama_personil}</p>
                                                        <p className="text-[10px] text-amber-700/80 dark:text-amber-500/80 mt-0.5">{cert.jenis_sertifikasi} · No: {cert.nomor_sertifikat}</p>
                                                    </div>
                                                    <span className="text-[9px] font-black uppercase bg-amber-500/20 text-amber-700 dark:text-amber-400 px-2 py-1 rounded-lg shrink-0">
                                                        Akan Habis
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center gap-3 text-emerald-700 dark:text-emerald-400">
                                            <CheckCircle size={16} />
                                            <span className="text-xs font-bold">Semua SIO & Lisensi Personel Aktif Valid</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Right: Konteks Lingkungan Kerja */}
                            <div className="space-y-6 lg:border-l lg:border-slate-100 lg:dark:border-slate-800/50 lg:pl-8">
                                <div>
                                    <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tighter flex items-center gap-2">
                                        <Sun className="text-orange-500" size={22} /> Konteks Lingkungan Kerja {weatherData.loading ? '(Loading...)' : ''}
                                    </h3>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Parameter kondisi fisik lingkungan area luar ruangan.</p>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    {/* Weather Card */}
                                    <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800/50 flex items-center gap-3">
                                        <Thermometer className="text-orange-500" size={24} />
                                        <div>
                                            <p className="text-lg font-black text-slate-900 dark:text-white">{weatherData.temp}°C</p>
                                            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Suhu Luar Ruangan</p>
                                        </div>
                                    </div>
                                    {/* AQI Card */}
                                    <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800/50 flex items-center gap-3">
                                        <Activity className="text-emerald-500" size={24} />
                                        <div>
                                            <p className="text-lg font-black text-slate-900 dark:text-white">{weatherData.aqi} AQI</p>
                                            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Indeks Udara ({weatherData.aqiStatus})</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Environmental Status Alarm */}
                                <div className={`p-4 rounded-2xl flex items-center gap-3 ${weatherData.heatStress === 'AMAN' ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400' : 'bg-red-500/10 border border-red-500/20 text-red-700 dark:text-red-400'}`}>
                                    <CheckCircle size={16} />
                                    <div>
                                        <p className="text-xs font-bold uppercase tracking-wide">Status Heat Stress: {weatherData.heatStress}</p>
                                        <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                                            {weatherData.heatStress === 'AMAN'
                                                ? 'Suhu dan kualitas udara mendukung untuk aktivitas kerja normal.'
                                                : 'Suhu ekstrem terdeteksi. Batasi paparan luar ruangan dan tingkatkan konsumsi air minum.'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* === SYSTEM HEALTH + CONTRACTOR LEADERBOARD === */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {user?.role === 'Admin' ? (
                            <div className="space-y-6 flex flex-col justify-between h-full">
                                {/* System Health Card */}
                                <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm flex-1">
                                    <h3 className="text-base font-black mb-4 text-slate-900 dark:text-white uppercase tracking-tighter">System Health</h3>
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-3 p-3 bg-emerald-500/5 rounded-xl border border-emerald-500/10 text-emerald-600 dark:text-emerald-500">
                                            <CheckCircle size={16} />
                                            <span className="flex-1 font-bold text-xs">Database Sync</span>
                                            <span className="text-[9px] font-black uppercase px-1.5 py-0.5 bg-emerald-500/15 rounded">Online</span>
                                        </div>
                                        <div className="flex items-center gap-3 p-3 bg-blue-500/5 rounded-xl border border-blue-500/10 text-blue-600 dark:text-blue-500">
                                            <Zap size={16} />
                                            <span className="flex-1 font-bold text-xs">AI Analytics Engine</span>
                                            <span className="text-[9px] font-black uppercase px-1.5 py-0.5 bg-blue-500/15 rounded">Ready</span>
                                        </div>
                                        <div className="flex items-center gap-3 p-3 bg-amber-500/5 rounded-xl border border-amber-500/10 text-amber-600 dark:text-amber-500">
                                            <Clock size={16} />
                                            <span className="flex-1 font-bold text-xs">WhatsApp API</span>
                                            <span className="text-[9px] font-black uppercase px-1.5 py-0.5 bg-amber-500/15 rounded">Configured</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Manajemen User Widget */}
                                <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm flex-1">
                                    <h3 className="text-base font-black mb-4 text-slate-900 dark:text-white uppercase tracking-tighter flex items-center gap-2">
                                        <Users className="text-blue-500" size={18} /> Manajemen Pengguna
                                    </h3>
                                    <div className="space-y-2.5">
                                        <div className="flex justify-between items-center text-xs font-bold text-slate-600 dark:text-slate-400">
                                            <span>Total Akun Terdaftar:</span>
                                            <span className="text-slate-900 dark:text-white font-black text-sm">{totalUsersCount}</span>
                                        </div>
                                        <div className="flex justify-between items-center text-xs font-bold text-slate-600 dark:text-slate-400">
                                            <span>Akun Menunggu Persetujuan:</span>
                                            <span className="text-amber-500 font-black">3</span>
                                        </div>
                                        <div className="flex justify-between items-center text-xs font-bold text-slate-600 dark:text-slate-400">
                                            <span>Akun Terkunci:</span>
                                            <span className="text-red-500 font-black">1</span>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => navigate('/users')}
                                        className="mt-4 w-full py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-colors active:scale-95 shadow-lg shadow-blue-500/15"
                                    >
                                        Kelola User →
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="p-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm animate-in fade-in duration-300">
                                <h3 className="text-lg font-black mb-5 text-slate-900 dark:text-white uppercase tracking-tighter">Status e-PTW Real-time</h3>
                                <div className="space-y-3">
                                    <div className="flex items-center gap-4 p-4 bg-blue-500/10 rounded-2xl border border-blue-500/20">
                                        <FileText size={18} className="text-blue-500 shrink-0" />
                                        <span className="flex-1 font-bold text-sm text-blue-700 dark:text-blue-300">PTW Aktif (Disetujui + Berjalan)</span>
                                        <span className="text-lg font-black text-blue-600 dark:text-blue-400">
                                            {activePermitsCount}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-4 p-4 bg-amber-500/10 rounded-2xl border border-amber-500/20">
                                        <Clock size={18} className="text-amber-500 shrink-0" />
                                        <span className="flex-1 font-bold text-sm text-amber-700 dark:text-amber-300">PTW Menunggu Persetujuan</span>
                                        <span className="text-lg font-black text-amber-600 dark:text-amber-400">
                                            {permits.filter(p => p.status === 'Pending').length}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-4 p-4 bg-slate-500/10 rounded-2xl border border-slate-500/20">
                                        <CheckCircle size={18} className="text-slate-500 shrink-0" />
                                        <span className="flex-1 font-bold text-sm text-slate-700 dark:text-slate-300">PTW Selesai / Closed</span>
                                        <span className="text-lg font-black text-slate-600 dark:text-slate-400">
                                            {permits.filter(p => p.status === 'Closed').length}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-4 p-4 bg-amber-500/10 rounded-2xl border border-amber-500/20">
                                        <AlertCircle size={18} className="text-amber-500 shrink-0" />
                                        <span className="flex-1 font-bold text-sm text-amber-700 dark:text-amber-300">Tindakan CAPA Tertunda</span>
                                        <span className="text-lg font-black text-amber-600 dark:text-amber-400">
                                            {stats.pendingActions}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="lg:col-span-2 p-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm overflow-hidden">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tighter flex items-center gap-3">
                                    <Trophy size={20} className="text-amber-500" /> Contractor Safety Leaderboard
                                </h3>
                                <span className="text-xs font-bold text-slate-400 bg-slate-50 dark:bg-slate-800 px-3 py-1 rounded-full">Updated Hourly</span>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="text-left text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800">
                                            <th className="pb-4">Rank</th>
                                            <th className="pb-4">Kontraktor</th>
                                            <th className="pb-4">Safety Score</th>
                                            <th className="pb-4">Permit Aktif</th>
                                            <th className="pb-4">Insiden</th>
                                        </tr>
                                    </thead>
                                    <tbody className="text-sm font-bold">
                                        {[
                                            { rank: 1, name: 'PT Petro Kimia', score: 98, permits: 12, incidents: 0 },
                                            { rank: 2, name: 'CV Bangun Jaya', score: 92, permits: 8, incidents: 0 },
                                            { rank: 3, name: 'PT Logistik Abadi', score: 85, permits: 5, incidents: 1 },
                                        ].map((c) => (
                                            <tr key={c.rank} className="border-b border-slate-50 dark:border-slate-800/50 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                                                <td className="py-4">
                                                    <span className={`text-lg font-black ${c.rank === 1 ? 'text-amber-500' : c.rank === 2 ? 'text-slate-400' : 'text-orange-600'}`}>
                                                        #{c.rank}
                                                    </span>
                                                </td>
                                                <td className="py-4 text-slate-900 dark:text-slate-200">{c.name}</td>
                                                <td className="py-4">
                                                    <span className={`px-3 py-1 rounded-lg text-[10px] font-black ${c.score > 90 ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-orange-500/10 text-orange-600'}`}>
                                                        {c.score} / 100
                                                    </span>
                                                </td>
                                                <td className="py-4 text-slate-500">{c.permits}</td>
                                                <td className="py-4">
                                                    <span className={c.incidents > 0 ? 'text-red-500' : 'text-emerald-500'}>{c.incidents}</span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default DashboardPage;
