import { ipcMain } from 'electron';
import db from '../database/db';
import { randomUUID } from 'crypto';
import { runSync } from '../services/syncService';
import { printOrderById } from '../services/printerService';

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
}