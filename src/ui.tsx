import { useId, useState, type InputHTMLAttributes } from 'react';

type IconName = 'eye' | 'eye-off' | 'arrow' | 'home' | 'list' | 'trophy' | 'logout' | 'calendar' | 'check' | 'user';
const paths: Record<IconName, string> = {
  user: 'M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0 M4 21v-2a8 8 0 0 1 16 0v2',
  eye: 'M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0',
  'eye-off': 'm3 3 18 18 M10 5a12 12 0 0 1 12 7 17 17 0 0 1-4 5 M6 6a17 17 0 0 0-4 6s3.5 7 10 7a12 12 0 0 0 5-1 M10 10a3 3 0 0 0 4 4',
  arrow: 'M4 12h16 m-6-6 6 6-6 6',
  home: 'm3 10 9-7 9 7 M5 9v12h14V9 M9 21v-8h6v8',
  list: 'M8 6h13 M8 12h13 M8 18h13 M3 6h.01 M3 12h.01 M3 18h.01',
  trophy: 'M7 3h10v6a5 5 0 0 1-10 0V3Z M7 5H3v3a4 4 0 0 0 4 4 M17 5h4v3a4 4 0 0 1-4 4 M12 14v6 M8 21h8',
  logout: 'M10 3H4v18h6 M9 12h12 m-4-4 4 4-4 4',
  calendar: 'M5 5h14v16H5V5Z M8 2v6 M16 2v6 M5 11h14',
  check: 'm5 12 4 4L19 6',
};
export function Icon({ name }: { name: IconName }) {
  return <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name]} /></svg>;
}
export function Brand({ large = false }: { large?: boolean }) {
  return <div className={`brand ${large ? 'brand--large' : ''}`}><img src="/brand/tafa.png" alt="Escudo oficial TAFA" width="40" height="64" /><span><small>PRODE</small><strong>TAFA<span className="brand-period">.</span></strong></span></div>;
}
export function PasswordField({ label = 'Contraseña', ...props }: InputHTMLAttributes<HTMLInputElement> & { label?: string }) {
  const id = useId();
  const [visible, setVisible] = useState(false);
  return <div className="field"><label htmlFor={id}>{label}</label><div className="password-control"><input {...props} id={id} type={visible ? 'text' : 'password'} /><button type="button" className="button button--ghost button--icon" aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'} aria-pressed={visible} aria-controls={id} onClick={() => setVisible(!visible)}><Icon name={visible ? 'eye-off' : 'eye'} /></button></div></div>;
}
export function TeamIdentity({ name, logoUrl }: { name: string; logoUrl?: string | null }) {
  return <div className="prediction-team">{logoUrl ? <img src={logoUrl} alt="" loading="lazy" /> : <span className="prediction-team-fallback" aria-hidden="true">{name.slice(0, 2).toUpperCase()}</span>}<span>{name}</span></div>;
}
