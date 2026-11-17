import {participantNameKey} from './competition-assets';
import {useState} from 'react';
import {ParticipantShield} from './AssetImage';
import {ParticipantState,useParticipantRead} from './ParticipantState';

type Person={id:string;name:string;shieldUrl:string|null};

export default function ParticipantDirectory(){
 const [search,setSearch]=useState('');
 const read=useParticipantRead<{people:Person[]}>('/api/participant/directory','No pudimos cargar los participantes.');
 const people=read.data?.people.filter(p=>participantNameKey(p.name).includes(participantNameKey(search)))??[];
 return <section className="reference-section">
  <h1>Participantes</h1>
  <label>Buscar por nombre <input type="search" value={search} onChange={e=>setSearch(e.target.value)}/></label>
  <ParticipantState loading={read.loading} error={read.error} retry={read.retry}/>
  {read.data&&(!people.length?<p>No encontramos participantes.</p>:<ul className="club-recent">
   {people.map(p=><li key={p.id}><a href={'#/club/participante/'+encodeURIComponent(p.id)}>
    <span className="totals-person"><ParticipantShield userId={p.id} name={p.name} shieldUrl={p.shieldUrl} size="sm" decorative/>{p.name}</span>
   </a></li>)}
  </ul>)}
 </section>;
}
