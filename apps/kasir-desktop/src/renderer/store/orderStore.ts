import { create } from 'zustand';

declare global {
  interface Window {
    api: {
      config: {
        get: (key: string) => Promise<string | null>;
        set: (key: string, value: string) => Promise<boolean>;
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
  pay: (metode: 'TUNAI' | 'DEBIT' | 'QRIS', jumlahDibayar: number) => Promise<{ success: boolean; kembalian?: number; error?: string }>;
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

  pay: async (metode, jumlahDibayar) => {
    const { cart, totalHarga } = get();
    if (cart.length === 0) return { success: false, error: 'Keranjang kosong' };
    if (jumlahDibayar < totalHarga()) {
      return { success: false, error: 'Jumlah bayar kurang' };
    }

    const result = await window.api.order.create({
      order_type: 'TAKE_AWAY',
      table_id: null,
      kasir_id: '00000000-0000-0000-0000-000000000001',
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