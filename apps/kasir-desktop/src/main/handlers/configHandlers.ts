import { ipcMain } from 'electron';
import db from '../database/db';

export function registerConfigHandlers() {
  ipcMain.handle('config:get', (_event, key: string) => {
    const row = db.prepare('SELECT value FROM app_config WHERE key = ?').get(key) as { value: string } | undefined;
    return row?.value || null;
  });

  ipcMain.handle('config:set', (_event, key: string, value: string) => {
    db.prepare('INSERT OR REPLACE INTO app_config (key, value) VALUES (?, ?)').run(key, value);
    return true;
  });

  ipcMain.handle('app:getInfo', () => {
    const keys = ['nama_usaha', 'alamat_usaha', 'telp_usaha'];
    const rows = db.prepare('SELECT key, value FROM app_config WHERE key IN (?, ?, ?)').all(...keys) as Array<{
      key: string; value: string;
    }>;
    const info: Record<string, string> = { nama_usaha: 'POS Rumah Makan', alamat_usaha: '', telp_usaha: '' };
    for (const r of rows) info[r.key] = r.value;
    return { success: true, info };
  });

  ipcMain.handle('app:updateInfo', (_event, info: Record<string, string>) => {
    const nama = String(info?.nama_usaha || '').trim();
    if (!nama) return { success: false, error: 'Nama usaha wajib diisi' };
    db.prepare('INSERT OR REPLACE INTO app_config (key, value) VALUES (?, ?)').run('nama_usaha', nama);
    db.prepare('INSERT OR REPLACE INTO app_config (key, value) VALUES (?, ?)').run('alamat_usaha', String(info?.alamat_usaha || '').trim());
    db.prepare('INSERT OR REPLACE INTO app_config (key, value) VALUES (?, ?)').run('telp_usaha', String(info?.telp_usaha || '').trim());
    return { success: true, error: undefined };
  });
}