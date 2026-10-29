import type {ArchivePayload} from './historical-schema';
export type HistorySummary={number:number;name:string;source:'imported'|'official'|'mixed';participantCount:number|null;competitions:Array<{code:string;name:string;kind:string;champions:string[]}>};
export type HistoryDetail={summary:HistorySummary;data:ArchivePayload;officialLinks:Array<{code:string;roundId:number;name:string}>;unavailable:string[]};
