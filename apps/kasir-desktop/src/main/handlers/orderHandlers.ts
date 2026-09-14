import { ipcMain } from 'electron';
import db from '../database/db';
import { randomUUID } from 'crypto';
import { runSync } from '../services/syncService';
import { printOrderById } from '../services/printerService';
import { getDailyReport } from '../services/reportService';

interface OrderItem {
  menuItemId: string;
  nama: string;
  harga: number;
  qty: number;
  catatan?: string;
}

interface OrderPayload {
  order_type: 'DINE_IN' | 'TAKE_AWAY';
  table_id: string | null;
  kasir_id: string;
  items: OrderItem[];
  metode_pembayaran: 'TUNAI' | 'DEBIT' | 'QRIS';
  jumlah_dibayar: number;
}

interface HistoryRow {
  id: string;
  order_type: string;
  table_id: string | null;
  nomor_meja: string | null;
  waktu_buka: string;
  total: number;
  jumlah_bayar: number | null;
  kembalian: number | null;
  metode: string | null;
  sync_status: string;
  kasir_nama?: string | null;
}

function resolveKasirId(payloadKasirId: string): string {
  if (payloadKasirId && payloadKasirId !== '00000000-0000-0000-0000-000000000001') {
    const exists = db.prepare('SELECT id FROM users WHERE id = ?').get(payloadKasirId);
    if (exists) return payloadKasirId;
  }
  const firstUser = db.prepare('SELECT id FROM users ORDER BY rowid LIMIT 1').get() as { id: string } | undefined;
  return firstUser?.id || payloadKasirId;
}

