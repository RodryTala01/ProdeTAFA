import {isWorldCupOverall,worldCupZone} from './historical-competition-family';
import {archivedCompetitionFinals,type HistoricalFinal} from './historical-finals';
import {documentedDuoPhases,documentedHistoryGroups,type ArchiveDuoPhase} from './historical-group-catalog';
import {useEffect,useState,type ReactNode} from 'react';
import {AssetImage,ParticipantShield} from './AssetImage';
import {competitionAsset} from './competition-assets';
import {Icon} from './ui';
import {archiveStandingZone,archiveHistoryGroups,archivePublicDescription,historicalMatchLayout,isHistoricalPromotion,promotionHomeLeague,visibleArchiveCompetitions} from './archive-history-view';
import type {HistorySummary,HistoryDetail} from './history-types';
import type {ArchivePayload,ArchiveCompetition} from './historical-schema';
import './participant-archive.css';

const resultNames:Record<string,string>={CHAMPION:'Campeón',RUNNER_UP:'Subcampeón',THIRD:'Tercero',SEMIFINAL:'Semifinal',QUARTERFINAL:'Cuartos de final',ROUND_OF_16:'Octavos de final',GROUP_STAGE:'Fase de grupos',POSITION:'Posición final',ELIMINATED:'Eliminado',QUALIFIED:'Clasificado'};
const display=(n:number|null|undefined)=>n??'—';
const decimals=new Intl.NumberFormat('es-AR',{minimumFractionDigits:2,maximumFractionDigits:2});
type ArchiveView='resumen'|'competiciones'|'iffhs';
export function historicalExtras(r:{points:number;fulls:number|null;partials:number|null;extras:number|null}){
 return r.extras??(r.fulls!==null&&r.partials!==null?r.points-3*r.fulls-r.partials:null);
}
function Trophy({code,name,season,large=false}:{code:string;name:string;season:number;large?:boolean}){
 const asset=competitionAsset(code,season);
 return <span className={'archive-emblem'+(large?' archive-emblem--large':'')}><AssetImage src={asset.trophy||asset.logo} name={name} size={large?'lg':'md'} fallback={<Icon name="trophy"/>}/></span>;
}
function Person({data,id}:{data:ArchivePayload;id:string}){
 const p=data.participants.find(p=>p.key===id);
 return <span className="archive-person">{p?<ParticipantShield userId={p.userId??undefined} name={p.name} season={data.season.number} size="sm" decorative/>:<span className="archive-avatar" aria-hidden="true"><Icon name="user"/></span>}{p?.userId?<a href={'#/club/participante/'+encodeURIComponent(p.userId)}>{p.name}</a>:<span>{p?.name||'Participante no disponible'}</span>}</span>;
}
function Empty({children='Información no disponible.'}:{children?:ReactNode}){return <div className="archive-empty"><Icon name="book"/><p>{children}</p></div>;}
function SectionHeading({title,detail}:{title:string;detail?:string}){return <div className="archive-section-heading"><h2>{title}</h2>{detail&&<span>{detail}</span>}</div>;}
function StatsTable({data,rows,label,positions=false,competition,source='imported'}:{data:ArchivePayload;rows:Array<{participantKey:string;position?:number;points:number;fulls:number|null;partials:number|null;errors:number|null;extras:number|null}>;label:string;positions?:boolean;competition?:ArchiveCompetition;source?:HistoryDetail['summary']['source']}){
 return <div className="archive-table" role="region" aria-label={label} tabIndex={0}><table><caption className="sr-only">{label}</caption><thead><tr>{positions&&<th scope="col">Posición</th>}<th scope="col">Participante</th><th scope="col">Puntos</th><th scope="col">Plenos</th><th scope="col">Parciales</th><th scope="col">Errores</th><th scope="col">Extras</th></tr></thead><tbody>{rows.map(r=>{const zone=competition&&r.position!==undefined?archiveStandingZone(data,competition,r as ArchivePayload['standings'][number],source):null;return <tr key={r.participantKey} className={zone?'archive-zone archive-zone--'+zone.code:undefined} title={zone?.label}>{positions&&<td><span className={'archive-position'+(r.position===1?' archive-position--first':'')}>{display(r.position)}{r.position!==undefined?'°':''}</span>{zone&&<small className="archive-zone-note">{zone.label}</small>}</td>}<th scope="row"><Person data={data} id={r.participantKey}/></th><td className="archive-points">{r.points}</td><td>{display(r.fulls)}</td><td>{display(r.partials)}</td><td>{display(r.errors)}</td><td>{display(historicalExtras(r))}</td></tr>;})}</tbody></table></div>;
}
function Podium({detail,code}:{detail:HistoryDetail;code?:string}){
 const {data,summary}=detail;
 const groups=new Map<string,ArchivePayload['results']>();
 for(const award of data.results){
  if((code&&award.competitionCode!==code)||!['CHAMPION','RUNNER_UP'].includes(award.resultCode))continue;
  const list=groups.get(award.competitionCode)??[];
  list.push(award);
  groups.set(award.competitionCode,list);
 }
 return groups.size?<div className="archive-podium">{[...groups].map(([competition,awards])=>{
  const name=data.competitions.find(c=>c.code===competition)?.name??competition;
  const champion=awards.some(r=>r.resultCode==='CHAMPION');
  return <article className={'archive-award'+(champion?' archive-award--champion':'')} key={competition}>
   <Trophy code={competition} name={name} season={summary.number} large/>
   <div className="archive-award__body">
    <h3>{name}</h3>
    {(['CHAMPION','RUNNER_UP'] as const).map(resultCode=>{
     const entrants=awards.filter(r=>r.resultCode===resultCode);
     if(!entrants.length)return null;
     return <div className="archive-award-result" data-champion={resultCode==='CHAMPION'} key={resultCode}>
      <span className="archive-award__label">{resultNames[resultCode]}</span>
      {entrants.map(r=>{
       const points=data.standings.find(row=>row.competitionCode===competition&&row.participantKey===r.participantKey)?.points;
       return <div className="archive-award-entrant" key={r.participantKey}>
        <div><Person data={data} id={r.participantKey}/>{r.teamLabel&&competition!=='COPA_DUOS'&&<small>{r.teamLabel}</small>}</div>
        {points!==undefined&&<span className="archive-award__points"><strong>{points}</strong><span>puntos</span></span>}
       </div>;
      })}
     </div>;
    })}
   </div>
  </article>;
 })}</div>:<Empty>Sin resultados finales declarados.</Empty>;
}
// The bracket renders only persisted match scores. It intentionally does not
// infer advancement or match winners from totals; historical tiebreak rules differ.
function ArchiveMatchCards({detail,matches}:{detail:HistoryDetail;matches:ArchivePayload['matches']}){
 return <div className="archive-match-stack">{matches.map((m,i)=><article className="archive-match-card" key={m.matchId??i}>
  <div className="archive-match-entry"><Person data={detail.data} id={m.aKey}/><strong>{m.pointsA}</strong></div>
  <div className="archive-match-entry"><Person data={detail.data} id={m.bKey}/><strong>{m.pointsB}</strong></div>
  {(archivePublicDescription(m.round)||m.scoreBasis==='DUO')&&<div className="archive-match-caption">{archivePublicDescription(m.round)&&<small>{archivePublicDescription(m.round)}</small>}{m.scoreBasis==='DUO'&&<small>Puntaje de dúo</small>}</div>}
 </article>)}</div>;
}
function ArchiveDuoFinal({data,final}:{data:ArchivePayload;final:HistoricalFinal}){
 return <article className="archive-match-card archive-duo-final">
  {(['a','b'] as const).map(side=><div key={side} className="archive-match-entry" data-winner={final.winner===side||undefined}>
   <div className="archive-duo-members">{final[side].members?.map(member=><Person key={member.userId} data={data} id={member.userId!}/>)}</div>
   <strong>{side==='a'?final.pointsA:final.pointsB}</strong>
  </div>)}
 </article>;
}

