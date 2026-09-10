import { ipcMain } from 'electron';
import { getSyncStatus, runSync, pushPendingOrders, pushMenuInit, pullMenu } from '../services/syncService';

export function registerSyncHandlers() {
  ipcMain.handle('sync:run', async () => {
    try {
      const result = await runSync();
      return { success: true, ...result, ...getSyncStatus() };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return { success: false, error: message, ...getSyncStatus() };
    }
  });

  ipcMain.handle('sync:push', async () => {
    try {
      const result = await pushPendingOrders();
      return { success: true, ...result, ...getSyncStatus() };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return { success: false, error: message, ...getSyncStatus() };
    }
  });

  ipcMain.handle('sync:pushMenu', async () => {
    const ok = await pushMenuInit();
    return { success: ok, ...getSyncStatus() };
  });

  ipcMain.handle('sync:pullMenu', async () => {
    const ok = await pullMenu();
    return { success: ok, ...getSyncStatus() };
  });

  ipcMain.handle('sync:status', () => getSyncStatus());
}