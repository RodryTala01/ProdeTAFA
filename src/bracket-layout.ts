import type {DrawBlock} from './draw-image';
export type BracketNode={block:DrawBlock;column:number;x:number;y:number};
export type BracketLayout={nodes:BracketNode[];edges:Array<{from:string;to:string}>;width:number;height:number;finalIds:string[]};

/** Position only the supplied DAG. No inferred pairing, round or winner. */
export function layoutBracket(blocks:DrawBlock[],cardWidth:number,cardHeight:number):BracketLayout{
 const byId=new Map(blocks.map(b=>[b.id,b]));
 if(byId.size!==blocks.length)throw new Error('Hay identificadores de cruces repetidos.');
 const incoming=new Map(blocks.map(b=>[b.id,[...new Set(b.sources??[])].filter(id=>byId.has(id))]));
 const edges=blocks.flatMap(b=>incoming.get(b.id)!.map(from=>({from,to:b.id})));
 const outgoing=new Map(blocks.map(b=>[b.id,edges.filter(e=>e.from===b.id).map(e=>e.to)]));
 const depth=new Map<string,number>(),visiting=new Set<string>();
 function rank(id:string):number{
  if(visiting.has(id))throw new Error('Las dependencias de la llave contienen un ciclo.');
  if(depth.has(id))return depth.get(id)!;
  visiting.add(id);
  const parents=incoming.get(id)!;
  const value=parents.length?1+Math.max(...parents.map(rank)):0;
  visiting.delete(id);depth.set(id,value);return value;
 }
 blocks.forEach(b=>rank(b.id));
 const margin=72,header=240,gapX=100,gapY=80;
 if(!edges.length){
  const cols=Math.min(4,Math.max(1,blocks.length));
  const nodes=blocks.map((block,i)=>({block,column:0,x:margin+(i%cols)*(cardWidth+gapX),y:header+Math.floor(i/cols)*(cardHeight+gapY)}));
  return {nodes,edges,width:Math.max(1600,margin*2+cols*(cardWidth+gapX)-gapX),height:Math.max(900,header+Math.ceil(blocks.length/cols)*(cardHeight+gapY)),finalIds:blocks.filter(b=>b.branch==='FINAL').map(b=>b.id)};
 }
 const sinks=blocks.filter(b=>!outgoing.get(b.id)!.length);
 const maxDepth=Math.max(...depth.values());
 // Latest possible rank keeps direct entrants beside the round they actually join.
 const columns=new Map(depth);
 for(const block of [...blocks].sort((a,b)=>depth.get(b.id)!-depth.get(a.id)!)){
  const next=outgoing.get(block.id)!;
  columns.set(block.id,next.length?Math.min(...next.map(id=>columns.get(id)!))-1:maxDepth);
 }
 const centers=new Map<string,number>();let nextLeaf=header+cardHeight/2;
 function place(id:string):number{
  if(centers.has(id))return centers.get(id)!;
  const parents=incoming.get(id)!;
  const values=parents.map(place);
  const y=values.length?values.reduce((sum,n)=>sum+n,0)/values.length:nextLeaf;
  if(!values.length)nextLeaf+=cardHeight+gapY;
  centers.set(id,y);return y;
 }
 // Stored source order preserves upper/lower branches without relying on node codes.
 sinks.forEach(b=>place(b.id));
 blocks.forEach(b=>place(b.id));
 const nodes=blocks.map(block=>({block,column:columns.get(block.id)!,x:margin+columns.get(block.id)!*(cardWidth+gapX),y:centers.get(block.id)!-cardHeight/2}));
 // A DAG can have shared sources; keep every column collision-free as well.
 for(let col=0;col<=maxDepth;col++){
  let bottom=header-gapY;
  for(const node of nodes.filter(n=>n.column===col).sort((a,b)=>a.y-b.y)){
   node.y=Math.max(node.y,bottom+gapY);bottom=node.y+cardHeight;
  }
 }
 const finalIds=sinks.filter(b=>b.branch==='FINAL').map(b=>b.id);
 return {nodes,edges,finalIds,width:Math.max(1600,margin*2+(maxDepth+1)*(cardWidth+gapX)-gapX+120),height:Math.max(900,Math.max(...nodes.map(n=>n.y+cardHeight))+100)};
}
