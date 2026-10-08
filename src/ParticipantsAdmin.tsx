import {ParticipantShield} from './AssetImage';
import { FormEvent, useEffect, useState } from 'react';
import PredictionHistoryBrowser from './PredictionHistoryBrowser';
import { PasswordField } from './ui';
import { AdminModal, AdminConfirm, AdminMenu } from './AdminUI';
type User = { id: string; fullName: string; phone: string; role: 'admin' | 'participant'; isActive: boolean };
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

export default function ParticipantsAdmin() {
  const [creating, setCreating] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [confirmUser, setConfirmUser] = useState<User | null>(null);
  const [credentials, setCredentials] = useState<{ name: string; phone: string; password: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [historyUser, setHistoryUser] = useState<User | null>(null);
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
    setFetching(true); setError('');
    try { setUsers((await api<{ users: User[] }>('/api/admin/users')).users); }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'No se pudieron cargar los participantes'); }
    finally { setFetching(false); }
  }
  useEffect(() => { void loadUsers(); }, []);

  async function createParticipant(event: FormEvent) {
    event.preventDefault(); setLoading(true); setError(''); setSuccess('');
    try {
      const data = await api<{ user: User }>('/api/admin/users', { method: 'POST', body: JSON.stringify({ fullName, phone, password }) });
      setUsers((current) => [...current, data.user].sort((a, b) => a.fullName.localeCompare(b.fullName)));
      setCredentials({ name: data.user.fullName, phone: data.user.phone, password }); setCopied(false); setCreating(false);
      setFullName(''); setPhone(''); setPassword('');
      setSuccess(`${data.user.fullName} fue agregado correctamente. Su acceso ya está disponible.`);
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'No se pudo crear el participante'); }
    finally { setLoading(false); }
  }

  async function resetPassword(event: FormEvent) {
    event.preventDefault(); if (!resetUser) return;
    setLoading(true); setError(''); setSuccess('');
    try {
      await api(`/api/admin/users/${encodeURIComponent(resetUser.id)}/password`, { method: 'PUT', body: JSON.stringify({ password: newPassword }) });
      setCredentials({ name: resetUser.fullName, phone: resetUser.phone, password: newPassword }); setCopied(false);
      setSuccess(`Contraseña de ${resetUser.fullName} actualizada.`); setResetUser(null); setNewPassword('');
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'No se pudo cambiar la contraseña'); }
    finally { setLoading(false); }
  }

  async function toggleParticipant(entry: User) {
    if (entry.role !== 'participant') return;
    setConfirmUser(null);
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

  const visible = participants.filter(entry => (filter === 'all' || entry.isActive === (filter === 'active')) && `${entry.fullName} ${entry.phone}`.toLocaleLowerCase('es').includes(search.trim().toLocaleLowerCase('es')));
  async function copyCredentials() {
    if (!credentials) return;
    try { await navigator.clipboard.writeText(`Prode TAFA\n${credentials.name}\nTeléfono: ${credentials.phone}\nContraseña: ${credentials.password}\n${window.location.origin}`); setCopied(true); }
    catch { setError('No pudimos copiar. Podés seleccionar las credenciales y copiarlas manualmente.'); }
  }
  const feedback = <>{error && <div className="alert alert--error" role="alert">{error}</div>}{success && <p role="status" className="admin-success">{success}</p>}</>;
  return <section className="participants-admin">
    <div className="panel-heading"><div><span className="eyebrow">{active} ACTIVOS · {participants.length} PARTICIPANTES</span><h1>Participantes</h1></div><button className="button button--primary" onClick={() => { setError(''); setCreating(true); }}>Crear participante</button></div>
    {!creating && !resetUser && !credentials && feedback}
    <div className="admin-filter-bar"><label className="field"><span>Buscar participante</span><input type="search" placeholder="Nombre o teléfono" value={search} onChange={event => setSearch(event.target.value)}/></label><label className="field"><span>Estado</span><select value={filter} onChange={event => setFilter(event.target.value)}><option value="all">Todos</option><option value="active">Activos</option><option value="inactive">Inactivos</option></select></label><button className="button button--ghost" disabled={fetching || loading} onClick={() => void loadUsers()}>Actualizar</button></div>
    {fetching && <p role="status">Cargando participantes…</p>}
    <div className="user-list">{visible.map(entry => <div className="user-row" key={entry.id}>
      <ParticipantShield userId={entry.id} name={entry.fullName} decorative/><div className="user-data"><strong>{entry.fullName}</strong><span>{entry.phone}{!entry.isActive && ' · Inactivo'}</span></div>
      <AdminMenu label={`Acciones de ${entry.fullName}`}><button onClick={() => setHistoryUser(entry)}>Ver historial</button><button disabled={loading} onClick={() => { setError(''); setResetUser(entry); setNewPassword(''); }}>Cambiar contraseña</button><button className="admin-menu-danger" disabled={loading} onClick={() => entry.isActive ? setConfirmUser(entry) : void toggleParticipant(entry)}>{entry.isActive ? 'Desactivar' : 'Reactivar'}</button></AdminMenu>
    </div>)}</div>
    {!fetching && !visible.length && <p className="empty-copy">{participants.length ? 'No hay participantes con esos filtros.' : 'Todavía no hay participantes. Creá la primera cuenta para comenzar.'}</p>}
    {historyUser && <section className="card panel"><div className="panel-heading"><h2>{historyUser.fullName}</h2><button className="button button--ghost" onClick={() => setHistoryUser(null)}>Cerrar historial</button></div><PredictionHistoryBrowser key={historyUser.id} participantId={historyUser.id}/></section>}
    {creating && <AdminModal title="Crear participante" busy={loading} onClose={() => { setCreating(false); setPassword(''); }}><form className="form-stack" onSubmit={createParticipant}>
      <Field label="Nombre y apellido" value={fullName} onChange={setFullName}/><Field label="Teléfono" value={phone} onChange={setPhone} type="tel"/>
      <PasswordField label="Contraseña inicial" value={password} onChange={event => setPassword(event.target.value)} minLength={6} autoComplete="new-password" required/>{feedback}
      <div className="modal-actions"><button type="button" className="button button--ghost" disabled={loading} onClick={() => { setCreating(false); setPassword(''); }}>Cancelar</button><button className="button button--primary" disabled={loading}>{loading ? 'Creando…' : 'Crear participante'}</button></div>
    </form></AdminModal>}
    {resetUser && <AdminModal title={`Cambiar contraseña · ${resetUser.fullName}`} busy={loading} onClose={() => { setResetUser(null); setNewPassword(''); }}><p>La contraseña anterior dejará de funcionar y se cerrarán sus sesiones.</p><form className="form-stack" onSubmit={resetPassword}><PasswordField label="Nueva contraseña" value={newPassword} onChange={event => setNewPassword(event.target.value)} minLength={6} autoComplete="new-password" required/>{feedback}<div className="modal-actions"><button type="button" className="button button--ghost" disabled={loading} onClick={() => { setResetUser(null); setNewPassword(''); }}>Cancelar</button><button className="button button--primary" disabled={loading}>Guardar contraseña</button></div></form></AdminModal>}
    {confirmUser && <AdminConfirm title={`¿Desactivar a ${confirmUser.fullName}?`} action="Desactivar" busy={loading} onCancel={() => setConfirmUser(null)} onConfirm={() => void toggleParticipant(confirmUser)}>Se bloqueará su acceso y se cerrarán sus sesiones. Sus pronósticos, puntajes e historial se conservan.</AdminConfirm>}
    {credentials && <AdminModal title="Credenciales listas" onClose={() => setCredentials(null)}><p>{credentials.name}</p><p>Teléfono: {credentials.phone}</p><p>Contraseña asignada: <code>{credentials.password}</code></p><p className="muted">Disponibles sólo hasta cerrar este diálogo. La contraseña actual nunca se consulta al servidor.</p>{error && <p role="alert">{error}</p>}<div className="modal-actions"><button className="button button--ghost" onClick={() => setCredentials(null)}>Listo</button><button className="button button--primary" onClick={() => void copyCredentials()}>{copied ? 'Copiadas' : 'Copiar credenciales'}</button></div></AdminModal>}
  </section>;
}
