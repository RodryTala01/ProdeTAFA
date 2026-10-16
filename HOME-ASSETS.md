# Assets Home

Trofeos: nombres originales del RAR registrados por code; Dúos usa Copa Duos.png. Promoción queda disponible sin tarjeta permanente.

Escudos: coincidencia exacta y única del nombre de archivo con full_name consultado en producción (sólo lectura); registro final por UUID, nunca resolución por nombre en runtime.

- Bruno Alonso: c9c1e740-47c0-4190-8fb3-43d736bf38e3
- Cundo: 7e446fd7-15f2-4105-8612-7127491c5543
- Eze: 22721af7-775d-4b10-8a72-66a13014ad19
- Gabriel Talarico: 7be9fb39-8a8f-4b68-bb09-4d15e7ae505f
- Jhose: 6b779363-e353-4067-9db2-2c6e7005a05c
- Kevin Sívori: 3ba5f8ad-592a-46f2-8cfd-f80dda308384
- Lucas Insua: 9b0365d5-4b40-4ae1-9953-5b61b1b33fff
- Nahuel Gonzalez: a00b13ac-b366-4d90-b1b9-bc9b9dc6b18f
- Renzo Badano: d2a2a001-8214-41a4-9cdd-4bdeb9722477
- Rodrigo Talarico: 9f149f8d-a923-4b4c-8b9a-bd053f1f134b
- Santi: 816314d2-d124-4ba1-a3b2-f4facd580533

Sin participante real identificado; no asignados:

- Alexis Segovia.png
- Anto.png
- Anubis.png
- Axel.png
- Azul Quispe.png
- Bautista Coria.png
- Benja.png
- Cami.png
- Ciro Guarch.png
- Cristian Hantis.png
- Cristian Serpico.png
- Dani Bazan.png
- Fabrizio Escolano.png
- Facundo marchese.png
- Federico Moreno.png
- Felipe Galante.png
- Gonzalo Nuñez.png
- Ian Gangai.png
- Ignacio Cejas.png
- Joaco Fernandez.png
- Joaquin Sampadaro.png
- Joe.png
- Joel Alcalde.png
- Kraiizer.png
- Lautaro Scocier.png
- Leandro Montes.png
- Lucas Aguilera.png
- Luciano Hufschmid.png
- Manu Solbes.png
- Mario Talarico.png
- Marto.png
- Martín Bustos.png
- Matheo olivera.png
- Matias diaz.png
- Matias varela.png
- Morena Poletti.png
- Moreno Pérez.png
- Nacho Soto.png
- Nahuel Scocier.png
- Nata.png
- Nico avalos.png
- Nico Luchetti.png
- Pancho Muzzio.png
- Pollo.png
- Ramiro Ebel.png
- Ramiro vita.png
- Rodri Sebastian.png
- Rodrigo Soca.png
- Tomas delgado.png
- Tomas Gonzalez.png
- Tomas Torcasio.png
- Verónica Lucchesi.png
- Yago.png


## Escudos completos del RAR

El RAR entregado el 16/10/2026 contiene 64 escudos. Todos quedaron incorporados en `public/participants/shields.webp` como atlas 8×8.

Resolución:
- si existe asset por UUID, sigue teniendo prioridad;
- si no existe, `ParticipantShield` busca coincidencia exacta del nombre normalizado (ignora mayúsculas y tildes) contra los 64 nombres del RAR;
- si tampoco hay coincidencia, conserva el fallback de iniciales.

Esto permite mostrar escudos de participantes actuales, inactivos e históricos sin inventar UUIDs para nombres que no estaban identificados en producción.
