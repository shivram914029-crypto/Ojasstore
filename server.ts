import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import Database from 'better-sqlite3';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import multer from 'multer';
import { fileURLToPath } from 'url';
import type {
  AdminCustomerSummary,
  CategoryItem,
  CustomerAddress,
  CustomerUser,
  Order,
  OrderItem,
  OrderStatus,
  OrderStatusHistoryItem,
  PaymentStatus,
  Product,
  ProductDetails,
  ProductVariant,
  RefundStatus,
  SiteContent,
  SupportTicketStatus,
} from './src/types.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const DATA_DIR = path.resolve(__dirname, 'data');
const UPLOADS_DIR = path.resolve(__dirname, 'uploads');
const DB_PATH = process.env.OJAS_DB_PATH
  ? path.resolve(process.env.OJAS_DB_PATH)
  : path.join(DATA_DIR, 'ojas.db');
const RECOVERY_KEY_FILE = path.join(DATA_DIR, '.owner-recovery-key');
const CUSTOMER_CARE_EMAIL = 'customercareojas@gmail.com';
const SESSION_COOKIE_NAME = 'ojas_admin_session';
const CUSTOMER_COOKIE_NAME = 'ojas_customer_session';
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 days
const CUSTOMER_REMEMBER_TTL_MS = 1000 * 60 * 60 * 24 * 30; // 30 days
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000;
const SESSION_SECRET =
  process.env.SESSION_SECRET || crypto.createHash('sha256').update(`ojas-session-${__dirname}`).digest('hex');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Initialize Database Schema
db.exec(`
  CREATE TABLE IF NOT EXISTS admin_users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    salt TEXT NOT NULL,
    recovery_hash TEXT NOT NULL DEFAULT '',
    recovery_salt TEXT NOT NULL DEFAULT '',
    needs_setup INTEGER NOT NULL DEFAULT 0,
    failed_attempts INTEGER NOT NULL DEFAULT 0,
    locked_until INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS sessions (
    token_hash TEXT PRIMARY KEY,
    admin_id INTEGER NOT NULL,
    expires_at INTEGER NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (admin_id) REFERENCES admin_users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    slug TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    subtitle TEXT NOT NULL,
    category TEXT NOT NULL,
    description TEXT NOT NULL,
    details_json TEXT NOT NULL,
    variants_json TEXT NOT NULL,
    images_json TEXT NOT NULL,
    featured INTEGER NOT NULL DEFAULT 1,
    active INTEGER NOT NULL DEFAULT 1,
    sort_order INTEGER NOT NULL DEFAULT 0,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_number TEXT NOT NULL UNIQUE,
    customer_name TEXT NOT NULL,
    mobile_number TEXT NOT NULL,
    delivery_address TEXT NOT NULL,
    city TEXT NOT NULL,
    pincode TEXT NOT NULL,
    notes TEXT NOT NULL DEFAULT '',
    items_json TEXT NOT NULL,
    subtotal INTEGER NOT NULL,
    shipping_fee INTEGER NOT NULL,
    total_amount INTEGER NOT NULL,
    payment_method TEXT NOT NULL,
    status TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS site_content (
    key TEXT PRIMARY KEY,
    value_json TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS contact_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    mobile TEXT NOT NULL,
    email TEXT NOT NULL DEFAULT '',
    message TEXT NOT NULL,
    read_status INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS customers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    mobile_number TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL DEFAULT '',
    email TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS customer_sessions (
    token_hash TEXT PRIMARY KEY,
    customer_id INTEGER NOT NULL,
    expires_at INTEGER NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS customer_addresses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id INTEGER NOT NULL,
    label TEXT NOT NULL DEFAULT 'Home',
    recipient_name TEXT NOT NULL,
    mobile_number TEXT NOT NULL,
    delivery_address TEXT NOT NULL,
    city TEXT NOT NULL,
    pincode TEXT NOT NULL,
    is_default INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    slug TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL UNIQUE,
    description TEXT NOT NULL DEFAULT '',
    active INTEGER NOT NULL DEFAULT 1,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
  );
`);

// Remove deprecated OTP and password reset tables if present
db.exec('DROP TABLE IF EXISTS otp_challenges;');
db.exec('DROP TABLE IF EXISTS customer_password_resets;');

// Safe additive column migrations for existing admin_users, orders, and contact_messages tables
const adminColumns = db
  .prepare('PRAGMA table_info(admin_users)')
  .all()
  .map((c: any) => c.name as string);

const alterMigrations: Array<[string, string]> = [
  ['recovery_hash', "ALTER TABLE admin_users ADD COLUMN recovery_hash TEXT NOT NULL DEFAULT ''"],
  ['recovery_salt', "ALTER TABLE admin_users ADD COLUMN recovery_salt TEXT NOT NULL DEFAULT ''"],
  ['needs_setup', 'ALTER TABLE admin_users ADD COLUMN needs_setup INTEGER NOT NULL DEFAULT 0'],
  ['failed_attempts', 'ALTER TABLE admin_users ADD COLUMN failed_attempts INTEGER NOT NULL DEFAULT 0'],
  ['locked_until', 'ALTER TABLE admin_users ADD COLUMN locked_until INTEGER NOT NULL DEFAULT 0'],
];
for (const [col, sql] of alterMigrations) {
  if (!adminColumns.includes(col)) {
    db.exec(sql);
  }
}

const orderColumns = db
  .prepare('PRAGMA table_info(orders)')
  .all()
  .map((c: any) => c.name as string);

const orderMigrations: Array<[string, string]> = [
  ['customer_id', 'ALTER TABLE orders ADD COLUMN customer_id INTEGER'],
  ['courier_name', "ALTER TABLE orders ADD COLUMN courier_name TEXT NOT NULL DEFAULT ''"],
  ['delivery_partner', "ALTER TABLE orders ADD COLUMN delivery_partner TEXT NOT NULL DEFAULT ''"],
  ['tracking_number', "ALTER TABLE orders ADD COLUMN tracking_number TEXT NOT NULL DEFAULT ''"],
  ['courier_charges', 'ALTER TABLE orders ADD COLUMN courier_charges INTEGER NOT NULL DEFAULT 0'],
  ['gst_rate', 'ALTER TABLE orders ADD COLUMN gst_rate REAL NOT NULL DEFAULT 5'],
  ['gst_amount', 'ALTER TABLE orders ADD COLUMN gst_amount INTEGER NOT NULL DEFAULT 0'],
  ['dispatched_at', "ALTER TABLE orders ADD COLUMN dispatched_at TEXT NOT NULL DEFAULT ''"],
  ['delivered_at', "ALTER TABLE orders ADD COLUMN delivered_at TEXT NOT NULL DEFAULT ''"],
  ['cancelled_at', "ALTER TABLE orders ADD COLUMN cancelled_at TEXT NOT NULL DEFAULT ''"],
  ['returned_at', "ALTER TABLE orders ADD COLUMN returned_at TEXT NOT NULL DEFAULT ''"],
  ['refund_status', "ALTER TABLE orders ADD COLUMN refund_status TEXT NOT NULL DEFAULT 'None'"],
  ['refund_amount', 'ALTER TABLE orders ADD COLUMN refund_amount INTEGER NOT NULL DEFAULT 0'],
  ['return_reason', "ALTER TABLE orders ADD COLUMN return_reason TEXT NOT NULL DEFAULT ''"],
  ['status_history_json', "ALTER TABLE orders ADD COLUMN status_history_json TEXT NOT NULL DEFAULT '[]'"],
  ['payment_status', "ALTER TABLE orders ADD COLUMN payment_status TEXT NOT NULL DEFAULT 'Unpaid'"],
  ['upi_transaction_id', "ALTER TABLE orders ADD COLUMN upi_transaction_id TEXT NOT NULL DEFAULT ''"],
  ['upi_payer_app', "ALTER TABLE orders ADD COLUMN upi_payer_app TEXT NOT NULL DEFAULT ''"],
  ['payment_proof_url', "ALTER TABLE orders ADD COLUMN payment_proof_url TEXT NOT NULL DEFAULT ''"],
  ['payment_submitted_at', "ALTER TABLE orders ADD COLUMN payment_submitted_at TEXT NOT NULL DEFAULT ''"],
  ['payment_verified_at', "ALTER TABLE orders ADD COLUMN payment_verified_at TEXT NOT NULL DEFAULT ''"],
];
for (const [col, sql] of orderMigrations) {
  if (!orderColumns.includes(col)) {
    db.exec(sql);
  }
}

const msgColumns = db
  .prepare('PRAGMA table_info(contact_messages)')
  .all()
  .map((c: any) => c.name as string);

const msgMigrations: Array<[string, string]> = [
  ['status', "ALTER TABLE contact_messages ADD COLUMN status TEXT NOT NULL DEFAULT 'Open'"],
  ['reply_note', "ALTER TABLE contact_messages ADD COLUMN reply_note TEXT NOT NULL DEFAULT ''"],
];
for (const [col, sql] of msgMigrations) {
  if (!msgColumns.includes(col)) {
    db.exec(sql);
  }
}

// Non-destructive migration of existing customers table to Name + Mobile identity schema (mobile_number UNIQUE)
const customerSchemaRow = db
  .prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'customers'")
  .get() as { sql: string } | undefined;

const needsCustomerRebuild = Boolean(
  customerSchemaRow?.sql &&
    (/email\s+TEXT\s+NOT\s+NULL\s+UNIQUE/i.test(customerSchemaRow.sql) ||
      !/mobile_number\s+TEXT\s+NOT\s+NULL\s+UNIQUE/i.test(customerSchemaRow.sql))
);

