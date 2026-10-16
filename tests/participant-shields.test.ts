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
