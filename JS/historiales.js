function agregarResultado(resultado) {
    // Definir el patrón de la expresión regular para extraer la información
    var patron = /^(.*?) (\d+) - (\d+) (.*?)$/;

    // Ejecutar la expresión regular en el resultado proporcionado
    var coincidencia = resultado.match(patron);

    if (coincidencia) {
        // Extraer los grupos de la coincidencia
        var equipo1 = coincidencia[1];
        var puntosEquipo1 = parseInt(coincidencia[2]); // Convertir a número entero
        var puntosRival = parseInt(coincidencia[3]); // Convertir a número entero
        var rival = coincidencia[4];

        // Imprimir los resultados
        console.log("Equipo 1:", equipo1);
        console.log("Puntos Equipo 1:", puntosEquipo1);
        console.log("Puntos Rival:", puntosRival);
        console.log("Rival:", rival);

        // Buscar el nombre del equipo en el HTML y agregar los resultados en consecuencia
        var nombreEquipoHTML = document.querySelector(".tituloHistorial").textContent.trim();

        // Verificar si alguno de los equipos en el resultado coincide con el equipo del dueño del historial en el HTML
        if (nombreEquipoHTML === equipo1 || nombreEquipoHTML === rival) {
            // Determinar qué equipo es el dueño del historial en el HTML
            var equipoDuenioHistorial = (nombreEquipoHTML === equipo1) ? equipo1 : rival;
            var puntosDuenioHistorial = (nombreEquipoHTML === equipo1) ? puntosEquipo1 : puntosRival;
            var puntosRivalDuenioHistorial = (nombreEquipoHTML === equipo1) ? puntosRival : puntosEquipo1;

            // Calcular los partidos ganados (PG) y perdidos (PP) del dueño del historial
            var diferenciaPuntos = puntosDuenioHistorial - puntosRivalDuenioHistorial;
            var PG = (diferenciaPuntos > 0) ? 1 : 0;
            var PP = (diferenciaPuntos < 0) ? 1 : 0;

            // Si hay empate en los puntos, revisamos si hubo empate en el marcador
            if (diferenciaPuntos === 0) {
                if (puntosEquipo1 === puntosRival) {
                    PG = 0;
                    PP = 0;
                } else {
                    // En caso contrario, consideramos como empate si no hubo goles marcados por ninguno de los equipos
                    if (puntosEquipo1 === 0 && puntosRival === 0) {
                        PG = 0;
                        PP = 0;
                    } else {
                        // Si hubo goles marcados por al menos uno de los equipos, consideramos como un punto para cada uno
                        PG = 1;
                        PP = 1;
                    }
                }
            }

            // Calcular la diferencia entre partidos ganados y perdidos
            var diferencia = PG - PP;

            // Crear una nueva fila en la tabla HTML
            var tablaHistorial = document.getElementById("historial");
            var nuevaFila = tablaHistorial.insertRow(-1); // Insertar al final de la tabla

            // Insertar celdas con los resultados
            if (equipoDuenioHistorial === equipo1) {
                nuevaFila.insertCell(0).textContent = rival; // Rival
                nuevaFila.insertCell(1).textContent = diferencia; // Diferencia de partidos ganados y perdidos
            } else {
                nuevaFila.insertCell(0).textContent = equipo1; // Rival
                nuevaFila.insertCell(1).textContent = diferencia; // Diferencia de partidos ganados y perdidos
            }
            nuevaFila.insertCell(2).textContent = 1; // PJ
            nuevaFila.insertCell(3).textContent = PG;
            nuevaFila.insertCell(4).textContent = (diferenciaPuntos === 0) ? 1 : 0; // PE
            nuevaFila.insertCell(5).textContent = PP;
            nuevaFila.insertCell(6).textContent = puntosDuenioHistorial; // PtsF
            nuevaFila.insertCell(7).textContent = puntosRivalDuenioHistorial; // PtsC

            console.log("Se agregó una nueva fila con los resultados.");
        } else {
            console.log("El resultado no involucra al equipo del dueño del historial.");
        }
    } else {
        console.log("No se encontró ningún resultado válido.");
    }
}

// Ejemplo de uso
agregarResultado("Rodrigo Talarico 13 - 2 Joel Alcalde");
agregarResultado("Lucas Aguilera 1 - 15 Rodrigo Talarico");
agregarResultado("Lucas Aguilera 1 - 2 Joel Alcalde");
agregarResultado("Rodrigo Talarico 1 - 2 Joel Alcalde");
agregarResultado("Joel Alcalde 24 - 2 Rodrigo Talarico");
agregarResultado("Lucas Aguilera 1 - 1 Rodrigo Talarico");
