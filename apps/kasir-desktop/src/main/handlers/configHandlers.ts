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
}