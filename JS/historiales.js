function agregarResultado(equipo, resultado, rival, torneo) {
    let nombre = equipo.replace(/\s/g, "");

    var tabla = document.getElementById("historial" + nombre);
    if (!tabla) {
        return;
    }
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

    if (filaExistente) {
        var celdaDIF = filaExistente.cells[1];
        var celdaPJ = filaExistente.cells[2];
        var celdaPG = filaExistente.cells[3];
        var celdaPE = filaExistente.cells[4];
        var celdaPP = filaExistente.cells[5];
        var celdaPtsF = filaExistente.cells[6];
        var celdaPtsC = filaExistente.cells[7];

        celdaDIF.innerHTML = parseInt(celdaDIF.innerHTML) + diferencia;
        celdaPJ.innerHTML = parseInt(celdaPJ.innerHTML) + partidosJugados;
        celdaPG.innerHTML = parseInt(celdaPG.innerHTML) + partidosGanados;
        celdaPE.innerHTML = parseInt(celdaPE.innerHTML) + partidosEmpatados;
        celdaPP.innerHTML = parseInt(celdaPP.innerHTML) + partidosPerdidos;
        celdaPtsF.innerHTML = parseInt(celdaPtsF.innerHTML) + puntosAFavor;
        celdaPtsC.innerHTML = parseInt(celdaPtsC.innerHTML) + puntosEnContra;

    } else {
        var fila = tbody.insertRow(-1);
        var celdaRival = fila.insertCell(0);
        var celdaDIF = fila.insertCell(1);
        var celdaPJ = fila.insertCell(2);
        var celdaPG = fila.insertCell(3);
        var celdaPE = fila.insertCell(4);
        var celdaPP = fila.insertCell(5);
        var celdaPtsF = fila.insertCell(6);
        var celdaPtsC = fila.insertCell(7);

        celdaRival.innerHTML = rival;
        celdaDIF.innerHTML = diferencia;
        celdaPJ.innerHTML = partidosJugados;
        celdaPG.innerHTML = partidosGanados;
        celdaPE.innerHTML = partidosEmpatados;
        celdaPP.innerHTML = partidosPerdidos;
        celdaPtsF.innerHTML = puntosAFavor;
        celdaPtsC.innerHTML = puntosEnContra;

        // Agregar la clase "diferenciaPartidos" a las celdas después de la celda "DIF" en la nueva fila
        // Obtener la longitud de la fila
        var numCeldas = fila.cells.length;

        // Iterar sobre las celdas de la fila
        for (var k = 2; k < numCeldas; k++) {
            fila.cells[1].classList.add("diferenciaPartidos");

        }




    }



    // Ordenar las filas por la diferencia de mayor a menor, excluyendo el encabezado
    var filas = Array.from(tbody.rows);
    filas.sort(function (a, b) {
        return parseInt(b.cells[1].innerText) - parseInt(a.cells[1].innerText);
    });
    for (var j = 0; j < filas.length; j++) {
        tbody.appendChild(filas[j]);



    }

    var resultadosDiv = document.getElementById("resultados" + nombre);
    var nuevoResultado = document.createElement("div");
    nuevoResultado.classList.add("resultado");

    // Determinar el color del resultado
    var resultadoArray = resultado.split("-");
    var puntosAFavor = parseInt(resultadoArray[0]);
    var puntosEnContra = parseInt(resultadoArray[1]);
    var color = '';
    if (puntosAFavor > puntosEnContra) {
        color = 'verde';
    } else if (puntosAFavor < puntosEnContra) {
        color = 'rojo';
    } else {
        color = 'amarillo';
    }

    nuevoResultado.innerHTML = "<table align='center' class='tablaResultadosPartidos'> <thead> <tr> <th colspan='3'>" + torneo + "</th> </tr> </thead> <tbody> <tr> <td style='width: 45%; text-align: start'>" + equipo + "</td> <td style='width: 10%;  text-align: center'>" + resultado + "</td> <td style='width: 45%;   text-align: end'>" + rival + "</td> </tr> </tbody> </table>";
    nuevoResultado.classList.add(color);
    resultadosDiv.appendChild(nuevoResultado);




}

function colores() {
    var diferenciaPartidos = document.getElementsByClassName("diferenciaPartidos");
    for (var i = 0; i < diferenciaPartidos.length; i++) {
        var valor = parseInt(diferenciaPartidos[i].textContent);
        console.log(valor);
        if (valor > 0) {
            diferenciaPartidos[i].style.backgroundColor = 'rgb(0,128,0)';
            diferenciaPartidos[i].style.color = 'white';
            diferenciaPartidos[i].textContent = '+' + valor;
        } else if (valor === 0) {
            diferenciaPartidos[i].style.backgroundColor = 'rgb(255,235,59)';
            diferenciaPartidos[i].style.color = 'black';
        } else {
            diferenciaPartidos[i].style.backgroundColor = 'rgb(255,0,0)';
            diferenciaPartidos[i].style.color = 'white';
        }
    }
}


// AGREGAR HISTORIALES

agregarResultado("Jhose", "4-2", "Rodrigo Talarico", "FECHA 3 ");

agregarResultado("Rodrigo Talarico", "2-4", "Jhose", "FECHA 3 ");

agregarResultado("Diego", "1-5", "Rodrigo Talarico", "FECHA 2 ");

agregarResultado("Rodrigo Talarico", "5-1", "Diego", "FECHA 2 ");




colores();