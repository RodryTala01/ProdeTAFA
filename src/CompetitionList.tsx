import {CompetitionImage} from './AssetImage';
import { Icon } from './ui';

export type CompetitionSummary = {
  name: string;
  code?: string;
  season?: number;
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
    <CompetitionImage code={item.code} season={item.season} name={item.name} logoUrl={item.logoUrl} decorative/>
    <div className="sports-list__content"><h3>{item.name}</h3><p>{item.detail}</p></div>
    <div className="sports-list__result">{item.position ? <strong className="sport-number">{item.position}</strong> : <Icon name="trophy" />}<span className={`status-badge status-badge--${item.tone ?? 'muted'}`}>{item.status}</span></div>
  </li>)}</ul>;
}
