import { useEffect, useState } from 'react';

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};

export default function PwaInstallPrompt() {
  const [promptEvent, setPromptEvent] = useState<InstallPromptEvent | null>(null);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    function beforeInstall(event: Event) {
      event.preventDefault();
      setPromptEvent(event as InstallPromptEvent);
    }

    function installed() {
      setPromptEvent(null);
    }

    window.addEventListener('beforeinstallprompt', beforeInstall);
    window.addEventListener('appinstalled', installed);
    return () => {
      window.removeEventListener('beforeinstallprompt', beforeInstall);
      window.removeEventListener('appinstalled', installed);
    };
  }, []);

  if (!promptEvent) return null;

  async function install() {
    if (!promptEvent) return;
    setInstalling(true);
    try {
      await promptEvent.prompt();
      await promptEvent.userChoice;
      setPromptEvent(null);
    } finally {
      setInstalling(false);
    }
  }

  return (
    <section className="card panel">
      <div className="panel-heading">
        <div>
          <strong>Instalar Prode TAFA</strong>
          <p>Agregalo a la pantalla de inicio y usalo como una app.</p>
        </div>
        <button className="button button--primary" disabled={installing} onClick={() => void install()}>
          {installing ? 'Abriendo...' : 'Instalar app'}
        </button>
      </div>
    </section>
  );
}
