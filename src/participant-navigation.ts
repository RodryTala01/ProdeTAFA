export const participantSections = [
  { id: 'inicio', label: 'Inicio', icon: 'home' },
  { id: 'pronosticos', label: 'Pronósticos', icon: 'list' },
  { id: 'competiciones', label: 'Competiciones', icon: 'trophy' },
  { id: 'club', label: 'Mi Club', icon: 'user' },
] as const;
export type ParticipantRoute = 'inicio' | 'pronosticos' | 'competiciones' | 'club' | 'club/historial' | 'competiciones/liga' | 'competiciones/liga-a' | 'competiciones/liga-b';
export function participantRoute(hash: string): ParticipantRoute {
  const path = hash.replace(/^#\/?/, '');
  return ['inicio', 'pronosticos', 'competiciones', 'club', 'club/historial', 'competiciones/liga', 'competiciones/liga-a', 'competiciones/liga-b'].includes(path)
    ? path as ParticipantRoute : 'inicio';
}
