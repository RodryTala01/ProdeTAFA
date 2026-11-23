import {layoutBracket} from './bracket-layout';
import type {DrawImage,DrawPerson} from './draw-image';
import {participantAsset,participantNamedAsset} from './competition-assets';

const colors={bg:'#05091f',card:'#242c53',border:'#7985ad',text:'#f5f7ff',muted:'#c3cbe2',accent:'#c8fa54',purple:'#bc87ed',line:'#d5dcf5'};
const font=(size:number,bold=false)=>(bold?'700 ':'')+size+'px sans-serif';
function lines(ctx:CanvasRenderingContext2D,value:string,max:number){
 const result:string[]=[];let current='';
 for(const word of value.trim().split(/\s+/)){
  if(current&&ctx.measureText(current+' '+word).width>max){result.push(current);current='';}
  for(const letter of word){
   if(ctx.measureText(current+letter).width>max&&current){result.push(current);current='';}
   current+=letter;
  }
  current+=' ';
 }
 if(current.trim())result.push(current.trim());return result;
}
function contain(ctx:CanvasRenderingContext2D,image:HTMLImageElement,x:number,y:number,w:number,h:number){
 const scale=Math.min(w/image.naturalWidth,h/image.naturalHeight),iw=image.naturalWidth*scale,ih=image.naturalHeight*scale;
 ctx.drawImage(image,x+(w-iw)/2,y+(h-ih)/2,iw,ih);
}

export async function renderBracketImage(model:DrawImage,images:Map<string,HTMLImageElement|null>,trophyUrl?:string):Promise<Blob>{
 const canvas=document.createElement('canvas'),context=canvas.getContext('2d');
 if(!context)throw new Error('Este navegador no permite generar la imagen.');
 const ctx=context;
 const cardWidth=420,sideWidth=166,shieldSize=92;
 ctx.font=font(22,true);
 const personHeight=(p:DrawPerson)=>shieldSize+12+lines(ctx,p.name,sideWidth).length*27+18;
 const cardHeight=Math.max(242,...model.blocks.map(b=>{
  ctx.font=font(18,true);const heading=Math.max(64,20+lines(ctx,b.title,cardWidth-28).length*22);
  ctx.font=font(22,true);return heading+Math.max(...b.sides.map(side=>side.reduce((n,p)=>n+personHeight(p),0)),0);
 }));
 const layout=layoutBracket(model.blocks,cardWidth,cardHeight);
 // Reserve enough header space for long actual competition names too.
 ctx.font=font(44,true);
 const titleLines=lines(ctx,model.competitionName,layout.width-430);
 const offset=Math.max(0,60+titleLines.length*54+96-240);
 canvas.width=layout.width;canvas.height=layout.height+offset;
 if(canvas.width*canvas.height>32000000)throw new Error('La llave es demasiado grande para este PNG. Descargá sus fases por separado.');
 ctx.textBaseline='top';
 const text=(value:string,x:number,y:number,size:number,color=colors.text,bold=false)=>{ctx.fillStyle=color;ctx.font=font(size,bold);ctx.fillText(value,x,y);};
 ctx.fillStyle=colors.bg;ctx.fillRect(0,0,canvas.width,canvas.height);
 ctx.fillStyle=colors.accent;ctx.fillRect(72,44,8,126);
 const trophy=trophyUrl?images.get(trophyUrl):null;
 if(trophy)contain(ctx,trophy,96,38,80,132);
 titleLines.forEach((line,i)=>text(line,198,44+i*54,44,colors.text,true));
 text('TEMPORADA '+model.season+'  ·  '+model.phase,198,56+titleLines.length*54,25,colors.accent,true);
 text(model.state.toUpperCase(),198,94+titleLines.length*54,20,colors.muted);
 const brand=images.get('/brand/tafa.png');if(brand)contain(ctx,brand,canvas.width-226,26,150,188);
 const nodeMap=new Map(layout.nodes.map(n=>[n.block.id,n]));
 // Connect centres through the empty gutter between columns; cards cover no lines.
 ctx.strokeStyle=colors.line;ctx.lineWidth=3;ctx.lineJoin='miter';
 for(const edge of layout.edges){
  const from=nodeMap.get(edge.from)!,to=nodeMap.get(edge.to)!;
  const startX=from.x+cardWidth,startY=from.y+cardHeight/2+offset,endY=to.y+cardHeight/2+offset;
  const lane=to.x-50;
  ctx.beginPath();ctx.moveTo(startX,startY);ctx.lineTo(lane,startY);ctx.lineTo(lane,endY);ctx.lineTo(to.x,endY);ctx.stroke();
 }
 function shield(p:DrawPerson,x:number,y:number){
  const url=p.shieldUrl||participantAsset(p.userId,model.season)||participantNamedAsset(p.name),image=url?images.get(url):null;
  if(image){contain(ctx,image,x,y,shieldSize,shieldSize);return;}
  // Neutral shield for an unresolved source; initials only for an actual person.
  ctx.beginPath();ctx.moveTo(x+8,y+5);ctx.lineTo(x+shieldSize-8,y+5);ctx.lineTo(x+shieldSize-12,y+64);ctx.lineTo(x+shieldSize/2,y+88);ctx.lineTo(x+12,y+64);ctx.closePath();
  ctx.fillStyle=colors.bg;ctx.fill();ctx.strokeStyle=colors.border;ctx.lineWidth=3;ctx.stroke();
  const initials=p.placeholder?'?':p.name.split(/\s+/).map(word=>word[0]).slice(0,2).join('').toUpperCase();
  ctx.font=font(p.placeholder?50:28,true);const tw=ctx.measureText(initials).width;
  text(initials,x+(shieldSize-tw)/2,y+22,p.placeholder?50:28,colors.muted,true);
 }
 for(const node of layout.nodes){
  const {block,x}=node,y=node.y+offset;
  ctx.fillStyle=colors.card;ctx.fillRect(x,y,cardWidth,cardHeight);
  ctx.strokeStyle=layout.finalIds.includes(block.id)?colors.accent:colors.border;ctx.lineWidth=2;ctx.strokeRect(x,y,cardWidth,cardHeight);
  const label=block.title;
  ctx.font=font(18,true);
  lines(ctx,label,cardWidth-28).forEach((line,i)=>text(line,x+14,y+12+i*22,18,colors.muted,true));
  const headerHeight=20+lines(ctx,label,cardWidth-28).length*22;
  block.sides.forEach((side,index)=>{
   let py=y+headerHeight;
   const sideX=x+18+index*(cardWidth-sideWidth-36);
   const members=side.length?side:[{name:block.bye?'Pase directo':'Por definir',placeholder:true}];
   for(const person of members){
    shield(person,sideX+(sideWidth-shieldSize)/2,py);
    ctx.font=font(22,true);const nameLines=lines(ctx,person.name,sideWidth);
    nameLines.forEach((line,i)=>{
     ctx.font=font(22,true);const tw=ctx.measureText(line).width;
     text(line,sideX+(sideWidth-tw)/2,py+shieldSize+12+i*27,22,colors.text,true);
    });
    py+=personHeight(person);
   }
  });
  text(block.bye?'—':'VS',x+cardWidth/2-22,y+headerHeight+32,28,colors.text,true);
  if(layout.finalIds.includes(block.id)){
   text('FINAL',x,y-38,24,colors.accent,true);
   if(trophy)contain(ctx,trophy,x+cardWidth+22,y+cardHeight/2-72,84,144);
  }
 }
 return new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(new Error('No se pudo crear el PNG de la llave.')),'image/png'));
}
