# E2E local T32 → T33

Validado el 27 de septiembre de 2026 mediante HTTP contra el Worker real de Vite y D1 local aislada en `.wrangler/e2e-t32`. No usa datos de producción, deploy ni D1 remota.

## Escenario ejecutado

- 32 participantes ficticios, 16 por división; armado manual de grupos y parejas.
- 18 Fechas de 12 partidos: dos de grupos, cinco de Liga, cuatro de eliminatorias compartidas, seis niveles de Campeones y Promoción.
- Autosave y envío oficial por los endpoints de participante; resultados manuales con motivo por los endpoints Admin.
- Copa A/B, Total (mini-fechas y tercer puesto), Dúos (survival, semifinales con bonus y final), Campeones (14 cupos manuales y 13 nodos fijos), Papa (progresión y tercer puesto), Promoción (dos cruces y cuatro movimientos).
- Empate de Papa resuelto mediante TAFA en la Fecha Liga posterior.
- 158 resultados finales confirmados, cálculo de 32 totales IFFHS y transición confirmada/aplicada a T33 draft con 32 integrantes.
- Verificación SQL de sólo lectura: 576 presentaciones únicas, 6.912 pronósticos oficiales, exactamente 12 por participante/Fecha y 88 ganadores de eliminatorias confirmados.
- Contextos históricos simultáneos de A, Total, Dúos y Papa sobre un único formulario.

## Regresiones corregidas

- Liga no tenía entradas para confirmar su snapshot: preparación Admin explícita, idempotente y auditada desde la división histórica después de cinco Fechas cerradas. IFFHS bloquea una Liga con participantes pero sin resultados preparados.
- El cierre de Total exigía ganador confirmado en grupos, donde hay empates: la evidencia de ganadores se limita a eliminatorias; se exige finalizar las Fechas vinculadas.
- Las claves React de contextos e historial colisionaban y duplicaban paneles cada segundo.
- La navegación inferior móvil heredaba `top`, cubría la pantalla e interceptaba la selección de penales. Se corrigieron navegación, separación del reenvío y desplazamiento del foco.
- La tabla histórica ensanchaba la página; ahora conserva su desplazamiento interno.
- El revelado de partidos con Penales omitía el marcador de 90 minutos.

## Repetición técnica

`npm run db:migrate:e2e`, `npm run dev:e2e` y `npm run test:e2e:local` usan exclusivamente el directorio aislado. El runner exige un marcador servido sólo por `vite.e2e.config.ts` y bindings D1 explícitamente locales. Guarda checkpoints sin cookies ni contraseñas en `.wrangler/e2e-t32/scenario.json`; una repetición completa requiere otra base aislada vacía, no borrar la base habitual.

Datos ficticios de esta base: Admin `0000032000`, participantes `0000032001`–`0000032032`; contraseña de prueba `LocalE2E123!`. No sirven fuera del escenario local.

Validación móvil realizada a 390×844: Admin/resultados de Liga, tablas de Total y final de Campeones; participante, reenvío, contexto histórico compartido, revelado, navegación y foco Local → Visitante → Penales → siguiente partido. Las capturas quedan fuera de Git en el directorio local de prueba.

La suite de regresión completa pasó: 383 tests en 47 archivos. El build TypeScript/Vite terminó correctamente. CI valida migraciones locales, tests y build; no despliega.
