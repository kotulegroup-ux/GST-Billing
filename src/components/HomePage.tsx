import React, { useState } from 'react';
import { 
  ShieldCheck, 
  UserCheck, 
  Lock, 
  Phone, 
  Mail, 
  Building, 
  MapPin, 
  CreditCard, 
  ArrowRight, 
  UserPlus, 
  LogIn, 
  CheckCircle2, 
  Receipt, 
  FileText, 
  AlertCircle,
  HelpCircle,
  Sparkles
} from 'lucide-react';
import { Client, INDIAN_STATES } from '../types';

interface HomePageProps {
  onLoginSuccess: (user: Client) => void;
}

export const HomePage: React.FC<HomePageProps> = ({ onLoginSuccess }) => {
  const [activeOption, setActiveOption] = useState<'SIGN_IN' | 'CREATE_ACCOUNT'>('SIGN_IN');

  // Sign In Form State
  const [signInUser, setSignInUser] = useState('');
  const [signInPassword, setSignInPassword] = useState('');
  const [signInError, setSignInError] = useState('');
  const [signInLoading, setSignInLoading] = useState(false);

  // Create Account Form State
  const [regData, setRegData] = useState({
    username: '',
    password: '',
    business_name: '',
    trade_name: '',
    gstin: '',
    state: 'Maharashtra',
    state_code: '27',
    address: '',
    phone: '',
    email: '',
    bank_name: 'HDFC Bank',
    bank_acc_no: '',
    bank_ifsc: '',
    bank_branch: ''
  });
  const [regError, setRegError] = useState('');
  const [regLoading, setRegLoading] = useState(false);

  // Handle Sign In
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setSignInError('');
    setSignInLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: signInUser,
          password: signInPassword
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Sign in failed');
      }

      onLoginSuccess(data.user);
    } catch (err: any) {
      setSignInError(err.message || 'Invalid Mobile/Email ID or Password');
    } finally {
      setSignInLoading(false);
    }
  };

  // Quick Demo Account Click
  const handleQuickDemo = (u: string, p: string) => {
    setActiveOption('SIGN_IN');
    setSignInUser(u);
    setSignInPassword(p);
  };

  // Handle State Selector in Registration
  const handleStateChange = (code: string) => {
    const s = INDIAN_STATES.find(st => st.code === code);
    setRegData({
      ...regData,
      state_code: code,
      state: s ? s.name : 'Maharashtra'
    });
  };

  // Handle Create Account (Registration)
  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError('');
    setRegLoading(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(regData)
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Registration failed');
      }

      onLoginSuccess(data.user);
    } catch (err: any) {
      setRegError(err.message || 'Failed to create account');
    } finally {
      setRegLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-900 to-indigo-950 text-slate-100 flex flex-col justify-between p-4 sm:p-6">
      <div className="max-w-md w-full mx-auto space-y-6 pt-4">
        
        {/* App Logo & Hero Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-400/20 text-indigo-300 text-xs font-semibold backdrop-blur-md">
            <Sparkles size={14} className="text-indigo-400" />
            <span>GST Multi-Client Accounting Portal</span>
          </div>

          <h1 className="text-3xl font-black tracking-tight text-white">
            FinTrack <span className="text-indigo-400 font-serif">GST</span>
          </h1>
          <p className="text-xs text-slate-400 max-w-xs mx-auto">
            Record sales, purchases, creditor payments, debtor receipts, ledger statements & GST returns.
          </p>
        </div>

        {/* --- MAIN TWO OPTIONS TOGGLE CARDS --- */}
        <div className="bg-slate-800/80 p-1.5 rounded-2xl border border-slate-700/80 grid grid-cols-2 gap-1.5 backdrop-blur-md shadow-xl">
          <button
            type="button"
            onClick={() => setActiveOption('SIGN_IN')}
            className={`py-3 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
              activeOption === 'SIGN_IN'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <LogIn size={16} />
            <span>Sign In</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveOption('CREATE_ACCOUNT')}
            className={`py-3 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
              activeOption === 'CREATE_ACCOUNT'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <UserPlus size={16} />
            <span>Create Account</span>
          </button>
        </div>

        {/* --- OPTION 1: SIGN IN VIEW --- */}
        {activeOption === 'SIGN_IN' && (
          <div className="bg-white text-slate-900 rounded-3xl p-6 shadow-2xl space-y-5 border border-slate-100">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Sign In to Your Account</h2>
              <p className="text-xs text-slate-500">Administrator or Client access</p>
            </div>

            {signInError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center gap-2">
                <AlertCircle size={16} className="shrink-0" />
                <span>{signInError}</span>
              </div>
            )}

            <form onSubmit={handleSignIn} className="space-y-4 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                  User ID (Mobile No or Email ID)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    placeholder="e.g. 9820012345 or kotulegroup@gmail.com"
                    value={signInUser}
                    onChange={e => setSignInUser(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 text-xs focus:border-indigo-600 focus:outline-none"
                  />
                  <Phone size={16} className="absolute left-3.5 top-3.5 text-slate-400" />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <input
                    type="password"
                    required
                    placeholder="Enter password"
                    value={signInPassword}
                    onChange={e => setSignInPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 text-xs focus:border-indigo-600 focus:outline-none"
                  />
                  <Lock size={16} className="absolute left-3.5 top-3.5 text-slate-400" />
                </div>
              </div>

              <button
                type="submit"
                disabled={signInLoading}
                className="w-full py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-lg shadow-indigo-100 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {signInLoading ? 'Signing In...' : 'Sign In'}
                <ArrowRight size={16} />
              </button>
            </form>

            {/* Quick Demo Credentials */}
            <div className="pt-3 border-t border-slate-100 space-y-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Quick 1-Click Test Accounts
              </span>
              <div className="space-y-1.5">
                <button
                  type="button"
                  onClick={() => handleQuickDemo('kotulegroup@gmail.com', 'admin123')}
                  className="w-full text-left p-2.5 rounded-xl bg-amber-50/80 hover:bg-amber-100/70 border border-amber-200/60 transition-colors flex items-center justify-between"
                >
                  <div>
                    <span className="text-xs font-bold text-amber-950 block">👑 Administrator (Full Control)</span>
                    <span className="text-[10px] text-amber-700 font-mono">kotulegroup@gmail.com / admin123</span>
                  </div>
                  <span className="text-[9px] bg-amber-200 text-amber-900 font-bold px-1.5 py-0.5 rounded">Admin</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickDemo('9820012345', 'client123')}
                  className="w-full text-left p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-colors flex items-center justify-between"
                >
                  <div>
                    <span className="text-xs font-bold text-slate-900 block">👤 Client 1: Apex Electronics (MH)</span>
                    <span className="text-[10px] text-slate-500 font-mono">9820012345 / client123</span>
                  </div>
                  <span className="text-[9px] bg-slate-200 text-slate-700 font-bold px-1.5 py-0.5 rounded">Client</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickDemo('9890098765', 'client123')}
                  className="w-full text-left p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-colors flex items-center justify-between"
                >
                  <div>
                    <span className="text-xs font-bold text-slate-900 block">👤 Client 2: Gujarat Solvents (GJ)</span>
                    <span className="text-[10px] text-slate-500 font-mono">9890098765 / client123</span>
                  </div>
                  <span className="text-[9px] bg-slate-200 text-slate-700 font-bold px-1.5 py-0.5 rounded">Client</span>
                </button>
              </div>
            </div>

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => setActiveOption('CREATE_ACCOUNT')}
                className="text-xs text-indigo-600 font-bold hover:underline"
              >
                Don't have an account? Create Account →
              </button>
            </div>
          </div>
        )}

        {/* --- OPTION 2: CREATE ACCOUNT VIEW --- */}
        {activeOption === 'CREATE_ACCOUNT' && (
          <div className="bg-white text-slate-900 rounded-3xl p-6 shadow-2xl space-y-4 border border-slate-100">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Create New Business Account</h2>
              <p className="text-xs text-slate-500">Sign up your company to start recording entries & GST invoices</p>
            </div>

            {regError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center gap-2">
                <AlertCircle size={16} className="shrink-0" />
                <span>{regError}</span>
              </div>
            )}

            <form onSubmit={handleCreateAccount} className="space-y-3.5 text-xs">
              
              {/* Credentials Box */}
              <div className="p-3.5 bg-indigo-50/60 rounded-2xl border border-indigo-100 space-y-2.5">
                <p className="font-bold uppercase tracking-wider text-indigo-900 flex items-center gap-1.5 text-[10px]">
                  <Lock size={13} /> Account Login Credentials
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-1">
                      User ID (Mobile No or Email) *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 9811122233"
                      value={regData.username}
                      onChange={e => setRegData({ ...regData, username: e.target.value })}
                      className="w-full p-2.5 rounded-xl border border-slate-200 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-1">Password *</label>
                    <input
                      type="password"
                      required
                      placeholder="Create password"
                      value={regData.password}
                      onChange={e => setRegData({ ...regData, password: e.target.value })}
                      className="w-full p-2.5 rounded-xl border border-slate-200 bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* Business Info */}
              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                  Legal Business Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Shanti Infotech & Spares"
                  value={regData.business_name}
                  onChange={e => setRegData({ ...regData, business_name: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-200"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                    GSTIN (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="27ABCDE1234F1Z5"
                    value={regData.gstin}
                    onChange={e => setRegData({ ...regData, gstin: e.target.value.toUpperCase() })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                    Location / State *
                  </label>
                  <select
                    value={regData.state_code}
                    onChange={e => handleStateChange(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-white font-medium"
                  >
                    {INDIAN_STATES.map(s => (
                      <option key={s.code} value={s.code}>
                        {s.code} - {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                  Business Address (For Invoices)
                </label>
                <input
                  type="text"
                  placeholder="Street, City, Pincode"
                  value={regData.address}
                  onChange={e => setRegData({ ...regData, address: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-200"
                />
              </div>

              {/* Bank Details */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                    Bank Name
                  </label>
                  <input
                    type="text"
                    placeholder="HDFC / SBI / ICICI"
                    value={regData.bank_name}
                    onChange={e => setRegData({ ...regData, bank_name: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                    Account Number
                  </label>
                  <input
                    type="text"
                    placeholder="Bank A/C No."
                    value={regData.bank_acc_no}
                    onChange={e => setRegData({ ...regData, bank_acc_no: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 font-mono"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={regLoading}
                className="w-full py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-lg shadow-indigo-100 transition-all flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
              >
                {regLoading ? 'Creating Account & Ledgers...' : 'Create Account & Open Books'}
                <ArrowRight size={16} />
              </button>
            </form>

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => setActiveOption('SIGN_IN')}
                className="text-xs text-indigo-600 font-bold hover:underline"
              >
                Already have an account? Sign In →
              </button>
            </div>
          </div>
        )}

        {/* Feature Highlights Footer */}
        <div className="pt-2 text-[11px] text-slate-400 space-y-1.5 text-center">
          <p className="flex items-center justify-center gap-2 text-slate-300 font-medium">
            <CheckCircle2 size={13} className="text-emerald-400" />
            Automatic Intra-State (CGST+SGST) vs Inter-State (IGST) by Place of Supply
          </p>
          <p className="flex items-center justify-center gap-2 text-slate-300 font-medium">
            <CheckCircle2 size={13} className="text-emerald-400" />
            Tax Invoices with QR Code, Party Statements & GSTR-1/3B Computations
          </p>
        </div>

      </div>

      <div className="text-center text-[10px] text-slate-500 py-3">
        FinTrack GST Accounting • Compliant with CGST Rules 2017
      </div>
    </div>
  );
};
