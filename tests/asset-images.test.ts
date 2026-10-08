// @vitest-environment happy-dom
import {act,createElement} from 'react';
import {createRoot} from 'react-dom/client';
import {it,expect} from 'vitest';
import {AssetImage,initials} from '../src/AssetImage';
import {competitionAsset,competitionAssets,historicalCompetitionAssets,participantAsset,participantAssets,historicalParticipantAssets} from '../src/competition-assets';
it('initials are stable and handle missing or single names',()=>{expect(initials(' Rodrigo Talarico ')).toBe('RT');expect(initials('Azul')).toBe('AZ');expect(initials('')).toBe('—');});
it('failed images fall back and a changed source recovers with accessible dimensions',async()=>{
 Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});const host=document.createElement('div');const root=createRoot(host);
 try {await act(async()=>root.render(createElement(AssetImage,{src:'/first.png',name:'Escudo de prueba',size:'sm'})));expect(host.querySelector('img')?.getAttribute('width')).toBe('28');expect(host.querySelector('img')?.alt).toBe('Escudo de prueba');await act(async()=>host.querySelector('img')!.dispatchEvent(new Event('error')));expect(host.querySelector('img')).toBeNull();expect(host.querySelector('[role="img"]')?.getAttribute('aria-label')).toBe('Escudo de prueba');await act(async()=>root.render(createElement(AssetImage,{src:'/second.png',name:'Escudo de prueba',decorative:true})));expect(host.querySelector('img')?.getAttribute('src')).toBe('/second.png');expect(host.querySelector('img')?.alt).toBe('');}finally{await act(async()=>root.unmount());}
});
it('historical registries override by stable code/id without guessed paths',()=>{
 competitionAssets.LIGA_A={logo:'/current.svg'};historicalCompetitionAssets[31]={LIGA_A:{logo:'/old.svg'}};participantAssets.p='/p.png';historicalParticipantAssets[31]={p:'/p-old.png'};
 try{expect(competitionAsset('LIGA_A',31).logo).toBe('/old.svg');expect(competitionAsset('LIGA_A',32).logo).toBe('/current.svg');expect(participantAsset('p',31)).toBe('/p-old.png');expect(participantAsset('unknown')).toBeUndefined();expect(competitionAsset('UNKNOWN')).toEqual({});}finally{competitionAssets.LIGA_A={};delete historicalCompetitionAssets[31];delete participantAssets.p;delete historicalParticipantAssets[31];}
});
