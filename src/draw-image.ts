import {competitionAsset,participantAsset,participantNamedAsset} from './competition-assets';

export type DrawPerson={userId?:string;name:string;shieldUrl?:string|null};
export type DrawBlock={
 id:string;title:string;sides:DrawPerson[][];bye?:boolean;
 sources?:string[];positions?:string[];
};
export type DrawImage={
 competitionCode:string;competitionName:string;season:number;phase:string;
 state:'Vista previa'|'Confirmado';kind:'groups'|'bracket';
 blocks:DrawBlock[];criteria?:string[];
};

const palette={bg:'#101510',surface:'#1c241e',raised:'#27312a',line:'#435047',text:'#f4f6ef',muted:'#b5c1b7',green:'#c8fa54',purple:'#bc87ed'};
const width=1080,margin=40,gap=24,cardWidth=488;
const font=(size:number,bold=false)=>(bold?'700 ':'')+size+'px sans-serif';

async function loadImage(url?:string):Promise<HTMLImageElement|null>{
 if(!url)return null;
 return new Promise(resolve=>{
  const image=new Image();
  let completed=false;
  const finish=(value:HTMLImageElement|null)=>{
   if(completed)return;
   completed=true;clearTimeout(timer);resolve(value);
  };
  const timer=setTimeout(()=>finish(null),6000);
  image.crossOrigin='anonymous';
  image.onload=()=>finish(image);
  image.onerror=()=>finish(null);
  image.src=url;
 });
}

function wrap(ctx:CanvasRenderingContext2D,text:string,maxWidth:number):string[]{
 const lines:string[]=[];
 let line='';
 for(const word of text.split(/\s+/)){
  const candidate=line?line+' '+word:word;
  if(ctx.measureText(candidate).width>maxWidth&&line){lines.push(line);line='';}
  for(const letter of word){
   if(ctx.measureText(line+letter).width>maxWidth&&line){lines.push(line);line='';}
   line+=letter;
  }
  if(line&&ctx.measureText(line+' ').width<=maxWidth)line+=' ';
 }
 if(line.trim())lines.push(line.trim());
 return lines.length?lines:[''];
}

function contain(ctx:CanvasRenderingContext2D,image:HTMLImageElement,x:number,y:number,w:number,h:number){
 const scale=Math.min(w/image.naturalWidth,h/image.naturalHeight);
 const iw=image.naturalWidth*scale,ih=image.naturalHeight*scale;
 ctx.drawImage(image,x+(w-iw)/2,y+(h-ih)/2,iw,ih);
}

