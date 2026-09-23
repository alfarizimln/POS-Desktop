import { BrowserWindow } from 'electron';
import db from '../database/db';
import { ThermalPrinter, PrinterTypes, CharacterSet } from 'node-thermal-printer';
import type { DailyReportData } from './reportService';

export interface PrintableOrder {
  id: string;
  order_type: string;
  nomor_antrian: string | null;
  waktu_buka: string;
  items: Array<{ nama: string; qty: number; harga: number }>;
  metode: string;
  jumlah_dibayar: number;
  kembalian: number;
}

function getConfig(key: string): string | null {
  const row = db.prepare('SELECT value FROM app_config WHERE key = ?').get(key) as { value: string } | undefined;
  return row?.value ?? null;
}

function getShareName(): string {
  const value = getConfig('printer_share') || getConfig('printer_name') || 'POS Printer';
  return value.split('\\').pop()!.trim();
}

function printerFactory(): ThermalPrinter {
  const share = getShareName();
  const interfacePath = `//localhost/${share}`;
  return new ThermalPrinter({
    type: PrinterTypes.EPSON,
    interface: interfacePath,
    width: 42,
    characterSet: CharacterSet.PC850_MULTILINGUAL,
    removeSpecialCharacters: false,
    options: { timeout: 5000 },
  });
}

export async function getPrinterNames(): Promise<string[]> {
  const win = BrowserWindow.getAllWindows()[0];
  if (!win) return [];
  try {
    const printers = await win.webContents.getPrintersAsync();
    const names = printers.map((p) => p.name).filter(Boolean);
    return Array.from(new Set(names)).sort();
  } catch {
    return [];
  }
}

function buildHeader(p: ThermalPrinter, title: string, subtitle?: string) {
  const namaToko = getConfig('nama_usaha') || getConfig('nama_toko') || 'E-Restoran';
  const alamat = getConfig('alamat_usaha');
  const telp = getConfig('telp_usaha');
  p.alignCenter();
  p.bold(true);
  p.println(namaToko);
  p.bold(false);
  if (alamat) p.println(alamat);
  if (telp) p.println(telp);
  if (subtitle) p.println(subtitle);
  p.drawLine('=');
  p.newLine();
  if (title) {
    p.alignCenter();
    p.bold(true);
    p.println(title);
    p.bold(false);
  }
  p.alignLeft();
}

function formatRupiah(n: number): string {
  return 'Rp ' + n.toLocaleString('id-ID');
}

const RECEIPT_WIDTH = 42;

function itemHeader(priceWidth: number, qtyWidth = 5): string {
  const leftWidth = RECEIPT_WIDTH - qtyWidth - 1 - priceWidth;
  return 'No  Item'.padEnd(leftWidth) + 'Qty'.padStart(qtyWidth) + ' ' + 'Harga'.padStart(priceWidth);
}

function itemRow(index: number, nama: string, qty: number, subtotal: number, priceWidth: number, qtyWidth = 5): string {
  const leftWidth = RECEIPT_WIDTH - qtyWidth - 1 - priceWidth;
  const prefix = `${index}. `;
  const nameMax = leftWidth - prefix.length - 1;
  const name = nama.length > nameMax ? nama.slice(0, nameMax) + '.' : nama;
  const left = (prefix + name).padEnd(leftWidth);
  const qtyText = 'x' + String(qty).padStart(qtyWidth - 1);
  return left + qtyText + ' ' + formatRupiah(subtotal).padStart(priceWidth);
}

function itemColumns(items: Array<{ nama: string; qty: number; harga: number }>): number {
  return items.reduce((max, it) => Math.max(max, formatRupiah(it.harga * it.qty).length), formatRupiah(0).length);
}

function buildFooter(p: ThermalPrinter) {
  p.newLine();
  p.alignCenter();
  p.println('Terima kasih!');
  p.println('Sampai jumpa lagi');
  p.newLine();
  p.newLine();
  p.cut();
}

export async function testPrint(): Promise<void> {
  const p = printerFactory();
  buildHeader(p, 'TEST PRINT', new Date().toLocaleString('id-ID'));
  p.println('Printer terhubung dengan baik.');
  p.println(`Share: ${getShareName()}`);
  buildFooter(p);
  await p.execute();
}

