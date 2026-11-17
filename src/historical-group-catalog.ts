// T6–T8 phase tables from the original workbooks. Phase scores stay outside totals.
import historicalPhases from './historical-phase-data.json';
import type {ArchivePayload} from './historical-schema';

/** Read-only historical group tables transcribed from the original T3/T4
 * workbooks supplied by the administrator. Supplemental sheets were not
 * persisted by the original archive importer. These are NOT added to totals. */
export type PhaseDecision='qualified'|'eliminated';
type PhaseScores=[number|null,number|null,number|null,number|null,number|null];
export type ArchiveDuoPhase={
 name:string;
 pairs:Array<{position:number;name:string;members:string[];stats:PhaseScores;decision?:PhaseDecision}>;
 individuals:Array<{participantKey:string;stats:PhaseScores;decision?:PhaseDecision}>;
};
type SeasonPhases={groups:Record<string,HistoricalGroupTable[]>;duos:ArchiveDuoPhase[]};
const phaseCatalog=historicalPhases as unknown as Record<string,SeasonPhases>;

export function documentedDuoPhases(data:ArchivePayload){
 const phases=phaseCatalog[data.season.number]?.duos??[];
 const participants=new Set(data.participants.map(p=>p.key));
 if(!phases[0]?.individuals.every(p=>participants.has(p.participantKey)))return [];
 return phases;
}

export type HistoricalGroupEntry={participantKey:string;points:number;position:number|null;decision?:PhaseDecision|null;stats?:[number|null,number|null,number|null,number|null]};
export type HistoricalGroupTable={name:string;entries:HistoricalGroupEntry[]};

// Data format: groupName:key|officialPoints|position(optional),...
// T3 contains original group membership and official points; "order" in the
// source file was not a verified ranking, so no position is invented.
const documented:Record<string,string>={
 // T12, hoja COPA TOTAL, columnas de Posición y PTS de la tabla de grupos.
 '12:COPA_TOTAL':[
  '1:t1-rodri-sebastian|8|1,t7-alexis-segovia|8|2,t7-lucas-aguilera|6|3,t1-pancho-muzzio|2|4,t10-leandro-montes|1|5',
  '2:t4-eze|10|1,t7-anto-lopez|9|2,t4-nico-luchetti-r|7|3,t10-mariano-gallucci|1|4,t2-nico-avalos|1|5',
  '3:t8-joel-alcalde|10|1,t7-daniel-bazan|6|2,t6-ian-gangai|5|3,t3-bruno-alonso|4|4,t6-ramiro-vita|3|5',
  '4:t5-rodrigo-soca|9|1,t7-gonzalo-nunez|7|2,t1-jhose|4|3,t10-ignacio-cejas|4|4,t4-natanael|4|5',
  '5:t6-lucas-insua|10|1,t1-nahuel-scocier|8|2,t1-rodrigo-talarico|4|3,t8-benja|4|4,t10-fede-salatino|1|5',
  '6:t5-fabrizio-escolano|10|1,t10-franco-przepiorka|6|2,t7-nacho-soto|5|3,t1-luciano-hufschmid|4|4,t1-gabriel-talarico|3|5',
  '7:t10-azul-quispe|10|1,t1-mario-talarico|7|2,t1-kevin-sivori|5|3,t7-renzo-badano|2|4,t9-facundo-marchese|2|5',
  '8:t2-martin-bustos|10|1,t10-bautista-coria|7|2,t6-moreno-perez|6|3,t7-tomas-torcasio|6|4,t3-santi|0|5',
  '9:t7-kraiizer|10|1,t1-joel-marasco|7|2,t6-tomas-delgado|4|3,t7-joaquin-sampadaro|3|4,t3-valentina-scocier|3|5',
  '10:t1-matheo-olivera|8|1,t10-felipe-galante|7|2,t1-lautaro-scocier|6|3,t9-axel|4|4,t1-anubis|2|5'
 ].join(';'),
 '3:COPA_TOTAL':[
  '1:t3-leandro-montes|10,t2-nico-avalos|7,t3-pablo-aquino|14,t1-rodri-sebastian|11',
  '2:t1-aylen-benedetti|8,t1-pancho-muzzio|14,t1-matias-varela|13',
  '3:t1-luciano-hufschmid|10,t1-anubis|8,t1-facu-montes|9',
  '4:t2-martin-bustos|8,t1-gabriel-talarico|8,t3-nahuel-ponce|8',
  '5:t1-joel-marasco|10,t1-kevin-sivori|10,t3-valentina-scocier|8',
  '6:t1-rodrigo-talarico|7,t1-el-diego|6,t1-jhose|8',
  '7:t1-nahuel-scocier|6,t1-mario-talarico|13,t1-lautaro-scocier|10',
  '8:t1-matheo-olivera|5,t1-joaco-fernandez|6,t1-nahir-gomezz|9'
 ].join(';'),
 '4:COPA_A':[
  '1:t1-rodri-sebastian|26|1,t2-nico-avalos|21|2,t1-jhose|18|3,t1-pancho-muzzio|13|4',
  '2:t1-mario-talarico|26|1,t1-luciano-hufschmid|19|2,t1-anubis|16|3,t1-lautaro-scocier|15|4',
  '3:t1-matheo-olivera|15|1,t1-joel-marasco|15|2,t3-valentina-scocier|14|3,t1-aylen-benedetti|6|4',
  '4:t1-kevin-sivori|21|1,t1-rodrigo-talarico|16|2,t1-facu-montes|13|3'
 ].join(';'),
 '4:COPA_B':[
  '1:t3-nico-luchetti|23|1,t4-tomas-hon|21|2,t3-helyy|21|3,t3-aaron-rodas|7|4',
  '2:t3-valium|23|1,t4-pollo|23|2,t1-matias-varela|20|3,t1-gabriel-talarico|19|4',
  '3:t4-eze|21|1,t3-bruno-alonso|17|2,t1-joaco-fernandez|15|3,t4-natanael|14|4',
  '4:t1-nahuel-scocier|15|1,t3-fede-gerez|15|2,t3-santi|14|3',
  '5:t1-el-diego|19|1,t4-juli-boetsch|18|2,t2-martin-bustos|13|3'
 ].join(';')
};
export function documentedHistoryGroups(data:ArchivePayload,competitionCode:string):HistoricalGroupTable[]{
 const catalog=phaseCatalog[data.season.number]?.groups[competitionCode];
 const lookup=new Set(data.participants.map(p=>p.key));
 if(catalog?.every(group=>group.entries.every(row=>lookup.has(row.participantKey))))return catalog;
 const raw=documented[data.season.number+':'+competitionCode];
 if(!raw)return [];
 const participants=new Set(data.participants.map(p=>p.key));
 const parsed=raw.split(';').map(line=>{
  const [group,items]=line.split(':');
  const entries=items.split(',').map(item=>{
   const [key,points,position]=item.split('|');
   const resolved=participants.has(key)?key:participants.has('imported:'+key)?'imported:'+key:key;
   return {participantKey:resolved,points:Number(points),position:position?Number(position):null};
  });
  return {name:'Grupo '+group,entries};
 });
 const count=parsed.reduce((n,g)=>n+g.entries.length,0);
 const matched=parsed.reduce((n,g)=>n+g.entries.filter(e=>participants.has(e.participantKey)).length,0);
 // Avoid accidentally attaching this catalog to a different/reimported edition.
 if(!count||matched/count<0.7)return [];
 return parsed.map(g=>({...g,entries:g.entries.filter(e=>participants.has(e.participantKey))}));
}
