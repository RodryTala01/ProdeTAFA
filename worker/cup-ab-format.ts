import {cupAbFormat} from '../shared/cup-ab-format';
export async function cupAbStageFormat(db:D1Database,stageId:number){
 const row=await db.prepare(`SELECT c.code,
 COALESCE(NULLIF((SELECT COUNT(*) FROM competition_group_entries ge JOIN competition_groups g ON g.id=ge.group_id WHERE g.stage_id=cs.id),0),
 (SELECT COUNT(*) FROM season_division_members m WHERE m.season_id=c.season_id AND m.division_id=c.division_id)) AS total
 FROM competition_stages cs JOIN competitions c ON c.id=cs.competition_id WHERE cs.id=?`).bind(stageId).first<{code:string;total:number}>();
 return cupAbFormat(row?.code??'',Number(row?.total??0));
}
