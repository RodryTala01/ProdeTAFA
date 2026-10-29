import {useEffect,useState,type ChangeEvent} from 'react';
import type {ArchivePayload} from './historical-schema';
import {archiveTables} from './historical-schema';
import {createHistoricalTemplate,parseHistoricalWorkbook,downloadArchiveBlob} from './historical-xlsx';
import './admin-historical.css';

type Preview={ok:boolean;errors:string[];warnings:string[];counts:Record<string,number>;sha256:string;season:{number:number;name:string}|null};
type Entry={id:number;seasonNumber:number;seasonName:string;sourceName:string;sha256:string;counts:Record<string,number>;status:'active'|'reverted';createdAt:string;revertedAt:string|null;revertReason:string|null;createdBy:string|null};
const label:Record<string,string>={participants:'Participantes',competitions:'Competiciones',statistics:'Estadísticas',standings:'Tablas',rounds:'Fechas',results:'Resultados',matches:'Cruces',movements:'Movimientos',iffhs:'IFFHS'};
async function api<T>(path:string,method='GET',payload?:unknown):Promise<T>{
 const r=await fetch(path,{method,credentials:'same-origin',headers:{'content-type':'application/json'},body:payload?JSON.stringify(payload):undefined});
 const data=await r.json().catch(()=>({})) as T & {error?:string};
 if(!r.ok)throw Error(data.error||'Error al consultar el archivo histórico');
 return data;
}
export default function AdminHistoricalArchive(){
 const [seasonNumber,setSeasonNumber]=useState(1),[name,setName]=useState(''),[payload,setPayload]=useState<ArchivePayload|null>(null);
 const [preview,setPreview]=useState<Preview|null>(null),[entries,setEntries]=useState<Entry[]>([]);
 const [users,setUsers]=useState<Array<{id:string;fullName:string}>>([]);
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const [confirm,setConfirm]=useState(false),[revert,setRevert]=useState<Entry|null>(null),[reason,setReason]=useState('');
 const [details,setDetails]=useState<{entry:Entry;data:ArchivePayload}|null>(null);
 async function reload(){const data=await api<{imports:Entry[]}>('/api/admin/historical-imports');setEntries(data.imports);}
 useEffect(()=>{void reload().catch(()=>setError('No pudimos consultar el historial de importaciones.'));void api<{users:Array<{id:string;fullName:string}>}>('/api/admin/users').then(x=>setUsers(x.users)).catch(()=>{});},[]);
 async function upload(event:ChangeEvent<HTMLInputElement>){
  const file=event.target.files?.[0];if(!file)return;
  setError('');setNotice('');setPreview(null);setPayload(null);setName(file.name);setConfirm(false);setBusy(true);
  try{
   const imported=file.name.toLowerCase().endsWith('.json')
    ?JSON.parse(await file.text()) as ArchivePayload
    :await parseHistoricalWorkbook(file);
   const result=await api<Preview>('/api/admin/historical-imports/preview','POST',{data:imported});
   setPayload(imported);setPreview(result);setSeasonNumber(imported.season.number);
  }catch(err){setError(err instanceof Error?err.message:'No se pudo interpretar el archivo');}
  finally{setBusy(false);event.target.value='';}
 }
 async function importSeason(){
  if(!payload||!preview?.ok||!confirm||busy)return;
  setBusy(true);setError('');setNotice('');
  try{
   const result=await api<{id:number;seasonNumber:number}>('/api/admin/historical-imports','POST',{data:payload,sha256:preview.sha256,sourceName:name});
   setNotice('T'+result.seasonNumber+' importada correctamente. ID de carga: '+result.id+'.');
   setPayload(null);setPreview(null);setConfirm(false);await reload();
  }catch(e){setError(e instanceof Error?e.message:'No se pudo guardar la temporada');}
  finally{setBusy(false);}
 }
 async function revertImport(){
  if(!revert||busy||reason.trim().length<5)return;
  setBusy(true);setError('');setNotice('');
  try{
   await api('/api/admin/historical-imports/'+revert.id+'/revert','POST',{seasonNumber:revert.seasonNumber,sha256:revert.sha256,reason});
   setNotice('Se revirtió la importación #'+revert.id+' de T'+revert.seasonNumber+'. Los datos dejaron de sumarse; el historial permanece.');
   setRevert(null);setReason('');setDetails(null);await reload();
  }catch(e){setError(e instanceof Error?e.message:'No se pudo revertir la carga');}
  finally{setBusy(false);}
 }
 async function inspect(entry:Entry){
  setBusy(true);setError('');
  try{const record=await api<{import:{data:ArchivePayload}}>('/api/admin/historical-imports/'+entry.id);setDetails({entry,data:record.import.data});}
  catch(e){setError(e instanceof Error?e.message:'No pudimos abrir esta carga');}
  finally{setBusy(false);}
 }
 function getTemplate(){
  downloadArchiveBlob(createHistoricalTemplate(seasonNumber,undefined,users),'TAFA_Plantilla_Archivo_T'+seasonNumber+'.xlsx');
 }
 const active=entries.filter(e=>e.status==='active').length;
 return <section className="history-admin">
   <header className="panel-heading"><div><span className="eyebrow">ADMINISTRACIÓN · ARCHIVO</span><h1>Archivo histórico</h1><p>Cargá una temporada por vez. Cada carga tiene vista previa, origen y reversión independiente.</p></div><div className="history-count">{active} temporadas cargadas</div></header>
   {error&&<p role="alert" className="alert alert--error">{error}</p>}
   {notice&&<p role="status" className="admin-success">{notice}</p>}
   <div className="history-admin-grid">
    <section className="card panel form-stack history-import-panel">
      <h2>1. Preparar temporada</h2>
      <p>Completá el Excel oficial. Podés dejar vacías las hojas de competiciones que no existieron; la hoja Competiciones solo debe incluir los torneos realmente jugados.</p>
      <label className="field"><span>Número de temporada para plantilla</span><input type="number" min="1" max="500" value={seasonNumber} onChange={e=>setSeasonNumber(Math.max(1,Math.floor(Number(e.target.value)||1)))}/></label>
      <button className="button button--secondary" onClick={getTemplate}>Descargar plantilla Excel (.xlsx)</button>
      <label className="field"><span>2. Seleccionar archivo T{seasonNumber}</span><input type="file" accept=".xlsx,.json" onChange={e=>void upload(e)} disabled={busy}/></label>
      <p className="sport-footnote">La plantilla funciona también como respaldo. Podés importar Excel completo o un archivo JSON previamente exportado por el sistema.</p>
      {busy&&<p role="status">Procesando…</p>}
      {preview&&<section className="history-preview" aria-label="Vista previa de importación">
        <h3>3. Vista previa: T{preview.season?.number} · {preview.season?.name}</h3>
        <p>Archivo: {name}. Huella SHA-256: <code>{preview.sha256.slice(0,16)}…</code></p>
        <div className="history-counts">{archiveTables.map(k=><div key={k}><strong>{preview.counts[k]??0}</strong><span>{label[k]}</span></div>)}</div>
        {preview.warnings.length>0&&<div className="history-warnings"><strong>Observaciones para revisar</strong><ul>{preview.warnings.map(w=><li key={w}>{w}</li>)}</ul></div>}
        {preview.errors.length>0&&<div className="alert alert--error"><strong>Problemas que impiden la carga</strong><ul>{preview.errors.map((s,i)=><li key={i}>{s}</li>)}</ul></div>}
        {preview.ok&&<><label className="history-check"><input type="checkbox" checked={confirm} onChange={e=>setConfirm(e.target.checked)}/> Revisé los datos, las observaciones y autorizo confirmar esta temporada.</label><button className="button button--primary" disabled={!confirm||busy} onClick={()=>void importSeason()}>Confirmar importación de T{preview.season?.number}</button></>}
      </section>}
    </section>
    <section className="card panel">
      <h2>Historial de importaciones</h2>
      <p>Las cargas revertidas permanecen registradas para auditoría. Una temporada revertida puede importarse de nuevo corregida.</p>
      {!entries.length?<p>Todavía no hay importaciones. Empezá por T1.</p>:
      <div className="history-list">{entries.map(entry=><article className="history-item" key={entry.id}>
       <div className="history-item-head"><div><strong>T{entry.seasonNumber} · {entry.seasonName}</strong><small>#{entry.id} · {entry.createdAt} · {entry.createdBy??'Admin'}</small></div><span className={'history-status history-status--'+entry.status}>{entry.status==='active'?'Activa':'Revertida'}</span></div>
       <small>Origen: {entry.sourceName}</small>
       <div className="history-item-buttons"><button className="button button--ghost" disabled={busy} onClick={()=>void inspect(entry)}>Detalle / respaldo</button>{entry.status==='active'&&<button className="button button--secondary" disabled={busy} onClick={()=>{setRevert(entry);setReason('');}}>Revertir carga</button>}</div>
       {entry.status==='reverted'&&<p className="sport-footnote">Revertida: {entry.revertedAt}. {entry.revertReason}</p>}
      </article>)}</div>}
    </section>
   </div>
   {details&&<section className="card panel history-details"><div className="panel-heading"><div><h2>Respaldo T{details.entry.seasonNumber} · Carga #{details.entry.id}</h2><p>El respaldo conserva exactamente las hojas de esta importación.</p></div><button className="button button--ghost" onClick={()=>setDetails(null)}>Cerrar</button></div>
      <div className="history-counts">{archiveTables.map(k=><div key={k}><strong>{details.entry.counts[k]??0}</strong><span>{label[k]}</span></div>)}</div>
      <button className="button button--secondary" onClick={()=>downloadArchiveBlob(createHistoricalTemplate(details.entry.seasonNumber,details.data,users),'TAFA_Respaldo_T'+details.entry.seasonNumber+'_Importacion_'+details.entry.id+'.xlsx')}>Descargar respaldo Excel</button>
      <button className="button button--ghost" onClick={()=>downloadArchiveBlob(new Blob([JSON.stringify(details.data,null,2)],{type:'application/json'}),'TAFA_Archivo_T'+details.entry.seasonNumber+'_'+details.entry.id+'.json')}>Descargar respaldo JSON</button>
   </section>}
   {revert&&<div className="modal-backdrop"><section className="modal card history-revert" role="dialog" aria-modal="true" aria-label="Revertir importación histórica">
     <h2>Revertir T{revert.seasonNumber} · Importación #{revert.id}</h2>
     <p>Los datos dejarán de aparecer en Mi Club, rankings e historiales. El archivo y la auditoría se conservan. No afecta las demás temporadas ni los pronósticos oficiales.</p>
     <label className="field"><span>Motivo obligatorio</span><textarea rows={3} value={reason} onChange={e=>setReason(e.target.value)} placeholder="Ej.: tabla de posiciones mal interpretada"/></label>
     <div className="modal-actions"><button className="button button--ghost" disabled={busy} onClick={()=>setRevert(null)}>Cancelar</button><button className="button button--danger" disabled={busy||reason.trim().length<5} onClick={()=>void revertImport()}>Confirmar reversión de T{revert.seasonNumber}</button></div>
   </section></div>}
 </section>;
}
