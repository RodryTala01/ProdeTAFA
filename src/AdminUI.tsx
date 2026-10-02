import { useEffect, useId, useRef, type ReactNode } from 'react';

export function AdminModal({ title, children, onClose, busy = false }: { title: string; children: ReactNode; onClose: () => void; busy?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);
  const id = useId();
  useEffect(() => { const previous = document.activeElement as HTMLElement | null; ref.current?.showModal(); return () => { previous?.focus(); }; }, []);
  return <dialog ref={ref} className="admin-modal" aria-labelledby={id} onCancel={event => { event.preventDefault(); if (!busy) onClose(); }}>
    <div className="panel-heading"><h2 id={id}>{title}</h2><button type="button" className="button button--ghost" aria-label="Cerrar diálogo" disabled={busy} onClick={onClose}>Cerrar</button></div>{children}
  </dialog>;
}

export function AdminConfirm({ title, children, onCancel, onConfirm, busy = false, action = 'Confirmar' }: { title: string; children: ReactNode; onCancel: () => void; onConfirm: () => void; busy?: boolean; action?: string }) {
  return <AdminModal title={title} onClose={onCancel} busy={busy}><p>{children}</p><div className="modal-actions"><button className="button button--ghost" disabled={busy} onClick={onCancel}>Cancelar</button><button className="button button--primary" disabled={busy} onClick={onConfirm}>{busy ? 'Guardando…' : action}</button></div></AdminModal>;
}

export function AdminMenu({ label, children, trigger = '⋯' }: { label: string; children: ReactNode; trigger?: ReactNode }) {
  const ref = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    function outside(event: PointerEvent) { if (ref.current && !ref.current.contains(event.target as Node)) ref.current.open = false; }
    document.addEventListener('pointerdown', outside);
    return () => document.removeEventListener('pointerdown', outside);
  }, []);
  return <details ref={ref} className="admin-menu" onKeyDown={event => { if (event.key === 'Escape' && ref.current) { ref.current.open = false; ref.current.querySelector('summary')?.focus(); } }}>
    <summary aria-label={label}>{trigger}</summary><div className="admin-menu-items" onClick={event => { if ((event.target as HTMLElement).closest('button,a') && ref.current) ref.current.open = false; }}>{children}</div>
  </details>;
}
