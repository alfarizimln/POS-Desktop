import { useState } from 'react';
import { Alert, Btn, LogoMark } from '../components/ui';

interface Props {
  onComplete: () => void;
}

export function SetupWizard({ onComplete }: Props) {
  const [step, setStep] = useState(1);
  const [modeLokal, setModeLokal] = useState(false);
  const [form, setForm] = useState({
    email: '',
    password: '',
    nama_pemilik: '',
    nama_outlet: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleRegister = async () => {
    if (!form.email || !form.password || !form.nama_pemilik || !form.nama_outlet) {
      setError('Semua field wajib diisi');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('http://localhost:3001/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Gagal mendaftar');
        return;
      }
      await window.api.config.set('tenant_id', data.tenant_id);
      await window.api.config.set('outlet_id', data.outlet_id);
      await window.api.config.set('auth_token', data.token);
      await window.api.config.set('is_activated', 'true');
      await window.api.config.set('nama_toko', form.nama_outlet);
      setModeLokal(false);
      setStep(3);
    } catch {
      setError('Gagal koneksi ke server');
    } finally {
      setLoading(false);
    }
  };

  const handleModeLokal = async () => {
    setError('');
    await window.api.config.set('is_activated', 'true');
    await window.api.config.set('mode_lokal', '1');
    setModeLokal(true);
    setStep(3);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-md border border-gray-200 w-full max-w-md p-7">
        <div className="text-center mb-6">
          <LogoMark size={52} rounded="rounded-xl" />
          <h1 className="text-lg font-semibold text-gray-900 mt-3">E-Restoran</h1>
          <p className="text-gray-500 text-sm mt-0.5">Pengaturan awal</p>
        </div>

        <div className="flex justify-center gap-2 mb-6">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`w-8 h-1.5 rounded-full transition ${step >= s ? 'bg-accent' : 'bg-gray-200'}`}
            />
          ))}
        </div>

        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-base font-semibold text-gray-900 text-center">Profil Toko</h2>
            <span className="label">Nama Toko</span>
            <input
              name="nama_outlet"
              placeholder="Contoh: Warung Bu Ani"
              value={form.nama_outlet}
              onChange={handleChange}
              className="input"
            />
            <span className="label">Nama Pemilik</span>
            <input
              name="nama_pemilik"
              placeholder="Nama Pemilik"
              value={form.nama_pemilik}
              onChange={handleChange}
              className="input"
            />
            {error && <Alert tone="err">{error}</Alert>}
            <Btn
              variant="primary"
              size="lg"
              className="w-full"
              onClick={() => {
                if (!form.nama_outlet || !form.nama_pemilik) {
                  setError('Isi nama toko dan pemilik');
                  return;
                }
                setError('');
                setStep(2);
              }}
            >
              Selanjutnya
            </Btn>
            <div className="pt-2 text-center space-y-2">
              <span className="block text-xs text-gray-400">
                Tidak ingin buat akun sekarang?
              </span>
              <Btn variant="secondary" className="w-full" onClick={handleModeLokal}>
                Lanjut Tanpa Akun (Mode Lokal)
              </Btn>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <h2 className="text-base font-semibold text-gray-900 text-center">Buat Akun</h2>
            <span className="label">Email</span>
            <input
              name="email"
              type="email"
              placeholder="Email"
              value={form.email}
              onChange={handleChange}
              className="input"
            />
            <span className="label">Password</span>
            <input
              name="password"
              type="password"
              placeholder="Minimal 6 karakter"
              value={form.password}
              onChange={handleChange}
              className="input"
            />
            {error && <Alert tone="err">{error}</Alert>}
            <div className="flex gap-2">
              <Btn variant="secondary" className="flex-1" onClick={() => setStep(1)}>
                Kembali
              </Btn>
              <Btn variant="primary" className="flex-1" onClick={handleRegister} disabled={loading}>
                {loading ? 'Mendaftar…' : 'Daftar'}
              </Btn>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="text-center space-y-4">
            <div className="mx-auto w-12 h-12 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 12.5l5.5 5.5L20 7" />
              </svg>
            </div>
            <h2 className="text-base font-semibold text-gray-900">Siap Digunakan!</h2>
            <p className="text-gray-500 text-sm leading-relaxed">
              {modeLokal
                ? 'Aplikasi siap dipakai secara offline. Sinkronisasi cloud bisa diaktifkan belakangan bila diperlukan.'
                : 'Akun dan toko Anda sudah terdaftar. Aplikasi siap untuk digunakan.'}
            </p>
            <Btn variant="primary" size="lg" className="w-full" onClick={onComplete}>
              Mulai Kasir
            </Btn>
          </div>
        )}
      </div>
    </div>
  );
}