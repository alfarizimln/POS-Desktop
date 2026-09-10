import { ipcMain } from 'electron';
import db from '../database/db';

export function registerTableHandlers() {
  ipcMain.handle('table:list', () => {
    return db.prepare('SELECT * FROM tables WHERE status = ? ORDER BY nomor_meja').all('KOSONG');
  });
}