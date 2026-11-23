import {useEffect,useState} from 'react';
import {readCompetition,competitionHref} from './participant-competitions';
export default function DuoCaptainNotice({competitionId,season}:{competitionId:number;season:number}){
 const [show,setShow]=useState(false);
 useEffect(()=>{const controller=new AbortController();readCompetition<{team:{canRename:boolean;needsName:boolean}|null}>(`/api/competition-engine/competitions/${competitionId}/duos/my-team`,controller.signal).then(d=>setShow(!!d.team?.canRename&&d.team.needsName)).catch(()=>{});return()=>controller.abort();},[competitionId]);
 return show?<aside className="alert" role="status"><strong>Sos capitán de tu dúo. Tenés que elegir su nombre.</strong><a className="button button--secondary" href={competitionHref('COPA_DUOS',season)}>Elegir nombre del dúo</a></aside>:null;
}
