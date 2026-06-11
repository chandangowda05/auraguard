import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Radio, Lock, Phone, AlertCircle } from 'lucide-react';
export default function Login() {
  const { login, error: authError } = useAuth();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!phone || !password) {
      setLocalError('Please enter both phone and password');
      return;
    }
    
    setLocalError('');
    setLoading(true);
    try {
      await login(phone, password);
    } catch (err) {
      // Error handled in catch block and AuthContext
      setLocalError(err.message || 'Login failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center px-4 overflow-hidden">
      {/* Decorative Blur Orbs */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full bg-blue-600/10 blur-[100px]" />
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-80 h-80 rounded-full bg-purple-600/10 blur-[100px]" />

      <div className="w-full max-w-md relative z-10">
        {/* Branding header */}
        <div className="flex flex-col items-center mb-8">
          <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-600/10 border border-blue-500/20 text-blue-500 mb-4 shadow-lg shadow-blue-500/10 critical-pulse">
            <Radio size={30} />
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight font-sans">AuraGuard</h1>
          <p className="text-sm text-slate-400 font-medium mt-1">AI-Enabled Smart Wristband Monitor</p>
        </div>

        {/* Glass Card */}
        <div className="p-8 rounded-3xl border border-slate-800 bg-[#0d1321]/70 backdrop-blur-xl shadow-2xl space-y-6">
          <div>
            <h2 className="text-xl font-bold text-white">System Authentication</h2>
            <p className="text-xs text-slate-500 mt-1">Authorized control room personnel only</p>
          </div>

          {(localError || authError) && (
            <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <span>{localError || authError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Phone */}
            <div className="space-y-1.5">
              <label className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Mobile Number</label>
              <div className="relative">
                <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                <input
                  type="text"
                  placeholder="+1234567890"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 text-sm text-slate-200 bg-slate-950/40 rounded-xl border border-slate-800 focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 text-sm text-slate-200 bg-slate-950/40 rounded-xl border border-slate-800 focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 text-sm font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-xl transition-all shadow-lg shadow-blue-600/15 focus:outline-none focus:ring-2 focus:ring-blue-500/50 disabled:opacity-50 active:scale-[0.99]"
            >
              {loading ? 'Decrypting Session...' : 'Authenticate Access'}
            </button>
          </form>

          {/* Seeding credentials help box */}
          <div className="p-4 rounded-2xl bg-slate-950/50 border border-slate-800/80 text-[11px] text-slate-400 space-y-2">
            <span className="block font-semibold text-slate-300">Default Demo Credentials:</span>
            <div className="grid grid-cols-2 gap-2 text-[10px]">
              <div>
                <span className="block text-[9px] text-blue-400 font-semibold uppercase">Administrator</span>
                <span className="block">Phone: <strong className="text-slate-200">+1234567890</strong></span>
                <span className="block">Pass: <strong className="text-slate-200">password123</strong></span>
              </div>
              <div>
                <span className="block text-[9px] text-purple-400 font-semibold uppercase">Supervisor</span>
                <span className="block">Phone: <strong className="text-slate-200">+1987654321</strong></span>
                <span className="block">Pass: <strong className="text-slate-200">password123</strong></span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
