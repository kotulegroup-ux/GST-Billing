/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  PlusCircle, 
  Receipt, 
  BarChart3, 
  Settings, 
  ArrowUpRight, 
  ArrowDownLeft, 
  ArrowLeft,
  Wallet,
  Plus,
  FileText,
  ChevronRight,
  ChevronLeft,
  History,
  QrCode,
  Scan,
  Download,
  X,
  ShieldCheck,
  Users,
  Printer,
  Building,
  CreditCard,
  Lock,
  FileCheck,
  Eye,
  LogOut,
  RefreshCw,
  FileSpreadsheet,
  Layers,
  Edit3,
  Trash2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { QRCodeSVG } from 'qrcode.react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { 
  Account, 
  Transaction, 
  Invoice, 
  PLReport, 
  BalanceSheetReport, 
  InventoryItem, 
  InvoiceItem, 
  LedgerEntry, 
  Client, 
  INDIAN_STATES 
} from './types';

import { AuthModal } from './components/AuthModal';
import { GSTInvoiceModal } from './components/GSTInvoiceModal';
import { VoucherEntryModal } from './components/VoucherEntryModal';
import { GSTReports } from './components/GSTReports';
import { AdminPortal } from './components/AdminPortal';
import { PartiesManagement } from './components/PartiesManagement';
import { HomePage } from './components/HomePage';
import { MonthwiseReport } from './components/MonthwiseReport';

// --- Components ---

