import {Brand} from '../ui';
import {ParticipantShield,TeamShield,CompetitionImage,AssetImage} from '../AssetImage';
import {competitionCodes} from '../competition-assets';
export default function AssetsPreview() {
 return <main className="app-shell"><div className="design-notice">ASSETS · DEV ONLY · SIN DATOS PRODUCTIVOS</div><Brand large/><h1>Imágenes y fallbacks</h1><p>El logo TAFA se usa abajo sólo como muestra técnica de carga. No representa un escudo personal ni un equipo.</p><div className="asset-preview-grid">
 <section><h2>Participantes</h2><div className="asset-preview-sample"><ParticipantShield name="Ejemplo Técnico" logoUrl="/brand/tafa.png" size="lg"/>Imagen existente · muestra</div><div className="asset-preview-sample">{(['xs','sm','md','lg'] as const).map(size=><ParticipantShield key={size} name="Participante Ejemplo" size={size}/>)}</div></section>
 <section><h2>Equipos</h2><div className="asset-preview-sample"><TeamShield name="Ejemplo técnico" logoUrl="/brand/tafa.png"/>Imagen existente · muestra</div><div className="asset-preview-sample"><TeamShield name="Equipo Ejemplo"/>Sin archivo</div></section>
 <section><h2>Error de carga</h2><div className="asset-preview-sample"><AssetImage name="Imagen no disponible" src="/design-missing-image.png"/>Fallback tras carga fallida</div></section>
 </div><h2>Competiciones</h2><div className="asset-preview-grid">{competitionCodes.map(code=><section key={code}><h3>{code.replaceAll('_',' ')}</h3><div className="asset-preview-sample"><CompetitionImage code={code} name={code.replaceAll('_',' ')}/>Logo · <CompetitionImage code={code} name={code.replaceAll('_',' ')} variant="trophy"/>Trofeo</div><small>Se usa el archivo registrado o el fallback cuando falta.</small></section>)}</div></main>;
}
