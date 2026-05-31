import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../store/AuthContext';
import Button from '../components/Button';
import { Shield, KeySquare, ArrowLeft } from 'lucide-react';

/**
 * Public reset-password API removed (C2).
 * Logged-in users change password via Settings → PUT /auth/change-password.
 */
const ResetPasswordPage = () => {
    const { user } = useAuth();
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-[#020617] flex items-center justify-center p-4 transition-colors duration-500">
            <div className="max-w-md w-full animate-in fade-in zoom-in duration-500">
                <div className="text-center mb-10">
                    <div className="inline-flex p-4 bg-blue-600 rounded-3xl text-white shadow-2xl shadow-blue-500/30 mb-6">
                        <Shield size={40} />
                    </div>
                    <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                        Ubah Password
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-2 font-medium">
                        Reset password tanpa login tidak lagi didukung demi keamanan akun.
                    </p>
                </div>

                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 md:p-10 rounded-[2.5rem] shadow-xl dark:shadow-2xl transition-colors space-y-6">
                    <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                        Masuk ke akun Anda, lalu buka <strong>Pengaturan → Keamanan</strong> untuk mengganti password
                        dengan memasukkan password lama.
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-500">
                        Lupa password? Hubungi Administrator sistem untuk reset manual.
                    </p>

                    {user ? (
                        <Button
                            type="button"
                            className="w-full h-12 flex items-center justify-center gap-2"
                            onClick={() => navigate('/settings')}
                        >
                            <KeySquare size={18} /> Buka Pengaturan
                        </Button>
                    ) : (
                        <Button
                            type="button"
                            className="w-full h-12 flex items-center justify-center gap-2"
                            onClick={() => navigate('/login')}
                        >
                            <KeySquare size={18} /> Masuk ke Akun
                        </Button>
                    )}

                    <div className="text-center">
                        <Link
                            to="/login"
                            className="text-sm font-bold text-slate-500 dark:text-slate-400 hover:text-blue-600 flex items-center justify-center gap-2 transition-colors"
                        >
                            <ArrowLeft size={16} /> Kembali ke Login
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ResetPasswordPage;
