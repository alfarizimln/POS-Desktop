import { app } from 'electron';
import path from 'path';

app.setName('E-Restoran');

// Pastikan folder data tetap di %APPDATA%\POS Rumah Makan agar data
// yang sudah ada (menu, transaksi, saldo awal) tetap terbaca.
app.setPath('userData', path.join(app.getPath('appData'), 'POS Rumah Makan'));