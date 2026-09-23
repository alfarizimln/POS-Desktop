import { useEffect, useState } from 'react';
import { Alert, Btn, LogoMark } from '../components/ui';

interface Props {
  onLogin: () => void;
}

interface UserItem {
  id: string;
  nama: string;
  role: string;
}

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', '⌫'];

export function LoginPage({ onLogin }: Props) {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const result = await window.api.user.list();
      if (result.success) {
        setUsers(result.users);
        if (result.users.length > 0) setSelectedId(result.users[0].id);
      }
    })();
  }, []);

  const handleLogin = async () => {
    if (!selectedId) {
      setError('Pilih kasir terlebih dahulu');
      return;
    }
    if (!pin.trim()) {
      setError('Masukkan PIN');
      return;
    }
    setLoading(true);
    setError('');
    const result = await window.api.auth.login(selectedId, pin);
    setLoading(false);
    if (result.success) {
      setPin('');
      onLogin();
    } else {
      setError(result.error || 'Gagal masuk');
    }
  };

  const pressKey = (k: string) => {
    setError('');
    setPin((prev) => (prev.length >= 6 ? prev : prev + k));
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-md border border-gray-200 w-full max-w-sm p-7">
        <div className="text-center mb-6">
          <LogoMark size={52} rounded="rounded-xl" />
          <h1 className="text-lg font-semibold text-gray-900 mt-3">E-Restoran</h1>
          <p className="text-gray-500 text-sm mt-0.5">Masuk sebagai kasir</p>
        </div>

        <div className="mb-4">
          <span className="label">Kasir</span>
          <select
            value={selectedId}
            onChange={(e) => { setSelectedId(e.target.value); setPin(''); setError(''); }}
            className="input"
          >
            {users.length === 0 && <option value="">Tidak ada user</option>}
            {users.map((u) => (
              <option key={u.id} value={u.id}>{u.nama}</option>
            ))}
          </select>
        </div>

        <input
          type="password"
          inputMode="numeric"
          placeholder="PIN"
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
          onKeyDown={(e) => { if (e.key === 'Enter') handleLogin(); }}
          className="input !h-12 !text-center !text-2xl !font-semibold !tracking-widest"
          autoFocus
        />

        {error && <Alert tone="err" className="mt-3">{error}</Alert>}

        <div className="grid grid-cols-3 gap-2 mt-4">
          {KEYS.map((k) => (
            <button
              key={k}
              onClick={() => {
                if (k === 'C') { setPin(''); setError(''); }
                else if (k === '⌫') setPin((prev) => prev.slice(0, -1));
                else pressKey(k);
              }}
              className="btn btn-secondary !h-11 !text-lg"
            >
              {k}
            </button>
          ))}
        </div>

        <Btn
          variant="primary"
          size="lg"
          className="w-full mt-4"
          onClick={handleLogin}
          disabled={loading || pin.length === 0}
        >
          {loading ? 'Mengecek…' : 'Masuk'}
        </Btn>
      </div>
    </div>
  );
}