export function registerOrderHandlers() {
  ipcMain.handle('order:create', (_event, payload: OrderPayload) => {
    const order_id = randomUUID();
    const now = new Date().toISOString();
    const kasirId = resolveKasirId(payload.kasir_id);
    const totalHarga = payload.items.reduce(
      (sum, item) => sum + item.harga * item.qty, 0
    );
    const kembalian = payload.jumlah_dibayar - totalHarga;

    const insertOrder = db.prepare(`
      INSERT INTO orders (id, order_type, table_id, status, kasir_id, waktu_buka, waktu_tutup, sync_status)
      VALUES (?, ?, ?, 'CLOSED', ?, ?, ?, 'QUEUED')
    `);

    const insertItem = db.prepare(`
      INSERT INTO order_items (id, order_id, menu_item_id, qty, catatan, harga_saat_transaksi)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const insertPayment = db.prepare(`
      INSERT INTO payments (id, order_id, metode, jumlah_dibayar, kembalian, status, waktu_bayar)
      VALUES (?, ?, ?, ?, ?, 'PAID', ?)
    `);

    const insertQueue = db.prepare(`
      INSERT INTO sync_queue (id, table_name, record_id, operation, payload_json, status, created_at)
      VALUES (?, ?, ?, ?, ?, 'PENDING', ?)
    `);

    const createAll = db.transaction(() => {
      insertOrder.run(order_id, payload.order_type, payload.table_id, kasirId, now, now);

      const itemIds: string[] = [];
      for (const item of payload.items) {
        const itemId = randomUUID();
        insertItem.run(itemId, order_id, item.menuItemId, item.qty, item.catatan || null, item.harga);
        itemIds.push(itemId);
      }

      const paymentId = randomUUID();
      insertPayment.run(paymentId, order_id, payload.metode_pembayaran, payload.jumlah_dibayar, kembalian, now);

      const syncPayload = {
        id: order_id,
        order_type: payload.order_type,
        table_id: payload.table_id,
        status: 'CLOSED',
        kasir_id: kasirId,
        waktu_buka: now,
        waktu_tutup: now,
        items: payload.items.map((item, i) => ({
          id: itemIds[i],
          menu_item_id: item.menuItemId,
          qty: item.qty,
          catatan: item.catatan || null,
          harga_saat_transaksi: item.harga,
        })),
        payment: {
          id: paymentId,
          metode: payload.metode_pembayaran,
          jumlah_dibayar: payload.jumlah_dibayar,
          kembalian,
          status: 'PAID',
          waktu_bayar: now,
        },
      };

      insertQueue.run(randomUUID(), 'orders', order_id, 'INSERT', JSON.stringify(syncPayload), now);
    });

    try {
      createAll();
      runSync().catch(() => {
        // sinkronisasi gagal — order tetap tersimpan di queue, retry via timer
      });
      printOrderById(order_id).catch(() => {
        // cetak struk gagal — tidak memengaruhi penyimpanan order
      });
      return { success: true, order_id, kembalian };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return { success: false, error: message };
    }
  });

  ipcMain.handle('order:history', (_event, options: { limit?: number } = {}) => {
    const limit = Math.min(Math.max(Number(options?.limit) || 50, 1), 500);
    const rows = db.prepare(`
      SELECT
        o.id, o.order_type, o.table_id, o.waktu_buka, o.sync_status,
        u.nama AS kasir_nama,
        t.nomor_meja,
        (SELECT SUM(oi2.qty * oi2.harga_saat_transaksi) FROM order_items oi2 WHERE oi2.order_id = o.id) AS total,
        (SELECT p2.jumlah_dibayar FROM payments p2 WHERE p2.order_id = o.id ORDER BY p2.rowid LIMIT 1) AS jumlah_bayar,
        (SELECT p3.kembalian FROM payments p3 WHERE p3.order_id = o.id ORDER BY p3.rowid LIMIT 1) AS kembalian,
        (SELECT p4.metode FROM payments p4 WHERE p4.order_id = o.id ORDER BY p4.rowid LIMIT 1) AS metode
      FROM orders o
      LEFT JOIN users u ON u.id = o.kasir_id
      LEFT JOIN tables t ON t.id = o.table_id
      ORDER BY o.waktu_buka DESC
      LIMIT ?
    `).all(limit) as HistoryRow[];
    return { success: true, orders: rows };
  });

  ipcMain.handle('order:detail', (_event, orderId: string) => {
    const order = db.prepare(`
      SELECT
        o.id, o.order_type, o.table_id, o.nomor_antrian, o.waktu_buka, o.waktu_tutup, o.sync_status,
        t.nomor_meja,
        (SELECT p.metode FROM payments p WHERE p.order_id = o.id ORDER BY p.rowid LIMIT 1) AS metode,
        (SELECT p.jumlah_dibayar FROM payments p WHERE p.order_id = o.id ORDER BY p.rowid LIMIT 1) AS jumlah_bayar,
        (SELECT p.kembalian FROM payments p WHERE p.order_id = o.id ORDER BY p.rowid LIMIT 1) AS kembalian
      FROM orders o
      LEFT JOIN tables t ON t.id = o.table_id
      WHERE o.id = ?
    `).get(orderId) as
      | {
          id: string; order_type: string; table_id: string | null; nomor_antrian: string | null;
          waktu_buka: string; waktu_tutup: string | null; sync_status: string; nomor_meja: string | null;
          metode: string | null; jumlah_bayar: number | null; kembalian: number | null;
        }
      | undefined;
    if (!order) return { success: false, error: 'Order tidak ditemukan' };

    const items = db.prepare(`
      SELECT oi.qty, oi.catatan, oi.harga_saat_transaksi, m.nama
      FROM order_items oi
      LEFT JOIN menu_items m ON m.id = oi.menu_item_id
      WHERE oi.order_id = ?
    `).all(orderId) as Array<{ nama: string | null; qty: number; catatan: string | null; harga_saat_transaksi: number }>;

    return {
      success: true,
      order: {
        ...order,
        items: items.map(i => ({
          nama: i.nama || '(item)',
          qty: i.qty,
          catatan: i.catatan,
          harga: i.harga_saat_transaksi,
        })),
      },
    };
  });

  ipcMain.handle('report:daily', (_event, tanggal: string) => {
    return getDailyReport(tanggal);
  });
}