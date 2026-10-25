import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";
import { google } from "googleapis";
import cookieSession from "cookie-session";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, "accounting.db");
let db = new Database(dbPath);

// Google OAuth Configuration
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  `${process.env.APP_URL}/api/auth/google/callback`
);

const SCOPES = ['https://www.googleapis.com/auth/drive.file'];

function initDb() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS clients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL, -- Mobile no or email id
      password TEXT NOT NULL,
      role TEXT DEFAULT 'CLIENT', -- 'ADMIN' or 'CLIENT'
      business_name TEXT NOT NULL,
      trade_name TEXT,
      gstin TEXT,
      state TEXT DEFAULT 'Maharashtra',
      state_code TEXT DEFAULT '27',
      address TEXT,
      phone TEXT,
      email TEXT,
      bank_name TEXT,
      bank_acc_no TEXT,
      bank_ifsc TEXT,
      bank_branch TEXT,
      created_at TEXT
    );

    CREATE TABLE IF NOT EXISTS accounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id INTEGER,
      name TEXT NOT NULL,
      type TEXT NOT NULL, -- ASSET, LIABILITY, EQUITY, REVENUE, EXPENSE
      group_name TEXT, -- Sundry Debtors, Sundry Creditors, Bank, Cash, etc.
      balance REAL DEFAULT 0,
      gstin TEXT,
      state TEXT,
      state_code TEXT,
      phone TEXT,
      address TEXT
    );

    CREATE TABLE IF NOT EXISTS inventory_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id INTEGER,
      name TEXT NOT NULL,
      hsn_code TEXT,
      gst_rate REAL DEFAULT 0,
      unit TEXT DEFAULT 'PCS',
      sale_price REAL DEFAULT 0,
      purchase_price REAL DEFAULT 0,
      current_stock REAL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id INTEGER,
      date TEXT NOT NULL,
      description TEXT,
      amount REAL NOT NULL,
      type TEXT NOT NULL, -- SALE, PURCHASE, BANK_DEPOSIT, BANK_WITHDRAWAL, EXPENSE, JOURNAL, PAYMENT, RECEIPT
      voucher_type TEXT,
      ref_no TEXT,
      party_id INTEGER,
      debit_account_id INTEGER,
      credit_account_id INTEGER,
      FOREIGN KEY(debit_account_id) REFERENCES accounts(id),
      FOREIGN KEY(credit_account_id) REFERENCES accounts(id)
    );

    CREATE TABLE IF NOT EXISTS invoices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id INTEGER,
      invoice_number TEXT NOT NULL,
      date TEXT NOT NULL,
      customer_id INTEGER,
      total_amount REAL NOT NULL,
      cgst_total REAL DEFAULT 0,
      sgst_total REAL DEFAULT 0,
      igst_total REAL DEFAULT 0,
      status TEXT DEFAULT 'PENDING',
      items TEXT, -- JSON string
      place_of_supply TEXT,
      place_of_supply_code TEXT,
      is_interstate INTEGER DEFAULT 0,
      buyer_gstin TEXT,
      buyer_address TEXT,
      buyer_state TEXT,
      buyer_state_code TEXT,
      reverse_charge TEXT DEFAULT 'No',
      vehicle_no TEXT,
      notes TEXT,
      FOREIGN KEY(customer_id) REFERENCES accounts(id)
    );

    CREATE TABLE IF NOT EXISTS admin_drive_tokens (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      access_token TEXT,
      email TEXT,
      last_sync_time TEXT,
      files_synced_count INTEGER DEFAULT 0,
      status TEXT DEFAULT 'IDLE',
      folder_id TEXT,
      updated_at TEXT
    );
  `);

  // Safe migration helper to add missing columns to existing tables
  const addColIfNotExists = (table: string, column: string, colDef: string) => {
    try {
      const info = db.prepare(`PRAGMA table_info(${table})`).all() as any[];
      if (!info.some(c => c.name === column)) {
        db.prepare(`ALTER TABLE ${table} ADD COLUMN ${column} ${colDef}`).run();
      }
    } catch (e) {
      // Ignore if column exists
    }
  };

  addColIfNotExists('accounts', 'client_id', 'INTEGER');
  addColIfNotExists('accounts', 'gstin', 'TEXT');
  addColIfNotExists('accounts', 'state', 'TEXT');
  addColIfNotExists('accounts', 'state_code', 'TEXT');
  addColIfNotExists('accounts', 'phone', 'TEXT');
  addColIfNotExists('accounts', 'address', 'TEXT');

  addColIfNotExists('inventory_items', 'client_id', 'INTEGER');

  addColIfNotExists('transactions', 'client_id', 'INTEGER');
  addColIfNotExists('transactions', 'voucher_type', 'TEXT');
  addColIfNotExists('transactions', 'ref_no', 'TEXT');
  addColIfNotExists('transactions', 'party_id', 'INTEGER');

  addColIfNotExists('invoices', 'client_id', 'INTEGER');
  addColIfNotExists('invoices', 'place_of_supply', 'TEXT');
  addColIfNotExists('invoices', 'place_of_supply_code', 'TEXT');
  addColIfNotExists('invoices', 'is_interstate', 'INTEGER DEFAULT 0');
  addColIfNotExists('invoices', 'buyer_gstin', 'TEXT');
  addColIfNotExists('invoices', 'buyer_address', 'TEXT');
  addColIfNotExists('invoices', 'buyer_state', 'TEXT');
  addColIfNotExists('invoices', 'buyer_state_code', 'TEXT');
  addColIfNotExists('invoices', 'reverse_charge', 'TEXT DEFAULT "No"');
  addColIfNotExists('invoices', 'vehicle_no', 'TEXT');
  addColIfNotExists('invoices', 'notes', 'TEXT');

  seedInitialData();
}

function seedAccountsForClient(clientId: number, clientName: string, state: string = 'Maharashtra', stateCode: string = '27') {
  const insertAccount = db.prepare(`
    INSERT INTO accounts (client_id, name, type, group_name, balance, gstin, state, state_code)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const accounts = [
    { name: "Cash in Hand", type: "ASSET", group: "Cash-in-hand", bal: 25000 },
    { name: "HDFC Current Account", type: "ASSET", group: "Bank Accounts", bal: 185000 },
    { name: "Sales Revenue", type: "REVENUE", group: "Sales Accounts", bal: 0 },
    { name: "Purchase Account", type: "EXPENSE", group: "Purchase Accounts", bal: 0 },
    { name: "CGST Input", type: "ASSET", group: "Duties & Taxes", bal: 0 },
    { name: "SGST Input", type: "ASSET", group: "Duties & Taxes", bal: 0 },
    { name: "IGST Input", type: "ASSET", group: "Duties & Taxes", bal: 0 },
    { name: "CGST Output", type: "LIABILITY", group: "Duties & Taxes", bal: 0 },
    { name: "SGST Output", type: "LIABILITY", group: "Duties & Taxes", bal: 0 },
    { name: "IGST Output", type: "LIABILITY", group: "Duties & Taxes", bal: 0 },
    // Sample Debtors (Customers)
    { name: "M/s Royal Tech Solutions", type: "ASSET", group: "Sundry Debtors", bal: 45000, gstin: `${stateCode}AAACR9988D1Z2`, state: state, stateCode: stateCode },
    { name: "Delta Infotech (Gujarat)", type: "ASSET", group: "Sundry Debtors", bal: 32000, gstin: `24AACCD4455E1Z7`, state: "Gujarat", stateCode: "24" },
    // Sample Creditors (Suppliers)
    { name: "National Chipsets & Components", type: "LIABILITY", group: "Sundry Creditors", bal: -68000, gstin: `${stateCode}AABCN1122F1Z9`, state: state, stateCode: stateCode },
    { name: "Karnataka Electricals Ltd", type: "LIABILITY", group: "Sundry Creditors", bal: -24000, gstin: `29AABCK3344G1Z1`, state: "Karnataka", stateCode: "29" }
  ];

  for (const a of accounts) {
    insertAccount.run(clientId, a.name, a.type, a.group, a.bal || 0, a.gstin || null, a.state || state, a.stateCode || stateCode);
  }

  // Seed sample Inventory Items
  const insertInv = db.prepare(`
    INSERT INTO inventory_items (client_id, name, hsn_code, gst_rate, unit, sale_price, purchase_price, current_stock)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertInv.run(clientId, "Microcontroller Board v2.0", "8542", 18, "PCS", 1250, 850, 45);
  insertInv.run(clientId, "SMD Power IC 12V 5A", "8504", 18, "PCS", 450, 280, 120);
  insertInv.run(clientId, "HDMI Display Interface Cable 2m", "8544", 18, "PCS", 350, 180, 80);
}

function seedInitialData() {
  const clientCount = db.prepare("SELECT COUNT(*) as count FROM clients").get() as { count: number };
  if (clientCount.count === 0) {
    const insertClient = db.prepare(`
      INSERT INTO clients (
        username, password, role, business_name, trade_name, gstin, state, state_code,
        address, phone, email, bank_name, bank_acc_no, bank_ifsc, bank_branch, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    // 1. Admin Account (User ID: kotulegroup@gmail.com or admin)
    const adminResult = insertClient.run(
      "kotulegroup@gmail.com",
      "admin123",
      "ADMIN",
      "Kotule & Associates Tax & Accounting",
      "Kotule Tax Consultants",
      "27AAAAA0000A1Z5",
      "Maharashtra",
      "27",
      "Suite 401, Commerce Center, Fort, Mumbai - 400001",
      "9820000000",
      "kotulegroup@gmail.com",
      "State Bank of India",
      "300100200300",
      "SBIN0000300",
      "Fort Mumbai",
      new Date().toISOString()
    );

    // 2. Client 1 (Mobile ID: 9820012345)
    const client1Result = insertClient.run(
      "9820012345",
      "client123",
      "CLIENT",
      "Apex Electronics & Spares Pvt Ltd",
      "Apex Electronics",
      "27AABCA1234F1Z5",
      "Maharashtra",
      "27",
      "Shop 14, Lamington Road, Grant Road, Mumbai - 400007",
      "9820012345",
      "apex.spares@gmail.com",
      "HDFC Bank",
      "50200012345678",
      "HDFC0000123",
      "Lamington Road Mumbai",
      new Date().toISOString()
    );

    // 3. Client 2 (Mobile ID: 9890098765)
    const client2Result = insertClient.run(
      "9890098765",
      "client123",
      "CLIENT",
      "Gujarat Petro Chemicals & Solvents",
      "Gujarat Solvents",
      "24AABCS5678G1Z9",
      "Gujarat",
      "24",
      "Plot 42, GIDC Phase II, Vapi - 396195",
      "9890098765",
      "vapi.petro@gmail.com",
      "Bank of Baroda",
      "12340200005678",
      "BARB0VAPIGX",
      "GIDC Vapi",
      new Date().toISOString()
    );

    const client1Id = client1Result.lastInsertRowid as number;
    const client2Id = client2Result.lastInsertRowid as number;

    seedAccountsForClient(client1Id, "Apex Electronics", "Maharashtra", "27");
    seedAccountsForClient(client2Id, "Gujarat Petro Chemicals", "Gujarat", "24");

    // Seed realistic sample transactions and invoices for Client 1
    seedSampleDataForClient1(client1Id);
  }

  // Update legacy unassigned records to client 2 (Apex Electronics) if any exist
  db.prepare("UPDATE accounts SET client_id = 2 WHERE client_id IS NULL").run();
  db.prepare("UPDATE inventory_items SET client_id = 2 WHERE client_id IS NULL").run();
  db.prepare("UPDATE transactions SET client_id = 2 WHERE client_id IS NULL").run();
  db.prepare("UPDATE invoices SET client_id = 2 WHERE client_id IS NULL").run();

  // Do not generate synthetic entries on startup. Only preserve real user data.
}

function ensureMultiMonthData() {
  // Disabled: preserve only real user entered data without synthetic entries
}

