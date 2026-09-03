import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Lock, Mail, ArrowRight, ShieldCheck, UserCheck, Sparkles } from 'lucide-react';

const CONSULTANT_PRESETS = [
  { name: 'Shraddha', email: 'shraddha@dizibrandmedia.com' },
  { name: 'Vansh Gupta', email: 'vansh@dizibrandmedia.com' },
  { name: 'Amisha', email: 'amisha@dizibrandmedia.com' },
  { name: 'Jyoti', email: 'jyoti@fyntrust.in' },
  { name: 'Aditya Gupta', email: 'aditya@dizibrandmedia.com' },
  { name: 'Sneha Gupta', email: 'sneha@dizibrand.com' },
  { name: 'Priya', email: 'priya@dizibrand.com' },
];

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [roleMode, setRoleMode] = useState<'admin' | 'consultant'>('consultant');
  const [email, setEmail] = useState('shraddha@dizibrandmedia.com');
  const [password, setPassword] = useState('Consultant@123456');
  const [isLoading, setIsLoading] = useState(false);

  const handleRoleSwitch = (mode: 'admin' | 'consultant') => {
    setRoleMode(mode);
    if (mode === 'admin') {
      setEmail('admin@dizibrand.com');
      setPassword('Admin@123456');
    } else {
      setEmail('shraddha@dizibrandmedia.com');
      setPassword('Consultant@123456');
    }
  };

  const handleSelectPreset = (presetEmail: string) => {
    setEmail(presetEmail);
    setPassword('Consultant@123456');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Please enter email and password');
      return;
    }

    setIsLoading(true);
    try {
      const user = await login(email.trim(), password);
      toast.success(`Welcome back, ${user.name}!`);
      if (user.role === 'SUPER_ADMIN') {
        navigate('/admin/dashboard');
      } else {
        navigate('/consultant/dashboard');
      }
    } catch (err: any) {
      toast.error(err.message || 'Invalid credentials');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Dynamic Background Glowing Blobs */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none -translate-y-1/2" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-emerald-600/15 rounded-full blur-3xl pointer-events-none translate-y-1/2" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10 text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 to-indigo-400 text-white font-black text-2xl shadow-xl shadow-indigo-600/30 mb-3">
          D
        </div>
        <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
          Dizibrand CRM
        </h2>
        <p className="mt-1 text-xs text-slate-400 font-medium">
          Multi-Business Sales Pipeline & Lead Management System
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md relative z-10 px-4">
        <div className="bg-slate-900/90 border border-slate-800 backdrop-blur-xl py-7 px-6 sm:px-8 shadow-2xl rounded-3xl space-y-5">
          {/* Role Portal Toggle */}
          <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-950 rounded-2xl border border-slate-800">
            <button
              type="button"
              onClick={() => handleRoleSwitch('consultant')}
              className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold transition ${
                roleMode === 'consultant'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <UserCheck className="w-4 h-4" />
              <span>Consultant Panel</span>
            </button>

            <button
              type="button"
              onClick={() => handleRoleSwitch('admin')}
              className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold transition ${
                roleMode === 'admin'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Super Admin</span>
            </button>
          </div>

          {/* Quick Consultant Picker Chips */}
          {roleMode === 'consultant' && (
            <div className="p-3 bg-slate-950/80 rounded-2xl border border-slate-800/80 space-y-1.5">
              <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                <span className="flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-indigo-400" />
                  Quick Consultant Login:
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {CONSULTANT_PRESETS.map((c) => (
                  <button
                    key={c.email}
                    type="button"
                    onClick={() => handleSelectPreset(c.email)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition cursor-pointer ${
                      email.toLowerCase() === c.email.toLowerCase()
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
                    }`}
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={roleMode === 'admin' ? 'admin@dizibrand.com' : 'consultant@dizibrand.com'}
                  className="w-full pl-10 pr-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-extrabold text-white bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-600/30 transition duration-150 disabled:opacity-50 active:scale-95 cursor-pointer"
            >
              {isLoading ? (
                <span>Signing in...</span>
              ) : (
                <>
                  <span>
                    Sign In as {roleMode === 'admin' ? 'Super Admin' : 'Business Consultant'}
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

