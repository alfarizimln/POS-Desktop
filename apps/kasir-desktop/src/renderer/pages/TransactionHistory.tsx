import { useCallback, useEffect, useState } from 'react';
import { Modal, Btn, Badge, EmptyState, Alert } from '../components/ui';

function formatRupiah(n: number | null) {
  if (n === null) return '-';
  return 'Rp ' + n.toLocaleString('id-ID');
}

function formatWaktu(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' }) + ' ' +
    d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
}

interface HistoryRow {
  id: string;
  order_type: string;
  nomor_meja: string | null;
  waktu_buka: string;
  total: number | null;
  metode: string | null;
  sync_status: string;
  kasir_nama?: string | null;
}

interface Detail {
  order_type: string;
  nomor_meja: string | null;
  waktu_buka: string;
  metode: string | null;
  jumlah_bayar: number | null;
  kembalian: number | null;
  items: Array<{ nama: string; qty: number; catatan: string | null; harga: number }>;
}

export function TransactionHistory({ onClose }: { onClose: () => void }) {
  const [rows, setRows] = useState<HistoryRow[]>([]);
  const [pesan, setPesan] = useState('');
  const [detail, setDetail] = useState<Detail | null>(null);
  const [showDetail, setShowDetail] = useState(false);

  const load = useCallback(async () => {
    const result = await window.api.order.history({ limit: 100 });
    if (result.success) setRows(result.orders);
  }, []);

  useEffect(() => { load(); }, [load]);

  const openDetail = async (id: string) => {
    const result = await window.api.order.detail(id);
    if (result.success && result.order) {
      setDetail({
        order_type: result.order.order_type,
        nomor_meja: result.order.nomor_meja,
        waktu_buka: result.order.waktu_buka,
        metode: result.order.metode,
        jumlah_bayar: result.order.jumlah_bayar,
        kembalian: result.order.kembalian,
        items: result.order.items,
      });
      setShowDetail(true);
    } else {
      setPesan(result.error || 'Gagal memuat detail');
    }
  };

  const reprint = async (id: string) => {
    const result = await window.api.printer.printOrder(id);
    setPesan(result.success ? 'Struk dicetak ulang' : result.error || 'Cetak gagal');
  };

  const jenisLabel = (t: string) => (t === 'DINE_IN' ? 'Makan di Tempat' : 'Bawa Pulang');

  return (
    <>
      <Modal title="Riwayat Transaksi" onClose={onClose} size="xl">
        {pesan && <Alert tone="info" className="mb-3">{pesan}</Alert>}

        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <div className="overflow-y-auto max-h-[60vh]">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 sticky top-0">
                <tr className="border-b border-gray-200">
                  <th className="th">Waktu</th>
                  <th className="th">Tipe</th>
                  <th className="th">Meja</th>
                  <th className="th">Metode</th>
                  <th className="th">Kasir</th>
                  <th className="th text-right">Total</th>
                  <th className="th">Sync</th>
                  <th className="th text-right">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 && (
                  <tr><td colSpan={8}><EmptyState text="Belum ada transaksi" /></td></tr>
                )}
                {rows.map((r) => (
                  <tr key={r.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="td">{formatWaktu(r.waktu_buka)}</td>
                    <td className="td">{jenisLabel(r.order_type)}</td>
                    <td className="td">{r.nomor_meja || '-'}</td>
                    <td className="td">{r.metode || '-'}</td>
                    <td className="td">{r.kasir_nama || '-'}</td>
                    <td className="td text-right font-semibold tabular-nums">{formatRupiah(r.total)}</td>
                    <td className="td">
                      <Badge tone={r.sync_status === 'SYNCED' ? 'green' : 'amber'}>
                        {r.sync_status === 'SYNCED' ? 'Tersinkron' : 'Antre'}
                      </Badge>
                    </td>
                    <td className="td text-right">
                      <div className="flex gap-1.5 justify-end">
                        <Btn variant="secondary" size="sm" onClick={() => openDetail(r.id)}>
                          Detail
                        </Btn>
                        <Btn variant="primary" size="sm" onClick={() => reprint(r.id)}>
                          Cetak
                        </Btn>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Modal>

      {showDetail && detail && (
        <Modal title="Detail Transaksi" onClose={() => setShowDetail(false)} size="sm">
          <div className="text-sm text-gray-600 mb-3">
            <div className="flex items-center gap-2">
              <Badge tone="teal">{jenisLabel(detail.order_type)}</Badge>
              <span>{formatWaktu(detail.waktu_buka)}</span>
            </div>
            <div className="mt-1 text-xs text-gray-500">Meja: {detail.nomor_meja || '-'} · Metode: {detail.metode || '-'}</div>
          </div>

          <div className="border-y border-gray-200 py-2 space-y-1.5">
            {detail.items.map((item, i) => (
              <div key={i} className="flex justify-between text-sm">
                <span className="text-gray-700">{item.nama} <span className="text-gray-400">×{item.qty}</span></span>
                <span className="font-semibold tabular-nums">{formatRupiah(item.harga * item.qty)}</span>
              </div>
            ))}
          </div>

          <div className="mt-3 space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Dibayar</span>
              <span className="font-semibold tabular-nums">{formatRupiah(detail.jumlah_bayar)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Kembalian</span>
              <span className="font-semibold text-green-700 tabular-nums">{formatRupiah(detail.kembalian)}</span>
            </div>
          </div>

          <Btn variant="secondary" className="w-full mt-4" onClick={() => setShowDetail(false)}>
            Tutup
          </Btn>
        </Modal>
      )}
    </>
  );
}