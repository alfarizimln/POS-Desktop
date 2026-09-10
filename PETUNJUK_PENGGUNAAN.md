# PETUNJUK PENGGUNAAN — POS Rumah Makan

Aplikasi kasir desktop untuk rumah makan / warung. Berjalan **offline-first**: semua data (menu, transaksi, pengguna) tersimpan di database lokal perangkat. Sinkronisasi ke cloud bersifat opsional dan hanya aktif bila Anda mendaftar akun.

---

## 1. Tentang Data & File Penting

| Hal | Detail |
|---|---|
| Installer (64-bit) | `apps/kasir-desktop/release/POS Rumah Makan Setup 1.0.0 (x64).exe` |
| Installer (32-bit, untuk Win7 32-bit) | `apps/kasir-desktop/release/POS Rumah Makan Setup 1.0.0 (ia32).exe` |
| Database lokal | `%APPDATA%\POS Rumah Makan\pos-database.sqlite` |
| Database (saat mode dev) | `%APPDATA%\Electron\pos-database.sqlite` |
| Printer | Printer thermal 80mm yang **di-share** oleh Windows (bukan USB langsung) |

> **Backup**: tutup aplikasi, lalu salin file `pos-database.sqlite` ke lokasi lain. Itu satu-satunya data Anda.

---

## 2. Instalasi

### Persyaratan PC
- Windows 7 SP1/8/10/11, 32-bit **atau** 64-bit.
- **Pilih installer sesuai arsitektur**: cek lewat *My Computer → Properties → System type*.
  - `(ia32)` → untuk Windows **32-bit** (termasuk Win7 Pro 32-bit).
  - `(x64)` → untuk Windows 64-bit.
- Jika muncul error seperti `api-ms-win-crt-*.dll`, install **Universal C Runtime (KB2999226)** lalu jalankan Windows Update.
- Catatan 32-bit: RAM efektif maksimal ±3,5 GB — aplikasi ini ringan, aman.
- Tidak butuh admin — installer bersifat per-user.

### Langkah
1. Salin file installer yang sesuai arsitektur (misal `POS Rumah Makan Setup 1.0.0 (ia32).exe`) dari folder `release/` ke PC (via USB).
2. Jalankan installer → ikuti wizard → Selesai.
3. Buka aplikasi **POS Rumah Makan** dari Start Menu / desktop.

---

## 3. Pengaturan Awal (Pertama Kali Buka)

Wizard 3 langkah muncul sekali:

1. **Profil Toko** — isi Nama Toko & Nama Pemilik, lalu:
   - **"Selanjutnya"** → lanjut buat akun cloud, ATAU
   - **"Lanjut Tanpa Akun (Mode Lokal)"** → langsung pakai tanpa internet. Di mode ini tidak ada sinkronisasi cloud; muncul badge **Mode Lokal** di halaman kasir.
2. **Buat Akun** (opsional, hanya jika memilih "Selanjutnya") — email + password; aplikasi akan terhubung ke server untuk sinkron data.
3. **Siap Digunakan** → klik **Mulai Kasir**.

---

## 4. Login Kasir

- Pilih nama kasir pada dropdown.
- Masukkan **PIN (4–6 digit)** lewat keypad, tekan OK.
- Akun **Admin** sudah tersedia sejak awal dengan PIN **`1234`**.
  > Segera ganti PIN Admin setelah pertama kali masuk (menu **Kasir → Ganti PIN**).
- Tombol **Keluar** untuk kembali ke layar login (pindah kasir).

---

## 5. Alur Transaksi Harian

1. **Pilih jenis order** di panel kanan:
   - **Bawa Pulang** (TAKE AWAY) — tanpa meja.
   - **Makan di Tempat** (DINE IN) — wajib klik **Pilih Meja** lalu pilih nomor meja 1–6.
2. **Klik menu** di panel kiri (bisa difilter per kategori) → item masuk keranjang.
3. Di keranjang: atur jumlah dengan tombol `− / +`, hapus item (**Hapus**), atau bersihkan total dengan **Kosongkan**.
4. Klik **Bayar** → pilih metode:
   - **TUNAI**: ketik jumlah uang, atau gunakan tombol cepat **Uang pas / 5rb–100rb**. Kembalian tampil otomatis sebelum konfirmasi.
   - **DEBIT / QRIS**: isi **Reference ID** dari aplikasi pembayaran.
5. Konfirmasi pembayaran. Setelah sukses:
   - Struk dicetak otomatis *bila printer sudah disetup & aktif*,
   - Keranjang dikosongkan,
   - Tombol **Cetak Ulang** aktif untuk struk order terakhir.