if (needsCustomerRebuild) {
  db.pragma('foreign_keys = OFF');
  const migrateCustomersTx = db.transaction(() => {
    db.exec(`
      CREATE TABLE customers_migrated (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        mobile_number TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL DEFAULT '',
        email TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);

    const existingRows = db.prepare('SELECT * FROM customers ORDER BY id ASC').all() as any[];
    const insertMigrated = db.prepare(
      `INSERT INTO customers_migrated (
        id, mobile_number, name, email, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?)`
    );

    const usedMobiles = new Set<string>();
    for (const r of existingRows) {
      let mob = String(r.mobile_number || '').trim();
      if (!mob || usedMobiles.has(mob)) {
        mob = `legacy-${r.id}`;
      }
      usedMobiles.add(mob);
      insertMigrated.run(
        r.id,
        mob,
        String(r.name || ''),
        String(r.email || ''),
        String(r.created_at || new Date().toISOString()),
        String(r.updated_at || new Date().toISOString())
      );
    }

    db.exec('DROP TABLE customers;');
    db.exec('ALTER TABLE customers_migrated RENAME TO customers;');
  });
  migrateCustomersTx();
  db.pragma('foreign_keys = ON');
}

function getServerRecoveryKey(): string {
  const envKey = process.env.ADMIN_RECOVERY_KEY?.trim();
  if (envKey) return envKey;
  if (fs.existsSync(RECOVERY_KEY_FILE)) {
    const existing = fs.readFileSync(RECOVERY_KEY_FILE, 'utf8').trim();
    if (existing) return existing;
  }
  const part1 = crypto.randomBytes(2).toString('hex').toUpperCase();
  const part2 = crypto.randomBytes(2).toString('hex').toUpperCase();
  const generated = `OJAS-${part1}-${part2}`;
  fs.writeFileSync(RECOVERY_KEY_FILE, `${generated}\n`, { mode: 0o600 });
  return generated;
}

function timingSafeTextEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

function hashPassword(password: string, salt?: string): { hash: string; salt: string } {
  const actualSalt = salt || crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, actualSalt, 64).toString('hex');
  return { hash, salt: actualSalt };
}

function verifyPassword(password: string, expectedHash: string, salt: string): boolean {
  if (!expectedHash || !salt) return false;
  const { hash } = hashPassword(password, salt);
  const a = Buffer.from(hash, 'hex');
  const b = Buffer.from(expectedHash, 'hex');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

function hashSessionToken(token: string): string {
  return crypto.createHmac('sha256', SESSION_SECRET).update(token).digest('hex');
}

function parseCookies(cookieHeader?: string): Record<string, string> {
  const result: Record<string, string> = {};
  if (!cookieHeader) return result;
  for (const part of cookieHeader.split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim();
    const val = decodeURIComponent(part.slice(idx + 1).trim());
    if (key) result[key] = val;
  }
  return result;
}

function extractSessionToken(req: Request): string | null {
  const cookies = parseCookies(req.headers.cookie);
  if (cookies[SESSION_COOKIE_NAME]) {
    return cookies[SESSION_COOKIE_NAME];
  }
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7).trim() || null;
  }
  return null;
}

function extractCustomerSessionToken(req: Request): string | null {
  const cookies = parseCookies(req.headers.cookie);
  if (cookies[CUSTOMER_COOKIE_NAME]) {
    return cookies[CUSTOMER_COOKIE_NAME];
  }
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7).trim() || null;
  }
  return null;
}

function isRequestHttps(req: Request): boolean {
  return (
    req.secure ||
    req.headers['x-forwarded-proto'] === 'https' ||
    process.env.NODE_ENV === 'production'
  );
}

function issueAdminSession(req: Request, res: Response, adminId: number): string {
  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = hashSessionToken(rawToken);
  const expiresAt = Date.now() + SESSION_TTL_MS;

  db.prepare('INSERT INTO sessions (token_hash, admin_id, expires_at, created_at) VALUES (?, ?, ?, ?)').run(
    tokenHash,
    adminId,
    expiresAt,
    new Date().toISOString()
  );

  const https = isRequestHttps(req);
  res.cookie(SESSION_COOKIE_NAME, rawToken, {
    httpOnly: true,
    sameSite: https ? 'none' : 'lax',
    secure: https,
    maxAge: SESSION_TTL_MS,
    path: '/',
  });

  return rawToken;
}

function issueCustomerSession(
  req: Request,
  res: Response,
  customerId: number,
  _rememberMe = true
): string {
  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = hashSessionToken(rawToken);
  const expiresAt = Date.now() + CUSTOMER_REMEMBER_TTL_MS;

  db.prepare(
    'INSERT INTO customer_sessions (token_hash, customer_id, expires_at, created_at) VALUES (?, ?, ?, ?)'
  ).run(tokenHash, customerId, expiresAt, new Date().toISOString());

  const https = isRequestHttps(req);
  res.cookie(CUSTOMER_COOKIE_NAME, rawToken, {
    httpOnly: true,
    sameSite: https ? 'none' : 'lax',
    secure: https,
    maxAge: CUSTOMER_REMEMBER_TTL_MS,
    path: '/',
  });

  return rawToken;
}

function parseIndianMobile(raw?: string): { valid: boolean; digits10: string; e164: string } {
  const cleaned = (raw || '').replace(/\D/g, '');
  let digits10 = cleaned;
  if (cleaned.length === 12 && cleaned.startsWith('91')) {
    digits10 = cleaned.slice(2);
  } else if (cleaned.length === 11 && cleaned.startsWith('0')) {
    digits10 = cleaned.slice(1);
  }
  const valid = /^[6-9]\d{9}$/.test(digits10);
  return {
    valid,
    digits10: valid ? digits10 : '',
    e164: valid ? `+91${digits10}` : '',
  };
}

function linkMatchingOrdersToCustomer(customerId: number, digits10: string) {
  if (!digits10) return;
  db.prepare(
    `UPDATE orders
     SET customer_id = ?
     WHERE customer_id IS NULL
       AND REPLACE(REPLACE(REPLACE(mobile_number, ' ', ''), '+', ''), '-', '') IN (?, ?)`
  ).run(customerId, digits10, `91${digits10}`);
}

function seedInitialData() {
  const now = new Date().toISOString();
  const serverRecoveryKey = getServerRecoveryKey();
  const { hash: recHash, salt: recSalt } = hashPassword(serverRecoveryKey);

  // Sync or initialize owner account cleanly
  const envEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const envPassword = process.env.ADMIN_PASSWORD?.trim();
  const adminRows = db.prepare('SELECT * FROM admin_users ORDER BY id ASC').all() as any[];

  if (envEmail && envPassword && envEmail !== CUSTOMER_CARE_EMAIL) {
    const { hash, salt } = hashPassword(envPassword);
    if (adminRows.length === 0) {
      db.prepare(
        `INSERT INTO admin_users (
          email, name, password_hash, salt, recovery_hash, recovery_salt, needs_setup, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, 0, ?)`
      ).run(envEmail, 'OJAS Owner', hash, salt, recHash, recSalt, now);
    } else {
      db.prepare(
        `UPDATE admin_users
         SET email = ?, password_hash = ?, salt = ?, needs_setup = 0
         WHERE id = ?`
      ).run(envEmail, hash, salt, adminRows[0].id);
    }
  } else if (adminRows.length === 0) {
    // Initialize secure pending-setup owner record (requires server recovery key to activate)
    const placeholderSecret = crypto.randomBytes(32).toString('hex');
    const { hash, salt } = hashPassword(placeholderSecret);
    const defaultOwnerEmail =
      envEmail && envEmail !== CUSTOMER_CARE_EMAIL ? envEmail : 'owner@ojasnatural.in';
    db.prepare(
      `INSERT INTO admin_users (
        email, name, password_hash, salt, recovery_hash, recovery_salt, needs_setup, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, 1, ?)`
    ).run(defaultOwnerEmail, 'OJAS Owner', hash, salt, recHash, recSalt, now);
  } else {
    // Ensure existing admin rows have a valid recovery hash if missing
    for (const row of adminRows) {
      if (!row.recovery_hash || !row.recovery_salt) {
        db.prepare('UPDATE admin_users SET recovery_hash = ?, recovery_salt = ? WHERE id = ?').run(
          recHash,
          recSalt,
          row.id
        );
      }
    }
  }

  // Seed default products if none exist
  const productCount = db.prepare('SELECT COUNT(*) as count FROM products').get() as { count: number };
  if (productCount.count === 0) {
    const insertProduct = db.prepare(`
      INSERT INTO products (
        slug, name, subtitle, category, description,
        details_json, variants_json, images_json, featured, active, sort_order, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const eggShellDetails: ProductDetails = {
      highlights: [
        '100% pure, finely milled natural egg shell powder',
        'Thoroughly cleaned, sun-cured, and heat-sanitized in small batches',
        'Zero artificial fragrances, fillers, preservatives, or bleaching agents',
        'Packed in food-grade moisture-protected jars and kraft pouches',
      ],
      intendedUses: [
        'Home Gardening & Potted Plants: Gently blends into potting soil or compost as a slow-release natural calcium carbonate mineral source.',
        'Culinary & Kitchen Use: Traditionally used in measured micro-quantities in mineral-rich broths or DIY natural kitchen preparations.',
        'Artisanal Craft & Natural Scrubs: Used as a fine, biodegradable mineral base for handmade soaps and natural household scouring pastes.',
      ],
      materialsOrComposition:
        'Single-ingredient natural egg shell (primarily natural calcium carbonate), finely pulverized into a smooth, uniform ivory powder.',
      storageAndCare:
        'Store in a cool, dry place away from direct moisture. Keep the lid or zip-seal tightly closed after every use.',
      craftNote:
        'This is a natural household and botanical product. It is not intended to diagnose, treat, cure, or prevent any disease or medical condition.',
      origin: 'Crafted in Small Batches in India',
    };

    const eggShellVariants: ProductVariant[] = [
      { id: 'esp-100', label: '100g Apothecary Jar', price: 299, stock: 40, sku: 'OJAS-ESP-100' },
      { id: 'esp-250', label: '250g Kraft Pouch', price: 599, stock: 28, sku: 'OJAS-ESP-250' },
      { id: 'esp-500', label: '500g Value Pack', price: 1049, stock: 15, sku: 'OJAS-ESP-500' },
    ];

    const eggShellImages = [
      '/src/assets/images/ojas_eggshell_powder_jar_1794906705750.jpg',
      '/src/assets/images/ojas_eggshell_powder_macro_1794906706318.jpg',
    ];

    insertProduct.run(
      'ojas-egg-shell-powder',
      'OJAS Egg Shell Powder',
      'Finely Milled Natural Mineral Powder',
      'Natural Powders',
      'Carefully cleaned, sun-cured, and finely pulverized in small batches, OJAS Egg Shell Powder delivers pure, additive-free natural calcium carbonate for mindful everyday home, garden, and craft uses.',
      JSON.stringify(eggShellDetails),
      JSON.stringify(eggShellVariants),
      JSON.stringify(eggShellImages),
      1,
      1,
      1,
      now
    );

    const candleDetails: ProductDetails = {
      highlights: [
        'Hand-poured artisanal botanical soy wax blend',
        'Delicately infused with warm Indian sandalwood and evening jasmine notes',
        'Clean-burning braided unbleached cotton wick with minimal soot',
        'Presented in a reusable fluted ceramic vessel or gift-ready rigid box',
      ],
      intendedUses: [
        'Living Space Sanctuary: Creates a serene, warm golden ambiance for evening relaxation, reading, and mindful moments.',
        'Festive & Housewarming Gifting: Packaged with gold-embossed OJAS forest-green detailing ready for thoughtful gifting.',
        'Dining & Meditation Spaces: Offers an even, gentle fragrance throw without overpowering synthetic notes.',
      ],
      materialsOrComposition:
        'Natural plant-derived soy & beeswax blend, botanical fragrance oils (Sandalwood & Jasmine), unbleached cotton wick, artisanal ceramic vessel.',
      storageAndCare:
        'Trim the wick to 5mm before each lighting. Allow the wax pool to reach the vessel edge on the first burn for an even finish. Never leave a burning candle unattended.',
      craftNote:
        'Each OJAS Designer Candle is poured by hand in India; subtle variations in surface finish reflect authentic small-batch craftsmanship.',
      origin: 'Hand-Poured in India',
    };

    const candleVariants: ProductVariant[] = [
      { id: 'cnd-280', label: '280g Fluted Ceramic Vessel', price: 1199, stock: 22, sku: 'OJAS-CND-280' },
      { id: 'cnd-220', label: '220g Sculpted Botanical Gift Box', price: 1399, stock: 14, sku: 'OJAS-CND-220' },
    ];

    const candleImages = [
      '/src/assets/images/ojas_designer_candle_lit_1794906707241.jpg',
      '/src/assets/images/ojas_designer_candle_detail_1794906722495.jpg',
    ];

    insertProduct.run(
      'ojas-designer-candle',
      'OJAS Designer Candle',
      'Hand-Poured Santal & Jasmine Artisanal Vessel',
      'Designer Candles',
      'Crafted by hand in small batches, the OJAS Designer Candle pairs sculptural warmth with calming notes of sandalwood and Indian jasmine—designed to elevate everyday spaces and celebratory gifting.',
      JSON.stringify(candleDetails),
      JSON.stringify(candleVariants),
      JSON.stringify(candleImages),
      1,
      1,
      2,
      now
    );
  }

  // Seed default site content if not present
  const contentRow = db.prepare("SELECT value_json FROM site_content WHERE key = 'main'").get();
  if (!contentRow) {
    const defaultContent: SiteContent = {
      heroBannerImage: '/src/assets/images/ojas_hero_botanical_1794906705831.jpg',
      heroHeading: 'Pure by Nature, Made with Care.',
      heroTagline: "Bringing Nature's Goodness to Everyday Life.",
      heroDescription:
        'Rooted in Indian natural craftsmanship, OJAS creates small-batch botanical essentials and artisanal homeware with complete transparency and gentle care.',
      heroCtaLabel: 'Shop Our Products',
      announcementBar: 'Complimentary shipping across India on orders above ₹999 · Crafted in small batches',
      aboutTitle: 'Rooted in Purity, Shaped by Hand',
      aboutLead:
        'OJAS was born from a quiet conviction: everyday essentials belong closer to nature—unhurried, honest, and free from unnecessary synthetics.',
      aboutStory:
        'Every jar of OJAS Egg Shell Powder and every hand-poured OJAS Designer Candle begins with thoughtfully sourced materials, meticulous hygiene, and small-batch attention. We believe luxury is not excess—it is care you can see, feel, and trust in your home.',
      aboutStorySecondary:
        'From finely milled natural mineral powders for mindful household and garden routines to warm botanical candles made for calm evenings, each piece carries the warmth of Indian craftsmanship.',
      whyChooseTitle: 'Why Choose OJAS',
      whyChoosePillars: [
        {
          id: 'p1',
          number: '01',
          title: 'Honest, Natural Sourcing',
          description:
            'Every batch begins with clean, carefully selected raw ingredients with zero artificial fillers, harsh bleaches, or synthetic shortcuts.',
        },
        {
          id: 'p2',
          number: '02',
          title: 'Small-Batch Craftsmanship',
          description:
            'Prepared and packed in controlled micro-batches in India so freshness, fine texture, and finish remain consistent.',
        },
        {
          id: 'p3',
          number: '03',
          title: 'Thoughtful Protective Packaging',
          description:
            'Reusable glass jars, kraft pouches, and embossed rigid gift boxes designed to preserve quality and minimize waste.',
        },
        {
          id: 'p4',
          number: '04',
          title: 'Direct Owner Care',
          description:
            'Every order receives personal confirmation, clear tracking, and direct WhatsApp support from our studio team.',
        },
      ],
      testimonials: [
        {
          id: 't1',
          customerName: 'Ananya Deshmukh',
          location: 'Pune, Maharashtra',
          productName: 'OJAS Designer Candle',
          quote:
            'The fluted ceramic jar and subtle sandalwood-jasmine aroma instantly calm our living room. Even the gift box felt deeply thoughtful.',
          rating: 5,
          verifiedDate: 'October 2026',
        },
        {
          id: 't2',
          customerName: 'Raghavendra Nair',
          location: 'South Delhi, New Delhi',
          productName: 'OJAS Egg Shell Powder',
          quote:
            'Remarkably fine texture and very clean packaging. I use the 250g pouch regularly for my balcony herb pots and kitchen garden.',
          rating: 5,
          verifiedDate: 'October 2026',
        },
        {
          id: 't3',
          customerName: 'Meera & Kabir Sethi',
          location: 'Jaipur, Rajasthan',
          productName: 'OJAS Designer Candle',
          quote:
            'Ordered three sculpted gift boxes for Diwali family gifting. Every piece arrived securely packed and burned cleanly without soot.',
          rating: 5,
          verifiedDate: 'November 2026',
        },
      ],
      contactPhone: '+91 9140297457',
      whatsappNumber: '919140297457',
      contactEmail: CUSTOMER_CARE_EMAIL,
      businessAddress: 'New Monday Market, Ghitorni, New Delhi – 110030.',
      businessHours: 'Monday – Saturday, 10:00 AM – 6:30 PM IST',
      instagramUrl: 'https://instagram.com',
      facebookUrl: 'https://facebook.com',
      freeShippingThreshold: 999,
      standardShippingFee: 79,
      gstPercent: 5,
      businessLegalName: 'OJAS – Pure by Nature',
      gstin: '',
    };

    db.prepare('INSERT INTO site_content (key, value_json, updated_at) VALUES (?, ?, ?)').run(
      'main',
      JSON.stringify(defaultContent),
      now
    );
  } else {
    const existing = JSON.parse((contentRow as { value_json: string }).value_json) as SiteContent;
    const targetAddress = 'New Monday Market, Ghitorni, New Delhi – 110030.';
    const needsLegacyAddressMigration =
      !existing.businessAddress ||
      existing.businessAddress.includes('Bengaluru') ||
      existing.businessAddress.includes('Indiranagar') ||
      existing.businessAddress.includes('560038');
    const needsLegacyEmailMigration = existing.contactEmail === 'shivram914029@gmail.com';
    const needsTaxDefaults =
      existing.gstPercent === undefined || existing.businessLegalName === undefined;

    const updatedTestimonials = (existing.testimonials || []).map((t) =>
      t.location.includes('Bengaluru') ? { ...t, location: 'South Delhi, New Delhi' } : t
    );

    if (
      needsLegacyAddressMigration ||
      needsLegacyEmailMigration ||
      needsTaxDefaults ||
      updatedTestimonials.some((t, idx) => t !== existing.testimonials[idx])
    ) {
      const migrated: SiteContent = {
        ...existing,
        contactPhone: existing.contactPhone || '+91 9140297457',
        whatsappNumber: existing.whatsappNumber || '919140297457',
        contactEmail: needsLegacyEmailMigration ? CUSTOMER_CARE_EMAIL : existing.contactEmail || CUSTOMER_CARE_EMAIL,
        businessAddress: needsLegacyAddressMigration ? targetAddress : existing.businessAddress,
        gstPercent: existing.gstPercent ?? 5,
        businessLegalName: existing.businessLegalName ?? 'OJAS – Pure by Nature',
        gstin: existing.gstin ?? '',
        testimonials: updatedTestimonials,
      };
      db.prepare('UPDATE site_content SET value_json = ?, updated_at = ? WHERE key = ?').run(
        JSON.stringify(migrated),
        now,
        'main'
      );
    }
  }

  // Seed initial categories from existing products if categories table is empty
  const catCount = (db.prepare('SELECT COUNT(*) as c FROM categories').get() as { c: number }).c;
  if (catCount === 0) {
    const distinctCats = db
      .prepare('SELECT DISTINCT category FROM products ORDER BY sort_order ASC, id ASC')
      .all() as Array<{ category: string }>;
    const insertCat = db.prepare(
      'INSERT OR IGNORE INTO categories (slug, name, description, active, sort_order, created_at) VALUES (?, ?, ?, 1, ?, ?)'
    );
    distinctCats.forEach((row, index) => {
      const catName = (row.category || '').trim();
      if (!catName) return;
      const slug = catName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '') || `category-${index + 1}`;
      insertCat.run(slug, catName, `${catName} crafted by OJAS`, index + 1, now);
    });
  }
}

seedInitialData();

// Helpers to map DB rows
function rowToProduct(row: any): Product {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    subtitle: row.subtitle,
    category: row.category,
    description: row.description,
    details: JSON.parse(row.details_json),
    variants: JSON.parse(row.variants_json),
    images: JSON.parse(row.images_json),
    featured: Boolean(row.featured),
    active: Boolean(row.active),
    sortOrder: row.sort_order,
    updatedAt: row.updated_at,
  };
}

function rowToCategory(row: any): CategoryItem {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description || '',
    active: Boolean(row.active),
    sortOrder: Number(row.sort_order || 0),
    productCount: row.product_count !== undefined ? Number(row.product_count) : undefined,
    createdAt: row.created_at,
  };
}

