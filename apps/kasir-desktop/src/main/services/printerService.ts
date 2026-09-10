import { BrowserWindow } from 'electron';
import db from '../database/db';
import { ThermalPrinter, PrinterTypes, CharacterSet } from 'node-thermal-printer';

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
  const namaToko = getConfig('nama_toko') || 'POS Rumah Makan';
  p.alignCenter();
  p.bold(true);
  p.println(namaToko);
  p.bold(false);
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
  order.items.forEach((item, index) => {
    const line = `${index + 1}. ${item.nama}`;
    p.println(line);
    const sub = `    x${item.qty}                    ${item.harga * item.qty}`;
    p.println(sub);
  });

  p.drawLine('=');
  p.leftRight('TOTAL', String(total));
  p.drawLine('-');

  if (order.metode === 'TUNAI') {
    p.leftRight('Bayar', String(order.jumlah_dibayar));
    p.leftRight('Kembalian', String(order.kembalian));
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

export default { getPrinterNames, testPrint, printOrderById, printOrder };