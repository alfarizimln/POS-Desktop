export interface MenuItem {
  id: string;
  nama: string;
  kategori_id: string;
  harga: number;
  foto_url: string | null;
  status_aktif: number;
  sku: string | null;
}

export interface Category {
  id: string;
  nama_kategori: string;
}

export interface UserInfo {
  id: string;
  nama: string;
  role: string;
}

export interface TableInfo {
  id: string;
  nomor_meja: string;
  kapasitas: number | null;
  status: string;
}

export interface LoginResult {
  success: boolean;
  user?: UserInfo;
  error?: string;
}

export interface MutationResult {
  success: boolean;
  id?: string;
  error?: string;
}

export interface CartItem {
  menuItemId: string;
  nama: string;
  harga: number;
  qty: number;
  catatan?: string;
}

export interface OrderData {
  order_type: 'DINE_IN' | 'TAKE_AWAY';
  table_id: string | null;
  kasir_id: string;
  items: CartItem[];
  metode_pembayaran: 'TUNAI' | 'DEBIT' | 'QRIS';
  jumlah_dibayar: number;
}

export interface OrderResult {
  success: boolean;
  order_id?: string;
  kembalian?: number;
  error?: string;
}

export interface OrderHistoryRow {
  id: string;
  order_type: string;
  table_id: string | null;
  nomor_meja: string | null;
  waktu_buka: string;
  total: number | null;
  jumlah_bayar: number | null;
  kembalian: number | null;
  metode: string | null;
  sync_status: string;
  kasir_nama?: string | null;
}

export interface OrderDetailResult {
  success: boolean;
  error?: string;
  order?: {
    id: string;
    order_type: string;
    table_id: string | null;
    nomor_antrian: string | null;
    waktu_buka: string;
    waktu_tutup: string | null;
    sync_status: string;
    nomor_meja: string | null;
    metode: string | null;
    jumlah_bayar: number | null;
    kembalian: number | null;
    items: Array<{ nama: string; qty: number; catatan: string | null; harga: number }>;
  };
}

export interface DailyReportResult {
  success: boolean;
  error?: string;
  tanggal: string;
  summary: { jumlah_order: number; total_penjualan: number };
  byMetode: Array<{ metode: string; jumlah: number; nominal: number }>;
  byType: Array<{ tipe: string; jumlah: number; nominal: number }>;
  byKasir: Array<{ kasir: string; jumlah: number; nominal: number }>;
}

export interface AppInfoResult {
  success: boolean;
  error?: string;
  info: { nama_usaha: string; alamat_usaha: string; telp_usaha: string };
}

export interface UserRow {
  id: string;
  nama: string;
  role: string;
}

export interface UserMutationResult {
  success: boolean;
  error?: string;
  id?: string;
}

export interface ElectronAPI {
  config: {
    get: (key: string) => Promise<string | null>;
    set: (key: string, value: string) => Promise<boolean>;
  };
  auth: {
    login: (userId: string, pin: string) => Promise<LoginResult>;
    current: () => Promise<{ success: boolean; user: UserInfo | null }>;
    logout: () => Promise<{ success: boolean }>;
  };
  table: {
    list: () => Promise<TableInfo[]>;
  };
  menu: {
    list: () => Promise<MenuItem[]>;
    categories: () => Promise<Category[]>;
    create: (data: { nama: string; kategori_id: string | null; harga: number; sku?: string | null }) => Promise<MutationResult>;
    update: (id: string, data: { nama?: string; kategori_id?: string | null; harga?: number; sku?: string | null }) => Promise<MutationResult>;
    remove: (id: string) => Promise<MutationResult>;
    categoryCreate: (nama: string) => Promise<MutationResult>;
    categoryUpdate: (id: string, nama: string) => Promise<MutationResult>;
    categoryDelete: (id: string) => Promise<MutationResult>;
  };
  order: {
    create: (data: OrderData) => Promise<OrderResult>;
    history: (options?: { limit?: number }) => Promise<{ success: boolean; orders: OrderHistoryRow[] }>;
    detail: (orderId: string) => Promise<OrderDetailResult>;
  };
  report: {
    daily: (tanggal: string) => Promise<DailyReportResult>;
  };
  user: {
    list: () => Promise<{ success: boolean; users: UserRow[] }>;
    create: (nama: string, pin: string) => Promise<UserMutationResult>;
    rename: (id: string, nama: string) => Promise<UserMutationResult>;
    updatePin: (id: string, pin: string) => Promise<UserMutationResult>;
    delete: (id: string) => Promise<UserMutationResult>;
  };
  app: {
    getInfo: () => Promise<AppInfoResult>;
    updateInfo: (info: { nama_usaha: string; alamat_usaha: string; telp_usaha: string }) => Promise<MutationResult>;
  };
  sync: {
    run: () => Promise<SyncResult>;
    push: () => Promise<SyncResult>;
    pushMenu: () => Promise<SyncResult>;
    pullMenu: () => Promise<SyncResult>;
    status: () => Promise<SyncStatus>;
  };
  printer: {
    list: () => Promise<PrinterListResult>;
    set: (name: string) => Promise<{ success: boolean }>;
    setShare: (share: string) => Promise<{ success: boolean }>;
    test: () => Promise<PrintResult>;
    printOrder: (orderId: string) => Promise<PrintResult>;
  };
}

export interface PrinterListResult {
  success: boolean;
  error?: string;
  printers: string[];
}

export interface PrintResult {
  success: boolean;
  error?: string;
  message?: string;
}

export interface SyncStatus {
  pendingCount: number;
  lastSyncAt: string | null;
  lastError: string | null;
  online: boolean;
  syncing: boolean;
}

export interface SyncResult {
  success: boolean;
  error?: string;
  pushed?: number;
  menuPushed?: boolean;
  menuPulled?: boolean;
  pendingCount?: number;
  lastSyncAt?: string | null;
  lastError?: string | null;
  online?: boolean;
  syncing?: boolean;
}
