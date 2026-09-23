import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { Modal, Btn, StatCard, EmptyState } from '../components/ui';

function formatRupiah(n: number) {
  return 'Rp ' + n.toLocaleString('id-ID');
}

interface DailyReportData {
  tanggal: string;
  summary: { jumlah_order: number; total_penjualan: number };
  byMetode: Array<{ metode: string; jumlah: number; nominal: number }>;
  byType: Array<{ tipe: string; jumlah: number; nominal: number }>;
  byKasir: Array<{ kasir: string; jumlah: number; nominal: number }>;
  saldo_awal: number;
  total_tunai: number;
}

function todayLocal(): string {
  const d = new Date();
  const offset = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - offset).toISOString().slice(0, 10);
}

function SectionTitle({ children }: { children: ReactNode }) {
  return <div className="font-semibold text-sm text-gray-700 mb-1.5">{children}</div>;
}

function BreakRow({ label, sub, nominal }: { label: string; sub: string; nominal: number }) {
  return (
    <div className="flex items-center justify-between py-2.5">
      <div>
        <div className="font-medium text-sm text-gray-800">{label}</div>
        <div className="text-xs text-gray-500">{sub}</div>
      </div>
      <div className="font-semibold text-sm text-gray-900 tabular-nums">{formatRupiah(nominal)}</div>
    </div>
  );
}

export function DailyReport({ onClose }: { onClose: () => void }) {
  const [tanggal, setTanggal] = useState(todayLocal());
  const [data, setData] = useState<DailyReportData | null>(null);
  const [saldo, setSaldo] = useState('');
  const [pesan, setPesan] = useState('');
  const [mencetak, setMencetak] = useState(false);
  const [mengekspor, setMengekspor] = useState(false);

  const load = useCallback(async () => {
    const result = await window.api.report.daily(tanggal);
    if (result.success) {
      setData(result);
      setSaldo(String(result.saldo_awal || ''));
      setPesan('');
    } else {
      setPesan(result.error || 'Gagal memuat laporan');
    }
  }, [tanggal]);

  useEffect(() => { load(); }, [load]);

  const handleSimpanSaldo = async () => {
    const nilai = String(Number(saldo) || 0);
    await window.api.config.set(`kas_awal:${tanggal}`, nilai);
    setPesan('Saldo awal tersimpan');
    load();
  };

  const saldoAkhir = (Number(saldo) || 0) + (data?.total_tunai || 0);

  const handleCetak = async () => {
    setMencetak(true);
    setPesan('');
    try {
      const result = await window.api.printer.printDailyReport(tanggal);
      setPesan(result.success ? 'Laporan dikirim ke printer' : result.error || 'Cetak gagal');
    } finally {
      setMencetak(false);
    }
  };

  const handleEkspor = async () => {
    setMengekspor(true);
    setPesan('');
    try {
      const result = await window.api.report.exportDaily(tanggal);
      if (result.success) setPesan(`File Excel tersimpan: ${result.path}`);
      else if (result.cancelled) setPesan('');
      else setPesan(result.error || 'Ekspor gagal');
    } finally {
      setMengekspor(false);
    }
  };

  const metodeLabel = (m: string) => {
    if (m === 'TUNAI') return 'Tunai';
    if (m === 'DEBIT') return 'Debit';
    if (m === 'QRIS') return 'QRIS';
    return m;
  };

  const tipeLabel = (t: string) => (t === 'DINE_IN' ? 'Makan di Tempat' : 'Bawa Pulang');

  return (
    <Modal title="Laporan Harian" onClose={onClose} size="lg">
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <input
          type="date"
          value={tanggal}
          onChange={(e) => setTanggal(e.target.value)}
          className="input !w-auto"
        />
        <Btn variant="secondary" onClick={load}>Muat</Btn>
        <Btn variant="primary" onClick={handleCetak} disabled={mencetak}>
          {mencetak ? 'Mencetak…' : 'Cetak'}
        </Btn>
        <Btn variant="secondary" onClick={handleEkspor} disabled={mengekspor}>
          {mengekspor ? 'Menyimpan…' : 'Ekspor Excel'}
        </Btn>
        <div className="flex items-center gap-2 ml-auto">
          <input
            type="number"
            min={0}
            value={saldo}
            onChange={(e) => setSaldo(e.target.value)}
            placeholder="Saldo awal (Rp)"
            className="input !w-40"
          />
          <Btn variant="secondary" onClick={handleSimpanSaldo}>Simpan Saldo</Btn>
        </div>
      </div>

      {pesan && <div className={`text-sm mb-3 ${pesan.startsWith('Saldo') || pesan.startsWith('File') ? 'text-green-700' : 'text-red-600'}`}>{pesan}</div>}

      {data && (
        <div className="space-y-5">
          <div className="grid grid-cols-3 gap-3">
            <StatCard label="Saldo Awal" value={formatRupiah(Number(saldo) || 0)} />
            <StatCard label="Total Penjualan" value={formatRupiah(data.summary.total_penjualan)} />
            <StatCard label="Saldo Akhir (Tunai)" value={formatRupiah(saldoAkhir)} />
          </div>
          <div className="text-xs text-gray-500">Jumlah transaksi: {data.summary.jumlah_order}</div>

          <div>
            <SectionTitle>Per Metode Pembayaran</SectionTitle>
            {data.byMetode.length === 0 ? (
              <EmptyState text="Belum ada transaksi pada tanggal ini" />
            ) : (
              <div className="divide-y divide-gray-100">
                {data.byMetode.map((m) => (
                  <BreakRow key={m.metode} label={metodeLabel(m.metode)} sub={`${m.jumlah} transaksi`} nominal={m.nominal} />
                ))}
              </div>
            )}
          </div>

          <div>
            <SectionTitle>Per Jenis Order</SectionTitle>
            <div className="divide-y divide-gray-100">
              {data.byType.map((t) => (
                <BreakRow key={t.tipe} label={tipeLabel(t.tipe)} sub={`${t.jumlah} transaksi`} nominal={t.nominal} />
              ))}
            </div>
          </div>

          {"byKasir" in data && (
            <div>
              <SectionTitle>Per Kasir</SectionTitle>
              <div className="divide-y divide-gray-100">
                {data.byKasir.map((k) => (
                  <BreakRow key={k.kasir} label={k.kasir} sub={`${k.jumlah} transaksi`} nominal={k.nominal} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}