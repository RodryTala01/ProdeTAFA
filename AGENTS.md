# ProdeTAFA — instrucciones para Codex

## Objetivo

Construir una aplicación permanente de Prode para aproximadamente 40 participantes. El administrador debe intervenir lo mínimo posible.

El primer MVP debe cubrir exclusivamente el núcleo:

1. Administración de participantes.
2. Creación de una fecha del Prode.
3. Selección de aproximadamente 12 partidos reales desde un proveedor externo.
4. Carga automática de equipos, escudos, competencia, horario, estado y resultados.
5. Login de participantes.
6. Carga y autosave de pronósticos como borrador.
7. Botón explícito `Enviar pronóstico`.
8. Bloqueo individual de cada partido un minuto después del kickoff oficial.
9. Sincronización automática de resultados.
10. Cálculo automático de puntos.
11. Visualización, para cada participante, de sus pronósticos y puntos obtenidos por partido.

No implementar todavía notificaciones push, WhatsApp, generación de tablas gráficas ni estadísticas avanzadas salvo que sean necesarias para el núcleo.

## Arquitectura

- React + TypeScript + Vite.
- Cloudflare Vite Plugin.
- Un único Cloudflare Worker para API + frontend estático.
- Cloudflare D1 como base SQL.
- Mantener el proveedor de fútbol detrás de una interfaz/adaptador para poder reemplazar API-Football u otro proveedor en el futuro.
- Nunca exponer la API key del proveedor en el frontend.

## Modelo funcional

### Prode permanente

No existe un flujo para crear torneos independientes. Esta aplicación corresponde a un único Prode permanente. La unidad operativa es la `fecha` del Prode.

Una fecha contiene los partidos seleccionados por el administrador. Puede contener partidos de diferentes competiciones reales.

### Participantes y acceso

- El administrador crea los participantes.
- Cada participante tiene nombre y apellido, teléfono y contraseña.
- El teléfono funciona como identificador de login.
- No hay autorregistro en el MVP.
- Las contraseñas jamás se guardan en texto plano.
- El administrador puede restablecer la contraseña, pero no verla.
- Deben existir roles `admin` y `participant`.

### Pronósticos

- Un partido normal se pronostica con dos casilleros numéricos: goles local y visitante.
- Todos los partidos todavía abiertos deben estar completos para poder `Enviar pronóstico`.
- Los valores se autosavean como borrador para evitar pérdida de datos.
- El usuario debe tocar explícitamente `Enviar pronóstico` para presentar la fecha.
- Tras enviar, puede seguir modificando partidos que continúen abiertos.
- Cada modificación posterior debe persistirse.
- Si algunos partidos ya cerraron antes del primer envío, esos partidos no impiden enviar el resto de la fecha y quedan sin participación/puntos para ese usuario.
- El participante ve únicamente sus propios pronósticos durante la fecha.
- Mostrar también los puntos obtenidos en cada partido cuando estén disponibles.

### Cierre

- El cierre es individual por partido.
- Un partido cierra exactamente un minuto después del horario oficial de inicio (`kickoff + 1 minuto`).
- Si el proveedor cambia oficialmente el horario antes del cierre, debe actualizarse el cierre automáticamente.
- No confiar solamente en bloqueos de UI: el backend debe rechazar una escritura posterior al cierre.
- El administrador puede hacer una corrección excepcional luego del cierre.
- Toda modificación administrativa posterior al cierre debe quedar registrada en auditoría.

### Puntuación normal

Sobre el resultado reglamentario usado por el Prode:

- Pleno (marcador exacto): 3 puntos totales.
- Parcial (acierta ganador o empate, pero no marcador): 1 punto total.
- Error: 0 puntos.
- El pleno NO suma además el punto de parcial.

Ejemplo con resultado 2-1:

- pronóstico 2-1 = 3
- pronóstico 1-0 = 1
- pronóstico 3-2 = 1
- pronóstico 1-1 = 0
- pronóstico 1-2 = 0

### Extra por penales

Cuando el administrador agrega un partido como tipo `PENALTIES_ONLY` (nombre interno conservado por compatibilidad), el participante debe cargar dos cosas:

- El resultado de los 90 minutos, que puntúa con la regla normal 3/1/0.
- Qué equipo gana la tanda de penales, que vale +1 si la definición realmente llega a penales y el equipo elegido es correcto.

Por lo tanto un pleno de 3 puede terminar valiendo 4 si además se acierta el ganador de la tanda. No usar la sintaxis histórica de asteriscos; la elección del ganador se hace con una selección clara del equipo.

En el MVP no existe un selector extra separado para partidos `NORMAL`: cuando se necesita este pronóstico adicional, el administrador carga ese partido como `PENALTIES_ONLY`.

### Resultados y estados

El sistema debe obtener automáticamente del proveedor, para los partidos elegidos por el administrador:

- equipos
- escudos
- competición
- kickoff
- estado
- marcador
- resultado final
- datos suficientes para determinar ganador/clasificado y si hubo alargue/penales cuando el proveedor lo permita

El administrador debe poder corregir manualmente un resultado o estado si el proveedor falla. Después de una corrección se deben poder recalcular los puntos de manera idempotente.

### En vivo

Si el límite gratuito del proveedor lo permite, mostrar resultado y puntos provisionales durante el partido. Si no, priorizar sincronizar y puntuar inmediatamente al finalizar cada partido.

Los puntos durante un partido deben marcarse claramente como `provisionales`. Sólo quedan definitivos cuando el partido alcanza un estado final confiable.

### Suspensiones y cancelaciones

- Si un partido queda definitivamente suspendido/cancelado para efectos de esa fecha, vale 0 para todos.
- No cuenta como error.
- No borrar los pronósticos existentes.
- Si es simplemente reprogramado, conservar los pronósticos y actualizar el kickoff según la regla definida por negocio.

### Desempates futuros

Guardar desde ahora los datos necesarios para ordenar posteriormente por:

1. Puntos totales.
2. Cantidad de plenos.
3. Cantidad de parciales.
4. Menor cantidad de errores.
5. Cantidad de extras.

El ranking visual completo no forma parte del primer núcleo si retrasa el MVP.

## Seguridad y consistencia

- Toda autorización sensible se valida en backend.
- Usar cookie de sesión `HttpOnly`, `Secure`, `SameSite=Lax` o una solución equivalente segura.
- Normalizar teléfonos antes de comparar.
- Evitar SQL dinámico inseguro; usar parámetros D1.
- Las operaciones de puntaje deben ser idempotentes.
- Fechas en base de datos: UTC ISO-8601. Mostrar al usuario en `America/Argentina/Buenos_Aires`.
- Nunca almacenar secretos reales en el repositorio. Usar `wrangler secret`/variables de entorno.

## Criterio de implementación

Priorizar funcionalidad robusta y sencilla sobre abstracciones innecesarias. No rediseñar reglas de negocio sin actualizar este archivo. Si una regla es ambigua, elegir la solución que minimice intervención manual y documentar la decisión.
