export const competitionSlugs: Record<string,string> = {LIGA_A:'liga-a',LIGA_B:'liga-b',COPA_A:'copa-a',COPA_B:'copa-b',COPA_TOTAL:'copa-total',COPA_DUOS:'duos',COPA_CAMPEONES:'campeones',COPA_PAPA:'papa',PROMOCION:'promocion'};
export type Member = {entryId:number;competitionId:number;status:string;entryType:string;userId:string;fullName:string;validFrom:number|null;validTo:number|null};
export type Competition = {id:number;code:string;displayName:string;family:string;status:string;divisionId:number|null};
export type Stage = {id:number;competitionId:number;name:string;code:string;type:string;sequence:number;status:string};
export type Encounter = {id:number;stageId:number;roundId:number|null;entryAId:number|null;entryBId:number|null;scoreA:number|null;scoreB:number|null;status:string;winnerEntryId:number|null;confirmedAt:string|null;resolution:string|null;slot:string};
export type Overview = {currentUserId:string;editions:{seasonNumber:number;name:string;status:string}[];season:null|{
 id:number;seasonNumber:number;name:string;status:string;competitions:Competition[];stages:Stage[];
 links:{id:number;competitionId:number;stageId:number;roundId:number;name:string;status:string;sequence:number}[];
 members:Member[];people:{userId:string;fullName:string;divisionId:number;division:string;league:string}[];
 encounters:Encounter[];results:{competitionId:number;entryId:number;resultCode:string;position:number|null;stageName:string|null}[];
 history:{code:string;competitionId:number;seasonNumber:number;seasonName:string;resultCode:string;name:string}[];
 qualifiers?:{entryId:number;sourceStageId:number;targetStageId:number}[];
 segments:{id:number;stageId:number;name:string;sequence:number;roundName:string}[];
}};
export type Season = NonNullable<Overview['season']>;
export function competitionHref(code:string,season?:number) { return `#/competiciones/${competitionSlugs[code] ?? code.toLowerCase()}${season ? `?season=${season}` : ''}`; }
export function entryMembers(s:Season,id:number|null,round:number|null) { return s.members.filter(m=>m.entryId===id && (round===null ? m.validTo===null : (m.validFrom===null||m.validFrom<=round)&&(m.validTo===null||m.validTo>round))); }
export function entryName(s:Season,id:number|null,round:number|null) { return entryMembers(s,id,round).map(m=>m.fullName).join(' + ') || 'Por definir'; }
export function participation(s:Season,c:Competition,user:string) {
 const mine=s.members.filter(m=>m.competitionId===c.id&&m.userId===user);
 const result=s.results.find(r=>r.competitionId===c.id&&mine.some(m=>m.entryId===r.entryId));
 if(result?.resultCode==='CHAMPION') return 'Campeón';
 if(result?.resultCode==='RUNNER_UP') return 'Subcampeón';
 if(result?.resultCode==='ELIMINATED') return 'Eliminado';
 if(result && ['finished','archived'].includes(c.status)) return 'Participación finalizada';
 if(c.code==='COPA_DUOS') return mine.length ? 'Participación registrada en esta edición' : 'No participás';
 if(mine.some(m=>m.status==='eliminated'))return 'Eliminado';
 if(mine.some(m=>m.status==='qualified'))return 'Clasificado';
 if(mine.length || (c.divisionId!==null&&s.people.some(p=>p.userId===user&&p.divisionId===c.divisionId)))return 'Participando';
 return 'No participás';
}
export async function readCompetition<T>(url:string,signal?:AbortSignal):Promise<T> { const response=await fetch(url,{signal});if(!response.ok)throw new Error('No pudimos cargar esta información. Reintentá en unos instantes.');return response.json(); }

export function phaseName(name:string|undefined) {if(!name)return 'Etapa por definir';const labels:Record<string,string>={R64:'Treintaidosavos de final',R32:'Dieciseisavos de final',R16:'Octavos de final',QF:'Cuartos de final',SF:'Semifinal',FINAL:'Final',THIRD:'Tercer puesto',ROUND_OF_16:'Octavos de final',QUARTERFINAL:'Cuartos de final',SEMIFINAL:'Semifinal',GROUP_STAGE:'Grupos'};return labels[name]??name.replace(/^NIVEL(\d+)$/,'Etapa $1');}
