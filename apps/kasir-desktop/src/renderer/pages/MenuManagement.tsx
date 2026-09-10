import { useCallback, useEffect, useState } from 'react';
import { Modal, Btn, Alert, Badge, EmptyState, Field } from '../components/ui';

interface MenuItemRow {
  id: string;
  nama: string;
  kategori_id: string | null;
  harga: number;
  sku: string | null;
}

interface CategoryRow {
  id: string;
  nama_kategori: string;
}

function formatRupiah(n: number) {
  return 'Rp ' + n.toLocaleString('id-ID');
}

export function MenuManagement({ onClose }: { onClose: () => void }) {
  const [items, setItems] = useState<MenuItemRow[]>([]);
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [pesan, setPesan] = useState<{ ok: boolean; teks: string } | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [nama, setNama] = useState('');
  const [harga, setHarga] = useState('');
  const [kategoriId, setKategoriId] = useState('');
  const [sku, setSku] = useState('');
  const [newCategory, setNewCategory] = useState('');

  const load = useCallback(async () => {
    const [itemList, catList] = await Promise.all([
      window.api.menu.list(),
      window.api.menu.categories(),
    ]);
    setItems(itemList);
    setCategories(catList);
  }, []);

  useEffect(() => { load(); }, [load]);

  const resetForm = () => {
    setEditingId(null);
    setNama('');
    setHarga('');
    setKategoriId('');
    setSku('');
    setShowForm(false);
  };

  const openCreate = () => {
    resetForm();
    setShowForm(true);
  };

  const openEdit = (item: MenuItemRow) => {
    setEditingId(item.id);
    setNama(item.nama);
    setHarga(String(item.harga));
    setKategoriId(item.kategori_id || '');
    setSku(item.sku || '');
    setShowForm(true);
  };

  const tampil = (ok: boolean, teks: string) => {
    setPesan({ ok, teks });
    setTimeout(() => setPesan(null), 3000);
  };

  const handleSave = async () => {
    if (!nama.trim()) { tampil(false, 'Nama wajib diisi'); return; }
    const price = parseInt(harga.replace(/\D/g, ''), 10) || 0;
    if (price <= 0) { tampil(false, 'Harga wajib diisi'); return; }

    const data = { nama, harga: price, kategori_id: kategoriId || null, sku: sku || null };
    const result = editingId
      ? await window.api.menu.update(editingId, data)
      : await window.api.menu.create(data);
    if (result.success) {
      tampil(true, editingId ? 'Item menu diperbarui' : 'Item menu ditambahkan');
      resetForm();
      await load();
    } else {
      tampil(false, result.error || 'Gagal menyimpan');
    }
  };

  const handleDeleteItem = async (id: string) => {
    const result = await window.api.menu.remove(id);
    if (result.success) {
      tampil(true, 'Item menu dinonaktifkan');
      await load();
    } else {
      tampil(false, result.error || 'Gagal menghapus');
    }
  };

  const handleAddCategory = async () => {
    const name = newCategory.trim();
    if (!name) return;
    const result = await window.api.menu.categoryCreate(name);
    if (result.success) {
      setNewCategory('');
      await load();
    } else {
      tampil(false, result.error || 'Gagal menambah kategori');
    }
  };

  const handleDeleteCategory = async (id: string) => {
    const result = await window.api.menu.categoryDelete(id);
    tampil(result.success, result.success ? 'Kategori dihapus' : result.error || 'Gagal menghapus kategori');
    if (result.success) await load();
  };

  const catName = (id: string | null) => {
    if (!id) return '-';
    return categories.find(c => c.id === id)?.nama_kategori || '-';
  };

  return (
    <Modal title="Kelola Menu" onClose={onClose} size="xl">
      {pesan && <Alert tone={pesan.ok ? 'ok' : 'err'} className="mb-4">{pesan.teks}</Alert>}

      <div className="flex gap-5 min-h-[420px]">
        {/* Kolom kiri: Kategori */}
        <div className="w-56 flex flex-col shrink-0">
          <div className="font-bold text-sm text-gray-700 mb-2">Kategori</div>
          <div className="flex gap-2 mb-3">
            <input
              type="text"
              placeholder="Nama kategori"
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleAddCategory(); }}
              className="input"
            />
            <button
              onClick={handleAddCategory}
              className="btn btn-primary px-3 shrink-0"
              title="Tambah kategori"
            >
              +
            </button>
          </div>
          <div className="flex-1 overflow-y-auto space-y-1">
            {categories.length === 0 && <EmptyState text="Belum ada kategori" />}
            {categories.map((cat) => (
              <div key={cat.id} className="card flex items-center gap-2 px-3 py-2">
                <span
                  className="flex-1 cursor-pointer text-sm"
                  onClick={() => setKategoriId(cat.id)}
                  title="Klik untuk pilih dalam form"
                >
                  {cat.nama_kategori}
                </span>
                <button
                  onClick={() => handleDeleteCategory(cat.id)}
                  className="text-red-400 hover:text-red-600 text-sm"
                  title="Hapus kategori"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Kolom kanan: Item menu */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex justify-between items-center mb-2">
            <div className="font-bold text-sm text-gray-700">Item Menu</div>
            <Btn variant="success" className="px-3 py-1.5 text-sm" onClick={openCreate}>
              + Tambah Item
            </Btn>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2">
            {items.length === 0 && <EmptyState text="Belum ada item menu" />}
            {items.map((item) => (
              <div key={item.id} className="card flex items-center gap-3 px-4 py-3">
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm truncate">{item.nama}</div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    <Badge tone="blue">{catName(item.kategori_id)}</Badge>
                    <span className="ml-2">{formatRupiah(item.harga)}</span>
                  </div>
                </div>
                <Btn variant="secondary" className="px-3 py-1.5 text-xs" onClick={() => openEdit(item)}>
                  Ubah
                </Btn>
                <Btn variant="danger" className="px-3 py-1.5 text-xs" onClick={() => handleDeleteItem(item.id)}>
                  Hapus
                </Btn>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Form tambah/ubah item */}
      {showForm && (
        <div className="border-t border-gray-200 mt-4 pt-4 space-y-3">
          <div className="font-bold text-sm text-gray-700">{editingId ? 'Ubah Item' : 'Tambah Item'}</div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Nama">
              <input type="text" value={nama} onChange={(e) => setNama(e.target.value)} className="input" />
            </Field>
            <Field label="Harga (Rp)">
              <input type="number" value={harga} onChange={(e) => setHarga(e.target.value)} className="input" />
            </Field>
            <Field label="Kategori">
              <select value={kategoriId} onChange={(e) => setKategoriId(e.target.value)} className="input">
                <option value="">-- Pilih --</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.nama_kategori}</option>
                ))}
              </select>
            </Field>
            <Field label="SKU (opsional)">
              <input type="text" value={sku} onChange={(e) => setSku(e.target.value)} className="input" />
            </Field>
          </div>
          <div className="flex gap-2 justify-end">
            <Btn variant="secondary" className="px-4 py-2" onClick={resetForm}>Batal</Btn>
            <Btn variant="primary" className="px-4 py-2" onClick={handleSave}>Simpan</Btn>
          </div>
        </div>
      )}
    </Modal>
  );
}