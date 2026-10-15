// @vitest-environment happy-dom
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {expect,it} from 'vitest';
import ParticipantDashboard from '../src/ParticipantDashboard';
it('all participant routes share one header with their real parent section active',()=>{
 for(const [path,parent] of [['inicio','inicio'],['pronosticos','pronosticos'],['competiciones','competiciones'],['competiciones/liga','competiciones'],['competiciones/copa-a?season=32','competiciones'],['club','club'],['club/historial/1','club'],['club/participante/persona','club']]){
  window.location.hash='#/'+path;
  const html=renderToStaticMarkup(createElement(ParticipantDashboard,{user:{id:'test',fullName:'Participante'},onLogout:()=>{}}));
  const host=document.createElement('div');host.innerHTML=html;
  expect(host.querySelectorAll('header')).toHaveLength(1);
  expect(host.querySelectorAll('.participant-nav')).toHaveLength(1);
  expect(host.querySelector('header nav a[aria-current=page]')?.getAttribute('href')).toBe('#/'+parent);
  expect(host.querySelector('header .participant-brand')?.getAttribute('href')).toBe('#/inicio');
  expect(host.querySelector('header img')?.getAttribute('src')).toBe('/brand/tafa.png');
  expect(Array.from(host.querySelectorAll('.participant-nav a')).map(a=>a.textContent)).toEqual(['Inicio','Pronósticos','Competiciones','Mi Club']);
 }
 window.location.hash='';
});

