import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const config = JSON.parse(readFileSync('wrangler.jsonc','utf8'));
assert(config.d1_databases.every((binding) => binding.remote === false));
const base = 'http://127.0.0.1:5174';
async function api(path, method='GET', body, cookie='') {
  const response = await fetch(base+path, { method, redirect:'error', headers: {'content-type':'application/json',cookie}, body: body === undefined ? undefined : JSON.stringify(body) });
  const data = await response.json();
  assert(response.ok, `${method} ${path}: ${JSON.stringify(data)}`);
  return { data, cookie: response.headers.get('set-cookie')?.split(';')[0] ?? cookie };
}
const { cookie: admin } = await api('/api/auth/login','POST',{phone:'0000000001',password:'Admin123!'});
const { data: detail } = await api('/api/admin/rounds/1','GET',undefined,admin);
assert.equal(detail.round.name,'LOCAL E2E - Fecha 1');
assert.equal(detail.round.status,'open');
assert(detail.round.matches.every((match) => match.providerFixtureId.startsWith('local-e2e-')));
const { data: accounts } = await api('/api/admin/users','GET',undefined,admin);
const phone='0000000201', password='Prueba123!';
if (!accounts.users.some((user) => user.phone===phone)) {
  await api('/api/admin/users','POST',{fullName:'Auditoria Prueba Local',phone,password},admin);
}
const { data: account, cookie: participant } = await api('/api/auth/login','POST',{phone,password});
const path='/api/participant/round?roundId=1';
const initial=(await api(path,'GET',undefined,participant)).data.round;
assert.equal(initial.submitted,false,'Esta cuenta ya fue probada: conservar el historial, no reiniciarlo.');
for (const match of initial.matches) {
  await api(`/api/participant/predictions/${match.id}`,'PUT',{
    homeScore:1,awayScore:match.matchType==='PENALTIES_ONLY'?1:0,
    extraTeamId:match.matchType==='PENALTIES_ONLY'?match.home.id:null,
  },participant);
}
const historyPath='/api/participant/rounds/1/prediction-history';
assert.equal((await api(historyPath,'GET',undefined,participant)).data.events.length,0);
const first=initial.matches[0];
assert.equal(first.home.name,'Local 01');
await api(`/api/admin/matches/${first.id}/manual-result`,'PUT',{
  homeScore:1,awayScore:0,wentToPenalties:false,isVoid:false,reason:'Prueba local de oficial vs borrador (0005)',
},admin);
assert.equal((await api(path,'GET',undefined,participant)).data.round.pointsTotal,0);
await api('/api/participant/rounds/1/submit','POST',{},participant);
assert.equal((await api(path,'GET',undefined,participant)).data.round.pointsTotal,3);
await api(`/api/participant/predictions/${first.id}`,'PUT',{homeScore:2,awayScore:0},participant);
const pending=(await api(path,'GET',undefined,participant)).data.round;
assert.equal(pending.pointsTotal,3);
assert.equal(pending.matches[0].prediction.homeScore,2);
assert.equal(pending.matches[0].officialPrediction.homeScore,1);
assert.equal((await api(historyPath,'GET',undefined,participant)).data.events.length,1);
await api('/api/participant/rounds/1/submit','POST',{},participant);
assert.equal((await api(path,'GET',undefined,participant)).data.round.pointsTotal,1);
const history=(await api(historyPath,'GET',undefined,participant)).data;
assert.deepEqual(history.events.map((event)=>event.type),['RESUBMISSION','PREDICTION_CHANGE','FIRST_SUBMISSION']);
const adminHistory=(await api(`/api/admin/rounds/1/prediction-history?userId=${account.user.id}`,'GET',undefined,admin)).data;
assert.deepEqual(adminHistory.events,history.events);
console.log('LOCAL verificado: borrador 0 puntos → primer envío 3 → cambio sin reenviar 3 → reenvío 1. Historial: FIRST_SUBMISSION, PREDICTION_CHANGE, RESUBMISSION.');
console.log('Cuenta de demostración: Auditoria Prueba Local / 0000000201 / Prueba123!');
await api('/api/auth/logout','POST',{},participant);
await api('/api/auth/logout','POST',{},admin);
