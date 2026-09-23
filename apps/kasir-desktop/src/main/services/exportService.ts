import ExcelJS from 'exceljs';
import db from '../database/db';
import { getDailyReport } from './reportService';
import type { DailyReportData } from './reportService';

const MONEY_FMT = '#,##0';

function getConfig(key: string): string {
  const row = db.prepare('SELECT value FROM app_config WHERE key = ?').get(key) as { value: string } | undefined;
  return row?.value ?? '';
}

function orderLabel(tipe: string): string {
  return tipe === 'DINE_IN' ? 'Makan di Tempat' : 'Bawa Pulang';
}

function paymentLabel(metode: string): string {
  if (metode === 'TUNAI') return 'Tunai';
  if (metode === 'DEBIT') return 'Debit';
  if (metode === 'QRIS') return 'QRIS';
  return metode || '-';
}

function styleHeader(cell: ExcelJS.Cell) {
  cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F766E' } };
  cell.alignment = { vertical: 'middle' };
}

function addMoneyRow(ws: ExcelJS.Worksheet, row: number, label: string, value: number): number {
  const cell = ws.getCell(`A${row}`);
  cell.value = label;
  cell.font = { bold: true };
  const vc = ws.getCell(`B${row}`);
  vc.value = value;
  vc.numFmt = MONEY_FMT;
  return row + 1;
}