function parseStatusHistory(rawJson: string | undefined, fallbackRow?: any): OrderStatusHistoryItem[] {
  try {
    const parsed = JSON.parse(rawJson || '[]');
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
  } catch {
    // ignore malformed json and synthesize initial entry
  }
  if (fallbackRow) {
    return [
      {
        status: fallbackRow.status || 'Pending Confirmation',
        note: 'Order placed on OJAS store',
        timestamp: fallbackRow.created_at || new Date().toISOString(),
        updatedBy: 'Customer',
        source: 'system',
      },
    ];
  }
  return [];
}

function computeInclusiveGst(subtotal: number, gstRate: number): number {
  if (!gstRate || gstRate <= 0 || !subtotal || subtotal <= 0) return 0;
  return Math.round((subtotal * gstRate) / (100 + gstRate));
}

function rowToOrder(row: any): Order {
  const gstRate = Number(row.gst_rate ?? 5);
  const storedGst = Number(row.gst_amount ?? 0);
  const gstAmount = storedGst > 0 ? storedGst : computeInclusiveGst(Number(row.subtotal || 0), gstRate);

  return {
    id: row.id,
    orderNumber: row.order_number,
    customerId: row.customer_id ?? null,
    customerName: row.customer_name,
    mobileNumber: row.mobile_number,
    deliveryAddress: row.delivery_address,
    city: row.city,
    pincode: row.pincode,
    notes: row.notes || '',
    items: JSON.parse(row.items_json),
    subtotal: row.subtotal,
    shippingFee: row.shipping_fee,
    gstRate,
    gstAmount,
    totalAmount: row.total_amount,
    paymentMethod: row.payment_method,
    paymentStatus: (row.payment_status || 'Unpaid') as PaymentStatus,
    upiTransactionId: row.upi_transaction_id || '',
    upiPayerApp: row.upi_payer_app || '',
    paymentProofUrl: row.payment_proof_url || '',
    paymentSubmittedAt: row.payment_submitted_at || '',
    paymentVerifiedAt: row.payment_verified_at || '',
    status: row.status as OrderStatus,
    courierName: row.courier_name || '',
    deliveryPartner: row.delivery_partner || row.courier_name || '',
    trackingNumber: row.tracking_number || '',
    courierCharges: Number(row.courier_charges || 0),
    dispatchedAt: row.dispatched_at || '',
    deliveredAt: row.delivered_at || '',
    cancelledAt: row.cancelled_at || '',
    returnedAt: row.returned_at || '',
    refundStatus: (row.refund_status || 'None') as RefundStatus,
    refundAmount: Number(row.refund_amount || 0),
    returnReason: row.return_reason || '',
    statusHistory: parseStatusHistory(row.status_history_json, row),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function rowToCustomer(row: any): CustomerUser {
  return {
    id: row.id,
    mobileNumber: row.mobile_number,
    name: row.name || '',
    email: row.email || '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function rowToCustomerAddress(row: any): CustomerAddress {
  return {
    id: row.id,
    customerId: row.customer_id,
    label: row.label || 'Home',
    recipientName: row.recipient_name,
    mobileNumber: row.mobile_number,
    deliveryAddress: row.delivery_address,
    city: row.city,
    pincode: row.pincode,
    isDefault: Boolean(row.is_default),
    createdAt: row.created_at,
  };
}

function getSiteContent(): SiteContent {
  const row = db.prepare("SELECT value_json FROM site_content WHERE key = 'main'").get() as {
    value_json: string;
  };
  const parsed = JSON.parse(row.value_json) as SiteContent;
  return {
    ...parsed,
    gstPercent: parsed.gstPercent ?? 5,
    businessLegalName: parsed.businessLegalName ?? 'OJAS – Pure by Nature',
    gstin: parsed.gstin ?? '',
  };
}

// Express Setup
const app = express();
app.set('trust proxy', 1);
app.use(express.json({ limit: '4mb' }));

// Static assets & uploaded images
app.use('/uploads', express.static(UPLOADS_DIR, { maxAge: '7d' }));
app.use('/assets', express.static(path.resolve(__dirname, 'public/assets'), { maxAge: '7d' }));
app.use('/src/assets/images', express.static(path.resolve(__dirname, 'src/assets/images'), { maxAge: '7d' }));

// Multer configuration for admin product & banner uploads
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    const safeBase = path
      .basename(file.originalname, ext)
      .toLowerCase()
      .replace(/[^a-z0-9-_]/g, '-')
      .slice(0, 32);
    cb(null, `ojas-${safeBase || 'asset'}-${Date.now()}-${crypto.randomBytes(3).toString('hex')}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPG, PNG, and WebP images are permitted.'));
    }
  },
});

interface AuthenticatedRequest extends Request {
  adminUser?: { id: number; email: string; name: string };
}

interface CustomerAuthenticatedRequest extends Request {
  customerUser?: CustomerUser;
}

function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const rawToken = extractSessionToken(req);
  if (!rawToken) {
    return res.status(401).json({ error: 'Unauthorized: Admin authentication required.' });
  }
  const tokenHash = hashSessionToken(rawToken);
  const row = db
    .prepare(
      `SELECT s.expires_at, a.id, a.email, a.name
       FROM sessions s
       JOIN admin_users a ON a.id = s.admin_id
       WHERE s.token_hash = ?`
    )
    .get(tokenHash) as { expires_at: number; id: number; email: string; name: string } | undefined;

  if (!row || row.expires_at < Date.now()) {
    if (row) {
      db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(tokenHash);
    }
    return res.status(401).json({ error: 'Session expired. Please sign in again.' });
  }

  req.adminUser = { id: row.id, email: row.email, name: row.name };
  next();
}

function resolveOptionalCustomer(req: Request): CustomerUser | null {
  const rawToken = extractCustomerSessionToken(req);
  if (!rawToken) return null;
  const tokenHash = hashSessionToken(rawToken);
  const row = db
    .prepare(
      `SELECT s.expires_at, c.*
       FROM customer_sessions s
       JOIN customers c ON c.id = s.customer_id
       WHERE s.token_hash = ?`
    )
    .get(tokenHash) as any;

  if (!row || row.expires_at < Date.now()) {
    if (row) {
      db.prepare('DELETE FROM customer_sessions WHERE token_hash = ?').run(tokenHash);
    }
    return null;
  }

  return rowToCustomer(row);
}

function requireCustomer(req: CustomerAuthenticatedRequest, res: Response, next: NextFunction) {
  const customer = resolveOptionalCustomer(req);
  if (!customer) {
    return res.status(401).json({ error: 'Please sign in with your mobile number to continue.' });
  }
  req.customerUser = customer;
  next();
}

// ---------- PUBLIC STOREFRONT ROUTES ----------

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, brand: 'OJAS' });
});

app.get('/api/storefront', (_req, res) => {
  try {
    const rows = db
      .prepare('SELECT * FROM products WHERE active = 1 ORDER BY sort_order ASC, id ASC')
      .all();
    const products = rows.map(rowToProduct);
    const content = getSiteContent();
    res.json({ products, content });
  } catch (err) {
    console.error('Storefront load error:', err);
    res.status(500).json({ error: 'Failed to load storefront data.' });
  }
});

app.get('/api/products/:slug', (req, res) => {
  const row = db.prepare('SELECT * FROM products WHERE slug = ? AND active = 1').get(req.params.slug);
  if (!row) {
    return res.status(404).json({ error: 'Product not found.' });
  }
  res.json({ product: rowToProduct(row) });
});

app.post('/api/orders', (req, res) => {
  try {
    const {
      customerName,
      mobileNumber,
      deliveryAddress,
      city,
      pincode,
      notes,
      items,
      paymentMethod,
      upiTransactionId,
      upiPayerApp,
    } = req.body as {
      customerName?: string;
      mobileNumber?: string;
      deliveryAddress?: string;
      city?: string;
      pincode?: string;
      notes?: string;
      paymentMethod?: string;
      upiTransactionId?: string;
      upiPayerApp?: string;
      items?: Array<{ productId: number; variantId: string; quantity: number }>;
    };

    const cleanName = (customerName || '').trim();
    const cleanMobile = (mobileNumber || '').replace(/[^\d+]/g, '').trim();
    const cleanAddress = (deliveryAddress || '').trim();
    const cleanCity = (city || '').trim();
    const cleanPincode = (pincode || '').trim();
    const cleanNotes = (notes || '').trim().slice(0, 400);

    if (cleanName.length < 2) {
      return res.status(400).json({ error: 'Please enter a valid customer name.' });
    }
    if (!/^\+?\d{10,13}$/.test(cleanMobile)) {
      return res.status(400).json({ error: 'Please enter a valid 10-digit mobile number.' });
    }
    if (cleanAddress.length < 8) {
      return res.status(400).json({ error: 'Please provide a complete street delivery address.' });
    }
    if (cleanCity.length < 2) {
      return res.status(400).json({ error: 'Please enter your city.' });
    }
    if (!/^\d{6}$/.test(cleanPincode)) {
      return res.status(400).json({ error: 'Please enter a valid 6-digit Indian PIN code.' });
    }
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Your shopping bag is empty.' });
    }

    const allowedMethods = [
      'Cash on Delivery (Pay on Delivery)',
      'UPI Payment (9140297457@ptyes)',
      'UPI on Order Confirmation',
    ];
    const safePaymentMethod = allowedMethods.includes(paymentMethod || '')
      ? paymentMethod!
      : 'UPI Payment (9140297457@ptyes)';

    const cleanUtr = (upiTransactionId || '').replace(/\s+/g, '').trim();
    const allowedApps = ['Paytm', 'PhonePe', 'Google Pay', 'BHIM', 'Other UPI App'];
    const cleanApp = allowedApps.includes((upiPayerApp || '').trim())
      ? (upiPayerApp || '').trim()
      : 'Paytm';

    if (cleanUtr) {
      if (!/^[A-Za-z0-9]{8,35}$/.test(cleanUtr)) {
        return res.status(400).json({
          error: 'Please enter a valid UPI Transaction / UTR Reference ID (8–35 letters or digits).',
        });
      }
      const dupUtr = db
        .prepare('SELECT id FROM orders WHERE LOWER(upi_transaction_id) = LOWER(?)')
        .get(cleanUtr);
      if (dupUtr) {
        return res.status(409).json({
          error: 'This UPI Transaction / UTR ID has already been submitted for another order.',
        });
      }
    }

    const siteContent = getSiteContent();

    const authenticatedCustomer = resolveOptionalCustomer(req);
    const parsedOrderMobile = parseIndianMobile(cleanMobile);
    const storedMobile = parsedOrderMobile.valid ? parsedOrderMobile.e164 : cleanMobile;

    const createOrderTx = db.transaction(() => {
      const verifiedItems: OrderItem[] = [];
      let subtotal = 0;

      for (const reqItem of items) {
        const qty = Math.floor(Number(reqItem.quantity));
        if (!Number.isFinite(qty) || qty < 1 || qty > 50) {
          throw new Error('Invalid item quantity requested.');
        }

        const productRow = db
          .prepare('SELECT * FROM products WHERE id = ? AND active = 1')
          .get(reqItem.productId);
        if (!productRow) {
          throw new Error('One of the selected products is no longer available.');
        }
        const product = rowToProduct(productRow);
        const variantIdx = product.variants.findIndex((v) => v.id === reqItem.variantId);
        if (variantIdx === -1) {
          throw new Error(`Selected weight option for ${product.name} is unavailable.`);
        }

        const variant = product.variants[variantIdx];
        if (variant.stock < qty) {
          throw new Error(
            variant.stock === 0
              ? `${product.name} (${variant.label}) is currently out of stock.`
              : `Only ${variant.stock} unit(s) left for ${product.name} (${variant.label}).`
          );
        }

        // Decrement stock cleanly inside transaction
        product.variants[variantIdx] = {
          ...variant,
          stock: variant.stock - qty,
        };
        db.prepare('UPDATE products SET variants_json = ?, updated_at = ? WHERE id = ?').run(
          JSON.stringify(product.variants),
          new Date().toISOString(),
          product.id
        );

        subtotal += variant.price * qty;
        verifiedItems.push({
          productId: product.id,
          productName: product.name,
          slug: product.slug,
          variantId: variant.id,
          variantLabel: variant.label,
          price: variant.price,
          quantity: qty,
          image: product.images[0] || '',
        });
      }

      const shippingFee =
        subtotal >= siteContent.freeShippingThreshold ? 0 : siteContent.standardShippingFee;
      const gstRate = Number(siteContent.gstPercent ?? 5);
      const gstAmount = computeInclusiveGst(subtotal, gstRate);
      const totalAmount = subtotal + shippingFee;
      const now = new Date().toISOString();
      const countRow = db.prepare('SELECT COUNT(*) as count FROM orders').get() as { count: number };
      const orderNumber = `OJAS-${new Date().getFullYear()}-${String(1001 + countRow.count)}`;

      const hasImmediateUtr = Boolean(cleanUtr && safePaymentMethod.toLowerCase().includes('upi'));
      const initialPaymentStatus: PaymentStatus = hasImmediateUtr
        ? 'Verification Pending'
        : 'Unpaid';
      const initialOrderStatus: OrderStatus = hasImmediateUtr
        ? 'Payment Verification Pending'
        : 'Pending Confirmation';

      const initialHistory: OrderStatusHistoryItem[] = [
        {
          status: initialOrderStatus,
          note: hasImmediateUtr
            ? `Order placed with UPI UTR ${cleanUtr} (${cleanApp})`
            : `Order placed via ${safePaymentMethod}`,
          timestamp: now,
          updatedBy: cleanName,
          source: 'customer',
        },
      ];

      const info = db
        .prepare(
          `INSERT INTO orders (
            order_number, customer_id, customer_name, mobile_number, delivery_address, city, pincode,
            notes, items_json, subtotal, shipping_fee, gst_rate, gst_amount, total_amount, payment_method,
            payment_status, upi_transaction_id, upi_payer_app, payment_submitted_at,
            status, status_history_json, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          orderNumber,
          authenticatedCustomer ? authenticatedCustomer.id : null,
          cleanName,
          storedMobile,
          cleanAddress,
          cleanCity,
          cleanPincode,
          cleanNotes,
          JSON.stringify(verifiedItems),
          subtotal,
          shippingFee,
          gstRate,
          gstAmount,
          totalAmount,
          safePaymentMethod,
          initialPaymentStatus,
          hasImmediateUtr ? cleanUtr : '',
          hasImmediateUtr ? cleanApp : '',
          hasImmediateUtr ? now : '',
          initialOrderStatus,
          JSON.stringify(initialHistory),
          now,
          now
        );

      // Update logged-in customer profile name if currently empty
      if (authenticatedCustomer && !authenticatedCustomer.name.trim()) {
        db.prepare('UPDATE customers SET name = ?, updated_at = ? WHERE id = ?').run(
          cleanName,
          now,
          authenticatedCustomer.id
        );
      }

      const createdRow = db.prepare('SELECT * FROM orders WHERE id = ?').get(info.lastInsertRowid);
      return rowToOrder(createdRow);
    });

    const order = createOrderTx();
    res.status(201).json({ order });
  } catch (err: any) {
    res.status(400).json({ error: err?.message || 'Unable to place order. Please review your details.' });
  }
});

