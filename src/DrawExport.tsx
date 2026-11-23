import {useEffect,useRef,useState} from 'react';
import {renderDrawImages,type DrawImage} from './draw-image';
import './draw-export.css';

export default function DrawExport({build,disabled=false}:{build:()=>DrawImage|Promise<DrawImage>;disabled?:boolean}){
 const dialog=useRef<HTMLDialogElement>(null);
 const [images,setImages]=useState<string[]>([]);
 const [title,setTitle]=useState('');
 const [zoom,setZoom]=useState(false);
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState('');
 useEffect(()=>()=>images.forEach(url=>URL.revokeObjectURL(url)),[images]);
 async function prepare(){
  setBusy(true);setError('');
  try{
   const model=await build();
   const blobs=await renderDrawImages(model);
   setZoom(false);
   setTitle(model.competitionName+' · T'+model.season+' · '+model.phase);
   setImages(blobs.map(blob=>URL.createObjectURL(blob)));
   dialog.current?.showModal();
  }catch(error){setError(error instanceof Error?error.message:'No pudimos preparar la imagen.');}
  finally{setBusy(false);}
 }
 return <div className="draw-export">
  <button type="button" className="button button--secondary" disabled={busy||disabled} onClick={()=>void prepare()}>
   {busy?'Preparando imagen…':'Descargar imagen del sorteo'}
  </button>
  {error&&<p role="alert">{error}</p>}
  <dialog ref={dialog} className="draw-export-dialog" aria-label="Vista previa de la imagen del sorteo">
   <header><h3>{title}</h3><button type="button" className="button button--ghost" onClick={()=>dialog.current?.close()}>Cerrar</button></header>
   <button type="button" className="button button--secondary" aria-pressed={zoom} onClick={()=>setZoom(value=>!value)}>{zoom?'Ajustar imagen':'Ampliar imagen'}</button>
   <div className={'draw-export-preview'+(zoom?' draw-export-preview--zoom':'')}>{images.map((url,index)=><figure key={url}>
    <img src={url} alt={title+(images.length>1?' · Parte '+(index+1):'')}/>
    <figcaption><a className="button button--primary" href={url} download={'prode-tafa-sorteo-'+(index+1)+'.png'}>Descargar PNG{images.length>1?' · Parte '+(index+1):''}</a></figcaption>
   </figure>)}</div>
  </dialog>
 </div>;
}
