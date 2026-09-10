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
}

function todayLocal(): string {
  const d = new Date();
  const offset = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - offset).toISOString().slice(0, 10);
}

function SectionTitle({ children }: { children: ReactNode }) {
  return <div className="font-bold text-sm text-gray-700 mb-2">{children}</div>;
}

function BreakRow({ label, sub, nominal }: { label: string; sub: string; nominal: number }) {
  return (
    <div className="card flex items-center justify-between px-4 py-3">
      <div>
        <div className="font-semibold text-sm text-gray-800">{label}</div>
        <div className="text-xs text-gray-500">{sub}</div>
      </div>
      <div className="font-bold text-sm text-gray-800">{formatRupiah(nominal)}</div>
    </div>
  );
}

export function DailyReport({ onClose }: { onClose: () => void }) {
  const [tanggal, setTanggal] = useState(todayLocal());
  const [data, setData] = useState<DailyReportData | null>(null);
  const [pesan, setPesan] = useState('');

  const load = useCallback(async () => {
    const result = await window.api.report.daily(tanggal);
    if (result.success) {
      setData(result);
      setPesan('');
    } else {
      setPesan(result.error || 'Gagal memuat laporan');
    }
  }, [tanggal]);

  useEffect(() => { load(); }, [load]);

  const metodeLabel = (m: string) => {
    if (m === 'TUNAI') return 'Tunai';
    if (m === 'DEBIT') return 'Debit';
    if (m === 'QRIS') return 'QRIS';
    return m;
  };

  const tipeLabel = (t: string) => (t === 'DINE_IN' ? 'Makan di Tempat' : 'Bawa Pulang');

  return (
    <Modal title="Laporan Harian" onClose={onClose} size="lg">
      <div className="flex items-center gap-3 mb-4">
        <input
          type="date"
          value={tanggal}
          onChange={(e) => setTanggal(e.target.value)}
          className="input !w-auto"
        />
        <Btn variant="primary" className="px-4 py-2" onClick={load}>Muat</Btn>
        {pesan && <span className="text-red-500 text-sm">{pesan}</span>}
      </div>

      {data && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-3">
            <StatCard label="Total Penjualan" value={formatRupiah(data.summary.total_penjualan)} tone="blue" />
            <StatCard label="Jumlah Transaksi" value={String(data.summary.jumlah_order)} tone="green" />
          </div>

          <div>
            <SectionTitle>Per Metode Pembayaran</SectionTitle>
            {data.byMetode.length === 0 ? (
              <EmptyState text="Belum ada transaksi pada tanggal ini" />
            ) : (
              <div className="space-y-2">
                {data.byMetode.map((m) => (
                  <BreakRow key={m.metode} label={metodeLabel(m.metode)} sub={`${m.jumlah} transaksi`} nominal={m.nominal} />
                ))}
              </div>
            )}
          </div>

          <div>
            <SectionTitle>Per Jenis Order</SectionTitle>
            <div className="space-y-2">
              {data.byType.map((t) => (
                <BreakRow key={t.tipe} label={tipeLabel(t.tipe)} sub={`${t.jumlah} transaksi`} nominal={t.nominal} />
              ))}
            </div>
          </div>

          {"byKasir" in data && (
            <div>
              <SectionTitle>Per Kasir</SectionTitle>
              <div className="space-y-2">
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