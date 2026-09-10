import { ipcMain } from 'electron';
import crypto from 'crypto';
import db from '../database/db';

const DEFAULT_PIN = '1234';
const SCRYPT_OPTS: crypto.ScryptOptions = { N: 16384, r: 8, p: 1 };

export function hashPin(pin: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(pin, salt, 32, SCRYPT_OPTS).toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPin(pin: string, stored: string): boolean {
  const [salt, hash] = stored.split(':');
  if (!salt || !hash) return false;
  const candidate = crypto.scryptSync(pin, salt, 32, SCRYPT_OPTS).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(candidate, 'hex'));
}

export function ensureDefaultAdminPin() {
  const admin = db.prepare('SELECT id, pin_hash FROM users ORDER BY rowid LIMIT 1').get() as
    | { id: string; pin_hash: string }
    | undefined;
  if (!admin) return;

  const isPlaceholder = !admin.pin_hash || !admin.pin_hash.includes(':') || admin.pin_hash.startsWith('$2b$');
  if (isPlaceholder) {
    db.prepare('UPDATE users SET pin_hash = ? WHERE id = ?').run(hashPin(DEFAULT_PIN), admin.id);
    console.log('PIN default Admin diset ke 1234');
  }
}

export function registerAuthHandlers() {
  ipcMain.handle('auth:login', (_event, userId: string, pin: string) => {
    const user = db.prepare('SELECT id, nama, role, pin_hash FROM users WHERE id = ?').get(String(userId)) as
      | { id: string; nama: string; role: string; pin_hash: string }
      | undefined;
    if (!user) return { success: false, error: 'User tidak ditemukan' };

    if (!verifyPin(String(pin), user.pin_hash)) {
      return { success: false, error: 'PIN salah' };
    }

    db.prepare('INSERT OR REPLACE INTO app_config (key, value) VALUES (?, ?)').run('current_kasir_id', user.id);
    return { success: true, user: { id: user.id, nama: user.nama, role: user.role } };
  });

  ipcMain.handle('auth:current', () => {
    const id = db.prepare('SELECT value FROM app_config WHERE key = ?').get('current_kasir_id') as
      | { value: string }
      | undefined;
    if (!id) return { success: false, user: null };

    const user = db.prepare('SELECT id, nama, role FROM users WHERE id = ?').get(id.value) as
      | { id: string; nama: string; role: string }
      | undefined;
    if (!user) return { success: false, user: null };
    return { success: true, user };
  });

  ipcMain.handle('auth:logout', () => {
    db.prepare('DELETE FROM app_config WHERE key = ?').run('current_kasir_id');
    return { success: true };
  });

  ipcMain.handle('user:list', () => {
    const users = db.prepare('SELECT id, nama, role FROM users ORDER BY rowid').all() as Array<{
      id: string; nama: string; role: string;
    }>;
    return { success: true, users };
  });

  ipcMain.handle('user:create', (_event, nama: string, pin: string) => {
    if (!String(nama).trim()) return { success: false, error: 'Nama wajib diisi' };
    const pinStr = String(pin);
    if (!/^\d{4,6}$/.test(pinStr)) {
      return { success: false, error: 'PIN harus 4-6 digit angka' };
    }
    const id = crypto.randomUUID();
    db.prepare('INSERT INTO users (id, nama, pin_hash, role) VALUES (?, ?, ?, ?)').run(
      id, String(nama).trim(), hashPin(pinStr), 'kasir'
    );
    return { success: true, id, error: undefined };
  });

  ipcMain.handle('user:rename', (_event, id: string, nama: string) => {
    if (!String(nama).trim()) return { success: false, error: 'Nama wajib diisi' };
    db.prepare('UPDATE users SET nama = ? WHERE id = ?').run(String(nama).trim(), String(id));
    return { success: true, error: undefined };
  });

  ipcMain.handle('user:updatePin', (_event, id: string, pin: string) => {
    const pinStr = String(pin);
    if (!/^\d{4,6}$/.test(pinStr)) {
      return { success: false, error: 'PIN harus 4-6 digit angka' };
    }
    db.prepare('UPDATE users SET pin_hash = ? WHERE id = ?').run(hashPin(pinStr), String(id));
    return { success: true, error: undefined };
  });

  ipcMain.handle('user:delete', (_event, id: string) => {
    const idStr = String(id);
    const current = db.prepare('SELECT value FROM app_config WHERE key = ?').get('current_kasir_id') as
      | { value: string }
      | undefined;
    if (current && current.value === idStr) {
      return { success: false, error: 'Tidak bisa menghapus user yang sedang login' };
    }
    const count = db.prepare('SELECT COUNT(*) AS c FROM users').get() as { c: number };
    if (count.c <= 1) {
      return { success: false, error: 'Minimal harus ada satu user' };
    }
    db.prepare('DELETE FROM users WHERE id = ?').run(idStr);
    return { success: true, error: undefined };
  });
}