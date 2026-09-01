import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { ShieldCheck, UserCheck, Lock, Mail, ArrowRight, Sparkles, Building2 } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

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

  const handleQuickLogin = async (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setIsLoading(true);
    try {
      const user = await login(demoEmail, demoPass);
      toast.success(`Logged in as ${user.name} (${user.role})`);
      if (user.role === 'SUPER_ADMIN') {
        navigate('/admin/dashboard');
      } else {
        navigate('/consultant/dashboard');
      }
    } catch (err: any) {
      toast.error(err.message || 'Login failed');
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
        <div className="bg-slate-900/90 border border-slate-800 backdrop-blur-xl py-8 px-6 sm:px-8 shadow-2xl rounded-3xl space-y-6">
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
                  placeholder="admin@dizibrand.com"
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
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-extrabold text-white bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-600/30 transition duration-150 disabled:opacity-50 active:scale-95"
            >
              {isLoading ? (
                <span>Signing in...</span>
              ) : (
                <>
                  <span>Sign In to CRM</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Logins Section */}
          <div className="pt-4 border-t border-slate-800 space-y-3">
            <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400 block text-center">
              ⚡ Quick Demo Switcher (1-Click Login)
            </span>

            <div className="space-y-1.5">
              <button
                type="button"
                onClick={() => handleQuickLogin('admin@dizibrand.com', 'Admin@123456')}
                className="w-full flex items-center justify-between p-2.5 rounded-xl bg-indigo-950/40 hover:bg-indigo-900/50 border border-indigo-800/40 text-left transition group"
              >
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-indigo-600 rounded-lg text-white">
                    <ShieldCheck className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-white block group-hover:text-indigo-300">
                      Super Admin (Full Access)
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">admin@dizibrand.com</span>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-indigo-400 group-hover:translate-x-0.5 transition">Login →</span>
              </button>

              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => handleQuickLogin('rahul@dizibrand.com', 'Consultant@123456')}
                  className="p-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-left transition"
                >
                  <span className="text-[11px] font-bold text-white block">Rahul Sharma</span>
                  <span className="text-[9px] text-slate-500 font-mono">Consultant #1</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickLogin('priya@dizibrand.com', 'Consultant@123456')}
                  className="p-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-left transition"
                >
                  <span className="text-[11px] font-bold text-white block">Priya Verma</span>
                  <span className="text-[9px] text-slate-500 font-mono">Consultant #2</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
