import http from 'http';
import https from 'https';
import { URL } from 'url';
import db from '../database/db';

interface SyncOrderItem {
  id: string;
  menu_item_id: string;
  qty: number;
  catatan?: string | null;
  harga_saat_transaksi: number;
}

interface SyncOrder {
  id: string;
  order_type: 'DINE_IN' | 'TAKE_AWAY';
  table_id?: string | null;
  nomor_antrian?: string | null;
  status?: string;
  kasir_id?: string;
  waktu_buka: string;
  waktu_tutup?: string | null;
  items: SyncOrderItem[];
  payment?: {
    id: string;
    metode: 'TUNAI' | 'DEBIT' | 'QRIS';
    jumlah_dibayar: number;
    kembalian: number;
    status?: string;
    qris_reference_id?: string;
    waktu_bayar: string;
  } | null;
}

interface SyncStatus {
  pendingCount: number;
  lastSyncAt: string | null;
  lastError: string | null;
  online: boolean;
  syncing: boolean;
}

interface QueueRow {
  id: string;
  record_id: string;
  payload_json: string;
}

const status: SyncStatus = {
  pendingCount: 0,
  lastSyncAt: null,
  lastError: null,
  online: false,
  syncing: false,
};

function getConfig(key: string): string | null {
  const row = db.prepare('SELECT value FROM app_config WHERE key = ?').get(key) as { value: string } | undefined;
  return row?.value ?? null;
}

function getApiBaseUrl(): string {
  return getConfig('api_base_url') || 'http://localhost:3001';
}

function countPending(): number {
  return (db.prepare("SELECT COUNT(*) AS c FROM sync_queue WHERE status = 'PENDING'").get() as { c: number }).c;
}

function refreshStatus(online?: boolean, error?: string | null) {
  status.pendingCount = countPending();
  if (online !== undefined) status.online = online;
  if (error !== undefined) status.lastError = error;
}

async function apiFetch(path: string, options: { method?: string; body?: string } = {}) {
  const token = getConfig('auth_token');
  const base = getApiBaseUrl();
  const url = new URL(path, base);

  const payload = options.body || '';
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (payload) headers['Content-Length'] = String(Buffer.byteLength(payload));

  const client = url.protocol === 'https:' ? https : http;

  const res = await new Promise<{ status: number; body: string }>((resolve, reject) => {
    const req = client.request(
      {
        method: options.method || 'GET',
        hostname: url.hostname,
        port: url.port || undefined,
        path: `${url.pathname}${url.search}`,
        headers,
        timeout: 15_000,
      },
      (response) => {
        const chunks: Buffer[] = [];
        response.on('data', (chunk) => chunks.push(chunk as Buffer));
        response.on('end', () => {
          resolve({ status: response.statusCode || 0, body: Buffer.concat(chunks).toString('utf8') });
        });
      }
    );
    req.on('timeout', () => req.destroy(new Error('Timeout')));
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });

  let data: unknown = null;
  try {
    data = JSON.parse(res.body);
  } catch {
    data = res.body;
  }
  if (res.status < 200 || res.status >= 300) {
    const message = (data as { error?: string })?.error || `HTTP ${res.status}`;
    throw new Error(message);
  }
  return data;
}

export async function pushPendingOrders(): Promise<{ pushed: number }> {
  if (status.syncing) return { pushed: 0 };
  const token = getConfig('auth_token');
  if (!token) return { pushed: 0 };

  status.syncing = true;
  try {
    const queue = db.prepare("SELECT id, record_id, payload_json FROM sync_queue WHERE status = 'PENDING' ORDER BY created_at LIMIT 100").all() as QueueRow[];

    if (queue.length === 0) {
      refreshStatus(true, null);
      status.lastSyncAt = new Date().toISOString();
      return { pushed: 0 };
    }

    const orders = queue.map((row) => JSON.parse(row.payload_json) as SyncOrder);
    await apiFetch('/api/sync/orders', {
      method: 'POST',
      body: JSON.stringify({ orders }),
    });

    const ids = queue.map((row) => row.id);
    const updateQueue = db.prepare("UPDATE sync_queue SET status = 'SENT' WHERE id = ?");
    const updateOrder = db.prepare("UPDATE orders SET sync_status = 'SYNCED' WHERE id = ?");
    db.transaction(() => {
      for (const row of queue) {
        updateQueue.run(row.id);
        updateOrder.run(row.record_id);
      }
    })();

    refreshStatus(true, null);
    status.lastSyncAt = new Date().toISOString();
    return { pushed: queue.length };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    db.prepare('UPDATE sync_queue SET retry_count = retry_count + 1 WHERE status = ?').run('PENDING');
    refreshStatus(false, message);
    throw new Error(message);
  } finally {
    status.syncing = false;
  }
}

