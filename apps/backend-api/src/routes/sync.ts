import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import sql from '../db.js';
import { authenticate } from '../auth/middleware.js';
import { setTenantContext } from '../lib/tenant-context.js';

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

interface PushOrdersBody {
  orders: SyncOrder[];
}

interface PushMenuBody {
  categories: Array<{ id: string; nama_kategori: string }>;
  menu_items: Array<{
    id: string; nama: string; kategori_id: string; harga: number;
    foto_url?: string | null; status_aktif: number; sku?: string | null;
  }>;
}

type AuthedRequest = FastifyRequest & { tenantId?: string; outletId?: string; userId?: string };

export default async function syncRoutes(app: FastifyInstance) {
  app.post<{ Body: PushOrdersBody }>('/api/sync/orders', { preHandler: authenticate }, async (request, reply) => {
    const req = request as AuthedRequest;
    const tenantId = req.tenantId!;
    const outletId = req.outletId!;
    const authedUserId = req.userId!;
    const { orders } = request.body;

    if (!Array.isArray(orders) || orders.length === 0) {
      return reply.code(400).send({ error: 'Tidak ada order untuk disinkronkan' });
    }

    try {
      await sql.begin(async (tx) => {
        await setTenantContext(tx, tenantId);

        for (const order of orders) {
          let kasirId = order.kasir_id;
          const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(kasirId || '');
          if (kasirId && isUuid) {
            const existing = await tx`SELECT id FROM users WHERE id = ${kasirId} AND tenant_id = ${tenantId}`;
            if (existing.length === 0) kasirId = authedUserId;
          } else {
            kasirId = authedUserId;
          }

          await tx`
            INSERT INTO orders (id, tenant_id, outlet_id, order_type, table_id, nomor_antrian, status, kasir_id, waktu_buka, waktu_tutup, created_at)
            VALUES (${order.id}, ${tenantId}, ${outletId}, ${order.order_type}, ${order.table_id ?? null}, ${order.nomor_antrian ?? null}, ${order.status ?? 'CLOSED'}, ${kasirId}, ${order.waktu_buka}, ${order.waktu_tutup ?? null}, ${order.waktu_buka})
            ON CONFLICT (id) DO NOTHING
          `;

          for (const item of order.items) {
            await tx`
              INSERT INTO order_items (id, tenant_id, order_id, menu_item_id, qty, catatan, harga_saat_transaksi, created_at)
              VALUES (${item.id}, ${tenantId}, ${order.id}, ${item.menu_item_id}, ${item.qty}, ${item.catatan ?? null}, ${item.harga_saat_transaksi}, ${order.waktu_buka})
              ON CONFLICT (id) DO NOTHING
            `;
          }

          if (order.payment) {
            await tx`
              INSERT INTO payments (id, tenant_id, order_id, metode, jumlah_dibayar, kembalian, status, qris_reference_id, waktu_bayar, created_at)
              VALUES (${order.payment.id}, ${tenantId}, ${order.id}, ${order.payment.metode}, ${order.payment.jumlah_dibayar}, ${order.payment.kembalian}, ${order.payment.status ?? 'PAID'}, ${order.payment.qris_reference_id ?? null}, ${order.payment.waktu_bayar}, ${order.payment.waktu_bayar})
              ON CONFLICT (id) DO NOTHING
            `;
          }
        }
      });

      return { success: true, synced: orders.length };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return reply.code(500).send({ error: message });
    }
  });

  app.post<{ Body: PushMenuBody }>('/api/sync/menu', { preHandler: authenticate }, async (request, reply) => {
    const req = request as AuthedRequest;
    const tenantId = req.tenantId!;
    const outletId = req.outletId!;
    const { categories, menu_items } = request.body;

    try {
      await sql.begin(async (tx) => {
        await setTenantContext(tx, tenantId);

        for (const cat of categories || []) {
          await tx`
            INSERT INTO categories (id, tenant_id, outlet_id, nama_kategori, created_at)
            VALUES (${cat.id}, ${tenantId}, ${outletId}, ${cat.nama_kategori}, now())
            ON CONFLICT (id) DO UPDATE SET nama_kategori = EXCLUDED.nama_kategori
          `;
        }

        for (const item of menu_items || []) {
          await tx`
            INSERT INTO menu_items (id, tenant_id, outlet_id, nama, kategori_id, harga, foto_url, status_aktif, sku, created_at)
            VALUES (${item.id}, ${tenantId}, ${outletId}, ${item.nama}, ${item.kategori_id}, ${item.harga}, ${item.foto_url ?? null}, ${item.status_aktif}, ${item.sku ?? null}, now())
            ON CONFLICT (id) DO UPDATE SET
              nama = EXCLUDED.nama,
              kategori_id = EXCLUDED.kategori_id,
              harga = EXCLUDED.harga,
              foto_url = EXCLUDED.foto_url,
              status_aktif = EXCLUDED.status_aktif,
              sku = EXCLUDED.sku
          `;
        }
      });

      return { success: true, categories: (categories || []).length, menu_items: (menu_items || []).length };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return reply.code(500).send({ error: message });
    }
  });

  app.get('/api/sync/menu', { preHandler: authenticate }, async (request, reply) => {
    const req = request as AuthedRequest;
    const tenantId = req.tenantId!;
    const outletId = req.outletId!;

    try {
      await setTenantContext(sql, tenantId);

      const categories = await sql`
        SELECT id, nama_kategori FROM categories WHERE tenant_id = ${tenantId} AND outlet_id = ${outletId} ORDER BY nama_kategori
      `;
      const menu_items = await sql`
        SELECT id, nama, kategori_id, harga, foto_url, status_aktif, sku
        FROM menu_items WHERE tenant_id = ${tenantId} AND outlet_id = ${outletId} AND status_aktif = 1 ORDER BY nama
      `;

      return { success: true, categories, menu_items };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return reply.code(500).send({ error: message });
    }
  });
}