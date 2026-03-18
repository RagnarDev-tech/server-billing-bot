import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { Lock, User, ShieldCheck, Zap } from 'lucide-react';

const Login = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        
        try {
            const { data } = await api.post('/auth/login', { username, password });
            localStorage.setItem('token', data.token);
            navigate('/dashboard');
        } catch (err) {
            setError(err.response?.data?.message || 'Помилка доступу');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden">
            {/* Декоративні фонові елементи */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-900/10 blur-[120px] rounded-full"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-red-900/10 blur-[120px] rounded-full"></div>

            <div className="premium-card w-full max-w-[400px] group">
                {/* Сканування при наведенні */}
                <div className="scan-container">
                    <div className="scanline"></div>
                </div>

                <div className="p-10 relative z-10">
                    <header className="text-center mb-10">
                        <div className="inline-flex p-4 rounded-2xl bg-white/5 border border-white/10 mb-6 shadow-[0_0_20px_rgba(0,0,0,0.5)] group-hover:border-blue-500/30 transition-all">
                            <ShieldCheck size={40} className="text-white drop-shadow-[0_0_10px_#fff]" />
                        </div>
                        <h1 className="text-2xl font-black text-white uppercase italic tracking-widest">
                            System <span style={{ color: '#00b0ff' }}>Access</span>
                        </h1>
                        <p className="text-[10px] text-slate-600 font-bold uppercase tracking-[0.3em] mt-2">Введіть дані адміністратора</p>
                    </header>

                    <form onSubmit={handleLogin} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Username</label>
                            <div className="relative">
                                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={16} />
                                <input 
                                    type="text" 
                                    required
                                    className="w-full bg-black/40 border border-white/5 rounded-xl py-4 pl-12 pr-4 text-sm text-white focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 transition-all"
                                    placeholder="Адмін"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Password</label>
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={16} />
                                <input 
                                    type="password" 
                                    required
                                    className="w-full bg-black/40 border border-white/5 rounded-xl py-4 pl-12 pr-4 text-sm text-white focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 transition-all"
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                            </div>
                        </div>

                        {error && (
                            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-[10px] font-bold uppercase text-center animate-shake">
                                {error}
                            </div>
                        )}

                        <button 
                            type="submit" 
                            disabled={loading}
                            className="w-full py-4 relative group/btn overflow-hidden rounded-xl transition-all active:scale-95"
                            style={{ background: 'var(--bg-grad-blue)', boxShadow: '0 0 20px rgba(0, 176, 255, 0.3)' }}
                        >
                            <div className="absolute inset-0 bg-white/10 opacity-0 group-hover/btn:opacity-100 transition-opacity"></div>
                            <span className="relative z-10 flex items-center justify-center gap-3 text-white font-black uppercase text-[10px] tracking-[0.3em]">
                                {loading ? 'Checking...' : 'Authenticate'}
                                <Zap size={14} className="fill-white" />
                            </span>
                        </button>
                    </form>

                    <footer className="mt-10 text-center">
                        <p className="text-[8px] text-slate-700 uppercase font-bold tracking-[0.2em]">
                            End-to-end encrypted connection
                        </p>
                    </footer>
                </div>
            </div>
        </div>
    );
};

export default Login;