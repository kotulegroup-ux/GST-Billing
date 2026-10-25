import React from 'react';
import { Printer, Download, X, CheckCircle, QrCode } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { Invoice, Client, INDIAN_STATES } from '../types';

interface GSTInvoiceModalProps {
  invoice: Invoice | null;
  client: Client;
  onClose: () => void;
}

// Convert numbers to Indian Rupees words
function numberToIndianWords(num: number): string {
  const a = [
    '', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ',
    'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '
  ];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  const n = Math.floor(num);
  const paise = Math.round((num - n) * 100);

  function inWords(n: number): string {
    if (n === 0) return '';
    let str = '';
    if (Math.floor(n / 10000000) > 0) {
      str += inWords(Math.floor(n / 10000000)) + 'Crore ';
      n %= 10000000;
    }
    if (Math.floor(n / 100000) > 0) {
      str += inWords(Math.floor(n / 100000)) + 'Lakh ';
      n %= 100000;
    }
    if (Math.floor(n / 1000) > 0) {
      str += inWords(Math.floor(n / 1000)) + 'Thousand ';
      n %= 1000;
    }
    if (Math.floor(n / 100) > 0) {
      str += inWords(Math.floor(n / 100)) + 'Hundred ';
      n %= 100;
    }
    if (n > 0) {
      if (n < 20) {
        str += a[n];
      } else {
        str += b[Math.floor(n / 10)] + ' ' + a[n % 10];
      }
    }
    return str;
  }

  const rupeeStr = n === 0 ? 'Zero Rupees' : 'INR ' + inWords(n) + 'Rupees';
  const paiseStr = paise > 0 ? ' and ' + inWords(paise) + 'Paise' : '';
  return (rupeeStr + paiseStr + ' Only').trim();
}

