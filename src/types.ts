export interface Client {
  id: number;
  username: string; // Mobile no or email id
  password?: string;
  role: 'ADMIN' | 'CLIENT';
  business_name: string;
  trade_name?: string;
  gstin?: string;
  state: string;
  state_code: string;
  address?: string;
  phone?: string;
  email?: string;
  bank_name?: string;
  bank_acc_no?: string;
  bank_ifsc?: string;
  bank_branch?: string;
  created_at?: string;
  sales_count?: number;
  sales_total?: number;
  purchase_total?: number;
  receivables_total?: number;
  payables_total?: number;
}

export interface Account {
  id: number;
  client_id?: number;
  name: string;
  type: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE';
  group_name: string; // Sundry Debtors, Sundry Creditors, Bank, Cash, etc.
  balance: number;
  gstin?: string;
  state?: string;
  state_code?: string;
  phone?: string;
  address?: string;
}

export interface InventoryItem {
  id: number;
  client_id?: number;
  name: string;
  hsn_code: string;
  gst_rate: number; // Percentage (e.g. 18)
  unit: string;
  sale_price: number;
  purchase_price: number;
  current_stock: number;
}

export interface Transaction {
  id: number;
  client_id?: number;
  date: string;
  description: string;
  amount: number;
  type: 'SALE' | 'PURCHASE' | 'BANK_DEPOSIT' | 'BANK_WITHDRAWAL' | 'EXPENSE' | 'JOURNAL' | 'PAYMENT' | 'RECEIPT';
  voucher_type?: string;
  ref_no?: string;
  party_id?: number;
  debit_account_id: number;
  credit_account_id: number;
  debit_account_name?: string;
  credit_account_name?: string;
}

export interface InvoiceItem {
  item_id?: number;
  description: string;
  quantity: number;
  price: number;
  hsn_code?: string;
  gst_rate?: number;
  cgst?: number;
  sgst?: number;
  igst?: number;
}

export interface Invoice {
  id: number;
  client_id?: number;
  invoice_number: string;
  date: string;
  customer_id: number;
  customer_name?: string;
  total_amount: number;
  cgst_total: number;
  sgst_total: number;
  igst_total: number;
  status: 'PENDING' | 'PAID' | 'OVERDUE';
  items: InvoiceItem[];
  place_of_supply?: string;
  place_of_supply_code?: string;
  is_interstate?: number; // 0 for Intra-state (CGST+SGST), 1 for Inter-state (IGST)
  buyer_gstin?: string;
  buyer_address?: string;
  buyer_state?: string;
  buyer_state_code?: string;
  reverse_charge?: string;
  vehicle_no?: string;
  notes?: string;
}

export interface PLReport {
  revenue: { name: string; balance: number; group_name: string }[];
  expenses: { name: string; balance: number; group_name: string }[];
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
}

export interface BalanceSheetReport {
  assets: { name: string; balance: number; group_name: string }[];
  liabilities: { name: string; balance: number; group_name: string }[];
  equity: { name: string; balance: number; group_name: string }[];
  netProfit: number;
}

export interface LedgerEntry extends Transaction {
  debit: number;
  credit: number;
  particular: string;
}

export interface PartySummary {
  id: number;
  name: string;
  group_name: string;
  balance: number;
  gstin?: string;
  phone?: string;
  state?: string;
  state_code?: string;
  last_transaction_date?: string;
}

export interface GSTReportSummary {
  period: string;
  client: Client;
  gstr1: {
    b2b_invoices_count: number;
    b2b_taxable_value: number;
    b2b_cgst: number;
    b2b_sgst: number;
    b2b_igst: number;
    b2b_total: number;
    b2c_invoices_count: number;
    b2c_taxable_value: number;
    b2c_cgst: number;
    b2c_sgst: number;
    b2c_igst: number;
    b2c_total: number;
    total_taxable_value: number;
    total_cgst: number;
    total_sgst: number;
    total_igst: number;
    total_tax_liability: number;
    hsn_summary: {
      hsn: string;
      description: string;
      qty: number;
      taxable_value: number;
      rate: number;
      cgst: number;
      sgst: number;
      igst: number;
    }[];
    invoices: Invoice[];
  };
  gstr2b: {
    total_inward_purchases: number;
    eligible_itc_cgst: number;
    eligible_itc_sgst: number;
    eligible_itc_igst: number;
    total_itc_available: number;
    purchases: Transaction[];
  };
  gstr3b: {
    outward_taxable_value: number;
    outward_igst: number;
    outward_cgst: number;
    outward_sgst: number;
    total_outward_tax: number;
    itc_igst: number;
    itc_cgst: number;
    itc_sgst: number;
    total_itc: number;
    net_payable_igst: number;
    net_payable_cgst: number;
    net_payable_sgst: number;
    total_net_payable: number;
  };
}

