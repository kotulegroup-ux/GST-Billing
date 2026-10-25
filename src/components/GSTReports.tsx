import React, { useState, useEffect } from 'react';
import { 
  FileCheck, 
  Download, 
  Printer, 
  ChevronDown, 
  Building, 
  Calendar, 
  TrendingUp, 
  TrendingDown, 
  ShieldAlert, 
  CheckCircle2, 
  FileSpreadsheet,
  RefreshCw
} from 'lucide-react';
import { GSTReportSummary, Client } from '../types';

interface GSTReportsProps {
  currentClient: Client;
  clientsList?: Client[];
  isAdmin: boolean;
  onSelectClient?: (clientId: number) => void;
  onViewInvoice?: (invoice: any) => void;
}

export const GSTReports: React.FC<GSTReportsProps> = ({
  currentClient,
  clientsList = [],
  isAdmin,
  onSelectClient,
  onViewInvoice
}) => {
  const [report, setReport] = useState<GSTReportSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'GSTR1' | 'GSTR2B' | 'GSTR3B'>('GSTR1');
  const [selectedClientId, setSelectedClientId] = useState<number>(currentClient.id);

  const fetchGSTReports = async (clientId: number) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/gst-reports?client_id=${clientId}`);
      if (res.ok) {
        const data = await res.json();
        setReport(data);
      }
    } catch (e) {
      console.error("Failed to load GST reports", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setSelectedClientId(currentClient.id);
    fetchGSTReports(currentClient.id);
  }, [currentClient.id]);

  const handleClientChange = (newId: number) => {
    setSelectedClientId(newId);
    if (onSelectClient) {
      onSelectClient(newId);
    }
    fetchGSTReports(newId);
  };

  const handlePrint = () => {
    window.print();
  };

  const exportCSV = () => {
    if (!report) return;
    let csvContent = "data:text/csv;charset=utf-8,";

    if (activeTab === 'GSTR1') {
      csvContent += "Invoice Number,Date,Customer,Buyer GSTIN,Place of Supply,Supply Type,Taxable Value,CGST,SGST,IGST,Total Amount\n";
      report.gstr1.invoices.forEach(inv => {
        const type = inv.is_interstate ? "Inter-State" : "Intra-State";
        const taxable = inv.total_amount - (inv.cgst_total || 0) - (inv.sgst_total || 0) - (inv.igst_total || 0);
        csvContent += `"${inv.invoice_number}","${inv.date}","${inv.customer_name || ''}","${inv.buyer_gstin || ''}","${inv.place_of_supply || ''}","${type}",${taxable},${inv.cgst_total || 0},${inv.sgst_total || 0},${inv.igst_total || 0},${inv.total_amount}\n`;
      });
    } else if (activeTab === 'GSTR3B') {
      csvContent += "Description,Taxable Value,IGST,CGST,SGST,Total Tax\n";
      csvContent += `"3.1 Outward Taxable Supplies",${report.gstr3b.outward_taxable_value},${report.gstr3b.outward_igst},${report.gstr3b.outward_cgst},${report.gstr3b.outward_sgst},${report.gstr3b.total_outward_tax}\n`;
      csvContent += `"4. Eligible ITC",0,${report.gstr3b.itc_igst},${report.gstr3b.itc_cgst},${report.gstr3b.itc_sgst},${report.gstr3b.total_itc}\n`;
      csvContent += `"6.1 Net Tax Payable",0,${report.gstr3b.net_payable_igst},${report.gstr3b.net_payable_cgst},${report.gstr3b.net_payable_sgst},${report.gstr3b.total_net_payable}\n`;
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `GST_${activeTab}_${report.client.business_name}_${report.period}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-slate-400 space-y-3">
        <RefreshCw className="animate-spin mx-auto text-indigo-600" size={28} />
        <p className="text-sm font-medium">Computing GST return statements...</p>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="p-8 text-center text-slate-500">
        <p>No GST data available for this business.</p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-5 pb-28">
      
      {/* Header & Client Switcher for Admin */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">GST Return Reports</h2>
          <p className="text-xs text-slate-500">
            For: <span className="font-bold text-indigo-900">{report.client.business_name}</span> (GSTIN: <span className="font-mono font-bold text-slate-800">{report.client.gstin || 'N/A'}</span>)
          </p>
        </div>

        {/* Client Selection (Admin Mode) */}
        {isAdmin && clientsList.length > 0 && (
          <div className="flex items-center gap-2 bg-indigo-50/80 p-1.5 rounded-2xl border border-indigo-100">
            <Building size={16} className="text-indigo-600 ml-2" />
            <select
              value={selectedClientId}
              onChange={e => handleClientChange(parseInt(e.target.value))}
              className="bg-transparent text-xs font-bold text-indigo-950 focus:outline-none pr-3 py-1"
            >
              {clientsList.map(c => (
                <option key={c.id} value={c.id}>
                  {c.business_name} ({c.state})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Action Buttons: Print & Export */}
      <div className="flex justify-between items-center bg-white p-3 rounded-2xl border border-slate-100 shadow-xs">
        <div className="flex gap-1.5">
          <button
            onClick={() => setActiveTab('GSTR1')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'GSTR1' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            GSTR-1 (Outward)
          </button>
          <button
            onClick={() => setActiveTab('GSTR2B')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'GSTR2B' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            GSTR-2B (ITC)
          </button>
          <button
            onClick={() => setActiveTab('GSTR3B')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'GSTR3B' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            GSTR-3B (Summary)
          </button>
        </div>

        <div className="flex gap-2">
          <button
            onClick={exportCSV}
            className="p-2 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-xl text-xs font-bold flex items-center gap-1"
            title="Export CSV"
          >
            <Download size={14} />
            <span className="hidden sm:inline">CSV</span>
          </button>
          <button
            onClick={handlePrint}
            className="p-2 text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-bold flex items-center gap-1"
            title="Print Report"
          >
            <Printer size={14} />
            <span className="hidden sm:inline">Print</span>
          </button>
        </div>
      </div>

      {/* --- TAB 1: GSTR-1 (Outward Supplies / Sales) --- */}
      {activeTab === 'GSTR1' && (
        <div className="space-y-4">
          {/* Statutory Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs">
              <p className="text-[10px] font-bold uppercase text-slate-400">Total Taxable Turnover</p>
              <p className="text-lg font-black text-slate-900 mt-1">₹{report.gstr1.total_taxable_value.toLocaleString('en-IN')}</p>
              <p className="text-[10px] text-slate-500 mt-1">{report.gstr1.invoices.length} Invoices Issued</p>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs">
              <p className="text-[10px] font-bold uppercase text-slate-400">CGST Liability (Intra)</p>
              <p className="text-lg font-black text-indigo-600 mt-1">₹{report.gstr1.total_cgst.toLocaleString('en-IN')}</p>
              <p className="text-[10px] text-slate-500 mt-1">Central Tax</p>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs">
              <p className="text-[10px] font-bold uppercase text-slate-400">SGST Liability (Intra)</p>
              <p className="text-lg font-black text-indigo-600 mt-1">₹{report.gstr1.total_sgst.toLocaleString('en-IN')}</p>
              <p className="text-[10px] text-slate-500 mt-1">State Tax</p>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs">
              <p className="text-[10px] font-bold uppercase text-slate-400">IGST Liability (Inter)</p>
              <p className="text-lg font-black text-amber-600 mt-1">₹{report.gstr1.total_igst.toLocaleString('en-IN')}</p>
              <p className="text-[10px] text-slate-500 mt-1">Integrated Tax</p>
            </div>
          </div>

          {/* Table 4 & 7: B2B vs B2C Breakdown */}
          <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-xs space-y-3">
            <h3 className="text-xs font-bold uppercase text-slate-500 tracking-wider">
              Outward Supply Categories (B2B vs B2C)
            </h3>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-indigo-50/50 rounded-2xl border border-indigo-100">
                <div className="flex justify-between font-bold text-indigo-950">
                  <span>Table 4: B2B Supplies (Registered)</span>
                  <span>{report.gstr1.b2b_invoices_count} Invoices</span>
                </div>
                <div className="mt-2 space-y-1 text-[11px] text-slate-600">
                  <div className="flex justify-between">
                    <span>Taxable:</span>
                    <span className="font-bold">₹{report.gstr1.b2b_taxable_value.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>CGST + SGST:</span>
                    <span>₹{(report.gstr1.b2b_cgst + report.gstr1.b2b_sgst).toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>IGST:</span>
                    <span>₹{report.gstr1.b2b_igst.toLocaleString('en-IN')}</span>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
                <div className="flex justify-between font-bold text-slate-800">
                  <span>Table 7: B2C Small (Consumers)</span>
                  <span>{report.gstr1.b2c_invoices_count} Invoices</span>
                </div>
                <div className="mt-2 space-y-1 text-[11px] text-slate-600">
                  <div className="flex justify-between">
                    <span>Taxable:</span>
                    <span className="font-bold">₹{report.gstr1.b2c_taxable_value.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>CGST + SGST:</span>
                    <span>₹{(report.gstr1.b2c_cgst + report.gstr1.b2c_sgst).toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>IGST:</span>
                    <span>₹{report.gstr1.b2c_igst.toLocaleString('en-IN')}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Table 12: HSN Summary */}
          {report.gstr1.hsn_summary.length > 0 && (
            <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-xs space-y-3">
              <h3 className="text-xs font-bold uppercase text-slate-500 tracking-wider">
                Table 12: HSN-wise Summary of Outward Supplies
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase text-[10px]">
                      <th className="pb-2">HSN/SAC</th>
                      <th className="pb-2">Description</th>
                      <th className="pb-2 text-center">Qty</th>
                      <th className="pb-2 text-right">Taxable (₹)</th>
                      <th className="pb-2 text-right">Rate %</th>
                      <th className="pb-2 text-right">CGST</th>
                      <th className="pb-2 text-right">SGST</th>
                      <th className="pb-2 text-right">IGST</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                    {report.gstr1.hsn_summary.map((hsn, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="py-2 font-mono font-bold text-slate-900">{hsn.hsn}</td>
                        <td className="py-2">{hsn.description}</td>
                        <td className="py-2 text-center">{hsn.qty}</td>
                        <td className="py-2 text-right font-bold">₹{hsn.taxable_value.toLocaleString('en-IN')}</td>
                        <td className="py-2 text-right">{hsn.rate}%</td>
                        <td className="py-2 text-right">₹{hsn.cgst.toLocaleString('en-IN')}</td>
                        <td className="py-2 text-right">₹{hsn.sgst.toLocaleString('en-IN')}</td>
                        <td className="py-2 text-right font-bold text-amber-700">₹{hsn.igst.toLocaleString('en-IN')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Detailed Invoice Listing */}
          <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-xs space-y-3">
            <h3 className="text-xs font-bold uppercase text-slate-500 tracking-wider">
              Outward Invoices Register (With Place of Supply)
            </h3>
            <div className="divide-y divide-slate-100">
              {report.gstr1.invoices.map((inv) => (
                <div
                  key={inv.id}
                  onClick={() => onViewInvoice && onViewInvoice(inv)}
                  className="py-3 flex justify-between items-center hover:bg-slate-50 px-2 rounded-xl cursor-pointer transition-colors"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-xs">{inv.invoice_number}</span>
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase ${
                        inv.is_interstate ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                      }`}>
                        {inv.is_interstate ? 'Inter-State' : 'Intra-State'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 mt-0.5">{inv.customer_name}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      POS: {inv.place_of_supply || report.client.state} • {new Date(inv.date).toLocaleDateString()}
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="font-bold text-sm text-slate-900">₹{inv.total_amount.toLocaleString('en-IN')}</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      GST: ₹{((inv.cgst_total || 0) + (inv.sgst_total || 0) + (inv.igst_total || 0)).toLocaleString('en-IN')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* --- TAB 2: GSTR-2B (Inward Supplies / Input Tax Credit) --- */}
      {activeTab === 'GSTR2B' && (
        <div className="space-y-4">
          <div className="bg-gradient-to-r from-emerald-900 to-emerald-700 text-white p-5 rounded-3xl shadow-sm">
            <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-200">Total Input Tax Credit (ITC) Available</p>
            <h3 className="text-3xl font-black mt-1">₹{report.gstr2b.total_itc_available.toLocaleString('en-IN')}</h3>
            <p className="text-xs text-emerald-100 mt-2">
              Available to offset output GST liability on sales.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs">
              <p className="text-[10px] font-bold uppercase text-slate-400">CGST Input</p>
              <p className="text-lg font-black text-emerald-700 mt-1">₹{report.gstr2b.eligible_itc_cgst.toLocaleString('en-IN')}</p>
              <p className="text-[10px] text-slate-500 mt-0.5">Central Tax Credit</p>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs">
              <p className="text-[10px] font-bold uppercase text-slate-400">SGST Input</p>
              <p className="text-lg font-black text-emerald-700 mt-1">₹{report.gstr2b.eligible_itc_sgst.toLocaleString('en-IN')}</p>
              <p className="text-[10px] text-slate-500 mt-0.5">State Tax Credit</p>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs">
              <p className="text-[10px] font-bold uppercase text-slate-400">IGST Input</p>
              <p className="text-lg font-black text-amber-700 mt-1">₹{report.gstr2b.eligible_itc_igst.toLocaleString('en-IN')}</p>
              <p className="text-[10px] text-slate-500 mt-0.5">Integrated Tax Credit</p>
            </div>
          </div>

          <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-xs space-y-3">
            <h3 className="text-xs font-bold uppercase text-slate-500 tracking-wider">
              Inward Purchases Register (Eligible for ITC)
            </h3>
            <div className="divide-y divide-slate-100">
              {report.gstr2b.purchases.map(p => (
                <div key={p.id} className="py-3 flex justify-between items-center">
                  <div>
                    <p className="font-bold text-xs text-slate-900">{p.description}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      Supplier: {p.credit_account_name} • Date: {new Date(p.date).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-sm text-slate-900">₹{p.amount.toLocaleString('en-IN')}</p>
                    <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700">
                      Eligible ITC
                    </span>
                  </div>
                </div>
              ))}
              {report.gstr2b.purchases.length === 0 && (
                <p className="text-center py-6 text-slate-400 text-xs italic">No purchase vouchers recorded yet.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* --- TAB 3: GSTR-3B Computation Sheet (Net Tax Payable) --- */}
      {activeTab === 'GSTR3B' && (
        <div className="space-y-4">
          <div className="bg-slate-900 text-white p-5 rounded-3xl shadow-sm space-y-3">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Net GST Payable in Cash (Table 6.1)</p>
                <h3 className="text-3xl font-black text-emerald-400 mt-1">
                  ₹{report.gstr3b.total_net_payable.toLocaleString('en-IN')}
                </h3>
              </div>
              <div className="text-right">
                <span className={`text-xs font-bold px-3 py-1 rounded-full uppercase ${
                  report.gstr3b.total_net_payable === 0 ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                }`}>
                  {report.gstr3b.total_net_payable === 0 ? 'Fully Offset by ITC' : 'Payment Due to Govt'}
                </span>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-800 grid grid-cols-3 gap-2 text-center text-xs">
              <div>
                <span className="text-slate-400 text-[10px] block">IGST Cash</span>
                <span className="font-bold text-amber-300">₹{report.gstr3b.net_payable_igst.toLocaleString('en-IN')}</span>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] block">CGST Cash</span>
                <span className="font-bold text-emerald-300">₹{report.gstr3b.net_payable_cgst.toLocaleString('en-IN')}</span>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] block">SGST Cash</span>
                <span className="font-bold text-emerald-300">₹{report.gstr3b.net_payable_sgst.toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>

          {/* Detailed Tax Computation Matrix */}
          <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-xs space-y-4">
            <h3 className="text-xs font-bold uppercase text-slate-500 tracking-wider">
              Summary Computation Matrix (Tax Liability vs Input Tax Credit)
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase text-[10px]">
                    <th className="pb-2">Tax Component</th>
                    <th className="pb-2 text-right">Tax Liability (Sales)</th>
                    <th className="pb-2 text-right">Paid via ITC (Purchases)</th>
                    <th className="pb-2 text-right">Balance Tax Payable</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  <tr>
                    <td className="py-3 font-bold text-slate-900">Integrated Tax (IGST)</td>
                    <td className="py-3 text-right">₹{report.gstr3b.outward_igst.toLocaleString('en-IN')}</td>
                    <td className="py-3 text-right text-emerald-600">- ₹{Math.min(report.gstr3b.outward_igst, report.gstr3b.itc_igst).toLocaleString('en-IN')}</td>
                    <td className="py-3 text-right font-bold text-slate-900">₹{report.gstr3b.net_payable_igst.toLocaleString('en-IN')}</td>
                  </tr>
                  <tr>
                    <td className="py-3 font-bold text-slate-900">Central Tax (CGST)</td>
                    <td className="py-3 text-right">₹{report.gstr3b.outward_cgst.toLocaleString('en-IN')}</td>
                    <td className="py-3 text-right text-emerald-600">- ₹{Math.min(report.gstr3b.outward_cgst, report.gstr3b.itc_cgst).toLocaleString('en-IN')}</td>
                    <td className="py-3 text-right font-bold text-slate-900">₹{report.gstr3b.net_payable_cgst.toLocaleString('en-IN')}</td>
                  </tr>
                  <tr>
                    <td className="py-3 font-bold text-slate-900">State Tax (SGST)</td>
                    <td className="py-3 text-right">₹{report.gstr3b.outward_sgst.toLocaleString('en-IN')}</td>
                    <td className="py-3 text-right text-emerald-600">- ₹{Math.min(report.gstr3b.outward_sgst, report.gstr3b.itc_sgst).toLocaleString('en-IN')}</td>
                    <td className="py-3 text-right font-bold text-slate-900">₹{report.gstr3b.net_payable_sgst.toLocaleString('en-IN')}</td>
                  </tr>
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-slate-900 font-bold bg-slate-50 text-xs">
                    <td className="p-3 uppercase">Total Tax Amount</td>
                    <td className="p-3 text-right">₹{report.gstr3b.total_outward_tax.toLocaleString('en-IN')}</td>
                    <td className="p-3 text-right text-emerald-700">- ₹{Math.min(report.gstr3b.total_outward_tax, report.gstr3b.total_itc).toLocaleString('en-IN')}</td>
                    <td className="p-3 text-right text-indigo-900 font-black">₹{report.gstr3b.total_net_payable.toLocaleString('en-IN')}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
