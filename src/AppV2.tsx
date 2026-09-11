import { FormEvent, useEffect, useState } from 'react';
import AdminRounds from './AdminRounds';
import AdminLeague from './AdminLeague';
import ParticipantRound from './ParticipantRound';
import LeagueView from './LeagueView';
import ParticipantHistory from './ParticipantHistory';

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
  if (!response.ok) throw new Error(data.error || `Error ${response.status}`);
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
      <div className="brand-mark">T</div><span className="eyebrow">PRODE TAFA</span><h1>Configuración inicial</h1>
      <p>Creá tu cuenta de administrador. Esta pantalla desaparece después del primer registro.</p>
      <form className="form-stack" onSubmit={submit}>
        <Field label="Nombre y apellido" value={fullName} onChange={setFullName} placeholder="Rodrigo Talarico" autoComplete="name" />
        <Field label="Teléfono" value={phone} onChange={setPhone} placeholder="11 1234 5678" autoComplete="tel" />
        <Field label="Contraseña" value={password} onChange={setPassword} type="password" placeholder="Mínimo 6 caracteres" autoComplete="new-password" />
        {error && <div className="alert alert--error">{error}</div>}
        <button className="button button--primary" disabled={loading}>{loading ? 'Creando…' : 'Crear administrador'}</button>
      </form>
    </section></main>
  );
}

function LoginScreen({ onLogin }: { onLogin: (user: User) => void }) {
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
    <main className="shell shell--centered"><section className="card auth-card">
      <div className="brand-mark">T</div><span className="eyebrow">PRODE TAFA</span><h1>Entrar al Prode</h1>
      <p>Usá el teléfono y la contraseña que te asignó el administrador.</p>
      <form className="form-stack" onSubmit={submit}>
        <Field label="Teléfono" value={phone} onChange={setPhone} placeholder="11 1234 5678" autoComplete="username" />
        <Field label="Contraseña" value={password} onChange={setPassword} type="password" autoComplete="current-password" />
        {error && <div className="alert alert--error">{error}</div>}
        <button className="button button--primary" disabled={loading}>{loading ? 'Ingresando…' : 'Ingresar'}</button>
      </form>
    </section></main>
  );
}

function Header({ user, subtitle, onLogout }: { user: User; subtitle: string; onLogout: () => void }) {
  return (
    <header className="topbar">
      <div className="brand-inline"><div className="brand-mark brand-mark--small">T</div><div><strong>Prode TAFA</strong><span>{subtitle}</span></div></div>
      <div className="topbar-actions"><span className="user-chip">{user.fullName}</span><button className="button button--ghost" onClick={onLogout}>Salir</button></div>
    </header>
  );
}

function ParticipantsAdmin() {
  const [users, setUsers] = useState<User[]>([]);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetUser, setResetUser] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState('');

  async function loadUsers() {
    try { setUsers((await api<{ users: User[] }>('/api/admin/users')).users); }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'No se pudieron cargar los participantes'); }
  }
  useEffect(() => { void loadUsers(); }, []);

  async function createParticipant(event: FormEvent) {
    event.preventDefault(); setLoading(true); setError(''); setSuccess('');
    try {
      const data = await api<{ user: User }>('/api/admin/users', { method: 'POST', body: JSON.stringify({ fullName, phone, password }) });
      setUsers((current) => [...current, data.user].sort((a, b) => a.fullName.localeCompare(b.fullName)));
      setFullName(''); setPhone(''); setPassword('');
      setSuccess(`${data.user.fullName} fue agregado correctamente. Si hay una Liga abierta, entra desde esta temporada con 0 puntos previos.`);
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'No se pudo crear el participante'); }
    finally { setLoading(false); }
  }

  async function resetPassword(event: FormEvent) {
    event.preventDefault(); if (!resetUser) return;
    setLoading(true); setError(''); setSuccess('');
    try {
      await api(`/api/admin/users/${encodeURIComponent(resetUser.id)}/password`, { method: 'PUT', body: JSON.stringify({ password: newPassword }) });
      setSuccess(`Contraseña de ${resetUser.fullName} actualizada.`); setResetUser(null); setNewPassword('');
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'No se pudo cambiar la contraseña'); }
    finally { setLoading(false); }
  }

  async function toggleParticipant(entry: User) {
    if (entry.role !== 'participant') return;
    setLoading(true); setError(''); setSuccess('');
    try {
      const data = await api<{ isActive: boolean }>(`/api/admin/users/${encodeURIComponent(entry.id)}/status`, { method: 'PUT', body: JSON.stringify({ isActive: !entry.isActive }) });
      setUsers((current) => current.map((item) => item.id === entry.id ? { ...item, isActive: data.isActive } : item));
      setSuccess(data.isActive ? `${entry.fullName} fue reactivado.` : `${entry.fullName} fue desactivado. Su historial se conserva.`);
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'No se pudo cambiar el estado'); }
    finally { setLoading(false); }
  }

  const participants = users.filter((entry) => entry.role === 'participant');
  const active = participants.filter((entry) => entry.isActive).length;

  return <>
    <div className="dashboard-heading"><div><span className="eyebrow">CUENTAS</span><h1>Participantes</h1><p>Administrá quién puede jugar el Prode.</p></div><div className="stat-card"><span>Activos</span><strong>{active}/{participants.length}</strong></div></div>
    <div className="grid-two">
      <section className="card panel"><h2>Agregar participante</h2><form className="form-stack" onSubmit={createParticipant}>
        <Field label="Nombre y apellido" value={fullName} onChange={setFullName} placeholder="Nombre del participante" />
        <Field label="Teléfono" value={phone} onChange={setPhone} placeholder="11 1234 5678" />
        <Field label="Contraseña inicial" value={password} onChange={setPassword} type="password" placeholder="Mínimo 6 caracteres" />
        <button className="button button--primary" disabled={loading}>{loading ? 'Guardando…' : 'Agregar participante'}</button>
      </form></section>
      <section className="card panel panel--wide">
        <div className="panel-heading"><div><h2>Cuentas creadas</h2><p>Desactivar bloquea el acceso sin borrar historial.</p></div><button className="button button--ghost" onClick={() => void loadUsers()}>Actualizar</button></div>
        {error && <div className="alert alert--error">{error}</div>}{success && <div className="alert alert--success">{success}</div>}
        <div className="user-list">{users.map((entry) => <div className="user-row" key={entry.id}>
          <div className="avatar">{entry.fullName.slice(0, 1).toUpperCase()}</div><div className="user-data"><strong>{entry.fullName}</strong><span>{entry.phone} · {entry.role === 'admin' ? 'Administrador' : `Participante · ${entry.isActive ? 'Activo' : 'Inactivo'}`}</span></div>
          {entry.role === 'participant' && <div className="topbar-actions"><button className="button button--secondary" onClick={() => { setResetUser(entry); setNewPassword(''); }}>Cambiar clave</button><button className="button button--ghost" disabled={loading} onClick={() => void toggleParticipant(entry)}>{entry.isActive ? 'Desactivar' : 'Reactivar'}</button></div>}
        </div>)}</div>
      </section>
    </div>
    {resetUser && <div className="modal-backdrop" onMouseDown={() => setResetUser(null)}><section className="modal card" onMouseDown={(event) => event.stopPropagation()}><span className="eyebrow">RESTABLECER CONTRASEÑA</span><h2>{resetUser.fullName}</h2><form className="form-stack" onSubmit={resetPassword}><Field label="Nueva contraseña" value={newPassword} onChange={setNewPassword} type="password" placeholder="Mínimo 6 caracteres" autoComplete="new-password" /><div className="modal-actions"><button type="button" className="button button--ghost" onClick={() => setResetUser(null)}>Cancelar</button><button className="button button--primary" disabled={loading}>Guardar contraseña</button></div></form></section></div>}
  </>;
}

