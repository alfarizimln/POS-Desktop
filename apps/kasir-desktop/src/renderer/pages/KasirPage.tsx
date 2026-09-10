import { useEffect, useState } from 'react';
import { useOrderStore } from '../store/orderStore';
import { MenuManagement } from './MenuManagement';

function formatRupiah(n: number) {
  return 'Rp ' + n.toLocaleString('id-ID');
}

function formatWaktu(iso: string | null) {
  if (!iso) return '-';
  const d = new Date(iso);
  return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
}

export function KasirPage() {
  const {
    menuItems, cart, loadMenu,
    addItem, updateQty, removeItem, clearCart, totalHarga, pay,
  } = useOrderStore();

  const [selectedKategori, setSelectedKategori] = useState<string>('Semua');
  const [showBayar, setShowBayar] = useState(false);
  const [metodeBayar, setMetodeBayar] = useState<'TUNAI' | 'DEBIT' | 'QRIS'>('TUNAI');
  const [jumlahBayar, setJumlahBayar] = useState('');
  const [pesan, setPesan] = useState('');
  const [syncStatus, setSyncStatus] = useState<{
    pendingCount: number; lastSyncAt: string | null;
    lastError: string | null; online: boolean; syncing: boolean;
  }>({ pendingCount: 0, lastSyncAt: null, lastError: null, online: false, syncing: false });
  const [syncing, setSyncing] = useState(false);
  const [lastOrderId, setLastOrderId] = useState<string | null>(null);
  const [printerNames, setPrinterNames] = useState<string[]>([]);
  const [showPrinterSetup, setShowPrinterSetup] = useState(false);
  const [showMenuManagement, setShowMenuManagement] = useState(false);

  const refreshSyncStatus = async () => {
    try {
      const s = await window.api.sync.status();
      setSyncStatus(s);
    } catch {
      // status belum tersedia
    }
  };

  useEffect(() => { loadMenu(); }, [loadMenu]);
  useEffect(() => {
    refreshSyncStatus();
    const interval = setInterval(refreshSyncStatus, 30_000);
    return () => clearInterval(interval);
  }, []);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const result = await window.api.sync.run();
      if (result.success) {
        setPesan(`Sinkron selesai: ${result.pushed || 0} order terkirim`);
      } else {
        setPesan(result.error || 'Sinkron gagal');
      }
      const s = await window.api.sync.status();
      setSyncStatus(s);
      await loadMenu();
    } finally {
      setSyncing(false);
    }
  };

  const loadPrinters = async () => {
    const result = await window.api.printer.list();
    if (result.success) setPrinterNames(result.printers);
  };

  const handleTestPrint = async () => {
    const result = await window.api.printer.test();
    setPesan(result.success ? 'Test print dikirim' : result.error || 'Test print gagal');
  };

  const handleCetakUlang = async () => {
    if (!lastOrderId) {
      setPesan('Belum ada order untuk cetak ulang');
      return;
    }
    const result = await window.api.printer.printOrder(lastOrderId);
    setPesan(result.success ? 'Struk dicetak ulang' : result.error || 'Cetak ulang gagal');
  };

  const kategoris = ['Semua', ...new Set(menuItems.map(m => m.kategori))];
  const filtered = selectedKategori === 'Semua'
    ? menuItems
    : menuItems.filter(m => m.kategori === selectedKategori);

  const handleBayar = async () => {
    const total = totalHarga();
    let nominal: number;
    if (metodeBayar === 'TUNAI') {
      nominal = parseInt(jumlahBayar.replace(/\D/g, ''), 10);
      if (isNaN(nominal) || nominal <= 0) {
        setPesan('Masukkan nominal bayar');
        return;
      }
    } else {
      if (!jumlahBayar.trim()) {
        setPesan('Masukkan reference ID');
        return;
      }
      nominal = total;
    }
    const result = await pay(metodeBayar, nominal);
    if (result.success) {
      setPesan(`Pembayaran berhasil! Kembalian: ${formatRupiah(result.kembalian || 0)}`);
      if (result.order_id) setLastOrderId(result.order_id);
      setShowBayar(false);
      setJumlahBayar('');
    } else {
      setPesan(result.error || 'Gagal');
    }
  };

  return (
    <div className="flex h-full bg-gray-100">
      {/* Panel kiri: Menu */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Filter kategori */}
        <div className="flex gap-2 p-4 pb-2 overflow-x-auto">
          {kategoris.map(k => (
            <button
              key={k}
              onClick={() => setSelectedKategori(k)}
              className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition ${
                selectedKategori === k
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-200'
              }`}
            >
              {k}
            </button>
          ))}
        </div>

        {/* Grid menu */}
        <div className="flex-1 overflow-y-auto p-4 pt-2">
          <div className="grid grid-cols-3 gap-3">
            {filtered.map((item) => (
              <button
                key={item.id}
                onClick={() => addItem({ menuItemId: item.id, nama: item.nama, harga: item.harga, qty: 1 })}
                className="bg-white rounded-xl p-4 shadow hover:shadow-md active:scale-95 transition text-left"
              >
                <div className="text-xs text-gray-400">{item.kategori}</div>
                <div className="font-semibold text-gray-800 text-sm">{item.nama}</div>
                <div className="text-blue-600 font-bold mt-1">{formatRupiah(item.harga)}</div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Panel kanan: Keranjang */}
      <div className="w-80 bg-white shadow-lg flex flex-col">
        <div className="p-4 border-b">
          <h2 className="text-lg font-bold text-gray-800">Keranjang</h2>
          <div className="flex items-center gap-2 mt-2 text-xs">
            <button
              onClick={handleSync}
              disabled={syncing}
              className={`px-3 py-1.5 rounded-lg font-semibold transition ${
                syncing
                  ? 'bg-gray-200 text-gray-500'
                  : syncStatus.pendingCount > 0
                    ? 'bg-amber-500 text-white hover:bg-amber-600'
                    : 'bg-green-600 text-white hover:bg-green-700'
              }`}
            >
              {syncing ? 'Menyinkron...' : 'Sinkronkan'}
            </button>
            <span className="text-gray-500">
              {syncStatus.pendingCount > 0
                ? `${syncStatus.pendingCount} tertunda`
                : syncStatus.lastSyncAt
                  ? `Sinkron ${formatWaktu(syncStatus.lastSyncAt)}`
                  : 'Belum sinkron'}
            </span>
            {syncStatus.pendingCount > 0 && !syncStatus.online && (
              <span className="text-red-500">⚠ offline</span>
            )}
          </div>

          {/* Printer actions */}
          <div className="flex items-center gap-2 mt-2 text-xs">
            <button
              onClick={() => setShowMenuManagement(true)}
              className="px-3 py-1.5 rounded-lg font-semibold bg-indigo-600 text-white hover:bg-indigo-700"
            >
              Kelola Menu
            </button>
            <button
              onClick={handleTestPrint}
              className="px-3 py-1.5 rounded-lg font-semibold bg-gray-100 text-gray-700 hover:bg-gray-200"
            >
              Test Print
            </button>
            <button
              onClick={handleCetakUlang}
              disabled={!lastOrderId}
              className="px-3 py-1.5 rounded-lg font-semibold bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:bg-gray-50 disabled:text-gray-300"
            >
              Cetak Ulang
            </button>
            <button
              onClick={() => { loadPrinters(); setShowPrinterSetup(true); }}
              className="px-3 py-1.5 rounded-lg font-semibold bg-gray-100 text-gray-700 hover:bg-gray-200"
            >
              Printer
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {cart.length === 0 && (
            <p className="text-gray-400 text-center py-8">Belum ada item</p>
          )}
          {cart.map((item) => (
            <div key={item.menuItemId} className="bg-gray-50 rounded-lg p-3">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="font-semibold text-sm">{item.nama}</div>
                  <div className="text-xs text-gray-500">{formatRupiah(item.harga)}</div>
                </div>
                <button
                  onClick={() => removeItem(item.menuItemId)}
                  className="text-red-400 hover:text-red-600 text-xs ml-2"
                >
                  Hapus
                </button>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <button
                  onClick={() => updateQty(item.menuItemId, item.qty - 1)}
                  className="w-8 h-8 rounded bg-gray-200 flex items-center justify-center font-bold"
                >
                  -
                </button>
                <span className="w-8 text-center text-sm font-semibold">{item.qty}</span>
                <button
                  onClick={() => updateQty(item.menuItemId, item.qty + 1)}
                  className="w-8 h-8 rounded bg-gray-200 flex items-center justify-center font-bold"
                >
                  +
                </button>
                <span className="ml-auto font-bold text-sm">
                  {formatRupiah(item.harga * item.qty)}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Pesan error/sukses */}
        {pesan && (
          <div className="px-4 py-2 text-sm text-center bg-blue-50 text-blue-700">{pesan}</div>
        )}

        {/* Footer */}
        <div className="p-4 border-t space-y-3">
          <div className="flex justify-between text-lg font-bold">
            <span>Total</span>
            <span>{formatRupiah(totalHarga())}</span>
          </div>
          <button
            disabled={cart.length === 0}
            onClick={() => { setShowBayar(true); setPesan(''); }}
            className="w-full py-3 rounded-lg bg-blue-600 text-white font-bold text-lg disabled:bg-gray-300 active:scale-95 transition"
          >
            Bayar
          </button>
          <button
            disabled={cart.length === 0}
            onClick={clearCart}
            className="w-full py-2 rounded-lg bg-red-100 text-red-600 font-semibold text-sm disabled:bg-gray-100 disabled:text-gray-300"
          >
            Kosongkan
          </button>
        </div>
      </div>

      {/* Modal Bayar */}
      {showBayar && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-96 space-y-4">
            <h3 className="text-xl font-bold text-center">Pembayaran</h3>
            <div className="text-center text-2xl font-bold text-blue-600">
              {formatRupiah(totalHarga())}
            </div>

            <div className="flex gap-2">
              {(['TUNAI', 'DEBIT', 'QRIS'] as const).map(m => (
                <button
                  key={m}
                  onClick={() => setMetodeBayar(m)}
                  className={`flex-1 py-2 rounded-lg font-semibold text-sm transition ${
                    metodeBayar === m
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>

            {metodeBayar === 'TUNAI' && (
              <input
                type="number"
                placeholder="Jumlah bayar"
                value={jumlahBayar}
                onChange={(e) => setJumlahBayar(e.target.value)}
                className="w-full px-4 py-3 border rounded-lg text-lg font-semibold"
                autoFocus
              />
            )}

            {metodeBayar !== 'TUNAI' && (
              <input
                type="text"
                placeholder="Reference ID"
                value={jumlahBayar}
                onChange={(e) => setJumlahBayar(e.target.value)}
                className="w-full px-4 py-3 border rounded-lg text-lg"
              />
            )}

            <div className="flex gap-2">
              <button
                onClick={() => { setShowBayar(false); setJumlahBayar(''); }}
                className="flex-1 py-3 rounded-lg bg-gray-200 font-semibold"
              >
                Batal
              </button>
              <button
                onClick={handleBayar}
                className="flex-1 py-3 rounded-lg bg-green-600 text-white font-bold"
              >
                Konfirmasi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Setup Printer */}
      {showPrinterSetup && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-96 space-y-3">
            <h3 className="text-xl font-bold text-center">Setup Printer</h3>
            <p className="text-sm text-gray-500 text-center">
              Pilih printer di "Devices and Printers", lalu di tab Sharing centang
              "Share this printer". Masukkan nama share di bawah.
            </p>

            {printerNames.length > 0 && (
              <div>
                <div className="text-xs text-gray-500 font-semibold mb-1">Printer terdeteksi:</div>
                <select
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                  defaultValue=""
                  onChange={(e) => {
                    if (e.target.value) {
                      window.api.printer.set(e.target.value);
                      setPesan(`Printer "${e.target.value}" dipilih`);
                    }
                  }}
                >
                  <option value="">-- Pilih --</option>
                  {printerNames.map((name) => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
              </div>
            )}

            <input
              type="text"
              placeholder="Nama share printer (mis. POS80)"
              defaultValue=""
              onChange={(e) => {
                const share = e.target.value.trim();
                if (share) window.api.printer.setShare(share);
              }}
              className="w-full px-3 py-2 border rounded-lg text-sm"
            />

            <div className="flex gap-2">
              <button
                onClick={handleTestPrint}
                className="flex-1 py-2 rounded-lg bg-blue-600 text-white font-semibold text-sm"
              >
                Test Print
              </button>
              <button
                onClick={() => setShowPrinterSetup(false)}
                className="flex-1 py-2 rounded-lg bg-gray-200 font-semibold text-sm"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Panel Kelola Menu */}
      {showMenuManagement && (
        <MenuManagement
          onClose={() => {
            setShowMenuManagement(false);
            loadMenu();
          }}
        />
      )}
    </div>
  );
}