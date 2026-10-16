import {useState,type CSSProperties} from 'react';
import {competitionAsset,participantAsset,participantSprite,participantSpriteGrid,teamAssets} from './competition-assets';
import './asset-images.css';
export type AssetSize = 'xs'|'sm'|'md'|'lg';
const sizes:Record<AssetSize,number>={xs:20,sm:28,md:40,lg:64};
export function initials(name:string) {
  const words=name.trim().split(/\s+/).filter(Boolean);
  return (words.length>1?`${Array.from(words[0])[0]}${Array.from(words[words.length-1])[0]}`:Array.from(words[0]??'').slice(0,2).join('')).toUpperCase()||'—';
}
type ImageProps={src?:string|null;name:string;size?:AssetSize;decorative?:boolean;fallback?:string;loading?:'lazy'|'eager'};
// Remount by source so a changed URL can recover after an earlier image failed.
function AssetSource({src,name,size='md',decorative=false,fallback,loading='lazy'}:ImageProps) {
  const [failed,setFailed]=useState(false);
  return <span className={`asset-image asset-image--${size}`} style={{width:sizes[size],height:sizes[size]}} aria-hidden={decorative||undefined}>
    {src&&!failed?<img src={src} width={sizes[size]} height={sizes[size]} alt={decorative?'':name} loading={loading} decoding="async" onError={()=>setFailed(true)}/>:<span className="asset-image__fallback" role={decorative?undefined:'img'} aria-label={decorative?undefined:name}>{fallback??initials(name)}</span>}
  </span>;
}
export function AssetImage(props:ImageProps) {return <AssetSource key={props.src??''} {...props}/>;}
function ParticipantSprite({name,position,size='md',decorative=false}:{name:string;position:readonly[number,number];size?:AssetSize;decorative?:boolean}) {
  const [col,row]=position;
  const columns=participantSpriteGrid.columns;
  const rows=participantSpriteGrid.rows;
  const x=columns>1?col*100/(columns-1):0;
  const y=rows>1?row*100/(rows-1):0;
  return <span className={`asset-image asset-image--${size}`} style={{width:sizes[size],height:sizes[size]}} aria-hidden={decorative||undefined}>
    <span className="asset-image__sprite" role={decorative?undefined:'img'} aria-label={decorative?undefined:`Escudo de ${name}`} style={{backgroundPosition:`${x}% ${y}%`}}/>
  </span>;
}
export function ParticipantShield({name,userId,season,logoUrl,shieldUrl,...props}:{name:string;userId?:string;season?:number;logoUrl?:string|null;shieldUrl?:string|null;size?:AssetSize;decorative?:boolean}) {
  const direct=shieldUrl||logoUrl||participantAsset(userId,season);
  const sprite=!direct?participantSprite(name):undefined;
  return direct
    ? <AssetImage {...props} name={`Escudo de ${name}`} fallback={initials(name)} src={direct}/>
    : sprite
      ? <ParticipantSprite {...props} name={name} position={sprite}/>
      : <AssetImage {...props} name={`Escudo de ${name}`} fallback={initials(name)}/>;
}
export function TeamShield({name,teamId,logoUrl,...props}:{name:string;teamId?:string|null;logoUrl?:string|null;size?:AssetSize;decorative?:boolean}) {
  return <AssetImage {...props} name={`Escudo de ${name}`} fallback={initials(name)} src={logoUrl||(teamId?teamAssets[teamId]:undefined)}/>;
}
export function CompetitionImage({code='',name,season,logoUrl,trophyUrl,variant='logo',size='md',decorative=false}:{code?:string;name:string;season?:number;logoUrl?:string|null;trophyUrl?:string|null;variant?:'logo'|'trophy';size?:AssetSize;decorative?:boolean}) {
  const asset=competitionAsset(code,season);
  const logo=logoUrl||asset.logo;const trophy=trophyUrl||asset.trophy;
  const style=asset.accent?{color:`var(${asset.accent})`} as CSSProperties:undefined;
  return <span className="competition-image" style={style}><AssetImage name={name} fallback={initials(name)} src={variant==='trophy'?trophy||logo:logo||trophy} size={size} decorative={decorative}/></span>;
}