function authorizeOrderPaymentAccess(req: Request, orderRow: any, bodyMobile?: string): boolean {
  const authenticatedCustomer = resolveOptionalCustomer(req);
  if (authenticatedCustomer && orderRow.customer_id === authenticatedCustomer.id) {
    return true;
  }
  const suppliedDigits = String(bodyMobile || req.headers['x-order-mobile'] || '')
    .replace(/\D/g, '')
    .slice(-10);
  const orderDigits = String(orderRow.mobile_number || '')
    .replace(/\D/g, '')
    .slice(-10);
  return Boolean(suppliedDigits && orderDigits && suppliedDigits === orderDigits);
}

app.post('/api/orders/:orderNumber/payment-proof', (req, res) => {
  const orderNumber = String(req.params.orderNumber || '').trim();
  const orderRow = db.prepare('SELECT * FROM orders WHERE order_number = ?').get(orderNumber) as any;
  if (!orderRow) {
    return res.status(404).json({ error: 'Order not found.' });
  }
  if (!authorizeOrderPaymentAccess(req, orderRow)) {
    return res.status(403).json({ error: 'Unauthorized to upload payment proof for this order.' });
  }

  upload.single('image')(req, res, (err: any) => {
    if (err) {
      return res.status(400).json({ error: err?.message || 'Invalid screenshot upload.' });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'No payment screenshot file received.' });
    }
    const url = `/uploads/${req.file.filename}`;
    res.json({ url });
  });
});

app.post('/api/orders/:orderNumber/verify-payment', (req, res) => {
  const orderNumber = String(req.params.orderNumber || '').trim();
  const { upiTransactionId, upiPayerApp, paymentProofUrl, mobileNumber } = req.body as {
    upiTransactionId?: string;
    upiPayerApp?: string;
    paymentProofUrl?: string;
    mobileNumber?: string;
  };

  const orderRow = db.prepare('SELECT * FROM orders WHERE order_number = ?').get(orderNumber) as any;
  if (!orderRow) {
    return res.status(404).json({ error: 'Order not found.' });
  }

  if (!authorizeOrderPaymentAccess(req, orderRow, mobileNumber)) {
    return res.status(403).json({
      error: 'Please enter the mobile number used on this order to verify payment.',
    });
  }

  if (orderRow.status === 'Cancelled') {
    return res.status(400).json({ error: 'Cannot submit payment verification for a cancelled order.' });
  }
  if (orderRow.payment_status === 'Verified Paid') {
    return res.status(400).json({ error: 'Payment for this order has already been verified.' });
  }

  const cleanUtr = (upiTransactionId || '').replace(/\s+/g, '').trim();
  if (!/^[A-Za-z0-9]{8,35}$/.test(cleanUtr)) {
    return res.status(400).json({
      error: 'Please enter a valid 8–35 character UPI Transaction / UTR Reference Number.',
    });
  }

  const duplicateOrder = db
    .prepare('SELECT id FROM orders WHERE LOWER(upi_transaction_id) = LOWER(?) AND id != ?')
    .get(cleanUtr, orderRow.id);
  if (duplicateOrder) {
    return res.status(409).json({
      error: 'This UPI Transaction / UTR ID is already linked to another order.',
    });
  }

  const allowedApps = ['Paytm', 'PhonePe', 'Google Pay', 'BHIM', 'Other UPI App'];
  const cleanApp = allowedApps.includes((upiPayerApp || '').trim())
    ? (upiPayerApp || '').trim()
    : 'Paytm';

  const cleanProofUrl =
    paymentProofUrl && typeof paymentProofUrl === 'string' && paymentProofUrl.startsWith('/uploads/')
      ? paymentProofUrl.trim()
      : orderRow.payment_proof_url || '';

  const now = new Date().toISOString();
  const nextStatus: OrderStatus =
    orderRow.status === 'Pending Confirmation' || orderRow.status === 'Payment Verification Pending'
      ? 'Payment Verification Pending'
      : (orderRow.status as OrderStatus);

  const prevHistory = parseStatusHistory(orderRow.status_history_json, orderRow);
  const nextHistory: OrderStatusHistoryItem[] = [
    ...prevHistory,
    {
      status: nextStatus,
      note: `Customer submitted UPI Reference ${cleanUtr} (${cleanApp})`,
      timestamp: now,
      updatedBy: orderRow.customer_name || 'Customer',
      source: 'customer',
    },
  ];

  db.prepare(
    `UPDATE orders
     SET payment_status = 'Verification Pending',
         upi_transaction_id = ?,
         upi_payer_app = ?,
         payment_proof_url = ?,
         payment_submitted_at = ?,
         status = ?,
         status_history_json = ?,
         updated_at = ?
     WHERE id = ?`
  ).run(cleanUtr, cleanApp, cleanProofUrl, now, nextStatus, JSON.stringify(nextHistory), now, orderRow.id);

  const updated = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderRow.id);
  res.json({ order: rowToOrder(updated) });
});

app.post('/api/contact', (req, res) => {
  const { name, mobile, email, message } = req.body as {
    name?: string;
    mobile?: string;
    email?: string;
    message?: string;
  };

  const cleanName = (name || '').trim();
  const cleanMobile = (mobile || '').trim();
  const cleanEmail = (email || '').trim();
  const cleanMsg = (message || '').trim();

  if (cleanName.length < 2 || cleanMobile.length < 8 || cleanMsg.length < 5) {
    return res.status(400).json({ error: 'Please provide your name, mobile number, and message.' });
  }

  db.prepare(
    'INSERT INTO contact_messages (name, mobile, email, message, read_status, created_at) VALUES (?, ?, ?, ?, 0, ?)'
  ).run(cleanName, cleanMobile, cleanEmail, cleanMsg, new Date().toISOString());

  res.status(201).json({ ok: true, message: 'Thank you. Our OJAS studio team has received your enquiry.' });
});

// ---------- CUSTOMER IDENTITY ENTRY & SESSION ROUTES (NAME + MOBILE ONLY) ----------

app.get('/api/customer/me', (req, res) => {
  const customer = resolveOptionalCustomer(req);
  if (!customer) {
    return res.json({ authenticated: false, customer: null });
  }
  res.json({ authenticated: true, customer });
});