export async function pushMenuInit(): Promise<boolean> {
  if (getConfig('menu_synced') === '1') return true;
  const token = getConfig('auth_token');
  if (!token) return false;

  const categories = db.prepare('SELECT id, nama_kategori FROM categories').all();
  const menu_items = db.prepare(
    'SELECT id, nama, kategori_id, harga, foto_url, status_aktif, sku FROM menu_items WHERE status_aktif = 1'
  ).all();

  if (categories.length === 0 && menu_items.length === 0) return false;

  try {
    await apiFetch('/api/sync/menu', {
      method: 'POST',
      body: JSON.stringify({ categories, menu_items }),
    });
    db.prepare('INSERT OR REPLACE INTO app_config (key, value) VALUES (?, ?)').run('menu_synced', '1');
    return true;
  } catch {
    return false;
  }
}

export async function pullMenu(): Promise<boolean> {
  const token = getConfig('auth_token');
  if (!token) return false;

  if (getConfig('menu_local_dirty') === '1') return false;

  try {
    const data = (await apiFetch('/api/sync/menu')) as {
      success: boolean;
      categories: Array<{ id: string; nama_kategori: string }>;
      menu_items: Array<{
        id: string; nama: string; kategori_id: string; harga: number;
        foto_url: string | null; status_aktif: number; sku: string | null;
      }>;
    };

    const upsertCat = db.prepare('INSERT OR REPLACE INTO categories (id, nama_kategori) VALUES (?, ?)');
    const upsertItem = db.prepare(`
      INSERT INTO menu_items (id, nama, kategori_id, harga, foto_url, status_aktif, sku)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT (id) DO UPDATE SET
        nama = excluded.nama,
        kategori_id = excluded.kategori_id,
        harga = excluded.harga,
        foto_url = excluded.foto_url,
        status_aktif = excluded.status_aktif,
        sku = excluded.sku
    `);

    db.transaction(() => {
      for (const cat of data.categories) upsertCat.run(cat.id, cat.nama_kategori);
      for (const item of data.menu_items) {
        upsertItem.run(item.id, item.nama, item.kategori_id, item.harga, item.foto_url, item.status_aktif, item.sku);
      }
    })();

    db.prepare('INSERT OR REPLACE INTO app_config (key, value) VALUES (?, ?)').run('menu_synced', '1');
    return true;
  } catch {
    return false;
  }
}

export async function runSync(): Promise<{ pushed: number; menuPushed: boolean; menuPulled: boolean }> {
  const token = getConfig('auth_token');
  if (!token) return { pushed: 0, menuPushed: false, menuPulled: false };

  const pushed = (await pushPendingOrders()).pushed;
  const menuPushed = await pushMenuInit();
  const menuPulled = await pullMenu();
  return { pushed, menuPushed, menuPulled };
}

export function getSyncStatus(): Readonly<SyncStatus> {
  refreshStatus();
  return status;
}

let timer: ReturnType<typeof setInterval> | null = null;

export function startSyncTimer() {
  if (timer) return;
  timer = setInterval(() => {
    runSync().catch(() => {
      refreshStatus(false, 'Gagal sinkronisasi');
    });
  }, 60_000);
}

export function stopSyncTimer() {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}

export default { getSyncStatus, runSync, pushMenuInit, pullMenu, pushPendingOrders, startSyncTimer, stopSyncTimer };