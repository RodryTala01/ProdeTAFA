import {useState} from 'react';
import {ClubProfile,HeadToHead} from '../ParticipantClub';
import {HistoryList,HistoryDetail} from '../ParticipantHistory';
import {ParticipantState} from '../ParticipantState';
import {clubExample,historyExample} from './club-fixtures';
import {Brand} from '../ui';
export default function ClubPreview({initial}:{initial:string}) {
  const [view,setView]=useState(initial);
  return <><div className="design-notice">VISTA DEV · DATOS FICTICIOS · SIN REQUESTS</div><main className="app-shell"><header className="topbar"><Brand/></header><nav className="club-links" aria-label="Vistas de diseño">{['club','profile','history','head-to-head','empty','error'].map(v=><button className="button button--ghost" key={v} onClick={()=>setView(v)} aria-pressed={v===view}>{({club:'Mi Club',profile:'Perfil',history:'Historial','head-to-head':'Enfrentamientos',empty:'Sin datos',error:'Error'}[v])}</button>)}</nav>{view==='head-to-head'?<HeadToHead/>:view==='history'?<><HistoryList rounds={clubExample.profile.rounds}/><HistoryDetail data={historyExample} participantId="demo-1" currentUserId="demo-1" onSelect={()=>{}}/></>:view==='error'?<ParticipantState error="No pudimos cargar tu historial." retry={()=>setView('history')}/>:<ClubProfile own={view!=='profile'} data={view==='empty'?{...clubExample,profile:{...clubExample.profile,rounds:[]},overview:{...clubExample.overview,season:null},league:null}:clubExample}/>}</main></>;
}