function DuoPhaseTables({data,phases}:{data:ArchivePayload;phases:ArchiveDuoPhase[]}){
 return <section className="archive-panel">
  <SectionHeading title="Tablas por fase"/>
  {phases.map((phase,index)=><details key={phase.name} className="archive-round" open={index===0||undefined}>
   <summary>{phase.name}</summary>
   <div className="archive-duo-tables">
    {(['pairs','individuals'] as const).map(type=>{
     const rows=phase[type];
     if(!rows.length)return null;
     return <div className="archive-group-table" key={type}>
      <table><caption>{type==='pairs'?'Por pareja':'Individual'}</caption>
       <thead><tr>{type==='pairs'&&<th scope="col">Pos.</th>}<th scope="col">{type==='pairs'?'Pareja':'Participante'}</th>
        {['Pts','Plenos','Parciales','Errores','Extras'].map(label=><th key={label} scope="col">{label}</th>)}</tr></thead>
       <tbody>{rows.map((row,i)=><tr key={i} data-phase-decision={row.decision}>
        {'position' in row&&<td>{row.position}</td>}
        <th scope="row">{'participantKey' in row?<Person data={data} id={row.participantKey}/>:<div className="archive-duo-members">{row.members.map(id=><Person key={id} data={data} id={id}/>)}</div>}</th>
        {row.stats.map((value,j)=><td key={j} className={j===0?'archive-points':undefined}>{value??'—'}</td>)}
       </tr>)}</tbody>
      </table>
     </div>;
    })}
   </div>
  </details>)}
 </section>;
}
function ArchiveKnockout({detail,matches}:{detail:HistoryDetail;matches:ArchivePayload['matches']}){
 const {bracket,other,additional}=historicalMatchLayout(matches);
 const duoFinals=matches.some(m=>m.competitionCode==='COPA_DUOS')
  ?archivedCompetitionFinals({...detail.data,matches},key=>key).filter(f=>f.a.members?.length===2&&f.b.members?.length===2)
  :[];
 const rounds=bracket.map(stage=>({...stage,count:stage.key==='Final'&&duoFinals.length?duoFinals.length:stage.matches.length}));
 return <>
  {bracket.length>0&&<section className="archive-panel archive-bracket-panel">
   <SectionHeading title="Llave de eliminación directa" detail={rounds.reduce((n,s)=>n+s.count,0)+' cruces'}/>
   <p className="archive-bracket-note">Rondas ordenadas de izquierda a derecha. Deslizá para recorrer la llave.</p>
   <div className="archive-bracket-scroll" tabIndex={0} role="region" aria-label="Llave histórica de la competición">
    <div className="archive-bracket">
     {rounds.map(stage=><section className="archive-bracket-stage" key={stage.key}>
       <h3>{stage.label}<small>{stage.count} {stage.count===1?'cruce':'cruces'}</small></h3>
       <div className="archive-bracket-encounters">{stage.key==='Final'&&duoFinals.length?duoFinals.map(final=><div className="archive-bracket-node" key={final.id}><ArchiveDuoFinal data={detail.data} final={final}/></div>):stage.matches.map((m,j)=><div className="archive-bracket-node" key={m.matchId??j}>
        <ArchiveMatchCards detail={detail} matches={[m]}/>
       </div>)}</div>
     </section>)}
    </div>
   </div>
  </section>}
  {additional.length>0&&<details className="archive-panel archive-additional">
   <summary>Otros encuentros de la final · {additional.length}</summary>
   <div className="archive-other-matches">{additional.map((m,i)=><ArchiveMatchCards key={m.matchId??i} detail={detail} matches={[m]}/>)}</div>
  </details>}
  {other.length>0&&<section className="archive-panel"><SectionHeading title="Otros encuentros oficiales" detail={other.length+' cruces'}/><div className="archive-other-matches">{other.map((m,i)=><div key={m.matchId??i}><h3>{archivePublicDescription(m.stage)}</h3><ArchiveMatchCards detail={detail} matches={[m]}/></div>)}</div></section>}
 </>;
}
function ArchiveGroups({detail,competitionCode,matches}:{detail:HistoryDetail;competitionCode:string;matches:ArchivePayload['matches']}){
 const groups=archiveHistoryGroups(detail.data,competitionCode,matches);
 if(!groups.length)return <Empty>Esta edición no tiene una fase de grupos documentada.</Empty>;
 return <section className="archive-panel archive-groups-panel">
  <SectionHeading title="Fase de grupos" detail={groups.length+' grupos'}/>
  <div className="archive-group-grid">{groups.map(g=><section className="archive-group" key={g.name}>
   <h3>{g.name}<small>{g.entries.length} participantes</small></h3>
   <div className="archive-group-table">
    <table><thead><tr>{g.entries.some(e=>e.position!==null)&&<th scope="col">Pos.</th>}<th scope="col">Participante</th><th scope="col">Pts</th>{g.entries.some(e=>e.stats)&&['Plenos','Parciales','Errores','Extras'].map(label=><th key={label} scope="col">{label}</th>)}</tr></thead>
     <tbody>{g.entries.map(e=><tr key={e.participantKey} data-phase-decision={e.decision??undefined}>
      {g.entries.some(x=>x.position!==null)&&<td>{e.position??'—'}</td>}
      <th scope="row"><Person data={detail.data} id={e.participantKey}/></th>
      <td className="archive-points">{Number.isFinite(e.points)?e.points:'—'}</td>
      {g.entries.some(row=>row.stats)&&Array.from({length:4},(_,index)=><td key={index}>{e.stats?.[index]??'—'}</td>)}
     </tr>)}</tbody>
    </table>
   </div>
   {g.matches.length>0&&<div className="archive-group-fixtures">
    <h4>Enfrentamientos · {g.matches.length}</h4>
    {g.matches.map((m,i)=><div className="archive-group-fixture" key={m.matchId??i}>
     <ArchiveMatchCards detail={detail} matches={[m]}/>
    </div>)}
   </div>}
  </section>)}</div>
 </section>;
}

