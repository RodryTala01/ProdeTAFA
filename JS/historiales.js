function agregarResultadoRodrigoTalarico(resultado, rival) {
    var tabla = document.getElementById("historialRodrigoTalarico");
    var tbody = tabla.getElementsByTagName('tbody')[0];
    var filaExistente = null;
    for (var i = 0; i < tbody.rows.length; i++) {
        var celdaRival = tbody.rows[i].cells[0];
        if (celdaRival.innerHTML === rival) {
            filaExistente = tbody.rows[i];
            break;
        }
    }

    var resultadoArray = resultado.split("-");
    var puntosAFavor = parseInt(resultadoArray[0]);
    var puntosEnContra = parseInt(resultadoArray[1]);
    var partidosGanados = puntosAFavor > puntosEnContra ? 1 : 0;
    var partidosPerdidos = puntosAFavor < puntosEnContra ? 1 : 0;
    var partidosEmpatados = puntosAFavor === puntosEnContra ? 1 : 0;
    var partidosJugados = partidosGanados + partidosPerdidos + partidosEmpatados;
    var diferencia = partidosGanados - partidosPerdidos;
    var signoDiferencia = diferencia >= 0 ? "+" : "";

    if (filaExistente) {
        var celdaDIF = filaExistente.cells[1];
        var celdaPJ = filaExistente.cells[2];
        var celdaPG = filaExistente.cells[3];
        var celdaPE = filaExistente.cells[4];
        var celdaPP = filaExistente.cells[5];
        var celdaPtsF = filaExistente.cells[6];
        var celdaPtsC = filaExistente.cells[7];

        celdaDIF.innerHTML = parseInt(celdaDIF.innerHTML) + diferencia;
        celdaDIF.innerHTML = signoDiferencia + celdaDIF.innerHTML;
        celdaPJ.innerHTML = parseInt(celdaPJ.innerHTML) + partidosJugados;
        celdaPG.innerHTML = parseInt(celdaPG.innerHTML) + partidosGanados;
        celdaPE.innerHTML = parseInt(celdaPE.innerHTML) + partidosEmpatados;
        celdaPP.innerHTML = parseInt(celdaPP.innerHTML) + partidosPerdidos;
        celdaPtsF.innerHTML = parseInt(celdaPtsF.innerHTML) + puntosAFavor;
        celdaPtsC.innerHTML = parseInt(celdaPtsC.innerHTML) + puntosEnContra;
    } else {
        var fila = tbody.insertRow(-1); // Aquí se cambió de 'tabla' a 'tbody'
        var celdaRival = fila.insertCell(0);
        var celdaDIF = fila.insertCell(1);
        var celdaPJ = fila.insertCell(2);
        var celdaPG = fila.insertCell(3);
        var celdaPE = fila.insertCell(4);
        var celdaPP = fila.insertCell(5);
        var celdaPtsF = fila.insertCell(6);
        var celdaPtsC = fila.insertCell(7);

        celdaRival.innerHTML = rival;
        celdaDIF.innerHTML = signoDiferencia + diferencia;
        celdaPJ.innerHTML = partidosJugados;
        celdaPG.innerHTML = partidosGanados;
        celdaPE.innerHTML = partidosEmpatados;
        celdaPP.innerHTML = partidosPerdidos;
        celdaPtsF.innerHTML = puntosAFavor;
        celdaPtsC.innerHTML = puntosEnContra;
    }

    // Ordenar las filas por la diferencia de mayor a menor, excluyendo el encabezado
    var filas = Array.from(tbody.rows);
    filas.sort(function (a, b) {
        return parseInt(b.cells[1].innerText) - parseInt(a.cells[1].innerText);
    });
    for (var j = 0; j < filas.length; j++) {
        tbody.appendChild(filas[j]);
    }
}

// Ejemplos de uso
agregarResultadoRodrigoTalarico("9-4", "Joel Alcalde");
agregarResultadoRodrigoTalarico("1-2", "Joel Alcalde");
agregarResultadoRodrigoTalarico("9-25", "Joel Alcalde");
agregarResultadoRodrigoTalarico("2-22", "Lucas Aguilera");
agregarResultadoRodrigoTalarico("2-22", "Lucas Aguilera");
agregarResultadoRodrigoTalarico("223-22", "Gabriel Talarico");
