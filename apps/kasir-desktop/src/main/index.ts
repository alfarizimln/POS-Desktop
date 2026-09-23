import { app, BrowserWindow } from 'electron';
import path from 'path';
import './appName';
import { seed, seedTables } from './database/seed';
import { registerMenuHandlers } from './handlers/menuHandlers';
import { registerTableHandlers } from './handlers/tableHandlers';
import { registerOrderHandlers } from './handlers/orderHandlers';
import { registerConfigHandlers } from './handlers/configHandlers';
import { registerSyncHandlers } from './handlers/syncHandlers';
import { registerPrinterHandlers } from './handlers/printerHandlers';
import { registerAuthHandlers, ensureDefaultAdminPin } from './handlers/authHandlers';
import { startSyncTimer, runSync } from './services/syncService';

const isDev = process.env.ELECTRON_DEV === '1';
const VITE_DEV_URL = 'http://localhost:5173';

function createWindow() {
  const win = new BrowserWindow({
    width: 1024,
    height: 768,
    title: 'E-Restoran',
    icon: isDev ? path.join(__dirname, '../../build/icon.ico') : undefined,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (isDev) {
    win.loadURL(VITE_DEV_URL);
  } else {
    win.loadFile(path.join(__dirname, '../renderer/index.html'));
  }
}

app.whenReady().then(() => {
  seed();
  seedTables();
  ensureDefaultAdminPin();
  registerConfigHandlers();
  registerAuthHandlers();
  registerMenuHandlers();
  registerTableHandlers();
  registerOrderHandlers();
  registerSyncHandlers();
  registerPrinterHandlers();
  startSyncTimer();
  runSync().catch(() => {
    // sinkronisasi startup gagal, akan dicoba ulang via timer
  });
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});