import { useEffect, useState } from 'react';
import { Alert, Btn } from '../components/ui';

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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-8">
        <div className="text-center mb-6">
          <div className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-blue-600 text-white flex items-center justify-center text-3xl shadow-soft">
            🍜
          </div>
          <h1 className="text-2xl font-bold text-gray-800">POS Rumah Makan</h1>
          <p className="text-gray-500 text-sm mt-1">Masuk sebagai Kasir</p>
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
          className="input !py-3 text-center text-2xl tracking-widest font-semibold"
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
              className="btn btn-secondary py-4 text-lg"
            >
              {k}
            </button>
          ))}
        </div>

        <Btn
          variant="primary"
          className="w-full py-3 mt-4 text-lg"
          onClick={handleLogin}
          disabled={loading || pin.length === 0}
        >
          {loading ? 'Mengecek...' : 'Masuk'}
        </Btn>
      </div>
    </div>
  );
}