function seedHistoricalDataForClient(clientId: number, businessName: string, state: string, stateCode: string) {
  const getAcc = (name: string) => db.prepare("SELECT id FROM accounts WHERE client_id = ? AND name = ?").get(clientId, name) as any;
  const getGroup = (group: string) => db.prepare("SELECT id, name, gstin, state, state_code, address FROM accounts WHERE client_id = ? AND group_name = ? LIMIT 2").all(clientId, group) as any[];

  const salesRev = getAcc("Sales Revenue")?.id;
  const purchaseAcc = getAcc("Purchase Account")?.id;
  const cgstOut = getAcc("CGST Output")?.id;
  const sgstOut = getAcc("SGST Output")?.id;
  const igstOut = getAcc("IGST Output")?.id;
  const cgstIn = getAcc("CGST Input")?.id;
  const sgstIn = getAcc("SGST Input")?.id;
  const igstIn = getAcc("IGST Input")?.id;

  const debtors = getGroup("Sundry Debtors");
  const creditors = getGroup("Sundry Creditors");

  if (!salesRev || !purchaseAcc || debtors.length === 0 || creditors.length === 0) return;

  const localDebtor = debtors[0];
  const interStateDebtor = debtors.length > 1 ? debtors[1] : debtors[0];
  const mainCreditor = creditors[0];

  const historicalMonths = [
    {
      yearMonth: "2024-10",
      saleDate1: "2024-10-14",
      saleInv1: `INV-241001`,
      saleTaxable1: 42000,
      saleDate2: "2024-10-25",
      saleInv2: `INV-241002`,
      saleTaxable2: 28000,
      purDate: "2024-10-18",
      purBill: "BILL-8821",
      purTaxable: 38000
    },
    {
      yearMonth: "2024-11",
      saleDate1: "2024-11-10",
      saleInv1: `INV-241101`,
      saleTaxable1: 56000,
      saleDate2: "2024-11-22",
      saleInv2: `INV-241102`,
      saleTaxable2: 34000,
      purDate: "2024-11-16",
      purBill: "BILL-8940",
      purTaxable: 45000
    },
    {
      yearMonth: "2024-12",
      saleDate1: "2024-12-08",
      saleInv1: `INV-241201`,
      saleTaxable1: 82000,
      saleDate2: "2024-12-21",
      saleInv2: `INV-241202`,
      saleTaxable2: 46000,
      purDate: "2024-12-15",
      purBill: "BILL-9055",
      purTaxable: 62000
    },
    {
      yearMonth: "2025-01",
      saleDate1: "2025-01-12",
      saleInv1: `INV-250101`,
      saleTaxable1: 68000,
      saleDate2: "2025-01-26",
      saleInv2: `INV-250102`,
      saleTaxable2: 39000,
      purDate: "2025-01-19",
      purBill: "BILL-9180",
      purTaxable: 51000
    },
    {
      yearMonth: "2025-02",
      saleDate1: "2025-02-09",
      saleInv1: `INV-250201`,
      saleTaxable1: 74000,
      saleDate2: "2025-02-23",
      saleInv2: `INV-250202`,
      saleTaxable2: 42000,
      purDate: "2025-02-17",
      purBill: "BILL-9290",
      purTaxable: 58000
    }
  ];

  for (const m of historicalMonths) {
    // 1. Intra-State Sale (18%: 9% CGST + 9% SGST)
    const cgst1 = Math.round(m.saleTaxable1 * 0.09);
    const sgst1 = Math.round(m.saleTaxable1 * 0.09);
    const total1 = m.saleTaxable1 + cgst1 + sgst1;

    db.prepare(`
      INSERT INTO invoices (
        client_id, invoice_number, date, customer_id, total_amount, cgst_total, sgst_total, igst_total,
        status, items, place_of_supply, place_of_supply_code, is_interstate, buyer_gstin, buyer_address, buyer_state, buyer_state_code
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'PAID', ?, ?, ?, 0, ?, ?, ?, ?)
    `).run(
      clientId,
      m.saleInv1,
      m.saleDate1,
      localDebtor.id,
      total1,
      cgst1,
      sgst1,
      0,
      JSON.stringify([{ description: "Commercial Goods Supply", quantity: 10, price: m.saleTaxable1 / 10, gst_rate: 18, cgst: cgst1, sgst: sgst1, igst: 0 }]),
      state,
      stateCode,
      localDebtor.gstin || "27AAACR9988D1Z2",
      localDebtor.address || "Main Market, Commercial Center",
      state,
      stateCode
    );

    db.prepare(`
      INSERT INTO transactions (client_id, date, description, amount, type, voucher_type, debit_account_id, credit_account_id, party_id, ref_no)
      VALUES (?, ?, ?, ?, 'SALE', 'SALE', ?, ?, ?, ?)
    `).run(clientId, m.saleDate1, `Tax Invoice ${m.saleInv1}: ${localDebtor.name}`, m.saleTaxable1, localDebtor.id, salesRev, localDebtor.id, m.saleInv1);

    // 2. Inter-State Sale (18% IGST)
    const igst2 = Math.round(m.saleTaxable2 * 0.18);
    const total2 = m.saleTaxable2 + igst2;
    const destState = stateCode === '27' ? 'Gujarat' : 'Maharashtra';
    const destCode = stateCode === '27' ? '24' : '27';

    db.prepare(`
      INSERT INTO invoices (
        client_id, invoice_number, date, customer_id, total_amount, cgst_total, sgst_total, igst_total,
        status, items, place_of_supply, place_of_supply_code, is_interstate, buyer_gstin, buyer_address, buyer_state, buyer_state_code
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'PAID', ?, ?, ?, 1, ?, ?, ?, ?)
    `).run(
      clientId,
      m.saleInv2,
      m.saleDate2,
      interStateDebtor.id,
      total2,
      0,
      0,
      igst2,
      JSON.stringify([{ description: "Inter-State Product Delivery", quantity: 5, price: m.saleTaxable2 / 5, gst_rate: 18, cgst: 0, sgst: 0, igst: igst2 }]),
      destState,
      destCode,
      interStateDebtor.gstin || "24AACCD4455E1Z7",
      interStateDebtor.address || "Highway Industrial Area",
      destState,
      destCode
    );

    db.prepare(`
      INSERT INTO transactions (client_id, date, description, amount, type, voucher_type, debit_account_id, credit_account_id, party_id, ref_no)
      VALUES (?, ?, ?, ?, 'SALE', 'SALE', ?, ?, ?, ?)
    `).run(clientId, m.saleDate2, `Inter-State Sale ${m.saleInv2}: ${interStateDebtor.name}`, m.saleTaxable2, interStateDebtor.id, salesRev, interStateDebtor.id, m.saleInv2);

    // 3. Purchase Entry
    const purCgst = Math.round(m.purTaxable * 0.09);
    const purSgst = Math.round(m.purTaxable * 0.09);

    db.prepare(`
      INSERT INTO transactions (client_id, date, description, amount, type, voucher_type, debit_account_id, credit_account_id, party_id, ref_no)
      VALUES (?, ?, ?, ?, 'PURCHASE', 'PURCHASE', ?, ?, ?, ?)
    `).run(clientId, m.purDate, `Purchase from ${mainCreditor.name} (${m.purBill})`, m.purTaxable, purchaseAcc, mainCreditor.id, mainCreditor.id, m.purBill);

    if (cgstIn) {
      db.prepare(`
        INSERT INTO transactions (client_id, date, description, amount, type, voucher_type, debit_account_id, credit_account_id, party_id, ref_no)
        VALUES (?, ?, ?, ?, 'JOURNAL', 'PURCHASE', ?, ?, ?, ?)
      `).run(clientId, m.purDate, `Input CGST on ${m.purBill}`, purCgst, cgstIn, mainCreditor.id, mainCreditor.id, m.purBill);
    }
    if (sgstIn) {
      db.prepare(`
        INSERT INTO transactions (client_id, date, description, amount, type, voucher_type, debit_account_id, credit_account_id, party_id, ref_no)
        VALUES (?, ?, ?, ?, 'JOURNAL', 'PURCHASE', ?, ?, ?, ?)
      `).run(clientId, m.purDate, `Input SGST on ${m.purBill}`, purSgst, sgstIn, mainCreditor.id, mainCreditor.id, m.purBill);
    }
  }
}

