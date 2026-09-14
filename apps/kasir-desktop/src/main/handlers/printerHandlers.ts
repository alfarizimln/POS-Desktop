import { ipcMain } from 'electron';
import db from '../database/db';
import { getPrinterNames, testPrint, printOrderById, printDailyReport } from '../services/printerService';
import { getDailyReport } from '../services/reportService';

export function registerPrinterHandlers() {
  ipcMain.handle('printer:list', async () => {
    try {
      const names = await getPrinterNames();
      return { success: true, printers: names };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return { success: false, error: message, printers: [] };
    }
  });

  ipcMain.handle('printer:set', (_event, printerName: string) => {
    db.prepare('INSERT OR REPLACE INTO app_config (key, value) VALUES (?, ?)').run('printer_name', String(printerName));
    return { success: true };
  });

  ipcMain.handle('printer:setShare', (_event, shareName: string) => {
    db.prepare('INSERT OR REPLACE INTO app_config (key, value) VALUES (?, ?)').run('printer_share', String(shareName));
    return { success: true };
  });

  ipcMain.handle('printer:test', async () => {
    try {
      await testPrint();
      return { success: true, message: 'Test print berhasil dikirim' };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return { success: false, error: message };
    }
  });

  ipcMain.handle('printer:printOrder', async (_event, orderId: string) => {
    try {
      await printOrderById(String(orderId));
      return { success: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return { success: false, error: message };
    }
  });

  ipcMain.handle('printer:printDailyReport', async (_event, tanggal: string) => {
    try {
      const report = getDailyReport(String(tanggal));
      if (!report.success) return { success: false, error: report.error || 'Tanggal tidak valid' };
      await printDailyReport(report as Parameters<typeof printDailyReport>[0]);
      return { success: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return { success: false, error: message };
    }
  });
}