export async function renderDrawImages(model:DrawImage):Promise<Blob[]>{
 if(!model.blocks.length)throw new Error('No hay un armado para exportar.');
 await document.fonts.ready;
 const logoUrl=competitionAsset(model.competitionCode,model.season).trophy
  ??competitionAsset(model.competitionCode,model.season).logo;
 const urls=[...new Set(['/brand/tafa.png',...(logoUrl?[logoUrl]:[]),...model.blocks.flatMap(b=>b.sides.flatMap(side=>side.map(p=>
  p.shieldUrl||participantAsset(p.userId,model.season)||participantNamedAsset(p.name)
 ).filter((value):value is string=>Boolean(value))))])];
 const images=new Map(await Promise.all(urls.map(async url=>[url,await loadImage(url)] as const)));
 const measure=document.createElement('canvas').getContext('2d')!;
 measure.font=font(25,true);
 const personHeight=(p:DrawPerson)=>Math.max(66,wrap(measure,p.name,cardWidth-108).length*32+20);
 const titleHeight=(b:DrawBlock)=>{
  measure.font=font(25,true);
  return 30+wrap(measure,b.title,cardWidth-36).length*32;
 };
 const blockHeight=(b:DrawBlock)=>titleHeight(b)+b.sides.reduce((height,side)=>height+side.reduce((n,p)=>n+personHeight(p),0)+
  (model.kind==='bracket'?34:0),0)+(b.bye?44:0)+
  (b.sources?.length?wrap(measure,'Fuentes: '+b.sources.map(id=>model.blocks.find(source=>source.id===id)?.title??id).join(' / '),cardWidth-40).length*30+18:0);
 const criteria=(model.criteria??[]).filter(Boolean);
 const footerHeight=criteria.length?90+criteria.reduce((n,line)=>n+wrap(measure,line,width-2*margin-32).length*30+12,0):30;
 const maxContent=14000-footerHeight-280;
 const pages:DrawBlock[][]=[[]];
 let used=0;
 for(let i=0;i<model.blocks.length;i+=2){
  const row=model.blocks.slice(i,i+2);
  const height=Math.max(...row.map(blockHeight))+gap;
  if(height>maxContent)throw new Error('Este grupo es demasiado largo para una sola imagen.');
  if(used+height>maxContent&&pages.at(-1)!.length){pages.push([]);used=0;}
  pages.at(-1)!.push(...row);used+=height;
 }
 return Promise.all(pages.map(async (blocks,pageIndex)=>{
  const rows=Array.from({length:Math.ceil(blocks.length/2)},(_,i)=>blocks.slice(i*2,i*2+2));
  const heights=rows.map(row=>Math.max(...row.map(blockHeight)));
  const height=Math.max(1350,280+heights.reduce((n,h)=>n+h+gap,0)+footerHeight);
  const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
  const ctx=canvas.getContext('2d')!;
  ctx.textBaseline='top';
  const rect=(color:string,x:number,y:number,w:number,h:number)=>{ctx.fillStyle=color;ctx.fillRect(x,y,w,h);};
  const text=(value:string,x:number,y:number,size=25,color=palette.text,bold=false)=>{
   ctx.fillStyle=color;ctx.font=font(size,bold);ctx.fillText(value,x,y);
  };
  rect(palette.bg,0,0,width,height);
  rect(palette.green,0,0,12,height);
  rect(palette.purple,margin,202,width-2*margin,3);
  const brand=images.get('/brand/tafa.png');
  if(brand)contain(ctx,brand,margin,30,68,100);
  text('PRODE TAFA',margin+86,40,28,palette.green,true);
  text('T'+model.season+' · '+model.state+(pages.length>1?' · '+(pageIndex+1)+'/'+pages.length:''),margin+86,82,23,palette.muted);
  const trophy=logoUrl?images.get(logoUrl):null;
  if(trophy)contain(ctx,trophy,width-145,24,96,120);
  ctx.font=font(36,true);
  let y=145;
  for(const line of wrap(ctx,model.competitionName,width-2*margin)){text(line,margin,y,36,palette.text,true);y+=42;}
  // The content starts after the complete title, including long competition names.
  const contentStart=Math.max(280,y+66);
  const extra=contentStart-280;
  if(extra>0){
   // Reserve the additional header space before any drawing is lost.
   const header=ctx.getImageData(0,0,width,210);
   canvas.height=height+extra;
   rect(palette.bg,0,0,width,canvas.height);rect(palette.green,0,0,12,canvas.height);
   ctx.putImageData(header,0,0);
   ctx.textBaseline='top';
   y=145;
   ctx.font=font(36,true);
   for(const line of wrap(ctx,model.competitionName,width-2*margin)){text(line,margin,y,36,palette.text,true);y+=42;}
  }
  text(model.phase,margin,contentStart-48,28,palette.purple,true);
  const drawPerson=(p:DrawPerson,x:number,y:number)=>{
   const url=p.shieldUrl||participantAsset(p.userId,model.season)||participantNamedAsset(p.name);
   const image=url?images.get(url):null;
   if(image)contain(ctx,image,x,y+6,48,54);
   else{
    rect(palette.raised,x,y+6,48,48);
    text(p.name.trim().split(/\s+/).map(word=>word[0]).slice(0,2).join('').toUpperCase(),x+6,y+18,20,palette.muted,true);
   }
   ctx.font=font(25,true);
   wrap(ctx,p.name,cardWidth-108).forEach((line,i)=>text(line,x+64,y+14+i*32,25,palette.text,true));
   return personHeight(p);
  };
  const anchors=new Map<string,{x:number;y:number;height:number}>();
  y=contentStart;
  for(let rowIndex=0;rowIndex<rows.length;rowIndex++){
   for(let column=0;column<rows[rowIndex].length;column++){
    const block=rows[rowIndex][column],x=margin+column*(cardWidth+gap),h=heights[rowIndex];
    rect(palette.surface,x,y,cardWidth,h);
    rect(palette.green,x,y,cardWidth,3);
    ctx.font=font(25,true);
    wrap(ctx,block.title,cardWidth-36).forEach((line,i)=>text(line,x+18,y+18+i*32,25,palette.green,true));
    anchors.set(block.id,{x,y,height:h});
    let py=y+titleHeight(block);
    block.sides.forEach((side,sideIndex)=>{
     side.forEach((p,personIndex)=>{
      py+=drawPerson(p,x+18,py);
      const destination=block.positions?.[personIndex];
      if(model.kind==='groups'&&destination){
       // Destinations describe positions, never a participant's qualification status.
       text(String(personIndex+1)+'.',x+cardWidth-32,py-45,16,palette.purple,true);
      }
     });
     if(model.kind==='bracket'&&sideIndex===0){
      rect(palette.line,x+20,py+14,cardWidth-40,1);text('VS',x+cardWidth/2-17,py+2,22,palette.purple,true);py+=34;
     }else if(model.kind==='bracket')py+=34;
    });
    if(block.bye){text('Pase directo',x+18,py,23,palette.muted);py+=44;}
    if(block.sources?.length){
     ctx.font=font(20);
     const sources='Fuentes: '+block.sources.map(id=>model.blocks.find(source=>source.id===id)?.title??id).join(' / ');
     wrap(ctx,sources,cardWidth-40).forEach((line,i)=>text(line,x+18,py+i*26,20,palette.muted));
    }
   }
   y+=heights[rowIndex]+gap;
  }
  for(const block of blocks){
   const target=anchors.get(block.id);
   if(!target)continue;
   for(const sourceId of block.sources??[]){
    const source=anchors.get(sourceId);
    if(!source)continue;
    const lane=source.x+cardWidth+10;
    ctx.strokeStyle=palette.purple;ctx.lineWidth=2;
    ctx.beginPath();ctx.moveTo(source.x+cardWidth,source.y+source.height-24);
    ctx.lineTo(lane,source.y+source.height-24);
    ctx.lineTo(lane,target.y-10);
    ctx.lineTo(target.x+cardWidth/2,target.y-10);
    ctx.lineTo(target.x+cardWidth/2,target.y);
    ctx.stroke();
    ctx.beginPath();ctx.moveTo(target.x+cardWidth/2-6,target.y-6);
    ctx.lineTo(target.x+cardWidth/2,target.y);
    ctx.lineTo(target.x+cardWidth/2+6,target.y-6);ctx.stroke();
   }
  }
  if(criteria.length){
   rect(palette.raised,margin,y,width-2*margin,canvas.height-y-20);
   text('CRITERIOS DE CLASIFICACIÓN',margin+16,y+16,24,palette.green,true);y+=58;
   for(const criterion of criteria){
    ctx.font=font(23);
    const lines=wrap(ctx,criterion,width-2*margin-32);
    lines.forEach(line=>{text(line,margin+16,y,23,palette.text);y+=30;});
    y+=12;
   }
  }
  const blob=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(new Error('No se pudo crear el PNG.')),'image/png'));
  return blob;
 }));
}
