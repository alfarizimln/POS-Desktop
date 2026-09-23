import { useEffect, useState } from 'react';
import { KasirPage } from './pages/KasirPage';
import { SetupWizard } from './pages/SetupWizard';
import { LoginPage } from './pages/LoginPage';
import { LogoMark } from './components/ui';

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
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 gap-3">
        <LogoMark size={44} />
        <div className="text-sm text-gray-400">Memuat…</div>
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