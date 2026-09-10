import { ipcMain } from 'electron';
import db from '../database/db';
import { randomUUID } from 'crypto';

function markMenuLocalDirty() {
  db.prepare('INSERT OR REPLACE INTO app_config (key, value) VALUES (?, ?)').run('menu_local_dirty', '1');
}

export function registerMenuHandlers() {
  ipcMain.handle('menu:list', () => {
    return db.prepare(
      'SELECT * FROM menu_items WHERE status_aktif = 1 ORDER BY nama'
    ).all();
  });

  ipcMain.handle('menu:categories', () => {
    return db.prepare('SELECT * FROM categories ORDER BY nama_kategori').all();
  });

  ipcMain.handle('menu:create', (_event, data: {
    nama: string;
    kategori_id: string | null;
    harga: number;
    sku?: string | null;
  }) => {
    const id = randomUUID();
    db.prepare(
      'INSERT INTO menu_items (id, nama, kategori_id, harga, sku, status_aktif) VALUES (?, ?, ?, ?, ?, 1)'
    ).run(id, String(data.nama).trim(), data.kategori_id, Math.round(Number(data.harga)) || 0, data.sku || null);
    markMenuLocalDirty();
    return { success: true, id };
  });

  ipcMain.handle('menu:update', (_event, id: string, data: {
    nama?: string;
    kategori_id?: string | null;
    harga?: number;
    sku?: string | null;
  }) => {
    const existing = db.prepare('SELECT * FROM menu_items WHERE id = ?').get(id) as
      | { nama: string; kategori_id: string | null; harga: number; sku: string | null }
      | undefined;
    if (!existing) return { success: false, error: 'Item menu tidak ditemukan' };

    db.prepare(
      'UPDATE menu_items SET nama = ?, kategori_id = ?, harga = ?, sku = ? WHERE id = ?'
    ).run(
      data.nama !== undefined ? String(data.nama).trim() : existing.nama,
      data.kategori_id !== undefined ? data.kategori_id : existing.kategori_id,
      data.harga !== undefined ? Math.round(Number(data.harga)) || 0 : existing.harga,
      data.sku !== undefined ? data.sku : existing.sku,
      id
    );
    markMenuLocalDirty();
    return { success: true };
  });

  ipcMain.handle('menu:delete', (_event, id: string) => {
    db.prepare('UPDATE menu_items SET status_aktif = 0 WHERE id = ?').run(id);
    markMenuLocalDirty();
    return { success: true };
  });

  ipcMain.handle('category:create', (_event, nama_kategori: string) => {
    const id = randomUUID();
    db.prepare('INSERT INTO categories (id, nama_kategori) VALUES (?, ?)').run(id, String(nama_kategori).trim());
    markMenuLocalDirty();
    return { success: true, id };
  });

  ipcMain.handle('category:update', (_event, id: string, nama_kategori: string) => {
    const existing = db.prepare('SELECT * FROM categories WHERE id = ?').get(id) as
      | { nama_kategori: string }
      | undefined;
    if (!existing) return { success: false, error: 'Kategori tidak ditemukan' };

    db.prepare('UPDATE categories SET nama_kategori = ? WHERE id = ?').run(String(nama_kategori).trim(), id);
    markMenuLocalDirty();
    return { success: true };
  });

  ipcMain.handle('category:delete', (_event, id: string) => {
    const activeItems = db.prepare(
      'SELECT COUNT(*) AS c FROM menu_items WHERE kategori_id = ? AND status_aktif = 1'
    ).get(id) as { c: number };
    if (activeItems.c > 0) {
      return { success: false, error: 'Kategori masih memiliki item aktif' };
    }
    db.prepare('DELETE FROM categories WHERE id = ?').run(id);
    markMenuLocalDirty();
    return { success: true };
  });
}