export const GSTInvoiceModal: React.FC<GSTInvoiceModalProps> = ({
  invoice,
  client,
  onClose
}) => {
  if (!invoice) return null;

  const supplierState = client.state || 'Maharashtra';
  const supplierStateCode = client.state_code || '27';
  const placeOfSupply = invoice.place_of_supply || supplierState;
  const placeOfSupplyCode = invoice.place_of_supply_code || supplierStateCode;

  // Determination: Intra-state (same state) vs Inter-state (different state)
  const isInterState = invoice.is_interstate === 1 || (placeOfSupplyCode !== supplierStateCode);

  const taxableTotal = (invoice.items || []).reduce((sum, item) => sum + (item.quantity * item.price), 0);
  const grandTotal = invoice.total_amount;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-[130] bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto print:p-0 print:bg-white">
      <div className="bg-white rounded-2xl w-full max-w-4xl shadow-2xl border border-slate-200 overflow-hidden my-auto print:shadow-none print:border-none print:w-full print:max-w-none">
        
        {/* Modal Action Bar (Hidden in print) */}
        <div className="no-print p-4 bg-slate-900 text-white flex justify-between items-center border-b border-slate-800">
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm">GST Tax Invoice Viewer</span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
              isInterState ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
            }`}>
              {isInterState ? 'Inter-State (IGST)' : 'Intra-State (CGST + SGST)'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm"
            >
              <Printer size={15} />
              Print / Save PDF
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* --- PRINTABLE TAX INVOICE CONTENT --- */}
        <div className="print-content p-6 sm:p-8 bg-white text-slate-900 text-xs font-sans">
          
          {/* Header Title & Tax Invoice Badge */}
          <div className="text-center pb-3 border-b-2 border-slate-900 mb-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Form GST INV-1 (Rule 46)</p>
            <h1 className="text-2xl font-black tracking-wider text-slate-900">TAX INVOICE</h1>
            <p className="text-[11px] font-semibold text-slate-600">(Original for Recipient / Triplicate for Supplier)</p>
          </div>

          {/* Supplier & Invoice Header Grid */}
          <div className="grid grid-cols-2 border border-slate-900 mb-4">
            
            {/* Supplier Details */}
            <div className="p-3 border-r border-slate-900 space-y-1">
              <p className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Details of Supplier (Seller)</p>
              <h2 className="text-base font-bold text-slate-900">{client.business_name}</h2>
              {client.trade_name && <p className="text-xs font-medium text-slate-700">{client.trade_name}</p>}
              <p className="text-slate-600 leading-tight">{client.address || 'Business Address, India'}</p>
              <p className="pt-1">
                <span className="font-bold text-slate-900">GSTIN: </span>
                <span className="font-mono font-bold text-indigo-900">{client.gstin || '27AAAAA0000A1Z5'}</span>
              </p>
              <p>
                <span className="font-bold">State: </span>
                <span>{supplierState} (State Code: <strong className="font-mono">{supplierStateCode}</strong>)</span>
              </p>
              {client.phone && <p><span>Phone: </span>{client.phone}</p>}
            </div>

            {/* Invoice & Dispatch Meta */}
            <div className="p-3 bg-slate-50/50 space-y-1.5">
              <div className="grid grid-cols-2 gap-2 pb-1.5 border-b border-slate-200">
                <div>
                  <p className="text-[10px] uppercase font-bold text-slate-400">Invoice No.</p>
                  <p className="font-mono font-bold text-sm text-slate-900">{invoice.invoice_number}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-slate-400">Invoice Date</p>
                  <p className="font-bold text-slate-900">{new Date(invoice.date).toLocaleDateString('en-IN')}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">Place of Supply (POS)</span>
                  <span className="font-bold text-slate-900">{placeOfSupply} ({placeOfSupplyCode})</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">Reverse Charge</span>
                  <span className="font-bold text-slate-900">{invoice.reverse_charge || 'No'}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">Nature of Supply</span>
                  <span className={`font-bold ${isInterState ? 'text-amber-800' : 'text-emerald-800'}`}>
                    {isInterState ? 'Inter-State (IGST)' : 'Intra-State (CGST + SGST)'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">Vehicle / Trans No.</span>
                  <span className="font-medium text-slate-700">{invoice.vehicle_no || 'N/A'}</span>
                </div>
              </div>
            </div>

          </div>

          {/* Receiver / Billed-to & Consignee Details */}
          <div className="grid grid-cols-2 border border-slate-900 mb-4 bg-slate-50/20">
            <div className="p-3 border-r border-slate-900 space-y-1">
              <p className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Details of Receiver (Billed To)</p>
              <p className="text-sm font-bold text-slate-900">{invoice.customer_name || 'Cash Customer'}</p>
              <p className="text-slate-600 leading-tight">{invoice.buyer_address || 'Customer Delivery Address'}</p>
              <p className="pt-1">
                <span className="font-bold">GSTIN/UIN: </span>
                <span className="font-mono font-bold">{invoice.buyer_gstin || 'Unregistered / Consumer'}</span>
              </p>
              <p>
                <span className="font-bold">State: </span>
                <span>{invoice.buyer_state || placeOfSupply} (Code: <strong className="font-mono">{invoice.buyer_state_code || placeOfSupplyCode}</strong>)</span>
              </p>
            </div>

            <div className="p-3 space-y-1">
              <p className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Details of Consignee (Shipped To)</p>
              <p className="text-sm font-bold text-slate-900">{invoice.customer_name || 'Cash Customer'}</p>
              <p className="text-slate-600 leading-tight">{invoice.buyer_address || 'Same as Billing Address'}</p>
              <p className="pt-1">
                <span className="font-bold">Place of Delivery: </span>
                <span>{placeOfSupply} ({placeOfSupplyCode})</span>
              </p>
            </div>
          </div>

          {/* Line Items Table */}
          <table className="w-full border-collapse border border-slate-900 text-left mb-4">
            <thead>
              <tr className="bg-slate-100 text-[10px] font-bold uppercase text-slate-800 border-b border-slate-900 text-center">
                <th className="p-1.5 border-r border-slate-900 w-8">#</th>
                <th className="p-1.5 border-r border-slate-900 text-left">Description of Goods / Services</th>
                <th className="p-1.5 border-r border-slate-900 w-16">HSN/SAC</th>
                <th className="p-1.5 border-r border-slate-900 w-12">Qty</th>
                <th className="p-1.5 border-r border-slate-900 w-14">Rate (₹)</th>
                <th className="p-1.5 border-r border-slate-900 w-20">Taxable (₹)</th>
                {!isInterState ? (
                  <>
                    <th className="p-1.5 border-r border-slate-900 w-16">CGST</th>
                    <th className="p-1.5 border-r border-slate-900 w-16">SGST</th>
                  </>
                ) : (
                  <th className="p-1.5 border-r border-slate-900 w-20">IGST</th>
                )}
                <th className="p-1.5 w-20 text-right pr-2">Total (₹)</th>
              </tr>
            </thead>
            <tbody>
              {(invoice.items || []).map((item, idx) => {
                const itemTaxable = item.quantity * item.price;
                const itemTotal = itemTaxable + (item.cgst || 0) + (item.sgst || 0) + (item.igst || 0);

                return (
                  <tr key={idx} className="border-b border-slate-300 text-[11px]">
                    <td className="p-2 border-r border-slate-900 text-center font-bold text-slate-500">{idx + 1}</td>
                    <td className="p-2 border-r border-slate-900">
                      <p className="font-bold text-slate-900">{item.description}</p>
                    </td>
                    <td className="p-2 border-r border-slate-900 text-center font-mono text-slate-600">{item.hsn_code || '-'}</td>
                    <td className="p-2 border-r border-slate-900 text-center font-semibold">{item.quantity}</td>
                    <td className="p-2 border-r border-slate-900 text-right">{item.price.toFixed(2)}</td>
                    <td className="p-2 border-r border-slate-900 text-right font-medium">{itemTaxable.toFixed(2)}</td>
                    {!isInterState ? (
                      <>
                        <td className="p-2 border-r border-slate-900 text-right">
                          <span className="text-[9px] text-slate-500 block">{(item.gst_rate || 18) / 2}%</span>
                          {(item.cgst || (itemTaxable * (item.gst_rate || 18) / 200)).toFixed(2)}
                        </td>
                        <td className="p-2 border-r border-slate-900 text-right">
                          <span className="text-[9px] text-slate-500 block">{(item.gst_rate || 18) / 2}%</span>
                          {(item.sgst || (itemTaxable * (item.gst_rate || 18) / 200)).toFixed(2)}
                        </td>
                      </>
                    ) : (
                      <td className="p-2 border-r border-slate-900 text-right">
                        <span className="text-[9px] text-slate-500 block">{item.gst_rate || 18}%</span>
                        {(item.igst || (itemTaxable * (item.gst_rate || 18) / 100)).toFixed(2)}
                      </td>
                    )}
                    <td className="p-2 text-right font-bold pr-2">{itemTotal.toFixed(2)}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-slate-100 font-bold border-t-2 border-slate-900 text-xs">
                <td colSpan={5} className="p-2 border-r border-slate-900 text-right uppercase">Sub Totals</td>
                <td className="p-2 border-r border-slate-900 text-right">₹{taxableTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                {!isInterState ? (
                  <>
                    <td className="p-2 border-r border-slate-900 text-right">₹{(invoice.cgst_total || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    <td className="p-2 border-r border-slate-900 text-right">₹{(invoice.sgst_total || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  </>
                ) : (
                  <td className="p-2 border-r border-slate-900 text-right">₹{(invoice.igst_total || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                )}
                <td className="p-2 text-right pr-2 text-indigo-900 font-black">₹{grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
              </tr>
            </tfoot>
          </table>

          {/* Amount in words and Bank details */}
          <div className="grid grid-cols-3 border border-slate-900 mb-4">
            <div className="col-span-2 p-3 border-r border-slate-900 space-y-2">
              <div>
                <p className="text-[10px] uppercase font-bold text-slate-400">Total Invoice Amount in Words</p>
                <p className="text-xs font-bold text-slate-900 italic">{numberToIndianWords(grandTotal)}</p>
              </div>

              {/* Bank Details */}
              <div className="pt-2 border-t border-slate-200">
                <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Bank Payment Details for RTGS / NEFT / UPI</p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-[11px]">
                  <p><span className="text-slate-500">Bank Name: </span><strong>{client.bank_name || 'HDFC Bank'}</strong></p>
                  <p><span className="text-slate-500">Account No: </span><strong className="font-mono">{client.bank_acc_no || '50200012345678'}</strong></p>
                  <p><span className="text-slate-500">IFSC Code: </span><strong className="font-mono">{client.bank_ifsc || 'HDFC0000123'}</strong></p>
                  <p><span className="text-slate-500">Branch: </span><strong>{client.bank_branch || 'Main Branch'}</strong></p>
                </div>
              </div>
            </div>

            {/* QR Code and Tax summary */}
            <div className="p-3 bg-slate-50 flex flex-col items-center justify-center text-center">
              <QRCodeSVG
                value={JSON.stringify({
                  GSTIN: client.gstin,
                  INV: invoice.invoice_number,
                  DT: invoice.date,
                  VAL: grandTotal,
                  POS: placeOfSupplyCode,
                  ITEMS: (invoice.items || []).length
                })}
                size={84}
              />
              <p className="text-[9px] text-slate-500 mt-1 font-mono">GST e-Invoice QR</p>
            </div>
          </div>

          {/* Terms & Signatory */}
          <div className="grid grid-cols-2 border border-slate-900 text-[10px] min-h-[100px]">
            <div className="p-3 border-r border-slate-900 space-y-1">
              <p className="font-bold uppercase text-slate-400">Terms & Conditions:</p>
              <ol className="list-decimal list-inside space-y-0.5 text-slate-600">
                <li>Goods once sold will not be taken back or exchanged.</li>
                <li>Interest @ 18% p.a. will be charged if payment not made within due date.</li>
                <li>Subject to local jurisdiction only.</li>
              </ol>
            </div>

            <div className="p-3 flex flex-col justify-between items-end text-right">
              <p className="font-bold text-slate-800">For {client.business_name}</p>
              <div className="mt-8 pt-1 border-t border-slate-400 w-44 text-center">
                <p className="font-bold text-slate-900">Authorized Signatory</p>
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
