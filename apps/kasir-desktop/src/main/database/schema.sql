-- Tabel konfigurasi lokal, termasuk identitas tenant hasil onboarding nanti
CREATE TABLE IF NOT EXISTS app_config (
  key TEXT PRIMARY KEY,
  value TEXT
);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  nama TEXT NOT NULL,
  pin_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('kasir', 'admin', 'owner'))
);

CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  nama_kategori TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS menu_items (
  id TEXT PRIMARY KEY,
  nama TEXT NOT NULL,
  kategori_id TEXT REFERENCES categories(id),
  harga INTEGER NOT NULL,
  foto_url TEXT,
  status_aktif INTEGER DEFAULT 1,
  sku TEXT
);

CREATE TABLE IF NOT EXISTS tables (
  id TEXT PRIMARY KEY,
  nomor_meja TEXT NOT NULL,
  kapasitas INTEGER,
  status TEXT DEFAULT 'KOSONG',
  posisi_x INTEGER,
  posisi_y INTEGER
);

CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  order_type TEXT NOT NULL CHECK(order_type IN ('DINE_IN', 'TAKE_AWAY')),
  table_id TEXT REFERENCES tables(id),
  nomor_antrian TEXT,
  status TEXT DEFAULT 'OPEN',
  kasir_id TEXT REFERENCES users(id),
  waktu_buka TEXT NOT NULL,
  waktu_tutup TEXT,
  sync_status TEXT DEFAULT 'PENDING'
);

CREATE TABLE IF NOT EXISTS order_items (
  id TEXT PRIMARY KEY,
  order_id TEXT REFERENCES orders(id),
  menu_item_id TEXT REFERENCES menu_items(id),
  qty INTEGER NOT NULL,
  catatan TEXT,
  harga_saat_transaksi INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY,
  order_id TEXT REFERENCES orders(id),
  metode TEXT NOT NULL CHECK(metode IN ('TUNAI', 'DEBIT', 'QRIS')),
  jumlah_dibayar INTEGER NOT NULL,
  kembalian INTEGER DEFAULT 0,
  status TEXT DEFAULT 'PENDING',
  qris_reference_id TEXT,
  waktu_bayar TEXT
);

CREATE TABLE IF NOT EXISTS sync_queue (
  id TEXT PRIMARY KEY,
  table_name TEXT NOT NULL,
  record_id TEXT NOT NULL,
  operation TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  status TEXT DEFAULT 'PENDING',
  retry_count INTEGER DEFAULT 0,
  created_at TEXT NOT NULL
);
