import {describe,expect,it} from 'vitest';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {readFileSync} from 'node:fs';
import {inflateSync} from 'node:zlib';
import {participantNameKey,participantNamedAsset,participantNameAssets,participantShieldKeys,participantAsset} from '../src/competition-assets';
import {ParticipantShield} from '../src/AssetImage';
import {SubmissionLists} from '../src/AdminRoundSubmissions';
function crc32(bytes:Uint8Array){let c=0xffffffff;for(const b of bytes){c^=b;for(let i=0;i<8;i++)c=(c>>>1)^((c&1)?0xedb88320:0);}return (c^0xffffffff)>>>0;}
describe('escudos originales de participantes',()=>{
 it('los 64 escudos suministrados son PNG íntegros con datos decodificables, no un atlas corrupto',()=>{
  expect(Object.keys(participantNameAssets)).toHaveLength(64);
  for(const url of new Set([...Object.values(participantNameAssets),...Object.keys(participantShieldKeys).map(id=>participantAsset(id)!)])){
   const bytes=readFileSync('public'+url);expect(bytes.subarray(0,8).toString('hex'),url).toBe('89504e470d0a1a0a');
   const imageData:Buffer[]=[];let p=8,ended=false;
   while(p+12<=bytes.length){const length=bytes.readUInt32BE(p),end=p+8+length;expect(end+4,url).toBeLessThanOrEqual(bytes.length);const kind=bytes.toString('ascii',p+4,p+8);expect(crc32(bytes.subarray(p+4,end)),url+' '+kind).toBe(bytes.readUInt32BE(end));if(kind==='IHDR'){expect(bytes.readUInt32BE(p+8)).toBeGreaterThan(0);expect(bytes.readUInt32BE(p+12)).toBeGreaterThan(0);}if(kind==='IDAT')imageData.push(bytes.subarray(p+8,end));p=end+4;if(kind==='IEND'){ended=true;break;}}
   expect(ended,url).toBe(true);expect(inflateSync(Buffer.concat(imageData)).length,url).toBeGreaterThan(0);
  }
 });
 it('resuelve los nombres del catálogo ignorando mayúsculas y tildes',()=>{
  expect(participantNamedAsset('Kevin Sívori')).toBe(participantNameAssets['kevin sivori']);expect(participantNamedAsset('Gonzalo Nuñez')).toBe(participantNameAssets['gonzalo nunez']);expect(participantNamedAsset('VERÓNICA LUCCHESI')).toBe(participantNameAssets['veronica lucchesi']);expect(participantNameKey('  Facundo   Marchese ')).toBe('facundo marchese');expect(participantNamedAsset('Participante inexistente')).toBeUndefined();
 });
 it('los 28 IDs actuales conservan el PNG aunque cambie el nombre',()=>{
  expect(Object.keys(participantShieldKeys)).toHaveLength(28);
  for(const [id,key] of Object.entries(participantShieldKeys)){
   expect(participantNameAssets[key]).toBeDefined();const url=participantAsset(id);expect(url).toBeTruthy();const html=renderToStaticMarkup(createElement(ParticipantShield,{userId:id,name:'Nombre actualizado'}));expect(html).toContain('src="'+url+'"');expect(html).not.toContain('asset-image__sprite');expect(html).not.toContain('asset-image__fallback');
  }
 });
 it('no asigna el escudo de otra persona a un ID desconocido por compartir nombre',()=>{
  const html=renderToStaticMarkup(createElement(ParticipantShield,{userId:'desconocido',name:'Benja'}));expect(html).toContain('asset-image__fallback');expect(html).not.toContain('<img');
 });
 it('los envíos Admin incluyen escudo tanto en enviados como en pendientes',()=>{
  const people=[{id:'4ba8b09f-fc1e-46a3-804f-e155ab002845',name:'Nombre modificado',active:1,lastAt:null,count:0},{id:'5314e128-f42f-47d8-90f3-5271d5d08901',name:'Cami',active:1,lastAt:'2026-10-29 15:00:00',count:1}];
  const html=renderToStaticMarkup(createElement(SubmissionLists,{participants:people}));expect(html).toContain('1 enviaron');expect(html).toContain('1 no enviaron');for(const p of people)expect(html).toContain('src="'+participantAsset(p.id)+'"');
 });
});