function LeaguePromotionHistory({detail}:{detail:HistoryDetail}){
 const {data}=detail;
 const codes=new Set(data.competitions.filter(isHistoricalPromotion).map(c=>c.code));
 codes.add('PROMOCION');
 const matches=data.matches.filter(m=>codes.has(m.competitionCode));
 if(!matches.length)return null;
 return <section className="archive-panel archive-league-promotion">
  <SectionHeading title="Promoción" detail={matches.length+' enfrentamientos'}/>
  <div className="archive-other-matches">{matches.map((m,i)=><div key={m.matchId??i}><h3>{archivePublicDescription(m.stage)}</h3><ArchiveMatchCards detail={detail} matches={[m]}/></div>)}</div>
 </section>;
}

function CompetitionDetail({detail,competition}:{detail:HistoryDetail;competition:ArchiveCompetition}){
 const {data,summary}=detail,c=competition;
 const standings=data.standings.filter(r=>r.competitionCode===c.code).sort((a,b)=>a.position-b.position);
 const results=data.results.filter(r=>r.competitionCode===c.code);
 const rounds=data.rounds.filter(r=>(r.competitionCode||(data.competitions.length===1?c.code:null))===c.code);
 const matches=data.matches.filter(r=>r.competitionCode===c.code);
 const links=detail.officialLinks.filter(l=>l.code===c.code);
 const roundNames=[...new Set(rounds.map(r=>r.round))];
 const worldOverall=isWorldCupOverall(c.code);
 const worldZone=worldCupZone(c.code);
 const hasWorldStandings=Boolean((worldOverall||worldZone)&&standings.length);
 const worldTableTitle=worldOverall?'Prode Mundial':'Primera fase';
 const isCup=!worldOverall&&(c.kind==='CUP'||c.kind==='TOURNAMENT');
 const duoPhases=c.code==='COPA_DUOS'?documentedDuoPhases(data):[];
 const leagueZones=c.kind==='LEAGUE'?documentedHistoryGroups(data,c.code):[];
 const groups=isCup?archiveHistoryGroups(data,c.code,matches):[];
 const cupBracket=isCup?historicalMatchLayout(matches):null;
 const canEliminate=Boolean(cupBracket?.bracket.length||cupBracket?.other.length||cupBracket?.additional.length);
 const hasPhaseTables=groups.length>0||duoPhases.length>0||hasWorldStandings;
 const [cupPhase,setCupPhase]=useState<'grupos'|'eliminatorias'>(hasPhaseTables?'grupos':'eliminatorias');
 const shownPhase=cupPhase==='grupos'&&hasPhaseTables?'grupos':'eliminatorias';
 return <div className="archive-competition">
  <div className="archive-competition-heading"><Trophy code={c.code} name={c.name} season={summary.number}/><div><span className="archive-kicker">Competición · T{summary.number}</span><h2>{worldOverall?worldTableTitle:c.name}</h2></div></div>
  {!worldOverall&&<Podium detail={detail} code={c.code}/>}
  {worldOverall&&hasWorldStandings&&<section className="archive-panel"><SectionHeading title="Tabla general"/><StatsTable data={data} rows={standings} positions label={worldTableTitle}/></section>}
  {leagueZones.length>0&&<section className="archive-panel"><SectionHeading title="Tablas por zona"/>
   {leagueZones.map(zone=><section key={zone.name}><h3>{zone.name}</h3><StatsTable data={data} label={zone.name} positions rows={zone.entries.map(row=>({
    ...row,position:row.position??undefined,fulls:row.stats?.[0]??null,partials:row.stats?.[1]??null,errors:row.stats?.[2]??null,extras:row.stats?.[3]??null,
   }))}/></section>)}
  </section>}
  {!isCup&&!worldOverall&&!leagueZones.length&&<section className="archive-panel"><SectionHeading title="Tabla final" detail={standings.length?standings.length+' participantes':undefined}/>{standings.length?<StatsTable data={data} rows={standings} positions label={'Tabla de '+c.name} competition={c} source={summary.source}/>:results.length?<div className="archive-table" role="region" aria-label={'Puestos de '+c.name} tabIndex={0}><table><thead><tr><th scope="col">Posición</th><th scope="col">Participante</th><th scope="col">Fase alcanzada</th></tr></thead><tbody>{[...results].sort((a,b)=>(a.position??Infinity)-(b.position??Infinity)).map((r,i)=><tr key={i}><td><span className="archive-position">{display(r.position)}</span></td><th scope="row"><Person data={data} id={r.participantKey}/></th><td>{resultNames[r.resultCode]||r.resultCode}</td></tr>)}</tbody></table></div>:<Empty>Tabla final no disponible.</Empty>}</section>}
  {!isCup&&(roundNames.length>0||links.length>0)&&<section className="archive-panel"><SectionHeading title="Resultados por Fecha" detail={roundNames.length?roundNames.length+' Fechas':undefined}/>{roundNames.map(round=><details className="archive-round" key={round}><summary><span><Icon name="calendar"/>{round}</span><span>Ver resultados</span></summary><StatsTable data={data} rows={rounds.filter(r=>r.round===round)} label={c.name+' · '+round}/></details>)}{links.length>0&&<div className="archive-round-links">{links.map(l=><a className="button button--secondary" key={l.roundId} href={'#/club/historial/'+l.roundId}>{l.name}<Icon name="arrow"/></a>)}</div>}</section>}
  {isCup&&(hasPhaseTables||canEliminate)&&<>
   {hasPhaseTables&&canEliminate&&<nav className="archive-phase-tabs" aria-label={'Fases de '+c.name}>
     <button type="button" aria-pressed={shownPhase==='grupos'} onClick={()=>setCupPhase('grupos')}>{duoPhases.length?'Tablas por fase':hasWorldStandings?'Primera fase':'Grupos'}</button>
     <button type="button" aria-pressed={shownPhase==='eliminatorias'} onClick={()=>setCupPhase('eliminatorias')}>Eliminatorias</button>
   </nav>}
   {shownPhase==='grupos'?hasWorldStandings
     ?<section className="archive-panel"><SectionHeading title={worldTableTitle}/><StatsTable data={data} rows={standings} positions label={worldTableTitle}/></section>
     :duoPhases.length?<DuoPhaseTables data={data} phases={duoPhases}/>:<ArchiveGroups detail={detail} competitionCode={c.code} matches={matches}/>
    :<ArchiveKnockout detail={detail} matches={matches}/>}
  </>}
  {!isCup&&matches.length>0&&<section className="archive-panel"><SectionHeading title="Enfrentamientos oficiales" detail={matches.length+' cruces'}/><div className="archive-other-matches">{matches.map((m,i)=><div key={m.matchId??i}><h3>{archivePublicDescription(m.stage)}{archivePublicDescription(m.round)&&<small>{archivePublicDescription(m.round)}</small>}</h3><ArchiveMatchCards detail={detail} matches={[m]}/></div>)}</div></section>}
  {c.kind==='LEAGUE'&&promotionHomeLeague(data)?.code===c.code&&<LeaguePromotionHistory detail={detail}/>}
  {!isCup&&!worldOverall&&(!roundNames.length&&!links.length||(!matches.length&&!groups.length))&&<p className="archive-availability">{!roundNames.length&&!links.length&&<span>Sin desglose por Fecha disponible.</span>}{!matches.length&&!groups.length&&<span>Sin enfrentamientos oficiales disponibles.</span>}</p>}
 </div>;
}
function Iffhs({detail}:{detail:HistoryDetail}){
 const {data}=detail;
 return <section className="archive-panel archive-iffhs"><SectionHeading title="Ranking IFFHS" detail={data.iffhs.length?data.iffhs.length+' participantes':undefined}/><p className="archive-table-note">Puntos IFFHS de esta temporada, independientes del puntaje deportivo.</p>{data.iffhs.length?<div className="archive-table" role="region" aria-label="IFFHS de la temporada" tabIndex={0}><table><thead><tr><th scope="col">Posición</th><th scope="col">Participante</th><th scope="col">Puntos IFFHS</th></tr></thead><tbody>{[...data.iffhs].sort((a,b)=>b.points-a.points).map(r=><tr key={r.participantKey}><td><span className={'archive-position'+(r.position===1?' archive-position--first':'')}>{display(r.position)}</span></td><th scope="row"><Person data={data} id={r.participantKey}/></th><td className="archive-points">{decimals.format(r.points)}</td></tr>)}</tbody></table></div>:<Empty>Información IFFHS no disponible.</Empty>}</section>;
}
export function SeasonDetail({detail,competition,view}:{detail:HistoryDetail;competition?:string;view?:ArchiveView}){
 const {data,summary}=detail;
 const active=view||(competition?'competiciones':'resumen');
 const available=visibleArchiveCompetitions(data.competitions);
 const selected=available.find(c=>c.code===competition)||available.find(c=>c.code===promotionHomeLeague(data)?.code)||available[0];
 const root='#/historia/'+summary.number;
 const total=(key:'points'|'extras')=>data.statistics.length&&data.statistics.every(r=>r[key]!==null)?data.statistics.reduce((n,r)=>n+(r[key]??0),0):null;
 return <>
  <header className="archive-hero"><div className="archive-breadcrumb"><a href="#/historia">Historia</a><span aria-hidden="true">/</span><span>T{summary.number}</span></div><div className="archive-hero__row"><div><span className="archive-kicker">Temporada {summary.number}</span><h1>{summary.name}</h1><p>{summary.source==='mixed'?'Temporada histórica y oficial':summary.source==='imported'?'Temporada histórica':'Temporada oficial'}</p></div><span className="archive-edition" aria-hidden="true">T<strong>{summary.number}</strong></span></div><div className="archive-meta"><span><Icon name="user"/>{display(summary.participantCount)} participantes</span><span><Icon name="trophy"/>{summary.competitions.length} {summary.competitions.length===1?'competición':'competiciones'}</span></div></header>
  <nav className="archive-tabs" aria-label="Vistas de la temporada"><a href={root} aria-current={active==='resumen'?'page':undefined}><Icon name="book"/>Resumen</a><a href={competition?root+'/'+competition:root+'?view=competiciones'} aria-current={active==='competiciones'?'page':undefined}><Icon name="trophy"/>Competiciones</a><a href={root+'?view=iffhs'} aria-current={active==='iffhs'?'page':undefined}><Icon name="list"/>IFFHS</a></nav>
  {active==='resumen'?<>
   <div className="archive-metrics"><div><span>Participantes</span><strong>{display(summary.participantCount)}</strong></div><div><span>Competiciones</span><strong>{summary.competitions.length}</strong></div>{total('points')!==null&&<div><span>Puntos deportivos</span><strong>{total('points')}</strong></div>}{total('extras')!==null&&<div><span>Extras</span><strong>{total('extras')}</strong></div>}</div>
   <section><SectionHeading title="Protagonistas de la temporada"/><Podium detail={detail}/></section>
   <section><SectionHeading title="Competiciones disputadas" detail={summary.competitions.length.toString()}/><div className="archive-competition-grid">{summary.competitions.map(c=><a className="archive-competition-link" key={c.code} href={root+'/'+c.code}><Trophy code={c.code} name={c.name} season={summary.number}/><span><strong>{isWorldCupOverall(c.code)?'Prode Mundial':c.name}</strong><small>{isWorldCupOverall(c.code)?'Tabla general':c.kind==='LEAGUE'?'Tabla y resultados':'Grupos y eliminatorias'}</small></span><Icon name="arrow"/></a>)}</div></section>
   <a className="archive-ranking-link" href={root+'?view=iffhs'}><span className="archive-emblem"><Icon name="list"/></span><span><strong>IFFHS de la temporada</strong><small>{data.iffhs.length?data.iffhs.length+' participantes · Ver clasificación':'Información no disponible'}</small></span><Icon name="arrow"/></a>
  </>:active==='iffhs'?<Iffhs detail={detail}/>:<><nav className="archive-competition-tabs" aria-label="Competiciones de la temporada">{summary.competitions.map(c=><a key={c.code} aria-current={selected?.code===c.code?'page':undefined} href={root+'/'+c.code}>{isWorldCupOverall(c.code)?'Prode Mundial':c.name}</a>)}</nav>{selected?<CompetitionDetail key={selected.code} detail={detail} competition={selected}/>:<Empty>Competición sin información disponible.</Empty>}</>}
 </>;
}
export default function ParticipantArchive({route}:{route:string}){
 const [path,query='']=route.split('?');const [,number,competition]=path.split('/');
 const requested=new URLSearchParams(query).get('view');const view=requested==='iffhs'||requested==='competiciones'?requested:undefined;
 const [seasons,setSeasons]=useState<HistorySummary[]>([]),[detail,setDetail]=useState<HistoryDetail|null>(null);
 const [loading,setLoading]=useState(true),[error,setError]=useState(''),[revision,setRevision]=useState(0);
 const [search,setSearch]=useState(''),[kind,setKind]=useState('');
 useEffect(()=>{const controller=new AbortController();setLoading(true);setError('');
  fetch('/api/participant/history'+(number?'/'+number:''),{signal:controller.signal}).then(async res=>{const body=await res.json();if(!res.ok)throw Error(body.error||'No pudimos cargar Historia.');return body;}).then(body=>{if(controller.signal.aborted)return;if(number)setDetail(body);else setSeasons(body.seasons);setLoading(false);}).catch(e=>{if(!controller.signal.aborted){setError(e instanceof Error?e.message:'No pudimos cargar Historia.');setLoading(false);}});
  return ()=>controller.abort();
 },[number,revision]);
 if(loading)return <div className="participant-archive"><div className="archive-loading" role="status"><Icon name="book"/><h1>Historia</h1><p>Cargando temporadas y resultados…</p></div></div>;
 if(error)return <div className="participant-archive"><section className="archive-panel archive-error"><Icon name="book"/><h1>Historia</h1><p role="alert">{error}</p><div><button className="button button--primary" onClick={()=>setRevision(n=>n+1)}>Reintentar</button><a className="button button--secondary" href="#/historia">Volver a Historia</a></div></section></div>;
 if(number&&detail)return <div className="participant-archive"><SeasonDetail detail={detail} competition={competition} view={view}/></div>;
 const filtered=seasons.filter(s=>(s.number+' '+s.name).toLocaleLowerCase().includes(search.toLocaleLowerCase())&&(!kind||s.competitions.some(c=>c.kind===kind))).sort((a,b)=>b.number-a.number);
 return <div className="participant-archive"><header className="archive-hero"><div className="archive-hero__row"><div><span className="archive-kicker">Archivo TAFA</span><h1>Historia</h1><p>Temporadas, títulos y estadísticas</p></div><span className="archive-hero__icon"><Icon name="book"/></span></div><div className="archive-meta"><span>{seasons.length} {seasons.length===1?'temporada disponible':'temporadas disponibles'}</span></div></header><div className="archive-filters"><label><span>Buscar temporada</span><input type="search" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Número o nombre"/></label><label><span>Tipo de competición</span><select value={kind} onChange={e=>setKind(e.target.value)}><option value="">Todas las competiciones</option><option value="LEAGUE">Liga</option><option value="CUP">Copa</option><option value="TOURNAMENT">Torneo</option></select></label></div>
  {!filtered.length?<Empty>{seasons.length?'No hay temporadas para estos filtros.':'Todavía no hay temporadas históricas disponibles.'}</Empty>:<div className="archive-season-grid">{filtered.map(s=><article className="archive-season-card" key={s.number}><div className="archive-season-card__heading"><span className="archive-season-number">T{s.number}</span><span className="archive-source">{s.source==='official'?'Oficial':s.source==='mixed'?'Histórica / oficial':'Histórica'}</span></div><h2><a href={'#/historia/'+s.number}>{s.name}</a></h2><div className="archive-season-facts"><span>{s.competitions.length} {s.competitions.length===1?'competición':'competiciones'}</span>{s.participantCount!==null&&<span>{s.participantCount} participantes</span>}</div><ul className="archive-season-cups">{s.competitions.map(c=><li key={c.code}><Trophy code={c.code} name={c.name} season={s.number}/><span><strong>{isWorldCupOverall(c.code)?'Prode Mundial':c.name}</strong>{isWorldCupOverall(c.code)?<small>Tabla general</small>:c.champions.length>0?<small><span className="archive-champion-label">Campeón</span>{c.champions.join(' · ')}</small>:<small>Sin campeón declarado</small>}</span></li>)}</ul><a className="archive-season-cta" href={'#/historia/'+s.number}>Ver temporada<Icon name="arrow"/></a></article>)}</div>}
 </div>;
}
