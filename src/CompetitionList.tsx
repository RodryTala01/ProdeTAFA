import { Icon } from './ui';

export type CompetitionSummary = {
  name: string;
  monogram: string;
  detail: string;
  status: string;
  tone?: 'success' | 'warning' | 'muted';
  position?: string;
  logoUrl?: string;
};

/* Presentation only: caller supplies phase, eligibility and status. */
export default function CompetitionList({ items }: { items: CompetitionSummary[] }) {
  return <ul className="sports-list">{items.map((item) => <li className="sports-list__row" key={item.name}>
    <div className="competition-emblem" aria-hidden="true">{item.logoUrl ? <img src={item.logoUrl} alt="" /> : item.monogram}</div>
    <div className="sports-list__content"><h3>{item.name}</h3><p>{item.detail}</p></div>
    <div className="sports-list__result">{item.position ? <strong className="sport-number">{item.position}</strong> : <Icon name="trophy" />}<span className={`status-badge status-badge--${item.tone ?? 'muted'}`}>{item.status}</span></div>
  </li>)}</ul>;
}
