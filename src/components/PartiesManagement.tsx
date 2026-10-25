import React, { useState } from 'react';
import { 
  Users, 
  ArrowDownLeft, 
  ArrowUpRight, 
  Search, 
  Plus, 
  BookOpen, 
  CreditCard, 
  Receipt, 
  Phone, 
  Building,
  ChevronRight,
  Edit3,
  Trash2,
  X,
  AlertCircle
} from 'lucide-react';
import { Account, INDIAN_STATES } from '../types';

interface PartiesManagementProps {
  accounts: Account[];
  onSelectAccountForLedger: (account: Account) => void;
  onOpenPaymentVoucher: (creditor: Account) => void;
  onOpenReceiptVoucher: (debtor: Account) => void;
  onRefresh: () => void;
}

export const PartiesManagement: React.FC<PartiesManagementProps> = ({
  accounts,
  onSelectAccountForLedger,
  onOpenPaymentVoucher,
  onOpenReceiptVoucher,
  onRefresh
}) => {
  const [tab, setTab] = useState<'DEBTORS' | 'CREDITORS'>('DEBTORS');
  const [search, setSearch] = useState('');

  // Party Add / Edit State
  const [showPartyModal, setShowPartyModal] = useState(false);
  const [editingParty, setEditingParty] = useState<Account | null>(null);
  const [partyForm, setPartyForm] = useState({
    name: '',
    group_name: 'Sundry Debtors',
    gstin: '',
    phone: '',
    address: '',
    state: 'Maharashtra',
    state_code: '27',
    balance: 0
  });
  const [partyError, setPartyError] = useState('');
  const [isSavingParty, setIsSavingParty] = useState(false);

  const openAddParty = (group?: 'Sundry Debtors' | 'Sundry Creditors') => {
    setEditingParty(null);
    setPartyForm({
      name: '',
      group_name: group || (tab === 'DEBTORS' ? 'Sundry Debtors' : 'Sundry Creditors'),
      gstin: '',
      phone: '',
      address: '',
      state: 'Maharashtra',
      state_code: '27',
      balance: 0
    });
    setPartyError('');
    setShowPartyModal(true);
  };

  const openEditParty = (p: Account) => {
    setEditingParty(p);
    setPartyForm({
      name: p.name,
      group_name: p.group_name || 'Sundry Debtors',
      gstin: p.gstin || '',
      phone: p.phone || '',
      address: p.address || '',
      state: p.state || 'Maharashtra',
      state_code: p.state_code || '27',
      balance: p.balance || 0
    });
    setPartyError('');
    setShowPartyModal(true);
  };

  const handleSaveParty = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!partyForm.name.trim()) return;

    setIsSavingParty(true);
    setPartyError('');
    try {
      const type = partyForm.group_name === 'Sundry Debtors' ? 'ASSET' : 'LIABILITY';
      const payload = {
        name: partyForm.name.trim(),
        type,
        group_name: partyForm.group_name,
        gstin: partyForm.gstin.trim().toUpperCase() || null,
        phone: partyForm.phone.trim() || null,
        address: partyForm.address.trim() || null,
        state: partyForm.state,
        state_code: partyForm.state_code,
        balance: parseFloat(partyForm.balance.toString()) || 0
      };

      const url = editingParty ? `/api/accounts/${editingParty.id}` : '/api/accounts';
      const method = editingParty ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || 'Failed to save party');
      }

      onRefresh();
      setShowPartyModal(false);
    } catch (err: any) {
      setPartyError(err.message || 'Error occurred');
    } finally {
      setIsSavingParty(false);
    }
  };

  const handleDeleteParty = async (party: Account) => {
    if (!confirm(`Are you sure you want to delete party "${party.name}"?`)) return;
    try {
      const res = await fetch(`/api/accounts/${party.id}`, { method: 'DELETE' });
      if (res.ok) {
        onRefresh();
      } else {
        alert('Failed to delete party');
      }
    } catch (e) {
      alert('Delete error');
    }
  };

  const debtors = accounts.filter(a => a.group_name === 'Sundry Debtors');
  const creditors = accounts.filter(a => a.group_name === 'Sundry Creditors');

  const totalReceivable = debtors.reduce((sum, d) => sum + Math.max(0, d.balance), 0);
  const totalPayable = creditors.reduce((sum, c) => sum + Math.abs(Math.min(0, c.balance)), 0);

  const currentList = (tab === 'DEBTORS' ? debtors : creditors).filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase()) || 
    (p.gstin && p.gstin.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="p-4 space-y-5 pb-28">
      
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Parties & Balances</h2>
          <p className="text-xs text-slate-500">Debtors (Receivables) & Creditors (Payables)</p>
        </div>
        <button
          onClick={() => openAddParty()}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-100 transition-all"
        >
          <Plus size={15} />
          <span>+ Add Party</span>
        </button>
      </div>

      {/* Overview Balance Cards */}
      <div className="grid grid-cols-2 gap-3">
        <div 
          onClick={() => setTab('DEBTORS')}
          className={`p-4 rounded-3xl cursor-pointer transition-all border ${
            tab === 'DEBTORS' 
              ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-100 border-emerald-600' 
              : 'bg-white text-slate-900 border-slate-100 shadow-xs hover:border-emerald-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-[10px] font-bold uppercase tracking-wider ${tab === 'DEBTORS' ? 'text-emerald-100' : 'text-slate-400'}`}>
              Sundry Debtors
            </span>
            <ArrowDownLeft size={16} className={tab === 'DEBTORS' ? 'text-emerald-200' : 'text-emerald-600'} />
          </div>
          <p className="text-2xl font-black mt-1">₹{totalReceivable.toLocaleString('en-IN')}</p>
          <p className={`text-[11px] mt-1 ${tab === 'DEBTORS' ? 'text-emerald-100' : 'text-slate-500'}`}>
            To Receive ({debtors.length} Parties)
          </p>
        </div>

        <div 
          onClick={() => setTab('CREDITORS')}
          className={`p-4 rounded-3xl cursor-pointer transition-all border ${
            tab === 'CREDITORS' 
              ? 'bg-rose-600 text-white shadow-lg shadow-rose-100 border-rose-600' 
              : 'bg-white text-slate-900 border-slate-100 shadow-xs hover:border-rose-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-[10px] font-bold uppercase tracking-wider ${tab === 'CREDITORS' ? 'text-rose-100' : 'text-slate-400'}`}>
              Sundry Creditors
            </span>
            <ArrowUpRight size={16} className={tab === 'CREDITORS' ? 'text-rose-200' : 'text-rose-600'} />
          </div>
          <p className="text-2xl font-black mt-1">₹{totalPayable.toLocaleString('en-IN')}</p>
          <p className={`text-[11px] mt-1 ${tab === 'CREDITORS' ? 'text-rose-100' : 'text-slate-500'}`}>
            To Pay ({creditors.length} Parties)
          </p>
        </div>
      </div>

      {/* Search Input */}
      <div className="relative">
        <input
          type="text"
          placeholder={`Search ${tab === 'DEBTORS' ? 'Debtors / Customers' : 'Creditors / Suppliers'} by name or GSTIN...`}
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-3 bg-white rounded-2xl border border-slate-200 text-xs focus:border-indigo-600 focus:outline-none shadow-xs"
        />
        <Search size={16} className="absolute left-3.5 top-3.5 text-slate-400" />
      </div>

      {/* Parties List */}
      <div className="space-y-3">
        {currentList.map((party) => {
          const bal = Math.abs(party.balance);
          return (
            <div
              key={party.id}
              className="bg-white p-4 rounded-3xl border border-slate-100 shadow-xs hover:border-slate-200 transition-all space-y-3"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">{party.name}</h4>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1 text-[11px] text-slate-500">
                    {party.state && <span>{party.state}</span>}
                    {party.gstin && <span className="font-mono text-indigo-700 font-medium">GSTIN: {party.gstin}</span>}
                    {party.phone && <span>Tel: {party.phone}</span>}
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Current Balance</span>
                  <p className={`text-base font-black ${
                    tab === 'DEBTORS' ? 'text-emerald-600' : 'text-rose-600'
                  }`}>
                    ₹{bal.toLocaleString('en-IN')}
                  </p>
                  <span className="text-[9px] font-bold uppercase text-slate-400">
                    {tab === 'DEBTORS' ? (party.balance >= 0 ? 'Dr (Receivable)' : 'Cr (Advance)') : (party.balance <= 0 ? 'Cr (Payable)' : 'Dr (Advance)')}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                <button
                  onClick={() => onSelectAccountForLedger(party)}
                  className="flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800"
                >
                  <BookOpen size={14} />
                  <span>Ledger Statement</span>
                  <ChevronRight size={14} />
                </button>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => openEditParty(party)}
                    className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors"
                    title="Edit Party Details"
                  >
                    <Edit3 size={13} />
                  </button>
                  <button
                    onClick={() => handleDeleteParty(party)}
                    className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg transition-colors"
                    title="Delete Party"
                  >
                    <Trash2 size={13} />
                  </button>

                  {tab === 'DEBTORS' ? (
                    <button
                      onClick={() => onOpenReceiptVoucher(party)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
                    >
                      <Receipt size={13} />
                      <span>Receipt</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => onOpenPaymentVoucher(party)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
                    >
                      <CreditCard size={13} />
                      <span>Payment</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {currentList.length === 0 && (
          <div className="text-center py-10 bg-white rounded-3xl border border-slate-100 text-slate-400 space-y-2">
            <Users size={32} className="mx-auto text-slate-300" />
            <p className="text-xs">No {tab === 'DEBTORS' ? 'debtors' : 'creditors'} found matching your search.</p>
          </div>
        )}
      </div>

      {/* Add / Edit Party Modal */}
      {showPartyModal && (
        <div className="fixed inset-0 z-[120] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl border border-slate-100 overflow-hidden">
            <div className="p-4 bg-slate-900 text-white flex justify-between items-center">
              <div>
                <h3 className="text-base font-bold">
                  {editingParty ? 'Edit Party Details' : `Add New ${partyForm.group_name === 'Sundry Debtors' ? 'Debtor (Customer)' : 'Creditor (Supplier)'}`}
                </h3>
                <p className="text-xs text-slate-400">Master Ledger & GST Details</p>
              </div>
              <button onClick={() => setShowPartyModal(false)} className="p-1 rounded-full text-slate-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveParty} className="p-5 space-y-3.5 text-xs">
              {partyError && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl flex items-center gap-2">
                  <AlertCircle size={15} />
                  <span>{partyError}</span>
                </div>
              )}

              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Party Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Reliance Retail Ltd or Mohan Sharma"
                  value={partyForm.name}
                  onChange={e => setPartyForm({ ...partyForm, name: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-200 font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Group / Role</label>
                  <select
                    value={partyForm.group_name}
                    onChange={e => setPartyForm({ ...partyForm, group_name: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 font-bold bg-white"
                  >
                    <option value="Sundry Debtors">Sundry Debtors (Customer)</option>
                    <option value="Sundry Creditors">Sundry Creditors (Supplier)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">GSTIN</label>
                  <input
                    type="text"
                    placeholder="e.g. 27AABCT3518Q1Z9"
                    value={partyForm.gstin}
                    onChange={e => setPartyForm({ ...partyForm, gstin: e.target.value.toUpperCase() })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 font-mono font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Phone / Mobile</label>
                  <input
                    type="text"
                    placeholder="e.g. 9820011223"
                    value={partyForm.phone}
                    onChange={e => setPartyForm({ ...partyForm, phone: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 font-medium"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">State</label>
                  <select
                    value={partyForm.state_code}
                    onChange={e => {
                      const s = INDIAN_STATES.find(st => st.code === e.target.value);
                      setPartyForm({
                        ...partyForm,
                        state_code: e.target.value,
                        state: s ? s.name : 'Maharashtra'
                      });
                    }}
                    className="w-full p-2.5 rounded-xl border border-slate-200 font-medium bg-white"
                  >
                    {INDIAN_STATES.map(s => (
                      <option key={s.code} value={s.code}>{s.name} ({s.code})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Billing Address</label>
                <input
                  type="text"
                  placeholder="Street, City, Pin Code"
                  value={partyForm.address}
                  onChange={e => setPartyForm({ ...partyForm, address: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-200 font-medium"
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowPartyModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 font-bold text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingParty}
                  className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 font-bold text-white shadow-md shadow-indigo-100 disabled:opacity-50"
                >
                  {isSavingParty ? 'Saving...' : (editingParty ? '✓ Update Party' : '✓ Create Party')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
