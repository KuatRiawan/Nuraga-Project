import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './store/AuthContext';
import { ThemeProvider } from './store/ThemeContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useSocket } from './hooks/useSocket';

import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import HazardPage from './pages/HazardPage';
import IncidentPage from './pages/IncidentPage';
import AuditPage from './pages/AuditPage';
import CorrectiveActionPage from './pages/CorrectiveActionPage';
import CertificationPage from './pages/CertificationPage';
import WorkPermitPage from './pages/WorkPermitPage';
import EmergencyPage from './pages/EmergencyPage';
import DashboardLayout from './layouts/DashboardLayout';
import Button from './components/Button';
import { ShieldAlert, CheckCircle } from 'lucide-react';
import { useState, useEffect } from 'react';
import SettingsPage from './pages/SettingsPage';
import UsersPage from './pages/UsersPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import GamificationPage from './pages/GamificationPage';
import AuditLogPage from './pages/AuditLogPage';

const queryClient = new QueryClient();

const ProtectedRoute = ({ children }) => {
    const { user, loading } = useAuth();
    if (loading) return (
        <div className="min-h-screen bg-slate-100 dark:bg-slate-900 flex items-center justify-center transition-colors duration-500">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
        </div>
    );
    if (!user) return <Navigate to="/login" />;
    return children;
};

