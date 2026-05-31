import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import Input from '../components/Input';
import Button from '../components/Button';
import { Shield, KeyRound, ArrowLeft, MailCheck } from 'lucide-react';

const ForgotPasswordPage = () => {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [sent, setSent] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            await api.post('/auth/forgot-password', { email });
            setSent(true);
        } catch (err) {
            setError(err.response?.data?.message || 'Something went wrong');
        } finally {
            setLoading(false);
        }
    };

    if (sent) {
        return (
            <div className="min-h-screen bg-slate-50 dark:bg-[#020617] flex items-center justify-center p-4 transition-colors duration-500">
                <div className="max-w-md w-full text-center space-y-6 animate-in fade-in zoom-in duration-500">
                    <div className="inline-flex p-6 bg-emerald-500/10 text-emerald-600 dark:text-emerald-500 rounded-[2.5rem] mb-2">
                        <MailCheck size={64} />
                    </div>
                    <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">Check your email</h1>
                    <p className="text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                        We have sent a password reset link to <span className="text-slate-900 dark:text-white font-bold">{email}</span>.
                    </p>
                    <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-2xl border border-blue-100 dark:border-blue-800 text-sm">
                        <p className="text-blue-700 dark:text-blue-400 font-medium leading-relaxed">
                            Layanan email belum dikonfigurasi. Setelah masuk, ubah password di{' '}
                            <strong>Pengaturan → Keamanan</strong>, atau hubungi Administrator untuk bantuan.
                        </p>
                    </div>

                    <div className="pt-4">
                        <Link to="/login">
                            <Button variant="ghost" className="text-blue-600 dark:text-blue-500 font-bold flex items-center gap-2 mx-auto">
                                <ArrowLeft size={18} /> Back to Login
                            </Button>
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-[#020617] flex items-center justify-center p-4 transition-colors duration-500">
            <div className="max-w-md w-full animate-in fade-in zoom-in duration-500">
                <div className="text-center mb-10">
                    <div className="inline-flex p-4 bg-blue-600 rounded-3xl text-white shadow-2xl shadow-blue-500/30 mb-6">
                        <Shield size={40} />
                    </div>
                    <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Forgotten Password?</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-2 font-medium">Reset your secure access to Nuraga</p>
                </div>

                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 md:p-10 rounded-[2.5rem] shadow-xl dark:shadow-2xl transition-colors">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {error && (
                            <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-sm rounded-2xl font-bold">
                                {error}
                            </div>
                        )}

                        <Input
                            label="Email Address"
                            type="email"
                            placeholder="your@email.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />

                        <Button type="submit" className="w-full h-12 flex items-center justify-center gap-2" loading={loading}>
                            <KeyRound size={18} /> {loading ? 'Sending Request...' : 'Send Reset Link'}
                        </Button>

                        <div className="text-center pt-2">
                            <Link to="/login" className="text-sm font-bold text-slate-500 dark:text-slate-400 hover:text-blue-600 flex items-center justify-center gap-2 transition-colors">
                                <ArrowLeft size={16} /> Back to Login
                            </Link>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default ForgotPasswordPage;