function handleCustomerContinue(req: Request, res: Response) {
  const { name, mobileNumber } = req.body as {
    name?: string;
    mobileNumber?: string;
  };

  const cleanName = (name || '').trim().slice(0, 80);
  if (cleanName.length < 2) {
    return res.status(400).json({ error: 'Please enter your full name (at least 2 characters).' });
  }

  const parsedMobile = parseIndianMobile(mobileNumber);
  if (!parsedMobile.valid) {
    return res.status(400).json({ error: 'Please enter a valid 10-digit Indian mobile number.' });
  }

  const nowIso = new Date().toISOString();
  let customerRow = db
    .prepare(
      `SELECT * FROM customers
       WHERE mobile_number = ?
          OR REPLACE(REPLACE(REPLACE(mobile_number, ' ', ''), '+', ''), '-', '') IN (?, ?)`
    )
    .get(parsedMobile.e164, parsedMobile.digits10, `91${parsedMobile.digits10}`) as any;

  if (customerRow) {
    db.prepare(
      'UPDATE customers SET name = ?, mobile_number = ?, updated_at = ? WHERE id = ?'
    ).run(cleanName, parsedMobile.e164, nowIso, customerRow.id);
    customerRow = db.prepare('SELECT * FROM customers WHERE id = ?').get(customerRow.id);
  } else {
    const info = db
      .prepare(
        `INSERT INTO customers (mobile_number, name, email, created_at, updated_at)
         VALUES (?, ?, '', ?, ?)`
      )
      .run(parsedMobile.e164, cleanName, nowIso, nowIso);
    customerRow = db.prepare('SELECT * FROM customers WHERE id = ?').get(info.lastInsertRowid);
  }

  const customer = rowToCustomer(customerRow);
  linkMatchingOrdersToCustomer(customer.id, parsedMobile.digits10);

  const sessionToken = issueCustomerSession(req, res, customer.id, true);
  res.json({
    authenticated: true,
    sessionToken,
    customer,
  });
}

app.post('/api/customer/continue', handleCustomerContinue);
app.post('/api/customer/login', handleCustomerContinue);

app.post('/api/customer/logout', (req, res) => {
  const rawToken = extractCustomerSessionToken(req);
  if (rawToken) {
    db.prepare('DELETE FROM customer_sessions WHERE token_hash = ?').run(
      hashSessionToken(rawToken)
    );
  }
  const https = isRequestHttps(req);
  res.clearCookie(CUSTOMER_COOKIE_NAME, {
    path: '/',
    sameSite: https ? 'none' : 'lax',
    secure: https,
  });
  res.json({ ok: true });
});

app.get('/api/customer/account', requireCustomer, (req: CustomerAuthenticatedRequest, res) => {
  const customer = req.customerUser!;
  const parsed = parseIndianMobile(customer.mobileNumber);
  if (parsed.valid) {
    linkMatchingOrdersToCustomer(customer.id, parsed.digits10);
  }

  const addresses = db
    .prepare('SELECT * FROM customer_addresses WHERE customer_id = ? ORDER BY is_default DESC, id DESC')
    .all(customer.id)
    .map(rowToCustomerAddress);

  const orders = db
    .prepare('SELECT * FROM orders WHERE customer_id = ? ORDER BY id DESC')
    .all(customer.id)
    .map(rowToOrder);

  res.json({ customer, addresses, orders });
});

app.get('/api/customer/orders', requireCustomer, (req: CustomerAuthenticatedRequest, res) => {
  const customer = req.customerUser!;
  const parsed = parseIndianMobile(customer.mobileNumber);
  if (parsed.valid) {
    linkMatchingOrdersToCustomer(customer.id, parsed.digits10);
  }

  const orders = db
    .prepare('SELECT * FROM orders WHERE customer_id = ? ORDER BY id DESC')
    .all(customer.id)
    .map(rowToOrder);

  res.json({ orders });
});

app.put('/api/customer/profile', requireCustomer, (req: CustomerAuthenticatedRequest, res) => {
  const { name, mobileNumber } = req.body as {
    name?: string;
    mobileNumber?: string;
  };
  const cleanName = (name || '').trim().slice(0, 80);
  if (cleanName.length < 2) {
    return res.status(400).json({ error: 'Please enter your full name (at least 2 characters).' });
  }

  let nextMobile = req.customerUser!.mobileNumber;
  if (mobileNumber !== undefined) {
    const parsedMob = parseIndianMobile(mobileNumber);
    if (!parsedMob.valid) {
      return res.status(400).json({
        error: 'Please enter a valid 10-digit Indian mobile number.',
      });
    }
    if (parsedMob.e164 !== req.customerUser!.mobileNumber) {
      const taken = db
        .prepare('SELECT id FROM customers WHERE mobile_number = ? AND id != ?')
        .get(parsedMob.e164, req.customerUser!.id);
      if (taken) {
        return res.status(409).json({
          error: 'This mobile number is already registered with another customer profile.',
        });
      }
    }
    nextMobile = parsedMob.e164;
    linkMatchingOrdersToCustomer(req.customerUser!.id, parsedMob.digits10);
  }

  const nowIso = new Date().toISOString();
  db.prepare(
    'UPDATE customers SET name = ?, mobile_number = ?, updated_at = ? WHERE id = ?'
  ).run(cleanName, nextMobile, nowIso, req.customerUser!.id);

  const updated = db.prepare('SELECT * FROM customers WHERE id = ?').get(req.customerUser!.id);
  res.json({ customer: rowToCustomer(updated) });
});

app.get('/api/customer/addresses', requireCustomer, (req: CustomerAuthenticatedRequest, res) => {
  const addresses = db
    .prepare('SELECT * FROM customer_addresses WHERE customer_id = ? ORDER BY is_default DESC, id DESC')
    .all(req.customerUser!.id)
    .map(rowToCustomerAddress);
  res.json({ addresses });
});