export async function exportDailyReportExcel(tanggal: string, filePath: string): Promise<void> {
  const tanggalValid = String(tanggal || '').slice(0, 10);
  const report = getDailyReport(tanggalValid);
  if (!report.success) {
    throw new Error(report.error || 'Tanggal tidak valid');
  }
  const data = report as DailyReportData;

  const start = new Date(`${tanggalValid}T00:00:00.000Z`).toISOString();
  const end = new Date(`${tanggalValid}T23:59:59.999Z`).toISOString();

  const detailRows = db.prepare(`
    SELECT o.id, o.waktu_buka, o.order_type, o.nomor_antrian,
           t.nomor_meja, COALESCE(u.nama, '(dihapus)') AS kasir,
           COALESCE(m.nama, '(item dihapus)') AS item,
           oi.qty, oi.harga_saat_transaksi AS harga,
           COALESCE(p.metode, '-') AS metode
    FROM orders o
    LEFT JOIN users u ON u.id = o.kasir_id
    LEFT JOIN tables t ON t.id = o.table_id
    LEFT JOIN payments p ON p.id = (SELECT p2.id FROM payments p2 WHERE p2.order_id = o.id ORDER BY p2.rowid LIMIT 1)
    JOIN order_items oi ON oi.order_id = o.id
    LEFT JOIN menu_items m ON m.id = oi.menu_item_id
    WHERE o.waktu_buka >= ? AND o.waktu_buka <= ?
    ORDER BY o.waktu_buka, o.id
  `).all(start, end) as Array<{
    id: string; waktu_buka: string; order_type: string; nomor_antrian: string | null;
    nomor_meja: string | null; kasir: string; item: string; qty: number; harga: number; metode: string;
  }>;

  const wb = new ExcelJS.Workbook();
  wb.creator = 'E-Restoran';
  wb.created = new Date();

  const wsRingkasan = wb.addWorksheet('Ringkasan');
  wsRingkasan.columns = [
    { width: 28 }, { width: 16 }, { width: 8 }, { width: 20 }, { width: 16 },
  ];
  wsRingkasan.views = [{ state: 'frozen', ySplit: 0 }];

  const namaUsaha = getConfig('nama_usaha') || getConfig('nama_toko') || 'E-Restoran';
  const alamat = getConfig('alamat_usaha');
  const telp = getConfig('telp_usaha');

  let row = 1;
  const title = wsRingkasan.getCell(`A${row}`);
  title.value = namaUsaha;
  title.font = { bold: true, size: 14 };
  wsRingkasan.getRow(row).height = 22;
  row += 1;
  if (alamat) {
    wsRingkasan.getCell(`A${row}`).value = alamat;
    wsRingkasan.getCell(`A${row}`).font = { color: { argb: 'FF555555' } };
    row += 1;
  }
  if (telp) {
    wsRingkasan.getCell(`A${row}`).value = telp;
    wsRingkasan.getCell(`A${row}`).font = { color: { argb: 'FF555555' } };
    row += 1;
  }
  wsRingkasan.getCell(`A${row}`).value = 'Laporan Harian';
  wsRingkasan.getCell(`A${row}`).font = { bold: true };
  row += 1;
  wsRingkasan.getCell(`A${row}`).value = tanggalValid;
  row += 2;

  const saldoAwalCell = wsRingkasan.getCell(`A${row}`);
  saldoAwalCell.value = 'Saldo Awal';
  saldoAwalCell.font = { bold: true };
  const saldoAwalValue = wsRingkasan.getCell(`B${row}`);
  saldoAwalValue.value = data.saldo_awal;
  saldoAwalValue.numFmt = MONEY_FMT;
  row += 1;

  row = addMoneyRow(wsRingkasan, row, 'Total Penjualan', data.summary.total_penjualan);
  row = addMoneyRow(wsRingkasan, row, 'Saldo Akhir (Tunai)', data.saldo_awal + data.total_tunai);
  const jmlCell = wsRingkasan.getCell(`A${row}`);
  jmlCell.value = 'Jumlah Transaksi';
  jmlCell.font = { bold: true };
  wsRingkasan.getCell(`B${row}`).value = data.summary.jumlah_order;
  row += 2;

  const metodeLabel = (m: string) => paymentLabel(m);
  const kelompok = (judul: string) => {
    wsRingkasan.getCell(`A${row}`).value = judul;
    wsRingkasan.getCell(`A${row}`).font = { bold: true, color: { argb: 'FF0F766E' } };
    row += 1;
    const hd = ['Nama', 'Jumlah', 'Nominal'];
    hd.forEach((h, i) => {
      const c = wsRingkasan.getCell(row, i + 1);
      c.value = h;
      styleHeader(c);
    });
    row += 1;
  };

  kelompok('PER METODE');
  for (const r of data.byMetode) {
    wsRingkasan.getCell(`A${row}`).value = metodeLabel(r.metode);
    wsRingkasan.getCell(`B${row}`).value = r.jumlah;
    const nom = wsRingkasan.getCell(`C${row}`);
    nom.value = r.nominal;
    nom.numFmt = MONEY_FMT;
    row += 1;
  }
  row += 1;

  kelompok('PER JENIS');
  for (const r of data.byType) {
    wsRingkasan.getCell(`A${row}`).value = orderLabel(r.tipe);
    wsRingkasan.getCell(`B${row}`).value = r.jumlah;
    const nom = wsRingkasan.getCell(`C${row}`);
    nom.value = r.nominal;
    nom.numFmt = MONEY_FMT;
    row += 1;
  }
  row += 1;

  kelompok('PER KASIR');
  for (const r of data.byKasir) {
    wsRingkasan.getCell(`A${row}`).value = r.kasir;
    wsRingkasan.getCell(`B${row}`).value = r.jumlah;
    const nom = wsRingkasan.getCell(`C${row}`);
    nom.value = r.nominal;
    nom.numFmt = MONEY_FMT;
    row += 1;
  }

  const wsDetail = wb.addWorksheet('Detail Transaksi');
  wsDetail.columns = [
    { width: 6 }, { width: 20 }, { width: 16 }, { width: 11 }, { width: 8 }, { width: 14 },
    { width: 26 }, { width: 6 }, { width: 13 }, { width: 13 }, { width: 10 },
  ];
  wsDetail.views = [{ state: 'frozen', ySplit: 1 }];

  const detailHeader = [
    'No', 'Waktu', 'Jenis', 'No. Antrian', 'Meja', 'Kasir', 'Item', 'Qty', 'Harga Satuan', 'Subtotal', 'Metode',
  ];
  const headerRow = wsDetail.getRow(1);
  detailHeader.forEach((h, i) => {
    const c = headerRow.getCell(i + 1);
    c.value = h;
    styleHeader(c);
  });
  headerRow.height = 18;

  detailRows.forEach((d, i) => {
    const r = i + 2;
    wsDetail.getCell(`A${r}`).value = i + 1;
    wsDetail.getCell(`B${r}`).value = new Date(d.waktu_buka).toLocaleString('id-ID', {
      dateStyle: 'short',
      timeStyle: 'short',
    });
    wsDetail.getCell(`C${r}`).value = orderLabel(d.order_type);
    wsDetail.getCell(`D${r}`).value = d.nomor_antrian || '';
    wsDetail.getCell(`E${r}`).value = d.nomor_meja || '';
    wsDetail.getCell(`F${r}`).value = d.kasir;
    wsDetail.getCell(`G${r}`).value = d.item;
    wsDetail.getCell(`H${r}`).value = d.qty;
    const harga = wsDetail.getCell(`I${r}`);
    harga.value = d.harga;
    harga.numFmt = MONEY_FMT;
    const sub = wsDetail.getCell(`J${r}`);
    sub.value = d.qty * d.harga;
    sub.numFmt = MONEY_FMT;
    wsDetail.getCell(`K${r}`).value = paymentLabel(d.metode);
  });

  if (detailRows.length > 0) {
    wsDetail.autoFilter = { from: 'A1', to: `K${detailRows.length + 1}` };
  }

  await wb.xlsx.writeFile(filePath);
}

export default { exportDailyReportExcel };