import db from '../database/db';

export interface DailyReportData {
  tanggal: string;
  summary: { jumlah_order: number; total_penjualan: number };
  byMetode: Array<{ metode: string; jumlah: number; nominal: number }>;
  byType: Array<{ tipe: string; jumlah: number; nominal: number }>;
  byKasir: Array<{ kasir: string; jumlah: number; nominal: number }>;
  saldo_awal: number;
  total_tunai: number;
}

export function getDailyReport(tanggal: string): { success: boolean; error?: string } & Partial<DailyReportData> {
  const date = String(tanggal || '').slice(0, 10);
  if (!date) return { success: false, error: 'Tanggal tidak valid' };

  const start = new Date(`${date}T00:00:00.000Z`).toISOString();
  const end = new Date(`${date}T23:59:59.999Z`).toISOString();

  const summary = db.prepare(`
    SELECT
      COUNT(*) AS jumlah_order,
      COALESCE(SUM(
        (SELECT SUM(oi2.qty * oi2.harga_saat_transaksi) FROM order_items oi2 WHERE oi2.order_id = o.id)
      ), 0) AS total_penjualan
    FROM orders o
    WHERE o.waktu_buka >= ? AND o.waktu_buka <= ?
  `).get(start, end) as { jumlah_order: number; total_penjualan: number };

  const byMetode = db.prepare(`
    SELECT COALESCE(p.metode, '-') AS metode, COUNT(*) AS jumlah, COALESCE(SUM(p.jumlah_dibayar), 0) AS nominal
    FROM orders o
    LEFT JOIN payments p ON p.id = (SELECT p2.id FROM payments p2 WHERE p2.order_id = o.id ORDER BY p2.rowid LIMIT 1)
    WHERE o.waktu_buka >= ? AND o.waktu_buka <= ?
    GROUP BY p.metode
  `).all(start, end) as Array<{ metode: string; jumlah: number; nominal: number }>;

  const byType = db.prepare(`
    SELECT o.order_type AS tipe, COUNT(*) AS jumlah,
      COALESCE(SUM((SELECT SUM(oi2.qty * oi2.harga_saat_transaksi) FROM order_items oi2 WHERE oi2.order_id = o.id)), 0) AS nominal
    FROM orders o
    WHERE o.waktu_buka >= ? AND o.waktu_buka <= ?
    GROUP BY o.order_type
  `).all(start, end) as Array<{ tipe: string; jumlah: number; nominal: number }>;

  const byKasir = db.prepare(`
    SELECT COALESCE(u.nama, '(dihapus)') AS kasir, COUNT(*) AS jumlah,
      COALESCE(SUM((SELECT SUM(oi2.qty * oi2.harga_saat_transaksi) FROM order_items oi2 WHERE oi2.order_id = o.id)), 0) AS nominal
    FROM orders o
    LEFT JOIN users u ON u.id = o.kasir_id
    WHERE o.waktu_buka >= ? AND o.waktu_buka <= ?
    GROUP BY u.id
  `).all(start, end) as Array<{ kasir: string; jumlah: number; nominal: number }>;

  const saldoAwalRow = db.prepare('SELECT value FROM app_config WHERE key = ?').get(`kas_awal:${date}`) as
    | { value: string }
    | undefined;
  const saldo_awal = Number(saldoAwalRow?.value) || 0;
  const total_tunai = byMetode.filter((m) => m.metode === 'TUNAI').reduce((sum, m) => sum + m.nominal, 0);

  return {
    success: true,
    tanggal: date,
    summary: { jumlah_order: summary.jumlah_order, total_penjualan: summary.total_penjualan },
    byMetode,
    byType,
    byKasir,
    saldo_awal,
    total_tunai,
  };
}

export default { getDailyReport };