import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import Input from '../components/Input';
import Button from '../components/Button';
import { Shield, UserPlus } from 'lucide-react';

const RegisterPage = () => {
    const [formData, setFormData] = useState({ nama: '', email: '', password: '', no_whatsapp: '', jenis_kelamin: 'Laki-laki' });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        if (formData.no_whatsapp && !formData.no_whatsapp.startsWith('+62')) {
            setError('Nomor WhatsApp harus dimulai dengan +62 (contoh: +6281234567890)');
            setLoading(false);
            return;
        }

        try {
            await api.post('/auth/register', formData);
            navigate('/login', { state: { message: 'Registration successful! Please login.' } });
        } catch (err) {
            setError(err.response?.data?.message || 'Registration failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-[#020617] flex items-center justify-center p-4 transition-colors duration-500">
            <div className="max-w-md w-full animate-in fade-in zoom-in duration-500">
                <div className="text-center mb-10">
                    <div className="inline-flex p-4 bg-blue-600 rounded-3xl text-white shadow-2xl shadow-blue-500/30 mb-6">
                        <Shield size={40} />
                    </div>
                    <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Create Account</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-2 font-medium">Join Nuraga Safety Intelligence System</p>
                </div>

                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 md:p-10 rounded-[2.5rem] shadow-xl dark:shadow-2xl transition-colors">
                    <form onSubmit={handleSubmit} className="space-y-5">
                        {error && (
                            <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-sm rounded-2xl font-bold animate-shake">
                                {error}
                            </div>
                        )}

                        <Input
                            label="Full Name"
                            placeholder="John Doe"
                            value={formData.nama}
                            onChange={(e) => setFormData({ ...formData, nama: e.target.value })}
                            required
                        />

                        <Input
                            label="Email Address"
                            type="email"
                            placeholder="name@company.com"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            required
                        />

                        <Input
                            label="Password"
                            type="password"
                            placeholder="••••••••"
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            required
                        />

                        <Input
                            label="WhatsApp Number"
                            placeholder="Example: +6281234567890"
                            value={formData.no_whatsapp}
                            onChange={(e) => setFormData({ ...formData, no_whatsapp: e.target.value })}
                        />

                        <div className="flex flex-col gap-1.5 w-full">
                            <label className="text-sm font-medium text-slate-600 dark:text-slate-300">Jenis Kelamin</label>
                            <select
                                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium"
                                value={formData.jenis_kelamin}
                                onChange={(e) => setFormData({ ...formData, jenis_kelamin: e.target.value })}
                            >
                                <option value="Laki-laki">Laki-laki</option>
                                <option value="Perempuan">Perempuan</option>
                            </select>
                        </div>

                        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                            Akun publik didaftarkan sebagai <span className="font-semibold text-slate-700 dark:text-slate-300">Staff</span>.
                            Peran lain (HSE, Supervisor, Admin) hanya dapat ditetapkan oleh Administrator.
                        </p>

                        <Button type="submit" className="w-full h-12 flex items-center justify-center gap-2 mt-4" loading={loading}>
                            <UserPlus size={18} /> {loading ? 'Creating Account...' : 'Get Started'}
                        </Button>
                    </form>

                    <div className="mt-8 text-center">
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                            Already have an account?{' '}
                            <Link to="/login" className="text-blue-600 dark:text-blue-500 font-bold hover:underline">
                                Sign In
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RegisterPage;
