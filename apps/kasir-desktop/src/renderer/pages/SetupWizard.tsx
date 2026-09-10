import { useState } from 'react';

interface Props {
  onComplete: () => void;
}

export function SetupWizard({ onComplete }: Props) {
  const [step, setStep] = useState(1);
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
      setStep(3);
    } catch {
      setError('Gagal koneksi ke server');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="text-4xl mb-2">🍜</div>
          <h1 className="text-2xl font-bold text-gray-800">POS Rumah Makan</h1>
          <p className="text-gray-500 text-sm mt-1">Pengaturan Awal</p>
        </div>

        {/* Progress */}
        <div className="flex justify-center gap-2 mb-6">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`w-10 h-1 rounded-full transition ${
                step >= s ? 'bg-blue-600' : 'bg-gray-200'
              }`}
            />
          ))}
        </div>

        {/* Step 1: Profil Toko */}
        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-center">Profil Toko</h2>
            <input
              name="nama_outlet"
              placeholder="Nama Toko (contoh: Warung Bu Ani)"
              value={form.nama_outlet}
              onChange={handleChange}
              className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            />
            <input
              name="nama_pemilik"
              placeholder="Nama Pemilik"
              value={form.nama_pemilik}
              onChange={handleChange}
              className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            />
            <button
              onClick={() => {
                if (!form.nama_outlet || !form.nama_pemilik) {
                  setError('Isi nama toko dan pemilik');
                  return;
                }
                setError('');
                setStep(2);
              }}
              className="w-full py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700"
            >
              Selanjutnya
            </button>
          </div>
        )}

        {/* Step 2: Registrasi Akun */}
        {step === 2 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-center">Buat Akun</h2>
            <input
              name="email"
              type="email"
              placeholder="Email"
              value={form.email}
              onChange={handleChange}
              className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            />
            <input
              name="password"
              type="password"
              placeholder="Password (min 6 karakter)"
              value={form.password}
              onChange={handleChange}
              className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            />
            {error && (
              <p className="text-red-500 text-sm text-center">{error}</p>
            )}
            <div className="flex gap-2">
              <button
                onClick={() => setStep(1)}
                className="flex-1 py-3 bg-gray-200 font-semibold rounded-lg"
              >
                Kembali
              </button>
              <button
                onClick={handleRegister}
                disabled={loading}
                className="flex-1 py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 disabled:bg-gray-300"
              >
                {loading ? 'Mendaftar...' : 'Daftar'}
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Selesai */}
        {step === 3 && (
          <div className="text-center space-y-4">
            <div className="text-5xl">✅</div>
            <h2 className="text-lg font-semibold">Siap Digunakan!</h2>
            <p className="text-gray-500 text-sm">
              Akun dan toko Anda sudah terdaftar. Aplikasi siap untuk digunakan.
            </p>
            <button
              onClick={onComplete}
              className="w-full py-3 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700"
            >
              Mulai Kasir
            </button>
          </div>
        )}
      </div>
    </div>
  );
}