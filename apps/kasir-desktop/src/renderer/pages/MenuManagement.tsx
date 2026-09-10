import { useCallback, useEffect, useState } from 'react';

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
  const [pesan, setPesan] = useState('');
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

  const handleSave = async () => {
    if (!nama.trim()) { setPesan('Nama wajib diisi'); return; }
    const price = parseInt(harga.replace(/\D/g, ''), 10) || 0;
    if (price <= 0) { setPesan('Harga wajib diisi'); return; }

    const data = { nama, harga: price, kategori_id: kategoriId || null, sku: sku || null };
    const result = editingId
      ? await window.api.menu.update(editingId, data)
      : await window.api.menu.create(data);
    if (result.success) {
      setPesan(editingId ? 'Item menu diperbarui' : 'Item menu ditambahkan');
      resetForm();
      await load();
    } else {
      setPesan(result.error || 'Gagal menyimpan');
    }
  };

  const handleDeleteItem = async (id: string) => {
    const result = await window.api.menu.remove(id);
    if (result.success) {
      setPesan('Item menu dinonaktifkan');
      await load();
    } else {
      setPesan(result.error || 'Gagal menghapus');
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
      setPesan(result.error || 'Gagal menambah kategori');
    }
  };

  const handleDeleteCategory = async (id: string) => {
    const result = await window.api.menu.categoryDelete(id);
    setPesan(result.success ? 'Kategori dihapus' : result.error || 'Gagal menghapus kategori');
    if (result.success) await load();
  };

  const catName = (id: string | null) => {
    if (!id) return '-';
    return categories.find(c => c.id === id)?.nama_kategori || '-';
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-6 w-[820px] max-h-[90vh] flex flex-col space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-xl font-bold">Kelola Menu</h3>
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg bg-gray-200 font-semibold text-sm"
          >
            Tutup
          </button>
        </div>

        {pesan && (
          <div className="px-4 py-2 text-sm text-center bg-blue-50 text-blue-700">{pesan}</div>
        )}

        <div className="flex gap-4 flex-1 overflow-hidden">
          {/* Kolom kiri: Kategori */}
          <div className="w-56 flex flex-col space-y-2 border-r pr-4">
            <div className="font-bold text-sm text-gray-700">Kategori</div>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Nama kategori"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleAddCategory(); }}
                className="flex-1 px-3 py-2 border rounded-lg text-sm"
              />
              <button
                onClick={handleAddCategory}
                className="px-3 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold"
              >
                +
              </button>
            </div>
            <div className="flex-1 overflow-y-auto space-y-1">
              {categories.map((cat) => (
                <div key={cat.id} className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2 text-sm">
                  <span
                    className="flex-1 cursor-pointer"
                    onClick={() => setKategoriId(cat.id)}
                    title="Klik untuk pilih dalam form"
                  >
                    {cat.nama_kategori}
                  </span>
                  <button
                    onClick={() => handleDeleteCategory(cat.id)}
                    className="text-red-400 hover:text-red-600 text-xs"
                    title="Hapus kategori"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Kolom kanan: Item menu */}
          <div className="flex-1 flex flex-col space-y-2">
            <div className="flex justify-between items-center">
              <div className="font-bold text-sm text-gray-700">Item Menu</div>
              <button
                onClick={openCreate}
                className="px-3 py-1.5 rounded-lg bg-green-600 text-white text-sm font-semibold"
              >
                + Tambah Item
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2">
              {items.length === 0 && (
                <p className="text-gray-400 text-center py-8 text-sm">Belum ada item menu</p>
              )}
              {items.map((item) => (
                <div key={item.id} className="flex items-center gap-3 bg-gray-50 rounded-lg px-3 py-2">
                  <div className="flex-1">
                    <div className="font-semibold text-sm">{item.nama}</div>
                    <div className="text-xs text-gray-500">{catName(item.kategori_id)} · {formatRupiah(item.harga)}</div>
                  </div>
                  <button
                    onClick={() => openEdit(item)}
                    className="px-2 py-1 rounded bg-gray-200 text-gray-700 text-xs font-semibold"
                  >
                    Ubah
                  </button>
                  <button
                    onClick={() => handleDeleteItem(item.id)}
                    className="px-2 py-1 rounded bg-red-100 text-red-600 text-xs font-semibold"
                  >
                    Hapus
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Form tambah/ubah item */}
        {showForm && (
          <div className="border-t pt-4 space-y-3">
            <div className="font-bold text-sm text-gray-700">
              {editingId ? 'Ubah Item' : 'Tambah Item'}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500">Nama</label>
                <input
                  type="text"
                  value={nama}
                  onChange={(e) => setNama(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm mt-1"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500">Harga (Rp)</label>
                <input
                  type="number"
                  value={harga}
                  onChange={(e) => setHarga(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm mt-1"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500">Kategori</label>
                <select
                  value={kategoriId}
                  onChange={(e) => setKategoriId(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm mt-1 bg-white"
                >
                  <option value="">-- Pilih --</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.nama_kategori}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500">SKU (opsional)</label>
                <input
                  type="text"
                  value={sku}
                  onChange={(e) => setSku(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm mt-1"
                />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button
                onClick={resetForm}
                className="px-4 py-2 rounded-lg bg-gray-200 font-semibold text-sm"
              >
                Batal
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 rounded-lg bg-blue-600 text-white font-semibold text-sm"
              >
                Simpan
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}