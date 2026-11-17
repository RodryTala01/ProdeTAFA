import {expect,it} from 'vitest';
import {historicalIdentityResolver} from '../worker/historical-archive';
import type {ArchivePayload} from '../src/historical-schema';

it('preserves stable historical rivals across seasons and keeps a distinct H identity',()=>{
 const people=[
  {key:'t4-pollo',name:'Pollo',userId:null,division:null},
  {key:'t6-tomas-delgado',name:'Tomás Delgado',userId:null,division:null},
  {key:'t7-tomas-torcasio',name:'Tomás Torcasio',userId:null,division:null},
  {key:'separate-h',name:'Tomás Torcasio H',userId:null,division:null},
 ];
 const t7={season:{number:7},participants:people} as ArchivePayload;
 const t8={season:{number:8},participants:people} as ArchivePayload;
 const resolve=historicalIdentityResolver([{seasonNumber:7,data:t7},{seasonNumber:8,data:t8}]);
 for(const person of people)expect(resolve(t7,person.key)).toBe(resolve(t8,person.key));
 expect(new Set(people.map(person=>resolve(t7,person.key))).size).toBe(4);
});
