export function cupAbFormat(code:string,participants:number){
 const directQuarterfinals=code==='COPA_B'&&participants===12;
 return {directQuarterfinals,groupRounds:directQuarterfinals?3:2,groupCount:directQuarterfinals?4:null,
  criteria:directQuarterfinals?['Fase de grupos: 3 Fechas.','1.º y 2.º de cada grupo: Cuartos de final.','3.º de cada grupo: eliminación.']:['1.º de cada grupo: acceso a Cuartos.','2.º y 3.º: acceso a Octavos.','Desde el 4.º puesto: eliminación.']};
}
