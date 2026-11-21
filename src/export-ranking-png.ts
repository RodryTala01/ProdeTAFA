import { downloadPng } from './download-png';

export async function downloadRankingPng(title:string,headers:string[],rows:string[][]){
 const width=1100, rowHeight=44, inset=32, tableTop=132;
 const canvas=document.createElement('canvas');
 canvas.width=width;
 canvas.height=tableTop+rowHeight*(rows.length+1)+inset;
 const ctx=canvas.getContext('2d');
 if(!ctx)throw new Error('Canvas no disponible');

 const label=(value:string,x:number,y:number,maxWidth:number)=>{
  let text=value;
  while(text.length>1&&ctx.measureText(text).width>maxWidth)text=text.slice(0,-1);
  ctx.fillText(text===value?value:text.slice(0,-1)+'…',x,y);
 };
 const band=(color:string,y:number,height:number,x=0,w=width)=>{
  ctx.fillStyle=color;
  ctx.fillRect(x,y,w,height);
 };
 band('#101210',0,canvas.height);
 band('#ad67e8',0,6);
 ctx.textBaseline='middle';
 ctx.fillStyle='#c7fa53';
 ctx.font='bold 20px sans-serif';
 ctx.fillText('PRODE TAFA  /  TABLAS TOTALES',inset,43);
 ctx.fillStyle='#ffffff';
 ctx.font='bold 34px sans-serif';
 label(title,inset,91,width-2*inset);
 const tableWidth=width-2*inset;
 const metrics=headers.length-2;
 const nameWidth=metrics>6?300:350;
 const metricWidth=(tableWidth-58-nameWidth)/metrics;
 const widths=[58,nameWidth,...Array<number>(metrics).fill(metricWidth)];
 const renderRow=(cells:string[],index:number)=>{
  const y=tableTop+index*rowHeight;
  band(index===0?'#302139':index%2?'#1b211b':'#151915',y,rowHeight,inset,tableWidth);
  let x=inset;
  cells.forEach((value,i)=>{
   ctx.fillStyle=index===0?'#ebe0f5':i===2?'#c7fa53':'#f0f3ed';
   ctx.font=index===0?'bold 15px sans-serif':i===1||i===2?'bold 20px sans-serif':'18px sans-serif';
   ctx.textAlign=i===1?'left':'center';
   label(value,i===1?x+10:x+widths[i]/2,y+rowHeight/2,widths[i]-14);
   x+=widths[i];
  });
 };
 renderRow(headers,0);
 rows.forEach((row,i)=>renderRow(row,i+1));
 await downloadPng(canvas,title);
}