app.post('/api/customer/addresses', requireCustomer, (req: CustomerAuthenticatedRequest, res) => {
  const { label, recipientName, mobileNumber, deliveryAddress, city, pincode, isDefault } =
    req.body as {
      label?: string;
      recipientName?: string;
      mobileNumber?: string;
      deliveryAddress?: string;
      city?: string;
      pincode?: string;
      isDefault?: boolean;
    };

  const cleanLabel = (label || 'Home').trim().slice(0, 30) || 'Home';
  const cleanRecipient = (recipientName || req.customerUser!.name || '').trim();
  const parsedMobile = parseIndianMobile(mobileNumber || req.customerUser!.mobileNumber);
  const cleanAddress = (deliveryAddress || '').trim();
  const cleanCity = (city || '').trim();
  const cleanPincode = (pincode || '').trim();

  if (cleanRecipient.length < 2) {
    return res.status(400).json({ error: 'Recipient name is required.' });
  }
  if (!parsedMobile.valid) {
    return res.status(400).json({ error: 'Valid 10-digit Indian mobile number is required.' });
  }
  if (cleanAddress.length < 8) {
    return res.status(400).json({ error: 'Please enter a complete street delivery address.' });
  }
  if (cleanCity.length < 2) {
    return res.status(400).json({ error: 'Please enter city / state.' });
  }
  if (!/^\d{6}$/.test(cleanPincode)) {
    return res.status(400).json({ error: 'Please enter a valid 6-digit Indian PIN code.' });
  }

  const existingCount = db
    .prepare('SELECT COUNT(*) as c FROM customer_addresses WHERE customer_id = ?')
    .get(req.customerUser!.id) as { c: number };
  const makeDefault = Boolean(isDefault) || existingCount.c === 0;

  if (makeDefault) {
    db.prepare('UPDATE customer_addresses SET is_default = 0 WHERE customer_id = ?').run(
      req.customerUser!.id
    );
  }

  const info = db
    .prepare(
      `INSERT INTO customer_addresses (
        customer_id, label, recipient_name, mobile_number, delivery_address, city, pincode, is_default, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      req.customerUser!.id,
      cleanLabel,
      cleanRecipient,
      parsedMobile.e164,
      cleanAddress,
      cleanCity,
      cleanPincode,
      makeDefault ? 1 : 0,
      new Date().toISOString()
    );

  const created = db.prepare('SELECT * FROM customer_addresses WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json({ address: rowToCustomerAddress(created) });
});

app.put('/api/customer/addresses/:id', requireCustomer, (req: CustomerAuthenticatedRequest, res) => {
  const addrId = Number(req.params.id);
  const existing = db
    .prepare('SELECT * FROM customer_addresses WHERE id = ? AND customer_id = ?')
    .get(addrId, req.customerUser!.id) as any;
  if (!existing) {
    return res.status(404).json({ error: 'Address not found.' });
  }

  const { label, recipientName, mobileNumber, deliveryAddress, city, pincode, isDefault } =
    req.body as {
      label?: string;
      recipientName?: string;
      mobileNumber?: string;
      deliveryAddress?: string;
      city?: string;
      pincode?: string;
      isDefault?: boolean;
    };

  const cleanLabel = (label ?? existing.label).trim().slice(0, 30) || 'Home';
  const cleanRecipient = (recipientName ?? existing.recipient_name).trim();
  const parsedMobile = parseIndianMobile(mobileNumber ?? existing.mobile_number);
  const cleanAddress = (deliveryAddress ?? existing.delivery_address).trim();
  const cleanCity = (city ?? existing.city).trim();
  const cleanPincode = (pincode ?? existing.pincode).trim();

  if (cleanRecipient.length < 2 || !parsedMobile.valid || cleanAddress.length < 8 || cleanCity.length < 2 || !/^\d{6}$/.test(cleanPincode)) {
    return res.status(400).json({ error: 'Please complete all delivery address fields properly.' });
  }

  const nextDefault = isDefault !== undefined ? Boolean(isDefault) : Boolean(existing.is_default);
  if (nextDefault) {
    db.prepare('UPDATE customer_addresses SET is_default = 0 WHERE customer_id = ?').run(
      req.customerUser!.id
    );
  }

  db.prepare(
    `UPDATE customer_addresses
     SET label = ?, recipient_name = ?, mobile_number = ?, delivery_address = ?, city = ?, pincode = ?, is_default = ?
     WHERE id = ? AND customer_id = ?`
  ).run(
    cleanLabel,
    cleanRecipient,
    parsedMobile.e164,
    cleanAddress,
    cleanCity,
    cleanPincode,
    nextDefault ? 1 : 0,
    addrId,
    req.customerUser!.id
  );

  const updated = db.prepare('SELECT * FROM customer_addresses WHERE id = ?').get(addrId);
  res.json({ address: rowToCustomerAddress(updated) });
});

app.delete('/api/customer/addresses/:id', requireCustomer, (req: CustomerAuthenticatedRequest, res) => {
  const addrId = Number(req.params.id);
  const info = db
    .prepare('DELETE FROM customer_addresses WHERE id = ? AND customer_id = ?')
    .run(addrId, req.customerUser!.id);
  if (info.changes === 0) {
    return res.status(404).json({ error: 'Address not found.' });
  }
  const firstRemaining = db
    .prepare('SELECT id FROM customer_addresses WHERE customer_id = ? ORDER BY is_default DESC, id DESC LIMIT 1')
    .get(req.customerUser!.id) as { id: number } | undefined;
  if (firstRemaining) {
    const hasDefault = db
      .prepare('SELECT id FROM customer_addresses WHERE customer_id = ? AND is_default = 1')
      .get(req.customerUser!.id);
    if (!hasDefault) {
      db.prepare('UPDATE customer_addresses SET is_default = 1 WHERE id = ?').run(firstRemaining.id);
    }
  }
  res.json({ ok: true });
});

// ---------- ADMIN AUTH ROUTES ----------

app.get('/api/admin/status', (_req, res) => {
  const row = db.prepare('SELECT needs_setup FROM admin_users ORDER BY id ASC LIMIT 1').get() as
    | { needs_setup: number }
    | undefined;
  res.json({
    needsSetup: !row || Boolean(row.needs_setup),
  });
});

app.get('/api/admin/me', (req, res) => {
  const rawToken = extractSessionToken(req);
  if (!rawToken) {
    return res.json({ authenticated: false, admin: null });
  }
  const tokenHash = hashSessionToken(rawToken);
  const row = db
    .prepare(
      `SELECT s.expires_at, a.id, a.email, a.name
       FROM sessions s
       JOIN admin_users a ON a.id = s.admin_id
       WHERE s.token_hash = ?`
    )
    .get(tokenHash) as { expires_at: number; id: number; email: string; name: string } | undefined;

  if (!row || row.expires_at < Date.now()) {
    return res.json({ authenticated: false, admin: null });
  }
  res.json({ authenticated: true, admin: { id: row.id, email: row.email, name: row.name } });
});

app.post('/api/admin/login', (req, res) => {
  const { email, password } = req.body as { email?: string; password?: string };
  const cleanEmail = (email || '').trim().toLowerCase();
  if (!cleanEmail || !password) {
    return res.status(400).json({ error: 'Owner email and password are required.' });
  }

  if (cleanEmail === CUSTOMER_CARE_EMAIL) {
    return res.status(401).json({
      error:
        'Please sign in with your private Owner Login Email (not the public Customer Care email).',
    });
  }

  const admin = db.prepare('SELECT * FROM admin_users WHERE email = ?').get(cleanEmail) as any;
  if (!admin) {
    return res.status(401).json({ error: 'Invalid owner credentials.' });
  }

  if (admin.locked_until && admin.locked_until > Date.now()) {
    const minsLeft = Math.ceil((admin.locked_until - Date.now()) / 60000);
    return res.status(429).json({
      error: `Too many failed attempts. Try again in ${minsLeft} minute(s) or reset with your Recovery Key.`,
    });
  }

  if (admin.needs_setup) {
    return res.status(403).json({
      error: 'Owner account setup is not completed yet. Use your Recovery Key to initialize your password.',
    });
  }

  if (!verifyPassword(password, admin.password_hash, admin.salt)) {
    const nextAttempts = (admin.failed_attempts || 0) + 1;
    const lockedUntil = nextAttempts >= MAX_FAILED_ATTEMPTS ? Date.now() + LOCKOUT_MS : 0;
    db.prepare('UPDATE admin_users SET failed_attempts = ?, locked_until = ? WHERE id = ?').run(
      nextAttempts,
      lockedUntil,
      admin.id
    );
    return res.status(401).json({ error: 'Invalid owner credentials.' });
  }

  db.prepare('UPDATE admin_users SET failed_attempts = 0, locked_until = 0 WHERE id = ?').run(
    admin.id
  );

  const sessionToken = issueAdminSession(req, res, admin.id);

  res.json({
    authenticated: true,
    sessionToken,
    admin: { id: admin.id, email: admin.email, name: admin.name },
  });
});

app.post('/api/admin/setup', (req, res) => {
  const { email, name, password, recoveryKey, setupKey } = req.body as {
    email?: string;
    name?: string;
    password?: string;
    recoveryKey?: string;
    setupKey?: string;
  };

  const existing = db.prepare('SELECT * FROM admin_users ORDER BY id ASC LIMIT 1').get() as any;
  if (existing && !existing.needs_setup) {
    return res.status(403).json({
      error: 'Owner account is already initialized. Sign in or use Reset Password.',
    });
  }

  const serverKey = getServerRecoveryKey();
  if (!setupKey || !timingSafeTextEqual(setupKey.trim(), serverKey)) {
    return res.status(401).json({ error: 'Invalid Server Setup / Recovery Key.' });
  }

  const cleanEmail = (email || '').trim().toLowerCase();
  if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
    return res.status(400).json({ error: 'Please enter a valid owner email address.' });
  }
  if (cleanEmail === CUSTOMER_CARE_EMAIL) {
    return res.status(400).json({
      error: 'Owner Login Email must remain separate from the Customer Care email.',
    });
  }
  if (!password || password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters.' });
  }

  const cleanName = (name || 'OJAS Owner').trim();
  const personalRecovery = (recoveryKey || '').trim() || serverKey;
  if (personalRecovery.length < 8) {
    return res.status(400).json({ error: 'Recovery key must be at least 8 characters.' });
  }

  const { hash, salt } = hashPassword(password);
  const { hash: recHash, salt: recSalt } = hashPassword(personalRecovery);
  const now = new Date().toISOString();

  let adminId: number;
  if (existing) {
    db.prepare(
      `UPDATE admin_users
       SET email = ?, name = ?, password_hash = ?, salt = ?,
           recovery_hash = ?, recovery_salt = ?, needs_setup = 0,
           failed_attempts = 0, locked_until = 0
       WHERE id = ?`
    ).run(cleanEmail, cleanName, hash, salt, recHash, recSalt, existing.id);
    adminId = existing.id;
  } else {
    const info = db
      .prepare(
        `INSERT INTO admin_users (
          email, name, password_hash, salt, recovery_hash, recovery_salt, needs_setup, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, 0, ?)`
      )
      .run(cleanEmail, cleanName, hash, salt, recHash, recSalt, now);
    adminId = Number(info.lastInsertRowid);
  }

  const sessionToken = issueAdminSession(req, res, adminId);
  res.json({
    authenticated: true,
    sessionToken,
    admin: { id: adminId, email: cleanEmail, name: cleanName },
  });
});

app.post('/api/admin/reset-password', (req, res) => {
  const { email, newEmail, recoveryKey, newPassword } = req.body as {
    email?: string;
    newEmail?: string;
    recoveryKey?: string;
    newPassword?: string;
  };

  const cleanRecovery = (recoveryKey || '').trim();
  if (!cleanRecovery) {
    return res.status(400).json({ error: 'Recovery Key is required.' });
  }
  if (!newPassword || newPassword.length < 8) {
    return res.status(400).json({ error: 'New password must be at least 8 characters.' });
  }

  const targetEmail = (email || '').trim().toLowerCase();
  const updatedEmail = (newEmail || targetEmail).trim().toLowerCase();

  if (!updatedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(updatedEmail)) {
    return res.status(400).json({ error: 'Please enter a valid Owner Login Email.' });
  }
  if (updatedEmail === CUSTOMER_CARE_EMAIL) {
    return res.status(400).json({
      error: 'Owner Login Email must stay separate from the Customer Care email.',
    });
  }

  const primaryAdmin = db.prepare('SELECT * FROM admin_users ORDER BY id ASC LIMIT 1').get() as any;
  const matchedByEmail = targetEmail
    ? (db.prepare('SELECT * FROM admin_users WHERE email = ?').get(targetEmail) as any)
    : null;
  const targetAdmin = matchedByEmail || primaryAdmin;

  if (!targetAdmin) {
    return res.status(404).json({ error: 'Owner account not found.' });
  }

  if (targetAdmin.locked_until && targetAdmin.locked_until > Date.now()) {
    const minsLeft = Math.ceil((targetAdmin.locked_until - Date.now()) / 60000);
    return res.status(429).json({
      error: `Account temporarily locked due to failed attempts. Try again in ${minsLeft} minute(s).`,
    });
  }

  const serverKey = getServerRecoveryKey();
  const matchesServerKey = timingSafeTextEqual(cleanRecovery, serverKey);
  const matchesPersonalRecovery =
    Boolean(targetAdmin.recovery_hash && targetAdmin.recovery_salt) &&
    verifyPassword(cleanRecovery, targetAdmin.recovery_hash, targetAdmin.recovery_salt);

  // If resetting via personal recovery key (not server master key), email must match existing owner email
  if (!matchesServerKey && (!matchedByEmail || !matchesPersonalRecovery)) {
    const nextAttempts = (targetAdmin.failed_attempts || 0) + 1;
    const lockedUntil = nextAttempts >= MAX_FAILED_ATTEMPTS ? Date.now() + LOCKOUT_MS : 0;
    db.prepare('UPDATE admin_users SET failed_attempts = ?, locked_until = ? WHERE id = ?').run(
      nextAttempts,
      lockedUntil,
      targetAdmin.id
    );
    return res.status(401).json({ error: 'Invalid owner email or recovery key.' });
  }

  const { hash, salt } = hashPassword(newPassword);
  db.prepare(
    `UPDATE admin_users
     SET email = ?, password_hash = ?, salt = ?, needs_setup = 0, failed_attempts = 0, locked_until = 0
     WHERE id = ?`
  ).run(updatedEmail, hash, salt, targetAdmin.id);

  // Invalidate all existing sessions for security and issue a fresh session
  db.prepare('DELETE FROM sessions WHERE admin_id = ?').run(targetAdmin.id);
  const sessionToken = issueAdminSession(req, res, targetAdmin.id);

  res.json({
    authenticated: true,
    sessionToken,
    admin: { id: targetAdmin.id, email: updatedEmail, name: targetAdmin.name },
  });
});

app.post('/api/admin/logout', (req, res) => {
  const rawToken = extractSessionToken(req);
  if (rawToken) {
    db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(hashSessionToken(rawToken));
  }
  const https = isRequestHttps(req);
  res.clearCookie(SESSION_COOKIE_NAME, {
    path: '/',
    sameSite: https ? 'none' : 'lax',
    secure: https,
  });
  res.json({ ok: true });
});

app.put('/api/admin/password', requireAdmin, (req: AuthenticatedRequest, res) => {
  const { currentPassword, newPassword } = req.body as {
    currentPassword?: string;
    newPassword?: string;
  };
  if (!currentPassword || !newPassword || newPassword.length < 8) {
    return res.status(400).json({ error: 'New password must be at least 8 characters.' });
  }
  const admin = db.prepare('SELECT * FROM admin_users WHERE id = ?').get(req.adminUser!.id) as any;
  if (!admin || !verifyPassword(currentPassword, admin.password_hash, admin.salt)) {
    return res.status(400).json({ error: 'Current password is incorrect.' });
  }
  const { hash, salt } = hashPassword(newPassword);
  db.prepare('UPDATE admin_users SET password_hash = ?, salt = ? WHERE id = ?').run(
    hash,
    salt,
    admin.id
  );
  res.json({ ok: true });
});

app.put('/api/admin/security', requireAdmin, (req: AuthenticatedRequest, res) => {
  const { currentPassword, newEmail, newName, newPassword, newRecoveryKey } = req.body as {
    currentPassword?: string;
    newEmail?: string;
    newName?: string;
    newPassword?: string;
    newRecoveryKey?: string;
  };

  if (!currentPassword) {
    return res.status(400).json({ error: 'Current password is required to update security settings.' });
  }

  const admin = db.prepare('SELECT * FROM admin_users WHERE id = ?').get(req.adminUser!.id) as any;
  if (!admin || !verifyPassword(currentPassword, admin.password_hash, admin.salt)) {
    return res.status(400).json({ error: 'Current password is incorrect.' });
  }

  const nextEmail = (newEmail || admin.email).trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(nextEmail)) {
    return res.status(400).json({ error: 'Please enter a valid owner email.' });
  }
  if (nextEmail === CUSTOMER_CARE_EMAIL) {
    return res.status(400).json({
      error: `Owner Login Email must remain separate from Customer Care email (${CUSTOMER_CARE_EMAIL}).`,
    });
  }

  const nextName = (newName || admin.name).trim();
  let nextHash = admin.password_hash;
  let nextSalt = admin.salt;
  if (newPassword) {
    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'New password must be at least 8 characters.' });
    }
    const hashed = hashPassword(newPassword);
    nextHash = hashed.hash;
    nextSalt = hashed.salt;
  }

  let nextRecHash = admin.recovery_hash;
  let nextRecSalt = admin.recovery_salt;
  if (newRecoveryKey) {
    if (newRecoveryKey.trim().length < 8) {
      return res.status(400).json({ error: 'New recovery key must be at least 8 characters.' });
    }
    const hashedRec = hashPassword(newRecoveryKey.trim());
    nextRecHash = hashedRec.hash;
    nextRecSalt = hashedRec.salt;
  }

  db.prepare(
    `UPDATE admin_users
     SET email = ?, name = ?, password_hash = ?, salt = ?, recovery_hash = ?, recovery_salt = ?
     WHERE id = ?`
  ).run(nextEmail, nextName, nextHash, nextSalt, nextRecHash, nextRecSalt, admin.id);

  res.json({
    ok: true,
    admin: { id: admin.id, email: nextEmail, name: nextName },
  });
});

// ---------- PROTECTED OWNER-ONLY ADMIN ROUTES ----------

app.get('/api/admin/dashboard', requireAdmin, (_req, res) => {
  const products = db
    .prepare('SELECT * FROM products ORDER BY sort_order ASC, id ASC')
    .all()
    .map(rowToProduct);
  const categories = db
    .prepare(
      `SELECT c.*, (SELECT COUNT(*) FROM products p WHERE LOWER(p.category) = LOWER(c.name)) as product_count
       FROM categories c
       ORDER BY c.sort_order ASC, c.id ASC`
    )
    .all()
    .map(rowToCategory);
  const orders = db.prepare('SELECT * FROM orders ORDER BY id DESC').all().map(rowToOrder);
  const content = getSiteContent();
  const messages = db
    .prepare('SELECT * FROM contact_messages ORDER BY id DESC')
    .all()
    .map((m: any) => ({
      id: m.id,
      name: m.name,
      mobile: m.mobile,
      email: m.email,
      message: m.message,
      readStatus: Boolean(m.read_status),
      status: (m.status || (m.read_status ? 'In Progress' : 'Open')) as SupportTicketStatus,
      replyNote: m.reply_note || '',
      createdAt: m.created_at,
    }));
  res.json({
    products,
    categories,
    orders,
    content,
    messages,
    integrations: {
      courierApiConnected: Boolean(process.env.SHIPROCKET_TOKEN || process.env.DELHIVERY_TOKEN),
      paymentGatewayWebhookConnected: Boolean(process.env.RAZORPAY_WEBHOOK_SECRET || process.env.PAYTM_MERCHANT_KEY),
    },
  });
});

app.post('/api/admin/upload', requireAdmin, (req, res) => {
  upload.single('image')(req, res, (err) => {
    if (err) {
      return res.status(400).json({ error: err.message || 'Image upload failed.' });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided.' });
    }
    res.status(201).json({ url: `/uploads/${req.file.filename}` });
  });
});

// Category Management CRUD
app.get('/api/admin/categories', requireAdmin, (_req, res) => {
  const categories = db
    .prepare(
      `SELECT c.*, (SELECT COUNT(*) FROM products p WHERE LOWER(p.category) = LOWER(c.name)) as product_count
       FROM categories c
       ORDER BY c.sort_order ASC, c.id ASC`
    )
    .all()
    .map(rowToCategory);
  res.json({ categories });
});

app.post('/api/admin/categories', requireAdmin, (req, res) => {
  const { name, description, active } = req.body as {
    name?: string;
    description?: string;
    active?: boolean;
  };
  const cleanName = (name || '').trim().slice(0, 60);
  if (cleanName.length < 2) {
    return res.status(400).json({ error: 'Category name must be at least 2 characters.' });
  }
  const existing = db
    .prepare('SELECT id FROM categories WHERE LOWER(name) = LOWER(?)')
    .get(cleanName);
  if (existing) {
    return res.status(409).json({ error: 'A category with this name already exists.' });
  }
  const baseSlug =
    cleanName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || `cat-${Date.now()}`;
  const slugTaken = db.prepare('SELECT id FROM categories WHERE slug = ?').get(baseSlug);
  const slug = slugTaken ? `${baseSlug}-${Date.now().toString().slice(-4)}` : baseSlug;
  const maxSort = db.prepare('SELECT COALESCE(MAX(sort_order), 0) as m FROM categories').get() as {
    m: number;
  };

  const info = db
    .prepare(
      'INSERT INTO categories (slug, name, description, active, sort_order, created_at) VALUES (?, ?, ?, ?, ?, ?)'
    )
    .run(
      slug,
      cleanName,
      (description || '').trim().slice(0, 240),
      active === false ? 0 : 1,
      maxSort.m + 1,
      new Date().toISOString()
    );

  const created = db
    .prepare('SELECT c.*, 0 as product_count FROM categories c WHERE c.id = ?')
    .get(info.lastInsertRowid);
  res.status(201).json({ category: rowToCategory(created) });
});

app.put('/api/admin/categories/:id', requireAdmin, (req, res) => {
  const catId = Number(req.params.id);
  const existing = db.prepare('SELECT * FROM categories WHERE id = ?').get(catId) as any;
  if (!existing) {
    return res.status(404).json({ error: 'Category not found.' });
  }

  const { name, description, active } = req.body as {
    name?: string;
    description?: string;
    active?: boolean;
  };
  const nextName = (name ?? existing.name).trim().slice(0, 60);
  if (nextName.length < 2) {
    return res.status(400).json({ error: 'Category name must be at least 2 characters.' });
  }

  const duplicate = db
    .prepare('SELECT id FROM categories WHERE LOWER(name) = LOWER(?) AND id != ?')
    .get(nextName, catId);
  if (duplicate) {
    return res.status(409).json({ error: 'Another category already uses this name.' });
  }

  const tx = db.transaction(() => {
    db.prepare('UPDATE categories SET name = ?, description = ?, active = ? WHERE id = ?').run(
      nextName,
      (description ?? existing.description).trim().slice(0, 240),
      active !== undefined ? (active ? 1 : 0) : existing.active,
      catId
    );
    if (nextName !== existing.name) {
      db.prepare('UPDATE products SET category = ?, updated_at = ? WHERE LOWER(category) = LOWER(?)').run(
        nextName,
        new Date().toISOString(),
        existing.name
      );
    }
  });
  tx();

  const updated = db
    .prepare(
      `SELECT c.*, (SELECT COUNT(*) FROM products p WHERE LOWER(p.category) = LOWER(c.name)) as product_count
       FROM categories c WHERE c.id = ?`
    )
    .get(catId);
  res.json({ category: rowToCategory(updated) });
});

app.delete('/api/admin/categories/:id', requireAdmin, (req, res) => {
  const catId = Number(req.params.id);
  const existing = db.prepare('SELECT * FROM categories WHERE id = ?').get(catId) as any;
  if (!existing) {
    return res.status(404).json({ error: 'Category not found.' });
  }
  const used = db
    .prepare('SELECT COUNT(*) as c FROM products WHERE LOWER(category) = LOWER(?)')
    .get(existing.name) as { c: number };
  if (used.c > 0) {
    return res.status(409).json({
      error: `Cannot delete "${existing.name}" because ${used.c} product(s) are assigned to it. Reassign those products first.`,
    });
  }
  db.prepare('DELETE FROM categories WHERE id = ?').run(catId);
  res.json({ ok: true });
});

app.post('/api/admin/products', requireAdmin, (req, res) => {
  try {
    const body = req.body as Partial<Product>;
    const name = (body.name || '').trim();
    if (!name) return res.status(400).json({ error: 'Product name is required.' });

    const baseSlug = (body.slug || name)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    const uniqueSlug = `${baseSlug || 'ojas-product'}-${Date.now().toString().slice(-4)}`;
    const existingSlug = db.prepare('SELECT id FROM products WHERE slug = ?').get(baseSlug);
    const finalSlug = existingSlug ? uniqueSlug : baseSlug;

    const variants = Array.isArray(body.variants) && body.variants.length > 0
      ? body.variants.map((v) => ({
          ...v,
          price: Number(v.price),
          stock: Number(v.stock),
          compareAtPrice: v.compareAtPrice ? Number(v.compareAtPrice) : undefined,
          discountPercent: v.discountPercent ? Number(v.discountPercent) : undefined,
        }))
      : [{ id: `v-${Date.now()}`, label: '100g Standard', price: 499, stock: 20, sku: 'OJAS-NEW-100' }];

    const details: ProductDetails = body.details || {
      highlights: ['Crafted in small batches with natural ingredients'],
      intendedUses: ['Everyday mindful household use'],
      materialsOrComposition: 'Natural botanical materials',
      storageAndCare: 'Store in a cool, dry place',
      craftNote: 'Handcrafted by OJAS in India.',
      origin: 'India',
    };

    const images = Array.isArray(body.images) ? body.images : [];
    const categoryName = (body.category || 'Natural Essentials').trim();
    const now = new Date().toISOString();
    const maxSort = db.prepare('SELECT COALESCE(MAX(sort_order), 0) as m FROM products').get() as { m: number };

    // Ensure category exists in categories table
    const catSlug = categoryName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || `cat-${Date.now()}`;
    db.prepare(
      'INSERT OR IGNORE INTO categories (slug, name, description, active, sort_order, created_at) VALUES (?, ?, ?, 1, 99, ?)'
    ).run(catSlug, categoryName, `${categoryName} crafted by OJAS`, now);

    const info = db
      .prepare(
        `INSERT INTO products (
          slug, name, subtitle, category, description,
          details_json, variants_json, images_json, featured, active, sort_order, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        finalSlug,
        name,
        (body.subtitle || 'Natural Small-Batch Essential').trim(),
        categoryName,
        (body.description || '').trim(),
        JSON.stringify(details),
        JSON.stringify(variants),
        JSON.stringify(images),
        body.featured === false ? 0 : 1,
        body.active === false ? 0 : 1,
        maxSort.m + 1,
        now
      );

    const created = db.prepare('SELECT * FROM products WHERE id = ?').get(info.lastInsertRowid);
    res.status(201).json({ product: rowToProduct(created) });
  } catch (err: any) {
    res.status(400).json({ error: err?.message || 'Failed to create product.' });
  }
});

