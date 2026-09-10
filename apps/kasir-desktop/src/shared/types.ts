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

export interface ElectronAPI {
  config: {
    get: (key: string) => Promise<string | null>;
    set: (key: string, value: string) => Promise<boolean>;
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
