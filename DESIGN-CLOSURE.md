# Etapa 9 — cierre del rediseño

## Disponible
- Mi Club → Ranking histórico: puntos oficiales definitivos de Fechas finalizadas con envío; cada Fecha cuenta una sola vez aunque sirva a varias competiciones. Incluye inactivos. Empates de puntos comparten posición; nombres/IDs sólo estabilizan la presentación. Búsqueda por nombre y acceso a perfiles, sin quinto destino principal.
- Mi Club y perfiles: promedio por Fecha con envío y mejor Fecha (todas las empatadas), además de totales existentes. No incluye borradores, Fechas abiertas ni puntajes provisionales.
- Palmarés individual: únicamente `competition_results` con `CHAMPION` confirmado, agrupado por código y enlazado a cada edición. No se deducen títulos de tablas o puntajes. Los títulos de equipo Dúos siguen en su edición; destinatarios IFFHS no definen titularidad deportiva tras sustituciones.
- Navegación histórica existente por edición, campeón/subcampeón y tablas/cuadros conservada. Sin temporadas ficticias.

## Límites explícitos
- Ranking y estadísticas cubren sólo registros cargados. Ausencia de registros no equivale a ausencia de logros anteriores. No se importaron ni alteraron datos.
- Enfrentamientos: existen cruces de formatos distintos, pero no una definición transversal de DIF ni un consolidado fiable. Mantener estado informativo y enlace a las competiciones; no inventar la agregación.
- Comparador nuevo omitido: navegación ranking → perfiles permite consultar los mismos indicadores; no hay enfrentamientos consolidados para una comparación completa.
- IFFHS conserva su UI Admin y cálculo. No existía una pantalla participante para integrar; no se agregó una nueva.
- Títulos Dúos por persona tras sustituciones requieren una definición explícita distinta de la asignación IFFHS.

## Verificación / lanzamiento
- Tests puntuales SQLite del read model y estadísticas; build local. Suite y E2E sólo en CI.
- Validación visual/funcional en dispositivos a cargo del usuario. Sin otra auditoría responsive ni limpieza especulativa de CSS/componentes compartidos.
- Listo para usar con datos reales cargados; no es una certificación de perfección visual.

## Post-lanzamiento (no implementado)
APK, push, gráficos, uploads/edición de escudos, logros y funcionalidades sociales. Zoom sigue habilitado y `/design` permanece DEV-only.
