import React, { useState, useEffect } from 'react';
import { 
  ArrowUpRight, 
  ArrowDownLeft, 
  CreditCard, 
  Receipt, 
  BookOpen, 
  X, 
  Plus, 
  Check, 
  AlertCircle,
  HelpCircle,
  Building,
  User,
  Calendar,
  Layers,
  Trash2
} from 'lucide-react';
import { Account, InventoryItem, Client, Transaction, Invoice, INDIAN_STATES } from '../types';

interface VoucherEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  client: Client;
  accounts: Account[];
  inventory: InventoryItem[];
  editingTransaction?: Transaction | null;
  editingInvoice?: Invoice | null;
  initialType?: 'SALE' | 'PURCHASE' | 'PAYMENT' | 'RECEIPT' | 'EXPENSE' | 'JOURNAL';
  onComplete: () => void;
  onRefreshAccounts: () => void;
}

export const VoucherEntryModal: React.FC<VoucherEntryModalProps> = ({
  isOpen,
  onClose,
  client,
  accounts,
  inventory,
  editingTransaction,
  editingInvoice,
  initialType = 'SALE',
  onComplete,
  onRefreshAccounts
}) => {
  if (!isOpen) return null;

  const [voucherType, setVoucherType] = useState<'SALE' | 'PURCHASE' | 'PAYMENT' | 'RECEIPT' | 'EXPENSE' | 'JOURNAL'>(
    editingInvoice ? 'SALE' : ((editingTransaction?.voucher_type || editingTransaction?.type) as any) || initialType
  );

  const supplierState = client.state || 'Maharashtra';
  const supplierStateCode = client.state_code || '27';

  // --- Common Fields ---
  const [date, setDate] = useState(
    editingInvoice?.date || editingTransaction?.date || new Date().toISOString().split('T')[0]
  );
  const [refNo, setRefNo] = useState(
    editingInvoice?.invoice_number || editingTransaction?.ref_no || ''
  );
  const [narration, setNarration] = useState(
    editingInvoice?.notes || editingTransaction?.description || ''
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // --- Payment / Receipt Specific ---
  const [selectedPartyId, setSelectedPartyId] = useState<string>(() => {
    if (editingInvoice?.customer_id) return editingInvoice.customer_id.toString();
    if (editingTransaction?.party_id) return editingTransaction.party_id.toString();
    if (editingTransaction?.debit_account_id) return editingTransaction.debit_account_id.toString();
    return '';
  });
  const [bankOrCashId, setBankOrCashId] = useState<string>(
    editingTransaction?.credit_account_id ? editingTransaction.credit_account_id.toString() : ''
  );
  const [amount, setAmount] = useState<string>(
    editingInvoice?.total_amount ? editingInvoice.total_amount.toString() : (editingTransaction?.amount ? editingTransaction.amount.toString() : '')
  );

  // --- Purchase / Sale Place of Supply ---
  const [placeOfSupplyCode, setPlaceOfSupplyCode] = useState<string>(
    editingInvoice?.place_of_supply_code || supplierStateCode
  );

  // Quick Party Creation
  const [showQuickAddParty, setShowQuickAddParty] = useState(false);
  const [newPartyName, setNewPartyName] = useState('');
  const [newPartyGstin, setNewPartyGstin] = useState('');
  const [newPartyStateCode, setNewPartyStateCode] = useState(supplierStateCode);

  // --- Sale Line Items ---
  const [invoiceItems, setInvoiceItems] = useState<any[]>(() => {
    if (editingInvoice?.items && editingInvoice.items.length > 0) {
      return editingInvoice.items;
    }
    return [
      { item_id: 0, description: '', quantity: 1, price: 0, hsn_code: '', gst_rate: 18 }
    ];
  });

  // Set default bank or cash
  useEffect(() => {
    const bankOrCash = accounts.find(a => a.group_name === 'Bank Accounts' || a.group_name === 'Cash-in-hand');
    if (bankOrCash && !bankOrCashId) {
      setBankOrCashId(bankOrCash.id.toString());
    }
  }, [accounts]);

  // Intra-state vs Inter-state determination
  const isInterState = placeOfSupplyCode !== supplierStateCode;
  const currentPos = INDIAN_STATES.find(s => s.code === placeOfSupplyCode) || { name: supplierState, code: supplierStateCode };

  // Calculate totals for Sale/Purchase items
  const itemCalculations = invoiceItems.map(item => {
    const taxable = (item.quantity || 0) * (item.price || 0);
    const rate = item.gst_rate || 0;
    const totalGst = taxable * (rate / 100);

    let cgst = 0;
    let sgst = 0;
    let igst = 0;

    if (isInterState) {
      igst = totalGst;
    } else {
      cgst = totalGst / 2;
      sgst = totalGst / 2;
    }

    return {
      taxable,
      cgst,
      sgst,
      igst,
      total: taxable + totalGst
    };
  });

  const totals = itemCalculations.reduce((acc, curr) => ({
    taxable: acc.taxable + curr.taxable,
    cgst: acc.cgst + curr.cgst,
    sgst: acc.sgst + curr.sgst,
    igst: acc.igst + curr.igst,
    grandTotal: acc.grandTotal + curr.total
  }), { taxable: 0, cgst: 0, sgst: 0, igst: 0, grandTotal: 0 });

  // Selected party object for balance display
  const selectedParty = accounts.find(a => a.id.toString() === selectedPartyId);

  // Handle Quick Add Party
  const handleCreateParty = async (group: 'Sundry Debtors' | 'Sundry Creditors') => {
    if (!newPartyName.trim()) return;
    try {
      const stateObj = INDIAN_STATES.find(s => s.code === newPartyStateCode);
      const res = await fetch('/api/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newPartyName.trim(),
          type: group === 'Sundry Debtors' ? 'ASSET' : 'LIABILITY',
          group_name: group,
          gstin: newPartyGstin.trim().toUpperCase() || null,
          state: stateObj?.name || supplierState,
          state_code: newPartyStateCode,
          balance: 0
        })
      });
      if (res.ok) {
        const created = await res.json();
        onRefreshAccounts();
        setSelectedPartyId(created.id.toString());
        setShowQuickAddParty(false);
        setNewPartyName('');
        setNewPartyGstin('');
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Delete Handler for both vouchers and invoices
  const handleDelete = async () => {
    const isInv = !!editingInvoice?.id;
    const isTxn = !!editingTransaction?.id;
    if (!isInv && !isTxn) return;

    const confirmMsg = isInv
      ? `Are you sure you want to delete Tax Invoice ${editingInvoice?.invoice_number}? This will reverse the ledger accounts balance.`
      : `Are you sure you want to delete this ${editingTransaction?.voucher_type || editingTransaction?.type || 'voucher'}? This will reverse the ledger accounts balance.`;

    if (!window.confirm(confirmMsg)) return;

    setIsSubmitting(true);
    try {
      if (isInv) {
        const res = await fetch(`/api/invoices/${editingInvoice!.id}`, { method: 'DELETE' });
        if (!res.ok) throw new Error('Failed to delete invoice');
      } else {
        const res = await fetch(`/api/transactions/${editingTransaction!.id}`, { method: 'DELETE' });
        if (!res.ok) throw new Error('Failed to delete voucher');
      }
      onComplete();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to delete entry');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      if (voucherType === 'PAYMENT') {
        // Payment to Creditor
        if (!selectedPartyId || !bankOrCashId || !amount) {
          throw new Error('Please select Creditor, Payment Account, and Amount.');
        }

        const amt = parseFloat(amount);
        const creditor = accounts.find(a => a.id.toString() === selectedPartyId);
        const paymentAcc = accounts.find(a => a.id.toString() === bankOrCashId);
        const desc = narration || `Payment made to ${creditor?.name || 'Creditor'} (${refNo ? 'Ref: ' + refNo : paymentAcc?.name || ''})`;

        if (editingTransaction?.id) {
          const res = await fetch(`/api/transactions/${editingTransaction.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              date,
              description: desc,
              amount: amt,
              type: 'PAYMENT',
              voucher_type: 'PAYMENT',
              ref_no: refNo,
              party_id: parseInt(selectedPartyId),
              debit_account_id: parseInt(selectedPartyId),
              credit_account_id: parseInt(bankOrCashId)
            })
          });
          if (!res.ok) throw new Error('Failed to update payment voucher.');
        } else {
          const res = await fetch('/api/vouchers/payment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              creditor_id: parseInt(selectedPartyId),
              payment_mode_account_id: parseInt(bankOrCashId),
              amount: amt,
              date,
              ref_no: refNo,
              narration: desc
            })
          });
          if (!res.ok) throw new Error('Failed to record payment voucher.');
        }
      } else if (voucherType === 'RECEIPT') {
        // Payment Received from Debtor
        if (!selectedPartyId || !bankOrCashId || !amount) {
          throw new Error('Please select Debtor, Receipt Account, and Amount.');
        }

        const amt = parseFloat(amount);
        const debtor = accounts.find(a => a.id.toString() === selectedPartyId);
        const modeAcc = accounts.find(a => a.id.toString() === bankOrCashId);
        const desc = narration || `Payment received from ${debtor?.name || 'Debtor'} (${refNo ? 'Ref: ' + refNo : modeAcc?.name || ''})`;

        if (editingTransaction?.id) {
          const res = await fetch(`/api/transactions/${editingTransaction.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              date,
              description: desc,
              amount: amt,
              type: 'RECEIPT',
              voucher_type: 'RECEIPT',
              ref_no: refNo,
              party_id: parseInt(selectedPartyId),
              debit_account_id: parseInt(bankOrCashId),
              credit_account_id: parseInt(selectedPartyId)
            })
          });
          if (!res.ok) throw new Error('Failed to update receipt voucher.');
        } else {
          const res = await fetch('/api/vouchers/receipt', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              debtor_id: parseInt(selectedPartyId),
              receipt_mode_account_id: parseInt(bankOrCashId),
              amount: amt,
              date,
              ref_no: refNo,
              narration: desc
            })
          });
          if (!res.ok) throw new Error('Failed to record receipt voucher.');
        }
      } else if (voucherType === 'SALE') {
        // Record or Update Sale & GST Invoice
        if (!selectedPartyId) throw new Error('Please select a Customer.');
        if (invoiceItems.length === 0 || totals.grandTotal <= 0) throw new Error('Please enter valid items.');

        const invoiceNumber = refNo.trim() || `INV-${Date.now().toString().slice(-6)}`;
        const customer = accounts.find(a => a.id.toString() === selectedPartyId);

        const invoicePayload = {
          invoice_number: invoiceNumber,
          date,
          customer_id: parseInt(selectedPartyId),
          total_amount: totals.grandTotal,
          cgst_total: totals.cgst,
          sgst_total: totals.sgst,
          igst_total: totals.igst,
          items: invoiceItems.map((item, idx) => ({
            ...item,
            cgst: itemCalculations[idx].cgst,
            sgst: itemCalculations[idx].sgst,
            igst: itemCalculations[idx].igst
          })),
          place_of_supply: currentPos.name,
          place_of_supply_code: currentPos.code,
          is_interstate: isInterState ? 1 : 0,
          buyer_gstin: customer?.gstin || null,
          buyer_state: customer?.state || currentPos.name,
          buyer_state_code: customer?.state_code || currentPos.code,
          notes: narration
        };

        if (editingInvoice?.id) {
          const res = await fetch(`/api/invoices/${editingInvoice.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(invoicePayload)
          });
          if (!res.ok) throw new Error('Failed to update GST Tax Invoice.');
        } else {
          const res = await fetch('/api/invoices', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(invoicePayload)
          });
          if (!res.ok) throw new Error('Failed to save GST Tax Invoice.');
        }
      } else if (voucherType === 'PURCHASE') {
        // Record or Update Purchase entry
        if (!selectedPartyId) throw new Error('Please select a Supplier (Creditor).');
        const purchaseAccount = accounts.find(a => a.name === 'Purchase Account');
        if (!purchaseAccount) throw new Error('Purchase Account ledger not found.');

        const purchaseAmount = parseFloat(amount || totals.grandTotal.toString());
        const taxable = isNaN(purchaseAmount) ? 0 : purchaseAmount;
        const purchaseDesc = narration || `Purchase from ${selectedParty?.name || 'Supplier'}`;

        if (editingTransaction?.id) {
          const res = await fetch(`/api/transactions/${editingTransaction.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              date,
              description: purchaseDesc,
              amount: taxable,
              type: 'PURCHASE',
              voucher_type: 'PURCHASE',
              ref_no: refNo,
              party_id: parseInt(selectedPartyId),
              debit_account_id: purchaseAccount.id,
              credit_account_id: parseInt(selectedPartyId)
            })
          });
          if (!res.ok) throw new Error('Failed to update purchase entry.');
        } else {
          const res = await fetch('/api/transactions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              date,
              description: purchaseDesc,
              amount: taxable,
              type: 'PURCHASE',
              voucher_type: 'PURCHASE',
              ref_no: refNo,
              party_id: parseInt(selectedPartyId),
              debit_account_id: purchaseAccount.id,
              credit_account_id: parseInt(selectedPartyId)
            })
          });
          if (!res.ok) throw new Error('Failed to record purchase entry.');
        }
      } else {
        // Journal / Expense
        const debitId = selectedPartyId;
        const creditId = bankOrCashId;

        if (editingTransaction?.id) {
          const res = await fetch(`/api/transactions/${editingTransaction.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              date,
              description: narration || 'Expense / Journal Entry',
              amount: parseFloat(amount),
              type: voucherType,
              voucher_type: voucherType,
              ref_no: refNo,
              debit_account_id: parseInt(debitId),
              credit_account_id: parseInt(creditId)
            })
          });
          if (!res.ok) throw new Error('Failed to update transaction.');
        } else {
          const res = await fetch('/api/transactions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              date,
              description: narration || 'Expense / Journal Entry',
              amount: parseFloat(amount),
              type: voucherType,
              voucher_type: voucherType,
              ref_no: refNo,
              debit_account_id: parseInt(debitId),
              credit_account_id: parseInt(creditId)
            })
          });
          if (!res.ok) throw new Error('Failed to record transaction.');
        }
      }

      onComplete();
      onClose();
    } catch (err: any) {
      setError(err.message || 'An error occurred while saving the voucher.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[125] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl border border-slate-100 overflow-hidden my-auto max-h-[92vh] flex flex-col">
        
        {/* Header with Voucher Type Selector */}
        <div className="p-5 bg-slate-900 text-white shrink-0">
          <div className="flex justify-between items-center mb-3">
            <div>
              <h2 className="text-lg font-bold">
                {editingInvoice 
                  ? `✏️ Modify Tax Invoice #${editingInvoice.invoice_number}`
                  : (editingTransaction 
                      ? `✏️ Modify ${editingTransaction.voucher_type || editingTransaction.type} Voucher` 
                      : 'New Accounting Entry')}
              </h2>
              <p className="text-xs text-slate-400">
                Supplier: <span className="text-white font-medium">{client.business_name} ({supplierState} - {supplierStateCode})</span>
              </p>
            </div>
            <button onClick={onClose} className="p-2 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300">
              <X size={18} />
            </button>
          </div>

          {/* Voucher Navigation Pills */}
          <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5 p-1 bg-slate-800 rounded-2xl text-xs font-bold">
            <button
              type="button"
              onClick={() => { setVoucherType('SALE'); setSelectedPartyId(''); }}
              className={`py-2 px-1 rounded-xl transition-all text-center flex flex-col items-center gap-1 ${
                voucherType === 'SALE' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-300 hover:text-white'
              }`}
            >
              <ArrowUpRight size={14} />
              <span>Sale (Tax Inv)</span>
            </button>

            <button
              type="button"
              onClick={() => { setVoucherType('PURCHASE'); setSelectedPartyId(''); }}
              className={`py-2 px-1 rounded-xl transition-all text-center flex flex-col items-center gap-1 ${
                voucherType === 'PURCHASE' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-300 hover:text-white'
              }`}
            >
              <ArrowDownLeft size={14} />
              <span>Purchase</span>
            </button>

            <button
              type="button"
              onClick={() => { setVoucherType('PAYMENT'); setSelectedPartyId(''); }}
              className={`py-2 px-1 rounded-xl transition-all text-center flex flex-col items-center gap-1 ${
                voucherType === 'PAYMENT' ? 'bg-rose-600 text-white shadow-md' : 'text-slate-300 hover:text-white'
              }`}
            >
              <CreditCard size={14} />
              <span>Payment (To)</span>
            </button>

            <button
              type="button"
              onClick={() => { setVoucherType('RECEIPT'); setSelectedPartyId(''); }}
              className={`py-2 px-1 rounded-xl transition-all text-center flex flex-col items-center gap-1 ${
                voucherType === 'RECEIPT' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-300 hover:text-white'
              }`}
            >
              <Receipt size={14} />
              <span>Receipt (By)</span>
            </button>

            <button
              type="button"
              onClick={() => { setVoucherType('EXPENSE'); setSelectedPartyId(''); }}
              className={`py-2 px-1 rounded-xl transition-all text-center flex flex-col items-center gap-1 hidden sm:flex ${
                voucherType === 'EXPENSE' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-300 hover:text-white'
              }`}
            >
              <BookOpen size={14} />
              <span>Expense</span>
            </button>

            <button
              type="button"
              onClick={() => { setVoucherType('JOURNAL'); setSelectedPartyId(''); }}
              className={`py-2 px-1 rounded-xl transition-all text-center flex flex-col items-center gap-1 hidden sm:flex ${
                voucherType === 'JOURNAL' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-300 hover:text-white'
              }`}
            >
              <Layers size={14} />
              <span>Journal</span>
            </button>
          </div>
        </div>

        {/* Voucher Form Body */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4 flex-1">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center gap-2">
              <AlertCircle size={16} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Date & Ref No */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Date</label>
              <input
                type="date"
                required
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-200 text-sm focus:border-indigo-600 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                {voucherType === 'SALE' ? 'Invoice No.' : voucherType === 'PURCHASE' ? 'Supplier Bill No.' : 'Ref / Cheque / UTR No.'}
              </label>
              <input
                type="text"
                placeholder={voucherType === 'SALE' ? 'INV-AUTO' : 'e.g. CHQ-9012 or UPI-8812'}
                value={refNo}
                onChange={e => setRefNo(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-200 text-sm focus:border-indigo-600 focus:outline-none"
              />
            </div>
          </div>

          {/* --- VOUCHER TYPE: PAYMENT TO CREDITOR --- */}
          {voucherType === 'PAYMENT' && (
            <div className="space-y-4 bg-rose-50/50 p-4 rounded-2xl border border-rose-100">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase text-rose-800 tracking-wider flex items-center gap-1.5">
                  <CreditCard size={15} />
                  Record Payment Made to Creditor (Supplier)
                </span>
                <button
                  type="button"
                  onClick={() => setShowQuickAddParty(!showQuickAddParty)}
                  className="text-xs text-rose-700 font-bold hover:underline"
                >
                  {showQuickAddParty ? 'Cancel' : '+ New Creditor'}
                </button>
              </div>

              {showQuickAddParty && (
                <div className="p-3 bg-white rounded-xl border border-rose-200 space-y-2">
                  <p className="text-xs font-bold text-slate-700">Quick Add Creditor (Supplier)</p>
                  <input
                    type="text"
                    placeholder="Supplier / Company Name"
                    value={newPartyName}
                    onChange={e => setNewPartyName(e.target.value)}
                    className="w-full p-2 rounded-lg border text-xs"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="GSTIN (Optional)"
                      value={newPartyGstin}
                      onChange={e => setNewPartyGstin(e.target.value)}
                      className="p-2 rounded-lg border text-xs"
                    />
                    <button
                      type="button"
                      onClick={() => handleCreateParty('Sundry Creditors')}
                      className="bg-rose-600 text-white rounded-lg text-xs font-bold py-2"
                    >
                      Save Supplier
                    </button>
                  </div>
                </div>
              )}

              {/* Select Creditor */}
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">
                  Pay To: Sundry Creditor (Supplier)
                </label>
                <select
                  required
                  value={selectedPartyId}
                  onChange={e => setSelectedPartyId(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-sm bg-white font-medium"
                >
                  <option value="">Select Creditor...</option>
                  {accounts.filter(a => a.group_name === 'Sundry Creditors').map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.balance !== 0 ? `(Balance: ₹${Math.abs(c.balance).toLocaleString()})` : ''}
                    </option>
                  ))}
                </select>

                {selectedParty && (
                  <div className="mt-2 p-2.5 bg-white rounded-xl border border-rose-100 flex justify-between items-center text-xs">
                    <span className="text-slate-500">Current Outstanding Payable:</span>
                    <span className="font-bold text-rose-600 text-sm">
                      ₹{Math.abs(selectedParty.balance).toLocaleString()}
                    </span>
                  </div>
                )}
              </div>

              {/* Paid From (Bank / Cash) */}
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">
                  Paid From (Bank / Cash Account)
                </label>
                <select
                  required
                  value={bankOrCashId}
                  onChange={e => setBankOrCashId(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-sm bg-white"
                >
                  {accounts.filter(a => a.group_name === 'Bank Accounts' || a.group_name === 'Cash-in-hand').map(b => (
                    <option key={b.id} value={b.id}>
                      {b.name} (Balance: ₹{b.balance.toLocaleString()})
                    </option>
                  ))}
                </select>
              </div>

              {/* Amount */}
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Payment Amount (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="0.00"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  className="w-full p-3 rounded-xl border border-slate-200 text-base font-bold text-slate-900 focus:border-rose-600 focus:outline-none"
                />
              </div>
            </div>
          )}

          {/* --- VOUCHER TYPE: RECEIPT FROM DEBTOR --- */}
          {voucherType === 'RECEIPT' && (
            <div className="space-y-4 bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase text-emerald-800 tracking-wider flex items-center gap-1.5">
                  <Receipt size={15} />
                  Record Payment Received from Debtor (Customer)
                </span>
                <button
                  type="button"
                  onClick={() => setShowQuickAddParty(!showQuickAddParty)}
                  className="text-xs text-emerald-700 font-bold hover:underline"
                >
                  {showQuickAddParty ? 'Cancel' : '+ New Customer'}
                </button>
              </div>

              {showQuickAddParty && (
                <div className="p-3 bg-white rounded-xl border border-emerald-200 space-y-2">
                  <p className="text-xs font-bold text-slate-700">Quick Add Debtor (Customer)</p>
                  <input
                    type="text"
                    placeholder="Customer / Company Name"
                    value={newPartyName}
                    onChange={e => setNewPartyName(e.target.value)}
                    className="w-full p-2 rounded-lg border text-xs"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="GSTIN (Optional)"
                      value={newPartyGstin}
                      onChange={e => setNewPartyGstin(e.target.value)}
                      className="p-2 rounded-lg border text-xs"
                    />
                    <button
                      type="button"
                      onClick={() => handleCreateParty('Sundry Debtors')}
                      className="bg-emerald-600 text-white rounded-lg text-xs font-bold py-2"
                    >
                      Save Customer
                    </button>
                  </div>
                </div>
              )}

              {/* Select Debtor */}
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">
                  Received From: Sundry Debtor (Customer)
                </label>
                <select
                  required
                  value={selectedPartyId}
                  onChange={e => setSelectedPartyId(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-sm bg-white font-medium"
                >
                  <option value="">Select Debtor...</option>
                  {accounts.filter(a => a.group_name === 'Sundry Debtors').map(d => (
                    <option key={d.id} value={d.id}>
                      {d.name} {d.balance !== 0 ? `(Receivable: ₹${Math.abs(d.balance).toLocaleString()})` : ''}
                    </option>
                  ))}
                </select>

                {selectedParty && (
                  <div className="mt-2 p-2.5 bg-white rounded-xl border border-emerald-100 flex justify-between items-center text-xs">
                    <span className="text-slate-500">Current Outstanding Receivable:</span>
                    <span className="font-bold text-emerald-600 text-sm">
                      ₹{Math.abs(selectedParty.balance).toLocaleString()}
                    </span>
                  </div>
                )}
              </div>

              {/* Received In (Bank / Cash) */}
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">
                  Deposit Into (Bank / Cash Account)
                </label>
                <select
                  required
                  value={bankOrCashId}
                  onChange={e => setBankOrCashId(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-sm bg-white"
                >
                  {accounts.filter(a => a.group_name === 'Bank Accounts' || a.group_name === 'Cash-in-hand').map(b => (
                    <option key={b.id} value={b.id}>
                      {b.name} (Balance: ₹{b.balance.toLocaleString()})
                    </option>
                  ))}
                </select>
              </div>

              {/* Amount */}
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Amount Received (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="0.00"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  className="w-full p-3 rounded-xl border border-slate-200 text-base font-bold text-slate-900 focus:border-emerald-600 focus:outline-none"
                />
              </div>
            </div>
          )}

          {/* --- VOUCHER TYPE: SALE (GST TAX INVOICE) --- */}
          {voucherType === 'SALE' && (
            <div className="space-y-4">
              {/* Customer Selection & Quick Add */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">
                    Customer (Sundry Debtor)
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowQuickAddParty(!showQuickAddParty)}
                    className="text-xs text-indigo-600 font-bold hover:underline"
                  >
                    {showQuickAddParty ? 'Cancel' : '+ New Customer'}
                  </button>
                </div>

                {showQuickAddParty ? (
                  <div className="p-3 bg-indigo-50/50 rounded-xl border border-indigo-100 space-y-2 mb-2">
                    <p className="text-xs font-bold text-indigo-900">Add New Customer Ledger</p>
                    <input
                      type="text"
                      placeholder="Customer Legal / Trade Name"
                      value={newPartyName}
                      onChange={e => setNewPartyName(e.target.value)}
                      className="w-full p-2 rounded-lg border text-xs"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        placeholder="GSTIN (e.g. 27AAAAA0000A1Z5)"
                        value={newPartyGstin}
                        onChange={e => setNewPartyGstin(e.target.value)}
                        className="p-2 rounded-lg border text-xs"
                      />
                      <select
                        value={newPartyStateCode}
                        onChange={e => setNewPartyStateCode(e.target.value)}
                        className="p-2 rounded-lg border text-xs"
                      >
                        {INDIAN_STATES.map(s => (
                          <option key={s.code} value={s.code}>{s.code} - {s.name}</option>
                        ))}
                      </select>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCreateParty('Sundry Debtors')}
                      className="w-full bg-indigo-600 text-white rounded-lg text-xs font-bold py-2"
                    >
                      Create Customer & Select
                    </button>
                  </div>
                ) : (
                  <select
                    required
                    value={selectedPartyId}
                    onChange={e => {
                      setSelectedPartyId(e.target.value);
                      const cust = accounts.find(a => a.id.toString() === e.target.value);
                      if (cust?.state_code) {
                        setPlaceOfSupplyCode(cust.state_code);
                      }
                    }}
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-sm bg-white"
                  >
                    <option value="">Select Customer...</option>
                    {accounts.filter(a => a.group_name === 'Sundry Debtors').map(d => (
                      <option key={d.id} value={d.id}>
                        {d.name} {d.gstin ? `[GSTIN: ${d.gstin}]` : ''}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* GST Place of Supply & Nature of Supply Rule Card */}
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-slate-700">Place of Supply (POS):</label>
                  <select
                    value={placeOfSupplyCode}
                    onChange={e => setPlaceOfSupplyCode(e.target.value)}
                    className="p-1.5 rounded-lg border border-slate-300 text-xs font-bold bg-white"
                  >
                    {INDIAN_STATES.map(s => (
                      <option key={s.code} value={s.code}>
                        {s.code} - {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Statutory Law Notice Badge */}
                <div className={`p-2.5 rounded-xl text-xs flex items-center justify-between font-medium ${
                  isInterState
                    ? 'bg-amber-100/70 border border-amber-300 text-amber-900'
                    : 'bg-emerald-100/70 border border-emerald-300 text-emerald-900'
                }`}>
                  <div>
                    <span className="font-bold block">
                      {isInterState ? '⚡ Inter-State Supply (IGST Applicable)' : '🌿 Intra-State Supply (CGST + SGST Applicable)'}
                    </span>
                    <span className="text-[10px] opacity-80">
                      Supplier in {supplierState} ({supplierStateCode}) → POS in {currentPos.name} ({currentPos.code})
                    </span>
                  </div>
                  <span className="text-[10px] font-bold uppercase px-2 py-1 rounded bg-white/60">
                    {isInterState ? '100% IGST' : '50% CGST + 50% SGST'}
                  </span>
                </div>
              </div>

              {/* Line Items */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Invoice Items & GST Rates
                  </label>
                  <button
                    type="button"
                    onClick={() => setInvoiceItems([
                      ...invoiceItems,
                      { item_id: 0, description: '', quantity: 1, price: 0, hsn_code: '', gst_rate: 18 }
                    ])}
                    className="text-xs text-indigo-600 font-bold flex items-center gap-1 hover:underline"
                  >
                    <Plus size={14} /> Add Line Item
                  </button>
                </div>

                {invoiceItems.map((item, idx) => (
                  <div key={idx} className="p-3 bg-white border border-slate-200 rounded-2xl space-y-2 shadow-xs">
                    <div className="flex gap-2">
                      <select
                        value={item.item_id}
                        onChange={e => {
                          const id = parseInt(e.target.value);
                          const inv = inventory.find(i => i.id === id);
                          const newItems = [...invoiceItems];
                          newItems[idx].item_id = id;
                          if (inv) {
                            newItems[idx].description = inv.name;
                            newItems[idx].price = inv.sale_price;
                            newItems[idx].hsn_code = inv.hsn_code;
                            newItems[idx].gst_rate = inv.gst_rate;
                          }
                          setInvoiceItems(newItems);
                        }}
                        className="flex-1 p-2 rounded-lg border text-xs bg-slate-50 font-medium"
                      >
                        <option value="0">Custom Item / Select from Stock...</option>
                        {inventory.map(inv => (
                          <option key={inv.id} value={inv.id}>
                            {inv.name} (HSN: {inv.hsn_code} - ₹{inv.sale_price})
                          </option>
                        ))}
                      </select>

                      {invoiceItems.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setInvoiceItems(invoiceItems.filter((_, i) => i !== idx))}
                          className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg"
                        >
                          <X size={16} />
                        </button>
                      )}
                    </div>

                    <input
                      type="text"
                      placeholder="Item Description / Service Specification"
                      value={item.description}
                      onChange={e => {
                        const newItems = [...invoiceItems];
                        newItems[idx].description = e.target.value;
                        setInvoiceItems(newItems);
                      }}
                      className="w-full p-2 rounded-lg border text-xs"
                      required
                    />

                    <div className="grid grid-cols-4 gap-2">
                      <div>
                        <span className="text-[10px] text-slate-400 block font-bold">HSN/SAC</span>
                        <input
                          type="text"
                          placeholder="8542"
                          value={item.hsn_code}
                          onChange={e => {
                            const newItems = [...invoiceItems];
                            newItems[idx].hsn_code = e.target.value;
                            setInvoiceItems(newItems);
                          }}
                          className="w-full p-2 rounded-lg border text-xs font-mono"
                        />
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block font-bold">Qty</span>
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={e => {
                            const newItems = [...invoiceItems];
                            newItems[idx].quantity = parseFloat(e.target.value) || 0;
                            setInvoiceItems(newItems);
                          }}
                          className="w-full p-2 rounded-lg border text-xs"
                          required
                        />
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block font-bold">Rate (₹)</span>
                        <input
                          type="number"
                          step="0.01"
                          value={item.price}
                          onChange={e => {
                            const newItems = [...invoiceItems];
                            newItems[idx].price = parseFloat(e.target.value) || 0;
                            setInvoiceItems(newItems);
                          }}
                          className="w-full p-2 rounded-lg border text-xs font-medium"
                          required
                        />
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block font-bold">GST %</span>
                        <select
                          value={item.gst_rate}
                          onChange={e => {
                            const newItems = [...invoiceItems];
                            newItems[idx].gst_rate = parseFloat(e.target.value);
                            setInvoiceItems(newItems);
                          }}
                          className="w-full p-2 rounded-lg border text-xs bg-white font-bold"
                        >
                          <option value="0">0%</option>
                          <option value="5">5%</option>
                          <option value="12">12%</option>
                          <option value="18">18%</option>
                          <option value="28">28%</option>
                        </select>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Tax Breakup Display */}
              <div className="p-4 bg-slate-900 text-white rounded-2xl space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-300">
                  <span>Total Taxable Value</span>
                  <span>₹{totals.taxable.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
                {!isInterState ? (
                  <>
                    <div className="flex justify-between text-slate-400">
                      <span>Central GST (CGST)</span>
                      <span>₹{totals.cgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>State GST (SGST)</span>
                      <span>₹{totals.sgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                  </>
                ) : (
                  <div className="flex justify-between text-amber-300">
                    <span>Integrated GST (IGST)</span>
                    <span>₹{totals.igst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                )}
                <div className="pt-2 border-t border-slate-700 flex justify-between font-bold text-sm text-emerald-400">
                  <span>Grand Total (Invoice Value)</span>
                  <span>₹{totals.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
            </div>
          )}

          {/* --- VOUCHER TYPE: PURCHASE ENTRY --- */}
          {voucherType === 'PURCHASE' && (
            <div className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">
                    Supplier (Sundry Creditor)
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowQuickAddParty(!showQuickAddParty)}
                    className="text-xs text-indigo-600 font-bold hover:underline"
                  >
                    {showQuickAddParty ? 'Cancel' : '+ New Supplier'}
                  </button>
                </div>

                <select
                  required
                  value={selectedPartyId}
                  onChange={e => setSelectedPartyId(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-sm bg-white"
                >
                  <option value="">Select Supplier...</option>
                  {accounts.filter(a => a.group_name === 'Sundry Creditors').map(c => (
                    <option key={c.id} value={c.id}>{c.name} {c.gstin ? `[GSTIN: ${c.gstin}]` : ''}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
                  Total Purchase Bill Amount (₹)
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="0.00"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  className="w-full p-3 rounded-xl border border-slate-200 text-base font-bold text-slate-900 focus:border-indigo-600 focus:outline-none"
                />
              </div>
            </div>
          )}

          {/* --- VOUCHER TYPE: EXPENSE / JOURNAL --- */}
          {(voucherType === 'EXPENSE' || voucherType === 'JOURNAL') && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Debit Account (By)</label>
                  <select
                    required
                    value={selectedPartyId}
                    onChange={e => setSelectedPartyId(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-xs bg-white"
                  >
                    <option value="">Select Account...</option>
                    {accounts.map(a => (
                      <option key={a.id} value={a.id}>{a.name} ({a.group_name})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Credit Account (To)</label>
                  <select
                    required
                    value={bankOrCashId}
                    onChange={e => setBankOrCashId(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-xs bg-white"
                  >
                    <option value="">Select Account...</option>
                    {accounts.map(a => (
                      <option key={a.id} value={a.id}>{a.name} ({a.group_name})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Amount (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="0.00"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-sm font-bold"
                />
              </div>
            </div>
          )}

          {/* Narration */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
              Narration / Notes
            </label>
            <input
              type="text"
              placeholder="e.g. Being payment made against Bill #4410 via NEFT"
              value={narration}
              onChange={e => setNarration(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-slate-200 text-xs focus:border-indigo-600 focus:outline-none"
            />
          </div>

          {/* Footer Submit Button */}
          <div className="pt-2 flex items-center gap-2">
            {(editingInvoice || editingTransaction) && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={isSubmitting}
                className="py-3 px-3.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs transition-all flex items-center justify-center gap-1.5 border border-rose-200 shrink-0 shadow-xs"
                title="Permanently delete this entry"
              >
                <Trash2 size={15} />
                <span>Delete</span>
              </button>
            )}
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-lg shadow-indigo-100 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isSubmitting 
                ? 'Processing...' 
                : (editingInvoice || editingTransaction ? '✓ Save Changes / Update Entry' : 'Save Voucher Entry')}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
