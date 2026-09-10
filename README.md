# POS Rumah Makan

Aplikasi POS rumah makan multi-tenant (SaaS): kasir desktop berbasis Electron + SQLite lokal, terhubung ke cloud (Supabase) untuk sync & dashboard.

## Prinsip Development

Bangun dulu aplikasi kasir lokal sampai benar-benar jalan (Milestone 1), baru sambungkan ke cloud multi-tenant. Ikuti urutan tahap — jangan loncat.

## Struktur Repo

```
pos-rumah-makan/
├── apps/
│   ├── kasir-desktop/      # Aplikasi Electron (fokus utama — dikerjakan pertama)
│   │   ├── src/
│   │   │   ├── main/       # Electron main process
│   │   │   ├── renderer/   # UI (React + Tailwind, mulai Tahap 4)
│   │   │   └── shared/     # kode bersama main & renderer
│   │   └── package.json
│   └── backend-api/        # Backend cloud (dikerjakan setelah kasir lokal jalan)
│       ├── src/
│       └── package.json
└── .tools/node16           # Portable Node 16.17.0 (dev build only, gitignored)
```

## Tooling Note

Node 16.17.0 DEV dipakai sebagai portable (`.tools/node16`, gitignored) agar tidak
mengganggu Node yang sudah terinstall di sistem. Download ulang jika `.tools` hilang:
https://nodejs.org/dist/v16.17.0/node-v16.17.0-win-x64.zip

Di setiap sesi terminal kerja proyek, aktifkan dulu:

```powershell
$env:PATH = "D:\MOBILE\pos-rumah-makan\.tools\node16;$env:PATH"
node -v   # harus v16.17.0
```

## Stack

- Electron 22.3.27 (versi terakhir kompatibel Windows 7) + TypeScript (CJS main process)
- SQLite lokal: better-sqlite3 (Tahap 3)
- UI: React + Tailwind + Zustand (Tahap 4)
- Printer thermal: node-thermal-printer + Windows printer share (UNC), Tahap 5
- Cloud: Fastify + Supabase (PostgreSQL + Auth + RLS), Tahap 7+

## Status Perkembangan

- [x] Tahap 1: Setup environment & struktur repo
- [x] Tahap 2: Jendela Electron dasar jalan
- [x] Tahap 3: DB lokal SQLite (schema: app_config, users, categories, menu_items, tables, orders, order_items, payments, sync_queue)
- [x] Tahap 4: UI dasar (kasir: menu grid, keranjang, pembayaran TUNAI/DEBIT/QRIS)
- [x] Tahap 5: Printer thermal (node-thermal-printer + share printer; teruji kode, belum uji hardware)
- [x] Tahap 6: Milestone 1 (kasir lokal end-to-end: transaksi, CRUD menu & kategori, cetak ulang struk)
- [x] Tahap 7: Cloud multi-tenant (Supabase + RLS + auth register/login)
- [x] Tahap 8: Aktivasi tenant via SetupWizard (kasir desktop → cloud)
- [x] Tahap 9: Sinkronisasi (orders + menu via sync_queue / api, idempoten)
- [x] Tahap 10: Login kasir (PIN)
- [x] Tahap 11: Jenis order (Makan di Tempat / Bawa Pulang) + pilih meja
- [x] Tahap 12: Riwayat transaksi + detail + cetak ulang
- [x] Tahap 13: Packaging installer (electron-builder NSIS)

Note: Tahap 0 (validasi hardware printer) tertunda sampai uji di PC Windows 7 dengan printer AnyPOS.