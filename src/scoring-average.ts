export function scoringAverage(row:{points:number;fulls:number|null;partials:number|null;errors:number|null}|null):number|null{
 if(!row||row.fulls==null||row.partials==null||row.errors==null)return null;
 const count=row.fulls+row.partials+row.errors;
 return count>0?row.points/count:null;
}
