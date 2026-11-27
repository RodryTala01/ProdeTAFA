import {useEffect,useRef,useState} from 'react';
import './draw-export.css';
type Match={id:number;kickoffAt:string;competitionName:string|null;matchType:string;home:{name:string;logoUrl:string|null};away:{name:string;logoUrl:string|null}};
const zone='America/Argentina/Buenos_Aires';
export default function RoundImageExport({name,matches}:{name:string;matches:Match[]}){
 const dialog=useRef<HTMLDialogElement>(null),[url,setUrl]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
 useEffect(()=>()=>{if(url)URL.revokeObjectURL(url);},[url]);
 async function prepare(){
 setBusy(true);setError('');
 try{
 await document.fonts.ready;
 const ordered=[...matches].sort((a,b)=>Date.parse(a.kickoffAt)-Date.parse(b.kickoffAt)||a.id-b.id);
 const day=(s:string)=>new Intl.DateTimeFormat('es-AR',{timeZone:zone,weekday:'long',day:'2-digit',month:'2-digit'}).format(new Date(s));
 const groups=new Map<string,Match[]>();for(const m of ordered){const key=day(m.kickoffAt);groups.set(key,[...(groups.get(key)||[]),m]);}
 const urls=[...new Set(['/brand/tafa.png',...ordered.flatMap(m=>[m.home.logoUrl,m.away.logoUrl]).filter((s):s is string=>Boolean(s))])];
 const images=new Map(await Promise.all(urls.map(src=>new Promise<[string,HTMLImageElement|null]>(resolve=>{const image=new Image();image.crossOrigin='anonymous';let done=false;const finish=(value:HTMLImageElement|null)=>{if(done)return;done=true;clearTimeout(timer);resolve([src,value]);};const timer=setTimeout(()=>finish(null),5000);image.onload=()=>finish(image);image.onerror=()=>finish(null);image.src=src;}))));
 const canvas=document.createElement('canvas');canvas.width=1080;canvas.height=240+groups.size*66+ordered.length*128;
 const context=canvas.getContext('2d');if(!context)throw new Error('No se pudo crear la imagen.');const c:CanvasRenderingContext2D=context;
 c.fillStyle='#272249';c.fillRect(0,0,1080,canvas.height);c.textBaseline='middle';
 function text(value:string,x:number,y:number,size:number,color='#ffffff',max=900){c.fillStyle=color;while(size>15){c.font=`700 ${size}px sans-serif`;if(c.measureText(value).width<=max)break;size--;}c.fillText(value,x,y,max);}
 function image(src:string|null,x:number,y:number,size:number){const img=src?images.get(src):null;if(!img)return;const scale=Math.min(size/img.naturalWidth,size/img.naturalHeight);c.drawImage(img,x+(size-img.naturalWidth*scale)/2,y+(size-img.naturalHeight*scale)/2,img.naturalWidth*scale,img.naturalHeight*scale);}
 image('/brand/tafa.png',38,28,108);text('PRODE TAFA',174,62,26,'#c8fa54');text(name,174,113,42,'#ffffff',855);text('HORARIOS DE ARGENTINA',48,183,18,'#c9c4de');
 let y=220;
 for(const [date,items] of groups){text(date.toLocaleUpperCase('es-AR'),48,y+24,25,'#c8fa54');y+=66;for(const m of items){c.fillStyle='#39325d';c.fillRect(40,y,1000,116);image(m.home.logoUrl,440,y+12,54);image(m.away.logoUrl,586,y+12,54);c.textAlign='right';text(m.home.name,420,y+40,28,'#ffffff',365);c.textAlign='left';text(m.away.name,660,y+40,28,'#ffffff',365);text('VS',520,y+40,22,'#c9c4de');const time=new Intl.DateTimeFormat('es-AR',{timeZone:zone,hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date(m.kickoffAt));text(time+' hs'+(m.matchType==='PENALTIES_ONLY'?' · Penales':''),465,y+88,20,'#ffffff',520);text(m.competitionName||'',56,y+90,17,'#c9c4de',390);y+=128;}}
 const blob=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error('No se pudo exportar PNG.')),'image/png'));
 setUrl(URL.createObjectURL(blob));dialog.current?.showModal();
 }catch(e){setError(e instanceof Error?e.message:'No se pudo generar la imagen.');}finally{setBusy(false);}
 }
 return <div className="draw-export"><button type="button" className="button button--secondary" disabled={busy||!matches.length} onClick={()=>void prepare()}>{busy?'Preparando imagen…':'Descargar imagen de la Fecha'}</button>{error&&<p role="alert">{error}</p>}<dialog ref={dialog} className="draw-export-dialog" aria-label="Imagen de la Fecha"><header><h3>{name}</h3><button className="button button--secondary" onClick={()=>dialog.current?.close()}>Cerrar</button></header>{url&&<div className="draw-export-preview"><img src={url} alt={'Partidos de '+name}/><a className="button button--primary" href={url} download={'prode-tafa-fecha.png'}>Descargar PNG</a></div>}</dialog></div>;
}
