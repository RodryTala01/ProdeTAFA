# Prode TAFA · Identidad 01

## Alcance

UI/UX exclusivamente. T32 sigue siendo la base funcional. No cambia reglas, endpoints, modelos ni migraciones. Sin deploy ni cambios productivos. La navegación real conserva sus destinos; las referencias de Inicio y Competiciones no introducen nuevas consultas ni cálculos deportivos.

## Revisar localmente

Servidor de esta revisión: `http://127.0.0.1:5174` con `vite.e2e.config.ts`, D1 explícitamente local en `.wrangler/e2e-t32`.

- `/`: Login y app real local.
- `/design?view=home`: Inicio de referencia.
- `/design?view=predictions`: lista interactiva de 12 partidos de ejemplo.
- `/design?view=competitions`: listado de referencia.
- `/design?view=login`: mismo componente real de Login.
- `/design?view=system`: controles, estados y modal nativo accesible.

La franja de referencia identifica los datos ficticios. Los marcadores de referencia viven sólo en memoria; el botón Enviar no llama a la API. `/design` se importa dinámicamente sólo bajo `import.meta.env.DEV`: Vite elimina el módulo y sus fixtures del build productivo. Login de referencia reutiliza el login local; no es una cuenta ficticia conectada a producción.

## Fundamentos

- Negro `--bg`, carbón para superficies, blanco y grises para lectura. Verde lima moderado para acciones/foco/selección. Sin gradientes, blur, glow ni sombras decorativas.
- Semántica: verde clasificación/éxito; amarillo Promoción y advertencias; rojo errores/descenso; azul reservado para Copa Campeones. Los estados también tienen texto.
- `src/design-tokens.css` contiene toda la paleta CSS, familias tipográficas, escala de espaciado, radios y dimensiones compartidas. `theme-color` de HTML/manifest replica `--bg` porque esos formatos no aceptan variables CSS.
- Sans de sistema para cuerpo. Arial Narrow/Roboto Condensed/Franklin Gothic Medium con fallback Arial para títulos y números; sin fuentes externas ni dependencias nuevas. La apariencia exacta de la condensada depende del sistema.
- Números tabulares. Títulos compactos, jerarquía fuerte y pocos niveles. Evitar etiquetas decorativas y cards anidadas.
- Radios: 4 px auxiliares; 6 px controles; 8 px paneles. Controles y botones de al menos 44 px. Márgenes de 4/8/12/16/24/32/48 px mediante tokens.

## Componentes

`src/components.css`: botones primary/secondary/ghost/danger/icon, inputs y select oscuros, focus visible, error/success/disabled, tablas numéricas, alertas, estados, modal y navegación base. `src/styles.css`: shell, header, Login y layouts existentes.

`src/ui.tsx`: Brand, iconos SVG outline propios (no son un logo), PasswordField con label/toggle accesible, TeamIdentity con escudo o iniciales neutras. No emojis ni nueva dependencia de iconos.

`src/CompetitionList.tsx`: presentación reutilizable de nombre, fase/rival, estado, posición y espacio para logo. Los datos deben venir del backend; no calcula elegibilidad ni standings. `src/sports-components.css` define esta lista y los bloques deportivos de referencia.

`src/participant-round.css`: filas separadas por líneas; Local → marcador → marcador → Visitante también en móvil. Penales mantiene sus dos controles. Se conservan los handlers de autosave, envío/reenvío, bloqueo y foco. Contextos se presentan sin card extra. Historial, resultados y puntajes siguen disponibles.

## Logo y futuros recursos

`public/brand/tafa.png` es una copia exacta del PNG oficial provisto por el usuario, sin reinterpretación, recorte, recoloración ni edición. Se mantiene la proporción, los colores y el sol. Tamaño original: 505.822 bytes; se usa a 30×48 o 58×92 CSS px. No se agregaron imágenes decorativas.

Los futuros escudos de participantes/clubes y logos de competición pueden ocupar los slots de TeamIdentity/CompetitionList. Los monogramas actuales son placeholders neutros, no nuevos escudos. Favicon e iconos instalables existentes quedan para el bloque PWA; no se implementa un nuevo install prompt ni bloqueo de zoom.

## Validación

Tests de contrato de contraste WCAG AA, Login/autofill, contraseña oculta y toggle que no envía el formulario, centralización de colores. Tests existentes del recorrido de foco y suite completa.

Revisión de navegador a 1440×960, 768×1024 y 390×844; Login, referencias y pantallas reales de Admin/Participante. El smoke local verifica envío/reenvío, penales, persistencia visual, lectura de Liga/Historial y ausencia de overflow general. Tablas anchas conservan scroll en su propio contenedor.

## Etapa 2 (sin implementar)

- Acordar navegación real de Inicio/Competiciones y conectar los modelos de presentación exclusivamente a datos existentes.
- Extender la composición compacta a los interiores de cada competición, preservando su motor específico.
- Integrar escudos/trofeos definitivos y preparar iconos instalables oficiales en la fase PWA.
- Revisar instalación real en dispositivos y ergonomía con teclado virtual cuando se aborde la etapa mobile.