function seedSampleDataForClient1(clientId: number) {
  const getAcc = (name: string) => db.prepare("SELECT id FROM accounts WHERE client_id = ? AND name = ?").get(clientId, name) as any;
  const cash = getAcc("Cash in Hand")?.id;
  const bank = getAcc("HDFC Current Account")?.id;
  const salesRev = getAcc("Sales Revenue")?.id;
  const purchaseAcc = getAcc("Purchase Account")?.id;
  const cgstOut = getAcc("CGST Output")?.id;
  const sgstOut = getAcc("SGST Output")?.id;
  const igstOut = getAcc("IGST Output")?.id;
  const cgstIn = getAcc("CGST Input")?.id;
  const sgstIn = getAcc("SGST Input")?.id;
  const royalTech = getAcc("M/s Royal Tech Solutions")?.id;
  const deltaTech = getAcc("Delta Infotech (Gujarat)")?.id;
  const nationalCreditor = getAcc("National Chipsets & Components")?.id;

  const today = new Date().toISOString().split('T')[0];
  const dateAgo3 = new Date(Date.now() - 3 * 86400000).toISOString().split('T')[0];
  const dateAgo7 = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];

  // 1. Intra-State Sale to Royal Tech Solutions (Maharashtra to Maharashtra: CGST + SGST)
  // Taxable 20,000, 18% GST = CGST 1800, SGST 1800, Total 23,600
  if (royalTech && salesRev) {
    db.prepare(`
      INSERT INTO invoices (
        client_id, invoice_number, date, customer_id, total_amount, cgst_total, sgst_total, igst_total,
        status, items, place_of_supply, place_of_supply_code, is_interstate, buyer_gstin, buyer_address, buyer_state, buyer_state_code
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      clientId,
      "INV-260101",
      dateAgo7,
      royalTech,
      23600,
      1800,
      1800,
      0,
      "PENDING",
      JSON.stringify([
        { item_id: 1, description: "Microcontroller Board v2.0", quantity: 16, price: 1250, hsn_code: "8542", gst_rate: 18, cgst: 1800, sgst: 1800, igst: 0 }
      ]),
      "Maharashtra",
      "27",
      0,
      "27AAACR9988D1Z2",
      "Andheri East, Mumbai",
      "Maharashtra",
      "27"
    );

    // Transaction for Sale
    db.prepare(`
      INSERT INTO transactions (client_id, date, description, amount, type, voucher_type, debit_account_id, credit_account_id, party_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(clientId, dateAgo7, "Tax Invoice INV-260101: M/s Royal Tech Solutions", 20000, "SALE", "SALE", royalTech, salesRev, royalTech);

    if (cgstOut) {
      db.prepare(`
        INSERT INTO transactions (client_id, date, description, amount, type, voucher_type, debit_account_id, credit_account_id, party_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(clientId, dateAgo7, "CGST Output on INV-260101 (9%)", 1800, "JOURNAL", "SALE", royalTech, cgstOut, royalTech);
    }
    if (sgstOut) {
      db.prepare(`
        INSERT INTO transactions (client_id, date, description, amount, type, voucher_type, debit_account_id, credit_account_id, party_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(clientId, dateAgo7, "SGST Output on INV-260101 (9%)", 1800, "JOURNAL", "SALE", royalTech, sgstOut, royalTech);
    }
  }

  // 2. Inter-State Sale to Delta Infotech (Maharashtra to Gujarat: IGST)
  // Taxable 25,000, 18% IGST = 4,500, Total 29,500
  if (deltaTech && salesRev && igstOut) {
    db.prepare(`
      INSERT INTO invoices (
        client_id, invoice_number, date, customer_id, total_amount, cgst_total, sgst_total, igst_total,
        status, items, place_of_supply, place_of_supply_code, is_interstate, buyer_gstin, buyer_address, buyer_state, buyer_state_code
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      clientId,
      "INV-260102",
      dateAgo3,
      deltaTech,
      29500,
      0,
      0,
      4500,
      "PAID",
      JSON.stringify([
        { item_id: 2, description: "SMD Power IC 12V 5A", quantity: 50, price: 450, hsn_code: "8504", gst_rate: 18, cgst: 0, sgst: 0, igst: 4050 },
        { item_id: 3, description: "HDMI Display Interface Cable 2m", quantity: 7, price: 350, hsn_code: "8544", gst_rate: 18, cgst: 0, sgst: 0, igst: 450 }
      ]),
      "Gujarat",
      "24",
      1,
      "24AACCD4455E1Z7",
      "SG Highway, Ahmedabad, Gujarat",
      "Gujarat",
      "24"
    );

    db.prepare(`
      INSERT INTO transactions (client_id, date, description, amount, type, voucher_type, debit_account_id, credit_account_id, party_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(clientId, dateAgo3, "Inter-State Sale INV-260102: Delta Infotech", 25000, "SALE", "SALE", deltaTech, salesRev, deltaTech);

    db.prepare(`
      INSERT INTO transactions (client_id, date, description, amount, type, voucher_type, debit_account_id, credit_account_id, party_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(clientId, dateAgo3, "IGST Output on INV-260102 (18%)", 4500, "JOURNAL", "SALE", deltaTech, igstOut, deltaTech);
  }

  // 3. Purchase Entry with Input GST from National Chipsets
  if (nationalCreditor && purchaseAcc && cgstIn && sgstIn) {
    db.prepare(`
      INSERT INTO transactions (client_id, date, description, amount, type, voucher_type, debit_account_id, credit_account_id, party_id, ref_no)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(clientId, dateAgo7, "Purchase from National Chipsets (Taxable)", 30000, "PURCHASE", "PURCHASE", purchaseAcc, nationalCreditor, nationalCreditor, "BILL-9081");

    db.prepare(`
      INSERT INTO transactions (client_id, date, description, amount, type, voucher_type, debit_account_id, credit_account_id, party_id, ref_no)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(clientId, dateAgo7, "Input CGST (9%) on Purchase BILL-9081", 2700, "JOURNAL", "PURCHASE", cgstIn, nationalCreditor, nationalCreditor, "BILL-9081");

    db.prepare(`
      INSERT INTO transactions (client_id, date, description, amount, type, voucher_type, debit_account_id, credit_account_id, party_id, ref_no)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(clientId, dateAgo7, "Input SGST (9%) on Purchase BILL-9081", 2700, "JOURNAL", "PURCHASE", sgstIn, nationalCreditor, nationalCreditor, "BILL-9081");
  }

  // 4. Payment Voucher: Paid 15,000 to National Chipsets via HDFC Bank
  if (nationalCreditor && bank) {
    db.prepare(`
      INSERT INTO transactions (client_id, date, description, amount, type, voucher_type, debit_account_id, credit_account_id, party_id, ref_no)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(clientId, dateAgo3, "Payment made to National Chipsets & Components", 15000, "PAYMENT", "PAYMENT", nationalCreditor, bank, nationalCreditor, "NEFT-55419");
  }

  // 5. Receipt Voucher: Received 18,000 from Royal Tech Solutions via Bank
  if (royalTech && bank) {
    db.prepare(`
      INSERT INTO transactions (client_id, date, description, amount, type, voucher_type, debit_account_id, credit_account_id, party_id, ref_no)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(clientId, today, "Payment received from M/s Royal Tech Solutions", 18000, "RECEIPT", "RECEIPT", bank, royalTech, royalTech, "UPI-88912");
  }
}

initDb();

// ==========================================
// GOOGLE DRIVE BACKUP & CLIENT SYNC ENGINE
// ==========================================

async function getOrCreateDriveFolder(folderName: string, accessToken: string): Promise<string> {
  const query = `name = '${folderName.replace(/'/g, "\\'")}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
  const searchRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name)&spaces=drive`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  const searchData = await searchRes.json() as any;
  if (searchData.files && searchData.files.length > 0) {
    return searchData.files[0].id;
  }

  // Create folder if not found
  const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder'
    })
  });
  const created = await createRes.json() as any;
  if (!created.id) {
    throw new Error(created.error?.message || "Failed to create Google Drive folder");
  }
  return created.id;
}

async function uploadOrUpdateDriveFile(
  fileName: string,
  mimeType: string,
  contentBuffer: Buffer,
  folderId: string,
  accessToken: string
) {
  const searchUrl = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(`name = '${fileName.replace(/'/g, "\\'")}' and '${folderId}' in parents and trashed = false`)}&fields=files(id,name)&spaces=drive`;
  const searchRes = await fetch(searchUrl, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  const searchData = await searchRes.json() as any;
  const existingFile = searchData.files && searchData.files.length > 0 ? searchData.files[0] : null;

  if (existingFile) {
    // Update existing file
    const updateUrl = `https://www.googleapis.com/upload/drive/v3/files/${existingFile.id}?uploadType=media`;
    const updateRes = await fetch(updateUrl, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': mimeType
      },
      body: contentBuffer
    });
    return await updateRes.json();
  } else {
    // Create new file via multipart upload
    const boundary = '-------FinTrackBoundary' + Date.now();
    const delimiter = `\r\n--${boundary}\r\n`;
    const closeDelimiter = `\r\n--${boundary}--`;

    const metadata = {
      name: fileName,
      parents: [folderId]
    };

    const multipartBody = Buffer.concat([
      Buffer.from(
        delimiter +
        'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
        JSON.stringify(metadata) +
        delimiter +
        `Content-Type: ${mimeType}\r\n\r\n`
      ),
      contentBuffer,
      Buffer.from(closeDelimiter)
    ]);

    const uploadUrl = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';
    const uploadRes = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': `multipart/related; boundary=${boundary}`
      },
      body: multipartBody
    });
    return await uploadRes.json();
  }
}

async function syncAllClientDataToDrive(tokenOverride?: string) {
  let token = tokenOverride;
  let email = 'kotulegroup@gmail.com';

  if (!token) {
    const row = db.prepare("SELECT access_token, email FROM admin_drive_tokens WHERE id = 1").get() as any;
    if (row && row.access_token) {
      token = row.access_token;
      email = row.email || email;
    }
  }

  if (!token) {
    return { success: false, error: "Admin Google Drive is not connected. Please click 'Connect Admin Google Drive' in the Admin Dashboard." };
  }

  try {
    const folderId = await getOrCreateDriveFolder("FinTrack_Client_Accounting_Data_Backups", token);
    let syncedFiles = 0;

    // 1. Live SQLite Database File (Contains all client data, tables, transactions, invoices)
    if (fs.existsSync(dbPath)) {
      const dbBuffer = fs.readFileSync(dbPath);
      await uploadOrUpdateDriveFile("accounting.db", "application/x-sqlite3", dbBuffer, folderId, token);
      syncedFiles++;
    }

    // 2. Fetch all clients and construct comprehensive backups
    const clients = db.prepare("SELECT * FROM clients ORDER BY id ASC").all() as any[];
    const allClientsData: any[] = [];

    for (const c of clients) {
      const accounts = db.prepare("SELECT * FROM accounts WHERE client_id = ?").all(c.id);
      const inventory = db.prepare("SELECT * FROM inventory_items WHERE client_id = ?").all(c.id);
      const invoices = db.prepare("SELECT * FROM invoices WHERE client_id = ? ORDER BY date ASC, id ASC").all(c.id);
      const transactions = db.prepare("SELECT * FROM transactions WHERE client_id = ? ORDER BY date ASC, id ASC").all(c.id);

      const clientDump = {
        clientInfo: {
          id: c.id,
          username: c.username,
          role: c.role,
          business_name: c.business_name,
          trade_name: c.trade_name,
          gstin: c.gstin,
          state: c.state,
          state_code: c.state_code,
          address: c.address,
          phone: c.phone,
          email: c.email,
          bank_name: c.bank_name,
          bank_acc_no: c.bank_acc_no,
          bank_ifsc: c.bank_ifsc,
          bank_branch: c.bank_branch
        },
        invoices: invoices.map((inv: any) => ({
          ...inv,
          items: typeof inv.items === 'string' ? JSON.parse(inv.items) : inv.items
        })),
        transactions,
        accounts,
        inventory,
        exportedAt: new Date().toISOString()
      };

      allClientsData.push(clientDump);

      // Upload individual client date-wise backup file
      const safeName = (c.business_name || `Client_${c.id}`).replace(/[^a-zA-Z0-9_-]/g, '_');
      const clientFileName = `Client_${c.id}_${safeName}_Datewise_Accounting_Data.json`;
      const clientJsonBuffer = Buffer.from(JSON.stringify(clientDump, null, 2), 'utf-8');
      await uploadOrUpdateDriveFile(clientFileName, "application/json", clientJsonBuffer, folderId, token);
      syncedFiles++;
    }

    // 3. Upload Master All-Clients JSON backup
    const masterBackup = {
      app: "FinTrack Multi-Client Accounting",
      version: "2.0",
      exportedAt: new Date().toISOString(),
      adminEmail: email,
      totalClients: clients.length,
      clients: allClientsData
    };
    const masterJsonBuffer = Buffer.from(JSON.stringify(masterBackup, null, 2), 'utf-8');
    await uploadOrUpdateDriveFile("All_Clients_Comprehensive_Accounting_Data.json", "application/json", masterJsonBuffer, folderId, token);
    syncedFiles++;

    const nowIso = new Date().toISOString();
    db.prepare(`
      INSERT INTO admin_drive_tokens (id, access_token, email, last_sync_time, files_synced_count, status, folder_id, updated_at)
      VALUES (1, ?, ?, ?, ?, 'SYNCED', ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        last_sync_time = excluded.last_sync_time,
        files_synced_count = excluded.files_synced_count,
        status = 'SYNCED',
        folder_id = excluded.folder_id,
        updated_at = excluded.updated_at
    `).run(token, email, nowIso, syncedFiles, folderId, nowIso);

    return {
      success: true,
      filesCount: syncedFiles,
      folderId,
      syncedAt: nowIso,
      email
    };
  } catch (error: any) {
    console.error("Error syncing all client data to Google Drive:", error);
    try {
      db.prepare("UPDATE admin_drive_tokens SET status = 'ERROR' WHERE id = 1").run();
    } catch (e) {}
    return { success: false, error: error.message || "Failed to sync to Google Drive" };
  }
}

let autoSyncTimeout: any = null;
function triggerAdminDriveAutoSync() {
  if (autoSyncTimeout) clearTimeout(autoSyncTimeout);
  autoSyncTimeout = setTimeout(async () => {
    try {
      const row = db.prepare("SELECT access_token FROM admin_drive_tokens WHERE id = 1").get() as any;
      if (row && row.access_token) {
        await syncAllClientDataToDrive(row.access_token);
      }
    } catch (e) {
      console.warn("Auto-sync to Google Drive skipped:", e);
    }
  }, 2000);
}

