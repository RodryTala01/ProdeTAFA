import {ParticipantShield} from './AssetImage';
import { Brand, Icon, PasswordField } from './ui';
import ParticipantsAdmin from './ParticipantsAdmin';
import { AdminMenu } from './AdminUI';
import './admin-shell.css';
import { FormEvent, useEffect, useState } from 'react';
import AdminRounds from './AdminRounds';
import AdminCompetitions from './AdminCompetitions';
import ParticipantDashboard from './ParticipantDashboard';

type Role = 'admin' | 'participant';

type User = {
  id: string;
  fullName: string;
  phone: string;
  role: Role;
  isActive: boolean;
};

type ApiError = { error?: string };

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: { 'content-type': 'application/json', ...init?.headers },
  });
  const data = await response.json().catch(() => ({})) as T & ApiError;
  if (!response.ok) throw new Error(response.status >= 500 ? 'No pudimos completar la operación. Reintentá en unos instantes.' : data.error || 'No pudimos completar la operación.');
  return data;
}

function Field({ label, value, onChange, type = 'text', placeholder, autoComplete }: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  autoComplete?: string;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <input value={value} onChange={(event) => onChange(event.target.value)} type={type} placeholder={placeholder} autoComplete={autoComplete} required />
    </label>
  );
}

function SetupScreen({ onReady }: { onReady: (user: User) => void }) {
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault(); setLoading(true); setError('');
    try {
      const data = await api<{ user: User }>('/api/setup/admin', { method: 'POST', body: JSON.stringify({ fullName, phone, password }) });
      onReady(data.user);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No se pudo crear el administrador');
    } finally { setLoading(false); }
  }

  return (
    <main className="shell shell--centered"><section className="card auth-card">
      <Brand /><h1>Configuración inicial</h1>
      <p>Creá tu cuenta de administrador. Esta pantalla desaparece después del primer registro.</p>
      <form className="form-stack" onSubmit={submit}>
        <Field label="Nombre y apellido" value={fullName} onChange={setFullName} placeholder="Rodrigo Talarico" autoComplete="name" />
        <Field label="Teléfono" value={phone} onChange={setPhone} placeholder="11 1234 5678" autoComplete="tel" />
        <Field label="Contraseña" value={password} onChange={setPassword} type="password" placeholder="Mínimo 6 caracteres" autoComplete="new-password" />
        {error && <div className="alert alert--error" role="alert">{error}</div>}
        <button className="button button--primary" disabled={loading}>{loading ? 'Creando…' : 'Crear administrador'}</button>
      </form>
    </section></main>
  );
}

export function LoginScreen({ onLogin }: { onLogin: (user: User) => void }) {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault(); setLoading(true); setError('');
    try {
      const data = await api<{ user: User }>('/api/auth/login', { method: 'POST', body: JSON.stringify({ phone, password }) });
      onLogin(data.user);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No se pudo iniciar sesión');
    } finally { setLoading(false); }
  }

  return (
    <main className="shell shell--centered"><section className="auth-card auth-card--login" aria-label="Ingresar a Prode TAFA">
      <Brand large />
      <form className="form-stack" onSubmit={submit}>
        <Field label="Teléfono" value={phone} onChange={setPhone} type="tel" placeholder="11 1234 5678" autoComplete="username" />
        <PasswordField value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" required />
        {error && <div className="alert alert--error" role="alert">{error}</div>}
        <button className="button button--primary" disabled={loading}>{loading ? 'Ingresando…' : 'Ingresar'}</button>
      </form>
    </section></main>
  );
}

function Header({ user, subtitle, onLogout }: { user: User; subtitle: string; onLogout: () => void }) {
  return (
    <header className="topbar">
      <div className="brand-inline"><Brand /><span className="header-context">{subtitle}</span></div>
      <AdminMenu label={`Perfil de ${user.fullName}`} trigger={<ParticipantShield userId={user.id} name={user.fullName} decorative/>}><span className="admin-menu-name">{user.fullName}</span><button onClick={onLogout}><Icon name="logout"/> Cerrar sesión</button></AdminMenu>
    </header>
  );
}


function AdminDashboard({ user, onLogout }: { user: User; onLogout: () => void }) {
  const [section, setSection] = useState<'rounds' | 'competitions' | 'participants'>('rounds');
  return (
    <main className="app-shell admin-shell">
      <Header user={user} subtitle="Administrador" onLogout={onLogout} />
      <section className="dashboard">
        <nav className="admin-tabs" aria-label="Administración">
          <button className={`admin-tab ${section === 'rounds' ? 'admin-tab--active' : ''}`} aria-current={section === 'rounds' ? 'page' : undefined} onClick={() => setSection('rounds')}>Fechas</button>
          <button className={`admin-tab ${section === 'competitions' ? 'admin-tab--active' : ''}`} aria-current={section === 'competitions' ? 'page' : undefined} onClick={() => setSection('competitions')}>Competiciones</button>
          <button className={`admin-tab ${section === 'participants' ? 'admin-tab--active' : ''}`} aria-current={section === 'participants' ? 'page' : undefined} onClick={() => setSection('participants')}>Participantes</button>
        </nav>
        {section === 'rounds'
          ? <AdminRounds />
          : section === 'competitions'
            ? <AdminCompetitions />
            : <ParticipantsAdmin />}
      </section>
    </main>
  );
}

export default function AppV2() {
  const [loading, setLoading] = useState(true);
  const [setupRequired, setSetupRequired] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [fatalError, setFatalError] = useState('');

  useEffect(() => {
    async function bootstrap() {
      try {
        const setup = await api<{ setupRequired: boolean }>('/api/setup/status');
        setSetupRequired(setup.setupRequired);
        if (!setup.setupRequired) {
          try { setUser((await api<{ user: User }>('/api/auth/me')).user); }
          catch { setUser(null); }
        }
      } catch (caught) { setFatalError(caught instanceof Error ? caught.message : 'No se pudo conectar con el servidor'); }
      finally { setLoading(false); }
    }
    void bootstrap();
  }, []);

  async function logout() {
    try { await api('/api/auth/logout', { method: 'POST', body: '{}' }); }
    finally { window.history.replaceState(null, '', window.location.pathname); setUser(null); }
  }

  if (loading) return <main className="shell shell--centered"><div className="loader">Cargando Prode TAFA…</div></main>;
  if (fatalError) return <main className="shell shell--centered"><section className="card auth-card"><h1>No pudimos iniciar</h1><div className="alert alert--error">{fatalError}</div></section></main>;
  if (setupRequired) return <SetupScreen onReady={(createdUser) => { setUser(createdUser); setSetupRequired(false); }} />;
  if (!user) return <LoginScreen onLogin={(loggedUser) => {
    window.history.replaceState(null, '', loggedUser.role === 'participant' ? '#/inicio' : window.location.pathname);
    setUser(loggedUser);
  }} />;
  if (user.role === 'admin') return <AdminDashboard user={user} onLogout={() => void logout()} />;
  return <ParticipantDashboard user={user} onLogout={() => void logout()} />;
}
