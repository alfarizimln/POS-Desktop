import { create } from 'zustand';

declare global {
  interface Window {
    api: {
      config: {
        get: (key: string) => Promise<string | null>;
        set: (key: string, value: string) => Promise<boolean>;
      };
      auth: {
        login: (userId: string, pin: string) => Promise<{ success: boolean; user?: { id: string; nama: string; role: string }; error?: string }>;
        current: () => Promise<{ success: boolean; user: { id: string; nama: string; role: string } | null }>;
        logout: () => Promise<{ success: boolean }>;
      };
      table: {
        list: () => Promise<Array<{ id: string; nomor_meja: string; kapasitas: number | null; status: string }>>;
      };
      menu: {
        list: () => Promise<Array<{
          id: string; nama: string; kategori_id: string;
          harga: number; foto_url: string | null;
          status_aktif: number; sku: string | null;
        }>>;
        categories: () => Promise<Array<{ id: string; nama_kategori: string }>>;
        create: (data: { nama: string; kategori_id: string | null; harga: number; sku?: string | null }) => Promise<{ success: boolean; id?: string; error?: string }>;
        update: (id: string, data: { nama?: string; kategori_id?: string | null; harga?: number; sku?: string | null }) => Promise<{ success: boolean; error?: string }>;
        remove: (id: string) => Promise<{ success: boolean; error?: string }>;
        categoryCreate: (nama: string) => Promise<{ success: boolean; id?: string; error?: string }>;
        categoryUpdate: (id: string, nama: string) => Promise<{ success: boolean; error?: string }>;
        categoryDelete: (id: string) => Promise<{ success: boolean; error?: string }>;
      };
      order: {
        create: (data: {
          order_type: 'DINE_IN' | 'TAKE_AWAY';
          table_id: string | null;
          kasir_id: string;
          items: Array<{
            menuItemId: string; nama: string; harga: number;
            qty: number; catatan?: string;
          }>;
          metode_pembayaran: 'TUNAI' | 'DEBIT' | 'QRIS';
          jumlah_dibayar: number;
        }) => Promise<{ success: boolean; order_id?: string; kembalian?: number; error?: string }>;
        history: (options?: { limit?: number }) => Promise<{
          success: boolean;
          orders: Array<{
            id: string; order_type: string; table_id: string | null; nomor_meja: string | null;
            waktu_buka: string; total: number | null; jumlah_bayar: number | null;
            kembalian: number | null; metode: string | null; sync_status: string;
          }>;
        }>;
        detail: (orderId: string) => Promise<{
          success: boolean;
          error?: string;
          order?: {
            id: string; order_type: string; table_id: string | null; nomor_antrian: string | null;
            waktu_buka: string; waktu_tutup: string | null; sync_status: string; nomor_meja: string | null;
            metode: string | null; jumlah_bayar: number | null; kembalian: number | null;
            items: Array<{ nama: string; qty: number; catatan: string | null; harga: number }>;
          };
        }>;
      };
      report: {
        daily: (tanggal: string) => Promise<{
          success: boolean;
          error?: string;
          tanggal: string;
          summary: { jumlah_order: number; total_penjualan: number };
          byMetode: Array<{ metode: string; jumlah: number; nominal: number }>;
          byType: Array<{ tipe: string; jumlah: number; nominal: number }>;
        }>;
      };
      user: {
        list: () => Promise<{ success: boolean; users: Array<{ id: string; nama: string; role: string }> }>;
        create: (nama: string, pin: string) => Promise<{ success: boolean; error?: string; id?: string }>;
        rename: (id: string, nama: string) => Promise<{ success: boolean; error?: string }>;
        updatePin: (id: string, pin: string) => Promise<{ success: boolean; error?: string }>;
        delete: (id: string) => Promise<{ success: boolean; error?: string }>;
      };
      app: {
        getInfo: () => Promise<{
          success: boolean;
          error?: string;
          info: { nama_usaha: string; alamat_usaha: string; telp_usaha: string };
        }>;
        updateInfo: (info: { nama_usaha: string; alamat_usaha: string; telp_usaha: string }) =>
          Promise<{ success: boolean; error?: string }>;
      };
      sync: {
        run: () => Promise<{
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
        }>;
        push: () => Promise<{
          success: boolean;
          error?: string;
          pushed?: number;
          pendingCount?: number;
          lastSyncAt?: string | null;
          lastError?: string | null;
          online?: boolean;
          syncing?: boolean;
        }>;
        pushMenu: () => Promise<{ success: boolean; pendingCount?: number }>;
        pullMenu: () => Promise<{ success: boolean; pendingCount?: number }>;
        status: () => Promise<{
          pendingCount: number;
          lastSyncAt: string | null;
          lastError: string | null;
          online: boolean;
          syncing: boolean;
        }>;
      };
      printer: {
        list: () => Promise<{ success: boolean; error?: string; printers: string[] }>;
        set: (name: string) => Promise<{ success: boolean }>;
        setShare: (share: string) => Promise<{ success: boolean }>;
        test: () => Promise<{ success: boolean; error?: string; message?: string }>;
        printOrder: (orderId: string) => Promise<{ success: boolean; error?: string }>;
      };
    };
  }
}

