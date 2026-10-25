import React, { useState, useEffect, useMemo } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Calendar, 
  Download, 
  Printer, 
  ArrowUpRight, 
  ArrowDownLeft, 
  FileText, 
  Eye, 
  ChevronRight, 
  Layers, 
  BarChart3, 
  Table as TableIcon, 
  LayoutGrid, 
  RefreshCw, 
  X, 
  Building,
  CheckCircle2,
  DollarSign,
  Receipt,
  Search,
  Filter
} from 'lucide-react';
import { Client, MonthwiseRecord, MonthwiseReportData, MonthwiseTransactionItem } from '../types';

interface MonthwiseReportProps {
  client: Client;
  isAdmin?: boolean;
  onOpenVoucherModal?: (type: 'SALE' | 'PURCHASE') => void;
  onViewInvoice?: (invoiceId: number) => void;
  isModal?: boolean;
  onClose?: () => void;
}

export const MonthwiseReport: React.FC<MonthwiseReportProps> = ({
  client,
  isAdmin = false,
  onOpenVoucherModal,
  onViewInvoice,
  isModal = false,
  onClose
}) => {
  const [data, setData] = useState<MonthwiseReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Filters & Views
  const [selectedFY, setSelectedFY] = useState<string>('ALL');
  const [viewMode, setViewMode] = useState<'both' | 'chart' | 'table' | 'cards'>('both');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc'); // Recent first by default
  const [searchQuery, setSearchQuery] = useState('');
  
  // Drill-down Modal State
  const [selectedMonthForDrilldown, setSelectedMonthForDrilldown] = useState<MonthwiseRecord | null>(null);
  const [drilldownFilter, setDrilldownFilter] = useState<'ALL' | 'SALE' | 'PURCHASE'>('ALL');

  const fetchMonthwiseData = async () => {
    if (!client?.id) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/reports/monthwise?client_id=${client.id}`);
      if (!res.ok) {
        throw new Error('Failed to load month-wise sales and purchase data');
      }
      const json: MonthwiseReportData = await res.json();
      setData(json);
      if (json.financial_years && json.financial_years.length > 0 && selectedFY === 'ALL') {
        // Automatically default to current or most recent FY
        setSelectedFY(json.financial_years[json.financial_years.length - 1]);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error loading month-wise report');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMonthwiseData();
  }, [client?.id]);

  // Filtered & Sorted Months
  const filteredMonths = useMemo(() => {
    if (!data?.months) return [];
    
    return data.months
      .filter(m => {
        const matchesFY = selectedFY === 'ALL' || m.fy === selectedFY;
        const matchesSearch = !searchQuery || 
          m.full_month_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          m.quarter.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesFY && matchesSearch;
      })
      .sort((a, b) => {
        if (sortOrder === 'desc') {
          return b.month_key.localeCompare(a.month_key);
        }
        return a.month_key.localeCompare(b.month_key);
      });
  }, [data?.months, selectedFY, searchQuery, sortOrder]);

  // Summary computed for the selected filter
  const currentSummary = useMemo(() => {
    return filteredMonths.reduce((acc, m) => {
      acc.sales_amount += m.sales_amount;
      acc.sales_taxable += m.sales_taxable;
      acc.sales_count += m.sales_count;
      acc.sales_tax += m.sales_tax_total;
      
      acc.purchase_amount += m.purchase_amount;
      acc.purchase_taxable += m.purchase_taxable;
      acc.purchase_count += m.purchase_count;
      acc.purchase_tax += m.purchase_tax_total;
      
      acc.net_margin += m.net_margin;
      acc.net_taxable_margin += m.net_taxable_margin;
      acc.net_gst_payable += m.net_gst_payable;
      return acc;
    }, {
      sales_amount: 0,
      sales_taxable: 0,
      sales_count: 0,
      sales_tax: 0,
      purchase_amount: 0,
      purchase_taxable: 0,
      purchase_count: 0,
      purchase_tax: 0,
      net_margin: 0,
      net_taxable_margin: 0,
      net_gst_payable: 0
    });
  }, [filteredMonths]);

  // Max value in filtered list for relative bar scaling
  const maxMonthlyValue = useMemo(() => {
    let max = 1000;
    filteredMonths.forEach(m => {
      if (m.sales_amount > max) max = m.sales_amount;
      if (m.purchase_amount > max) max = m.purchase_amount;
    });
    return max;
  }, [filteredMonths]);

  // Export to CSV
  const handleExportCSV = () => {
    if (!filteredMonths.length) return;
    
    const headers = [
      'Month', 'Financial Year', 'Quarter',
      'Sales Turnover (INR)', 'Sales Taxable (INR)', 'Sales GST Output (INR)', 'Sales Count',
      'Purchase Turnover (INR)', 'Purchase Taxable (INR)', 'Purchase ITC Input (INR)', 'Purchase Count',
      'Gross Margin (INR)', 'Net GST Payable (INR)'
    ];

    const rows = filteredMonths.map(m => [
      `"${m.full_month_name}"`,
      `"${m.fy}"`,
      `"${m.quarter}"`,
      m.sales_amount.toFixed(2),
      m.sales_taxable.toFixed(2),
      m.sales_tax_total.toFixed(2),
      m.sales_count,
      m.purchase_amount.toFixed(2),
      m.purchase_taxable.toFixed(2),
      m.purchase_tax_total.toFixed(2),
      m.purchase_count,
      m.net_margin.toFixed(2),
      m.net_gst_payable.toFixed(2)
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Monthwise_Sales_Purchase_${client.business_name.replace(/\s+/g, '_')}_${selectedFY}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Print Summary
  const handlePrint = () => {
    window.print();
  };

  const containerClasses = isModal 
    ? "fixed inset-0 z-[120] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto"
    : "space-y-4";

  const cardClasses = isModal
    ? "bg-white rounded-3xl w-full max-w-5xl shadow-2xl border border-slate-100 overflow-hidden my-auto max-h-[92vh] flex flex-col"
    : "bg-white rounded-3xl border border-slate-100 shadow-xs p-4 sm:p-6 space-y-5";

  return (
    <div className={containerClasses}>
      <div className={cardClasses}>

        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-indigo-50 text-indigo-700 rounded-lg text-xs font-black flex items-center gap-1">
                <BarChart3 size={14} />
                <span>Month-Wise Register</span>
              </span>
              <span className="text-xs text-slate-400 font-bold">•</span>
              <span className="text-xs text-slate-600 font-bold truncate max-w-xs">{client.business_name}</span>
              {client.gstin && (
                <span className="text-[10px] bg-slate-100 font-mono text-slate-600 px-2 py-0.5 rounded-md hidden md:inline">
                  {client.gstin}
                </span>
              )}
            </div>
            <h3 className="text-xl font-black text-slate-900 tracking-tight mt-1">
              Month-wise Sale & Purchase Analysis
            </h3>
            <p className="text-xs text-slate-500">
              Audit month-by-month turnover, compare inward purchases with outward sales, and track GST liability
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={fetchMonthwiseData}
              className="p-2 bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 rounded-xl transition-colors"
              title="Refresh Month-wise Data"
            >
              <RefreshCw size={15} />
            </button>
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all shadow-xs"
              title="Export Month-wise Table to CSV"
            >
              <Download size={14} />
              <span className="hidden sm:inline">Export CSV</span>
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all shadow-xs"
              title="Print Monthly Summary"
            >
              <Printer size={14} />
              <span className="hidden sm:inline">Print</span>
            </button>
            {isModal && onClose && (
              <button
                onClick={onClose}
                className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition-colors ml-1"
              >
                <X size={18} />
              </button>
            )}
          </div>
        </div>

        {/* Filter Controls Row */}
        <div className="flex flex-col md:flex-row gap-2.5 justify-between items-stretch md:items-center bg-slate-50/80 p-3 rounded-2xl border border-slate-200/70">
          <div className="flex flex-wrap items-center gap-2">
            {/* Financial Year Selector */}
            <div className="flex items-center gap-1.5 bg-white px-2.5 py-1.5 rounded-xl border border-slate-200 shadow-xs">
              <Calendar size={14} className="text-indigo-600 shrink-0" />
              <span className="text-[11px] font-bold text-slate-500">FY:</span>
              <select
                value={selectedFY}
                onChange={e => setSelectedFY(e.target.value)}
                className="bg-transparent text-xs font-black text-slate-800 focus:outline-hidden cursor-pointer"
              >
                <option value="ALL">All Financial Years</option>
                {data?.financial_years?.map(fy => (
                  <option key={fy} value={fy}>{fy}</option>
                ))}
              </select>
            </div>

            {/* Sort Order Toggle */}
            <button
              onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
              className="px-2.5 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 flex items-center gap-1 shadow-xs transition-colors"
            >
              <span>Sequence:</span>
              <span className="text-indigo-600 font-extrabold">{sortOrder === 'desc' ? 'Recent First' : 'Apr → Mar'}</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            {/* Search within months */}
            <div className="relative flex-1 md:w-48">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search month..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-7 pr-6 py-1.5 bg-white border border-slate-200 rounded-xl text-xs placeholder:text-slate-400 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400">
                  <X size={12} />
                </button>
              )}
            </div>

            {/* View Mode Toggle Buttons */}
            <div className="flex items-center bg-white border border-slate-200 rounded-xl p-0.5 shadow-xs">
              <button
                onClick={() => setViewMode('both')}
                className={`p-1.5 rounded-lg text-xs font-bold transition-all ${
                  viewMode === 'both' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-500 hover:text-slate-800'
                }`}
                title="Chart & Table View"
              >
                <Layers size={14} />
              </button>
              <button
                onClick={() => setViewMode('chart')}
                className={`p-1.5 rounded-lg text-xs font-bold transition-all ${
                  viewMode === 'chart' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-500 hover:text-slate-800'
                }`}
                title="Bar Chart Only"
              >
                <BarChart3 size={14} />
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-lg text-xs font-bold transition-all ${
                  viewMode === 'table' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-500 hover:text-slate-800'
                }`}
                title="Table View Only"
              >
                <TableIcon size={14} />
              </button>
              <button
                onClick={() => setViewMode('cards')}
                className={`p-1.5 rounded-lg text-xs font-bold transition-all ${
                  viewMode === 'cards' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-500 hover:text-slate-800'
                }`}
                title="Monthly Cards Grid"
              >
                <LayoutGrid size={14} />
              </button>
            </div>
          </div>
        </div>

        {/* Loading / Error States */}
        {loading && (
          <div className="py-12 flex flex-col items-center justify-center text-slate-400 space-y-2">
            <RefreshCw size={24} className="animate-spin text-indigo-600" />
            <p className="text-xs font-semibold">Aggregating month-wise sales and purchase data...</p>
          </div>
        )}

        {error && !loading && (
          <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl text-xs font-bold">
            {error}
          </div>
        )}

        {!loading && !error && filteredMonths.length === 0 && (
          <div className="py-12 text-center text-slate-400 space-y-2">
            <Calendar size={32} className="mx-auto text-slate-300" />
            <p className="text-xs font-semibold">No sales or purchases recorded for the selected period.</p>
            {onOpenVoucherModal && (
              <div className="pt-2 flex justify-center gap-2">
                <button
                  onClick={() => onOpenVoucherModal('SALE')}
                  className="px-3 py-1.5 bg-emerald-600 text-white rounded-xl text-xs font-bold"
                >
                  + Record Sale
                </button>
                <button
                  onClick={() => onOpenVoucherModal('PURCHASE')}
                  className="px-3 py-1.5 bg-indigo-600 text-white rounded-xl text-xs font-bold"
                >
                  + Record Purchase
                </button>
              </div>
            )}
          </div>
        )}

        {!loading && !error && filteredMonths.length > 0 && (
          <div className="space-y-5">

            {/* KPI Metric Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {/* Sales Card */}
              <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/40 p-4 rounded-2xl border border-emerald-200/70 shadow-xs">
                <div className="flex items-center justify-between text-emerald-700">
                  <span className="text-[10px] font-bold uppercase tracking-wider">Total Sales Turnover</span>
                  <ArrowUpRight size={16} />
                </div>
                <p className="text-2xl font-black text-emerald-900 mt-1">
                  ₹{Math.round(currentSummary.sales_amount).toLocaleString('en-IN')}
                </p>
                <div className="flex items-center justify-between text-[11px] text-emerald-700 font-semibold mt-1 pt-1 border-t border-emerald-200/50">
                  <span>{currentSummary.sales_count} Sales Vouchers</span>
                  <span>GST: ₹{Math.round(currentSummary.sales_tax).toLocaleString('en-IN')}</span>
                </div>
              </div>

              {/* Purchase Card */}
              <div className="bg-gradient-to-br from-indigo-50 to-indigo-100/40 p-4 rounded-2xl border border-indigo-200/70 shadow-xs">
                <div className="flex items-center justify-between text-indigo-700">
                  <span className="text-[10px] font-bold uppercase tracking-wider">Total Purchases</span>
                  <ArrowDownLeft size={16} />
                </div>
                <p className="text-2xl font-black text-indigo-950 mt-1">
                  ₹{Math.round(currentSummary.purchase_amount).toLocaleString('en-IN')}
                </p>
                <div className="flex items-center justify-between text-[11px] text-indigo-700 font-semibold mt-1 pt-1 border-t border-indigo-200/50">
                  <span>{currentSummary.purchase_count} Bills Recorded</span>
                  <span>ITC: ₹{Math.round(currentSummary.purchase_tax).toLocaleString('en-IN')}</span>
                </div>
              </div>

              {/* Net Margin Card */}
              <div className={`p-4 rounded-2xl border shadow-xs ${
                currentSummary.net_margin >= 0 
                  ? 'bg-gradient-to-br from-teal-50 to-teal-100/40 border-teal-200/70' 
                  : 'bg-gradient-to-br from-rose-50 to-rose-100/40 border-rose-200/70'
              }`}>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Gross Margin (Sales - Pur)</span>
                  {currentSummary.net_margin >= 0 ? (
                    <TrendingUp size={16} className="text-teal-600" />
                  ) : (
                    <TrendingDown size={16} className="text-rose-600" />
                  )}
                </div>
                <p className={`text-2xl font-black mt-1 ${
                  currentSummary.net_margin >= 0 ? 'text-teal-900' : 'text-rose-900'
                }`}>
                  {currentSummary.net_margin >= 0 ? '+' : '-'}₹{Math.abs(Math.round(currentSummary.net_margin)).toLocaleString('en-IN')}
                </p>
                <div className="flex items-center justify-between text-[11px] font-semibold mt-1 pt-1 border-t border-slate-200/60">
                  <span className="text-slate-500">
                    {currentSummary.sales_amount > 0 
                      ? `${Math.round((currentSummary.net_margin / currentSummary.sales_amount) * 100)}% Margin`
                      : '0% Margin'}
                  </span>
                  <span className={currentSummary.net_margin >= 0 ? 'text-teal-700 font-bold' : 'text-rose-700 font-bold'}>
                    {currentSummary.net_margin >= 0 ? 'Surplus' : 'Deficit'}
                  </span>
                </div>
              </div>

              {/* Net GST Position Card */}
              <div className="bg-gradient-to-br from-slate-50 to-slate-100/60 p-4 rounded-2xl border border-slate-200 shadow-xs">
                <div className="flex items-center justify-between text-slate-700">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Net GST (Output - ITC)</span>
                  <Receipt size={16} className="text-indigo-600" />
                </div>
                <p className={`text-2xl font-black mt-1 ${
                  currentSummary.net_gst_payable > 0 ? 'text-rose-700' : 'text-emerald-700'
                }`}>
                  ₹{Math.abs(Math.round(currentSummary.net_gst_payable)).toLocaleString('en-IN')}
                </p>
                <div className="flex items-center justify-between text-[11px] font-semibold mt-1 pt-1 border-t border-slate-200 text-slate-500">
                  <span>Status:</span>
                  <span className={`font-bold ${currentSummary.net_gst_payable > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                    {currentSummary.net_gst_payable > 0 ? 'Tax Payable' : 'ITC Credit Carry Fwd'}
                  </span>
                </div>
              </div>
            </div>

            {/* Visual Comparative Chart Section */}
            {(viewMode === 'both' || viewMode === 'chart') && (
              <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h4 className="text-sm font-black text-slate-900 flex items-center gap-1.5">
                      <BarChart3 size={16} className="text-indigo-600" />
                      <span>Comparative Sales vs Purchases Trend</span>
                    </h4>
                    <p className="text-[11px] text-slate-400">
                      Side-by-side comparison of monthly sales turnover (emerald) against inward purchases (indigo)
                    </p>
                  </div>
                  
                  {/* Legend */}
                  <div className="flex items-center gap-4 text-xs font-bold">
                    <div className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded-md bg-emerald-500 inline-block shadow-xs" />
                      <span className="text-slate-700">Sales</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded-md bg-indigo-500 inline-block shadow-xs" />
                      <span className="text-slate-700">Purchases</span>
                    </div>
                  </div>
                </div>

                {/* Bars Graphic */}
                <div className="pt-2 overflow-x-auto">
                  <div className="min-w-[500px] flex items-end gap-3 sm:gap-4 h-48 border-b border-slate-200 pb-2 px-1">
                    {filteredMonths.map((m) => {
                      const salesHeight = Math.max(8, Math.round((m.sales_amount / maxMonthlyValue) * 160));
                      const purHeight = Math.max(8, Math.round((m.purchase_amount / maxMonthlyValue) * 160));

                      return (
                        <div
                          key={m.month_key}
                          onClick={() => setSelectedMonthForDrilldown(m)}
                          className="flex-1 flex flex-col items-center justify-end h-full group cursor-pointer"
                        >
                          {/* Tooltip on hover */}
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 text-white text-[10px] rounded-lg py-1 px-2 mb-1.5 pointer-events-none whitespace-nowrap z-20 shadow-lg text-center">
                            <p className="font-bold">{m.month_name}</p>
                            <p className="text-emerald-300">Sales: ₹{m.sales_amount.toLocaleString('en-IN')}</p>
                            <p className="text-indigo-300">Pur: ₹{m.purchase_amount.toLocaleString('en-IN')}</p>
                            <p className="text-slate-300">Margin: ₹{m.net_margin.toLocaleString('en-IN')}</p>
                          </div>

                          {/* Dual Bars */}
                          <div className="w-full flex items-end justify-center gap-1 sm:gap-1.5">
                            {/* Sales Bar */}
                            <div
                              style={{ height: `${salesHeight}px` }}
                              className="w-1/2 max-w-[24px] bg-gradient-to-t from-emerald-600 to-emerald-400 rounded-t-md group-hover:brightness-110 transition-all shadow-xs relative"
                              title={`Sales: ₹${m.sales_amount.toLocaleString('en-IN')}`}
                            />
                            {/* Purchase Bar */}
                            <div
                              style={{ height: `${purHeight}px` }}
                              className="w-1/2 max-w-[24px] bg-gradient-to-t from-indigo-600 to-indigo-400 rounded-t-md group-hover:brightness-110 transition-all shadow-xs relative"
                              title={`Purchases: ₹${m.purchase_amount.toLocaleString('en-IN')}`}
                            />
                          </div>

                          {/* Month Label */}
                          <div className="mt-2 text-center">
                            <span className="text-[10px] font-bold text-slate-700 block truncate max-w-[60px] group-hover:text-indigo-600">
                              {m.month_name.split(' ')[0]}
                            </span>
                            <span className="text-[9px] text-slate-400 block font-mono">
                              {m.month_name.split(' ')[1]?.slice(2)}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Tabular View */}
            {(viewMode === 'both' || viewMode === 'table') && (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <TableIcon size={16} className="text-indigo-600" />
                    <span className="text-xs font-black text-slate-800 uppercase tracking-wider">
                      Month-wise Breakdown Register
                    </span>
                  </div>
                  <span className="text-[11px] font-bold text-slate-500">
                    {filteredMonths.length} Months • Click any row for transaction drill-down
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-600 text-[10px] uppercase font-black">
                        <th className="py-2.5 px-3">Month / Period</th>
                        <th className="py-2.5 px-3 text-right text-emerald-800">Sales Turnover (₹)</th>
                        <th className="py-2.5 px-3 text-right text-emerald-800 hidden md:table-cell">Sales Count</th>
                        <th className="py-2.5 px-3 text-right text-indigo-800">Purchases (₹)</th>
                        <th className="py-2.5 px-3 text-right text-indigo-800 hidden md:table-cell">Purchase Count</th>
                        <th className="py-2.5 px-3 text-right">Gross Margin (₹)</th>
                        <th className="py-2.5 px-3 text-right hidden lg:table-cell">GST Output</th>
                        <th className="py-2.5 px-3 text-right hidden lg:table-cell">ITC Input</th>
                        <th className="py-2.5 px-3 text-right">Net GST Position</th>
                        <th className="py-2.5 px-3 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                      {filteredMonths.map((m) => (
                        <tr
                          key={m.month_key}
                          onClick={() => setSelectedMonthForDrilldown(m)}
                          className="hover:bg-indigo-50/50 cursor-pointer transition-colors"
                        >
                          <td className="py-3 px-3">
                            <div className="flex items-center gap-2">
                              <div>
                                <span className="font-black text-slate-900 block text-xs">{m.full_month_name}</span>
                                <span className="text-[10px] text-slate-400 font-semibold">{m.fy} • {m.quarter}</span>
                              </div>
                            </div>
                          </td>

                          {/* Sales */}
                          <td className="py-3 px-3 text-right">
                            <span className="font-black text-emerald-700 text-xs block">
                              ₹{Math.round(m.sales_amount).toLocaleString('en-IN')}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              Taxable: ₹{Math.round(m.sales_taxable).toLocaleString('en-IN')}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-right hidden md:table-cell font-mono text-slate-600">
                            {m.sales_count} Inv
                          </td>

                          {/* Purchases */}
                          <td className="py-3 px-3 text-right">
                            <span className="font-black text-indigo-900 text-xs block">
                              ₹{Math.round(m.purchase_amount).toLocaleString('en-IN')}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              Taxable: ₹{Math.round(m.purchase_taxable).toLocaleString('en-IN')}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-right hidden md:table-cell font-mono text-slate-600">
                            {m.purchase_count} Bills
                          </td>

                          {/* Gross Margin */}
                          <td className="py-3 px-3 text-right">
                            <span className={`font-black text-xs block ${
                              m.net_margin >= 0 ? 'text-teal-700' : 'text-rose-600'
                            }`}>
                              {m.net_margin >= 0 ? '+' : '-'}₹{Math.abs(Math.round(m.net_margin)).toLocaleString('en-IN')}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {m.sales_amount > 0 ? `${Math.round((m.net_margin / m.sales_amount) * 100)}%` : '0%'}
                            </span>
                          </td>

                          {/* GST Output */}
                          <td className="py-3 px-3 text-right hidden lg:table-cell text-slate-600">
                            ₹{Math.round(m.sales_tax_total).toLocaleString('en-IN')}
                          </td>

                          {/* ITC Input */}
                          <td className="py-3 px-3 text-right hidden lg:table-cell text-slate-600">
                            ₹{Math.round(m.purchase_tax_total).toLocaleString('en-IN')}
                          </td>

                          {/* Net GST */}
                          <td className="py-3 px-3 text-right">
                            <span className={`font-bold text-xs ${
                              m.net_gst_payable > 0 ? 'text-rose-600' : 'text-emerald-700'
                            }`}>
                              ₹{Math.abs(Math.round(m.net_gst_payable)).toLocaleString('en-IN')}
                            </span>
                            <span className="block text-[9px] uppercase font-bold text-slate-400">
                              {m.net_gst_payable > 0 ? 'Payable' : 'ITC Credit'}
                            </span>
                          </td>

                          {/* Drilldown button */}
                          <td className="py-3 px-3 text-center" onClick={(e) => { e.stopPropagation(); setSelectedMonthForDrilldown(m); }}>
                            <button
                              className="px-2.5 py-1 bg-slate-100 hover:bg-indigo-600 hover:text-white text-slate-700 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1 mx-auto"
                            >
                              <Eye size={12} />
                              <span>View</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>

                    {/* Grand Totals Footer */}
                    <tfoot className="bg-slate-100/90 border-t-2 border-slate-300 font-black text-xs">
                      <tr>
                        <td className="py-3 px-3 text-slate-900 uppercase">Grand Total</td>
                        <td className="py-3 px-3 text-right text-emerald-800">
                          ₹{Math.round(currentSummary.sales_amount).toLocaleString('en-IN')}
                        </td>
                        <td className="py-3 px-3 text-right text-slate-700 hidden md:table-cell">
                          {currentSummary.sales_count} Inv
                        </td>
                        <td className="py-3 px-3 text-right text-indigo-950">
                          ₹{Math.round(currentSummary.purchase_amount).toLocaleString('en-IN')}
                        </td>
                        <td className="py-3 px-3 text-right text-slate-700 hidden md:table-cell">
                          {currentSummary.purchase_count} Bills
                        </td>
                        <td className="py-3 px-3 text-right">
                          <span className={currentSummary.net_margin >= 0 ? 'text-teal-800' : 'text-rose-700'}>
                            {currentSummary.net_margin >= 0 ? '+' : '-'}₹{Math.abs(Math.round(currentSummary.net_margin)).toLocaleString('en-IN')}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right hidden lg:table-cell text-slate-700">
                          ₹{Math.round(currentSummary.sales_tax).toLocaleString('en-IN')}
                        </td>
                        <td className="py-3 px-3 text-right hidden lg:table-cell text-slate-700">
                          ₹{Math.round(currentSummary.purchase_tax).toLocaleString('en-IN')}
                        </td>
                        <td className="py-3 px-3 text-right">
                          <span className={currentSummary.net_gst_payable > 0 ? 'text-rose-700' : 'text-emerald-800'}>
                            ₹{Math.abs(Math.round(currentSummary.net_gst_payable)).toLocaleString('en-IN')}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center text-slate-400">
                          —
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}

            {/* Monthly Cards Grid View */}
            {viewMode === 'cards' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {filteredMonths.map((m) => (
                  <div
                    key={m.month_key}
                    onClick={() => setSelectedMonthForDrilldown(m)}
                    className="bg-white p-4 rounded-2xl border border-slate-200 hover:border-indigo-300 shadow-xs cursor-pointer transition-all space-y-3"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="text-sm font-black text-slate-900">{m.full_month_name}</h4>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{m.fy} • {m.quarter}</span>
                      </div>
                      <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-[10px] font-bold border border-indigo-100">
                        {m.sales_count + m.purchase_count} Entries
                      </span>
                    </div>

                    <div className="space-y-2 pt-1">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-500 flex items-center gap-1 font-semibold">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                          Sales ({m.sales_count})
                        </span>
                        <span className="font-black text-emerald-700">₹{m.sales_amount.toLocaleString('en-IN')}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-500 flex items-center gap-1 font-semibold">
                          <span className="w-2 h-2 rounded-full bg-indigo-500 inline-block" />
                          Purchases ({m.purchase_count})
                        </span>
                        <span className="font-black text-indigo-950">₹{m.purchase_amount.toLocaleString('en-IN')}</span>
                      </div>
                    </div>

                    {/* Progress Bar Proportion */}
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden flex">
                      <div
                        style={{ width: `${(m.sales_amount + m.purchase_amount) > 0 ? (m.sales_amount / (m.sales_amount + m.purchase_amount)) * 100 : 50}%` }}
                        className="bg-emerald-500 h-full"
                      />
                      <div
                        style={{ width: `${(m.sales_amount + m.purchase_amount) > 0 ? (m.purchase_amount / (m.sales_amount + m.purchase_amount)) * 100 : 50}%` }}
                        className="bg-indigo-500 h-full"
                      />
                    </div>

                    <div className="flex justify-between items-center pt-2 border-t border-slate-100 text-xs">
                      <div>
                        <span className="text-[9px] uppercase font-bold text-slate-400 block">Gross Margin</span>
                        <span className={`font-black ${m.net_margin >= 0 ? 'text-teal-700' : 'text-rose-600'}`}>
                          {m.net_margin >= 0 ? '+' : '-'}₹{Math.abs(m.net_margin).toLocaleString('en-IN')}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-[9px] uppercase font-bold text-slate-400 block">Net GST</span>
                        <span className={`font-black ${m.net_gst_payable > 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
                          ₹{Math.abs(m.net_gst_payable).toLocaleString('en-IN')}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

          </div>
        )}

      </div>

      {/* --- Interactive Monthly Drill-Down Modal --- */}
      {selectedMonthForDrilldown && (
        <div className="fixed inset-0 z-[130] bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
          <div className="bg-white rounded-3xl w-full max-w-3xl shadow-2xl border border-slate-100 overflow-hidden my-auto max-h-[90vh] flex flex-col">
            
            {/* Modal Header */}
            <div className="p-4 sm:p-5 bg-slate-900 text-white flex justify-between items-center">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 bg-indigo-600 text-white rounded-md text-[10px] font-bold uppercase">
                    Monthly Register
                  </span>
                  <span className="text-xs text-slate-400 font-bold">•</span>
                  <span className="text-xs text-slate-300">{client.business_name}</span>
                </div>
                <h3 className="text-lg font-black mt-0.5">
                  {selectedMonthForDrilldown.full_month_name} Vouchers & Invoices
                </h3>
                <p className="text-xs text-slate-400">
                  Detailed transactions recorded during {selectedMonthForDrilldown.full_month_name}
                </p>
              </div>

              <button
                onClick={() => setSelectedMonthForDrilldown(null)}
                className="p-2 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Filter Tabs & Summary Row */}
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-1.5 bg-white p-1 rounded-xl border border-slate-200 shadow-xs">
                <button
                  onClick={() => setDrilldownFilter('ALL')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    drilldownFilter === 'ALL' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  All ({selectedMonthForDrilldown.sales_items.length + selectedMonthForDrilldown.purchase_items.length})
                </button>
                <button
                  onClick={() => setDrilldownFilter('SALE')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    drilldownFilter === 'SALE' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Sales ({selectedMonthForDrilldown.sales_items.length})
                </button>
                <button
                  onClick={() => setDrilldownFilter('PURCHASE')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    drilldownFilter === 'PURCHASE' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Purchases ({selectedMonthForDrilldown.purchase_items.length})
                </button>
              </div>

              <div className="flex items-center gap-3 text-xs">
                <span className="font-bold text-slate-500">Month Sales: <strong className="text-emerald-700">₹{selectedMonthForDrilldown.sales_amount.toLocaleString('en-IN')}</strong></span>
                <span className="font-bold text-slate-500">Purchases: <strong className="text-indigo-950">₹{selectedMonthForDrilldown.purchase_amount.toLocaleString('en-IN')}</strong></span>
              </div>
            </div>

            {/* Transactions List */}
            <div className="p-4 overflow-y-auto max-h-[55vh] space-y-2.5">
              {(() => {
                const itemsToDisplay: MonthwiseTransactionItem[] = [];
                if (drilldownFilter === 'ALL' || drilldownFilter === 'SALE') {
                  itemsToDisplay.push(...selectedMonthForDrilldown.sales_items);
                }
                if (drilldownFilter === 'ALL' || drilldownFilter === 'PURCHASE') {
                  itemsToDisplay.push(...selectedMonthForDrilldown.purchase_items);
                }

                if (itemsToDisplay.length === 0) {
                  return (
                    <div className="py-12 text-center text-slate-400 text-xs italic">
                      No vouchers found for this category in {selectedMonthForDrilldown.full_month_name}.
                    </div>
                  );
                }

                return itemsToDisplay
                  .sort((a, b) => b.date.localeCompare(a.date))
                  .map((item, idx) => (
                    <div
                      key={`${item.type}-${item.id}-${idx}`}
                      className="bg-white p-3.5 rounded-2xl border border-slate-100 hover:border-indigo-200 shadow-xs flex items-center justify-between transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                          item.type === 'SALE' ? 'bg-emerald-50 text-emerald-600' : 'bg-indigo-50 text-indigo-600'
                        }`}>
                          {item.type === 'SALE' ? <ArrowUpRight size={18} /> : <ArrowDownLeft size={18} />}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-black text-slate-900 line-clamp-1">{item.party_name}</span>
                            <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-md uppercase ${
                              item.type === 'SALE' ? 'bg-emerald-100 text-emerald-800' : 'bg-indigo-100 text-indigo-800'
                            }`}>
                              {item.type}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-400 mt-0.5 font-medium">
                            {item.ref_no ? `Ref: ${item.ref_no} • ` : ''}Date: {item.date} • {item.description}
                          </p>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <p className={`font-black text-xs ${
                          item.type === 'SALE' ? 'text-emerald-700' : 'text-slate-900'
                        }`}>
                          ₹{Math.round(item.total_amount).toLocaleString('en-IN')}
                        </p>
                        {item.total_tax > 0 && (
                          <span className="text-[9px] text-slate-400 font-semibold block">
                            Tax: ₹{Math.round(item.total_tax).toLocaleString('en-IN')}
                          </span>
                        )}
                        {item.invoice_id && onViewInvoice && (
                          <button
                            onClick={() => {
                              onViewInvoice(item.invoice_id!);
                              setSelectedMonthForDrilldown(null);
                            }}
                            className="text-[10px] font-bold text-indigo-600 hover:underline mt-0.5 inline-block"
                          >
                            Print Invoice
                          </button>
                        )}
                      </div>
                    </div>
                  ));
              })()}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setSelectedMonthForDrilldown(null)}
                className="px-5 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-colors"
              >
                Close Register
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
