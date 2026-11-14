export type GeneralTotal={userId:string;fullName:string;position:number;points:number;fulls:number|null;partials:number|null;errors:number|null;extras:number|null;dates:number|null;averagePoints:number|null;averageFulls:number|null;averagePartials:number|null;averageErrors:number|null;averageExtras:number|null};
export type PalmarTotal={userId:string;fullName:string;position:number;championships:number;runnerUps:number;participations:number};
export type IffhsTotal={userId:string;fullName:string;position:number;totalPoints:number;seasons:number;average:number;breakdown:Array<{seasonNumber:number;points:number|null}>};
export type TotalsData={seasons:number[];competitions:Array<{code:string;name:string}>;palmares:PalmarTotal[];palmaresOfficial:PalmarTotal[];latestChampions:Record<string,{seasonNumber:number;name:string}>;perCompetition:Record<string,PalmarTotal[]>;iffhsOfficial:{seasons:number[];ranking:IffhsTotal[]};iffhsTotal:IffhsTotal[];general:GeneralTotal[]};

