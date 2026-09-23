import { useEffect, useState } from 'react';
import { Modal, Btn, Alert, Field } from '../components/ui';

export function Settings({ onClose }: { onClose: () => void }) {
  const [nama, setNama] = useState('');
  const [alamat, setAlamat] = useState('');
  const [telp, setTelp] = useState('');
  const [pesan, setPesan] = useState<{ ok: boolean; teks: string } | null>(null);

  useEffect(() => {
    (async () => {
      const result = await window.api.app.getInfo();
      if (result.success) {
        setNama(result.info.nama_usaha);
        setAlamat(result.info.alamat_usaha);
        setTelp(result.info.telp_usaha);
      }
    })();
  }, []);

  const simpan = async () => {
    if (!nama.trim()) {
      setPesan({ ok: false, teks: 'Nama usaha wajib diisi' });
      return;
    }
    const result = await window.api.app.updateInfo({ nama_usaha: nama, alamat_usaha: alamat, telp_usaha: telp });
    if (result.success) {
      setPesan({ ok: true, teks: 'Profil usaha tersimpan' });
      setTimeout(() => onClose(), 900);
    } else {
      setPesan({ ok: false, teks: result.error || 'Gagal menyimpan' });
    }
  };

  return (
    <Modal title="Profil Usaha" onClose={onClose} size="sm">
      {pesan && <Alert tone={pesan.ok ? 'ok' : 'err'} className="mb-4">{pesan.teks}</Alert>}

      <div className="space-y-4">
        <Field label="Nama usaha">
          <input value={nama} onChange={(e) => setNama(e.target.value)} placeholder="Nama rumah makan" className="input" />
        </Field>
        <Field label="Alamat">
          <input value={alamat} onChange={(e) => setAlamat(e.target.value)} placeholder="Alamat (opsional)" className="input" />
        </Field>
        <Field label="No. telepon">
          <input value={telp} onChange={(e) => setTelp(e.target.value)} placeholder="No. telepon (opsional)" className="input" />
        </Field>
      </div>

      <div className="flex gap-2 mt-5">
        <Btn variant="secondary" className="flex-1" onClick={onClose}>Batal</Btn>
        <Btn variant="primary" className="flex-1" onClick={simpan}>Simpan</Btn>
      </div>
    </Modal>
  );
}