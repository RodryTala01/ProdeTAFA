/**
 * Promoción es la sexta fase deportiva de Liga A/B. Los registros históricos
 * se conservan en la competición técnica PROMOCION por sus claves foráneas,
 * pero no generan una tercera liga ni puntos extra en las tablas.
 */
export type PromotionLeagueStatus={
  ready:boolean;
  reason:string;
  regularRounds:Array<{code:'LIGA_A'|'LIGA_B';linked:number;finished:number;participants:number;positions:number}>;
};
export async function promotionLeagueStatus(db:D1Database,seasonId:number):Promise<PromotionLeagueStatus>{
 const leagues=await db.prepare(
   `SELECT c.code,
     COUNT(DISTINCT crl.round_id) AS linked,
     COUNT(DISTINCT CASE WHEN r.status='finished' THEN crl.round_id END) AS finished,
     (SELECT COUNT(*) FROM season_division_members dm WHERE dm.season_id=c.season_id AND dm.division_id=c.division_id) AS participants,
     (SELECT COUNT(DISTINCT cr.entry_id) FROM competition_results cr WHERE cr.competition_id=c.id AND cr.final_position IS NOT NULL) AS positions
    FROM competitions c
    LEFT JOIN competition_stages cs ON cs.competition_id=c.id AND cs.stage_type='LEAGUE_TABLE'
    LEFT JOIN competition_round_links crl ON crl.competition_id=c.id AND crl.stage_id=cs.id AND crl.purpose='NORMAL'
    LEFT JOIN rounds r ON r.id=crl.round_id
    WHERE c.season_id=? AND c.code IN ('LIGA_A','LIGA_B')
    GROUP BY c.id,c.code,c.division_id,c.season_id ORDER BY c.code`
 ).bind(seasonId).all<{code:'LIGA_A'|'LIGA_B';linked:number;finished:number;participants:number;positions:number}>();
 const regularRounds=(leagues.results??[]).map(r=>({
   code:r.code,linked:Number(r.linked),finished:Number(r.finished),
   participants:Number(r.participants),positions:Number(r.positions),
 }));
 if(regularRounds.length!==2)return {ready:false,reason:'Primero se deben configurar Liga A y Liga B.',regularRounds};
 if(regularRounds.some(r=>r.linked!==5))return {ready:false,reason:'Cada Liga debe tener exactamente cinco Fechas regulares vinculadas.',regularRounds};
 if(regularRounds.some(r=>r.finished!==5))return {ready:false,reason:'Promoción se habilita después de finalizar las cinco Fechas de ambas Ligas.',regularRounds};
 if(regularRounds.some(r=>r.participants===0||r.positions!==r.participants))return {
   ready:false,reason:'Falta confirmar la posición final de todos los participantes de Liga A y Liga B.',regularRounds,
 };
 return {ready:true,reason:'Cinco Fechas terminadas en ambas Ligas y posiciones oficiales confirmadas.',regularRounds};
}
