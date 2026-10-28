import {useEffect,useState,type FormEvent} from 'react';

type Team={entryId:number;nickname:string;captainUserId:string;canRename:boolean;members:Array<{userId:string;fullName:string}>};
export default function DuoNameEditor({competitionId,season,onSaved}:{competitionId:number;season:number;onSaved?:()=>void}){
 const [team,setTeam]=useState<Team|null>(null),[name,setName]=useState(''),[loading,setLoading]=useState(true);
 const [error,setError]=useState(''),[success,setSuccess]=useState(''),[saving,setSaving]=useState(false);
 useEffect(()=>{
  const controller=new AbortController();setLoading(true);setError('');
  fetch(`/api/competition-engine/competitions/${competitionId}/duos/my-team`,{signal:controller.signal})
    .then(async r=>{if(!r.ok)throw Error('No se pudo cargar el nombre del dúo');return r.json();})
    .then(d=>{if(controller.signal.aborted)return;setTeam(d.team??null);setName(d.team?.nickname??'');})
    .catch(()=>{if(!controller.signal.aborted)setError('No pudimos obtener los datos de tu dúo.');})
    .finally(()=>{if(!controller.signal.aborted)setLoading(false);});
  return ()=>controller.abort();
 },[competitionId,season]);
 async function submit(event:FormEvent){
  event.preventDefault();if(!team?.canRename||saving)return;
  setSaving(true);setError('');setSuccess('');
  try{
   const r=await fetch(`/api/competition-engine/competitions/${competitionId}/duos/my-team`,{
    method:'PUT',headers:{'content-type':'application/json'},body:JSON.stringify({name})});
   const d=await r.json();
   if(!r.ok)throw Error(d.error??'No se pudo cambiar el nombre');
   setTeam({...team,nickname:d.nickname});setName(d.nickname);
   setSuccess('Nombre actualizado. Los integrantes siguen visibles en las tablas.');
   onSaved?.();
  }catch(e){setError(e instanceof Error?e.message:'No se pudo guardar el nombre');}
  finally{setSaving(false);}
 }
 if(loading)return <p role="status">Cargando tu dúo…</p>;
 if(!team)return error?<p role="alert">{error}</p>:null;
 return <section className="reference-section duo-name-box" aria-label="Nombre de tu dúo">
  <h2>Tu dúo · {team.nickname}</h2>
  <p>{team.members.map(m=>m.fullName).join(' + ')}</p>
  <small>{team.canRename?'Sos el capitán. Podés elegir un nombre divertido para el equipo.':'Solo el capitán puede cambiar el nombre del equipo.'}</small>
  {team.canRename&&<form onSubmit={submit} className="duo-name-form">
   <label className="field"><span>Nombre del dúo</span><input maxLength={32} minLength={3} required value={name} onChange={e=>setName(e.target.value)} placeholder="Ej.: Los Biscochotes"/></label>
   <button className="button button--primary" type="submit" disabled={saving||name.trim().length<3}>{saving?'Guardando…':'Guardar nombre'}</button>
  </form>}
  {error&&<p role="alert">{error}</p>}
  {success&&<p role="status">{success}</p>}
 </section>;
}