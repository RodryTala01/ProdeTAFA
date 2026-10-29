export type ArchiveParticipant={key:string;name:string;userId:string|null;division:string|null};
export type ArchiveCompetition={code:string;name:string;kind:'LEAGUE'|'CUP'|'TOURNAMENT'|'PROMOTION'};
export type ArchiveStatistic={participantKey:string;points:number;fulls:number|null;partials:number|null;errors:number|null;extras:number|null;dates:number|null;predictions:number|null};
export type ArchiveStanding={competitionCode:string;participantKey:string;position:number;points:number;fulls:number|null;partials:number|null;errors:number|null;extras:number|null};
export type ArchiveRound={round:string;participantKey:string;points:number;fulls:number|null;partials:number|null;errors:number|null;extras:number|null};
export type ArchiveResult={competitionCode:string;participantKey:string;position:number|null;resultCode:string;teamLabel:string|null};
export type ArchiveMatch={competitionCode:string;stage:string;round:string|null;aKey:string;bKey:string;pointsA:number;pointsB:number;plenosA:number|null;plenosB:number|null;scoreBasis:'INDIVIDUAL'|'DUO'};
export type ArchiveMovement={participantKey:string;fromDivision:string|null;toDivision:string|null;type:'ASCENSO'|'DESCENSO'|'PERMANENCIA'|'OTRO';detail:string|null};
export type ArchiveIffhs={participantKey:string;points:number;position:number|null};
export type ArchivePayload={
 version:1;season:{number:number;name:string;kind:string;notes:string};
 participants:ArchiveParticipant[];competitions:ArchiveCompetition[];statistics:ArchiveStatistic[];
 standings:ArchiveStanding[];rounds:ArchiveRound[];results:ArchiveResult[];
 matches:ArchiveMatch[];movements:ArchiveMovement[];iffhs:ArchiveIffhs[];
};
export const archiveTables=['participants','competitions','statistics','standings','rounds','results','matches','movements','iffhs'] as const;
export const archiveColumns={
 participants:['key','name','userId','division'],
 competitions:['code','name','kind'],
 statistics:['participantKey','points','fulls','partials','errors','extras','dates','predictions'],
 standings:['competitionCode','participantKey','position','points','fulls','partials','errors','extras'],
 rounds:['round','participantKey','points','fulls','partials','errors','extras'],
 results:['competitionCode','participantKey','position','resultCode','teamLabel'],
 matches:['competitionCode','stage','round','aKey','bKey','pointsA','pointsB','plenosA','plenosB','scoreBasis'],
 movements:['participantKey','fromDivision','toDivision','type','detail'],
 iffhs:['participantKey','points','position'],
} as const;
