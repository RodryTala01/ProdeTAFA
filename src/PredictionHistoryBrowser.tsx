import { useState } from 'react';
import PredictionHistory from './PredictionHistory';
import { ParticipantState, useParticipantRead } from './ParticipantState';

export default function PredictionHistoryBrowser({ participantId = '', own = false }: { participantId?: string; own?: boolean }) {
  const [roundId,setRoundId]=useState('');
  const state=useParticipantRead<{rounds:{id:number;name:string}[]}>(`/api/${own?'participant':'admin'}/rounds`,'No pudimos cargar las Fechas.');
  return <section className="reference-section prediction-history"><h2>{own?'Tus envíos y cambios oficiales':'Historial del participante'}</h2><p>Consultá cuándo enviaste o reenviaste cada pronóstico.</p>
    <ParticipantState loading={state.loading} error={state.error} retry={state.retry}/>
    {state.data&&(state.data.rounds.length?<label className="field"><span>Fecha del Prode</span><select value={roundId} onChange={e=>setRoundId(e.target.value)}><option value="">Elegir Fecha</option>{state.data.rounds.map(r=><option key={r.id} value={r.id}>{r.name}</option>)}</select></label>:<p>Todavía no hay Fechas disponibles.</p>)}
    {roundId&&<PredictionHistory key={`${participantId}-${roundId}`} roundId={Number(roundId)} participantId={participantId} own={own} initiallyOpen/>}
  </section>;
}