export interface MenuItem {
  id: string;
  nama: string;
  harga: number;
  kategori: string;
}

interface CartItem {
  menuItemId: string;
  nama: string;
  harga: number;
  qty: number;
  catatan?: string;
}

interface OrderState {
  menuItems: MenuItem[];
  cart: CartItem[];
  loadMenu: () => Promise<void>;
  addItem: (item: CartItem) => void;
  updateQty: (menuItemId: string, qty: number) => void;
  removeItem: (menuItemId: string) => void;
  clearCart: () => void;
  totalHarga: () => number;
  pay: (
    metode: 'TUNAI' | 'DEBIT' | 'QRIS',
    jumlahDibayar: number,
    order_type?: 'DINE_IN' | 'TAKE_AWAY',
    tableId?: string | null
  ) => Promise<{ success: boolean; order_id?: string; kembalian?: number; error?: string }>;
}

export const useOrderStore = create<OrderState>((set, get) => ({
  menuItems: [],
  cart: [],

  loadMenu: async () => {
    const [items, categories] = await Promise.all([
      window.api.menu.list(),
      window.api.menu.categories(),
    ]);
    const catMap = new Map(categories.map(c => [c.id, c.nama_kategori]));
    set({
      menuItems: items.map(item => ({
        id: item.id,
        nama: item.nama,
        harga: item.harga,
        kategori: catMap.get(item.kategori_id) || '',
      })),
    });
  },

  addItem: (item) =>
    set((state) => {
      const existing = state.cart.find((i) => i.menuItemId === item.menuItemId);
      if (existing) {
        return {
          cart: state.cart.map((i) =>
            i.menuItemId === item.menuItemId ? { ...i, qty: i.qty + 1 } : i
          ),
        };
      }
      return { cart: [...state.cart, { ...item, qty: 1 }] };
    }),

  updateQty: (menuItemId, qty) =>
    set((state) => {
      if (qty <= 0) {
        return { cart: state.cart.filter((i) => i.menuItemId !== menuItemId) };
      }
      return {
        cart: state.cart.map((i) =>
          i.menuItemId === menuItemId ? { ...i, qty } : i
        ),
      };
    }),

  removeItem: (menuItemId) =>
    set((state) => ({
      cart: state.cart.filter((i) => i.menuItemId !== menuItemId),
    })),

  clearCart: () => set({ cart: [] }),

  totalHarga: () =>
    get().cart.reduce((sum, item) => sum + item.harga * item.qty, 0),

  pay: async (metode, jumlahDibayar, order_type = 'TAKE_AWAY', tableId = null) => {
    const { cart, totalHarga } = get();
    if (cart.length === 0) return { success: false, error: 'Keranjang kosong' };
    if (jumlahDibayar < totalHarga()) {
      return { success: false, error: 'Jumlah bayar kurang' };
    }

    const session = await window.api.auth.current();
    const kasirId = session.success && session.user ? session.user.id : '00000000-0000-0000-0000-000000000001';

    const result = await window.api.order.create({
      order_type,
      table_id: tableId,
      kasir_id: kasirId,
      items: cart,
      metode_pembayaran: metode,
      jumlah_dibayar: jumlahDibayar,
    });

    if (result.success) {
      set({ cart: [] });
    }

    return result;
  },
}));