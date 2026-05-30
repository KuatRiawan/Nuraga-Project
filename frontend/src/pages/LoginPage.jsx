import { useState } from 'react';
import { useAuth } from '../store/AuthContext';
import { useNavigate, Link } from 'react-router-dom';

import Button from '../components/Button';
import Input from '../components/Input';
import { Shield } from 'lucide-react';

const LoginPage = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            await login(email, password);
            navigate('/');
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to login');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-[#020617] flex items-center justify-center p-4 selection:bg-blue-500/30 transition-colors duration-500">
            {/* Background Decorative Elements */}
            <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none -z-10">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/5 dark:bg-blue-600/10 blur-[120px] rounded-full"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-600/5 dark:bg-indigo-600/10 blur-[120px] rounded-full"></div>
            </div>

            <div className="max-w-md w-full bg-white/70 dark:bg-slate-900/50 backdrop-blur-xl p-10 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-2xl transition-colors duration-500">
                <div className="flex flex-col items-center mb-10">
                    <div className="p-4 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl mb-4 text-white shadow-xl shadow-blue-500/20 group-hover:scale-105 transition-transform">
                        <Shield size={40} />
                    </div>
                    <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter">Nuraga</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-2 font-bold uppercase text-[10px] tracking-[0.2em]">Integrated Safety Intelligence</p>
                </div>



                {error && (
                    <div className="mb-6 p-4 bg-red-500/10 border border-red-500/50 rounded-xl text-red-500 text-sm">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                    <Input
                        label="Email Address"
                        type="email"
                        placeholder="name@company.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                    />
                    <div className="space-y-1">
                        <Input
                            label="Password"
                            type="password"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                        <div className="flex justify-end px-1">
                            <Link to="/forgot-password" size="sm" className="text-xs font-bold text-slate-500 hover:text-blue-600 transition-colors">
                                Lupa Password?
                            </Link>
                        </div>
                    </div>
                    <Button type="submit" className="w-full h-12 mt-4" variant="primary" loading={loading}>
                        {loading ? 'Signing in...' : 'Sign In'}
                    </Button>
                </form>



            </div>
        </div>
    );
};

export default LoginPage;