app.put('/api/admin/products/:id', requireAdmin, (req, res) => {
  try {
    const productId = Number(req.params.id);
    const existing = db.prepare('SELECT * FROM products WHERE id = ?').get(productId);
    if (!existing) {
      return res.status(404).json({ error: 'Product not found.' });
    }
    const current = rowToProduct(existing);
    const body = req.body as Partial<Product>;

    const name = (body.name ?? current.name).trim();
    if (!name) return res.status(400).json({ error: 'Product name cannot be empty.' });

    const variants = Array.isArray(body.variants) && body.variants.length > 0 ? body.variants : current.variants;
    for (const v of variants) {
      if (!v.label?.trim() || Number(v.price) < 0 || Number(v.stock) < 0) {
        return res.status(400).json({ error: 'Each weight option must have a label, valid price, and non-negative stock.' });
      }
    }

    const categoryName = (body.category ?? current.category).trim();
    const now = new Date().toISOString();
    const catSlug = categoryName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || `cat-${Date.now()}`;
    db.prepare(
      'INSERT OR IGNORE INTO categories (slug, name, description, active, sort_order, created_at) VALUES (?, ?, ?, 1, 99, ?)'
    ).run(catSlug, categoryName, `${categoryName} crafted by OJAS`, now);

    db.prepare(
      `UPDATE products SET
        name = ?, subtitle = ?, category = ?, description = ?,
        details_json = ?, variants_json = ?, images_json = ?,
        featured = ?, active = ?, updated_at = ?
       WHERE id = ?`
    ).run(
      name,
      (body.subtitle ?? current.subtitle).trim(),
      categoryName,
      (body.description ?? current.description).trim(),
      JSON.stringify(body.details ?? current.details),
      JSON.stringify(variants),
      JSON.stringify(Array.isArray(body.images) ? body.images : current.images),
      (body.featured ?? current.featured) ? 1 : 0,
      (body.active ?? current.active) ? 1 : 0,
      now,
      productId
    );

    const updated = db.prepare('SELECT * FROM products WHERE id = ?').get(productId);
    res.json({ product: rowToProduct(updated) });
  } catch (err: any) {
    res.status(400).json({ error: err?.message || 'Failed to update product.' });
  }
});

// Fast inline inventory / price / discount update per variant
app.put('/api/admin/products/:id/stock', requireAdmin, (req, res) => {
  const productId = Number(req.params.id);
  const existing = db.prepare('SELECT * FROM products WHERE id = ?').get(productId);
  if (!existing) {
    return res.status(404).json({ error: 'Product not found.' });
  }
  const current = rowToProduct(existing);
  const { variants, active } = req.body as {
    variants?: ProductVariant[];
    active?: boolean;
  };
  if (!Array.isArray(variants) || variants.length === 0) {
    return res.status(400).json({ error: 'Variants array is required.' });
  }
  for (const v of variants) {
    if (Number(v.price) < 0 || Number(v.stock) < 0 || Number.isNaN(Number(v.price)) || Number.isNaN(Number(v.stock))) {
      return res.status(400).json({ error: 'Price and stock must be valid non-negative numbers.' });
    }
  }
  const sanitized = variants.map((v) => ({
    ...v,
    price: Math.round(Number(v.price)),
    stock: Math.round(Number(v.stock)),
    compareAtPrice: v.compareAtPrice && Number(v.compareAtPrice) > Number(v.price) ? Math.round(Number(v.compareAtPrice)) : undefined,
    discountPercent: v.discountPercent && Number(v.discountPercent) > 0 ? Math.min(90, Math.round(Number(v.discountPercent))) : undefined,
  }));
  const now = new Date().toISOString();
  db.prepare('UPDATE products SET variants_json = ?, active = ?, updated_at = ? WHERE id = ?').run(
    JSON.stringify(sanitized),
    active !== undefined ? (active ? 1 : 0) : current.active ? 1 : 0,
    now,
    productId
  );
  const updated = db.prepare('SELECT * FROM products WHERE id = ?').get(productId);
  res.json({ product: rowToProduct(updated) });
});

app.delete('/api/admin/products/:id', requireAdmin, (req, res) => {
  const productId = Number(req.params.id);
  const info = db.prepare('DELETE FROM products WHERE id = ?').run(productId);
  if (info.changes === 0) {
    return res.status(404).json({ error: 'Product not found.' });
  }
  res.json({ ok: true });
});

app.put('/api/admin/orders/:id/status', requireAdmin, (req: AuthenticatedRequest, res) => {
  const orderId = Number(req.params.id);
  const { status, courierName, deliveryPartner, trackingNumber, note } = req.body as {
    status?: OrderStatus;
    courierName?: string;
    deliveryPartner?: string;
    trackingNumber?: string;
    note?: string;
  };
  const validStatuses: OrderStatus[] = [
    'Pending',
    'Pending Confirmation',
    'Payment Verification Pending',
    'Confirmed',
    'Processing',
    'Packed',
    'Shipped',
    'Out for Delivery',
    'Delivered',
    'Cancelled',
    'Returned',
  ];
  if (!status || !validStatuses.includes(status)) {
    return res.status(400).json({ error: 'Invalid order status.' });
  }

  const existing = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId) as any;
  if (!existing) {
    return res.status(404).json({ error: 'Order not found.' });
  }

  const now = new Date().toISOString();
  const nextCourier = courierName !== undefined ? courierName.trim().slice(0, 80) : existing.courier_name || '';
  const nextPartner =
    deliveryPartner !== undefined
      ? deliveryPartner.trim().slice(0, 80)
      : nextCourier || existing.delivery_partner || '';
  const nextTracking = trackingNumber !== undefined ? trackingNumber.trim().slice(0, 80) : existing.tracking_number || '';

  const dispatchedAt =
    ['Shipped', 'Out for Delivery', 'Delivered'].includes(status) && !existing.dispatched_at
      ? now
      : existing.dispatched_at || '';
  const deliveredAt = status === 'Delivered' ? existing.delivered_at || now : existing.delivered_at || '';
  const cancelledAt = status === 'Cancelled' ? existing.cancelled_at || now : existing.cancelled_at || '';
  const returnedAt = status === 'Returned' ? existing.returned_at || now : existing.returned_at || '';

  const prevHistory = parseStatusHistory(existing.status_history_json, existing);
  const nextHistory: OrderStatusHistoryItem[] = [
    ...prevHistory,
    {
      status,
      note: (note || `Status updated to ${status}`).trim().slice(0, 240),
      timestamp: now,
      updatedBy: req.adminUser?.name || 'Owner',
      source: 'manual',
    },
  ];

  db.prepare(
    `UPDATE orders
     SET status = ?, courier_name = ?, delivery_partner = ?, tracking_number = ?,
         dispatched_at = ?, delivered_at = ?, cancelled_at = ?, returned_at = ?,
         status_history_json = ?, updated_at = ?
     WHERE id = ?`
  ).run(
    status,
    nextCourier,
    nextPartner,
    nextTracking,
    dispatchedAt,
    deliveredAt,
    cancelledAt,
    returnedAt,
    JSON.stringify(nextHistory),
    now,
    orderId
  );

  const updated = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);
  res.json({ order: rowToOrder(updated) });
});

