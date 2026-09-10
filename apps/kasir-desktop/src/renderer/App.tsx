import { useEffect, useState } from 'react';
import { KasirPage } from './pages/KasirPage';
import { SetupWizard } from './pages/SetupWizard';

export default function App() {
  const [activated, setActivated] = useState<boolean | null>(null);

  useEffect(() => {
    checkActivation();
  }, []);

  const checkActivation = async () => {
    const result = await window.api.config.get('is_activated');
    setActivated(result === 'true');
  };

  if (activated === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-gray-400">Memuat...</div>
      </div>
    );
  }

  if (!activated) {
    return <SetupWizard onComplete={checkActivation} />;
  }

  return <KasirPage />;
}