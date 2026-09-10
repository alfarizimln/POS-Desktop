import { useEffect, useState } from 'react';
import { KasirPage } from './pages/KasirPage';
import { SetupWizard } from './pages/SetupWizard';
import { LoginPage } from './pages/LoginPage';

export default function App() {
  const [activated, setActivated] = useState<boolean | null>(null);
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    checkActivation();
  }, []);

  const checkActivation = async () => {
    const result = await window.api.config.get('is_activated');
    setActivated(result === 'true');
    if (result === 'true') {
      const session = await window.api.auth.current();
      setLoggedIn(session.success && !!session.user);
    }
  };

  const handleLoggedIn = () => {
    setLoggedIn(true);
  };

  const handleLogout = () => {
    setLoggedIn(false);
  };

  if (activated === null) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 gap-3">
        <div className="w-14 h-14 rounded-2xl bg-blue-600 text-white flex items-center justify-center text-3xl animate-pulse">
          🍜
        </div>
        <div className="text-gray-400 text-sm">Memuat...</div>
      </div>
    );
  }

  if (!activated) {
    return <SetupWizard onComplete={checkActivation} />;
  }

  if (!loggedIn) {
    return <LoginPage onLogin={handleLoggedIn} />;
  }

  return <KasirPage onLogout={handleLogout} />;
}