export const INDIAN_STATES = [
  { code: "01", name: "Jammu and Kashmir" },
  { code: "02", name: "Himachal Pradesh" },
  { code: "03", name: "Punjab" },
  { code: "04", name: "Chandigarh" },
  { code: "05", name: "Uttarakhand" },
  { code: "06", name: "Haryana" },
  { code: "07", name: "Delhi" },
  { code: "08", name: "Rajasthan" },
  { code: "09", name: "Uttar Pradesh" },
  { code: "10", name: "Bihar" },
  { code: "11", name: "Sikkim" },
  { code: "12", name: "Arunachal Pradesh" },
  { code: "13", name: "Nagaland" },
  { code: "14", name: "Manipur" },
  { code: "15", name: "Mizoram" },
  { code: "16", name: "Tripura" },
  { code: "17", name: "Meghalaya" },
  { code: "18", name: "Assam" },
  { code: "19", name: "West Bengal" },
  { code: "20", name: "Jharkhand" },
  { code: "21", name: "Odisha" },
  { code: "22", name: "Chhattisgarh" },
  { code: "23", name: "Madhya Pradesh" },
  { code: "24", name: "Gujarat" },
  { code: "26", name: "Dadra & Nagar Haveli and Daman & Diu" },
  { code: "27", name: "Maharashtra" },
  { code: "29", name: "Karnataka" },
  { code: "30", name: "Goa" },
  { code: "31", name: "Lakshadweep" },
  { code: "32", name: "Kerala" },
  { code: "33", name: "Tamil Nadu" },
  { code: "34", name: "Puducherry" },
  { code: "35", name: "Andaman & Nicobar Islands" },
  { code: "36", name: "Telangana" },
  { code: "37", name: "Andhra Pradesh" },
  { code: "38", name: "Ladakh" }
];

export interface MonthwiseTransactionItem {
  id: number;
  date: string;
  ref_no?: string;
  party_name: string;
  description: string;
  taxable_value: number;
  cgst: number;
  sgst: number;
  igst: number;
  total_tax: number;
  total_amount: number;
  type: 'SALE' | 'PURCHASE';
  invoice_id?: number;
}

export interface MonthwiseRecord {
  month_key: string; // e.g. "2024-04"
  month_name: string; // e.g. "Apr 2024"
  full_month_name: string; // e.g. "April 2024"
  year: number;
  month_number: number; // 1 to 12
  fy: string; // e.g. "FY 2024-25"
  quarter: string; // "Q1", "Q2", "Q3", "Q4"
  
  // Sales
  sales_amount: number;
  sales_taxable: number;
  sales_cgst: number;
  sales_sgst: number;
  sales_igst: number;
  sales_tax_total: number;
  sales_count: number;

  // Purchases
  purchase_amount: number;
  purchase_taxable: number;
  purchase_cgst: number;
  purchase_sgst: number;
  purchase_igst: number;
  purchase_tax_total: number;
  purchase_count: number;

  // Comparative & Net
  net_margin: number; // sales_amount - purchase_amount
  net_taxable_margin: number;
  net_gst_payable: number; // sales_tax_total - purchase_tax_total

  // Itemized vouchers for drilldown
  sales_items: MonthwiseTransactionItem[];
  purchase_items: MonthwiseTransactionItem[];
}

export interface MonthwiseReportData {
  client: Client;
  financial_years: string[];
  months: MonthwiseRecord[];
  summary: {
    total_sales: number;
    total_sales_taxable: number;
    total_purchases: number;
    total_purchases_taxable: number;
    net_margin: number;
    total_output_gst: number;
    total_input_itc: number;
    net_gst_payable: number;
    total_sales_count: number;
    total_purchase_count: number;
  };
}