export async function printOrder(order: PrintableOrder): Promise<void> {
  const p = printerFactory();
  const tanggal = new Date(order.waktu_buka).toLocaleString('id-ID', {
    dateStyle: 'short',
    timeStyle: 'short',
  });

  buildHeader(p, `${order.order_type === 'DINE_IN' ? 'Makan di Tempat' : 'Bawa Pulang'}`, tanggal);

  if (order.nomor_antrian) {
    p.alignCenter();
    p.bold(true);
    p.println(`No. Antrian: ${order.nomor_antrian}`);
    p.bold(false);
    p.newLine();
    p.alignLeft();
  }

  p.println('No  Item                  Qty     Harga');
  p.drawLine('-');

  const total = order.items.reduce((sum, item) => sum + item.harga * item.qty, 0);
  const priceWidth = itemColumns(order.items);
  p.println(itemHeader(priceWidth));
  p.drawLine('-');

  order.items.forEach((item, index) => {
    p.println(itemRow(index + 1, item.nama, item.qty, item.harga * item.qty, priceWidth));
  });

  p.drawLine('=');
  p.leftRight('TOTAL', formatRupiah(total));
  p.drawLine('-');

  if (order.metode === 'TUNAI') {
    p.leftRight('Bayar', formatRupiah(order.jumlah_dibayar));
    p.leftRight('Kembalian', formatRupiah(order.kembalian));
  } else {
    p.leftRight('Metode', order.metode);
  }

  buildFooter(p);
  await p.execute();
}

async function fetchOrder(orderId: string): Promise<PrintableOrder | null> {
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId) as
    | {
        id: string; order_type: string; nomor_antrian: string | null; waktu_buka: string;
      }
    | undefined;
  if (!order) return null;

  const items = db.prepare(
    `SELECT oi.qty, oi.harga_saat_transaksi AS harga, m.nama
     FROM order_items oi LEFT JOIN menu_items m ON m.id = oi.menu_item_id
     WHERE oi.order_id = ?`
  ).all(orderId) as Array<{ nama: string; qty: number; harga: number }>;

  const payment = db.prepare('SELECT * FROM payments WHERE order_id = ? ORDER BY rowid LIMIT 1').get(orderId) as
    | { metode: string; jumlah_dibayar: number; kembalian: number }
    | undefined;

  return {
    id: order.id,
    order_type: order.order_type,
    nomor_antrian: order.nomor_antrian,
    waktu_buka: order.waktu_buka,
    items: items.map((i) => ({
      nama: i.nama || '(item)',
      qty: i.qty,
      harga: i.harga,
    })),
    metode: payment?.metode || '-',
    jumlah_dibayar: payment?.jumlah_dibayar || 0,
    kembalian: payment?.kembalian || 0,
  };
}

export async function printOrderById(orderId: string): Promise<void> {
  const order = await fetchOrder(orderId);
  if (!order) throw new Error(`Order ${orderId} tidak ditemukan`);
  await printOrder(order);
}

export async function printDailyReport(report: DailyReportData): Promise<void> {
  const p = printerFactory();
  buildHeader(p, 'LAPORAN HARIAN', report.tanggal);

  const saldoAwal = Number(getConfig(`kas_awal:${report.tanggal}`) || 0);
  const totalTunai = report.byMetode.find((m) => m.metode === 'TUNAI')?.nominal || 0;

  p.leftRight('Saldo Awal', formatRupiah(saldoAwal));
  p.leftRight('Total Penjualan', formatRupiah(report.summary.total_penjualan));
  p.leftRight('Saldo Akhir (Tunai)', formatRupiah(saldoAwal + totalTunai));
  p.leftRight('Jumlah Transaksi', String(report.summary.jumlah_order));
  p.newLine();

  const metodeLabel = (m: string) => {
    if (m === 'TUNAI') return 'Tunai';
    if (m === 'DEBIT') return 'Debit';
    if (m === 'QRIS') return 'QRIS';
    return m;
  };
  const tipeLabel = (t: string) => (t === 'DINE_IN' ? 'Makan di Tempat' : 'Bawa Pulang');

  p.println('PER METODE');
  for (const r of report.byMetode) {
    p.leftRight(`${metodeLabel(r.metode)} (${r.jumlah})`, formatRupiah(r.nominal));
  }
  p.newLine();

  p.println('PER JENIS');
  for (const r of report.byType) {
    p.leftRight(`${tipeLabel(r.tipe)} (${r.jumlah})`, formatRupiah(r.nominal));
  }
  p.newLine();

  p.println('PER KASIR');
  for (const r of report.byKasir) {
    p.leftRight(`${r.kasir} (${r.jumlah})`, formatRupiah(r.nominal));
  }

  buildFooter(p);
  await p.execute();
}

export default { getPrinterNames, testPrint, printOrderById, printOrder, printDailyReport };