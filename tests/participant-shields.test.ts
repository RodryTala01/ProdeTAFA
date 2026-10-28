import {describe,expect,it} from 'vitest';
import {participantNameKey,participantSprite,participantSpriteAssets} from '../src/competition-assets';

describe('escudos completos de participantes',()=>{
  it('registra los 64 escudos recibidos',()=>{
    expect(Object.keys(participantSpriteAssets)).toHaveLength(64);
  });

  it('resuelve nombres ignorando mayúsculas y tildes',()=>{
    expect(participantSprite('Kevin Sívori')).toEqual(participantSpriteAssets['kevin sivori']);
    expect(participantSprite('Gonzalo Nuñez')).toEqual(participantSpriteAssets['gonzalo nunez']);
    expect(participantSprite('VERÓNICA LUCCHESI')).toEqual(participantSpriteAssets['veronica lucchesi']);
    expect(participantNameKey('  Facundo   Marchese ')).toBe('facundo marchese');
  });

  it('no asigna un escudo a un nombre desconocido',()=>{
    expect(participantSprite('Participante inexistente')).toBeUndefined();
  });
});
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {participantSpriteKeys} from '../src/competition-assets';
import {ParticipantShield} from '../src/AssetImage';
it('todos los IDs verificados conservan su asset aunque cambie el nombre',()=>{
 expect(Object.keys(participantSpriteKeys)).toHaveLength(28);
 for(const [id,key] of Object.entries(participantSpriteKeys)){
  expect(participantSpriteAssets[key]).toBeDefined();
  expect(participantSprite('Nombre cambiado',id)).toEqual(participantSpriteAssets[key]);
 }
});
it('ParticipantShield utiliza el ID para los escudos del atlas',()=>{
 const html=renderToStaticMarkup(createElement(ParticipantShield,{userId:'4ba8b09f-fc1e-46a3-804f-e155ab002845',name:'Nombre actualizado'}));
 expect(html).toContain('asset-image__sprite');expect(html).toContain('85.71428571428571% 0%');
 expect(participantSprite('Sin escudo','id-desconocido')).toBeUndefined();
});