app.put('/api/admin/orders/:id/courier', requireAdmin, (req: AuthenticatedRequest, res) => {
  const orderId = Number(req.params.id);
  const existing = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId) as any;
  if (!existing) {
    return res.status(404).json({ error: 'Order not found.' });
  }

  const {
    courierName,
    deliveryPartner,
    trackingNumber,
    courierCharges,
    dispatchedAt,
    deliveredAt,
    status,
    note,
  } = req.body as {
    courierName?: string;
    deliveryPartner?: string;
    trackingNumber?: string;
    courierCharges?: number;
    dispatchedAt?: string;
    deliveredAt?: string;
    status?: OrderStatus;
    note?: string;
  };

  const now = new Date().toISOString();
  const nextCourier = (courierName ?? existing.courier_name ?? '').trim().slice(0, 80);
  const nextPartner = (deliveryPartner ?? existing.delivery_partner ?? nextCourier).trim().slice(0, 80);
  const nextTracking = (trackingNumber ?? existing.tracking_number ?? '').trim().slice(0, 80);
  const nextCharges =
    courierCharges !== undefined ? Math.max(0, Math.round(Number(courierCharges) || 0)) : Number(existing.courier_charges || 0);
  const nextStatus = status || (existing.status as OrderStatus);
  const nextDispatched =
    dispatchedAt !== undefined
      ? dispatchedAt
      : ['Shipped', 'Out for Delivery', 'Delivered'].includes(nextStatus) && !existing.dispatched_at
      ? now
      : existing.dispatched_at || '';
  const nextDelivered =
    deliveredAt !== undefined
      ? deliveredAt
      : nextStatus === 'Delivered'
      ? existing.delivered_at || now
      : existing.delivered_at || '';

  const prevHistory = parseStatusHistory(existing.status_history_json, existing);
  const summaryParts = [
    nextPartner ? `Partner: ${nextPartner}` : '',
    nextTracking ? `AWB: ${nextTracking}` : '',
    note ? note.trim() : '',
  ].filter(Boolean);
  const nextHistory: OrderStatusHistoryItem[] = [
    ...prevHistory,
    {
      status: nextStatus,
      note: summaryParts.length > 0 ? summaryParts.join(' · ') : 'Manual courier details updated',
      timestamp: now,
      updatedBy: req.adminUser?.name || 'Owner',
      source: 'manual',
    },
  ];

  db.prepare(
    `UPDATE orders
     SET courier_name = ?, delivery_partner = ?, tracking_number = ?, courier_charges = ?,
         dispatched_at = ?, delivered_at = ?, status = ?, status_history_json = ?, updated_at = ?
     WHERE id = ?`
  ).run(
    nextCourier,
    nextPartner,
    nextTracking,
    nextCharges,
    nextDispatched,
    nextDelivered,
    nextStatus,
    JSON.stringify(nextHistory),
    now,
    orderId
  );

  const updated = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);
  res.json({ order: rowToOrder(updated) });
});

app.put('/api/admin/orders/:id/refund', requireAdmin, (req: AuthenticatedRequest, res) => {
  const orderId = Number(req.params.id);
  const existing = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId) as any;
  if (!existing) {
    return res.status(404).json({ error: 'Order not found.' });
  }

  const { refundStatus, refundAmount, returnReason, markReturned } = req.body as {
    refundStatus?: RefundStatus;
    refundAmount?: number;
    returnReason?: string;
    markReturned?: boolean;
  };
  const validRefunds: RefundStatus[] = ['None', 'Requested', 'Approved', 'Refunded', 'Rejected'];
  if (!refundStatus || !validRefunds.includes(refundStatus)) {
    return res.status(400).json({ error: 'Invalid refund status.' });
  }

  const now = new Date().toISOString();
  const nextAmount =
    refundAmount !== undefined
      ? Math.max(0, Math.min(Number(existing.total_amount), Math.round(Number(refundAmount) || 0)))
      : Number(existing.refund_amount || existing.total_amount);
  const nextReason = (returnReason ?? existing.return_reason ?? '').trim().slice(0, 300);
  const nextOrderStatus: OrderStatus =
    markReturned || refundStatus === 'Refunded'
      ? existing.status === 'Cancelled'
        ? 'Cancelled'
        : 'Returned'
      : (existing.status as OrderStatus);
  const nextPaymentStatus: PaymentStatus =
    refundStatus === 'Refunded' && existing.payment_status === 'Verified Paid'
      ? 'Refunded'
      : (existing.payment_status as PaymentStatus);
  const nextReturnedAt =
    nextOrderStatus === 'Returned' ? existing.returned_at || now : existing.returned_at || '';

  const prevHistory = parseStatusHistory(existing.status_history_json, existing);
  const nextHistory: OrderStatusHistoryItem[] = [
    ...prevHistory,
    {
      status: nextOrderStatus,
      note: `Return/Refund: ${refundStatus} (₹${nextAmount})${nextReason ? ` — ${nextReason}` : ''}`,
      timestamp: now,
      updatedBy: req.adminUser?.name || 'Owner',
      source: 'manual',
    },
  ];

  db.prepare(
    `UPDATE orders
     SET refund_status = ?, refund_amount = ?, return_reason = ?, status = ?, payment_status = ?,
         returned_at = ?, status_history_json = ?, updated_at = ?
     WHERE id = ?`
  ).run(
    refundStatus,
    nextAmount,
    nextReason,
    nextOrderStatus,
    nextPaymentStatus,
    nextReturnedAt,
    JSON.stringify(nextHistory),
    now,
    orderId
  );

  const updated = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);
  res.json({ order: rowToOrder(updated) });
});

app.put('/api/admin/orders/:id/verify-payment', requireAdmin, (req: AuthenticatedRequest, res) => {
  const orderId = Number(req.params.id);
  const { action } = req.body as { action?: 'verify' | 'reject' | 'collect_cod' };
  if (action !== 'verify' && action !== 'reject' && action !== 'collect_cod') {
    return res.status(400).json({ error: 'Invalid payment verification action.' });
  }

  const existing = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId) as any;
  if (!existing) {
    return res.status(404).json({ error: 'Order not found.' });
  }

  const now = new Date().toISOString();
  const prevHistory = parseStatusHistory(existing.status_history_json, existing);

  if (action === 'verify' || action === 'collect_cod') {
    const progressedStatuses: OrderStatus[] = ['Confirmed', 'Processing', 'Packed', 'Shipped', 'Out for Delivery', 'Delivered'];
    const nextStatus: OrderStatus = progressedStatuses.includes(existing.status as OrderStatus)
      ? (existing.status as OrderStatus)
      : 'Confirmed';

    const nextHistory: OrderStatusHistoryItem[] = [
      ...prevHistory,
      {
        status: nextStatus,
        note:
          action === 'collect_cod'
            ? 'Owner confirmed Cash on Delivery payment received'
            : `Owner verified UPI payment${existing.upi_transaction_id ? ` (UTR: ${existing.upi_transaction_id})` : ''}`,
        timestamp: now,
        updatedBy: req.adminUser?.name || 'Owner',
        source: 'manual',
      },
    ];

    db.prepare(
      `UPDATE orders
       SET payment_status = 'Verified Paid',
           payment_verified_at = ?,
           status = ?,
           status_history_json = ?,
           updated_at = ?
       WHERE id = ?`
    ).run(now, nextStatus, JSON.stringify(nextHistory), now, orderId);
  } else {
    const nextStatus: OrderStatus =
      existing.status === 'Payment Verification Pending' ? 'Pending Confirmation' : existing.status;
    const nextHistory: OrderStatusHistoryItem[] = [
      ...prevHistory,
      {
        status: nextStatus,
        note: 'Owner marked UPI payment verification as rejected',
        timestamp: now,
        updatedBy: req.adminUser?.name || 'Owner',
        source: 'manual',
      },
    ];
    db.prepare(
      `UPDATE orders
       SET payment_status = 'Payment Rejected',
           status = ?,
           status_history_json = ?,
           updated_at = ?
       WHERE id = ?`
    ).run(nextStatus, JSON.stringify(nextHistory), now, orderId);
  }

  const updated = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);
  res.json({ order: rowToOrder(updated) });
});

app.get('/api/admin/customers', requireAdmin, (req, res) => {
  const search = String(req.query.search || '').trim();
  const rows = db
    .prepare(
      `SELECT
         c.id,
         c.mobile_number,
         c.name,
         c.email,
         c.created_at,
         (SELECT COUNT(*) FROM customer_addresses ca WHERE ca.customer_id = c.id) as address_count,
         (SELECT COUNT(*) FROM orders o WHERE o.customer_id = c.id) as order_count,
         (SELECT COALESCE(SUM(CASE WHEN o.status != 'Cancelled' THEN o.total_amount ELSE 0 END), 0) FROM orders o WHERE o.customer_id = c.id) as total_spent,
         (SELECT MAX(o.created_at) FROM orders o WHERE o.customer_id = c.id) as last_order_at
       FROM customers c
       WHERE (? = '' OR c.mobile_number LIKE ? OR LOWER(c.name) LIKE LOWER(?))
       ORDER BY c.id DESC`
    )
    .all(search, `%${search}%`, `%${search}%`) as any[];

  const customers: AdminCustomerSummary[] = rows.map((r) => ({
    id: r.id,
    mobileNumber: r.mobile_number || '',
    name: r.name || 'OJAS Customer',
    email: r.email || '',
    addressCount: Number(r.address_count || 0),
    orderCount: Number(r.order_count || 0),
    totalSpent: Number(r.total_spent || 0),
    lastOrderAt: r.last_order_at || null,
    createdAt: r.created_at,
  }));

  res.json({ customers });
});

app.get('/api/admin/customers/:id', requireAdmin, (req, res) => {
  const customerId = Number(req.params.id);
  const customerRow = db.prepare('SELECT * FROM customers WHERE id = ?').get(customerId) as any;
  if (!customerRow) {
    return res.status(404).json({ error: 'Customer account not found.' });
  }

  const addresses = db
    .prepare('SELECT * FROM customer_addresses WHERE customer_id = ? ORDER BY is_default DESC, id DESC')
    .all(customerId)
    .map(rowToCustomerAddress);

  const orders = db
    .prepare('SELECT * FROM orders WHERE customer_id = ? ORDER BY id DESC')
    .all(customerId)
    .map(rowToOrder);

  res.json({
    customer: rowToCustomer(customerRow),
    addresses,
    orders,
  });
});

app.put('/api/admin/content', requireAdmin, (req, res) => {
  const current = getSiteContent();
  const nextContent: SiteContent = {
    ...current,
    ...req.body,
  };
  db.prepare('UPDATE site_content SET value_json = ?, updated_at = ? WHERE key = ?').run(
    JSON.stringify(nextContent),
    new Date().toISOString(),
    'main'
  );
  res.json({ content: nextContent });
});

app.put('/api/admin/messages/:id/read', requireAdmin, (req, res) => {
  db.prepare(
    "UPDATE contact_messages SET read_status = 1, status = CASE WHEN status = 'Open' THEN 'In Progress' ELSE status END WHERE id = ?"
  ).run(Number(req.params.id));
  res.json({ ok: true });
});

app.put('/api/admin/messages/:id', requireAdmin, (req, res) => {
  const msgId = Number(req.params.id);
  const existing = db.prepare('SELECT * FROM contact_messages WHERE id = ?').get(msgId) as any;
  if (!existing) {
    return res.status(404).json({ error: 'Support message not found.' });
  }
  const { status, replyNote, readStatus } = req.body as {
    status?: SupportTicketStatus;
    replyNote?: string;
    readStatus?: boolean;
  };
  const validStatuses: SupportTicketStatus[] = ['Open', 'In Progress', 'Resolved'];
  const nextStatus: SupportTicketStatus =
    status && validStatuses.includes(status) ? status : (existing.status || 'Open');
  const nextRead = readStatus !== undefined ? (readStatus ? 1 : 0) : nextStatus !== 'Open' ? 1 : existing.read_status;
  const nextNote = replyNote !== undefined ? replyNote.trim().slice(0, 500) : existing.reply_note || '';

  db.prepare('UPDATE contact_messages SET status = ?, reply_note = ?, read_status = ? WHERE id = ?').run(
    nextStatus,
    nextNote,
    nextRead,
    msgId
  );
  res.json({
    message: {
      id: existing.id,
      name: existing.name,
      mobile: existing.mobile,
      email: existing.email,
      message: existing.message,
      readStatus: Boolean(nextRead),
      status: nextStatus,
      replyNote: nextNote,
      createdAt: existing.created_at,
    },
  });
});

// ---------- VITE / SPA SERVING ----------

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir, { maxAge: '1d' }));
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api/') || req.path.startsWith('/uploads/')) {
        return next();
      }
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`OJAS server running at http://localhost:${PORT}`);
  });
}

startServer();