---

## 6. Kelola Menu (tombol **Kelola Menu**)

- **Kategori**: tambah (nama), ubah nama, hapus.
- **Item menu**: tambah (nama, harga, kategori, SKU opsional), ubah, hapus.
- Item yang "dihapus" dinonaktifkan dan tidak tampil di panel kasir.
- Perubahan menu berlaku lokal; di mode cloud, menu akan disinkronkan otomatis.

---

## 7. Riwayat & Cetak Struk (tombol **Riwayat**)

- Menampilkan 100 transaksi terakhir (waktu, jenis, meja, kasir, total, status sinkron).
- Klik baris → **Detail** (daftar item, metode bayar, kembalian).
- Klik **Cetak** pada baris untuk mencetak ulang struk order lama.

---

## 8. Laporan Harian (tombol **Laporan**)

- Pilih tanggal → tampil:
  - Total penjualan & jumlah transaksi,
  - Rincian per **metode bayar** (Tunai/Debit/QRIS),
  - Rincian per **jenis order** (Makan di Tempat/Bawa Pulang),
  - Rincian per **kasir**.

---

## 9. Kelola Kasir (tombol **Kasir**)

- **Tambah Kasir**: nama + PIN (4–6 digit).
- **Ganti Nama** kasir.
- **Ganti PIN**.
- **Hapus**: hanya bisa bila masih ada minimal 1 kasir lain; kasir yang sedang login tidak bisa dihapus.
- Nama kasir yang bertransaksi tercatat di riwayat dan laporan.

---

## 10. Profil Usaha (tombol **Setelan**)

- Ubah **Nama Usaha**, **Alamat**, dan **Telepon**.
- Nama usaha & alamat tampil di header halaman kasir (judul aplikasi).

---

## 11. Printer Thermal (tombol **Printer**)

Setup sekali:

1. Di PC, **share printer** AnyPOS melalui *Control Panel → Devices and Printers → Printer properties → Sharing → Share this printer*. Catat nama share-nya.
2. Buka aplikasi → **Printer** → pilih nama printer dari daftar ATAU isi nama share (misal `AnyPOS`).
3. Klik **Simpan**, lalu **Test Print** → harus keluar struk uji.
4. Sinkronkan pengaturan jika diminta; setelah itu struk transaksi otomatis tercetak.

**Jika tidak keluar struk**, periksa sesuai urutan:
- Nama share sesuai (tulis di *Printer → nama share*).
- Printer dalam keadaan online & tidak menunggu (paper out, off).
- Jalankan **Test Print** untuk memastikan jalur kirimnya OK.

---

## 12. Sinkronisasi (mode Cloud saja)

- **Otomatis**: dicoba setiap 60 detik; order yang belum terkirim masuk antrean.
- **Manual**: tombol **Sinkronkan** di halaman kasir.
- Badge status di header:
  - `Mode Lokal` → tanpa cloud (mode lokal).
  - `N order tertunda` → ada antrean menunggu.
  - `Offline` → server tidak terjangkau; data tetap aman di lokal.
  - `Sinkron HH:MM` → sinkron terakhir sukses.
- `order:history` berjalan normal walau offline karena data lokal.

---

## 13. FAQ / Pemecahan Masalah

| Masalah | Solusi |
|---|---|
| Gagal install di Windows 7 | Pastikan arsitektur yang dipilih benar: pakai installer `(ia32)` untuk Windows 32-bit; install SP1 + Universal C Runtime (KB2999226); jalankan Windows Update. |
| Muncul `api-ms-win-crt-os.h` DLL & teman-temannya | Install update: KB2999226 (Universal CRT) / KB3118401. |
| Printer tidak mencetak | Cek nama share, status printer online, lalu **Test Print**. |
| Lupa PIN Admin | Tidak ada reset melalui UI; backup dulu DB, lalu reset dengan menghapus file DB → aplikasi membuat data baru & Admin/PIN `1234`. |
| Ingin memulai ulang (data bersih) | Tutup aplikasi, hapus `pos-database.sqlite` di `%APPDATA%\POS Rumah Makan`, buka lagi. |
| Tidak ada/lupa nama share printer | Lihat properti printer di *Devices and Printers → Sharing*; nama share inilah yang dipakai aplikasi. |
| Error saat *update* versi | Pastikan aplikasi ditutup sepenuhnya sebelum instalasi ulang (file DB ter-lock bila berjalan). |
| Pindah/backup data | Salin `pos-database.sqlite` (tutup aplikasi dulu) ke perangkat lain; letakkan di `%APPDATA%\POS Rumah Makan\` PC baru. |