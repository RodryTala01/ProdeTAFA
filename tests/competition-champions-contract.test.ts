import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const worker = readFileSync(resolve('worker/competition-champions.ts'), 'utf8');
const migration = readFileSync(resolve('migrations/0011_competition_qualification_slots.sql'), 'utf8');

describe('Copa Campeones qualification slots contract', () => {
  it('stores explicit auditable qualification slots', () => {
    expect(migration).toContain('CREATE TABLE competition_qualification_slots');
    expect(migration).toContain('proposed_user_id');
    expect(migration).toContain('confirmed_user_id');
    expect(migration).toContain('replacement_reason');
  });

  it('defines exactly the 14 confirmed sporting slots', () => {
    for (const code of [
      'LIGA_A_1','LIGA_A_2','LIGA_A_3','LIGA_A_4','LIGA_A_5','LIGA_A_6','LIGA_A_7',
      'LIGA_B_CHAMPION','COPA_A_CHAMPION','COPA_B_CHAMPION','COPA_PAPA_CHAMPION',
      'COPA_TOTAL_CHAMPION','DUO_1','DUO_2',
    ]) expect(worker).toContain(`code: '${code}'`);
  });

  it('prefills from the immediately previous season when historical data exists', () => {
    expect(worker).toContain('seasonNumber - 1');
    expect(worker).toContain('competition_results');
    expect(worker).toContain("result_code='CHAMPION'");
  });

  it('maps the two members of the champion duo into Duo 1 and Duo 2', () => {
    expect(worker).toContain('duoChampionMembers');
    expect(worker).toContain("competitionCode: 'COPA_DUOS'");
    expect(worker).toContain('duoMemberIndex: 0');
    expect(worker).toContain('duoMemberIndex: 1');
  });

  it('does not automatically resolve duplicate qualifiers', () => {
    expect(worker).toContain('Una misma persona no puede ocupar dos cupos de la llave');
    expect(worker).toContain('Resolvé los duplicados manualmente');
  });

  it('requires a reason when a proposed qualifier is replaced or a vacant slot is filled manually', () => {
    expect(worker).toContain('replaced && !requested.reason');
    expect(worker).toContain('indicá el motivo');
  });

  it('creates individual Copa Campeones entries only after admin confirmation', () => {
    expect(worker).toContain('ensureIndividualEntry');
    expect(worker).toContain("entry_type='INDIVIDUAL'");
    expect(worker).toContain('competition.champions_slots_confirmed');
  });

  it('models the fixed staggered bracket instead of a generic 16-player bracket', () => {
    for (const code of ['U1','U2','U3','U4','U5','L1','L2','L3','L4','L5','L6','L7','F1']) {
      expect(worker).toContain(`code: '${code}'`);
    }
    expect(worker).toContain("sourceARef: 'LIGA_A_7'");
    expect(worker).toContain("sourceBRef: 'LIGA_A_3'");
    expect(worker).toContain("sourceBRef: 'LIGA_B_CHAMPION'");
    expect(worker).toContain("sourceBRef: 'COPA_A_CHAMPION'");
    expect(worker).toContain("sourceBRef: 'COPA_PAPA_CHAMPION'");
    expect(worker).toContain("sourceBRef: 'COPA_TOTAL_CHAMPION'");
  });

  it('models the lower branch exactly as confirmed', () => {
    expect(worker).toContain("sourceARef: 'LIGA_A_5', sourceBType: 'SLOT', sourceBRef: 'COPA_B_CHAMPION'");
    expect(worker).toContain("sourceARef: 'LIGA_A_4', sourceBType: 'SLOT', sourceBRef: 'LIGA_A_6'");
    expect(worker).toContain("sourceARef: 'L1', sourceBType: 'WINNER', sourceBRef: 'L2'");
    expect(worker).toContain("sourceARef: 'L3', sourceBType: 'SLOT', sourceBRef: 'DUO_2'");
    expect(worker).toContain("sourceARef: 'LIGA_A_2', sourceBType: 'SLOT', sourceBRef: 'DUO_1'");
    expect(worker).toContain("sourceARef: 'L4', sourceBType: 'WINNER', sourceBRef: 'L5'");
    expect(worker).toContain("sourceARef: 'L6', sourceBType: 'SLOT', sourceBRef: 'LIGA_A_1'");
  });

  it('builds the final from the winners of the two fixed branches and has no third place', () => {
    expect(worker).toContain("sourceARef: 'U5', sourceBType: 'WINNER', sourceBRef: 'L7'");
    expect(worker).not.toContain('THIRD');
    expect(worker).not.toContain('third-place');
  });

  it('only unlocks winner-fed nodes after the source encounter is admin confirmed', () => {
    expect(worker).toContain("row.status !== 'finished'");
    expect(worker).toContain('row.admin_confirmed_at == null');
    expect(worker).toContain('readyToActivate');
  });

  it('activates each fixed node using the shared knockout encounter engine', () => {
    expect(worker).toContain('competition_encounters');
    expect(worker).toContain("stage.stage_type !== 'KNOCKOUT'");
    expect(worker).toContain('competition.champions_node_activated');
  });
});
