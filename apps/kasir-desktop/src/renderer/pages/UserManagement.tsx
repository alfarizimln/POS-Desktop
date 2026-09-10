import { useCallback, useEffect, useState } from 'react';
import { Modal, Btn, Alert, Badge, Field } from '../components/ui';

interface UserRow {
  id: string;
  nama: string;
  role: string;
}

export function UserManagement({ onClose }: { onClose: () => void }) {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [nama, setNama] = useState('');
  const [pin, setPin] = useState('');
  const [pesan, setPesan] = useState<{ ok: boolean; teks: string } | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [editPin, setEditPin] = useState('');

  const load = useCallback(async () => {
    const result = await window.api.user.list();
    if (result.success) setUsers(result.users);
  }, []);

  useEffect(() => { load(); }, [load]);

  const tampil = (ok: boolean, teks: string) => {
    setPesan({ ok, teks });
    setTimeout(() => setPesan(null), 3000);
  };

  const handleTambah = async () => {
    if (!nama.trim()) return tampil(false, 'Nama wajib diisi');
    if (!/^\d{4,6}$/.test(pin)) return tampil(false, 'PIN harus 4-6 digit angka');
    const result = await window.api.user.create(nama, pin);
    if (result.success) {
      setNama(''); setPin('');
      tampil(true, 'Kasir ditambahkan');
      load();
    } else {
      tampil(false, result.error || 'Gagal menambah kasir');
    }
  };

  const handleGantiNama = async (id: string) => {
    const u = users.find((x) => x.id === id);
    const baru = window.prompt('Nama baru', u ? u.nama : '');
    if (baru === null || !baru.trim()) return;
    const result = await window.api.user.rename(id, baru.trim());
    if (result.success) tampil(true, 'Nama diperbarui');
    else tampil(false, result.error || 'Gagal memperbarui nama');
    load();
  };

  const handleGantiPin = async (id: string) => {
    setEditId(id);
    setEditPin('');
  };

  const simpanPin = async () => {
    if (!editId) return;
    if (!/^\d{4,6}$/.test(editPin)) return tampil(false, 'PIN harus 4-6 digit angka');
    const result = await window.api.user.updatePin(editId, editPin);
    if (result.success) tampil(true, 'PIN diperbarui');
    else tampil(false, result.error || 'Gagal memperbarui PIN');
    setEditId(null);
    setEditPin('');
  };

  const handleHapus = async (u: UserRow) => {
    if (!window.confirm(`Yakin hapus kasir "${u.nama}"?`)) return;
    const result = await window.api.user.delete(u.id);
    if (result.success) {
      tampil(true, 'Kasir dihapus');
      load();
    } else {
      tampil(false, result.error || 'Gagal menghapus kasir');
    }
  };

  return (
    <Modal title="Kelola Kasir" onClose={onClose} size="lg">
      {pesan && <Alert tone={pesan.ok ? 'ok' : 'err'} className="mb-4">{pesan.teks}</Alert>}

      <div className="card p-4 mb-4">
        <div className="font-bold text-sm text-gray-700 mb-3">Tambah Kasir Baru</div>
        <div className="flex gap-2">
          <Field label="">
            <input
              placeholder="Nama kasir"
              value={nama}
              onChange={(e) => setNama(e.target.value)}
              className="input !w-64"
            />
          </Field>
          <Field label="">
            <input
              placeholder="PIN 4-6 digit"
              inputMode="numeric"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
              onKeyDown={(e) => { if (e.key === 'Enter') handleTambah(); }}
              className="input !w-36"
            />
          </Field>
          <Btn variant="primary" className="self-end px-4 py-2" onClick={handleTambah}>Tambah</Btn>
        </div>
      </div>

      <div className="space-y-2 max-h-72 overflow-y-auto">
        {users.map((u, idx) => (
          <div key={u.id} className="card flex items-center justify-between px-4 py-3">
            <div className="min-w-0">
              <div className="font-semibold text-sm flex items-center gap-2">
                {idx === 0 ? '👑' : ''}{u.nama}
                <Badge tone={idx === 0 ? 'blue' : 'gray'}>{u.role}</Badge>
              </div>
              <div className="text-xs text-gray-400">{u.id.slice(0, 8)}</div>
              {editId === u.id && (
                <div className="flex items-center gap-2 mt-2">
                  <input
                    placeholder="PIN baru 4-6 digit"
                    inputMode="numeric"
                    value={editPin}
                    autoFocus
                    onChange={(e) => setEditPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    onKeyDown={(e) => { if (e.key === 'Enter') simpanPin(); }}
                    className="input !w-40"
                  />
                  <Btn variant="success" className="px-3 py-2 text-sm" onClick={simpanPin}>Simpan</Btn>
                  <Btn variant="secondary" className="px-3 py-2 text-sm" onClick={() => setEditId(null)}>Batal</Btn>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Btn variant="secondary" className="px-3 py-1.5 text-sm" onClick={() => handleGantiNama(u.id)}>
                Ganti Nama
              </Btn>
              <Btn variant="secondary" className="px-3 py-1.5 text-sm" onClick={() => handleGantiPin(u.id)}>
                Ganti PIN
              </Btn>
              <Btn variant="danger" className="px-3 py-1.5 text-sm" onClick={() => handleHapus(u)}>
                Hapus
              </Btn>
            </div>
          </div>
        ))}
      </div>

      <p className="text-xs text-gray-400 mt-4 leading-relaxed">
        User pertama adalah Admin (PIN default: <b>1234</b>). Harus selalu ada minimal satu user,
        dan user yang sedang login tidak bisa dihapus.
      </p>
    </Modal>
  );
}