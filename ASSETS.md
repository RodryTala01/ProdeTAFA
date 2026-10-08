# Assets de Prode TAFA

- `public/brand/tafa.png`: original oficial. No mover, modificar, recortar ni filtrar.
- `public/competitions/`: archivos suministrados, por ejemplo `liga-a.svg`, `copa-total.png`. Registrar `logo`/`trophy` por code en `src/competition-assets.ts`. Los nueve codes ya están preparados; no usar IDs numéricos.
- `public/participants/`: nombre por ID estable, por ejemplo `<user-id>.webp`. Registrar la URL `/participants/<user-id>.webp` en `participantAssets`, o pasar `shieldUrl`/`logoUrl` al componente. No existe upload ni campo nuevo en DB.
- `public/teams/`: archivos entregados por el usuario, por ID estable. Registrar en `teamAssets` cuando corresponda. Las URLs reales ya recibidas desde backend siguen funcionando.

Mantener el formato original: SVG si ya es SVG; PNG/WebP para raster. No convertir ni deformar. Las imágenes se muestran completas con `contain`, sin círculos ni filtros.

`ParticipantShield`, `TeamShield` y `CompetitionImage` comparten `AssetImage`: tamaños xs 20, sm 28, md 40 y lg 64; reserva de espacio; carga lazy; alt descriptivo o decorativo; iniciales si falta/falla. Al cambiar la URL se reintenta la imagen nueva.

Para preservar assets históricos, registrar la temporada y el ID/code en `historicalParticipantAssets` o `historicalCompetitionAssets`; las vistas de edición pasan `season`. No reemplazar archivos históricos: usar nombres versionados. `accent` acepta un token CSS futuro y queda sin asignar hasta aprobación del usuario.

No registrar rutas a archivos inexistentes. Agregar el archivo y su entrada al registro en el mismo cambio. Vista manual exclusivamente DEV: `/design?view=assets`. El logo TAFA en las muestras de participante/equipo sólo demuestra carga de imagen; no se asigna a ninguna persona/equipo.

Faltan los escudos personales y los logos/trofeos propios de Liga A/B, Copa A/B, Total, Dúos, Campeones, Papa y Promoción. Se mantienen fallbacks hasta recibirlos. No se generaron ni descargaron imágenes.