async function startServer() {
  const app = express();
  app.use(express.json());
  app.use(cookieSession({
    name: 'session',
    keys: [process.env.SESSION_SECRET || 'accounting-secret-gst-app-2026'],
    maxAge: 30 * 24 * 60 * 60 * 1000,
    secure: true,
    sameSite: 'none'
  }));
  const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;

  // Helper to determine the effective client ID for the request
  const getContext = (req: express.Request) => {
    const session = req.session as any;
    let clientId: number | null = null;
    let role = session?.role || 'CLIENT';
    let user = null;

    if (session?.userId) {
      user = db.prepare("SELECT * FROM clients WHERE id = ?").get(session.userId) as any;
      if (user) {
        role = user.role;
      }
    }

    if (role === 'ADMIN') {
      // Admin can select client via header, query or session
      const queryId = req.query.client_id ? parseInt(req.query.client_id as string) : null;
      const headerId = req.headers['x-client-id'] ? parseInt(req.headers['x-client-id'] as string) : null;
      const sessionImp = session?.impersonatedClientId ? parseInt(session.impersonatedClientId) : null;

      clientId = queryId || headerId || sessionImp;
      if (!clientId) {
        // Fallback to client #2 (first regular client) or admin's own ID
        const firstClient = db.prepare("SELECT id FROM clients WHERE role = 'CLIENT' LIMIT 1").get() as any;
        clientId = firstClient ? firstClient.id : (user?.id || 1);
      }
    } else if (user) {
      clientId = user.id;
    } else {
      // Fallback for demo when unauthenticated
      clientId = 2; // Default to Apex Electronics
    }

    const currentClient = clientId ? db.prepare("SELECT * FROM clients WHERE id = ?").get(clientId) as any : null;

    return {
      userId: session?.userId || null,
      role,
      user,
      clientId: clientId || 2,
      currentClient,
      isAdmin: role === 'ADMIN'
    };
  };

  // --- Authentication Endpoints ---
  app.post("/api/auth/login", (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: "Username (Mobile or Email) and password are required" });
    }

    const cleanUser = username.trim().toLowerCase();
    // Allow 'admin' alias for default admin email
    let client = db.prepare(`
      SELECT * FROM clients 
      WHERE LOWER(username) = ? OR LOWER(phone) = ? OR LOWER(email) = ? OR (LOWER(?) = 'admin' AND role = 'ADMIN')
    `).get(cleanUser, cleanUser, cleanUser, cleanUser) as any;

    if (!client || client.password !== password) {
      return res.status(401).json({ error: "Invalid Mobile/Email ID or Password" });
    }

    const session = req.session as any;
    session.userId = client.id;
    session.role = client.role;
    if (client.role === 'ADMIN') {
      session.impersonatedClientId = null;
    }

    const { password: _, ...safeUser } = client;
    res.json({ success: true, user: safeUser });
  });

  app.post("/api/auth/register", (req, res) => {
    const {
      username,
      password,
      business_name,
      trade_name,
      gstin,
      state,
      state_code,
      address,
      phone,
      email,
      bank_name,
      bank_acc_no,
      bank_ifsc,
      bank_branch
    } = req.body;

    if (!username || !password || !business_name) {
      return res.status(400).json({ error: "Mobile No/Email ID, Password, and Business Name are required." });
    }

    const cleanUser = username.trim().toLowerCase();

    // Check if user already exists
    const existing = db.prepare(`
      SELECT id FROM clients 
      WHERE LOWER(username) = ? OR LOWER(phone) = ? OR LOWER(email) = ?
    `).get(cleanUser, cleanUser, cleanUser);

    if (existing) {
      return res.status(400).json({ error: "An account with this Mobile Number or Email already exists. Please Sign In." });
    }

    try {
      const insert = db.prepare(`
        INSERT INTO clients (
          username, password, role, business_name, trade_name, gstin, state, state_code,
          address, phone, email, bank_name, bank_acc_no, bank_ifsc, bank_branch, created_at
        ) VALUES (?, ?, 'CLIENT', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const result = insert.run(
        username.trim(),
        password,
        business_name.trim(),
        trade_name ? trade_name.trim() : business_name.trim(),
        gstin ? gstin.trim().toUpperCase() : null,
        state || 'Maharashtra',
        state_code || '27',
        address || '',
        phone || (cleanUser.match(/^\d+$/) ? cleanUser : ''),
        email || (cleanUser.includes('@') ? cleanUser : ''),
        bank_name || 'HDFC Bank',
        bank_acc_no || '',
        bank_ifsc || '',
        bank_branch || '',
        new Date().toISOString()
      );

      const newClientId = result.lastInsertRowid as number;

      // Seed chart of accounts for the new client
      seedAccountsForClient(newClientId, business_name.trim(), state || 'Maharashtra', state_code || '27');

      // Automatically sign in the user
      const session = req.session as any;
      session.userId = newClientId;
      session.role = 'CLIENT';

      const newClient = db.prepare("SELECT * FROM clients WHERE id = ?").get(newClientId) as any;
      const { password: _, ...safeClient } = newClient;

      res.json({ success: true, user: safeClient });
    } catch (err: any) {
      console.error("Registration error", err);
      res.status(500).json({ error: err.message || "Failed to create account" });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session = null;
    res.json({ success: true });
  });

  app.get("/api/auth/me", (req, res) => {
    const ctx = getContext(req);
    let impersonatedClient = null;
    if (ctx.isAdmin && (req.session as any)?.impersonatedClientId) {
      impersonatedClient = db.prepare("SELECT * FROM clients WHERE id = ?").get((req.session as any).impersonatedClientId);
    }
    res.json({
      user: ctx.user,
      role: ctx.role,
      currentClient: ctx.currentClient,
      impersonatedClient
    });
  });

  // --- Admin Client Management & Impersonation ---
  app.get("/api/admin/clients", (req, res) => {
    const ctx = getContext(req);
    if (!ctx.isAdmin) {
      return res.status(403).json({ error: "Access denied. Administrator only." });
    }

    const clients = db.prepare("SELECT * FROM clients ORDER BY role DESC, id ASC").all() as any[];

    // Enrich each client with basic metrics
    const enriched = clients.map(c => {
      const { password, ...safe } = c;
      const sales = db.prepare("SELECT COUNT(*) as count, COALESCE(SUM(total_amount), 0) as total FROM invoices WHERE client_id = ?").get(c.id) as any;
      const purchases = db.prepare("SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE client_id = ? AND type = 'PURCHASE'").get(c.id) as any;
      const debtors = db.prepare("SELECT COALESCE(SUM(balance), 0) as total FROM accounts WHERE client_id = ? AND group_name = 'Sundry Debtors'").get(c.id) as any;
      const creditors = db.prepare("SELECT COALESCE(SUM(balance), 0) as total FROM accounts WHERE client_id = ? AND group_name = 'Sundry Creditors'").get(c.id) as any;

      return {
        ...safe,
        sales_count: sales?.count || 0,
        sales_total: sales?.total || 0,
        purchase_total: purchases?.total || 0,
        receivables_total: Math.max(0, debtors?.total || 0),
        payables_total: Math.abs(Math.min(0, creditors?.total || 0))
      };
    });

    res.json(enriched);
  });

  app.post("/api/admin/clients", (req, res) => {
    const ctx = getContext(req);
    if (!ctx.isAdmin) {
      return res.status(403).json({ error: "Access denied. Administrator only." });
    }

    const {
      username, password, business_name, trade_name, gstin, state, state_code,
      address, phone, email, bank_name, bank_acc_no, bank_ifsc, bank_branch
    } = req.body;

    if (!username || !password || !business_name) {
      return res.status(400).json({ error: "Mobile/Email, Password, and Business Name are required." });
    }

    try {
      const insert = db.prepare(`
        INSERT INTO clients (
          username, password, role, business_name, trade_name, gstin, state, state_code,
          address, phone, email, bank_name, bank_acc_no, bank_ifsc, bank_branch, created_at
        ) VALUES (?, ?, 'CLIENT', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const result = insert.run(
        username.trim(),
        password,
        business_name.trim(),
        trade_name || business_name,
        gstin ? gstin.trim().toUpperCase() : null,
        state || 'Maharashtra',
        state_code || '27',
        address || '',
        phone || username,
        email || (username.includes('@') ? username : ''),
        bank_name || '',
        bank_acc_no || '',
        bank_ifsc || '',
        bank_branch || '',
        new Date().toISOString()
      );

      const newClientId = result.lastInsertRowid as number;
      seedAccountsForClient(newClientId, business_name, state || 'Maharashtra', state_code || '27');

      res.json({ success: true, clientId: newClientId });
    } catch (error: any) {
      console.error("Create client error", error);
      if (error.message?.includes('UNIQUE')) {
        return res.status(400).json({ error: "A client with this Mobile No or Email already exists." });
      }
      res.status(500).json({ error: "Failed to create client" });
    }
  });

  app.put("/api/admin/clients/:id", (req, res) => {
    const ctx = getContext(req);
    if (!ctx.isAdmin) {
      return res.status(403).json({ error: "Access denied. Administrator only." });
    }

    const { id } = req.params;
    const {
      business_name, trade_name, gstin, state, state_code,
      address, phone, email, bank_name, bank_acc_no, bank_ifsc, bank_branch, password
    } = req.body;

    try {
      if (password) {
        db.prepare(`
          UPDATE clients SET
            business_name = ?, trade_name = ?, gstin = ?, state = ?, state_code = ?,
            address = ?, phone = ?, email = ?, bank_name = ?, bank_acc_no = ?, bank_ifsc = ?, bank_branch = ?, password = ?
          WHERE id = ?
        `).run(business_name, trade_name, gstin, state, state_code, address, phone, email, bank_name, bank_acc_no, bank_ifsc, bank_branch, password, id);
      } else {
        db.prepare(`
          UPDATE clients SET
            business_name = ?, trade_name = ?, gstin = ?, state = ?, state_code = ?,
            address = ?, phone = ?, email = ?, bank_name = ?, bank_acc_no = ?, bank_ifsc = ?, bank_branch = ?
          WHERE id = ?
        `).run(business_name, trade_name, gstin, state, state_code, address, phone, email, bank_name, bank_acc_no, bank_ifsc, bank_branch, id);
      }
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message || "Failed to update client" });
    }
  });

  app.delete("/api/admin/clients/:id", (req, res) => {
    const ctx = getContext(req);
    if (!ctx.isAdmin) {
      return res.status(403).json({ error: "Access denied. Administrator only." });
    }

    const { id } = req.params;
    // Prevent deleting admin
    const target = db.prepare("SELECT role FROM clients WHERE id = ?").get(id) as any;
    if (target?.role === 'ADMIN') {
      return res.status(400).json({ error: "Cannot delete administrator account." });
    }

    db.prepare("DELETE FROM transactions WHERE client_id = ?").run(id);
    db.prepare("DELETE FROM invoices WHERE client_id = ?").run(id);
    db.prepare("DELETE FROM inventory_items WHERE client_id = ?").run(id);
    db.prepare("DELETE FROM accounts WHERE client_id = ?").run(id);
    db.prepare("DELETE FROM clients WHERE id = ?").run(id);

    if ((req.session as any)?.impersonatedClientId == id) {
      (req.session as any).impersonatedClientId = null;
    }

    res.json({ success: true });
  });

  app.post("/api/admin/impersonate/:clientId", (req, res) => {
    const ctx = getContext(req);
    if (!ctx.isAdmin) {
      return res.status(403).json({ error: "Access denied. Administrator only." });
    }
    const client = db.prepare("SELECT * FROM clients WHERE id = ?").get(req.params.clientId) as any;
    if (!client) return res.status(404).json({ error: "Client not found" });

    (req.session as any).impersonatedClientId = client.id;
    res.json({ success: true, client });
  });

  app.post("/api/admin/exit-impersonate", (req, res) => {
    (req.session as any).impersonatedClientId = null;
    res.json({ success: true });
  });

  // --- GST Reports API (for Administrator and Client) ---
  app.get("/api/admin/gst-reports", (req, res) => {
    const ctx = getContext(req);
    const targetClientId = req.query.client_id ? parseInt(req.query.client_id as string) : ctx.clientId;

    const client = db.prepare("SELECT * FROM clients WHERE id = ?").get(targetClientId) as any;
    if (!client) return res.status(404).json({ error: "Client not found" });

    // Outward Supplies (Invoices)
    const invoices = db.prepare(`
      SELECT i.*, a.name as customer_name, a.gstin as customer_gstin 
      FROM invoices i
      LEFT JOIN accounts a ON i.customer_id = a.id
      WHERE i.client_id = ?
      ORDER BY date DESC
    `).all(targetClientId) as any[];

    const parsedInvoices = invoices.map(inv => ({
      ...inv,
      items: typeof inv.items === 'string' ? JSON.parse(inv.items) : (inv.items || [])
    }));

    // B2B: Invoices where customer has GSTIN or buyer_gstin is present
    const b2bInvoices = parsedInvoices.filter(inv => !!(inv.buyer_gstin || inv.customer_gstin));
    const b2cInvoices = parsedInvoices.filter(inv => !(inv.buyer_gstin || inv.customer_gstin));

    const calcTotals = (list: any[]) => list.reduce((acc, inv) => {
      acc.taxable += (inv.total_amount - (inv.cgst_total || 0) - (inv.sgst_total || 0) - (inv.igst_total || 0));
      acc.cgst += (inv.cgst_total || 0);
      acc.sgst += (inv.sgst_total || 0);
      acc.igst += (inv.igst_total || 0);
      acc.total += inv.total_amount;
      return acc;
    }, { taxable: 0, cgst: 0, sgst: 0, igst: 0, total: 0 });

    const b2bTotals = calcTotals(b2bInvoices);
    const b2cTotals = calcTotals(b2cInvoices);
    const overallOutwardTotals = calcTotals(parsedInvoices);

    // HSN Summary aggregation
    const hsnMap: Record<string, { hsn: string; description: string; qty: number; taxable_value: number; rate: number; cgst: number; sgst: number; igst: number }> = {};
    for (const inv of parsedInvoices) {
      for (const item of (inv.items || [])) {
        const key = item.hsn_code || 'OTHER';
        if (!hsnMap[key]) {
          hsnMap[key] = {
            hsn: key,
            description: item.description || 'Goods/Services',
            qty: 0,
            taxable_value: 0,
            rate: item.gst_rate || 0,
            cgst: 0,
            sgst: 0,
            igst: 0
          };
        }
        const itemTaxable = (item.quantity || 1) * (item.price || 0);
        hsnMap[key].qty += (item.quantity || 0);
        hsnMap[key].taxable_value += itemTaxable;
        hsnMap[key].cgst += (item.cgst || 0);
        hsnMap[key].sgst += (item.sgst || 0);
        hsnMap[key].igst += (item.igst || 0);
      }
    }

    // Inward Supplies / ITC (GSTR-2B)
    const purchases = db.prepare(`
      SELECT t.*, d.name as debit_account_name, c.name as credit_account_name 
      FROM transactions t
      LEFT JOIN accounts d ON t.debit_account_id = d.id
      LEFT JOIN accounts c ON t.credit_account_id = c.id
      WHERE t.client_id = ? AND (t.type = 'PURCHASE' OR t.voucher_type = 'PURCHASE')
      ORDER BY date DESC
    `).all(targetClientId) as any[];

    // Read GST Input balances from accounts
    const cgstIn = db.prepare("SELECT balance FROM accounts WHERE client_id = ? AND name = 'CGST Input'").get(targetClientId) as any;
    const sgstIn = db.prepare("SELECT balance FROM accounts WHERE client_id = ? AND name = 'SGST Input'").get(targetClientId) as any;
    const igstIn = db.prepare("SELECT balance FROM accounts WHERE client_id = ? AND name = 'IGST Input'").get(targetClientId) as any;

    const itcCgst = Math.abs(cgstIn?.balance || 0);
    const itcSgst = Math.abs(sgstIn?.balance || 0);
    const itcIgst = Math.abs(igstIn?.balance || 0);
    const totalItc = itcCgst + itcSgst + itcIgst;

    const totalInwardPurchases = purchases.reduce((sum, p) => sum + (p.amount || 0), 0);

    // GSTR-3B Summary
    const outwardIgst = overallOutwardTotals.igst;
    const outwardCgst = overallOutwardTotals.cgst;
    const outwardSgst = overallOutwardTotals.sgst;
    const totalOutwardTax = outwardIgst + outwardCgst + outwardSgst;

    const netPayableIgst = Math.max(0, outwardIgst - itcIgst);
    const netPayableCgst = Math.max(0, outwardCgst - itcCgst);
    const netPayableSgst = Math.max(0, outwardSgst - itcSgst);
    const totalNetPayable = netPayableIgst + netPayableCgst + netPayableSgst;

    const { password: _, ...safeClient } = client;

    res.json({
      period: new Date().toISOString().slice(0, 7), // YYYY-MM
      client: safeClient,
      gstr1: {
        b2b_invoices_count: b2bInvoices.length,
        b2b_taxable_value: b2bTotals.taxable,
        b2b_cgst: b2bTotals.cgst,
        b2b_sgst: b2bTotals.sgst,
        b2b_igst: b2bTotals.igst,
        b2b_total: b2bTotals.total,
        b2c_invoices_count: b2cInvoices.length,
        b2c_taxable_value: b2cTotals.taxable,
        b2c_cgst: b2cTotals.cgst,
        b2c_sgst: b2cTotals.sgst,
        b2c_igst: b2cTotals.igst,
        b2c_total: b2cTotals.total,
        total_taxable_value: overallOutwardTotals.taxable,
        total_cgst: overallOutwardTotals.cgst,
        total_sgst: overallOutwardTotals.sgst,
        total_igst: overallOutwardTotals.igst,
        total_tax_liability: overallOutwardTotals.cgst + overallOutwardTotals.sgst + overallOutwardTotals.igst,
        hsn_summary: Object.values(hsnMap),
        invoices: parsedInvoices
      },
      gstr2b: {
        total_inward_purchases: totalInwardPurchases,
        eligible_itc_cgst: itcCgst,
        eligible_itc_sgst: itcSgst,
        eligible_itc_igst: itcIgst,
        total_itc_available: totalItc,
        purchases
      },
      gstr3b: {
        outward_taxable_value: overallOutwardTotals.taxable,
        outward_igst: outwardIgst,
        outward_cgst: outwardCgst,
        outward_sgst: outwardSgst,
        total_outward_tax: totalOutwardTax,
        itc_igst: itcIgst,
        itc_cgst: itcCgst,
        itc_sgst: itcSgst,
        total_itc: totalItc,
        net_payable_igst: netPayableIgst,
        net_payable_cgst: netPayableCgst,
        net_payable_sgst: netPayableSgst,
        total_net_payable: totalNetPayable
      }
    });
  });

  // --- Month-wise Sales & Purchases Analysis API ---
  app.get("/api/reports/monthwise", (req, res) => {
    const ctx = getContext(req);
    const targetClientId = req.query.client_id ? parseInt(req.query.client_id as string) : ctx.clientId;

    if (!targetClientId) {
      return res.status(400).json({ error: "Client ID required" });
    }

    const client = db.prepare("SELECT * FROM clients WHERE id = ?").get(targetClientId) as any;
    if (!client) return res.status(404).json({ error: "Client not found" });

    // 1. Get all Invoices for this client
    const invoices = db.prepare(`
      SELECT i.*, a.name as customer_name, a.gstin as customer_gstin
      FROM invoices i
      LEFT JOIN accounts a ON i.customer_id = a.id
      WHERE i.client_id = ?
      ORDER BY i.date ASC
    `).all(targetClientId) as any[];

    // 2. Get all Transactions for this client
    const transactions = db.prepare(`
      SELECT t.*, d.name as debit_name, c.name as credit_name, p.name as party_name, p.gstin as party_gstin
      FROM transactions t
      LEFT JOIN accounts d ON t.debit_account_id = d.id
      LEFT JOIN accounts c ON t.credit_account_id = c.id
      LEFT JOIN accounts p ON t.party_id = p.id
      WHERE t.client_id = ?
      ORDER BY t.date ASC
    `).all(targetClientId) as any[];

    // Grouping map by 'YYYY-MM'
    const monthMap: Record<string, any> = {};

    const monthNames = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];
    const monthShort = [
      "Jan", "Feb", "Mar", "Apr", "May", "Jun",
      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
    ];

    const getMonthRecord = (monthKey: string) => {
      if (!monthMap[monthKey]) {
        const [yearStr, monthStr] = monthKey.split('-');
        const year = parseInt(yearStr);
        const monthNum = parseInt(monthStr);
        const fy = monthNum >= 4 
          ? `FY ${year}-${(year + 1).toString().slice(-2)}` 
          : `FY ${year - 1}-${year.toString().slice(-2)}`;
        
        let quarter = 'Q4';
        if (monthNum >= 4 && monthNum <= 6) quarter = 'Q1';
        else if (monthNum >= 7 && monthNum <= 9) quarter = 'Q2';
        else if (monthNum >= 10 && monthNum <= 12) quarter = 'Q3';

        monthMap[monthKey] = {
          month_key: monthKey,
          month_name: `${monthShort[monthNum - 1]} ${year}`,
          full_month_name: `${monthNames[monthNum - 1]} ${year}`,
          year,
          month_number: monthNum,
          fy,
          quarter,
          sales_amount: 0,
          sales_taxable: 0,
          sales_cgst: 0,
          sales_sgst: 0,
          sales_igst: 0,
          sales_tax_total: 0,
          sales_count: 0,
          purchase_amount: 0,
          purchase_taxable: 0,
          purchase_cgst: 0,
          purchase_sgst: 0,
          purchase_igst: 0,
          purchase_tax_total: 0,
          purchase_count: 0,
          net_margin: 0,
          net_taxable_margin: 0,
          net_gst_payable: 0,
          sales_items: [],
          purchase_items: []
        };
      }
      return monthMap[monthKey];
    };

    // Process Invoices for Sales
    for (const inv of invoices) {
      if (!inv.date) continue;
      const monthKey = inv.date.slice(0, 7);
      const rec = getMonthRecord(monthKey);

      const cgst = inv.cgst_total || 0;
      const sgst = inv.sgst_total || 0;
      const igst = inv.igst_total || 0;
      const taxTotal = cgst + sgst + igst;
      const taxable = inv.total_amount - taxTotal;

      rec.sales_amount += inv.total_amount;
      rec.sales_taxable += taxable;
      rec.sales_cgst += cgst;
      rec.sales_sgst += sgst;
      rec.sales_igst += igst;
      rec.sales_tax_total += taxTotal;
      rec.sales_count += 1;

      rec.sales_items.push({
        id: inv.id,
        invoice_id: inv.id,
        date: inv.date,
        ref_no: inv.invoice_number,
        party_name: inv.customer_name || 'Customer',
        description: `Tax Invoice ${inv.invoice_number}`,
        taxable_value: taxable,
        cgst,
        sgst,
        igst,
        total_tax: taxTotal,
        total_amount: inv.total_amount,
        type: 'SALE'
      });
    }

    // Process Transactions for Purchases and supplementary Sales
    for (const t of transactions) {
      if (!t.date) continue;
      const monthKey = t.date.slice(0, 7);
      const rec = getMonthRecord(monthKey);

      if (t.type === 'PURCHASE' || t.voucher_type === 'PURCHASE') {
        const isTaxEntry = t.description?.toLowerCase().includes('input cgst') || 
                           t.description?.toLowerCase().includes('input sgst') || 
                           t.description?.toLowerCase().includes('input igst');
        
        if (isTaxEntry) {
          if (t.description?.toLowerCase().includes('cgst')) rec.purchase_cgst += t.amount;
          else if (t.description?.toLowerCase().includes('sgst')) rec.purchase_sgst += t.amount;
          else if (t.description?.toLowerCase().includes('igst')) rec.purchase_igst += t.amount;
          rec.purchase_tax_total += t.amount;
          rec.purchase_amount += t.amount; // Add tax to gross purchase
        } else {
          // Primary purchase entry
          rec.purchase_amount += t.amount;
          rec.purchase_taxable += t.amount;
          rec.purchase_count += 1;

          rec.purchase_items.push({
            id: t.id,
            date: t.date,
            ref_no: t.ref_no || `PUR-${t.id}`,
            party_name: t.party_name || t.credit_name || 'Supplier',
            description: t.description || 'Purchase Bill',
            taxable_value: t.amount,
            cgst: 0,
            sgst: 0,
            igst: 0,
            total_tax: 0,
            total_amount: t.amount,
            type: 'PURCHASE'
          });
        }
      } else if ((t.type === 'SALE' || t.voucher_type === 'SALE') && invoices.length === 0) {
        rec.sales_amount += t.amount;
        rec.sales_taxable += t.amount;
        rec.sales_count += 1;
        rec.sales_items.push({
          id: t.id,
          date: t.date,
          ref_no: t.ref_no || `SALE-${t.id}`,
          party_name: t.party_name || t.debit_name || 'Customer',
          description: t.description || 'Sales Entry',
          taxable_value: t.amount,
          cgst: 0,
          sgst: 0,
          igst: 0,
          total_tax: 0,
          total_amount: t.amount,
          type: 'SALE'
        });
      }
    }

    const monthsList = Object.values(monthMap).sort((a: any, b: any) => a.month_key.localeCompare(b.month_key));
    const fySet = new Set<string>();

    monthsList.forEach((m: any) => {
      m.net_margin = m.sales_amount - m.purchase_amount;
      m.net_taxable_margin = m.sales_taxable - m.purchase_taxable;
      m.net_gst_payable = m.sales_tax_total - m.purchase_tax_total;
      fySet.add(m.fy);
    });

    const summary = monthsList.reduce((acc: any, m: any) => {
      acc.total_sales += m.sales_amount;
      acc.total_sales_taxable += m.sales_taxable;
      acc.total_purchases += m.purchase_amount;
      acc.total_purchases_taxable += m.purchase_taxable;
      acc.net_margin += m.net_margin;
      acc.total_output_gst += m.sales_tax_total;
      acc.total_input_itc += m.purchase_tax_total;
      acc.net_gst_payable += m.net_gst_payable;
      acc.total_sales_count += m.sales_count;
      acc.total_purchase_count += m.purchase_count;
      return acc;
    }, {
      total_sales: 0,
      total_sales_taxable: 0,
      total_purchases: 0,
      total_purchases_taxable: 0,
      net_margin: 0,
      total_output_gst: 0,
      total_input_itc: 0,
      net_gst_payable: 0,
      total_sales_count: 0,
      total_purchase_count: 0
    });

    const { password: _, ...safeClient } = client;

    res.json({
      client: safeClient,
      financial_years: Array.from(fySet),
      months: monthsList,
      summary
    });
  });

  // --- Dedicated Accounting Vouchers API ---

  // 1. Payment Made to Creditor (Debit Creditor, Credit Bank/Cash)
  app.post("/api/vouchers/payment", (req, res) => {
    const ctx = getContext(req);
    const { creditor_id, payment_mode_account_id, amount, date, ref_no, narration } = req.body;

    if (!creditor_id || !payment_mode_account_id || !amount) {
      return res.status(400).json({ error: "Creditor, Payment Mode (Bank/Cash), and Amount are required." });
    }

    const amt = parseFloat(amount);
    const creditor = db.prepare("SELECT name FROM accounts WHERE id = ? AND client_id = ?").get(creditor_id, ctx.clientId) as any;
    const paymentAcc = db.prepare("SELECT name FROM accounts WHERE id = ? AND client_id = ?").get(payment_mode_account_id, ctx.clientId) as any;

    if (!creditor || !paymentAcc) {
      return res.status(404).json({ error: "Invalid Creditor or Payment Account" });
    }

    const desc = narration || `Payment made to ${creditor.name} (${ref_no ? 'Ref: ' + ref_no : paymentAcc.name})`;

    const insert = db.prepare(`
      INSERT INTO transactions (
        client_id, date, description, amount, type, voucher_type, ref_no, party_id, debit_account_id, credit_account_id
      ) VALUES (?, ?, ?, ?, 'PAYMENT', 'PAYMENT', ?, ?, ?, ?)
    `);

    const result = insert.run(
      ctx.clientId,
      date || new Date().toISOString().split('T')[0],
      desc,
      amt,
      ref_no || '',
      creditor_id,
      creditor_id, // Debit creditor (reduces liability)
      payment_mode_account_id // Credit bank/cash (reduces cash/bank)
    );

    // Update balances:
    // Creditor is liability (credit balance normally negative or credit). Debiting increases liability balance towards zero.
    db.prepare("UPDATE accounts SET balance = balance + ? WHERE id = ?").run(amt, creditor_id);
    // Paying bank/cash (asset). Crediting reduces asset balance.
    db.prepare("UPDATE accounts SET balance = balance - ? WHERE id = ?").run(amt, payment_mode_account_id);

    triggerAdminDriveAutoSync();
    res.json({ success: true, id: result.lastInsertRowid });
  });

  // 2. Payment Received from Debtor (Debit Bank/Cash, Credit Debtor)
  app.post("/api/vouchers/receipt", (req, res) => {
    const ctx = getContext(req);
    const { debtor_id, receipt_mode_account_id, amount, date, ref_no, narration } = req.body;

    if (!debtor_id || !receipt_mode_account_id || !amount) {
      return res.status(400).json({ error: "Debtor, Receipt Mode (Bank/Cash), and Amount are required." });
    }

    const amt = parseFloat(amount);
    const debtor = db.prepare("SELECT name FROM accounts WHERE id = ? AND client_id = ?").get(debtor_id, ctx.clientId) as any;
    const modeAcc = db.prepare("SELECT name FROM accounts WHERE id = ? AND client_id = ?").get(receipt_mode_account_id, ctx.clientId) as any;

    if (!debtor || !modeAcc) {
      return res.status(404).json({ error: "Invalid Debtor or Receipt Account" });
    }

    const desc = narration || `Payment received from ${debtor.name} (${ref_no ? 'Ref: ' + ref_no : modeAcc.name})`;

    const insert = db.prepare(`
      INSERT INTO transactions (
        client_id, date, description, amount, type, voucher_type, ref_no, party_id, debit_account_id, credit_account_id
      ) VALUES (?, ?, ?, ?, 'RECEIPT', 'RECEIPT', ?, ?, ?, ?)
    `);

    const result = insert.run(
      ctx.clientId,
      date || new Date().toISOString().split('T')[0],
      desc,
      amt,
      ref_no || '',
      debtor_id,
      receipt_mode_account_id, // Debit Bank/Cash (increases asset)
      debtor_id // Credit Debtor (decreases receivable)
    );

    db.prepare("UPDATE accounts SET balance = balance + ? WHERE id = ?").run(amt, receipt_mode_account_id);
    db.prepare("UPDATE accounts SET balance = balance - ? WHERE id = ?").run(amt, debtor_id);

    triggerAdminDriveAutoSync();
    res.json({ success: true, id: result.lastInsertRowid });
  });

  // 3. Party Outstanding Summary (Debtors & Creditors)
  app.get("/api/parties/summary", (req, res) => {
    const ctx = getContext(req);

    const debtors = db.prepare(`
      SELECT id, name, group_name, balance, gstin, phone, state, state_code
      FROM accounts
      WHERE client_id = ? AND group_name = 'Sundry Debtors'
      ORDER BY balance DESC
    `).all(ctx.clientId) as any[];

    const creditors = db.prepare(`
      SELECT id, name, group_name, balance, gstin, phone, state, state_code
      FROM accounts
      WHERE client_id = ? AND group_name = 'Sundry Creditors'
      ORDER BY balance ASC
    `).all(ctx.clientId) as any[];

    res.json({
      debtors: debtors.map(d => ({ ...d, outstanding_amount: d.balance })),
      creditors: creditors.map(c => ({ ...c, outstanding_amount: Math.abs(c.balance) }))
    });
  });

  // --- Scoped Account (Ledger) API ---
  app.get("/api/accounts", (req, res) => {
    const ctx = getContext(req);
    const accounts = db.prepare("SELECT * FROM accounts WHERE client_id = ? ORDER BY name ASC").all(ctx.clientId);
    res.json(accounts);
  });

  app.post("/api/accounts", (req, res) => {
    const ctx = getContext(req);
    const { name, type, group_name, balance, gstin, state, state_code, phone, address } = req.body;
    const insert = db.prepare(`
      INSERT INTO accounts (client_id, name, type, group_name, balance, gstin, state, state_code, phone, address)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const result = insert.run(
      ctx.clientId,
      name,
      type,
      group_name,
      balance || 0,
      gstin || null,
      state || ctx.currentClient?.state || 'Maharashtra',
      state_code || ctx.currentClient?.state_code || '27',
      phone || null,
      address || null
    );
    triggerAdminDriveAutoSync();
    res.json({ id: result.lastInsertRowid, name, type, group_name, balance: balance || 0 });
  });

  app.put("/api/accounts/:id", (req, res) => {
    const ctx = getContext(req);
    const { name, type, group_name, balance, gstin, state, state_code, phone, address } = req.body;
    db.prepare(`
      UPDATE accounts 
      SET name = ?, type = ?, group_name = ?, balance = ?, gstin = ?, state = ?, state_code = ?, phone = ?, address = ?
      WHERE id = ? AND client_id = ?
    `).run(name, type, group_name, balance, gstin, state, state_code, phone, address, req.params.id, ctx.clientId);
    triggerAdminDriveAutoSync();
    res.json({ success: true });
  });

  app.delete("/api/accounts/:id", (req, res) => {
    const ctx = getContext(req);
    db.prepare("DELETE FROM accounts WHERE id = ? AND client_id = ?").run(req.params.id, ctx.clientId);
    triggerAdminDriveAutoSync();
    res.json({ success: true });
  });

  // --- Scoped Inventory API ---
  app.get("/api/inventory", (req, res) => {
    const ctx = getContext(req);
    const items = db.prepare("SELECT * FROM inventory_items WHERE client_id = ?").all(ctx.clientId);
    res.json(items);
  });

  app.post("/api/inventory", (req, res) => {
    const ctx = getContext(req);
    const { name, hsn_code, gst_rate, unit, sale_price, purchase_price, current_stock } = req.body;
    const insert = db.prepare(`
      INSERT INTO inventory_items (client_id, name, hsn_code, gst_rate, unit, sale_price, purchase_price, current_stock)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const result = insert.run(ctx.clientId, name, hsn_code, gst_rate, unit, sale_price, purchase_price, current_stock || 0);
    triggerAdminDriveAutoSync();
    res.json({ id: result.lastInsertRowid });
  });

  app.put("/api/inventory/:id", (req, res) => {
    const ctx = getContext(req);
    const { name, hsn_code, gst_rate, unit, sale_price, purchase_price, current_stock } = req.body;
    db.prepare(`
      UPDATE inventory_items 
      SET name = ?, hsn_code = ?, gst_rate = ?, unit = ?, sale_price = ?, purchase_price = ?, current_stock = ?
      WHERE id = ? AND client_id = ?
    `).run(name, hsn_code, gst_rate, unit, sale_price, purchase_price, current_stock, req.params.id, ctx.clientId);
    triggerAdminDriveAutoSync();
    res.json({ success: true });
  });

  app.delete("/api/inventory/:id", (req, res) => {
    const ctx = getContext(req);
    db.prepare("DELETE FROM inventory_items WHERE id = ? AND client_id = ?").run(req.params.id, ctx.clientId);
    triggerAdminDriveAutoSync();
    res.json({ success: true });
  });

  // --- Scoped Transactions API ---
  app.get("/api/transactions", (req, res) => {
    const ctx = getContext(req);
    const transactions = db.prepare(`
      SELECT t.*, d.name as debit_account_name, c.name as credit_account_name 
      FROM transactions t
      LEFT JOIN accounts d ON t.debit_account_id = d.id
      LEFT JOIN accounts c ON t.credit_account_id = c.id
      WHERE t.client_id = ?
      ORDER BY date DESC, id DESC
    `).all(ctx.clientId);
    res.json(transactions);
  });

  app.post("/api/transactions", (req, res) => {
    const ctx = getContext(req);
    const { date, description, amount, type, voucher_type, ref_no, party_id, debit_account_id, credit_account_id } = req.body;
    
    const insert = db.prepare(`
      INSERT INTO transactions (client_id, date, description, amount, type, voucher_type, ref_no, party_id, debit_account_id, credit_account_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    const result = insert.run(
      ctx.clientId,
      date,
      description,
      amount,
      type,
      voucher_type || type,
      ref_no || null,
      party_id || null,
      debit_account_id,
      credit_account_id
    );
    
    // Update account balances
    if (debit_account_id) {
      db.prepare("UPDATE accounts SET balance = balance + ? WHERE id = ?").run(amount, debit_account_id);
    }
    if (credit_account_id) {
      db.prepare("UPDATE accounts SET balance = balance - ? WHERE id = ?").run(amount, credit_account_id);
    }

    triggerAdminDriveAutoSync();
    res.json({ id: result.lastInsertRowid });
  });

  app.put("/api/transactions/:id", (req, res) => {
    const ctx = getContext(req);
    const { id } = req.params;
    const { date, description, amount, type, voucher_type, ref_no, party_id, debit_account_id, credit_account_id } = req.body;
    
    // Get old transaction to reverse balances
    const old = db.prepare("SELECT * FROM transactions WHERE id = ? AND client_id = ?").get(id, ctx.clientId) as any;
    if (!old) return res.status(404).json({ error: "Transaction not found" });

    // Reverse old balances
    if (old.debit_account_id) {
      db.prepare("UPDATE accounts SET balance = balance - ? WHERE id = ?").run(old.amount, old.debit_account_id);
    }
    if (old.credit_account_id) {
      db.prepare("UPDATE accounts SET balance = balance + ? WHERE id = ?").run(old.amount, old.credit_account_id);
    }

    // Update transaction
    db.prepare(`
      UPDATE transactions 
      SET date = ?, description = ?, amount = ?, type = ?, voucher_type = ?, ref_no = ?, party_id = ?, debit_account_id = ?, credit_account_id = ?
      WHERE id = ? AND client_id = ?
    `).run(date, description, amount, type, voucher_type || type, ref_no || null, party_id || null, debit_account_id, credit_account_id, id, ctx.clientId);

    // Apply new balances
    if (debit_account_id) {
      db.prepare("UPDATE accounts SET balance = balance + ? WHERE id = ?").run(amount, debit_account_id);
    }
    if (credit_account_id) {
      db.prepare("UPDATE accounts SET balance = balance - ? WHERE id = ?").run(amount, credit_account_id);
    }

    triggerAdminDriveAutoSync();
    res.json({ success: true });
  });

  app.delete("/api/transactions/:id", (req, res) => {
    const ctx = getContext(req);
    const { id } = req.params;
    const old = db.prepare("SELECT * FROM transactions WHERE id = ? AND client_id = ?").get(id, ctx.clientId) as any;
    if (!old) return res.status(404).json({ error: "Transaction not found" });

    // Reverse balances
    if (old.debit_account_id) {
      db.prepare("UPDATE accounts SET balance = balance - ? WHERE id = ?").run(old.amount, old.debit_account_id);
    }
    if (old.credit_account_id) {
      db.prepare("UPDATE accounts SET balance = balance + ? WHERE id = ?").run(old.amount, old.credit_account_id);
    }

    db.prepare("DELETE FROM transactions WHERE id = ? AND client_id = ?").run(id, ctx.clientId);
    triggerAdminDriveAutoSync();
    res.json({ success: true });
  });

  // --- GST Invoices API ---
  app.get("/api/invoices", (req, res) => {
    const ctx = getContext(req);
    const invoices = db.prepare(`
      SELECT i.*, a.name as customer_name, a.gstin as customer_gstin, a.state as customer_state, a.address as customer_address
      FROM invoices i
      LEFT JOIN accounts a ON i.customer_id = a.id
      WHERE i.client_id = ?
      ORDER BY date DESC, id DESC
    `).all(ctx.clientId) as any[];

    res.json(invoices.map(inv => ({
      ...inv,
      items: typeof inv.items === 'string' ? JSON.parse(inv.items) : (inv.items || [])
    })));
  });

  app.post("/api/invoices", (req, res) => {
    const ctx = getContext(req);
    const {
      invoice_number, date, customer_id, total_amount, cgst_total, sgst_total, igst_total,
      items, place_of_supply, place_of_supply_code, is_interstate,
      buyer_gstin, buyer_address, buyer_state, buyer_state_code, reverse_charge, vehicle_no, notes
    } = req.body;

    const supplierStateCode = ctx.currentClient?.state_code || '27';
    const computedInterstate = is_interstate !== undefined ? is_interstate : (place_of_supply_code && place_of_supply_code !== supplierStateCode ? 1 : 0);

    const insert = db.prepare(`
      INSERT INTO invoices (
        client_id, invoice_number, date, customer_id, total_amount, cgst_total, sgst_total, igst_total,
        status, items, place_of_supply, place_of_supply_code, is_interstate,
        buyer_gstin, buyer_address, buyer_state, buyer_state_code, reverse_charge, vehicle_no, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = insert.run(
      ctx.clientId,
      invoice_number,
      date,
      customer_id,
      total_amount,
      cgst_total || 0,
      sgst_total || 0,
      igst_total || 0,
      JSON.stringify(items || []),
      place_of_supply || ctx.currentClient?.state,
      place_of_supply_code || supplierStateCode,
      computedInterstate,
      buyer_gstin || null,
      buyer_address || null,
      buyer_state || null,
      buyer_state_code || null,
      reverse_charge || 'No',
      vehicle_no || null,
      notes || null
    );

    const invoiceId = result.lastInsertRowid;

    // Automatically record the corresponding Journal/Sales Transaction for full accounting integration
    try {
      const salesAccount = db.prepare("SELECT id FROM accounts WHERE client_id = ? AND name = 'Sales Revenue'").get(ctx.clientId) as any;
      const customer = db.prepare("SELECT name FROM accounts WHERE id = ?").get(customer_id) as any;

      const taxableValue = total_amount - (cgst_total || 0) - (sgst_total || 0) - (igst_total || 0);

      if (salesAccount && customer) {
        // 1. Debit Customer / Credit Sales for taxable value
        db.prepare(`
          INSERT INTO transactions (client_id, date, description, amount, type, voucher_type, ref_no, party_id, debit_account_id, credit_account_id)
          VALUES (?, ?, ?, ?, 'SALE', 'SALE', ?, ?, ?, ?)
        `).run(ctx.clientId, date, `Invoice ${invoice_number}: ${customer.name}`, taxableValue, invoice_number, customer_id, customer_id, salesAccount.id);

        db.prepare("UPDATE accounts SET balance = balance + ? WHERE id = ?").run(taxableValue, customer_id);
        db.prepare("UPDATE accounts SET balance = balance - ? WHERE id = ?").run(taxableValue, salesAccount.id);

        // 2. GST Output duties entries
        if (computedInterstate === 1 && (igst_total || 0) > 0) {
          const igstOutput = db.prepare("SELECT id FROM accounts WHERE client_id = ? AND name = 'IGST Output'").get(ctx.clientId) as any;
          if (igstOutput) {
            db.prepare(`
              INSERT INTO transactions (client_id, date, description, amount, type, voucher_type, ref_no, party_id, debit_account_id, credit_account_id)
              VALUES (?, ?, ?, ?, 'JOURNAL', 'SALE', ?, ?, ?, ?)
            `).run(ctx.clientId, date, `IGST Output (18%) on ${invoice_number}`, igst_total, invoice_number, customer_id, customer_id, igstOutput.id);

            db.prepare("UPDATE accounts SET balance = balance + ? WHERE id = ?").run(igst_total, customer_id);
            db.prepare("UPDATE accounts SET balance = balance - ? WHERE id = ?").run(igst_total, igstOutput.id);
          }
        } else {
          if ((cgst_total || 0) > 0) {
            const cgstOutput = db.prepare("SELECT id FROM accounts WHERE client_id = ? AND name = 'CGST Output'").get(ctx.clientId) as any;
            if (cgstOutput) {
              db.prepare(`
                INSERT INTO transactions (client_id, date, description, amount, type, voucher_type, ref_no, party_id, debit_account_id, credit_account_id)
                VALUES (?, ?, ?, ?, 'JOURNAL', 'SALE', ?, ?, ?, ?)
              `).run(ctx.clientId, date, `CGST Output (9%) on ${invoice_number}`, cgst_total, invoice_number, customer_id, customer_id, cgstOutput.id);

              db.prepare("UPDATE accounts SET balance = balance + ? WHERE id = ?").run(cgst_total, customer_id);
              db.prepare("UPDATE accounts SET balance = balance - ? WHERE id = ?").run(cgst_total, cgstOutput.id);
            }
          }
          if ((sgst_total || 0) > 0) {
            const sgstOutput = db.prepare("SELECT id FROM accounts WHERE client_id = ? AND name = 'SGST Output'").get(ctx.clientId) as any;
            if (sgstOutput) {
              db.prepare(`
                INSERT INTO transactions (client_id, date, description, amount, type, voucher_type, ref_no, party_id, debit_account_id, credit_account_id)
                VALUES (?, ?, ?, ?, 'JOURNAL', 'SALE', ?, ?, ?, ?)
              `).run(ctx.clientId, date, `SGST Output (9%) on ${invoice_number}`, sgst_total, invoice_number, customer_id, customer_id, sgstOutput.id);

              db.prepare("UPDATE accounts SET balance = balance + ? WHERE id = ?").run(sgst_total, customer_id);
              db.prepare("UPDATE accounts SET balance = balance - ? WHERE id = ?").run(sgst_total, sgstOutput.id);
            }
          }
        }
      }
    } catch (e) {
      console.error("Auto transaction error for invoice", e);
    }

    triggerAdminDriveAutoSync();
    res.json({ id: invoiceId });
  });

  app.put("/api/invoices/:id", (req, res) => {
    const ctx = getContext(req);
    const { id } = req.params;
    const {
      invoice_number, date, customer_id, total_amount, cgst_total, sgst_total, igst_total,
      items, place_of_supply, place_of_supply_code, is_interstate,
      buyer_gstin, buyer_address, buyer_state, buyer_state_code, reverse_charge, vehicle_no, notes, status
    } = req.body;

    const oldInv = db.prepare("SELECT * FROM invoices WHERE id = ? AND client_id = ?").get(id, ctx.clientId) as any;
    if (!oldInv) return res.status(404).json({ error: "Invoice not found" });

    const supplierStateCode = ctx.currentClient?.state_code || '27';
    const computedInterstate = is_interstate !== undefined ? is_interstate : (place_of_supply_code && place_of_supply_code !== supplierStateCode ? 1 : 0);

    // 1. Reverse previous accounting transactions linked to old invoice_number
    try {
      const oldTransactions = db.prepare("SELECT * FROM transactions WHERE client_id = ? AND ref_no = ?").all(ctx.clientId, oldInv.invoice_number) as any[];
      for (const t of oldTransactions) {
        if (t.debit_account_id) {
          db.prepare("UPDATE accounts SET balance = balance - ? WHERE id = ?").run(t.amount, t.debit_account_id);
        }
        if (t.credit_account_id) {
          db.prepare("UPDATE accounts SET balance = balance + ? WHERE id = ?").run(t.amount, t.credit_account_id);
        }
      }
      db.prepare("DELETE FROM transactions WHERE client_id = ? AND ref_no = ?").run(ctx.clientId, oldInv.invoice_number);
    } catch (e) {
      console.error("Error reversing old invoice transactions:", e);
    }

    // 2. Update Invoice
    db.prepare(`
      UPDATE invoices 
      SET invoice_number = ?, date = ?, customer_id = ?, total_amount = ?, cgst_total = ?, sgst_total = ?, igst_total = ?,
          items = ?, place_of_supply = ?, place_of_supply_code = ?, is_interstate = ?,
          buyer_gstin = ?, buyer_address = ?, buyer_state = ?, buyer_state_code = ?, reverse_charge = ?, vehicle_no = ?, notes = ?, status = COALESCE(?, status)
      WHERE id = ? AND client_id = ?
    `).run(
      invoice_number || oldInv.invoice_number, date || oldInv.date, customer_id || oldInv.customer_id,
      total_amount, cgst_total || 0, sgst_total || 0, igst_total || 0,
      JSON.stringify(items || []), place_of_supply || ctx.currentClient?.state, place_of_supply_code || supplierStateCode,
      computedInterstate,
      buyer_gstin || null, buyer_address || null, buyer_state || null, buyer_state_code || null,
      reverse_charge || 'No', vehicle_no || null, notes || null, status || oldInv.status || 'PENDING',
      id, ctx.clientId
    );

    // 3. Re-insert accounting transactions for updated invoice
    try {
      const salesAccount = db.prepare("SELECT id FROM accounts WHERE client_id = ? AND name = 'Sales Revenue'").get(ctx.clientId) as any;
      const targetCustomerId = customer_id || oldInv.customer_id;
      const customer = db.prepare("SELECT name FROM accounts WHERE id = ?").get(targetCustomerId) as any;
      const taxableValue = total_amount - (cgst_total || 0) - (sgst_total || 0) - (igst_total || 0);

      if (salesAccount && customer) {
        const invNum = invoice_number || oldInv.invoice_number;
        const invDate = date || oldInv.date;

        db.prepare(`
          INSERT INTO transactions (client_id, date, description, amount, type, voucher_type, ref_no, party_id, debit_account_id, credit_account_id)
          VALUES (?, ?, ?, ?, 'SALE', 'SALE', ?, ?, ?, ?)
        `).run(ctx.clientId, invDate, `Invoice ${invNum}: ${customer.name}`, taxableValue, invNum, targetCustomerId, targetCustomerId, salesAccount.id);

        db.prepare("UPDATE accounts SET balance = balance + ? WHERE id = ?").run(taxableValue, targetCustomerId);
        db.prepare("UPDATE accounts SET balance = balance - ? WHERE id = ?").run(taxableValue, salesAccount.id);

        if (computedInterstate === 1 && (igst_total || 0) > 0) {
          const igstOutput = db.prepare("SELECT id FROM accounts WHERE client_id = ? AND name = 'IGST Output'").get(ctx.clientId) as any;
          if (igstOutput) {
            db.prepare(`
              INSERT INTO transactions (client_id, date, description, amount, type, voucher_type, ref_no, party_id, debit_account_id, credit_account_id)
              VALUES (?, ?, ?, ?, 'JOURNAL', 'SALE', ?, ?, ?, ?)
            `).run(ctx.clientId, invDate, `IGST Output (18%) on ${invNum}`, igst_total, invNum, targetCustomerId, targetCustomerId, igstOutput.id);
            db.prepare("UPDATE accounts SET balance = balance + ? WHERE id = ?").run(igst_total, targetCustomerId);
            db.prepare("UPDATE accounts SET balance = balance - ? WHERE id = ?").run(igst_total, igstOutput.id);
          }
        } else {
          if ((cgst_total || 0) > 0) {
            const cgstOutput = db.prepare("SELECT id FROM accounts WHERE client_id = ? AND name = 'CGST Output'").get(ctx.clientId) as any;
            if (cgstOutput) {
              db.prepare(`
                INSERT INTO transactions (client_id, date, description, amount, type, voucher_type, ref_no, party_id, debit_account_id, credit_account_id)
                VALUES (?, ?, ?, ?, 'JOURNAL', 'SALE', ?, ?, ?, ?)
              `).run(ctx.clientId, invDate, `CGST Output (9%) on ${invNum}`, cgst_total, invNum, targetCustomerId, targetCustomerId, cgstOutput.id);
              db.prepare("UPDATE accounts SET balance = balance + ? WHERE id = ?").run(cgst_total, targetCustomerId);
              db.prepare("UPDATE accounts SET balance = balance - ? WHERE id = ?").run(cgst_total, cgstOutput.id);
            }
          }
          if ((sgst_total || 0) > 0) {
            const sgstOutput = db.prepare("SELECT id FROM accounts WHERE client_id = ? AND name = 'SGST Output'").get(ctx.clientId) as any;
            if (sgstOutput) {
              db.prepare(`
                INSERT INTO transactions (client_id, date, description, amount, type, voucher_type, ref_no, party_id, debit_account_id, credit_account_id)
                VALUES (?, ?, ?, ?, 'JOURNAL', 'SALE', ?, ?, ?, ?)
              `).run(ctx.clientId, invDate, `SGST Output (9%) on ${invNum}`, sgst_total, invNum, targetCustomerId, targetCustomerId, sgstOutput.id);
              db.prepare("UPDATE accounts SET balance = balance + ? WHERE id = ?").run(sgst_total, targetCustomerId);
              db.prepare("UPDATE accounts SET balance = balance - ? WHERE id = ?").run(sgst_total, sgstOutput.id);
            }
          }
        }
      }
    } catch (e) {
      console.error("Error updating transactions for invoice:", e);
    }

    triggerAdminDriveAutoSync();
    res.json({ success: true });
  });

  app.delete("/api/invoices/:id", (req, res) => {
    const ctx = getContext(req);
    const { id } = req.params;
    const oldInv = db.prepare("SELECT * FROM invoices WHERE id = ? AND client_id = ?").get(id, ctx.clientId) as any;
    if (!oldInv) return res.status(404).json({ error: "Invoice not found" });

    try {
      const oldTransactions = db.prepare("SELECT * FROM transactions WHERE client_id = ? AND ref_no = ?").all(ctx.clientId, oldInv.invoice_number) as any[];
      for (const t of oldTransactions) {
        if (t.debit_account_id) {
          db.prepare("UPDATE accounts SET balance = balance - ? WHERE id = ?").run(t.amount, t.debit_account_id);
        }
        if (t.credit_account_id) {
          db.prepare("UPDATE accounts SET balance = balance + ? WHERE id = ?").run(t.amount, t.credit_account_id);
        }
      }
      db.prepare("DELETE FROM transactions WHERE client_id = ? AND ref_no = ?").run(ctx.clientId, oldInv.invoice_number);
    } catch (e) {
      console.error("Error reversing transactions on invoice delete:", e);
    }

    db.prepare("DELETE FROM invoices WHERE id = ? AND client_id = ?").run(id, ctx.clientId);
    triggerAdminDriveAutoSync();
    res.json({ success: true });
  });

  // --- Detailed Ledger Statement API ---
  app.get("/api/accounts/:id/ledger", (req, res) => {
    const ctx = getContext(req);
    const { id } = req.params;

    const account = db.prepare("SELECT * FROM accounts WHERE id = ? AND client_id = ?").get(id, ctx.clientId) as any;
    if (!account) return res.status(404).json({ error: "Account not found" });

    const ledger = db.prepare(`
      SELECT t.*, 
             CASE WHEN t.debit_account_id = ? THEN t.amount ELSE 0 END as debit,
             CASE WHEN t.credit_account_id = ? THEN t.amount ELSE 0 END as credit,
             CASE WHEN t.debit_account_id = ? THEN COALESCE(c.name, 'Sundry') ELSE COALESCE(d.name, 'Sundry') END as particular
      FROM transactions t
      LEFT JOIN accounts d ON t.debit_account_id = d.id
      LEFT JOIN accounts c ON t.credit_account_id = c.id
      WHERE (t.debit_account_id = ? OR t.credit_account_id = ?) AND t.client_id = ?
      ORDER BY t.date ASC, t.id ASC
    `).all(id, id, id, id, id, ctx.clientId);

    res.json(ledger);
  });

  // --- Reports (P&L and Balance Sheet) ---
  app.get("/api/reports/pl", (req, res) => {
    const ctx = getContext(req);
    const revenue = db.prepare("SELECT name, balance, group_name FROM accounts WHERE type = 'REVENUE' AND client_id = ?").all(ctx.clientId);
    const expenses = db.prepare("SELECT name, balance, group_name FROM accounts WHERE type = 'EXPENSE' AND client_id = ?").all(ctx.clientId);
    
    const totalRevenue = revenue.reduce((sum, a: any) => sum + Math.abs(a.balance), 0);
    const totalExpenses = expenses.reduce((sum, a: any) => sum + Math.abs(a.balance), 0);

    res.json({
      revenue,
      expenses,
      totalRevenue,
      totalExpenses,
      netProfit: totalRevenue - totalExpenses
    });
  });

  app.get("/api/reports/balance-sheet", (req, res) => {
    const ctx = getContext(req);
    const accounts = db.prepare("SELECT name, balance, type, group_name FROM accounts WHERE client_id = ?").all(ctx.clientId) as any[];
    
    const assets = accounts.filter(a => a.type === 'ASSET');
    const liabilities = accounts.filter(a => a.type === 'LIABILITY');
    const equity = accounts.filter(a => a.type === 'EQUITY');

    const revenue = accounts.filter(a => a.type === 'REVENUE').reduce((sum, a) => sum + Math.abs(a.balance), 0);
    const expenses = accounts.filter(a => a.type === 'EXPENSE').reduce((sum, a) => sum + Math.abs(a.balance), 0);
    const netProfit = revenue - expenses;

    res.json({ assets, liabilities, equity, netProfit });
  });

  // --- Google Drive Backup & Cloud Storage API ---
  app.get("/api/drive/admin-status", (req, res) => {
    try {
      const row = db.prepare("SELECT * FROM admin_drive_tokens WHERE id = 1").get() as any;
      res.json({
        isConnected: !!(row && row.access_token),
        email: row?.email || null,
        lastSyncTime: row?.last_sync_time || null,
        filesSyncedCount: row?.files_synced_count || 0,
        status: row?.status || 'IDLE',
        folderId: row?.folder_id || null
      });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/drive/admin-token", async (req, res) => {
    const { accessToken, email } = req.body;
    if (!accessToken) {
      return res.status(400).json({ error: "Access token is required" });
    }

    try {
      const nowIso = new Date().toISOString();
      db.prepare(`
        INSERT INTO admin_drive_tokens (id, access_token, email, updated_at)
        VALUES (1, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          access_token = excluded.access_token,
          email = COALESCE(excluded.email, admin_drive_tokens.email),
          updated_at = excluded.updated_at
      `).run(accessToken, email || 'kotulegroup@gmail.com', nowIso);

      // Trigger asynchronous initial sync in background
      syncAllClientDataToDrive(accessToken).catch(err => {
        console.warn("Initial sync to Drive warning:", err);
      });

      res.json({ success: true, message: "Admin Google Drive token saved and backup initiated." });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/drive/sync-all-client-data", async (req, res) => {
    let token = req.headers.authorization?.replace(/^Bearer\s+/i, '') || req.body?.accessToken;
    const result = await syncAllClientDataToDrive(token);
    if (!result.success) {
      return res.status(400).json(result);
    }
    res.json(result);
  });

  app.get("/api/drive/download-backup", (req, res) => {
    try {
      const clients = db.prepare("SELECT * FROM clients ORDER BY id ASC").all() as any[];
      const allClientsData: any[] = [];

      for (const c of clients) {
        const accounts = db.prepare("SELECT * FROM accounts WHERE client_id = ?").all(c.id);
        const inventory = db.prepare("SELECT * FROM inventory_items WHERE client_id = ?").all(c.id);
        const invoices = db.prepare("SELECT * FROM invoices WHERE client_id = ? ORDER BY date ASC, id ASC").all(c.id);
        const transactions = db.prepare("SELECT * FROM transactions WHERE client_id = ? ORDER BY date ASC, id ASC").all(c.id);

        allClientsData.push({
          clientInfo: c,
          invoices: invoices.map((inv: any) => ({
            ...inv,
            items: typeof inv.items === 'string' ? JSON.parse(inv.items) : inv.items
          })),
          transactions,
          accounts,
          inventory
        });
      }

      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="All_Clients_Accounting_Data_${Date.now()}.json"`);
      res.send(JSON.stringify({
        app: "FinTrack Multi-Client Accounting",
        exportedAt: new Date().toISOString(),
        totalClients: clients.length,
        clients: allClientsData
      }, null, 2));
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/auth/google/status", (req, res) => {
    try {
      const row = db.prepare("SELECT access_token, email FROM admin_drive_tokens WHERE id = 1").get() as any;
      res.json({
        isAuthenticated: !!(row && row.access_token),
        email: row?.email || null
      });
    } catch (e) {
      res.json({ isAuthenticated: false });
    }
  });

  app.post("/api/auth/google/logout", (req, res) => {
    try {
      db.prepare("UPDATE admin_drive_tokens SET access_token = NULL, status = 'DISCONNECTED' WHERE id = 1").run();
      if (req.session) {
        delete (req.session as any).tokens;
      }
    } catch (e) {}
    res.json({ success: true });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`GST Accounting Server running on http://localhost:${PORT}`);
  });
}

startServer();
