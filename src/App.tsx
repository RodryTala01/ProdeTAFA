import { useEffect, useState } from 'react';

type Health = {
  ok: boolean;
  app: string;
  timestamp: string;
};

export default function App() {
  const [health, setHealth] = useState<Health | null>(null);

  useEffect(() => {
    fetch('/api/health')
      .then((response) => response.json())
      .then((data: Health) => setHealth(data))
      .catch(() => setHealth(null));
  }, []);

  return (
    <main className="shell">
      <section className="card">
        <span className="eyebrow">PRODE TAFA</span>
        <h1>Nueva aplicación en construcción</h1>
        <p>
          Base React + Cloudflare Worker preparada. El próximo módulo será login,
          fechas, partidos y pronósticos.
        </p>
        <div className="status">
          <span className={health?.ok ? 'dot dot--ok' : 'dot'} />
          {health?.ok ? 'API conectada' : 'Comprobando API…'}
        </div>
      </section>
    </main>
  );
}
