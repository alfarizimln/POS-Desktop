import { useEffect, useState } from 'react';
import { useOrderStore } from '../store/orderStore';
import { MenuManagement } from './MenuManagement';
import { TransactionHistory } from './TransactionHistory';
import { DailyReport } from './DailyReport';
import { UserManagement } from './UserManagement';
import { Settings } from './Settings';
import { Modal, Btn, Alert, Badge, EmptyState, Field } from '../components/ui';

function formatRupiah(n: number) {
  return 'Rp ' + n.toLocaleString('id-ID');
}

function formatWaktu(iso: string | null) {
  if (!iso) return '-';
  const d = new Date(iso);
  return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
}

interface SyncStatus {
  pendingCount: number;
  lastSyncAt: string | null;
  lastError: string | null;
  online: boolean;
  syncing: boolean;
}

const QUICK_CASH = [5000, 10000, 20000, 50000, 100000];

export function KasirPage({ onLogout }: { onLogout: () => void }) {
  const { menuItems, cart, loadMenu, addItem, updateQty, removeItem, clearCart, totalHarga, pay } = useOrderStore();

  const [selectedKategori, setSelectedKategori] = useState<string>('Semua');
  const [showBayar, setShowBayar] = useState(false);
  const [metodeBayar, setMetodeBayar] = useState<'TUNAI' | 'DEBIT' | 'QRIS'>('TUNAI');
  const [jumlahBayar, setJumlahBayar] = useState('');
  const [bayarError, setBayarError] = useState('');
  const [pesan, setPesan] = useState('');
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    pendingCount: 0, lastSyncAt: null, lastError: null, online: false, syncing: false,
  });
  const [syncing, setSyncing] = useState(false);
  const [lastOrderId, setLastOrderId] = useState<string | null>(null);
  const [printerNames, setPrinterNames] = useState<string[]>([]);
  const [showPrinterSetup, setShowPrinterSetup] = useState(false);
  const [showMenuManagement, setShowMenuManagement] = useState(false);
  const [orderType, setOrderType] = useState<'DINE_IN' | 'TAKE_AWAY'>('TAKE_AWAY');
  const [tables, setTables] = useState<Array<{ id: string; nomor_meja: string; kapasitas: number | null }>>([]);
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [showTablePicker, setShowTablePicker] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [showUsers, setShowUsers] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [namaUsaha, setNamaUsaha] = useState('POS Rumah Makan');
  const [alamatUsaha, setAlamatUsaha] = useState('');
  const [kasirNama, setKasirNama] = useState('');
  const [modeLokal, setModeLokal] = useState(false);

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

  useEffect(() => {
    if (!pesan) return;
    const t = setTimeout(() => setPesan(''), 4000);
    return () => clearTimeout(t);
  }, [pesan]);

  useEffect(() => {
    (async () => {
      const [info, session] = await Promise.all([
        window.api.app.getInfo(),
        window.api.auth.current(),
      ]);
      if (info.success) {
        setNamaUsaha(info.info.nama_usaha);
        setAlamatUsaha(info.info.alamat_usaha);
      }
      if (session.success && session.user) setKasirNama(session.user.nama);
      const ms = await window.api.config.get('mode_lokal');
      setModeLokal(ms === '1');
    })();
  }, [showSettings]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const result = await window.api.sync.run();
      setPesan(result.success ? `Sinkron selesai: ${result.pushed || 0} order terkirim` : result.error || 'Sinkron gagal');
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

  const total = totalHarga();
  const nominalBayar = metodeBayar === 'TUNAI' ? parseInt(jumlahBayar.replace(/\D/g, ''), 10) || 0 : total;
  const kembalian = nominalBayar > 0 ? nominalBayar - total : 0;

  const openBayar = () => {
    setJumlahBayar('');
    setBayarError('');
    setShowBayar(true);
  };

  const handleBayar = async () => {
    if (metodeBayar === 'TUNAI' && (nominalBayar <= 0 || isNaN(nominalBayar))) {
      setBayarError('Masukkan nominal bayar');
      return;
    }
    if (metodeBayar !== 'TUNAI' && !jumlahBayar.trim()) {
      setBayarError('Masukkan reference ID');
      return;
    }
    if (orderType === 'DINE_IN' && !selectedTableId) {
      setBayarError('Pilih meja terlebih dahulu');
      return;
    }
    setBayarError('');
    const result = await pay(metodeBayar, nominalBayar, orderType, selectedTableId);
    if (result.success) {
      setPesan(`Pembayaran berhasil! Kembalian: ${formatRupiah(result.kembalian || 0)}`);
      if (result.order_id) setLastOrderId(result.order_id);
      setShowBayar(false);
      setJumlahBayar('');
      setOrderType('TAKE_AWAY');
      setSelectedTableId(null);
    } else {
      setBayarError(result.error || 'Gagal melakukan pembayaran');
    }
  };

  return (
    <div className="flex h-full flex-col bg-gray-100">
      {/* Header utama */}
      <header className="bg-white border-b border-gray-200 shadow-soft shrink-0">
        <div className="flex items-center justify-between px-5 h-14">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center text-xl shrink-0">
              🍜
            </div>
            <div className="min-w-0">
              <h1 className="font-bold text-gray-800 truncate leading-tight">{namaUsaha}</h1>
              {alamatUsaha && <p className="text-xs text-gray-500 truncate leading-tight">{alamatUsaha}</p>}
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:block text-right">
              <div className="text-xs text-gray-500">Kasir</div>
              <div className="text-sm font-semibold text-gray-800">{kasirNama || '-'}</div>
            </div>

            <div className="flex items-center gap-2">
              {modeLokal ? (
                <Badge tone="gray">Mode Lokal</Badge>
              ) : (
                <>
                  <Badge
                    tone={syncStatus.pendingCount > 0 ? 'amber' : 'green'}
                  >
                    {syncing
                      ? 'Menyinkron...'
                      : syncStatus.pendingCount > 0
                        ? `${syncStatus.pendingCount} order tertunda`
                        : syncStatus.lastSyncAt
                          ? `Sinkron ${formatWaktu(syncStatus.lastSyncAt)}`
                          : 'Belum sinkron'}
                  </Badge>
                  {syncStatus.pendingCount > 0 && !syncStatus.online && (
                    <Badge tone="red">Offline</Badge>
                  )}
                </>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Btn variant="secondary" onClick={() => setShowSettings(true)} className="px-3 py-1.5 text-sm">
                Setelan
              </Btn>
              <Btn
                variant="danger"
                className="px-3 py-1.5 text-sm"
                onClick={async () => {
                  await window.api.auth.logout();
                  onLogout();
                }}
              >
                Keluar
              </Btn>
            </div>
          </div>
        </div>

        {/* Toolbar aksi */}
        <div className="flex items-center gap-2 px-5 pb-3 flex-wrap">
          <Btn variant="primary" className="px-3 py-1.5 text-sm" onClick={() => setShowMenuManagement(true)}>
            Kelola Menu
          </Btn>
          <Btn variant="secondary" className="px-3 py-1.5 text-sm" onClick={() => setShowHistory(true)}>
            Riwayat
          </Btn>
          <Btn variant="secondary" className="px-3 py-1.5 text-sm" onClick={() => setShowReport(true)}>
            Laporan
          </Btn>
          <Btn variant="secondary" className="px-3 py-1.5 text-sm" onClick={() => setShowUsers(true)}>
            Kasir
          </Btn>
          <span className="mx-1 w-px h-5 bg-gray-200" />
          <Btn variant="secondary" className="px-3 py-1.5 text-sm" onClick={() => { loadPrinters(); setShowPrinterSetup(true); }}>
            Printer
          </Btn>
          <Btn variant="secondary" className="px-3 py-1.5 text-sm" onClick={handleTestPrint}>
            Test Print
          </Btn>
          <Btn
            variant="secondary"
            className="px-3 py-1.5 text-sm"
            onClick={handleCetakUlang}
            disabled={!lastOrderId}
          >
            Cetak Ulang
          </Btn>
          {!modeLokal && (
            <Btn variant="secondary" className="px-3 py-1.5 text-sm text-amber-600 hover:bg-amber-50" onClick={handleSync} disabled={syncing}>
              {syncing ? 'Menyinkron...' : 'Sinkronkan'}
            </Btn>
          )}
        </div>
      </header>

      {/* Konten utama */}
      <div className="flex flex-1 overflow-hidden">
        {/* Panel kiri: Menu */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex gap-2 p-4 pb-2 overflow-x-auto shrink-0">
            {kategoris.map(k => (
              <button
                key={k}
                onClick={() => setSelectedKategori(k)}
                className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition ${
                  selectedKategori === k
                    ? 'bg-blue-600 text-white shadow-soft'
                    : 'bg-white text-gray-600 border border-gray-200 hover:border-gray-300'
                }`}
              >
                {k}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto px-4 pb-4">
            {filtered.length === 0 && <EmptyState text="Belum ada menu. Tambah lewat Kelola Menu." />}
            <div className="grid grid-cols-3 gap-3">
              {filtered.map((item) => (
                <button
                  key={item.id}
                  onClick={() => addItem({ menuItemId: item.id, nama: item.nama, harga: item.harga, qty: 1 })}
                  className="card p-4 text-left hover:shadow-md active:scale-[.98] transition"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <Badge tone="blue">{item.kategori}</Badge>
                      <div className="mt-2 font-semibold text-gray-800 truncate">{item.nama}</div>
                    </div>
                  </div>
                  <div className="mt-3 text-blue-600 font-bold">{formatRupiah(item.harga)}</div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Panel kanan: Keranjang */}
        <div className="w-96 bg-white border-l border-gray-200 flex flex-col shrink-0">
          <div className="px-4 pt-4 border-b border-gray-100">
            <div className="flex gap-1">
              {(['DINE_IN', 'TAKE_AWAY'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => {
                    setOrderType(t);
                    setSelectedTableId(null);
                  }}
                  className={`flex-1 py-2 rounded-lg text-sm font-semibold transition ${
                    orderType === t ? 'bg-blue-600 text-white shadow-soft' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {t === 'DINE_IN' ? 'Makan di Tempat' : 'Bawa Pulang'}
                </button>
              ))}
            </div>

            {orderType === 'DINE_IN' && (
              <button
                onClick={async () => {
                  const rows = await window.api.table.list();
                  setTables(rows);
                  setShowTablePicker(true);
                }}
                className="btn btn-secondary w-full mt-2 py-2 text-sm"
              >
                {selectedTableId
                  ? `Meja ${tables.find(t => t.id === selectedTableId)?.nomor_meja ?? ''} ✓`
                  : 'Pilih Meja'}
              </button>
            )}

            {pesan && <Alert tone="info" className="mt-3 mb-1">{pesan}</Alert>}
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
            {cart.length === 0 && <EmptyState text="Belum ada item di keranjang" />}
            {cart.map((item) => (
              <div key={item.menuItemId} className="card p-3">
                <div className="flex justify-between items-start gap-2">
                  <div className="min-w-0">
                    <div className="font-semibold text-sm text-gray-800 truncate">{item.nama}</div>
                    <div className="text-xs text-gray-500">{formatRupiah(item.harga)}</div>
                  </div>
                  <button
                    onClick={() => removeItem(item.menuItemId)}
                    className="text-red-400 hover:text-red-600 text-xs font-semibold shrink-0"
                  >
                    Hapus
                  </button>
                </div>
                <div className="flex items-center gap-2 mt-3">
                  <button
                    onClick={() => updateQty(item.menuItemId, item.qty - 1)}
                    className="w-8 h-8 rounded-lg bg-gray-100 text-gray-600 font-bold hover:bg-gray-200 transition"
                  >
                    −
                  </button>
                  <span className="w-8 text-center text-sm font-semibold">{item.qty}</span>
                  <button
                    onClick={() => updateQty(item.menuItemId, item.qty + 1)}
                    className="w-8 h-8 rounded-lg bg-gray-100 text-gray-600 font-bold hover:bg-gray-200 transition"
                  >
                    +
                  </button>
                  <span className="ml-auto font-bold text-sm text-gray-800">{formatRupiah(item.harga * item.qty)}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="px-4 py-4 border-t border-gray-200 space-y-3 shrink-0">
            <div className="flex justify-between items-baseline">
              <span className="text-gray-600 font-semibold">Total</span>
              <span className="text-2xl font-bold text-gray-900">{formatRupiah(total)}</span>
            </div>
            <div className="flex gap-2">
              <button
                disabled={cart.length === 0}
                onClick={clearCart}
                className="btn btn-danger px-4 py-3 text-sm"
              >
                Kosongkan
              </button>
              <button
                disabled={cart.length === 0}
                onClick={openBayar}
                className="btn btn-primary flex-1 py-3 text-lg"
              >
                Bayar
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modal Bayar */}
      {showBayar && (
        <Modal title="Pembayaran" onClose={() => setShowBayar(false)} size="sm">
          <div className="space-y-4">
            <div className="text-center">
              <div className="text-xs text-gray-500 font-semibold uppercase tracking-wide">Total Tagihan</div>
              <div className="text-3xl font-bold text-blue-600">{formatRupiah(total)}</div>
            </div>

            <div className="flex gap-1">
              {(['TUNAI', 'DEBIT', 'QRIS'] as const).map(m => (
                <button
                  key={m}
                  onClick={() => { setMetodeBayar(m); setBayarError(''); }}
                  className={`flex-1 py-2 rounded-lg font-semibold text-sm transition ${
                    metodeBayar === m ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>

            {metodeBayar === 'TUNAI' && (
              <>
                <Field label="Jumlah dibayar">
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="0"
                    value={jumlahBayar}
                    onChange={(e) => setJumlahBayar(e.target.value)}
                    className="input !py-3 text-lg font-semibold text-center"
                    autoFocus
                  />
                </Field>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setJumlahBayar(String(total))}
                    className="btn btn-secondary flex-1 px-2 py-2 text-sm"
                  >
                    Uang pas
                  </button>
                  {QUICK_CASH.map(q => (
                    <button
                      key={q}
                      onClick={() => setJumlahBayar(String(q))}
                      className="btn btn-secondary flex-1 px-2 py-2 text-sm"
                    >
                      {q / 1000}rb
                    </button>
                  ))}
                </div>
                <div className={`text-sm font-semibold text-right ${kembalian >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                  {kembalian >= 0 ? `Kembalian: ${formatRupiah(kembalian)}` : 'Jumlah bayar kurang'}
                </div>
              </>
            )}

            {metodeBayar !== 'TUNAI' && (
              <Field label="Reference ID">
                <input
                  type="text"
                  placeholder="ID transaksi dari aplikasi pembayaran"
                  value={jumlahBayar}
                  onChange={(e) => setJumlahBayar(e.target.value)}
                  className="input"
                  autoFocus
                />
              </Field>
            )}

            {bayarError && <Alert tone="err">{bayarError}</Alert>}

            <div className="flex gap-2 pt-1">
              <Btn
                variant="secondary"
                className="flex-1 py-3"
                onClick={() => { setShowBayar(false); setJumlahBayar(''); setBayarError(''); }}
              >
                Batal
              </Btn>
              <Btn variant="success" className="flex-1 py-3" onClick={handleBayar}>
                Konfirmasi
              </Btn>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal Setup Printer */}
      {showPrinterSetup && (
        <Modal title="Setup Printer" onClose={() => setShowPrinterSetup(false)} size="sm">
          <div className="space-y-3">
            <p className="text-sm text-gray-500 leading-relaxed">
              Pilih printer di <b>Devices and Printers</b>, lalu di tab <b>Sharing</b> centang
              "Share this printer". Masukkan nama share di bawah.
            </p>

            {printerNames.length > 0 && (
              <Field label="Printer terdeteksi">
                <select
                  className="input"
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
              </Field>
            )}

            <Field label="Nama share printer">
              <input
                type="text"
                placeholder="mis. POS80"
                defaultValue=""
                onChange={(e) => {
                  const share = e.target.value.trim();
                  if (share) window.api.printer.setShare(share);
                }}
                className="input"
              />
            </Field>

            <div className="flex gap-2 pt-1">
              <Btn variant="primary" className="flex-1 py-2.5" onClick={handleTestPrint}>
                Test Print
              </Btn>
              <Btn variant="secondary" className="flex-1 py-2.5" onClick={() => setShowPrinterSetup(false)}>
                Tutup
              </Btn>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal Pilih Meja */}
      {showTablePicker && (
        <Modal title="Pilih Meja" onClose={() => setShowTablePicker(false)} size="sm">
          <div className="grid grid-cols-3 gap-3">
            {tables.map((t) => (
              <button
                key={t.id}
                onClick={() => {
                  setSelectedTableId(t.id);
                  setShowTablePicker(false);
                }}
                className={`py-4 rounded-xl font-bold transition ${
                  selectedTableId === t.id
                    ? 'bg-blue-600 text-white shadow-soft'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {t.nomor_meja}
              </button>
            ))}
          </div>
        </Modal>
      )}

      {/* Panel-panel lainnya */}
      {showMenuManagement && (
        <MenuManagement onClose={() => { setShowMenuManagement(false); loadMenu(); }} />
      )}
      {showHistory && <TransactionHistory onClose={() => setShowHistory(false)} />}
      {showReport && <DailyReport onClose={() => setShowReport(false)} />}
      {showUsers && <UserManagement onClose={() => setShowUsers(false)} />}
      {showSettings && <Settings onClose={() => setShowSettings(false)} />}
    </div>
  );
}