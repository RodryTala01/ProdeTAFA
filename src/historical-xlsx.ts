import type {ArchivePayload} from '../worker/historical-archive';
import {archiveTables,archiveColumns} from '../worker/historical-archive';

const names:{[K in keyof ArchivePayload]?:string}={
 participants:'Participantes',competitions:'Competiciones',statistics:'Estadisticas',standings:'Tablas',
 rounds:'Fechas',results:'Resultados',matches:'Cruces',movements:'Movimientos',iffhs:'IFFHS',
};
const esc=(v:unknown)=>String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const alphabet=(index:number)=>{let s='';for(let i=index+1;i>0;i=Math.floor((i-1)/26))s=String.fromCharCode(65+(i-1)%26)+s;return s;};
const xmlStart='<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
function sheetXml(rows:unknown[][]){
 let body='';
 for(let i=0;i<rows.length;i++){
  const cells=rows[i].map((v,j)=>{
   if(v===null||v===undefined||v==='')return '';
   const ref=alphabet(j)+(i+1);
   if(typeof v==='number'&&Number.isFinite(v))return '<c r="'+ref+'"><v>'+v+'</v></c>';
   return '<c r="'+ref+'" t="inlineStr"><is><t>'+esc(v)+'</t></is></c>';
  }).join('');
  body+='<row r="'+(i+1)+'">'+cells+'</row>';
 }
 return xmlStart+'<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><sheetData>'+body+'</sheetData></worksheet>';
}
const encoder=new TextEncoder();
const u16=(b:Uint8Array,i:number,v:number)=>{b[i]=v&255;b[i+1]=(v>>8)&255;};
const u32=(b:Uint8Array,i:number,v:number)=>{u16(b,i,v);u16(b,i+2,v>>>16);};
function crc32(buffer:Uint8Array){let c=0xffffffff;for(const b of buffer){c^=b;for(let i=0;i<8;i++)c=(c>>>1)^((c&1)?0xedb88320:0);}return (c^0xffffffff)>>>0;}
function zipStored(files:Array<[string,string]>){
 const local:Uint8Array[]=[],central:Uint8Array[]=[];let position=0;
 for(const [name,content] of files){
  const n=encoder.encode(name),v=encoder.encode(content),crc=crc32(v);
  const h=new Uint8Array(30+n.length);u32(h,0,0x04034b50);u16(h,4,20);u16(h,8,0);u32(h,14,crc);u32(h,18,v.length);u32(h,22,v.length);u16(h,26,n.length);h.set(n,30);
  const d=new Uint8Array(46+n.length);u32(d,0,0x02014b50);u16(d,4,20);u16(d,6,20);u32(d,16,crc);u32(d,20,v.length);u32(d,24,v.length);u16(d,28,n.length);u32(d,42,position);d.set(n,46);
  local.push(h,v);central.push(d);position+=h.length+v.length;
 }
 const cenLen=central.reduce((n,b)=>n+b.length,0),tail=new Uint8Array(22);
 u32(tail,0,0x06054b50);u16(tail,8,files.length);u16(tail,10,files.length);u32(tail,12,cenLen);u32(tail,16,position);
 const total=position+cenLen+tail.length,out=new Uint8Array(total);let p=0;
 for(const b of [...local,...central,tail]){out.set(b,p);p+=b.length;}
 return out;
}
export function createHistoricalTemplate(seasonNumber=1,data?:ArchivePayload,users:Array<{id:string;fullName:string}>=[]){
 const sheets:Array<[string,unknown[][]]>=[
  ['Temporada',[['campo','valor'],['version',1],['number',data?.season.number??seasonNumber],['name',data?.season.name??'Temporada '+seasonNumber],['kind',data?.season.kind??'MIXTA'],['notes',data?.season.notes??'']]],
  ...archiveTables.map(table=>[names[table]!,[Array.from(archiveColumns[table]),...(data?.[table]??[]).map(row=>archiveColumns[table].map(column=>(row as unknown as Record<string,unknown>)[column]??''))]] as [string,unknown[][]]),
  ['Catalogo TAFA',[['userId','fullName'],...users.map(u=>[u.id,u.fullName])]],
  ['LEEME',[
   ['ARCHIVO HISTORICO TAFA','INSTRUCCIONES'],
   ['Uso','Una importación por temporada; las hojas sin datos se dejan solo con encabezados.'],
   ['Participantes','key: clave única histórica (ej. RODRI), name: nombre histórico, userId: ID actual de TAFA o vacío, division: opcional.'],
   ['Competiciones','Solo incluir competiciones efectivamente disputadas. kind: LEAGUE, CUP, TOURNAMENT o PROMOTION.'],
   ['Estadisticas','Totales generales de cada participante por temporada. Obligatorio points; demás cifras opcionales.'],
   ['Tablas','Clasificación final por competición. position >= 1. No duplicar los puntos globales por haber dos tablas.'],
   ['Fechas','Puntos de cada Fecha por participante, si existen.'],
   ['Resultados','Cada premio/fase registrado; resultCode: CHAMPION, RUNNER_UP, SEMIFINAL, etc.'],
   ['Cruces','Solo enfrentamientos directos oficiales. scoreBasis: INDIVIDUAL o DUO.'],
   ['Movimientos','type: ASCENSO, DESCENSO, PERMANENCIA u OTRO.'],
   ['IFFHS','Puntos IFFHS de esa temporada (separados de los puntos deportivos).'],
   ['Validación','El importador muestra vista previa, nombres sin vincular y controles antes de confirmar.'],
   ['Reversión','Una carga se puede revertir desde el historial sin tocar datos oficiales ni otras temporadas.'],
  ]]
 ];
 const sheetTags=sheets.map(([n],i)=>'<sheet name="'+esc(n)+'" sheetId="'+(i+1)+'" r:id="rId'+(i+1)+'"/>').join('');
 const workbook=xmlStart+'<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>'+sheetTags+'</sheets></workbook>';
 const rels=xmlStart+'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'+sheets.map((_,i)=>'<Relationship Id="rId'+(i+1)+'" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet'+(i+1)+'.xml"/>').join('')+'</Relationships>';
 const types=xmlStart+'<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>'+sheets.map((_,i)=>'<Override PartName="/xl/worksheets/sheet'+(i+1)+'.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>').join('')+'</Types>';
 const files:Array<[string,string]>=[['[Content_Types].xml',types],['_rels/.rels',xmlStart+'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>'],['xl/workbook.xml',workbook],['xl/_rels/workbook.xml.rels',rels],...sheets.map(([n,rows],i)=>['xl/worksheets/sheet'+(i+1)+'.xml',sheetXml(rows)] as [string,string])];
 return new Blob([zipStored(files) as BlobPart],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
}
function r16(b:Uint8Array,p:number){return b[p]|b[p+1]<<8;}
function r32(b:Uint8Array,p:number){return (b[p]|b[p+1]<<8|b[p+2]<<16|b[p+3]<<24)>>>0;}
async function readZip(file:File):Promise<Map<string,string>>{
 if(file.size>9_000_000)throw Error('Excel demasiado grande (máximo 9 MB)');
 const bytes=new Uint8Array(await file.arrayBuffer());let end=-1;
 for(let i=bytes.length-22;i>=Math.max(0,bytes.length-65557);i--){if(r32(bytes,i)===0x06054b50){end=i;break;}}
 if(end<0)throw Error('Archivo Excel ZIP inválido');
 const files=new Map<string,string>(),count=r16(bytes,end+10);let p=r32(bytes,end+16);
 if(count>150)throw Error('Demasiados archivos internos en Excel');
 for(let i=0;i<count;i++){
  if(r32(bytes,p)!==0x02014b50)throw Error('Directorio ZIP inválido');
  const method=r16(bytes,p+10),size=r32(bytes,p+20),nameLen=r16(bytes,p+28),extra=r16(bytes,p+30),comment=r16(bytes,p+32);
  const name=new TextDecoder().decode(bytes.slice(p+46,p+46+nameLen)),local=r32(bytes,p+42);
  if(local+30>bytes.length)throw Error('Archivo truncado');
  const start=local+30+r16(bytes,local+26)+r16(bytes,local+28);
  if(size>6_000_000||start+size>bytes.length)throw Error('Hoja demasiado grande');
  const compressed=bytes.slice(start,start+size);let unpacked:Uint8Array;
  if(method===0)unpacked=compressed;
  else if(method===8){
   if(typeof DecompressionStream==='undefined')throw Error('El navegador no permite leer archivos XLSX comprimidos');
   unpacked=new Uint8Array(await new Response(new Blob([compressed as BlobPart]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).arrayBuffer());
  }else if(name.endsWith('.xml'))throw Error('Compresión Excel no soportada');
  else{p+=46+nameLen+extra+comment;continue;}
  if(unpacked.length>10_000_000)throw Error('Hoja descomprimida demasiado grande');
  if(name.endsWith('.xml')||name.endsWith('.rels'))files.set(name.replace(/^\/+/,''),new TextDecoder().decode(unpacked));
  p+=46+nameLen+extra+comment;
 }
 return files;
}
const parseXml=(text:string)=>{const doc=new DOMParser().parseFromString(text,'application/xml');if(doc.querySelector('parsererror'))throw Error('XML de Excel inválido');return doc;};
const nodes=(parent:Element|Document,name:string)=>Array.from(parent.getElementsByTagName('*')).filter(element=>(element.localName??element.tagName?.split(':').at(-1))===name);
function sheetRows(xml:string,shared:string[]){
 const doc=parseXml(xml),rows:unknown[][]=[];
 for(const row of nodes(doc,'row')){
  const values:unknown[]=[];
  for(const cell of Array.from(row.children).filter(c=>c.localName==='c')){
   const match=/^([A-Z]+)\d+$/.exec(cell.getAttribute('r')??'');if(!match)continue;
   let col=0;for(const ch of match[1])col=col*26+ch.charCodeAt(0)-64;col-=1;
   if(col>100)continue;
   const v=nodes(cell,'v')[0]?.textContent??'';
   const t=cell.getAttribute('t');let value:unknown=v;
   if(t==='inlineStr')value=nodes(cell,'t').map(x=>x.textContent??'').join('');
   else if(t==='s')value=shared[Number(v)]??'';
   else if(t==='b')value=v==='1';
   else if(t!=='str'&&v!==''&&Number.isFinite(Number(v)))value=Number(v);
   values[col]=value;
  }
  rows.push(values);
 }
 return rows;
}
export async function parseHistoricalWorkbook(file:File):Promise<ArchivePayload>{
 if(!/\.xlsx$/i.test(file.name))throw Error('Seleccioná un archivo .xlsx');
 const files=await readZip(file);
 const wb=parseXml(files.get('xl/workbook.xml')??'');
 const rel=parseXml(files.get('xl/_rels/workbook.xml.rels')??'');
 const paths=new Map(nodes(rel,'Relationship').map(e=>[e.getAttribute('Id'),e.getAttribute('Target')??'']));
 const sharedDoc=files.get('xl/sharedStrings.xml');
 const shared=sharedDoc?nodes(parseXml(sharedDoc),'si').map(e=>nodes(e,'t').map(t=>t.textContent??'').join('')):[];
 const sheets=new Map<string,unknown[][]>();
 for(const sh of nodes(wb,'sheet')){
  const name=sh.getAttribute('name')??'';
  const id=sh.getAttribute('r:id')??sh.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships','id');
  const target=(id?paths.get(id):null)||('worksheets/sheet'+(sh.getAttribute('sheetId')??'')+'.xml');
  const resolved=target.startsWith('/')?target.slice(1):target.startsWith('xl/')?target:'xl/'+target.replace(/^\.\//,'');
  const xml=files.get(resolved);if(xml)sheets.set(name,sheetRows(xml,shared));
 }
 const meta=sheets.get('Temporada');if(!meta)throw Error('Falta la hoja Temporada');
 const metadata=Object.fromEntries(meta.slice(1).filter(r=>r[0]).map(r=>[String(r[0]),r[1]]));
 const data:Record<string,unknown>={version:1,season:{number:Number(metadata.number),name:String(metadata.name??''),kind:String(metadata.kind??''),notes:String(metadata.notes??'')}};
 for(const table of archiveTables){
  const rows=sheets.get(names[table]!);
  if(!rows)throw Error('Falta la hoja '+names[table]);
  const headers=rows[0]?.map(String)??[];
  const expected=Array.from(archiveColumns[table]);
  if(expected.some(c=>!headers.includes(c)))throw Error('Encabezados incorrectos en '+names[table]+'. Descargá la plantilla vigente.');
  data[table]=rows.slice(1).filter(r=>r.some(v=>v!==undefined&&v!==null&&v!=='')).map(r=>Object.fromEntries(expected.map(k=>[k,r[headers.indexOf(k)]??''])));
 }
 return data as unknown as ArchivePayload;
}
export function downloadArchiveBlob(blob:Blob,name:string){
 const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