const EmergencyListener = () => {
    const { user } = useAuth();
    const [alertData, setAlertData] = useState(null);
    const [resolveData, setResolveData] = useState(null);
    const { socket } = useSocket();

    useEffect(() => {
        if (!user || !socket) return;

        // Safety override: alert Safety roles
        const isSafetyStaff = ['Admin', 'HSE', 'Supervisor', 'Manager'].includes(user.role);
        if (!isSafetyStaff) return;

        const handleEmergency = (data) => {
            if (data.event === 'emergency-triggered') {
                try {
                    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
                    const osc = audioCtx.createOscillator();
                    const gain = audioCtx.createGain();
                    osc.type = 'sawtooth';
                    osc.frequency.setValueAtTime(880, audioCtx.currentTime);
                    gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
                    osc.connect(gain);
                    gain.connect(audioCtx.destination);
                    osc.start();
                    setTimeout(() => osc.stop(), 800);
                } catch (e) {
                    console.warn('Audio play failed:', e);
                }
                setAlertData(data);
            }
        };

        const handleResolved = (data) => {
            // Dismiss red alert if it's open
            setAlertData(null);
            setResolveData(data);
            // Auto dismiss green alert after 5 seconds
            setTimeout(() => {
                setResolveData(null);
            }, 5000);
        };

        socket.on('EMERGENCY_SOS', handleEmergency);
        socket.on('EMERGENCY_RESOLVED', handleResolved);

        return () => {
            socket.off('EMERGENCY_SOS', handleEmergency);
            socket.off('EMERGENCY_RESOLVED', handleResolved);
        };
    }, [user, socket]);

    if (!alertData && !resolveData) return null;

    if (resolveData) {
        return (
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-emerald-950/80 backdrop-blur-md animate-in fade-in duration-300">
                <div className="bg-white dark:bg-slate-900 border-4 border-emerald-500 rounded-[2.5rem] p-8 max-w-sm w-full shadow-2xl relative overflow-hidden animate-in zoom-in-95 duration-200">
                    <div className="absolute -top-24 -left-24 w-48 h-48 bg-emerald-500/10 rounded-full animate-ping" />
                    <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-emerald-500/10 rounded-full animate-ping" />
                    
                    <div className="flex flex-col items-center text-center space-y-4">
                        <div className="p-4 bg-emerald-500 rounded-full text-white shadow-lg shadow-emerald-500/40">
                            <CheckCircle size={40} className="animate-pulse" />
                        </div>
                        <div className="space-y-1">
                            <h2 className="text-xl font-black text-emerald-600 dark:text-emerald-500 uppercase tracking-tighter">KONDISI AMAN</h2>
                            <p className="text-xs font-bold text-slate-500 dark:text-slate-400">
                                Darurat telah diselesaikan oleh: <br/> <span className="text-emerald-600 dark:text-emerald-400">{resolveData.resolver_name}</span>
                            </p>
                        </div>
                        <Button
                            onClick={() => setResolveData(null)}
                            className="w-full mt-4 py-3 bg-emerald-600 hover:bg-emerald-700 shadow-xl shadow-emerald-500/20 text-white font-black uppercase text-xs tracking-wider rounded-2xl"
                        >
                            Tutup
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    const { emergency, responders } = alertData;

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-red-950/80 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-white dark:bg-slate-900 border-4 border-red-600 rounded-[2.5rem] p-8 max-w-lg w-full shadow-2xl relative overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="absolute -top-24 -left-24 w-48 h-48 bg-red-500/10 rounded-full animate-ping" />
                <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-red-500/10 rounded-full animate-ping" />

                <div className="flex flex-col items-center text-center space-y-6">
                    <div className="p-5 bg-red-500 rounded-full text-white animate-bounce shadow-lg shadow-red-500/40">
                        <ShieldAlert size={48} className="animate-pulse" />
                    </div>

                    <div className="space-y-2">
                        <h2 className="text-3xl font-black text-red-650 dark:text-red-500 uppercase tracking-tighter">ALARM SOS DARURAT!</h2>
                        <p className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                            Kategori Kejadian: {emergency.jenis_kejadian}
                        </p>
                    </div>

                    <div className="w-full bg-slate-50 dark:bg-slate-800/50 p-5 rounded-2xl border border-slate-205 dark:border-slate-800 text-left space-y-3 text-xs">
                        <div>
                            <span className="text-[10px] font-black text-slate-450 uppercase tracking-widest">Reporter (Korban)</span>
                            <p className="font-extrabold text-slate-850 dark:text-slate-200 mt-0.5">{emergency.reporter_name || 'Tidak Diketahui'}</p>
                        </div>
                        <div>
                            <span className="text-[10px] font-black text-slate-450 uppercase tracking-widest">Lokasi Kerja Terdeteksi</span>
                            <p className="font-extrabold text-red-650 dark:text-red-400 mt-0.5">{emergency.lokasi}</p>
                        </div>
                        <div>
                            <span className="text-[10px] font-black text-slate-450 uppercase tracking-widest">Waktu Pemicu</span>
                            <p className="font-semibold text-slate-600 dark:text-slate-400 mt-0.5">{new Date(emergency.waktu_kejadian).toLocaleString('id-ID')}</p>
                        </div>
                    </div>

                    <div className="w-full text-left space-y-3">
                        <span className="text-[10px] font-black text-slate-450 uppercase tracking-widest block">Responders Zona Ditugaskan</span>
                        <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                            {responders && responders.length > 0 ? (
                                responders.map((r, idx) => (
                                    <div key={idx} className="flex items-center justify-between p-3 bg-emerald-500/10 dark:bg-emerald-500/5 border border-emerald-500/20 rounded-xl text-emerald-800 dark:text-emerald-400 text-xs font-bold">
                                        <span>✓ {r.nama}</span>
                                        <span className="text-[10px] uppercase font-black tracking-wider bg-emerald-500/20 px-2 py-0.5 rounded">{r.role}</span>
                                    </div>
                                ))
                            ) : (
                                <p className="text-xs text-slate-400 italic">Tidak ada responders khusus aktif di zona ini. Alarm disiarkan ke semua Safety Officers.</p>
                            )}
                        </div>
                    </div>

                    <div className="w-full pt-2">
                        <Button
                            onClick={() => setAlertData(null)}
                            className="w-full py-4 bg-red-600 hover:bg-red-700 shadow-xl shadow-red-500/20 text-white font-black uppercase text-xs tracking-wider rounded-2xl"
                        >
                            Saya Mengerti & Tangani
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
};


function App() {
    return (
        <QueryClientProvider client={queryClient}>
            <ThemeProvider>
                <AuthProvider>
                    <Router>
                    <EmergencyListener />

                    <Routes>
                        <Route path="/login" element={<LoginPage />} />
                        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                        <Route path="/reset-password" element={<ResetPasswordPage />} />

                        <Route path="/" element={
                            <ProtectedRoute>
                                <DashboardLayout>
                                    <DashboardPage />
                                </DashboardLayout>
                            </ProtectedRoute>
                        } />
                        <Route path="/hazards" element={
                            <ProtectedRoute>
                                <DashboardLayout>
                                    <HazardPage />
                                </DashboardLayout>
                            </ProtectedRoute>
                        } />
                        <Route path="/incidents" element={
                            <ProtectedRoute>
                                <DashboardLayout>
                                    <IncidentPage />
                                </DashboardLayout>
                            </ProtectedRoute>
                        } />
                        <Route path="/audits" element={
                            <ProtectedRoute>
                                <DashboardLayout>
                                    <AuditPage />
                                </DashboardLayout>
                            </ProtectedRoute>
                        } />
                        <Route path="/corrective-actions" element={
                            <ProtectedRoute>
                                <DashboardLayout>
                                    <CorrectiveActionPage />
                                </DashboardLayout>
                            </ProtectedRoute>
                        } />
                        {/* legacy alias */}
                        <Route path="/actions" element={<Navigate to="/corrective-actions" />} />
                        <Route path="/permits" element={
                            <ProtectedRoute>
                                <DashboardLayout>
                                    <WorkPermitPage />
                                </DashboardLayout>
                            </ProtectedRoute>
                        } />
                        <Route path="/certifications" element={
                            <ProtectedRoute>
                                <DashboardLayout>
                                    <CertificationPage />
                                </DashboardLayout>
                            </ProtectedRoute>
                        } />
                        <Route path="/emergency" element={
                            <ProtectedRoute>
                                <DashboardLayout>
                                    <EmergencyPage />
                                </DashboardLayout>
                            </ProtectedRoute>
                        } />
                        <Route path="/settings" element={
                            <ProtectedRoute>
                                <DashboardLayout>
                                    <SettingsPage />
                                </DashboardLayout>
                            </ProtectedRoute>
                        } />
                        <Route path="/users" element={
                            <ProtectedRoute>
                                <DashboardLayout>
                                    <UsersPage />
                                </DashboardLayout>
                            </ProtectedRoute>
                        } />
                        <Route path="/logs" element={
                            <ProtectedRoute>
                                <DashboardLayout>
                                    <AuditLogPage />
                                </DashboardLayout>
                            </ProtectedRoute>
                        } />
                        <Route path="/gamification" element={
                            <ProtectedRoute>
                                <DashboardLayout>
                                    <GamificationPage />
                                </DashboardLayout>
                            </ProtectedRoute>
                        } />
                        {/* Default Route */}
                        <Route path="*" element={<Navigate to="/" />} />
                    </Routes>
                </Router>
            </AuthProvider>
        </ThemeProvider>
    </QueryClientProvider>
    );
}

export default App;