const Masters = ({ 
  accounts, 
  inventory, 
  onRefresh, 
  onSelectAccount, 
  businessName, 
  onUpdateBusinessName,
  isDriveAuthenticated,
  onDriveAuth,
  onInstallApp,
  canInstall,
  currentClient,
  onOpenAuth
}: { 
  accounts: Account[], 
  inventory: InventoryItem[], 
  onRefresh: () => void, 
  onSelectAccount: (a: Account) => void, 
  businessName: string, 
  onUpdateBusinessName: (name: string) => void,
  isDriveAuthenticated: boolean,
  onDriveAuth: () => void,
  onInstallApp: () => void,
  canInstall: boolean,
  currentClient: Client,
  onOpenAuth: () => void
}) => {
  const [view, setView] = useState<'LEDGERS' | 'INVENTORY' | 'SETTINGS'>('LEDGERS');
  const [editingLedger, setEditingLedger] = useState<Partial<Account> | null>(null);
  const [editingItem, setEditingItem] = useState<Partial<InventoryItem> | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  const handleGoogleLogin = async () => {
    const res = await fetch('/api/auth/google/url');
    const { url } = await res.json();
    window.open(url, 'google_auth', 'width=600,height=700');
  };

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      const res = await fetch('/api/drive/sync', { method: 'POST' });
      if (res.ok) alert('Backup to Google Drive successful!');
      else alert('Backup failed. Please check Google Drive connection.');
    } catch (e) {
      alert('Backup failed');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleRestore = async () => {
    if (!confirm('This will overwrite your current local database from Google Drive. Continue?')) return;
    setIsSyncing(true);
    try {
      const res = await fetch('/api/drive/restore', { method: 'POST' });
      if (res.ok) {
        alert('Restore successful! Reloading data...');
        onRefresh();
      } else {
        alert('Restore failed. No valid backup found on Drive.');
      }
    } catch (e) {
      alert('Restore failed');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleLogoutDrive = async () => {
    await fetch('/api/auth/google/logout', { method: 'POST' });
    onDriveAuth();
  };

  const saveLedger = async (e: React.FormEvent) => {
    e.preventDefault();
    const method = editingLedger?.id ? 'PUT' : 'POST';
    const url = editingLedger?.id ? `/api/accounts/${editingLedger.id}` : '/api/accounts';
    await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editingLedger)
    });
    setEditingLedger(null);
    onRefresh();
  };

  const deleteLedger = async (id: number) => {
    if (confirm('Delete this ledger?')) {
      await fetch(`/api/accounts/${id}`, { method: 'DELETE' });
      onRefresh();
    }
  };

  const saveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    const method = editingItem?.id ? 'PUT' : 'POST';
    const url = editingItem?.id ? `/api/inventory/${editingItem.id}` : '/api/inventory';
    await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editingItem)
    });
    setEditingItem(null);
    onRefresh();
  };

  const deleteItem = async (id: number) => {
    if (confirm('Delete this item?')) {
      await fetch(`/api/inventory/${id}`, { method: 'DELETE' });
      onRefresh();
    }
  };

  return (
    <div className="p-4 space-y-4 pb-28">
      {/* Sub-navigation */}
      <div className="flex bg-slate-100 p-1 rounded-2xl">
        <button
          onClick={() => setView('LEDGERS')}
          className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
            view === 'LEDGERS' ? 'bg-white shadow-xs text-indigo-600' : 'text-slate-500'
          }`}
        >
          Chart of Accounts
        </button>
        <button
          onClick={() => setView('INVENTORY')}
          className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
            view === 'INVENTORY' ? 'bg-white shadow-xs text-indigo-600' : 'text-slate-500'
          }`}
        >
          Inventory & HSN
        </button>
        <button
          onClick={() => setView('SETTINGS')}
          className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
            view === 'SETTINGS' ? 'bg-white shadow-xs text-indigo-600' : 'text-slate-500'
          }`}
        >
          Profile & Drive
        </button>
      </div>

      {view === 'SETTINGS' && (
        <div className="bg-white p-6 rounded-3xl shadow-xs border border-slate-100 space-y-6">
          <div>
            <h3 className="text-lg font-bold text-slate-900 mb-1">Business Profile</h3>
            <p className="text-xs text-slate-500">Active Business Profile: {currentClient.business_name}</p>
          </div>

          <div className="p-4 bg-indigo-50/60 rounded-2xl border border-indigo-100 space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500">Legal Business Name:</span>
              <strong className="text-slate-900">{currentClient.business_name}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">GSTIN:</span>
              <strong className="font-mono text-indigo-900">{currentClient.gstin || 'Unregistered'}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">State / Location:</span>
              <strong>{currentClient.state} ({currentClient.state_code})</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Address:</span>
              <span className="text-slate-700 text-right">{currentClient.address || 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Bank Details:</span>
              <span>{currentClient.bank_name || 'HDFC Bank'} ({currentClient.bank_acc_no || 'N/A'})</span>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Google Drive Cloud Backup</h4>
            <p className="text-xs text-slate-500">Synchronize and backup the entire accounting database to your Google Drive.</p>

            {isDriveAuthenticated ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-emerald-50 rounded-xl border border-emerald-100 text-xs">
                  <span className="font-bold text-emerald-800">✓ Google Drive Connected</span>
                  <button onClick={handleLogoutDrive} className="text-rose-600 font-bold hover:underline">Disconnect</button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    disabled={isSyncing}
                    onClick={handleSync}
                    className="py-3 bg-indigo-600 text-white rounded-xl text-xs font-bold shadow-xs hover:bg-indigo-700 disabled:opacity-50"
                  >
                    {isSyncing ? 'Syncing...' : 'Backup to Drive'}
                  </button>
                  <button
                    disabled={isSyncing}
                    onClick={handleRestore}
                    className="py-3 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-200 disabled:opacity-50"
                  >
                    {isSyncing ? 'Restoring...' : 'Restore from Drive'}
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={handleGoogleLogin}
                className="w-full py-3 bg-indigo-600 text-white rounded-xl text-xs font-bold shadow-xs hover:bg-indigo-700"
              >
                Connect Google Drive
              </button>
            )}
          </div>

          {canInstall && (
            <div className="pt-2 border-t border-slate-100 space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Install Progressive Web App</h4>
              <button
                onClick={onInstallApp}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs"
              >
                Install App on Phone / Desktop
              </button>
            </div>
          )}

          <div className="pt-2 border-t border-slate-100">
            <button
              onClick={onOpenAuth}
              className="w-full py-3 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 flex items-center justify-center gap-2"
            >
              <Users size={16} />
              <span>Switch User / Login Portal</span>
            </button>
          </div>
        </div>
      )}

      {view === 'LEDGERS' && (
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Chart of Accounts ({accounts.length})
            </h3>
            <button
              onClick={() => setEditingLedger({ name: '', type: 'ASSET', group_name: 'Sundry Debtors', balance: 0 })}
              className="text-xs font-bold text-indigo-600 hover:underline flex items-center gap-1"
            >
              <Plus size={14} /> New Ledger
            </button>
          </div>

          <div className="divide-y divide-slate-100 bg-white rounded-3xl border border-slate-100 shadow-xs overflow-hidden">
            {accounts.map(acc => (
              <div
                key={acc.id}
                onClick={() => onSelectAccount(acc)}
                className="p-3.5 flex justify-between items-center hover:bg-slate-50 cursor-pointer transition-colors"
              >
                <div>
                  <p className="font-bold text-xs text-slate-900">{acc.name}</p>
                  <p className="text-[10px] text-slate-400 uppercase font-bold">{acc.group_name} • {acc.type}</p>
                </div>
                <div className="text-right flex items-center gap-3">
                  <p className={`text-xs font-black ${acc.balance >= 0 ? 'text-indigo-900' : 'text-rose-600'}`}>
                    ₹{Math.abs(acc.balance).toLocaleString('en-IN')}
                  </p>
                  <ChevronRight size={14} className="text-slate-300" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {view === 'INVENTORY' && (
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Stock Items & HSN Directory ({inventory.length})
            </h3>
            <button
              onClick={() => setEditingItem({ name: '', hsn_code: '8542', gst_rate: 18, unit: 'PCS', sale_price: 0, purchase_price: 0, current_stock: 0 })}
              className="text-xs font-bold text-indigo-600 hover:underline flex items-center gap-1"
            >
              <Plus size={14} /> New Stock Item
            </button>
          </div>

          <div className="divide-y divide-slate-100 bg-white rounded-3xl border border-slate-100 shadow-xs overflow-hidden">
            {inventory.map(item => (
              <div
                key={item.id}
                onClick={() => setEditingItem(item)}
                className="p-3.5 flex justify-between items-center hover:bg-slate-50 cursor-pointer transition-colors"
              >
                <div>
                  <p className="font-bold text-xs text-slate-900">{item.name}</p>
                  <p className="text-[10px] text-slate-400">HSN: {item.hsn_code} • GST: {item.gst_rate}% • Stock: {item.current_stock} {item.unit}</p>
                </div>
                <div className="text-right">
                  <p className="font-black text-xs text-slate-900">₹{item.sale_price.toLocaleString('en-IN')}</p>
                  <p className="text-[10px] text-slate-400">Cost: ₹{item.purchase_price.toLocaleString('en-IN')}</p>
                </div>
              </div>
            ))}
            {inventory.length === 0 && (
              <p className="text-center py-8 text-xs text-slate-400 italic">No inventory items added yet.</p>
            )}
          </div>
        </div>
      )}

      {/* Editing Ledger Modal */}
      {editingLedger && (
        <div className="fixed inset-0 z-[140] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={saveLedger} className="bg-white rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl text-xs">
            <h3 className="text-base font-bold text-slate-900">{editingLedger.id ? 'Edit Ledger' : 'New Ledger Account'}</h3>
            <input
              type="text"
              required
              placeholder="Ledger Name (e.g. Office Rent or Client Name)"
              value={editingLedger.name || ''}
              onChange={e => setEditingLedger({ ...editingLedger, name: e.target.value })}
              className="w-full p-2.5 rounded-xl border"
            />
            <div className="grid grid-cols-2 gap-2">
              <select
                value={editingLedger.type || 'ASSET'}
                onChange={e => setEditingLedger({ ...editingLedger, type: e.target.value as any })}
                className="p-2.5 rounded-xl border bg-white"
              >
                <option value="ASSET">Asset</option>
                <option value="LIABILITY">Liability</option>
                <option value="REVENUE">Revenue</option>
                <option value="EXPENSE">Expense</option>
                <option value="EQUITY">Equity</option>
              </select>
              <input
                type="text"
                placeholder="Group Name (e.g. Sundry Debtors)"
                value={editingLedger.group_name || ''}
                onChange={e => setEditingLedger({ ...editingLedger, group_name: e.target.value })}
                className="p-2.5 rounded-xl border"
              />
            </div>
            <div className="flex gap-2 pt-2">
              <button type="button" onClick={() => setEditingLedger(null)} className="flex-1 py-2.5 bg-slate-100 rounded-xl font-bold">Cancel</button>
              <button type="submit" className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl font-bold">Save Ledger</button>
            </div>
          </form>
        </div>
      )}

      {/* Editing Item Modal */}
      {editingItem && (
        <div className="fixed inset-0 z-[140] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={saveItem} className="bg-white rounded-3xl p-6 max-w-sm w-full space-y-3 shadow-2xl text-xs">
            <h3 className="text-base font-bold text-slate-900">{editingItem.id ? 'Edit Item' : 'New Stock Item'}</h3>
            <input
              type="text"
              required
              placeholder="Item Name"
              value={editingItem.name || ''}
              onChange={e => setEditingItem({ ...editingItem, name: e.target.value })}
              className="w-full p-2.5 rounded-xl border"
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                placeholder="HSN Code"
                value={editingItem.hsn_code || ''}
                onChange={e => setEditingItem({ ...editingItem, hsn_code: e.target.value })}
                className="p-2.5 rounded-xl border font-mono"
              />
              <select
                value={editingItem.gst_rate || 18}
                onChange={e => setEditingItem({ ...editingItem, gst_rate: parseFloat(e.target.value) })}
                className="p-2.5 rounded-xl border bg-white font-bold"
              >
                <option value="0">0% GST</option>
                <option value="5">5% GST</option>
                <option value="12">12% GST</option>
                <option value="18">18% GST</option>
                <option value="28">28% GST</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="number"
                placeholder="Sale Price"
                value={editingItem.sale_price || ''}
                onChange={e => setEditingItem({ ...editingItem, sale_price: parseFloat(e.target.value) || 0 })}
                className="p-2.5 rounded-xl border"
              />
              <input
                type="number"
                placeholder="Purchase Cost"
                value={editingItem.purchase_price || ''}
                onChange={e => setEditingItem({ ...editingItem, purchase_price: parseFloat(e.target.value) || 0 })}
                className="p-2.5 rounded-xl border"
              />
            </div>
            <div className="flex gap-2 pt-2">
              <button type="button" onClick={() => setEditingItem(null)} className="flex-1 py-2.5 bg-slate-100 rounded-xl font-bold">Cancel</button>
              <button type="submit" className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl font-bold">Save Item</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

const Navbar = ({ 
  activeTab, 
  setActiveTab, 
  isAdmin 
}: { 
  activeTab: string, 
  setActiveTab: (tab: string, isNavigating?: boolean) => void,
  isAdmin: boolean 
}) => {
  const tabs = isAdmin ? [
    { id: 'admin', icon: ShieldCheck, label: 'Clients' },
    { id: 'dashboard', icon: LayoutDashboard, label: 'Overview' },
    { id: 'vouchers', icon: PlusCircle, label: 'Vouchers' },
    { id: 'invoices', icon: Receipt, label: 'Invoices' },
    { id: 'parties', icon: Users, label: 'Parties' },
    { id: 'gst-reports', icon: FileCheck, label: 'GST' },
    { id: 'masters', icon: Settings, label: 'Settings' },
  ] : [
    { id: 'dashboard', icon: LayoutDashboard, label: 'Home' },
    { id: 'vouchers', icon: PlusCircle, label: 'Vouchers' },
    { id: 'invoices', icon: Receipt, label: 'Invoices' },
    { id: 'parties', icon: Users, label: 'Parties' },
    { id: 'gst-reports', icon: FileCheck, label: 'GST Reports' },
    { id: 'masters', icon: Settings, label: 'Masters' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-slate-200 safe-area-bottom z-50">
      <div className="flex justify-around items-center h-16 max-w-lg mx-auto px-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
              activeTab === tab.id ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <tab.icon size={18} className={activeTab === tab.id ? 'stroke-[2.5px]' : 'stroke-2'} />
            <span className="text-[9px] mt-1 font-semibold truncate max-w-full">{tab.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
};

const Dashboard = ({ 
  transactions, 
  accounts, 
  invoices,
  currentClient,
  isAdmin,
  onOpenVoucher,
  onScan,
  onNavigateToGST,
  onNavigateToParties,
  onSelectAccount,
  onViewInvoice
}: { 
  transactions: Transaction[], 
  accounts: Account[], 
  invoices: Invoice[],
  currentClient: Client,
  isAdmin: boolean,
  onOpenVoucher: (type: any) => void,
  onScan: () => void,
  onNavigateToGST: () => void,
  onNavigateToParties: () => void,
  onSelectAccount: (a: Account) => void,
  onViewInvoice?: (inv: Invoice) => void
}) => {
  const [dashboardTab, setDashboardTab] = useState<'all' | 'monthwise' | 'vouchers'>('all');

  const bankAndCashBalance = accounts
    .filter(a => a.group_name === 'Bank Accounts' || a.group_name === 'Cash-in-hand')
    .reduce((sum, a) => sum + a.balance, 0);

  const debtorsReceivable = accounts
    .filter(a => a.group_name === 'Sundry Debtors')
    .reduce((sum, a) => sum + Math.max(0, a.balance), 0);

  const creditorsPayable = accounts
    .filter(a => a.group_name === 'Sundry Creditors')
    .reduce((sum, a) => sum + Math.abs(Math.min(0, a.balance)), 0);

  const totalSalesMonth = transactions
    .filter(t => t.type === 'SALE' && new Date(t.date).getMonth() === new Date().getMonth())
    .reduce((sum, t) => sum + t.amount, 0);

  return (
    <div className="p-4 space-y-5 pb-28">
      
      {/* Business Header Card */}
      <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-indigo-700 rounded-3xl p-5 text-white shadow-xl shadow-indigo-100 relative overflow-hidden">
        <div className="relative z-10 space-y-4">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-200 block">Selected Client Books</span>
              <h2 className="text-xl font-black mt-0.5">{currentClient.business_name}</h2>
              <p className="text-xs text-indigo-200 mt-0.5">
                GSTIN: <span className="font-mono font-bold text-white">{currentClient.gstin || '27AABCA1234F1Z5'}</span> • {currentClient.state} ({currentClient.state_code})
              </p>
            </div>
            {isAdmin && (
              <span className="text-[10px] bg-amber-400 text-slate-950 font-bold px-2 py-0.5 rounded-full uppercase">
                Admin Audit
              </span>
            )}
          </div>

          <div className="pt-2 border-t border-indigo-700/60 grid grid-cols-2 gap-4">
            <div>
              <p className="text-[10px] text-indigo-200 uppercase font-bold">Liquid Cash & Bank</p>
              <p className="text-2xl font-black text-white mt-0.5">₹{bankAndCashBalance.toLocaleString('en-IN')}</p>
            </div>
            <div>
              <p className="text-[10px] text-indigo-200 uppercase font-bold">Sales (This Month)</p>
              <p className="text-2xl font-black text-emerald-300 mt-0.5">₹{totalSalesMonth.toLocaleString('en-IN')}</p>
            </div>
          </div>
        </div>

        {/* Ambient Blur */}
        <div className="absolute -right-8 -top-8 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
        <div className="absolute -left-8 -bottom-8 w-32 h-32 bg-indigo-500/20 rounded-full blur-2xl" />
      </div>

      {/* Dashboard Sub-navigation Pills */}
      <div className="flex items-center gap-1.5 p-1 bg-slate-200/60 rounded-2xl text-xs font-bold">
        <button
          onClick={() => setDashboardTab('all')}
          className={`flex-1 py-2 px-2 rounded-xl transition-all text-center flex items-center justify-center gap-1.5 ${
            dashboardTab === 'all' ? 'bg-white text-slate-900 shadow-xs font-extrabold' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Layers size={14} />
          <span>Complete Overview</span>
        </button>

        <button
          onClick={() => setDashboardTab('monthwise')}
          className={`flex-1 py-2 px-2 rounded-xl transition-all text-center flex items-center justify-center gap-1.5 ${
            dashboardTab === 'monthwise' ? 'bg-indigo-600 text-white shadow-xs font-extrabold' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <BarChart3 size={14} />
          <span>Month-Wise Sale & Purchase</span>
        </button>

        <button
          onClick={() => setDashboardTab('vouchers')}
          className={`flex-1 py-2 px-2 rounded-xl transition-all text-center flex items-center justify-center gap-1.5 ${
            dashboardTab === 'vouchers' ? 'bg-white text-slate-900 shadow-xs font-extrabold' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Receipt size={14} />
          <span>Vouchers & Cash</span>
        </button>
      </div>

      {/* Outstanding Receivables vs Payables Cards */}
      {(dashboardTab === 'all' || dashboardTab === 'vouchers') && (
        <div className="grid grid-cols-2 gap-3" onClick={onNavigateToParties}>
          <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-xs cursor-pointer hover:border-emerald-200 transition-all">
            <div className="flex justify-between items-center text-emerald-600">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Receivables</span>
              <ArrowDownLeft size={16} />
            </div>
            <p className="text-xl font-black text-emerald-700 mt-1">₹{debtorsReceivable.toLocaleString('en-IN')}</p>
            <p className="text-[10px] text-slate-500 mt-0.5">From Debtors (Customers)</p>
          </div>

          <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-xs cursor-pointer hover:border-rose-200 transition-all">
            <div className="flex justify-between items-center text-rose-600">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Payables</span>
              <ArrowUpRight size={16} />
            </div>
            <p className="text-xl font-black text-rose-700 mt-1">₹{creditorsPayable.toLocaleString('en-IN')}</p>
            <p className="text-[10px] text-slate-500 mt-0.5">To Creditors (Suppliers)</p>
          </div>
        </div>
      )}

      {/* Prominent Month-Wise Sale & Purchase Section */}
      {(dashboardTab === 'all' || dashboardTab === 'monthwise') && (
        <section className="space-y-3">
          <MonthwiseReport
            client={currentClient}
            isAdmin={isAdmin}
            onOpenVoucherModal={onOpenVoucher}
            onViewInvoice={(invoiceId) => {
              const inv = invoices.find(i => i.id === invoiceId);
              if (inv && onViewInvoice) onViewInvoice(inv);
            }}
          />
        </section>
      )}

      {/* Core Vouchers Quick Actions */}
      <section className="space-y-2">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Accounting Entry Vouchers</h3>
        <div className="grid grid-cols-4 gap-2.5">
          <button
            onClick={() => onOpenVoucher('SALE')}
            className="flex flex-col items-center gap-1.5 p-3 bg-white rounded-2xl border border-slate-100 shadow-xs hover:border-indigo-200 transition-all"
          >
            <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <ArrowUpRight size={20} />
            </div>
            <span className="text-[11px] font-bold text-slate-800 text-center">Record Sale</span>
          </button>

          <button
            onClick={() => onOpenVoucher('PURCHASE')}
            className="flex flex-col items-center gap-1.5 p-3 bg-white rounded-2xl border border-slate-100 shadow-xs hover:border-indigo-200 transition-all"
          >
            <div className="w-11 h-11 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <ArrowDownLeft size={20} />
            </div>
            <span className="text-[11px] font-bold text-slate-800 text-center">Purchase</span>
          </button>

          <button
            onClick={() => onOpenVoucher('PAYMENT')}
            className="flex flex-col items-center gap-1.5 p-3 bg-white rounded-2xl border border-slate-100 shadow-xs hover:border-indigo-200 transition-all"
          >
            <div className="w-11 h-11 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <CreditCard size={20} />
            </div>
            <span className="text-[11px] font-bold text-slate-800 text-center">Pay Creditor</span>
          </button>

          <button
            onClick={() => onOpenVoucher('RECEIPT')}
            className="flex flex-col items-center gap-1.5 p-3 bg-white rounded-2xl border border-slate-100 shadow-xs hover:border-indigo-200 transition-all"
          >
            <div className="w-11 h-11 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
              <Receipt size={20} />
            </div>
            <span className="text-[11px] font-bold text-slate-800 text-center">Receipt</span>
          </button>
        </div>
      </section>

      {/* Additional Tools */}
      <section className="grid grid-cols-2 gap-3">
        <button
          onClick={onNavigateToGST}
          className="p-3.5 bg-indigo-50/70 hover:bg-indigo-100/70 rounded-2xl border border-indigo-100 flex items-center gap-3 transition-colors text-left"
        >
          <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0">
            <FileCheck size={18} />
          </div>
          <div>
            <span className="text-xs font-bold text-indigo-950 block">GST Return Filing</span>
            <span className="text-[10px] text-indigo-700">GSTR-1, 2B & 3B Calculation</span>
          </div>
        </button>

        <button
          onClick={onScan}
          className="p-3.5 bg-slate-100 hover:bg-slate-200/80 rounded-2xl border border-slate-200 flex items-center gap-3 transition-colors text-left"
        >
          <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shrink-0">
            <Scan size={18} />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-900 block">Scan QR Invoice</span>
            <span className="text-[10px] text-slate-500">Auto-import purchase voucher</span>
          </div>
        </button>
      </section>

      {/* Recent Activity */}
      <section className="space-y-3">
        <div className="flex justify-between items-center">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Recent Transactions</h3>
          <span className="text-xs font-bold text-indigo-600">{transactions.length} Total</span>
        </div>

        <div className="space-y-2">
          {transactions.slice(0, 6).map((t) => (
            <div
              key={t.id}
              className="bg-white p-3.5 rounded-2xl flex items-center justify-between shadow-xs border border-slate-100 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                  t.type === 'SALE' || t.voucher_type === 'RECEIPT'
                    ? 'bg-emerald-50 text-emerald-600'
                    : 'bg-rose-50 text-rose-600'
                }`}>
                  {t.type === 'SALE' || t.voucher_type === 'RECEIPT' ? <ArrowDownLeft size={18} /> : <ArrowUpRight size={18} />}
                </div>
                <div>
                  <p className="font-bold text-xs text-slate-900 line-clamp-1">{t.description}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    {t.debit_account_name} / {t.credit_account_name} • {new Date(t.date).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className={`font-black text-xs ${
                  t.type === 'SALE' || t.voucher_type === 'RECEIPT' ? 'text-emerald-600' : 'text-slate-900'
                }`}>
                  {t.type === 'SALE' || t.voucher_type === 'RECEIPT' ? '+' : '-'}₹{t.amount.toLocaleString('en-IN')}
                </p>
                <span className="text-[9px] font-bold uppercase text-slate-400 block">{t.voucher_type || t.type}</span>
              </div>
            </div>
          ))}
          {transactions.length === 0 && (
            <div className="text-center py-8 text-slate-400 text-xs italic">No transactions recorded yet.</div>
          )}
        </div>
      </section>

    </div>
  );
};

const LedgerDetail = ({ 
  account, 
  onBack, 
  onEditTransaction 
}: { 
  account: Account, 
  onBack: () => void, 
  onEditTransaction: (t: Transaction) => void 
}) => {
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLedger = async () => {
      const res = await fetch(`/api/accounts/${account.id}/ledger`);
      if (res.ok) setLedger(await res.json());
      setLoading(false);
    };
    fetchLedger();
  }, [account.id]);

  const totalDebit = ledger.reduce((sum, e) => sum + e.debit, 0);
  const totalCredit = ledger.reduce((sum, e) => sum + e.credit, 0);
  const closingBalance = account.balance;

  return (
    <div className="p-4 pb-28 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 bg-white rounded-xl shadow-xs border border-slate-100">
            <ArrowLeft size={18} />
          </button>
          <div>
            <h2 className="text-lg font-bold text-slate-900">{account.name}</h2>
            <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">
              {account.group_name} • {account.type}
            </p>
          </div>
        </div>

        <button
          onClick={() => window.print()}
          className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1"
        >
          <Printer size={14} />
          <span className="hidden sm:inline">Print Statement</span>
        </button>
      </div>

      <div className="bg-white rounded-3xl shadow-xs border border-slate-100 overflow-hidden">
        <div className="grid grid-cols-2 border-b border-slate-100">
          <div className="p-3 bg-slate-50 text-center font-bold text-xs uppercase text-slate-500 border-r border-slate-100">
            Debit (Dr / By)
          </div>
          <div className="p-3 bg-slate-50 text-center font-bold text-xs uppercase text-slate-500">
            Credit (Cr / To)
          </div>
        </div>
        
        <div className="divide-y divide-slate-50">
          {ledger.map((entry) => (
            <div 
              key={entry.id} 
              className="grid grid-cols-2 group cursor-pointer hover:bg-slate-50 transition-colors" 
              onClick={() => onEditTransaction(entry)}
            >
              <div className="p-3 border-r border-slate-100 min-h-[55px]">
                {entry.debit > 0 && (
                  <div>
                    <p className="text-xs font-bold text-slate-900">{entry.particular}</p>
                    <p className="text-[10px] text-slate-400">{new Date(entry.date).toLocaleDateString()}</p>
                    <p className="text-xs font-bold text-indigo-600 mt-0.5">₹{entry.debit.toLocaleString('en-IN')}</p>
                  </div>
                )}
              </div>
              <div className="p-3 min-h-[55px]">
                {entry.credit > 0 && (
                  <div className="text-right">
                    <p className="text-xs font-bold text-slate-900">{entry.particular}</p>
                    <p className="text-[10px] text-slate-400">{new Date(entry.date).toLocaleDateString()}</p>
                    <p className="text-xs font-bold text-rose-600 mt-0.5">₹{entry.credit.toLocaleString('en-IN')}</p>
                  </div>
                )}
              </div>
            </div>
          ))}

          {ledger.length === 0 && (
            <div className="p-8 text-center text-xs text-slate-400 italic">No transactions recorded for this ledger yet.</div>
          )}
        </div>

        <div className="grid grid-cols-2 bg-slate-50 p-4 font-bold border-t border-slate-100 text-xs">
          <div>
            <p className="text-[10px] text-slate-400 uppercase">Total Debit</p>
            <p className="text-indigo-600 font-bold">₹{totalDebit.toLocaleString('en-IN')}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-slate-400 uppercase">Total Credit</p>
            <p className="text-rose-600 font-bold">₹{totalCredit.toLocaleString('en-IN')}</p>
          </div>
        </div>
        
        <div className="p-4 bg-slate-900 text-white flex justify-between items-center text-xs">
          <span className="font-bold uppercase tracking-wider">Closing Account Balance</span>
          <span className="text-base font-black">₹{Math.abs(closingBalance).toLocaleString('en-IN')} {closingBalance >= 0 ? 'Dr' : 'Cr'}</span>
        </div>
      </div>
      
      <p className="text-center text-[10px] text-slate-400 italic">
        Click on any transaction entry to edit, modify, or delete it
      </p>
    </div>
  );
};

const InvoicesList = ({ 
  invoices, 
  onAdd, 
  onViewInvoice, 
  onViewQR, 
  onEdit,
  onDelete
}: { 
  invoices: Invoice[], 
  onAdd: () => void, 
  onViewInvoice: (inv: Invoice) => void,
  onViewQR: (inv: Invoice) => void, 
  onEdit: (inv: Invoice) => void,
  onDelete: (inv: Invoice) => void 
}) => {
  return (
    <div className="p-4 space-y-4 pb-28">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">GST Tax Invoices</h2>
          <p className="text-xs text-slate-500">Form GST INV-1 Compliant Invoices</p>
        </div>
        <button 
          onClick={onAdd}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-3.5 py-2 rounded-xl flex items-center gap-1.5 text-xs font-bold shadow-md shadow-indigo-100 transition-all"
        >
          <Plus size={16} />
          <span>New Invoice</span>
        </button>
      </div>

      <div className="space-y-3">
        {invoices.map((inv) => (
          <div 
            key={inv.id} 
            className="bg-white p-4 rounded-3xl shadow-xs border border-slate-100 flex justify-between items-center hover:border-indigo-100 transition-all"
          >
            <div>
              <div className="flex items-center gap-2">
                <p className="font-black text-slate-900 text-sm">{inv.invoice_number}</p>
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase ${
                  inv.is_interstate ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                }`}>
                  {inv.is_interstate ? 'Inter-State (IGST)' : 'Intra-State (CGST+SGST)'}
                </span>
              </div>
              <p className="text-xs font-bold text-slate-700 mt-1">{inv.customer_name}</p>
              <p className="text-[10px] text-slate-400 mt-0.5">
                POS: {inv.place_of_supply || 'Same State'} • Date: {new Date(inv.date).toLocaleDateString()}
              </p>
            </div>

            <div className="text-right flex flex-col items-end gap-2">
              <p className="font-black text-sm text-indigo-950">₹{inv.total_amount.toLocaleString('en-IN')}</p>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => onEdit(inv)}
                  className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-lg text-xs font-bold flex items-center gap-1 border border-amber-200/50"
                  title="Modify Tax Invoice"
                >
                  <Edit3 size={12} />
                  <span>Edit</span>
                </button>
                <button
                  onClick={() => onDelete(inv)}
                  className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg border border-rose-200/50"
                  title="Delete Tax Invoice"
                >
                  <Trash2 size={13} />
                </button>
                <button
                  onClick={() => onViewInvoice(inv)}
                  className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold flex items-center gap-1"
                  title="Print Tax Invoice"
                >
                  <Printer size={13} />
                  <span>Print</span>
                </button>
                <button 
                  onClick={() => onViewQR(inv)}
                  className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg"
                  title="Show QR Code"
                >
                  <QrCode size={14} />
                </button>
              </div>
            </div>
          </div>
        ))}

        {invoices.length === 0 && (
          <div className="text-center py-12 bg-white rounded-3xl border border-slate-100 text-slate-400 space-y-2">
            <Receipt size={32} className="mx-auto text-slate-300" />
            <p className="text-xs">No tax invoices created yet. Click "+ New Invoice" to start.</p>
          </div>
        )}
      </div>
    </div>
  );
};

