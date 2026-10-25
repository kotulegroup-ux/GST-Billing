import React, { useState, useMemo, useEffect } from 'react';
import { 
  Users, 
  UserPlus, 
  Eye, 
  Edit3, 
  Trash2, 
  ShieldCheck, 
  ArrowRight, 
  Building, 
  Phone, 
  Mail, 
  Key, 
  MapPin, 
  CreditCard,
  CheckCircle,
  X,
  AlertCircle,
  Search,
  Filter,
  ArrowUpDown,
  FileText,
  FileCheck,
  RefreshCw,
  TrendingUp,
  ArrowUpRight,
  ArrowDownLeft,
  ChevronRight,
  BarChart3,
  Cloud,
  Download,
  HardDrive
} from 'lucide-react';
import { Client, INDIAN_STATES } from '../types';
import { MonthwiseReport } from './MonthwiseReport';

interface AdminPortalProps {
  clients: Client[];
  currentClient: Client;
  impersonatedClient: Client | null;
  onRefresh: () => void;
  onImpersonate: (client: Client) => void;
  onExitImpersonate: () => void;
  onNavigateToGST: (client?: Client) => void;
}

export const AdminPortal: React.FC<AdminPortalProps> = ({
  clients,
  currentClient,
  impersonatedClient,
  onRefresh,
  onImpersonate,
  onExitImpersonate,
  onNavigateToGST
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [selectedClientId, setSelectedClientId] = useState<number | null>(
    impersonatedClient?.id || null
  );
  const [selectedClientForMonthwise, setSelectedClientForMonthwise] = useState<Client | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStateFilter, setSelectedStateFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState<'name' | 'sales' | 'receivables' | 'payables'>('name');

  // Google Drive Admin Cloud Backup State
  const [driveStatus, setDriveStatus] = useState<any>(null);
  const [isSyncingDrive, setIsSyncingDrive] = useState(false);
  const [syncMsg, setSyncMsg] = useState('');

  const fetchDriveStatus = async () => {
    try {
      const res = await fetch('/api/drive/admin-status');
      if (res.ok) {
        const data = await res.json();
        setDriveStatus(data);
      }
    } catch (e) {
      console.error("Drive status fetch failed", e);
    }
  };

  useEffect(() => {
    fetchDriveStatus();
  }, []);

  const handleSyncAllClientsToDrive = async () => {
    setIsSyncingDrive(true);
    setSyncMsg('');
    try {
      const res = await fetch('/api/drive/sync-all-client-data', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setSyncMsg(`✓ Backed up ${data.files_synced} files to Google Drive folder "${data.folder_name}"!`);
        fetchDriveStatus();
      } else {
        setSyncMsg(data.error || 'Failed to sync with Google Drive.');
      }
    } catch (e: any) {
      setSyncMsg('Sync request failed.');
    } finally {
      setIsSyncingDrive(false);
    }
  };

  // Form State
  const [formData, setFormData] = useState({
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

  const resetForm = () => {
    setFormData({
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
    setEditingClient(null);
    setError('');
  };

  const handleStateChange = (code: string) => {
    const s = INDIAN_STATES.find(st => st.code === code);
    setFormData({
      ...formData,
      state_code: code,
      state: s ? s.name : 'Maharashtra'
    });
  };

  const handleSaveClient = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const url = editingClient ? `/api/admin/clients/${editingClient.id}` : '/api/admin/clients';
      const method = editingClient ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save client');

      onRefresh();
      setShowAddModal(false);
      resetForm();
    } catch (err: any) {
      setError(err.message || 'Error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClient = async (id: number) => {
    if (!confirm('Are you sure you want to permanently delete this client and all their accounting books?')) return;

    try {
      const res = await fetch(`/api/admin/clients/${id}`, { method: 'DELETE' });
      if (res.ok) {
        onRefresh();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to delete client');
      }
    } catch (e) {
      alert('Delete failed');
    }
  };

  const openEdit = (c: Client) => {
    setEditingClient(c);
    setFormData({
      username: c.username,
      password: '', // Leave blank to keep existing
      business_name: c.business_name,
      trade_name: c.trade_name || '',
      gstin: c.gstin || '',
      state: c.state || 'Maharashtra',
      state_code: c.state_code || '27',
      address: c.address || '',
      phone: c.phone || '',
      email: c.email || '',
      bank_name: c.bank_name || 'HDFC Bank',
      bank_acc_no: c.bank_acc_no || '',
      bank_ifsc: c.bank_ifsc || '',
      bank_branch: c.bank_branch || ''
    });
    setShowAddModal(true);
  };

  const regularClients = useMemo(() => {
    return clients.filter(c => c.role === 'CLIENT');
  }, [clients]);

  useEffect(() => {
    if (impersonatedClient) {
      setSelectedClientId(impersonatedClient.id);
    } else if (selectedClientId === null && regularClients.length > 0) {
      setSelectedClientId(regularClients[0].id);
    }
  }, [impersonatedClient, regularClients, selectedClientId]);

  const activeClient = useMemo(() => {
    return regularClients.find(c => c.id === selectedClientId) || regularClients[0] || null;
  }, [regularClients, selectedClientId]);

  const totalSales = useMemo(() => regularClients.reduce((sum, c) => sum + (c.sales_total || 0), 0), [regularClients]);
  const totalReceivables = useMemo(() => regularClients.reduce((sum, c) => sum + (c.receivables_total || 0), 0), [regularClients]);
  const totalPayables = useMemo(() => regularClients.reduce((sum, c) => sum + (c.payables_total || 0), 0), [regularClients]);

  // Filtered & Sorted clients
  const filteredClients = useMemo(() => {
    return regularClients.filter(c => {
      const q = searchTerm.toLowerCase().trim();
      const matchQuery = !q || 
        c.business_name.toLowerCase().includes(q) ||
        (c.trade_name && c.trade_name.toLowerCase().includes(q)) ||
        c.username.toLowerCase().includes(q) ||
        (c.phone && c.phone.toLowerCase().includes(q)) ||
        (c.gstin && c.gstin.toLowerCase().includes(q)) ||
        (c.state && c.state.toLowerCase().includes(q));

      const matchState = selectedStateFilter === 'ALL' || c.state_code === selectedStateFilter;
      return matchQuery && matchState;
    }).sort((a, b) => {
      if (sortBy === 'sales') return (b.sales_total || 0) - (a.sales_total || 0);
      if (sortBy === 'receivables') return (b.receivables_total || 0) - (a.receivables_total || 0);
      if (sortBy === 'payables') return (b.payables_total || 0) - (a.payables_total || 0);
      return a.business_name.localeCompare(b.business_name);
    });
  }, [regularClients, searchTerm, selectedStateFilter, sortBy]);

  return (
    <div className="p-4 space-y-6 pb-28">
      
      {/* Admin Impersonation Notice Bar */}
      {impersonatedClient && (
        <div className="p-4 bg-amber-500 text-slate-950 rounded-2xl flex justify-between items-center shadow-md">
          <div className="flex items-center gap-2">
            <Eye size={20} className="shrink-0" />
            <div>
              <p className="text-xs font-black uppercase tracking-wider">Active Client Inspection Mode</p>
              <p className="text-sm font-bold">Managing Books for: {impersonatedClient.business_name}</p>
            </div>
          </div>
          <button
            onClick={onExitImpersonate}
            className="px-3 py-1.5 bg-slate-950 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-colors shadow-sm"
          >
            Exit to Client List
          </button>
        </div>
      )}

      {/* Header & Metrics */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-amber-100 text-amber-800 rounded-lg text-xs font-black">👑 Tax Consultant</span>
            <span className="text-xs text-slate-400 font-bold">•</span>
            <span className="text-xs text-slate-500 font-semibold">{regularClients.length} Registered Clients (Client 1 & Client 2)</span>
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight mt-1">Tax Consultant Dashboard</h2>
          <p className="text-xs text-slate-500">Monitor Client 1 & Client 2 portfolios, monthwise sale/purchase data, audit books & GST returns</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onRefresh}
            className="p-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl transition-colors shadow-xs"
            title="Refresh Client Data"
          >
            <RefreshCw size={16} />
          </button>
          <button
            onClick={() => { resetForm(); setShowAddModal(true); }}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs shadow-md shadow-indigo-100 transition-all"
          >
            <UserPlus size={16} />
            <span>+ Add New Client</span>
          </button>
        </div>
      </div>

      {/* Google Drive Cloud Backup & Auto-Sync Card for Admin */}
      <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-indigo-950 p-4 sm:p-5 rounded-3xl text-white shadow-xl border border-emerald-500/30 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center shrink-0">
              <Cloud size={20} className="text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Google Drive Cloud Storage
                </span>
                <span className="text-xs text-slate-400">•</span>
                <span className="text-xs text-emerald-400 font-bold">
                  {driveStatus?.email || 'Admin Cloud Vault'}
                </span>
              </div>
              <h3 className="text-sm sm:text-base font-black mt-0.5">
                Client Data Google Drive Backup & Recovery
              </h3>
              <p className="text-[11px] text-slate-300">
                All client accounting books, invoices, and vouchers are backed up to Admin's Google Drive folder.
                {driveStatus?.last_sync_time && (
                  <span className="text-slate-400 ml-1">
                    (Last Synced: {new Date(driveStatus.last_sync_time).toLocaleDateString()} {new Date(driveStatus.last_sync_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <a
              href="/api/drive/download-backup"
              download="fintrack_all_clients_backup.json"
              className="flex items-center gap-1.5 px-3 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition-colors border border-white/15"
              title="Download local JSON archive of all clients data"
            >
              <Download size={14} />
              <span>Download JSON</span>
            </a>

            <button
              onClick={handleSyncAllClientsToDrive}
              disabled={isSyncingDrive}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl text-xs font-black shadow-md shadow-emerald-500/20 transition-all disabled:opacity-50"
            >
              <Cloud size={14} className={isSyncingDrive ? 'animate-pulse' : ''} />
              <span>{isSyncingDrive ? 'Syncing to Drive...' : 'Sync All Data to Drive'}</span>
            </button>
          </div>
        </div>

        {syncMsg && (
          <div className="p-2.5 bg-emerald-900/60 border border-emerald-500/40 rounded-xl text-xs text-emerald-200 font-semibold flex items-center justify-between">
            <span>{syncMsg}</span>
            <button onClick={() => setSyncMsg('')} className="text-emerald-400 hover:text-white text-xs">✕</button>
          </div>
        )}
      </div>

      {/* Overview Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-bold uppercase text-slate-400">Total Clients</p>
            <Users size={14} className="text-indigo-400" />
          </div>
          <p className="text-2xl font-black text-slate-900 mt-1">{regularClients.length}</p>
          <p className="text-[10px] text-slate-500 mt-0.5">Active Portfolios</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-bold uppercase text-slate-400">Combined Sales</p>
            <TrendingUp size={14} className="text-indigo-500" />
          </div>
          <p className="text-2xl font-black text-indigo-600 mt-1">₹{totalSales.toLocaleString('en-IN')}</p>
          <p className="text-[10px] text-slate-500 mt-0.5">All clients combined</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-bold uppercase text-slate-400">Total Receivables</p>
            <ArrowUpRight size={14} className="text-emerald-500" />
          </div>
          <p className="text-2xl font-black text-emerald-600 mt-1">₹{totalReceivables.toLocaleString('en-IN')}</p>
          <p className="text-[10px] text-slate-500 mt-0.5">Sundry Debtors</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-bold uppercase text-slate-400">Total Payables</p>
            <ArrowDownLeft size={14} className="text-rose-500" />
          </div>
          <p className="text-2xl font-black text-rose-600 mt-1">₹{totalPayables.toLocaleString('en-IN')}</p>
          <p className="text-[10px] text-slate-500 mt-0.5">Sundry Creditors</p>
        </div>
      </div>

      {/* Clients Directory Controls & Search */}
      <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row gap-2 justify-between items-stretch sm:items-center">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by client business name, mobile, user ID, or GSTIN..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')} 
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <select
              value={selectedStateFilter}
              onChange={e => setSelectedStateFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold px-3 py-2 text-slate-700"
            >
              <option value="ALL">All States</option>
              {INDIAN_STATES.map(s => (
                <option key={s.code} value={s.code}>{s.name} ({s.code})</option>
              ))}
            </select>

            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as any)}
              className="bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold px-3 py-2 text-slate-700"
            >
              <option value="name">Sort: Name (A-Z)</option>
              <option value="sales">Sort: Highest Sales</option>
              <option value="receivables">Sort: Highest Debtors</option>
              <option value="payables">Sort: Highest Payables</option>
            </select>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-slate-500 pt-1 border-t border-slate-100">
          <span className="font-semibold">
            Showing <strong className="text-slate-900">{filteredClients.length}</strong> of {regularClients.length} clients
          </span>
          <button
            onClick={() => onNavigateToGST()}
            className="text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1 hover:underline"
          >
            <span>Consolidated GST Reports</span>
            <ChevronRight size={14} />
          </button>
        </div>
      </div>

      {/* Clients List Cards */}
      <div className="space-y-3.5">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-500">
            Clients Directory (Click any client to inspect Month-Wise Data below)
          </h3>
          <span className="text-xs font-bold text-indigo-600">
            Selected: {activeClient ? activeClient.business_name : 'None'}
          </span>
        </div>

        {filteredClients.map((c) => {
          const isSelected = activeClient?.id === c.id;

          return (
            <div
              key={c.id}
              onClick={() => setSelectedClientId(c.id)}
              className={`bg-white p-4 sm:p-5 rounded-3xl border transition-all space-y-4 shadow-xs cursor-pointer ${
                isSelected 
                  ? 'border-indigo-500 ring-2 ring-indigo-500/25 bg-gradient-to-r from-indigo-50/40 via-white to-white' 
                  : 'border-slate-100 hover:border-indigo-200 hover:bg-slate-50/50'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div className="space-y-1.5 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="text-base font-black text-slate-900">{c.business_name}</h4>
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
                      State: {c.state} ({c.state_code})
                    </span>
                    {isSelected && (
                      <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-indigo-600 text-white flex items-center gap-1 shadow-xs">
                        <CheckCircle size={10} />
                        <span>Month-Wise Data Active Below</span>
                      </span>
                    )}
                  </div>

                  {c.trade_name && (
                    <p className="text-xs font-semibold text-slate-500">Trade: {c.trade_name}</p>
                  )}
                  
                  {/* Credentials & Details Badges */}
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 pt-1 text-xs text-slate-600">
                    <span className="inline-flex items-center gap-1.5 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200/80">
                      <Key size={13} className="text-indigo-600" />
                      <span className="text-slate-400">User ID:</span> 
                      <strong className="text-slate-900 font-mono">{c.username}</strong>
                    </span>

                    {c.gstin ? (
                      <span className="inline-flex items-center gap-1.5 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200/80 font-mono">
                        <span className="text-slate-400">GSTIN:</span>
                        <strong className="text-slate-900">{c.gstin}</strong>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] text-slate-400 italic">
                        No GSTIN
                      </span>
                    )}

                    {c.phone && (
                      <span className="inline-flex items-center gap-1 text-slate-500">
                        <Phone size={12} className="text-slate-400" />
                        <span>{c.phone}</span>
                      </span>
                    )}
                  </div>

                  {c.address && (
                    <p className="text-[11px] text-slate-500 flex items-center gap-1 pt-0.5">
                      <MapPin size={12} className="text-slate-400 shrink-0" />
                      <span className="truncate">{c.address}</span>
                    </p>
                  )}
                </div>

                {/* Financial Snapshot */}
                <div className="grid grid-cols-3 sm:flex sm:flex-col sm:items-end gap-2 bg-slate-50/80 sm:bg-transparent p-3 sm:p-0 rounded-2xl border sm:border-0 border-slate-100">
                  <div>
                    <p className="text-[9px] uppercase font-bold text-slate-400 sm:text-right">Sales Turnover</p>
                    <p className="text-sm font-black text-indigo-950 sm:text-right">₹{(c.sales_total || 0).toLocaleString('en-IN')}</p>
                  </div>
                  <div>
                    <p className="text-[9px] uppercase font-bold text-emerald-600 sm:text-right">Debtors (Recv)</p>
                    <p className="text-xs font-black text-emerald-700 sm:text-right">₹{(c.receivables_total || 0).toLocaleString('en-IN')}</p>
                  </div>
                  <div>
                    <p className="text-[9px] uppercase font-bold text-rose-600 sm:text-right">Creditors (Pay)</p>
                    <p className="text-xs font-black text-rose-700 sm:text-right">₹{(c.payables_total || 0).toLocaleString('en-IN')}</p>
                  </div>
                </div>
              </div>

              {/* Action Bar */}
              <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedClientId(c.id);
                      const el = document.getElementById('selected-client-monthwise-section');
                      if (el) el.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all border ${
                      isSelected 
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs' 
                        : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border-indigo-200/60'
                    }`}
                    title="View month-wise sales, purchase, margin, and GST data for this client"
                  >
                    <BarChart3 size={14} />
                    <span>{isSelected ? '✓ Viewing Month-Wise Data' : 'Select Client / View Monthwise'}</span>
                  </button>

                  <button
                    onClick={(e) => { e.stopPropagation(); onImpersonate(c); }}
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black shadow-xs transition-colors"
                    title="Open client's books to view, record, or modify voucher and invoice entries"
                  >
                    <Eye size={14} />
                    <span>Open Books</span>
                  </button>

                  <button
                    onClick={(e) => { e.stopPropagation(); onNavigateToGST(c); }}
                    className="flex items-center gap-1.5 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl text-xs font-bold transition-colors border border-emerald-200/50"
                    title="View GSTR-1, GSTR-2B, and GSTR-3B for this client"
                  >
                    <FileCheck size={14} />
                    <span>GST Returns</span>
                  </button>

                  <button
                    onClick={(e) => { e.stopPropagation(); openEdit(c); }}
                    className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors"
                    title="Update Client User ID, Password, and Business Profile"
                  >
                    <Edit3 size={13} />
                    <span>Edit Profile</span>
                  </button>
                </div>

                <button
                  onClick={(e) => { e.stopPropagation(); handleDeleteClient(c.id); }}
                  className="p-2 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors ml-auto"
                  title="Permanently Delete Client & Records"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          );
        })}

        {filteredClients.length === 0 && (
          <div className="text-center py-12 bg-white rounded-3xl border border-slate-100 text-slate-400 space-y-3">
            <Users size={36} className="mx-auto text-slate-300" />
            <p className="text-sm font-semibold text-slate-600">No clients match your filter</p>
            <p className="text-xs text-slate-400">Try modifying your search query or reset the filters</p>
            <button
              onClick={() => { setSearchTerm(''); setSelectedStateFilter('ALL'); }}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl"
            >
              Reset Filters
            </button>
          </div>
        )}
      </div>

      {/* --- DASHBOARD SECTION: MONTH-WISE DATA OF THE PARTICULAR SELECTED CLIENT --- */}
      {activeClient && (
        <section id="selected-client-monthwise-section" className="pt-4 space-y-4 border-t-2 border-indigo-100">
          
          {/* Header Banner for Selected Client Month-wise Analytics */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-4 sm:p-5 bg-gradient-to-r from-indigo-950 via-indigo-900 to-indigo-800 text-white rounded-3xl shadow-xl shadow-indigo-100/50">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-indigo-700/80 flex items-center justify-center shrink-0 border border-indigo-500/30 shadow-md">
                <BarChart3 size={24} className="text-emerald-300" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-indigo-300 bg-indigo-800/90 px-2 py-0.5 rounded-md">
                    Selected Client Month-Wise Data
                  </span>
                  <span className="text-xs text-indigo-300">•</span>
                  <span className="text-xs text-emerald-300 font-bold font-mono">
                    GSTIN: {activeClient.gstin || 'Unregistered'}
                  </span>
                </div>
                <h3 className="text-xl font-black mt-0.5 tracking-tight text-white">
                  {activeClient.business_name}
                </h3>
                <p className="text-xs text-indigo-200">
                  User ID: <span className="font-mono font-bold text-white">{activeClient.username}</span> • State: {activeClient.state} ({activeClient.state_code})
                </p>
              </div>
            </div>

            {/* Quick Switch Client Dropdown & Actions */}
            <div className="flex flex-wrap items-center gap-2 pt-2 md:pt-0 border-t md:border-t-0 border-indigo-800/80">
              <span className="text-xs text-indigo-200 font-bold hidden sm:inline">Select Client:</span>
              <select
                value={activeClient.id}
                onChange={(e) => setSelectedClientId(parseInt(e.target.value))}
                className="bg-indigo-800 text-white border border-indigo-600 text-xs font-bold px-3 py-2 rounded-xl cursor-pointer focus:outline-hidden"
              >
                {regularClients.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.business_name} ({c.state})
                  </option>
                ))}
              </select>

              <button
                onClick={() => onImpersonate(activeClient)}
                className="px-4 py-2 bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-black rounded-xl text-xs transition-colors shadow-sm flex items-center gap-1.5"
                title="Open client's full accounting books to record or audit vouchers"
              >
                <Eye size={14} />
                <span>Open Books</span>
              </button>
            </div>
          </div>

          {/* Monthwise Sale & Purchase Report for this Client */}
          <MonthwiseReport
            client={activeClient}
            isAdmin={true}
            isModal={false}
            onOpenVoucherModal={() => onImpersonate(activeClient)}
          />
        </section>
      )}

      {/* --- ADD / EDIT CLIENT MODAL --- */}
      {showAddModal && (
        <div className="fixed inset-0 z-[130] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-slate-100 overflow-hidden my-auto max-h-[92vh] flex flex-col">
            
            <div className="p-5 bg-slate-900 text-white flex justify-between items-center shrink-0">
              <div>
                <h3 className="text-lg font-bold">{editingClient ? 'Edit Client Account' : 'Register New Client'}</h3>
                <p className="text-xs text-slate-400">Separate login credentials & GST business profile</p>
              </div>
              <button onClick={() => setShowAddModal(false)} className="p-2 rounded-full bg-slate-800 text-slate-300 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveClient} className="p-5 space-y-4 overflow-y-auto flex-1 text-xs">
              {error && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl flex items-center gap-2">
                  <AlertCircle size={16} className="shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Login Credentials Box */}
              <div className="p-3.5 bg-indigo-50/60 rounded-2xl border border-indigo-100 space-y-3">
                <p className="font-bold uppercase tracking-wider text-indigo-900 flex items-center gap-1.5">
                  <Key size={14} /> Client Login Credentials
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      User ID (Mobile No or Email ID) *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 9820012345"
                      value={formData.username}
                      onChange={e => setFormData({ ...formData, username: e.target.value })}
                      className="w-full p-2.5 rounded-xl border border-slate-200 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      {editingClient ? 'New Password (Optional)' : 'Password *'}
                    </label>
                    <input
                      type="text"
                      required={!editingClient}
                      placeholder={editingClient ? 'Keep current password' : 'Enter password'}
                      value={formData.password}
                      onChange={e => setFormData({ ...formData, password: e.target.value })}
                      className="w-full p-2.5 rounded-xl border border-slate-200 bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* Business Profile */}
              <div className="space-y-3">
                <p className="font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Building size={14} /> Business & GST Profile
                </p>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Legal Business Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Apex Electronics & Spares Pvt Ltd"
                    value={formData.business_name}
                    onChange={e => setFormData({ ...formData, business_name: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Trade Name (Optional)</label>
                    <input
                      type="text"
                      placeholder="e.g. Apex Electronics"
                      value={formData.trade_name}
                      onChange={e => setFormData({ ...formData, trade_name: e.target.value })}
                      className="w-full p-2.5 rounded-xl border border-slate-200"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">GSTIN Number</label>
                    <input
                      type="text"
                      placeholder="27AABCA1234F1Z5"
                      value={formData.gstin}
                      onChange={e => setFormData({ ...formData, gstin: e.target.value.toUpperCase() })}
                      className="w-full p-2.5 rounded-xl border border-slate-200 font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Principal Place / State *</label>
                  <select
                    value={formData.state_code}
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

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Full Business Address</label>
                  <textarea
                    rows={2}
                    placeholder="Shop/Office No., Street, City, Pincode"
                    value={formData.address}
                    onChange={e => setFormData({ ...formData, address: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200"
                  />
                </div>
              </div>

              {/* Bank Details */}
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <p className="font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <CreditCard size={14} /> Bank Account (Printed on GST Tax Invoices)
                </p>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Bank Name</label>
                    <input
                      type="text"
                      placeholder="e.g. HDFC Bank / SBI"
                      value={formData.bank_name}
                      onChange={e => setFormData({ ...formData, bank_name: e.target.value })}
                      className="w-full p-2.5 rounded-xl border border-slate-200"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Account Number</label>
                    <input
                      type="text"
                      placeholder="50200012345678"
                      value={formData.bank_acc_no}
                      onChange={e => setFormData({ ...formData, bank_acc_no: e.target.value })}
                      className="w-full p-2.5 rounded-xl border border-slate-200 font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">IFSC Code</label>
                    <input
                      type="text"
                      placeholder="HDFC0000123"
                      value={formData.bank_ifsc}
                      onChange={e => setFormData({ ...formData, bank_ifsc: e.target.value.toUpperCase() })}
                      className="w-full p-2.5 rounded-xl border border-slate-200 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Branch Name</label>
                    <input
                      type="text"
                      placeholder="Main Branch"
                      value={formData.bank_branch}
                      onChange={e => setFormData({ ...formData, bank_branch: e.target.value })}
                      className="w-full p-2.5 rounded-xl border border-slate-200"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-3">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md transition-all disabled:opacity-50"
                >
                  {loading ? 'Saving Client...' : editingClient ? 'Update Client' : 'Create Client & Seed Ledgers'}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* Month-wise Sales & Purchases Modal */}
      {selectedClientForMonthwise && (
        <MonthwiseReport
          client={selectedClientForMonthwise}
          isAdmin={true}
          isModal={true}
          onClose={() => setSelectedClientForMonthwise(null)}
          onOpenVoucherModal={() => {
            onImpersonate(selectedClientForMonthwise);
            setSelectedClientForMonthwise(null);
          }}
        />
      )}

    </div>
  );
};
