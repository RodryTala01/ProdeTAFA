# Archivo histórico · Prode TAFA (v1)

## Objetivo y proceso por temporada

Cada archivo representa **una temporada**, pero una temporada puede completarse mediante varios archivos/lotes sin repetir registros deportivos. Se carga T1 y se comprueba en la vista previa, luego T2, T3...; nunca se presume que se jugaron todas las copas en todas las temporadas. Las ediciones de Mundial o Copa América pueden utilizar solamente una competición `TOURNAMENT`.

En Admin → **Archivo histórico**:
1. Descargar la plantilla Excel para T1. Incluye un catálogo de participantes actuales, con `userId`, cuando el administrador está conectado. Si la temporada ya tiene cargas, también precompleta los participantes y competiciones históricas, dejando vacías las hojas de datos deportivos para agregar solo registros nuevos.
2. Completar sus hojas en el Excel (o pedir a ChatGPT que prepare el archivo a partir de las planillas originales).
3. Elegir el archivo `.xlsx`, revisar conteos, errores y advertencias.
4. Marcar confirmación de revisión y guardar. Se registra el nombre del archivo, checksum SHA-256 y usuario administrador.
5. Examinar el historial y descargar un respaldo Excel o JSON.
6. Si una importación era equivocada, **revertir esa carga** con motivo. Se marca como revertida y desaparece de los cómputos pero permanece en el historial y auditoría. Se puede completar T1 por partes y revertir solo la parte equivocada sin tocar T2 ni otras cargas de T1.

## Estructura del Excel

La hoja `Temporada` contiene las claves `version=1`, `number`, `name`, `kind`, `notes`. Solo debe haber **una fila por clave**.

- **Participantes**: `key,name,userId,division`. `key` es la identidad histórica interna de esa temporada; `userId` vincula la persona a la cuenta actual de TAFA. Una clave sin `userId` conserva datos, pero no fusiona esa persona a un perfil actual.
- **Competiciones**: `code,name,kind` (LEAGUE / CUP / TOURNAMENT / PROMOTION). Añadir **solo competiciones reales**.
- **Estadisticas**: `participantKey,points,fulls,partials,errors,extras,dates,predictions`. Los puntos se cargan una vez por persona y temporada y alimentan el ranking histórico. Los campos restantes pueden quedar vacíos si no existían en los originales.
- **Tablas**: `competitionCode,participantKey,position,points,fulls,partials,errors,extras`. Cada competición tiene su tabla final. No se vuelve a sumar al total general.
- **Fechas**: `round,participantKey,points,fulls,partials,errors,extras`. Si las Fechas están completas, se verifica que sumen el total de temporada.
- **Resultados**: `competitionCode,participantKey,position,resultCode,teamLabel`, ejemplo `CHAMPION` o `RUNNER_UP`. `teamLabel` es opcional para Dúos.
- **Cruces**: `competitionCode,stage,round,aKey,bKey,pointsA,pointsB,plenosA,plenosB,scoreBasis`. Solo enfrentamientos **directos oficiales**. `scoreBasis` puede ser INDIVIDUAL o DUO.
- **Movimientos**: `participantKey,fromDivision,toDivision,type,detail`. Tipo ASCENSO, DESCENSO, PERMANENCIA u OTRO.
- **IFFHS**: `participantKey,points,position`. El total IFFHS es independiente de los puntos deportivos; el ranking IFFHS une ambos orígenes sin duplicar la misma temporada/usuario.
- **LEEME**: notas de uso.
- **Catalogo TAFA**: hoja auxiliar con ID/nombre de cuentas actuales; no se importa como datos deportivos.

No reemplazar celdas vacías por 0 si el dato no existía. No agregar filas ficticias de torneos no disputados. Al detectar una inconsistencia, corregir primero el Excel original.

## Datos y seguridad

- `migrations/0017_historical_imports.sql` crea una tabla aditiva sin modificar puntuaciones ni predicciones ya existentes.
- El archivo original no se almacena en binario: se guarda **el contenido normalizado** y se puede exportar desde el historial en Excel/JSON.
- Se permiten varios lotes activos por temporada, pero un mismo registro deportivo no puede repetirse entre lotes. Las identidades y los catálogos deben coincidir; cada lote conserva su reversión independiente.
- El origen y reversión se registran en `audit_log`.
- Las estadísticas históricas se suman una sola vez desde `Estadisticas`, nunca desde las tablas por competición.
- Las cuentas antiguas sin `userId` no se asignan por parecido de nombre para evitar atribuciones incorrectas.
- No importar temporadas que ya tengan Fechas/enfrentamientos/resultados oficiales del motor actual.
- No modificar `d1_migrations` a mano ni omitir `scripts/check-deploy-schema.mjs`.

## Despliegue

Se agregó un workflow **de una sola ejecución** para aplicar únicamente la migración `0017`, con test, build, E2E y verificación read-only previa y posterior del registro remoto. Una vez finalizado con éxito, se puede fusionar el PR y la publicación normal verificará automáticamente el registro D1.

Las estadísticas históricas se incorporan en Mi Club, historial de rivales, ranking general, palmarés, ascensos/descensos y ranking IFFHS. Para los datos antiguos que carezcan de un pronóstico individual, no se crean pronósticos ficticios.