const QRScanner = ({ onScan, onClose }: { onScan: (data: any) => void, onClose: () => void }) => {
  useEffect(() => {
    const scanner = new Html5QrcodeScanner('reader', { fps: 10, qrbox: 250 }, false);
    scanner.render((decodedText) => {
      try {
        const data = JSON.parse(decodedText);
        if (data.type === 'FINTRACK_INVOICE' || data.GSTIN) {
          scanner.clear();
          onScan(data.payload || data);
        }
      } catch (e) {
        console.error("Invalid QR code", e);
      }
    }, (error) => {});

    return () => {
      scanner.clear().catch(e => console.error("Scanner cleanup error", e));
    };
  }, []);

  return (
    <div className="fixed inset-0 bg-black z-[150] flex flex-col">
      <div className="p-4 flex justify-between items-center text-white">
        <h2 className="text-sm font-bold">Scan Invoice QR Code</h2>
        <button onClick={onClose}><X size={22} /></button>
      </div>
      <div id="reader" className="flex-1"></div>
      <div className="p-8 text-center text-white/60 text-xs">
        Point camera at FinTrack GST Invoice QR code
      </div>
    </div>
  );
};

// --- Main App Component ---

export default function App() {
  const [currentUser, setCurrentUser] = useState<Client | null>(null);
  const [currentClient, setCurrentClient] = useState<Client>({
    id: 2,
    username: '9820012345',
    role: 'CLIENT',
    business_name: 'Apex Electronics & Spares Pvt Ltd',
    trade_name: 'Apex Electronics',
    gstin: '27AABCA1234F1Z5',
    state: 'Maharashtra',
    state_code: '27',
    address: '14 Lamington Road, Grant Road, Mumbai - 400007',
    phone: '9820012345',
    bank_name: 'HDFC Bank',
    bank_acc_no: '50200012345678',
    bank_ifsc: 'HDFC0000123',
    bank_branch: 'Lamington Road'
  });
  const [impersonatedClient, setImpersonatedClient] = useState<Client | null>(null);
  const [clientsList, setClientsList] = useState<Client[]>([]);

  const [activeTab, setActiveTabState] = useState('dashboard');
  const [navHistory, setNavHistory] = useState<string[]>(['dashboard']);
  const [navIndex, setNavIndex] = useState(0);

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [selectedInvoiceForPrint, setSelectedInvoiceForPrint] = useState<Invoice | null>(null);
  const [selectedInvoiceForQR, setSelectedInvoiceForQR] = useState<Invoice | null>(null);
  const [isVoucherModalOpen, setIsVoucherModalOpen] = useState(false);
  const [voucherInitialType, setVoucherInitialType] = useState<'SALE' | 'PURCHASE' | 'PAYMENT' | 'RECEIPT' | 'EXPENSE' | 'JOURNAL'>('SALE');
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [selectedAccountForLedger, setSelectedAccountForLedger] = useState<Account | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [isDriveAuthenticated, setIsDriveAuthenticated] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  const isAdmin = currentUser?.role === 'ADMIN';

  const setActiveTab = (tab: string, isNavigating: boolean = true) => {
    if (isNavigating) {
      const newHistory = navHistory.slice(0, navIndex + 1);
      if (newHistory[newHistory.length - 1] !== tab) {
        newHistory.push(tab);
        setNavHistory(newHistory);
        setNavIndex(newHistory.length - 1);
      }
    }
    setActiveTabState(tab);
  };

  const goBack = () => {
    if (selectedAccountForLedger) {
      setSelectedAccountForLedger(null);
      return;
    }
    if (navIndex > 0) {
      const prevTab = navHistory[navIndex - 1];
      setNavIndex(navIndex - 1);
      setActiveTab(prevTab, false);
    }
  };

  const goForward = () => {
    if (navIndex < navHistory.length - 1) {
      const nextTab = navHistory[navIndex + 1];
      setNavIndex(navIndex + 1);
      setActiveTab(nextTab, false);
    }
  };

  const checkAuth = async () => {
    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        setCurrentUser(data.user);
        if (data.currentClient) {
          setCurrentClient(data.currentClient);
        }
        setImpersonatedClient(data.impersonatedClient || null);
        if (data.user?.role === 'ADMIN') {
          fetchClients();
          if (!data.impersonatedClient) {
            setActiveTab('admin', false);
            setNavHistory(['admin']);
            setNavIndex(0);
          }
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchClients = async () => {
    try {
      const res = await fetch('/api/admin/clients');
      if (res.ok) {
        const list = await res.json();
        setClientsList(list);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchData = async () => {
    try {
      const [tRes, aRes, iRes, invRes] = await Promise.all([
        fetch('/api/transactions'),
        fetch('/api/accounts'),
        fetch('/api/invoices'),
        fetch('/api/inventory')
      ]);

      if (tRes.ok && aRes.ok && iRes.ok && invRes.ok) {
        setTransactions(await tRes.json());
        setAccounts(await aRes.json());
        setInvoices(await iRes.json());
        setInventory(await invRes.json());
      }
    } catch (error) {
      console.error("Failed to fetch data", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();
    fetchData();
  }, []);

  useEffect(() => {
    if (isAdmin) {
      fetchClients();
    }
  }, [isAdmin]);

  const handleImpersonate = async (client: Client) => {
    try {
      const res = await fetch(`/api/admin/impersonate/${client.id}`, { method: 'POST' });
      if (res.ok) {
        setCurrentClient(client);
        setImpersonatedClient(client);
        fetchData();
        setActiveTab('dashboard');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleExitImpersonate = async () => {
    try {
      const res = await fetch('/api/admin/exit-impersonate', { method: 'POST' });
      if (res.ok) {
        setImpersonatedClient(null);
        fetchClients();
        fetchData();
        setActiveTab('admin');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleLoginSuccess = (user: Client) => {
    setCurrentUser(user);
    if (user.role === 'ADMIN') {
      fetchClients();
      setActiveTab('admin');
      setNavHistory(['admin']);
      setNavIndex(0);
    } else {
      setCurrentClient(user);
      setActiveTab('dashboard');
      setNavHistory(['dashboard']);
      setNavIndex(0);
    }
    fetchData();
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setCurrentUser(null);
    setImpersonatedClient(null);
    setActiveTabState('dashboard');
    setNavHistory(['dashboard']);
    setNavIndex(0);
    checkAuth();
    fetchData();
  };

  const openVoucherModal = (type: any, txn?: Transaction | null, inv?: Invoice | null) => {
    setVoucherInitialType(type);
    setEditingTransaction(txn || null);
    setEditingInvoice(inv || null);
    setIsVoucherModalOpen(true);
  };

  const handleDeleteInvoice = async (inv: Invoice) => {
    if (!confirm(`Are you sure you want to delete Tax Invoice ${inv.invoice_number}? This will reverse the customer account and GST output balances.`)) return;
    try {
      const res = await fetch(`/api/invoices/${inv.id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchData();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to delete invoice');
      }
    } catch (e) {
      alert('Delete error');
    }
  };

  const handleDeleteTransaction = async (t: Transaction) => {
    if (!confirm(`Are you sure you want to delete this voucher (${t.description})? This will reverse the ledger balances.`)) return;
    try {
      const res = await fetch(`/api/transactions/${t.id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchData();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to delete voucher');
      }
    } catch (e) {
      alert('Delete error');
    }
  };

  // PWA Install Setup
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const installPWA = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  const checkDriveAuth = async () => {
    try {
      const res = await fetch('/api/auth/google/status');
      const data = await res.json();
      setIsDriveAuthenticated(data.isAuthenticated);
    } catch (e) {
      console.error("Auth check failed", e);
    }
  };

  useEffect(() => {
    checkDriveAuth();
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'GOOGLE_AUTH_SUCCESS') {
        setIsDriveAuthenticated(true);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const tabDisplayNames: Record<string, string> = {
    'admin': 'Clients Dashboard',
    'dashboard': isAdmin ? (impersonatedClient ? `Books: ${impersonatedClient.business_name}` : 'Overview') : 'Home',
    'vouchers': 'Voucher Register',
    'invoices': 'Tax Invoices',
    'parties': 'Parties Ledger',
    'gst-reports': 'GST Return Filing',
    'masters': 'Masters & Settings'
  };

  const renderContent = () => {
    if (selectedAccountForLedger) {
      return (
        <LedgerDetail
          account={selectedAccountForLedger}
          onBack={() => setSelectedAccountForLedger(null)}
          onEditTransaction={(t) => {
            openVoucherModal((t.type as any) || 'JOURNAL', t);
          }}
        />
      );
    }

    switch (activeTab) {
      case 'dashboard':
        return (
          <Dashboard
            transactions={transactions}
            accounts={accounts}
            invoices={invoices}
            currentClient={currentClient}
            isAdmin={isAdmin}
            onOpenVoucher={(type) => openVoucherModal(type)}
            onScan={() => setIsScanning(true)}
            onNavigateToGST={() => setActiveTab('gst-reports')}
            onNavigateToParties={() => setActiveTab('parties')}
            onSelectAccount={setSelectedAccountForLedger}
            onViewInvoice={(inv) => setSelectedInvoiceForPrint(inv)}
          />
        );
      case 'vouchers':
        return (
          <div className="p-4 space-y-4 pb-28">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">Voucher Register</h2>
                <p className="text-xs text-slate-500">Sales, Purchases, Payments, Receipts</p>
              </div>
              <button
                onClick={() => openVoucherModal('SALE')}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-3.5 py-2 rounded-xl text-xs font-bold shadow-md shadow-indigo-100 flex items-center gap-1.5"
              >
                <Plus size={16} />
                <span>+ New Voucher</span>
              </button>
            </div>

            {/* Quick Filter Buttons */}
            <div className="grid grid-cols-4 gap-2">
              <button
                onClick={() => openVoucherModal('SALE')}
                className="p-3 bg-white rounded-2xl border border-slate-100 text-center hover:border-emerald-200 shadow-xs"
              >
                <span className="text-xs font-bold text-emerald-600 block">+ Sale</span>
                <span className="text-[10px] text-slate-400">Invoice</span>
              </button>
              <button
                onClick={() => openVoucherModal('PURCHASE')}
                className="p-3 bg-white rounded-2xl border border-slate-100 text-center hover:border-indigo-200 shadow-xs"
              >
                <span className="text-xs font-bold text-indigo-600 block">+ Purchase</span>
                <span className="text-[10px] text-slate-400">Bill Entry</span>
              </button>
              <button
                onClick={() => openVoucherModal('PAYMENT')}
                className="p-3 bg-white rounded-2xl border border-slate-100 text-center hover:border-rose-200 shadow-xs"
              >
                <span className="text-xs font-bold text-rose-600 block">+ Payment</span>
                <span className="text-[10px] text-slate-400">To Creditor</span>
              </button>
              <button
                onClick={() => openVoucherModal('RECEIPT')}
                className="p-3 bg-white rounded-2xl border border-slate-100 text-center hover:border-teal-200 shadow-xs"
              >
                <span className="text-xs font-bold text-teal-600 block">+ Receipt</span>
                <span className="text-[10px] text-slate-400">From Debtor</span>
              </button>
            </div>

            {/* Transactions / Vouchers List */}
            <div className="space-y-2.5">
              {transactions.map(t => (
                <div
                  key={t.id}
                  className="bg-white p-4 rounded-3xl shadow-xs border border-slate-100 flex justify-between items-center hover:border-indigo-200 transition-all"
                >
                  <div
                    onClick={() => openVoucherModal((t.type as any) || 'JOURNAL', t)}
                    className="flex-1 cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-xs text-slate-900">{t.description}</p>
                      {t.ref_no && (
                        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                          {t.ref_no}
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">
                      {t.debit_account_name} / {t.credit_account_name} • {new Date(t.date).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className={`font-black text-xs ${
                        t.type === 'SALE' || t.voucher_type === 'RECEIPT' ? 'text-emerald-600' : 'text-slate-900'
                      }`}>
                        {t.type === 'SALE' || t.voucher_type === 'RECEIPT' ? '+' : '-'}₹{t.amount.toLocaleString('en-IN')}
                      </p>
                      <span className="text-[9px] font-bold uppercase text-slate-400">
                        {t.voucher_type || t.type}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 pl-2 border-l border-slate-100">
                      <button
                        onClick={() => openVoucherModal((t.type as any) || 'JOURNAL', t)}
                        className="p-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-lg border border-amber-200/50"
                        title="Edit Voucher Entry"
                      >
                        <Edit3 size={13} />
                      </button>
                      <button
                        onClick={() => handleDeleteTransaction(t)}
                        className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg border border-rose-200/50"
                        title="Delete Voucher Entry"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      case 'invoices':
        return (
          <InvoicesList
            invoices={invoices}
            onAdd={() => openVoucherModal('SALE')}
            onViewInvoice={(inv) => setSelectedInvoiceForPrint(inv)}
            onViewQR={(inv) => setSelectedInvoiceForQR(inv)}
            onEdit={(inv) => openVoucherModal('SALE', null, inv)}
            onDelete={handleDeleteInvoice}
          />
        );
      case 'parties':
        return (
          <PartiesManagement
            accounts={accounts}
            onSelectAccountForLedger={setSelectedAccountForLedger}
            onOpenPaymentVoucher={(creditor) => openVoucherModal('PAYMENT')}
            onOpenReceiptVoucher={(debtor) => openVoucherModal('RECEIPT')}
            onRefresh={fetchData}
          />
        );
      case 'gst-reports':
        return (
          <GSTReports
            currentClient={currentClient}
            clientsList={clientsList}
            isAdmin={isAdmin}
            onSelectClient={(cId) => {
              const c = clientsList.find(item => item.id === cId);
              if (c) handleImpersonate(c);
            }}
            onViewInvoice={(inv) => setSelectedInvoiceForPrint(inv)}
          />
        );
      case 'admin':
        return (
          <AdminPortal
            clients={clientsList}
            currentClient={currentClient}
            impersonatedClient={impersonatedClient}
            onRefresh={() => { fetchClients(); fetchData(); }}
            onImpersonate={handleImpersonate}
            onExitImpersonate={handleExitImpersonate}
            onNavigateToGST={(client) => {
              if (client) {
                handleImpersonate(client);
              }
              setActiveTab('gst-reports');
            }}
          />
        );
      case 'masters':
        return (
          <Masters
            accounts={accounts}
            inventory={inventory}
            onRefresh={fetchData}
            onSelectAccount={setSelectedAccountForLedger}
            businessName={currentClient.business_name}
            onUpdateBusinessName={() => {}}
            isDriveAuthenticated={isDriveAuthenticated}
            onDriveAuth={checkDriveAuth}
            onInstallApp={installPWA}
            canInstall={!!deferredPrompt}
            currentClient={currentClient}
            onOpenAuth={() => setIsAuthModalOpen(true)}
          />
        );
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-slate-50">
        <div className="animate-pulse flex flex-col items-center gap-3">
          <div className="w-14 h-14 bg-indigo-600 rounded-2xl shadow-lg shadow-indigo-100 flex items-center justify-center">
            <ShieldCheck className="text-white" size={28} />
          </div>
          <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">GST Accounting</p>
        </div>
      </div>
    );
  }

  // If user is not authenticated, render Home Page with "Sign In" or "Create Account"
  if (!currentUser) {
    return <HomePage onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 max-w-lg mx-auto relative shadow-2xl shadow-slate-200">
      
      {/* Persistent Administrator / Client Switcher Header */}
      <div className="bg-slate-900 text-white text-xs px-4 py-2.5 flex items-center justify-between border-b border-slate-800">
        <div className="flex items-center gap-2">
          {isAdmin ? (
            <button
              onClick={() => setActiveTab('admin')}
              className="flex items-center gap-1.5 font-bold text-amber-400 hover:text-amber-300 transition-colors"
              title="Go to Clients Dashboard"
            >
              <ShieldCheck size={16} /> 
              <span>👑 Admin Dashboard</span>
            </button>
          ) : (
            <div className="flex items-center gap-1.5 font-medium text-slate-300">
              <Building size={14} className="text-indigo-400" />
              <span className="font-bold text-white">{currentClient.business_name}</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {isAdmin && (
            <button
              onClick={() => setActiveTab('admin')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                activeTab === 'admin' 
                  ? 'bg-amber-400 text-slate-950 font-black' 
                  : 'bg-white/10 hover:bg-white/20 text-slate-200'
              }`}
              title="View All Clients"
            >
              All Clients ({clientsList.filter(c => c.role === 'CLIENT').length})
            </button>
          )}

          {isAdmin && clientsList.length > 0 && (
            <select
              value={currentClient.id}
              onChange={e => {
                const c = clientsList.find(item => item.id === parseInt(e.target.value));
                if (c) handleImpersonate(c);
              }}
              className="bg-slate-800 text-slate-200 text-[11px] font-bold rounded-lg px-2 py-1 border border-slate-700"
              title="Quick Switch Client"
            >
              {clientsList.map(c => (
                <option key={c.id} value={c.id}>
                  {c.business_name}
                </option>
              ))}
            </select>
          )}

          <button
            onClick={handleLogout}
            className="flex items-center gap-1 px-2.5 py-1 bg-white/10 hover:bg-rose-600/80 hover:text-white text-slate-300 rounded-lg text-[10px] font-bold transition-all"
            title="Sign Out to Home Page"
          >
            <LogOut size={12} />
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      {/* Sticky Impersonation Banner when Admin is inspecting a client */}
      {isAdmin && impersonatedClient && (
        <div className="bg-amber-400 text-slate-950 px-4 py-2 flex items-center justify-between sticky top-0 z-50 border-b border-amber-500 shadow-sm">
          <div className="flex items-center gap-2 min-w-0">
            <Eye size={15} className="text-slate-950 shrink-0" />
            <span className="text-xs truncate font-bold">
              Auditing: <span className="font-black text-indigo-950">{impersonatedClient.business_name}</span> ({impersonatedClient.state})
            </span>
          </div>
          <button
            onClick={handleExitImpersonate}
            className="bg-slate-950 hover:bg-slate-800 text-white text-[11px] font-bold px-3 py-1.5 rounded-xl shrink-0 flex items-center gap-1 shadow-xs transition-colors"
          >
            <ArrowLeft size={13} />
            <span>← All Clients</span>
          </button>
        </div>
      )}

      {/* Navigation Header */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-100 px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-1">
          <button 
            onClick={goBack}
            disabled={navIndex === 0 && !selectedAccountForLedger}
            className={`p-2 rounded-full transition-colors ${
              navIndex === 0 && !selectedAccountForLedger ? 'text-slate-200' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <ChevronLeft size={18} />
          </button>
          <button 
            onClick={goForward}
            disabled={navIndex === navHistory.length - 1 || !!selectedAccountForLedger}
            className={`p-2 rounded-full transition-colors ${
              navIndex === navHistory.length - 1 || !!selectedAccountForLedger ? 'text-slate-200' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <ChevronRight size={18} />
          </button>
        </div>

        <div className="flex-1 text-center">
          <span className="text-xs font-black text-slate-600 uppercase tracking-widest">
            {selectedAccountForLedger ? 'Ledger Statement' : (tabDisplayNames[activeTab] || activeTab)}
          </span>
        </div>

        <div className="w-16 flex justify-end">
          <button
            onClick={() => openVoucherModal('SALE')}
            className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100"
            title="Create Voucher"
          >
            <Plus size={18} />
          </button>
        </div>
      </header>

      {/* View Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab + (selectedAccountForLedger ? '_ledger' : '')}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.15 }}
        >
          {renderContent()}
        </motion.div>
      </AnimatePresence>

      {/* --- MODALS --- */}

      {/* 1. Auth / User Login Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        currentUser={currentUser}
        onLoginSuccess={handleLoginSuccess}
        onLogout={handleLogout}
      />

      {/* 2. Voucher Entry Modal */}
      <VoucherEntryModal
        isOpen={isVoucherModalOpen}
        onClose={() => {
          setIsVoucherModalOpen(false);
          setEditingTransaction(null);
          setEditingInvoice(null);
        }}
        client={currentClient}
        accounts={accounts}
        inventory={inventory}
        editingTransaction={editingTransaction}
        editingInvoice={editingInvoice}
        initialType={voucherInitialType}
        onComplete={fetchData}
        onRefreshAccounts={fetchData}
      />

      {/* 3. GST Tax Invoice Print Modal */}
      <GSTInvoiceModal
        invoice={selectedInvoiceForPrint}
        client={currentClient}
        onClose={() => setSelectedInvoiceForPrint(null)}
      />

      {/* 4. QR Code Preview Modal */}
      <AnimatePresence>
        {selectedInvoiceForQR && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[150] flex items-center justify-center p-6"
            onClick={() => setSelectedInvoiceForQR(null)}
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl p-6 w-full max-w-xs flex flex-col items-center text-center shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              <h3 className="text-base font-bold text-slate-900">{selectedInvoiceForQR.invoice_number}</h3>
              <p className="text-xs text-slate-500 mb-4">GST e-Invoice QR Code</p>
              
              <div className="p-4 bg-white border-4 border-indigo-50 rounded-2xl mb-4">
                <QRCodeSVG 
                  value={JSON.stringify({
                    type: 'FINTRACK_INVOICE',
                    payload: {
                      invoice_number: selectedInvoiceForQR.invoice_number,
                      customer_name: selectedInvoiceForQR.customer_name,
                      seller_name: currentClient.business_name,
                      seller_gstin: currentClient.gstin,
                      total_amount: selectedInvoiceForQR.total_amount,
                      cgst_total: selectedInvoiceForQR.cgst_total,
                      sgst_total: selectedInvoiceForQR.sgst_total,
                      igst_total: selectedInvoiceForQR.igst_total,
                      place_of_supply: selectedInvoiceForQR.place_of_supply
                    }
                  })} 
                  size={190}
                />
              </div>

              <button 
                onClick={() => setSelectedInvoiceForQR(null)}
                className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 py-2.5 rounded-xl text-xs font-bold transition-colors"
              >
                Close
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 5. QR Code Camera Scanner */}
      {isScanning && (
        <QRScanner 
          onScan={(data) => {
            setIsScanning(false);
            openVoucherModal('PURCHASE');
          }} 
          onClose={() => setIsScanning(false)} 
        />
      )}

      {/* Bottom Navigation */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isAdmin={isAdmin}
      />
    </div>
  );
}