function AdminDashboard({ user, onLogout }: { user: User; onLogout: () => void }) {
  const [section, setSection] = useState<'rounds' | 'league' | 'participants'>('rounds');
  return (
    <main className="app-shell">
      <Header user={user} subtitle="Administración" onLogout={onLogout} />
      <section className="dashboard">
        <nav className="admin-tabs" aria-label="Administración">
          <button className={`admin-tab ${section === 'rounds' ? 'admin-tab--active' : ''}`} onClick={() => setSection('rounds')}>Fechas</button>
          <button className={`admin-tab ${section === 'league' ? 'admin-tab--active' : ''}`} onClick={() => setSection('league')}>Liga</button>
          <button className={`admin-tab ${section === 'participants' ? 'admin-tab--active' : ''}`} onClick={() => setSection('participants')}>Participantes</button>
        </nav>
        {section === 'rounds' ? <AdminRounds /> : section === 'league' ? <AdminLeague /> : <ParticipantsAdmin />}
      </section>
    </main>
  );
}

function ParticipantDashboard({ user, onLogout }: { user: User; onLogout: () => void }) {
  const [section, setSection] = useState<'round' | 'league' | 'history'>('round');
  return (
    <main className="app-shell">
      <Header user={user} subtitle="Participante" onLogout={onLogout} />
      <section className="dashboard dashboard--narrow">
        <nav className="admin-tabs" aria-label="Prode">
          <button className={`admin-tab ${section === 'round' ? 'admin-tab--active' : ''}`} onClick={() => setSection('round')}>Pronósticos</button>
          <button className={`admin-tab ${section === 'league' ? 'admin-tab--active' : ''}`} onClick={() => setSection('league')}>Liga</button>
          <button className={`admin-tab ${section === 'history' ? 'admin-tab--active' : ''}`} onClick={() => setSection('history')}>Historial</button>
        </nav>
        {section === 'round' ? <ParticipantRound /> : section === 'league' ? <LeagueView /> : <ParticipantHistory />}
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
    finally { setUser(null); }
  }

  if (loading) return <main className="shell shell--centered"><div className="loader">Cargando Prode TAFA…</div></main>;
  if (fatalError) return <main className="shell shell--centered"><section className="card auth-card"><h1>No pudimos iniciar</h1><div className="alert alert--error">{fatalError}</div></section></main>;
  if (setupRequired) return <SetupScreen onReady={(createdUser) => { setUser(createdUser); setSetupRequired(false); }} />;
  if (!user) return <LoginScreen onLogin={setUser} />;
  if (user.role === 'admin') return <AdminDashboard user={user} onLogout={() => void logout()} />;
  return <ParticipantDashboard user={user} onLogout={() => void logout()} />;
}
