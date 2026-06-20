'use client';
import React, { useState } from 'react';
import { useVendor } from '@/context/useVendorStore';
import { Mail, Lock, User, AlertCircle } from 'lucide-react';

export const AuthView: React.FC = () => {
  const { signInWithEmail, signUpWithEmail, signInWithGoogle } = useVendor();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isLogin) {
        await signInWithEmail(email, password);
      } else {
        if (!name.trim()) throw new Error('Please enter your name.');
        await signUpWithEmail(email, password, name);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setLoading(true);
    try {
      await signInWithGoogle();
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Google authentication failed.');
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto px-6 py-8 flex flex-col justify-center bg-[#0a0a0a] text-white no-scrollbar select-none relative overflow-hidden">
      {/* 3D Background Floating Orbs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="glow-orb" style={{
          width: 300, height: 300,
          background: 'radial-gradient(circle, rgba(255,107,53,0.18) 0%, transparent 70%)',
          top: '-50px', left: '-50px',
          animationDuration: '12s'
        }} />
        <div className="glow-orb" style={{
          width: 250, height: 250,
          background: 'radial-gradient(circle, rgba(168,85,247,0.14) 0%, transparent 70%)',
          bottom: '10%', right: '-50px',
          animationDelay: '-4s', animationDuration: '15s'
        }} />
      </div>

      <div className="w-full max-w-sm mx-auto space-y-6 relative z-10">
        
        {/* Brand Header */}
        <div className="text-center space-y-3 relative z-10 flex flex-col items-center justify-center">
          <div className="relative">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#FF6B35] to-[#FFB347] flex items-center justify-center text-white shadow-xl shadow-orange-500/25 border border-white/20 animate-float text-2xl font-black relative z-10">
              ⚡
            </div>
            {/* Pulsing halo */}
            <div className="absolute inset-[-4px] rounded-2xl bg-gradient-to-tr from-[#FF6B35] to-[#FFB347] opacity-25 blur-sm animate-pulse" />
          </div>
          <div>
            <h2 className="text-3xl font-black tracking-tight" style={{ fontFamily: "'Outfit', sans-serif" }}>
              Vendor<span className="gradient-text">OS</span>
            </h2>
            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1">
              THE HYPER-LOCAL FOOD STALL OPERATING SYSTEM
            </p>
          </div>
        </div>

        {/* Tab Selector */}
        <div className="flex bg-[#121212]/90 backdrop-blur-md p-1 rounded-2xl border border-slate-800/80">
          <button
            type="button"
            onClick={() => { setIsLogin(true); setError(null); }}
            className={`flex-1 py-2 text-xs font-black rounded-xl transition ${
              isLogin ? 'bg-[#1e1e1e] text-white border border-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-350'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => { setIsLogin(false); setError(null); }}
            className={`flex-1 py-2 text-xs font-black rounded-xl transition ${
              !isLogin ? 'bg-[#1e1e1e] text-white border border-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-350'
            }`}
          >
            Register
          </button>
        </div>

        {/* Form Card */}
        <div className="glass-3d rounded-3xl p-5 shadow-2xl relative overflow-hidden holo-border">

          
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="flex gap-2 p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-2xl text-[11px] font-bold leading-normal">
                <AlertCircle size={14} className="shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Name Field (Only on Register) */}
            {!isLogin && (
              <div className="space-y-1.5">
                <label className="text-[9px] uppercase font-black text-slate-450 tracking-wider">Full Name</label>
                <div className="relative">
                  <User size={14} className="absolute left-3 top-2.5 text-slate-500" />
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="e.g. John Doe"
                    className="w-full bg-[#161616] border border-slate-800/80 rounded-xl pl-9 pr-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-[#FF6B35] placeholder:text-slate-600 transition"
                    required={!isLogin}
                  />
                </div>
              </div>
            )}

            {/* Email Field */}
            <div className="space-y-1.5">
              <label className="text-[9px] uppercase font-black text-slate-450 tracking-wider">Email Address</label>
              <div className="relative">
                <Mail size={14} className="absolute left-3 top-2.5 text-slate-500" />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="e.g. owner@mystall.com"
                  className="w-full bg-[#161616] border border-slate-800/80 rounded-xl pl-9 pr-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-[#FF6B35] placeholder:text-slate-600 transition"
                  required
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-1.5">
              <label className="text-[9px] uppercase font-black text-slate-450 tracking-wider">Password</label>
              <div className="relative">
                <Lock size={14} className="absolute left-3 top-2.5 text-slate-500" />
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-[#161616] border border-slate-800/80 rounded-xl pl-9 pr-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-[#FF6B35] placeholder:text-slate-600 transition"
                  required
                />
              </div>
            </div>



            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-2xl bg-gradient-to-tr from-[#FF6B35] to-[#FFB347] text-white font-black text-xs shadow-lg shadow-orange-500/25 border-t border-white/20 active:translate-y-0.5 active:shadow-sm transition-all focus:outline-none disabled:opacity-50 mt-2 flex items-center justify-center gap-2 hover:brightness-110"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : isLogin ? (
                'Sign In ⚡'
              ) : (
                'Claim License & Register 🎉'
              )}
            </button>

          </form>

          {/* Divider */}
          <div className="relative my-4 flex items-center justify-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-800"></div>
            </div>
            <span className="relative bg-[#121212] px-3 text-[9px] font-bold uppercase tracking-wider text-slate-500">
              Or Connect With
            </span>
          </div>

          {/* Google OAuth Button */}
          <button
            type="button"
            disabled={loading}
            onClick={handleGoogleSignIn}
            className="w-full py-2.5 rounded-2xl bg-[#181818] border border-slate-800 text-slate-200 font-extrabold text-xs active:scale-[0.98] transition flex items-center justify-center gap-2 hover:bg-[#202020] disabled:opacity-50"
          >
            {/* Google Vector Icon */}
            <svg className="w-3.5 h-3.5 mr-0.5" viewBox="0 0 24 24">
              <path
                fill="#EA4335"
                d="M12.24 10.285V14.4h6.887c-.648 2.41-2.519 4.2-5.136 4.2-3.429 0-6.228-2.77-6.228-6.185 0-3.414 2.799-6.184 6.228-6.184 1.54 0 2.944.553 4.032 1.47l3.023-3.024C19.19 2.19 15.996 1 12.24 1 6.033 1 1 6.033 1 12.24s5.033 11.24 11.24 11.24c5.895 0 10.865-4.04 10.865-11.24 0-.768-.068-1.39-.196-1.955H12.24Z"
              />
            </svg>
            Continue with Google
          </button>
        </div>

        {/* Offline Sandbox Fallback Hints */}
        <div className="text-center p-3 bg-[#121212]/50 border border-slate-900 rounded-2xl text-[10px] text-slate-500 font-medium">
          💡 Local offline test credential: <br/>
          <span className="font-mono text-slate-400">sandbox@vendoros.com</span> / <span className="font-mono text-slate-400">sandbox</span>
        </div>

      </div>
    </div>
  );
};
