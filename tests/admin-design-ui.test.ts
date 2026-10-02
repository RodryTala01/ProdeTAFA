// @vitest-environment happy-dom
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import AdminRounds from '../src/AdminRounds';
import ParticipantsAdmin from '../src/ParticipantsAdmin';
import AdminCompetitions from '../src/AdminCompetitions';
vi.mock('../src/PredictionHistory',()=>({default:()=>null}));
vi.mock('../src/RoundRanking',()=>({default:()=>null}));
vi.mock('../src/AdminCorrections',()=>({default:()=>null}));
vi.mock('../src/PredictionHistoryBrowser',()=>({default:()=>null}));
vi.mock('../src/AdminIffhs',()=>({default:()=>null}));
vi.mock('../src/AdminSeasonTransition',()=>({default:()=>null}));
vi.mock('../src/AdminLeague',()=>({default:()=>createElement('p',null,'Administración de Liga anterior')}));
let host:HTMLDivElement, root:Root, writes:{url:string;body:any}[], round:any;
const user={id:'test-1',fullName:'Rodrigo Prueba',phone:'000111',role:'participant',isActive:true};
const team={id:'home',name:'Equipo local',logoUrl:null};
const fixture={providerFixtureId:'fixture-1',kickoffAt:'2030-01-01T12:00:00Z',status:'NS',competition:{id:'cup',name:'Copa',country:'Argentina',logoUrl:null,round:null},home:team,away:{...team,id:'away',name:'Equipo visitante'},goals:{home:null,away:null}};
const json=(data:unknown)=>new Response(JSON.stringify(data),{headers:{'content-type':'application/json'}});
beforeEach(()=>{
 Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});HTMLDialogElement.prototype.showModal=function(){this.open=true;};writes=[];
 round={id:2,name:'Fecha 2',status:'draft',matchCount:1,matches:[{...fixture,id:3,matchType:'NORMAL',competitionName:'Copa'}]};
 vi.stubGlobal('fetch',vi.fn(async(url:string,options?:RequestInit)=>{
  if(options?.method){const body=options.body?JSON.parse(options.body as string):null;writes.push({url,body});if(url==='/api/admin/users')return json({user:{...user,id:'new',fullName:body.fullName,phone:body.phone}});if(url.endsWith('/status'))return json({isActive:body.isActive});return json({ok:true});}
  if(url==='/api/admin/users')return json({users:[user,{...user,id:'test-2',fullName:'Carlos Prueba',phone:'000222',isActive:false}]});
  if(url==='/api/admin/rounds')return json({rounds:[round]});
  if(url==='/api/admin/rounds/2')return json({round});
  if(url.startsWith('/api/admin/fixtures'))return json({fixtures:[fixture],requestCount:1});
  if(url==='/api/admin/competition-engine')return json({seasons:[],participants:[],rounds:[]});
  throw Error(url);
 }));host=document.createElement('div');document.body.append(host);root=createRoot(host);
});
afterEach(async()=>{await act(async()=>root.unmount());host.remove();vi.unstubAllGlobals();});
async function mount(component:any){await act(async()=>root.render(createElement(component)));}
const btn=(text:string,scope:ParentNode=host)=>Array.from(scope.querySelectorAll('button')).find(b=>b.textContent===text)!;
async function click(text:string,scope:ParentNode=host){await act(async()=>btn(text,scope).click());}
async function fill(el:HTMLInputElement,value:string){await act(async()=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value')!.set!.call(el,value);el.dispatchEvent(new Event('input',{bubbles:true}));});}
it('Fecha seleccionada y publicación incompleta bloqueada con explicación',async()=>{await mount(AdminRounds);expect(host.textContent).toContain('Faltan 11 partidos');expect(btn('Publicar').disabled).toBe(true);expect(host.querySelector('[aria-current=true]')?.textContent).toContain('Fecha 2');});
it('quitar exige confirmar y cancelar no escribe',async()=>{await mount(AdminRounds);await click('Quitar partido');expect(host.querySelector('dialog')?.textContent).toContain('Equipo local vs Equipo visitante');expect(writes).toHaveLength(0);await click('Cancelar');expect(writes).toHaveLength(0);await click('Quitar partido');await click('Quitar partido',host.querySelector('dialog')!);expect(writes[0].url).toBe('/api/admin/rounds/2/matches/3');});
it('cerrar Fecha requiere confirmación con el endpoint existente',async()=>{round.status='open';await mount(AdminRounds);await click('Cerrar Fecha');expect(writes).toHaveLength(0);await click('Cerrar Fecha',host.querySelector('dialog')!);expect(writes[0].url).toBe('/api/admin/finish-round/2');});
it('búsqueda conserva resultados y evita agregar un fixture ya incluido',async()=>{await mount(AdminRounds);await act(async()=>host.querySelector('.fixture-search-form')!.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true})));expect(host.textContent).toContain('Ya agregado');expect(btn('Agregar')).toBeUndefined();});
it('Participantes filtra nombre y teléfono, con acciones agrupadas',async()=>{await mount(ParticipantsAdmin);const search=host.querySelector('input[type=search]') as HTMLInputElement;await fill(search,'000222');expect(host.querySelectorAll('.user-row')).toHaveLength(1);expect(host.querySelector('.user-row')?.textContent).toContain('Carlos Prueba');expect(host.querySelector('.admin-menu')).not.toBeNull();await fill(search,'Rodrigo');expect(host.querySelector('.user-row')?.textContent).toContain('Rodrigo Prueba');});
it('desactivar confirma y conserva payload existente',async()=>{await mount(ParticipantsAdmin);await click('Desactivar');await click('Cancelar');expect(writes).toHaveLength(0);await click('Desactivar');await click('Desactivar',host.querySelector('dialog')!);expect(writes[0]).toEqual({url:'/api/admin/users/test-1/status',body:{isActive:false}});});
it('crear muestra sólo credenciales recién asignadas y las descarta al cerrar',async()=>{await mount(ParticipantsAdmin);await click('Crear participante');const dialog=host.querySelector('dialog')!;const fields=dialog.querySelectorAll('input');await fill(fields[0],'Vero Prueba');await fill(fields[1],'000333');await fill(fields[2],'Local123!');await act(async()=>dialog.querySelector('form')!.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true})));expect(writes[0].body).toEqual({fullName:'Vero Prueba',phone:'000333',password:'Local123!'});expect(host.querySelector('dialog')?.textContent).toContain('Local123!');await click('Listo');expect(host.textContent).not.toContain('Local123!');});
it('Liga anterior sigue accesible en Competiciones incluso sin temporadas T32',async()=>{await mount(AdminCompetitions);await click('Administrar Liga anterior');expect(host.textContent).toContain('Administración de Liga anterior');await click('Volver a Competiciones');expect(host.textContent).toContain('Competiciones');});
