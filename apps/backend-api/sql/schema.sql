-- ============================================
-- POS Rumah Makan — Cloud Schema (Supabase)
-- Multi-Tenant dengan Row Level Security
-- ============================================

-- Tenants (pemilik rumah makan)
CREATE TABLE IF NOT EXISTS tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nama_pemilik TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Outlets per tenant
CREATE TABLE IF NOT EXISTS outlets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  nama_outlet TEXT NOT NULL,
  alamat TEXT,
  no_telepon TEXT,
  logo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Users (kasir, admin, owner) per outlet
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  outlet_id UUID NOT NULL REFERENCES outlets(id) ON DELETE CASCADE,
  nama TEXT NOT NULL,
  pin_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('kasir', 'admin', 'owner')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Categories per outlet
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  outlet_id UUID NOT NULL REFERENCES outlets(id) ON DELETE CASCADE,
  nama_kategori TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Menu items per outlet
CREATE TABLE IF NOT EXISTS menu_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  outlet_id UUID NOT NULL REFERENCES outlets(id) ON DELETE CASCADE,
  nama TEXT NOT NULL,
  kategori_id UUID REFERENCES categories(id),
  harga INTEGER NOT NULL,
  foto_url TEXT,
  status_aktif INTEGER DEFAULT 1,
  sku TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Orders
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  outlet_id UUID NOT NULL REFERENCES outlets(id) ON DELETE CASCADE,
  order_type TEXT NOT NULL CHECK(order_type IN ('DINE_IN', 'TAKE_AWAY')),
  table_id TEXT,
  nomor_antrian TEXT,
  status TEXT DEFAULT 'OPEN',
  kasir_id UUID REFERENCES users(id),
  waktu_buka TIMESTAMPTZ NOT NULL DEFAULT now(),
  waktu_tutup TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Order items
CREATE TABLE IF NOT EXISTS order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  menu_item_id UUID REFERENCES menu_items(id),
  qty INTEGER NOT NULL,
  catatan TEXT,
  harga_saat_transaksi INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Payments
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  metode TEXT NOT NULL CHECK(metode IN ('TUNAI', 'DEBIT', 'QRIS')),
  jumlah_dibayar INTEGER NOT NULL,
  kembalian INTEGER DEFAULT 0,
  status TEXT DEFAULT 'PENDING',
  qris_reference_id TEXT,
  waktu_bayar TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- ROW LEVEL SECURITY — WAJIB
-- ============================================

ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE outlets ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Policies: hanya bisa akses data milik tenant sendiri
-- app.current_tenant_id di-set via session/claim saat autentikasi

CREATE POLICY tenant_isolation_tenants ON tenants
  USING (id = current_setting('app.current_tenant_id')::UUID);

CREATE POLICY tenant_isolation_outlets ON outlets
  USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

CREATE POLICY tenant_isolation_users ON users
  USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

CREATE POLICY tenant_isolation_categories ON categories
  USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

CREATE POLICY tenant_isolation_menu_items ON menu_items
  USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

CREATE POLICY tenant_isolation_orders ON orders
  USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

CREATE POLICY tenant_isolation_order_items ON order_items
  USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

CREATE POLICY tenant_isolation_payments ON payments
  USING (tenant_id = current_setting('app.current_tenant_id')::UUID);