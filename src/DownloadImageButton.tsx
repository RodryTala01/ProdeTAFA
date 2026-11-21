import { useState } from 'react';

export default function DownloadImageButton({ label, download }: { label: string; download: () => Promise<void> }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  async function handleClick() {
    setBusy(true);
    setError(false);
    try {
      await download();
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  }

  return <div>
    <button type="button" className="button button--secondary" disabled={busy} onClick={() => void handleClick()}>
      {busy ? 'Generando imagen…' : label}
    </button>
    {error && <p role="alert">No pudimos descargar la imagen. Intentá de nuevo.</p>}
  </div>;
}
