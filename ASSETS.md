# Assets de Prode TAFA

- `public/brand/tafa.png`: original oficial. No mover, modificar, recortar ni filtrar.
- `public/competitions/`: archivos suministrados, por ejemplo `liga-a.svg`, `copa-total.png`. Registrar `logo`/`trophy` por code en `src/competition-assets.ts`. Los nueve codes ya están preparados; no usar IDs numéricos.
- `public/participants/`: nombre por ID estable, por ejemplo `<user-id>.webp`. Registrar la URL `/participants/<user-id>.webp` en `participantAssets`, o pasar `shieldUrl`/`logoUrl` al componente. No existe upload ni campo nuevo en DB.
- `public/teams/`: archivos entregados por el usuario, por ID estable. Registrar en `teamAssets` cuando corresponda. Las URLs reales ya recibidas desde backend siguen funcionando.

Mantener el formato original: SVG si ya es SVG; PNG/WebP para raster. No convertir ni deformar. Las imágenes se muestran completas con `contain`, sin círculos ni filtros.

`ParticipantShield`, `TeamShield` y `CompetitionImage` comparten `AssetImage`: tamaños xs 20, sm 28, md 40 y lg 64; reserva de espacio; carga lazy; alt descriptivo o decorativo; iniciales si falta/falla. Al cambiar la URL se reintenta la imagen nueva.

Para preservar assets históricos, registrar la temporada y el ID/code en `historicalParticipantAssets` o `historicalCompetitionAssets`; las vistas de edición pasan `season`. No reemplazar archivos históricos: usar nombres versionados. `accent` acepta un token CSS futuro y queda sin asignar hasta aprobación del usuario.

No registrar rutas a archivos inexistentes. Agregar el archivo y su entrada al registro en el mismo cambio. Vista manual exclusivamente DEV: `/design?view=assets`. El logo TAFA en las muestras de participante/equipo sólo demuestra carga de imagen; no se asigna a ninguna persona/equipo.

Los nueve trofeos y 64 escudos suministrados están incorporados. Los 28 participantes actuales tienen su escudo verificado por UUID: 11 PNGs individuales y 17 posiciones del atlas. Ver HOME-ASSETS.md y participantSpriteKeys; un cambio de nombre no cambia el escudo. Los restantes 36 assets no se asocian a identidades inventadas.

## Logos reales de las ligas (Pronósticos)

Los nombres de las competiciones **reales** devueltos por el proveedor se
resuelven mediante `src/external-league-assets.ts` cuando éste no proporciona
`competitionLogoUrl`. Esta tabla sólo contiene alias verificados, no inventa
un logo para una liga ambigua como «Primera División». Los recursos visuales
se consultan a **Wikimedia Commons** con `Special:FilePath`; no se incluyen
archivos binarios de terceros en el repositorio. Si un recurso deja de estar
disponible, `AssetImage` muestra sus iniciales.

Fuentes originales (cada enlace contiene el historial y la licencia del logo):

- Inglaterra: [Premier League](https://commons.wikimedia.org/wiki/File:Pl-logo-light.svg).
- Argentina: [Liga Profesional](https://commons.wikimedia.org/wiki/File:Logo_LPF_AFA.svg) y [Primera B Nacional](https://commons.wikimedia.org/wiki/File:Primera_B_Nacional_logo.png).
- España: [LaLiga EA Sports](https://commons.wikimedia.org/wiki/File:LaLiga_EA_Sports_2023_Vertical_Logo.svg) y [LaLiga Hypermotion](https://commons.wikimedia.org/wiki/File:LaLiga_Hypermotion_2023_Vertical_Logo.svg).
- Italia: [Serie A](https://commons.wikimedia.org/wiki/File:Serie_A.svg).
- Brasil: [Campeonato Brasileiro Série A (2026)](https://commons.wikimedia.org/wiki/File:Campeonato_Brasileiro_S%C3%A9rie_A_logo_(2026).svg).
- Colombia: [Liga BetPlay](https://commons.wikimedia.org/wiki/File:BetPlay-Dimayor_logo.svg).
- Uruguay: [Liga AUF Uruguaya](https://commons.wikimedia.org/wiki/File:Liga_AUF_Uruguaya_-_logo_azul.png), autor AUF, **CC BY-SA 4.0**, sin modificaciones: [licencia](https://creativecommons.org/licenses/by-sa/4.0/).
- Francia: [Ligue 1](https://commons.wikimedia.org/wiki/File:Ligue_1_McDonald%27s_logo.svg).
- Alemania: [Bundesliga](https://commons.wikimedia.org/wiki/File:Bundesliga_logo.svg).
- Países Bajos: [Eredivisie](https://commons.wikimedia.org/wiki/File:Eredivisie_nieuw_logo_2017-.svg).
- Portugal: [Liga Portugal](https://commons.wikimedia.org/wiki/File:Liga_Portugal_Betclic_logo.svg).
- EE. UU.: [MLS](https://commons.wikimedia.org/wiki/File:Major_League_Soccer_logo.svg).
- Arabia Saudita: [Saudi Pro League](https://commons.wikimedia.org/wiki/File:Saudi_Pro_League_Logo.svg).
- UEFA: [Champions League](https://commons.wikimedia.org/wiki/File:UEFA_Champions_League_logo_no_text.svg), [Europa League](https://commons.wikimedia.org/wiki/File:UEFA_Europa_league_logo.svg), [Conference League](https://commons.wikimedia.org/wiki/File:UEFA_Conference_League_logo_(2024_version).svg).

Los logos son marcas de terceros; TAFA no implica afiliación a las ligas.
