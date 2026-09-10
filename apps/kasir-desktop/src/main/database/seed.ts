import db from './db';
import { randomUUID } from 'crypto';

export function seed() {
  const existingCategories = db.prepare('SELECT COUNT(*) as count FROM categories').get() as { count: number };
  if (existingCategories.count > 0) return;

  const insertCategory = db.prepare('INSERT INTO categories (id, nama_kategori) VALUES (?, ?)');
  const insertMenu = db.prepare(
    'INSERT INTO menu_items (id, nama, kategori_id, harga, status_aktif) VALUES (?, ?, ?, ?, 1)'
  );
  const insertUser = db.prepare(
    'INSERT INTO users (id, nama, pin_hash, role) VALUES (?, ?, ?, ?)'
  );

  const seedAll = db.transaction(() => {
    const cat1 = randomUUID();
    const cat2 = randomUUID();
    const cat3 = randomUUID();

    insertCategory.run(cat1, 'Makanan Berat');
    insertCategory.run(cat2, 'Makanan Ringan');
    insertCategory.run(cat3, 'Minuman');

    insertMenu.run(randomUUID(), 'Nasi Goreng Spesial', cat1, 25000);
    insertMenu.run(randomUUID(), 'Mie Ayam Jamur', cat1, 22000);
    insertMenu.run(randomUUID(), 'Nasi Rendang', cat1, 30000);
    insertMenu.run(randomUUID(), 'Nasi Pecel Lele', cat1, 20000);
    insertMenu.run(randomUUID(), 'Kentang Goreng', cat2, 15000);
    insertMenu.run(randomUUID(), 'Pisang Goreng', cat2, 10000);
    insertMenu.run(randomUUID(), 'Cireng', cat2, 8000);
    insertMenu.run(randomUUID(), 'Es Teh Manis', cat3, 5000);
    insertMenu.run(randomUUID(), 'Es Jeruk', cat3, 8000);
    insertMenu.run(randomUUID(), 'Kopi Susu', cat3, 12000);

    insertUser.run(randomUUID(), 'Admin', '$2b$10$placeholder', 'admin');
  });

  seedAll();
  console.log('Seed data berhasil dimasukkan.');
}