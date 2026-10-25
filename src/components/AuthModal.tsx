import React, { useState } from 'react';
import { ShieldCheck, UserCheck, Lock, Phone, Mail, ArrowRight, X, AlertCircle } from 'lucide-react';
import { Client } from '../types';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: Client | null;
  onLoginSuccess: (user: Client) => void;
  onLogout: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onLoginSuccess,
  onLogout
}) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Authentication failed');
      }

      onLoginSuccess(data.user);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = (u: string, p: string) => {
    setUsername(u);
    setPassword(p);
  };

  return (
    <div className="fixed inset-0 z-[120] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl border border-slate-100 overflow-hidden">
        {/* Header */}
        <div className="p-6 bg-gradient-to-r from-indigo-900 to-indigo-700 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
          >
            <X size={18} />
          </button>

          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center">
              <ShieldCheck size={22} className="text-indigo-200" />
            </div>
            <div>
              <h2 className="text-xl font-bold">GST Accounting Portal</h2>
              <p className="text-xs text-indigo-200">Admin & Client Multi-User Access</p>
            </div>
          </div>
        </div>

        {currentUser ? (
          <div className="p-6 space-y-5">
            <div className="p-4 bg-indigo-50/60 rounded-2xl border border-indigo-100">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-bold text-lg">
                  {currentUser.role === 'ADMIN' ? 'AD' : 'CL'}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900">{currentUser.business_name}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                      currentUser.role === 'ADMIN' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                    }`}>
                      {currentUser.role}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">User ID: {currentUser.username}</p>
                  {currentUser.gstin && <p className="text-[11px] text-indigo-600 font-mono mt-0.5">GSTIN: {currentUser.gstin}</p>}
                </div>
              </div>
            </div>

            <div className="space-y-2 text-xs text-slate-600">
              <p>• <strong>Role:</strong> {currentUser.role === 'ADMIN' ? 'Administrator (Full access to all client data, reports, modifications)' : 'Client (Record sales, purchases, payments, receipts, ledger statements)'}</p>
              <p>• <strong>State:</strong> {currentUser.state} (Code: {currentUser.state_code})</p>
            </div>

            <div className="pt-2 flex gap-3">
              <button
                onClick={onLogout}
                className="flex-1 py-3 px-4 rounded-xl border border-rose-200 text-rose-600 font-bold hover:bg-rose-50 transition-colors"
              >
                Sign Out
              </button>
              <button
                onClick={onClose}
                className="flex-1 py-3 px-4 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 transition-colors"
              >
                Continue
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleLogin} className="p-6 space-y-4">
            {error && (
              <div className="p-3 bg-rose-50 border border-rose-100 text-rose-600 rounded-xl text-xs flex items-center gap-2 font-medium">
                <AlertCircle size={16} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                User ID (Mobile No or Email ID)
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  placeholder="e.g. 9820012345 or kotulegroup@gmail.com"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 text-sm focus:border-indigo-600 focus:outline-none"
                />
                <Phone size={18} className="absolute left-3.5 top-3.5 text-slate-400" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  type="password"
                  required
                  placeholder="Enter your password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 text-sm focus:border-indigo-600 focus:outline-none"
                />
                <Lock size={18} className="absolute left-3.5 top-3.5 text-slate-400" />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl bg-indigo-600 text-white font-bold shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-50"
            >
              {loading ? 'Authenticating...' : 'Sign In'}
              <ArrowRight size={16} />
            </button>

            {/* Quick Demo Logins */}
            <div className="pt-3 border-t border-slate-100 space-y-2">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Quick Demo Accounts (Click to fill)
              </p>
              <div className="space-y-1.5">
                <button
                  type="button"
                  onClick={() => handleQuickLogin('kotulegroup@gmail.com', 'admin123')}
                  className="w-full text-left p-2 rounded-xl bg-amber-50 hover:bg-amber-100/70 border border-amber-200/60 transition-colors flex items-center justify-between"
                >
                  <div>
                    <span className="text-xs font-bold text-amber-900 block">👑 Administrator</span>
                    <span className="text-[10px] text-amber-700">kotulegroup@gmail.com (pwd: admin123)</span>
                  </div>
                  <span className="text-[10px] bg-amber-200 text-amber-900 font-bold px-1.5 py-0.5 rounded">All Access</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickLogin('9820012345', 'client123')}
                  className="w-full text-left p-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-colors flex items-center justify-between"
                >
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">👤 Client 1: Apex Electronics (MH)</span>
                    <span className="text-[10px] text-slate-500">Mobile: 9820012345 (pwd: client123)</span>
                  </div>
                  <span className="text-[10px] bg-slate-200 text-slate-700 font-bold px-1.5 py-0.5 rounded">Client</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickLogin('9890098765', 'client123')}
                  className="w-full text-left p-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-colors flex items-center justify-between"
                >
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">👤 Client 2: Gujarat Solvents (GJ)</span>
                    <span className="text-[10px] text-slate-500">Mobile: 9890098765 (pwd: client123)</span>
                  </div>
                  <span className="text-[10px] bg-slate-200 text-slate-700 font-bold px-1.5 py-0.5 rounded">Client</span>
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
