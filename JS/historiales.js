function toggleTemporadas(trofeoId) {
    // Mostrar el modal
    document.getElementById("modalPalmares").style.display = "flex";

    // Definir la información de los trofeos
    const trofeos = [
        {
            
        }
    ];

    // Obtener los datos del trofeo según el ID
    const trofeo = trofeos[trofeoId - 1];

    // Actualizar el contenido del modal
    document.getElementById("tituloModalPalmares").innerText = trofeo.nombre;
    document.getElementById("imagenModalPalmares").src = trofeo.imagen;
    document.getElementById("cantidadGanadaPalmares").innerText = trofeo.cantidad;
    document.getElementById("temporadasGanadasPalmares").innerText = trofeo.temporadas;
    document.getElementById("subcampeonatosPalmares").innerText = trofeo.subcampeonatos;

    

    // Insertar la tabla en el modal
    document.getElementById("finalesJugadasPalmares").innerHTML = finalesHTML;

    // Eliminar la clase de agrandado de todos los trofeos
    const trofeosElements = document.querySelectorAll('.trofeo-container');
    trofeosElements.forEach(trofeoElement => {
        trofeoElement.classList.remove('trofeoAgrandado');
    });

    // Agregar la clase de agrandado al trofeo seleccionado
    document.getElementById(`trofeo${trofeoId}`).classList.add('trofeoAgrandado');
}


// Función para cerrar el modal
function closeModalPalmares() {
    // Ocultar el modal
    document.getElementById("modalPalmares").style.display = "none";

    // Eliminar la clase de agrandado de todos los trofeos
    const trofeosElements = document.querySelectorAll('.trofeo-container');
    trofeosElements.forEach(trofeoElement => {
        trofeoElement.classList.remove('trofeoAgrandado');
    });
}

function campeonato(equipo1, resultado1, resultado2, equipo2, competicion, temporada) {
    function formatearID(nombre) {
        return nombre.replace(/\s+/g, "");
    }

    function formatearImagen(nombre) {
        return nombre.replace(/\s+/g, "");
    }

    let ganador, perdedor, resultado;
    if (parseInt(resultado1) > parseInt(resultado2)) {
        ganador = equipo1;
        perdedor = equipo2;
        resultado = `${resultado1}-${resultado2}`;
    } else {
        ganador = equipo2;
        perdedor = equipo1;
        resultado = `${resultado2}-${resultado1}`;
    }

    function actualizarPalmares(equipo, esGanador) {
        const contenedor = document.getElementById(`palmares${formatearID(equipo)}`);
        if (!contenedor) return;

        let trofeoExistente = contenedor.querySelector(`#trofeo-${competicion}`);
        if (esGanador) {
            if (trofeoExistente) {
                let cantidadDiv = trofeoExistente.querySelector(".cantidadPalmares");
                cantidadDiv.innerText = parseInt(cantidadDiv.innerText) + 1;
            } else {
                let nuevoTrofeo = document.createElement("div");
                nuevoTrofeo.className = "trofeo-container";
                nuevoTrofeo.id = `trofeo-${competicion}`;
                nuevoTrofeo.setAttribute("onclick", `toggleTemporadas('${competicion}')`);
                nuevoTrofeo.innerHTML = `
                    <img src="../Imagenes/Trofeos/${formatearImagen(competicion)}.png" alt="" class="trofeoPalmares">
                    <div class="cantidadPalmares">1</div>
                `;
                contenedor.querySelector(".palmaresClub").appendChild(nuevoTrofeo);
            }
        } else {
            let trofeoExistente = contenedor.querySelector(`#trofeo-${competicion}`);
            if (!trofeoExistente) {
                let nuevoTrofeo = document.createElement("div");
                nuevoTrofeo.className = "trofeo-container";
                nuevoTrofeo.id = `trofeo-${competicion}`;
                nuevoTrofeo.setAttribute("onclick", `toggleTemporadas('${competicion}')`);
                nuevoTrofeo.innerHTML = `
                    <img src="../Imagenes/Trofeos/${formatearImagen(competicion)}.png" alt="" class="trofeoPalmares">
                    <div class="cantidadPalmares">0</div>
                `;
                contenedor.querySelector(".palmaresClub").appendChild(nuevoTrofeo);
            }
        }
    }

    actualizarPalmares(ganador, true);
    actualizarPalmares(perdedor, false);

    const modalPalmares = {
        nombre: competicion,
        imagen: `../Imagenes/Trofeos/${formatearImagen(competicion)}.png`,
        cantidad: isNaN(parseInt(document.getElementById("cantidadGanadaPalmares").innerText)) ? 1 : parseInt(document.getElementById("cantidadGanadaPalmares").innerText) + 1,
        temporadas: document.getElementById("temporadasGanadasPalmares").innerText ? `${document.getElementById("temporadasGanadasPalmares").innerText} - T${temporada}` : `T${temporada}`,
        subcampeonatos: isNaN(parseInt(document.getElementById("subcampeonatosPalmares").innerText)) ? 1 : parseInt(document.getElementById("subcampeonatosPalmares").innerText) + (ganador === equipo1 ? 0 : 1),
        finales: isNaN(parseInt(document.getElementById("finalesJugadasPalmares").dataset.count)) ? 1 : parseInt(document.getElementById("finalesJugadasPalmares").dataset.count) + 1,
    };

    document.getElementById("tituloModalPalmares").innerText = modalPalmares.nombre;
    document.getElementById("imagenModalPalmares").src = modalPalmares.imagen;
    document.getElementById("cantidadGanadaPalmares").innerText = modalPalmares.cantidad;
    document.getElementById("temporadasGanadasPalmares").innerText = modalPalmares.temporadas;
    document.getElementById("subcampeonatosPalmares").innerText = modalPalmares.subcampeonatos;
    document.getElementById("finalesJugadasPalmares").dataset.count = modalPalmares.finales;

    function agregarTablaFinales(equipo, esGanador) {
        const modalFinales = document.getElementById("finalesJugadasPalmares");
        if (modalFinales) {
            let color = esGanador ? "verde" : "rojo";  // Asignamos rojo si es el perdedor
            let nuevaTabla = `
                <div class="resultado ${color} tablaResultadosPartidosPalmares">
                    <table style="margin: 0 auto;">
                        <thead>
                            <tr>
                                <th colspan="3" style="text-align: center;">Temporada ${temporada}</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td style="width: 30%; text-align: start">${equipo}</td>
                                <td style="width: 14%; text-align: center">${resultado}</td>
                                <td style="width: 30%; text-align: end">${equipo === ganador ? perdedor : ganador}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            `;
            modalFinales.innerHTML += nuevaTabla;
        }
    }

    agregarTablaFinales(ganador, true);
    agregarTablaFinales(perdedor, false);
}




campeonato("Alexis Segovia","6","1","Agustin","Copa Total", "7")
campeonato("Alexis Segovia","12","11","Mario Talarico","Copa Total", "10")
campeonato("Alexis Segovia","12","15","Veronica Lucchesi","Copa Total", "13")





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
    // Ordenar las filas por partidos jugados de mayor a menor, y en caso de igualdad por diferencia de mayor a menor, excluyendo el encabezado
    var filas = Array.from(tbody.rows);
    filas.sort(function (a, b) {
        
        var diferenciaA = parseInt(a.cells[1].innerText);
        var diferenciaB = parseInt(b.cells[1].innerText);
        var partidosJugadosA = parseInt(a.cells[2].innerText);
        var partidosJugadosB = parseInt(b.cells[2].innerText);

        if (diferenciaA !== diferenciaB) {
            return diferenciaB - diferenciaA;
        } else {
            return partidosJugadosB - partidosJugadosA;
        }
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
    nuevoResultado.innerHTML = "<table align='center' class='tablaResultadosPartidos'> <thead> <tr> <th colspan='3'>" + torneo + "</th> </tr> </thead> <tbody> <tr> <td style='width: 43%; text-align: start'>" + equipo + "</td> <td style='width: 14%;  text-align: center'>" + resultado + "</td> <td style='width: 43%;   text-align: end'>" + rival + "</td> </tr> </tbody> </table>";
    nuevoResultado.classList.add(color);
    // Insertar el nuevo resultado como el primer hijo del contenedor
    if (resultadosDiv.firstChild) {
        resultadosDiv.insertBefore(nuevoResultado, resultadosDiv.firstChild);
    } else {
        resultadosDiv.appendChild(nuevoResultado);
    }
}
function colores() {
    var diferenciaPartidos = document.getElementsByClassName("diferenciaPartidos");
    for (var i = 0; i < diferenciaPartidos.length; i++) {
        var valor = parseInt(diferenciaPartidos[i].textContent);
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
agregarResultado("Leandro Montes", "4-3", "Nico Avalos", "FASE DE GRUPOS COPA TOTAL T3");
agregarResultado("Nico Avalos", "3-4", "Leandro Montes", "FASE DE GRUPOS COPA TOTAL T3");
agregarResultado("Matias Varela", "10-10", "Pancho Muzzio", "FASE DE GRUPOS COPA TOTAL T3");
agregarResultado("Pancho Muzzio", "10-10", "Matias Varela", "FASE DE GRUPOS COPA TOTAL T3");
agregarResultado("Facu Montes", "8-9", "Luciano Hufschmid", "FASE DE GRUPOS COPA TOTAL T3");
agregarResultado("Luciano Hufschmid", "9-8", "Facu Montes", "FASE DE GRUPOS COPA TOTAL T3");
agregarResultado("Nahuel Ponce", "5-6", "Gabriel Talarico", "FASE DE GRUPOS COPA TOTAL T3");
agregarResultado("Gabriel Talarico", "6-5", "Nahuel Ponce", "FASE DE GRUPOS COPA TOTAL T3");
agregarResultado("Valentina Scocier", "3-5", "Kevin Sivori", "FASE DE GRUPOS COPA TOTAL T3");
agregarResultado("Kevin Sivori", "5-3", "Valentina Scocier", "FASE DE GRUPOS COPA TOTAL T3");
agregarResultado("Jhose", "4-5", "Diego", "FASE DE GRUPOS COPA TOTAL T3");
agregarResultado("Diego", "5-4", "Jhose", "FASE DE GRUPOS COPA TOTAL T3");
agregarResultado("Lautaro Scocier", "3-10", "Mario Talarico", "FASE DE GRUPOS COPA TOTAL T3");
agregarResultado("Mario Talarico", "10-3", "Lautaro Scocier", "FASE DE GRUPOS COPA TOTAL T3");
agregarResultado("Nahir Gomez", "7-4", "Joaco Fernandez", "FASE DE GRUPOS COPA TOTAL T3");
agregarResultado("Joaco Fernandez", "4-7", "Nahir Gomez", "FASE DE GRUPOS COPA TOTAL T3");
agregarResultado("Rodri Sebastian", "6-4", "Pablo Aquino", "FASE DE GRUPOS COPA TOTAL T3");
agregarResultado("Nico Avalos", "2-2", "Rodri Sebastian", "FASE DE GRUPOS COPA TOTAL T3");
agregarResultado("Rodri Sebastian", "2-2", "Nico Avalos", "FASE DE GRUPOS COPA TOTAL T3");
agregarResultado("Leandro Montes", "1-1", "Pablo Aquino", "FASE DE GRUPOS COPA TOTAL T3");
agregarResultado("Pancho Muzzio", "4-4", "Aylen Benedetti", "FASE DE GRUPOS COPA TOTAL T3");
agregarResultado("Aylen Benedetti", "4-4", "Pancho Muzzio", "FASE DE GRUPOS COPA TOTAL T3");
agregarResultado("Luciano Hufschmid", "4-4", "Anubis", "FASE DE GRUPOS COPA TOTAL T3");
agregarResultado("Anubis", "4-4", "Luciano Hufschmid", "FASE DE GRUPOS COPA TOTAL T3");
agregarResultado("Gabriel Talarico", "2-6", "Martin Bustos", "FASE DE GRUPOS COPA TOTAL T3");
agregarResultado("Martin Bustos", "6-2", "Gabriel Talarico", "FASE DE GRUPOS COPA TOTAL T3");
agregarResultado("Kevin Sivori", "5-5", "Joel Marasco", "FASE DE GRUPOS COPA TOTAL T3");
agregarResultado("Joel Marasco", "5-5", "Kevin Sivori", "FASE DE GRUPOS COPA TOTAL T3");
agregarResultado("Diego", "1-5", "Rodrigo Talarico", "FASE DE GRUPOS COPA TOTAL T3");
agregarResultado("Rodrigo Talarico", "5-1", "Diego", "FASE DE GRUPOS COPA TOTAL T3");
agregarResultado("Mario Talarico", "3-5", "Nahuel Scocier", "FASE DE GRUPOS COPA TOTAL T3");
agregarResultado("Nahuel Scocier", "5-3", "Mario Talarico", "FASE DE GRUPOS COPA TOTAL T3");
agregarResultado("Joaco Fernandez", "2-2", "Matheo Olivera", "FASE DE GRUPOS COPA TOTAL T3");
agregarResultado("Matheo Olivera", "2-2", "Joaco Fernandez", "FASE DE GRUPOS COPA TOTAL T3");
agregarResultado("Leandro Montes", "5-0", "Rodri Sebastian", "FASE DE GRUPOS COPA TOTAL T3");
agregarResultado("Rodri Sebastian", "0-5", "Leandro Montes", "FASE DE GRUPOS COPA TOTAL T3");
agregarResultado("Nico Avalos", "6-8", "Pablo Aquino", "FASE DE GRUPOS COPA TOTAL T3");
agregarResultado("Matias Varela", "3-4", "Aylen Benedetti", "FASE DE GRUPOS COPA TOTAL T3");
agregarResultado("Aylen Benedetti", "4-3", "Matias Varela", "FASE DE GRUPOS COPA TOTAL T3");
agregarResultado("Facu Montes", "1-4", "Anubis", "FASE DE GRUPOS COPA TOTAL T3");
agregarResultado("Anubis", "4-1", "Facu Montes", "FASE DE GRUPOS COPA TOTAL T3");
agregarResultado("Nahuel Ponce", "3-2", "Martin Bustos", "FASE DE GRUPOS COPA TOTAL T3");
agregarResultado("Martin Bustos", "2-3", "Nahuel Ponce", "FASE DE GRUPOS COPA TOTAL T3");
agregarResultado("Valentina Scocier", "5-5", "Joel Marasco", "FASE DE GRUPOS COPA TOTAL T3");
agregarResultado("Joel Marasco", "5-5", "Valentina Scocier", "FASE DE GRUPOS COPA TOTAL T3");
agregarResultado("Jhose", "4-2", "Rodrigo Talarico", "FASE DE GRUPOS COPA TOTAL T3");
agregarResultado("Rodrigo Talarico", "2-4", "Jhose", "FASE DE GRUPOS COPA TOTAL T3");
agregarResultado("Lautaro Scocier", "7-1", "Nahuel Scocier", "FASE DE GRUPOS COPA TOTAL T3");
agregarResultado("Nahuel Scocier", "1-7", "Lautaro Scocier", "FASE DE GRUPOS COPA TOTAL T3");
agregarResultado("Nahir Gomezz", "2-3", "Matheo Olivera", "FASE DE GRUPOS COPA TOTAL T3");
agregarResultado("Matheo Olivera", "3-2", "Nahir Gomezz", "FASE DE GRUPOS COPA TOTAL T3");
agregarResultado("Matheo Olivera", "5-7", "Nahuel Ponce", "OCTAVOS DE FINAL COPA TOTAL T3");
agregarResultado("Nahuel Ponce", "7-5", "Matheo Olivera", "OCTAVOS DE FINAL COPA TOTAL T3");
agregarResultado("Mario Talarico", "3-2", "Nahir Gomezz", "OCTAVOS DE FINAL COPA TOTAL T3");
agregarResultado("Nahir Gomezz", "2-3", "Mario Talarico", "OCTAVOS DE FINAL COPA TOTAL T3");
agregarResultado("Anubis", "5-8", "Joel Marasco", "OCTAVOS DE FINAL COPA TOTAL T3");
agregarResultado("Joel Marasco", "8-5", "Anubis", "OCTAVOS DE FINAL COPA TOTAL T3");
agregarResultado("Aylen Benedetti", "3-6", "Lautaro Scocier", "OCTAVOS DE FINAL COPA TOTAL T3");
agregarResultado("Lautaro Scocier", "6-3", "Aylen Benedetti", "OCTAVOS DE FINAL COPA TOTAL T3");
agregarResultado("Martin Bustos", "6-8", "Luciano Hufschmid", "OCTAVOS DE FINAL COPA TOTAL T3");
agregarResultado("Luciano Hufschmid", "8-6", "Martin Bustos", "OCTAVOS DE FINAL COPA TOTAL T3");
agregarResultado("Kevin Sivori", "7-5", "Jhose", "OCTAVOS DE FINAL COPA TOTAL T3");
agregarResultado("Jhose", "5-7", "Kevin Sivori", "OCTAVOS DE FINAL COPA TOTAL T3");
agregarResultado("Leandro Montes", "4-9", "Pancho Muzzio", "OCTAVOS DE FINAL COPA TOTAL T3");
agregarResultado("Pancho Muzzio", "9-4", "Leandro Montes", "OCTAVOS DE FINAL COPA TOTAL T3");
agregarResultado("Rodrigo Talarico", "4-2", "Pablo Aquino", "OCTAVOS DE FINAL COPA TOTAL T3");
agregarResultado("Nahuel Ponce", "4-5", "Mario Talarico", "CUARTOS DE FINAL COPA TOTAL T3");
agregarResultado("Mario Talarico", "5-4", "Nahuel Ponce", "CUARTOS DE FINAL COPA TOTAL T3");
agregarResultado("Joel Marasco", "2-4", "Lautaro Scocier", "CUARTOS DE FINAL COPA TOTAL T3");
agregarResultado("Lautaro Scocier", "4-2", "Joel Marasco", "CUARTOS DE FINAL COPA TOTAL T3");
agregarResultado("Luciano Hufschmid", "6-4", "Kevin Sivori", "CUARTOS DE FINAL COPA TOTAL T3");
agregarResultado("Kevin Sivori", "4-6", "Luciano Hufschmid", "CUARTOS DE FINAL COPA TOTAL T3");
agregarResultado("Pancho Muzzio", "3-0", "Rodrigo Talarico", "CUARTOS DE FINAL COPA TOTAL T3");
agregarResultado("Rodrigo Talarico", "0-3", "Pancho Muzzio", "CUARTOS DE FINAL COPA TOTAL T3");
agregarResultado("Mario Talarico", "5-5", "Lautaro Scocier", "SEMIFINAL COPA TOTAL T3");
agregarResultado("Lautaro Scocier", "5-5", "Mario Talarico", "SEMIFINAL COPA TOTAL T3");
agregarResultado("Luciano Hufschmid", "8-9", "Pancho Muzzio", "SEMIFINAL COPA TOTAL T3");
agregarResultado("Pancho Muzzio", "9-8", "Luciano Hufschmid", "SEMIFINAL COPA TOTAL T3");
agregarResultado("Mario Talarico", "2-4", "Lautaro Scocier", "DESEMPATE SEMIFINAL COPA TOTAL T3");
agregarResultado("Lautaro Scocier", "4-2", "Mario Talarico", "DESEMPATE SEMIFINAL COPA TOTAL T3");
agregarResultado("Mario Talarico", "3-5", "Luciano Hufschmid", "3ER PUESTO COPA TOTAL T3");
agregarResultado("Luciano Hufschmid", "5-3", "Mario Talarico", "3ER PUESTO COPA TOTAL T3");
agregarResultado("Kevin Sivori", "7-5", "Luciano Hufschmid", "CUARTOS DE FINAL COPA A T4");
agregarResultado("Luciano Hufschmid", "5-7", "Kevin Sivori", "CUARTOS DE FINAL COPA A T4");
agregarResultado("Mario Talarico", "14-3", "Joel Marasco", "CUARTOS DE FINAL COPA A T4");
agregarResultado("Joel Marasco", "3-14", "Mario Talarico", "CUARTOS DE FINAL COPA A T4");
agregarResultado("Matheo Olivera", "7-11", "Nico Avalos", "CUARTOS DE FINAL COPA A T4");
agregarResultado("Nico Avalos", "11-7", "Matheo Olivera", "CUARTOS DE FINAL COPA A T4");
agregarResultado("Rodri Sebastian", "6-12", "Rodrigo Talarico", "CUARTOS DE FINAL COPA A T4");
agregarResultado("Rodrigo Talarico", "12-6", "Rodri Sebastian", "CUARTOS DE FINAL COPA A T4");
agregarResultado("Rodrigo Talarico", "13-9", "Mario Talarico", "SEMIFINAL COPA A T4");
agregarResultado("Mario Talarico", "9-13", "Rodrigo Talarico", "SEMIFINAL COPA A T4");
agregarResultado("Kevin Sivori", "10-12", "Nico Avalos", "SEMIFINAL COPA A T4");
agregarResultado("Nico Avalos", "12-10", "Kevin Sivori", "SEMIFINAL COPA A T4");
agregarResultado("Nico Luchetti (R)", "7-10", "Tomas Hon", "CUARTOS DE FINAL COPA B T4");
agregarResultado("Tomas Hon", "10-7", "Nico Luchetti (R)", "CUARTOS DE FINAL COPA B T4");
agregarResultado("Diego", "11-4", "Pollo", "CUARTOS DE FINAL COPA B T4");
agregarResultado("Pollo", "4-11", "Diego", "CUARTOS DE FINAL COPA B T4");
agregarResultado("Eze", "10-6", "Fede Gerez", "CUARTOS DE FINAL COPA B T4");
agregarResultado("Fede Gerez", "6-10", "Eze", "CUARTOS DE FINAL COPA B T4");
agregarResultado("Valium", "0-8", "Bruno Alonso", "CUARTOS DE FINAL COPA B T4");
agregarResultado("Bruno Alonso", "8-0", "Valium", "CUARTOS DE FINAL COPA B T4");
agregarResultado("Eze", "15-12", "Tomas Hon", "SEMIFINAL COPA B T4");
agregarResultado("Tomas Hon", "12-15", "Eze", "SEMIFINAL COPA B T4");
agregarResultado("Diego", "15-9", "Bruno Alonso", "SEMIFINAL COPA B T4");
agregarResultado("Bruno Alonso", "9-15", "Diego", "SEMIFINAL COPA B T4");
agregarResultado("Nahuel Scocier", "8-4", "Bruno Alonso", "32AVOS DE FINAL COPA TOTAL T4");
agregarResultado("Bruno Alonso", "4-8", "Nahuel Scocier", "32AVOS DE FINAL COPA TOTAL T4");
agregarResultado("Aylen Benedetti", "6-5", "Nahuel Scocier", "16AVOS DE FINAL COPA TOTAL T4");
agregarResultado("Nahuel Scocier", "5-6", "Aylen Benedetti", "16AVOS DE FINAL COPA TOTAL T4");
agregarResultado("Kevin Sivori", "9-8", "Helyy", "16AVOS DE FINAL COPA TOTAL T4");
agregarResultado("Helyy", "8-9", "Kevin Sivori", "16AVOS DE FINAL COPA TOTAL T4");
agregarResultado("Diego", "10-5", "Valentina Scocier", "16AVOS DE FINAL COPA TOTAL T4");
agregarResultado("Valentina Scocier", "5-10", "Diego", "16AVOS DE FINAL COPA TOTAL T4");
agregarResultado("Lautaro Scocier", "8-5", "Eze", "16AVOS DE FINAL COPA TOTAL T4");
agregarResultado("Eze", "5-8", "Lautaro Scocier", "16AVOS DE FINAL COPA TOTAL T4");
agregarResultado("Gabriel Talarico", "6-8", "Juli Boetsch", "16AVOS DE FINAL COPA TOTAL T4");
agregarResultado("Juli Boetsch", "8-6", "Gabriel Talarico", "16AVOS DE FINAL COPA TOTAL T4");
agregarResultado("Luciano Hufschmid", "9-5", "Santi", "16AVOS DE FINAL COPA TOTAL T4");
agregarResultado("Santi", "5-9", "Luciano Hufschmid", "16AVOS DE FINAL COPA TOTAL T4");
agregarResultado("Joel Marasco", "4-8", "Tomas Hon", "16AVOS DE FINAL COPA TOTAL T4");
agregarResultado("Tomas Hon", "8-4", "Joel Marasco", "16AVOS DE FINAL COPA TOTAL T4");
agregarResultado("Anubis", "8-4", "Martin Bustos", "16AVOS DE FINAL COPA TOTAL T4");
agregarResultado("Martin Bustos", "4-8", "Anubis", "16AVOS DE FINAL COPA TOTAL T4");
agregarResultado("Rodri Sebastian", "9-10", "Matias Varela", "16AVOS DE FINAL COPA TOTAL T4");
agregarResultado("Matias Varela", "10-9", "Rodri Sebastian", "16AVOS DE FINAL COPA TOTAL T4");
agregarResultado("Rodrigo Talarico", "5-3", "Pollo", "16AVOS DE FINAL COPA TOTAL T4");
agregarResultado("Pollo", "3-5", "Rodrigo Talarico", "16AVOS DE FINAL COPA TOTAL T4");
agregarResultado("Pancho Muzzio", "2-8", "Fede Gerez", "16AVOS DE FINAL COPA TOTAL T4");
agregarResultado("Fede Gerez", "8-2", "Pancho Muzzio", "16AVOS DE FINAL COPA TOTAL T4");
agregarResultado("Joaco Fernandez", "11-9", "Valium", "16AVOS DE FINAL COPA TOTAL T4");
agregarResultado("Valium", "9-11", "Joaco Fernandez", "16AVOS DE FINAL COPA TOTAL T4");
agregarResultado("Jhose", "4-7", "Aaron Rodas", "16AVOS DE FINAL COPA TOTAL T4");
agregarResultado("Facu Montes", "6-7", "Nico Avalos", "16AVOS DE FINAL COPA TOTAL T4");
agregarResultado("Nico Avalos", "7-6", "Facu Montes", "16AVOS DE FINAL COPA TOTAL T4");
agregarResultado("Mario Talarico", "13-2", "Natanael", "16AVOS DE FINAL COPA TOTAL T4");
agregarResultado("Natanael", "2-13", "Mario Talarico", "16AVOS DE FINAL COPA TOTAL T4");
agregarResultado("Matheo Olivera", "5-10", "Nico Luchetti (R)", "16AVOS DE FINAL COPA TOTAL T4");
agregarResultado("Nico Luchetti (R)", "10-5", "Matheo Olivera", "16AVOS DE FINAL COPA TOTAL T4");
agregarResultado("Aylen Benedetti", "0-7", "Kevin Sivori", "OCTAVOS DE FINAL COPA TOTAL T4");
agregarResultado("Kevin Sivori", "7-0", "Aylen Benedetti", "OCTAVOS DE FINAL COPA TOTAL T4");
agregarResultado("Diego", "3-5", "Lautaro Scocier", "OCTAVOS DE FINAL COPA TOTAL T4");
agregarResultado("Lautaro Scocier", "5-3", "Diego", "OCTAVOS DE FINAL COPA TOTAL T4");
agregarResultado("Juli Boetsch", "8-4", "Luciano Hufschmid", "OCTAVOS DE FINAL COPA TOTAL T4");
agregarResultado("Luciano Hufschmid", "4-8", "Juli Boetsch", "OCTAVOS DE FINAL COPA TOTAL T4");
agregarResultado("Tomas Hon", "9-2", "Anubis", "OCTAVOS DE FINAL COPA TOTAL T4");
agregarResultado("Anubis", "2-9", "Tomas Hon", "OCTAVOS DE FINAL COPA TOTAL T4");
agregarResultado("Matias Varela", "5-4", "Rodrigo Talarico", "OCTAVOS DE FINAL COPA TOTAL T4");
agregarResultado("Rodrigo Talarico", "4-5", "Matias Varela", "OCTAVOS DE FINAL COPA TOTAL T4");
agregarResultado("Fede Gerez", "1-1", "Joaco Fernandez", "OCTAVOS DE FINAL COPA TOTAL T4");
agregarResultado("Joaco Fernandez", "1-1", "Fede Gerez", "OCTAVOS DE FINAL COPA TOTAL T4");
agregarResultado("Nico Avalos", "4-0", "Aaron Rodas", "OCTAVOS DE FINAL COPA TOTAL T4");
agregarResultado("Mario Talarico", "4-4", "Nico Luchetti (R)", "OCTAVOS DE FINAL COPA TOTAL T4");
agregarResultado("Nico Luchetti (R)", "4-4", "Mario Talarico", "OCTAVOS DE FINAL COPA TOTAL T4");
agregarResultado("Fede Gerez", "6-3", "Joaco Fernandez", "DESEMPATE OCTAVOS DE FINAL COPA TOTAL T4");
agregarResultado("Joaco Fernandez", "3-6", "Fede Gerez", "DESEMPATE OCTAVOS DE FINAL COPA TOTAL T4");
agregarResultado("Mario Talarico", "9-9", "Nico Luchetti (R)", "DESEMPATE OCTAVOS DE FINAL COPA TOTAL T4");
agregarResultado("Nico Luchetti (R)", "9-9", "Mario Talarico", "DESEMPATE OCTAVOS DE FINAL COPA TOTAL T4");
agregarResultado("Kevin Sivori", "7-5", "Lautaro Scocier", "CUARTOS DE FINAL COPA TOTAL T4");
agregarResultado("Lautaro Scocier", "5-7", "Kevin Sivori", "CUARTOS DE FINAL COPA TOTAL T4");
agregarResultado("Juli Boetsch", "6-10", "Tomas Hon", "CUARTOS DE FINAL COPA TOTAL T4");
agregarResultado("Tomas Hon", "10-6", "Juli Boetsch", "CUARTOS DE FINAL COPA TOTAL T4");
agregarResultado("Matias Varela", "5-6", "Fede Gerez", "CUARTOS DE FINAL COPA TOTAL T4");
agregarResultado("Fede Gerez", "6-5", "Matias Varela", "CUARTOS DE FINAL COPA TOTAL T4");
agregarResultado("Nico Avalos", "11-7", "Nico Luchetti (R)", "CUARTOS DE FINAL COPA TOTAL T4");
agregarResultado("Nico Luchetti (R)", "7-11", "Nico Avalos", "CUARTOS DE FINAL COPA TOTAL T4");
agregarResultado("Kevin Sivori", "10-12", "Tomas Hon", "SEMIFINAL COPA TOTAL T4");
agregarResultado("Tomas Hon", "12-10", "Kevin Sivori", "SEMIFINAL COPA TOTAL T4");
agregarResultado("Fede Gerez", "10-12", "Nico Avalos", "SEMIFINAL COPA TOTAL T4");
agregarResultado("Nico Avalos", "12-10", "Fede Gerez", "SEMIFINAL COPA TOTAL T4");
agregarResultado("Tomas Hon", "6-10", "Nico Avalos", "FINAL COPA TOTAL T4");
agregarResultado("Nico Avalos", "10-6", "Tomas Hon", "FINAL COPA TOTAL T4");
agregarResultado("Rodrigo Talarico", "9-10", "Nico Avalos", "FINAL COPA A T4");
agregarResultado("Nico Avalos", "10-9", "Rodrigo Talarico", "FINAL COPA A T4");
agregarResultado("Eze", "9-9", "Diego", "FINAL COPA B T4");
agregarResultado("Diego", "9-9", "Eze", "FINAL COPA B T4");
agregarResultado("Anubis", "4-6", "Nico Luchetti (R)", "PROMOCION T4");
agregarResultado("Nico Luchetti (R)", "6-4", "Anubis", "PROMOCION T4");
agregarResultado("Matheo Olivera", "6-4", "Gabriel Talarico", "PROMOCION T4");
agregarResultado("Gabriel Talarico", "4-6", "Matheo Olivera", "PROMOCION T4");
agregarResultado("Rodrigo Talarico", "9-8", "Lautaro Scocier", "COPA CAMPEONES T4");
agregarResultado("Lautaro Scocier", "8-9", "Rodrigo Talarico", "COPA CAMPEONES T4");
agregarResultado("Jhose", "10-13", "Nahuel Scocier", "CUARTOS DE FINAL COPA A T5");
agregarResultado("Nahuel Scocier", "13-10", "Jhose", "CUARTOS DE FINAL COPA A T5");
agregarResultado("Rodrigo Talarico", "7-12", "Natanael", "CUARTOS DE FINAL COPA A T5");
agregarResultado("Natanael", "12-7", "Rodrigo Talarico", "CUARTOS DE FINAL COPA A T5");
agregarResultado("Kevin Sivori", "13-6", "Nico Avalos", "CUARTOS DE FINAL COPA A T5");
agregarResultado("Nico Avalos", "6-13", "Kevin Sivori", "CUARTOS DE FINAL COPA A T5");
agregarResultado("Valentina Scocier", "11-6", "Pollo", "CUARTOS DE FINAL COPA A T5");
agregarResultado("Pollo", "6-11", "Valentina Scocier", "CUARTOS DE FINAL COPA A T5");
agregarResultado("Natanael", "9-13", "Nahuel Scocier", "SEMIFINAL COPA A T5");
agregarResultado("Nahuel Scocier", "13-9", "Natanael", "SEMIFINAL COPA A T5");
agregarResultado("Kevin Sivori", "7-4", "Valentina Scocier", "SEMIFINAL COPA A T5");
agregarResultado("Valentina Scocier", "4-7", "Kevin Sivori", "SEMIFINAL COPA A T5");
agregarResultado("Nahuel Scocier", "8-6", "Kevin Sivori", "FINAL COPA A T5");
agregarResultado("Kevin Sivori", "6-8", "Nahuel Scocier", "FINAL COPA A T5");
agregarResultado("Tomas Hon", "5-6", "Koke", "CUARTOS DE FINAL COPA B T5");
agregarResultado("Koke", "6-5", "Tomas Hon", "CUARTOS DE FINAL COPA B T5");
agregarResultado("Gabriel Talarico", "10-9", "Luciano Hufschmid", "CUARTOS DE FINAL COPA B T5");
agregarResultado("Luciano Hufschmid", "9-10", "Gabriel Talarico", "CUARTOS DE FINAL COPA B T5");
agregarResultado("Matias Varela", "13-9", "Bruno Alonso", "CUARTOS DE FINAL COPA B T5");
agregarResultado("Bruno Alonso", "9-13", "Matias Varela", "CUARTOS DE FINAL COPA B T5");
agregarResultado("Juli Boetsch", "10-7", "Martin Bustos", "CUARTOS DE FINAL COPA B T5");
agregarResultado("Martin Bustos", "7-10", "Juli Boetsch", "CUARTOS DE FINAL COPA B T5");
agregarResultado("Koke", "7-8", "Juli Boetsch", "SEMIFINAL COPA B T4");
agregarResultado("Juli Boetsch", "8-7", "Koke", "SEMIFINAL COPA B T4");
agregarResultado("Matias Varela", "5-6", "Gabriel Talarico", "SEMIFINAL COPA B T4");
agregarResultado("Gabriel Talarico", "6-5", "Matias Varela", "SEMIFINAL COPA B T4");
agregarResultado("Juli Boetsch", "5-13", "Gabriel Talarico", "FINAL COPA B T5");
agregarResultado("Gabriel Talarico", "13-5", "Juli Boetsch", "FINAL COPA B T5");
agregarResultado("Kevin Sivori", "5-6", "Koke", "16AVOS DE FINAL COPA TOTAL T5");
agregarResultado("Koke", "6-5", "Kevin Sivori", "16AVOS DE FINAL COPA TOTAL T5");
agregarResultado("Rodri Sebastian", "4-2", "Martin Bustos", "16AVOS DE FINAL COPA TOTAL T5");
agregarResultado("Martin Bustos", "2-4", "Rodri Sebastian", "16AVOS DE FINAL COPA TOTAL T5");
agregarResultado("Pancho Muzzio", "3-1", "Fede Gerez", "16AVOS DE FINAL COPA TOTAL T5");
agregarResultado("Fede Gerez", "1-3", "Pancho Muzzio", "16AVOS DE FINAL COPA TOTAL T5");
agregarResultado("Gabriel Talarico", "4-1", "Santi", "16AVOS DE FINAL COPA TOTAL T5");
agregarResultado("Santi", "1-4", "Gabriel Talarico", "16AVOS DE FINAL COPA TOTAL T5");
agregarResultado("Rodrigo Talarico", "6-5", "Pollo", "16AVOS DE FINAL COPA TOTAL T5");
agregarResultado("Pollo", "5-6", "Rodrigo Talarico", "16AVOS DE FINAL COPA TOTAL T5");
agregarResultado("Anubis", "6-6", "Bruno Alonso", "16AVOS DE FINAL COPA TOTAL T5");
agregarResultado("Bruno Alonso", "6-6", "Anubis", "16AVOS DE FINAL COPA TOTAL T5");
agregarResultado("Lautaro Scocier", "5-5", "Nico Luchetti (R)", "16AVOS DE FINAL COPA TOTAL T5");
agregarResultado("Nico Luchetti (R)", "5-5", "Lautaro Scocier", "16AVOS DE FINAL COPA TOTAL T5");
agregarResultado("Joaco Fernandez", "6-6", "Eze", "16AVOS DE FINAL COPA TOTAL T5");
agregarResultado("Eze", "6-6", "Joaco Fernandez", "16AVOS DE FINAL COPA TOTAL T5");
agregarResultado("Jhose", "8-4", "Natanael", "16AVOS DE FINAL COPA TOTAL T5");
agregarResultado("Natanael", "4-8", "Jhose", "16AVOS DE FINAL COPA TOTAL T5");
agregarResultado("Diego", "0-9", "Juli Boetsch", "16AVOS DE FINAL COPA TOTAL T5");
agregarResultado("Juli Boetsch", "9-0", "Diego", "16AVOS DE FINAL COPA TOTAL T5");
agregarResultado("Joel Marasco", "4-7", "Matias Varela", "16AVOS DE FINAL COPA TOTAL T5");
agregarResultado("Matias Varela", "7-4", "Joel Marasco", "16AVOS DE FINAL COPA TOTAL T5");
agregarResultado("Aylen Benedetti", "0-4", "Fabrizio Escolano", "16AVOS DE FINAL COPA TOTAL T5");
agregarResultado("Fabrizio Escolano", "4-0", "Aylen Benedetti", "16AVOS DE FINAL COPA TOTAL T5");
agregarResultado("Luciano Hufschmid", "4-8", "Nico Avalos", "16AVOS DE FINAL COPA TOTAL T5");
agregarResultado("Nico Avalos", "8-4", "Luciano Hufschmid", "16AVOS DE FINAL COPA TOTAL T5");
agregarResultado("Matheo Olivera", "8-9", "Tomas Hon", "16AVOS DE FINAL COPA TOTAL T5");
agregarResultado("Tomas Hon", "9-8", "Matheo Olivera", "16AVOS DE FINAL COPA TOTAL T5");
agregarResultado("Mario Talarico", "5-7", "Valentina Scocier", "16AVOS DE FINAL COPA TOTAL T5");
agregarResultado("Valentina Scocier", "7-5", "Mario Talarico", "16AVOS DE FINAL COPA TOTAL T5");
agregarResultado("Anubis", "0-2", "Bruno Alonso", "DESEMPATE 16AVOS DE FINAL COPA TOTAL T5");
agregarResultado("Bruno Alonso", "2-0", "Anubis", "DESEMPATE 16AVOS DE FINAL COPA TOTAL T5");
agregarResultado("Lautaro Scocier", "5-1", "Nico Luchetti (R)", "DESEMPATE 16AVOS DE FINAL COPA TOTAL T5");
agregarResultado("Nico Luchetti (R)", "1-5", "Lautaro Scocier", "DESEMPATE 16AVOS DE FINAL COPA TOTAL T5");
agregarResultado("Joaco Fernandez", "1-2", "Eze", "DESEMPATE 16AVOS DE FINAL COPA TOTAL T5");
agregarResultado("Eze", "2-1", "Joaco Fernandez", "DESEMPATE 16AVOS DE FINAL COPA TOTAL T5");
agregarResultado("Nahuel Scocier", "9-12", "Koke", "OCTAVOS DE FINAL COPA TOTAL T5");
agregarResultado("Koke", "12-9", "Nahuel Scocier", "OCTAVOS DE FINAL COPA TOTAL T5");
agregarResultado("Rodri Sebastian", "10-7", "Pancho Muzzio", "OCTAVOS DE FINAL COPA TOTAL T5");
agregarResultado("Pancho Muzzio", "7-10", "Rodri Sebastian", "OCTAVOS DE FINAL COPA TOTAL T5");
agregarResultado("Gabriel Talarico", "16-13", "Rodrigo Talarico", "OCTAVOS DE FINAL COPA TOTAL T5");
agregarResultado("Rodrigo Talarico", "13-16", "Gabriel Talarico", "OCTAVOS DE FINAL COPA TOTAL T5");
agregarResultado("Bruno Alonso", "8-11", "Lautaro Scocier", "OCTAVOS DE FINAL COPA TOTAL T5");
agregarResultado("Lautaro Scocier", "11-8", "Bruno Alonso", "OCTAVOS DE FINAL COPA TOTAL T5");
agregarResultado("Eze", "7-12", "Jhose", "OCTAVOS DE FINAL COPA TOTAL T5");
agregarResultado("Jhose", "12-7", "Eze", "OCTAVOS DE FINAL COPA TOTAL T5");
agregarResultado("Juli Boetsch", "14-8", "Matias Varela", "OCTAVOS DE FINAL COPA TOTAL T5");
agregarResultado("Matias Varela", "8-14", "Juli Boetsch", "OCTAVOS DE FINAL COPA TOTAL T5");
agregarResultado("Fabrizio Escolano", "8-8", "Nico Avalos", "OCTAVOS DE FINAL COPA TOTAL T5");
agregarResultado("Nico Avalos", "8-8", "Fabrizio Escolano", "OCTAVOS DE FINAL COPA TOTAL T5");
agregarResultado("Tomas Hon", "15-12", "Valentina Scocier", "OCTAVOS DE FINAL COPA TOTAL T5");
agregarResultado("Valentina Scocier", "12-15", "Tomas Hon", "OCTAVOS DE FINAL COPA TOTAL T5");
agregarResultado("Fabrizio Escolano", "4-1", "Nico Avalos", "DESEMPATE OCTAVOS DE FINAL COPA TOTAL T5");
agregarResultado("Nico Avalos", "1-4", "Fabrizio Escolano", "DESEMPATE OCTAVOS DE FINAL COPA TOTAL T5");
agregarResultado("Koke", "6-11", "Rodri Sebastian", "CUARTOS DE FINAL COPA TOTAL T5");
agregarResultado("Rodri Sebastian", "11-6", "Koke", "CUARTOS DE FINAL COPA TOTAL T5");
agregarResultado("Gabriel Talarico", "10-8", "Lautaro Scocier", "CUARTOS DE FINAL COPA TOTAL T5");
agregarResultado("Lautaro Scocier", "8-10", "Gabriel Talarico", "CUARTOS DE FINAL COPA TOTAL T5");
agregarResultado("Jhose", "10-10", "Juli Boetsch", "CUARTOS DE FINAL COPA TOTAL T5");
agregarResultado("Juli Boetsch", "10-10", "Jhose", "CUARTOS DE FINAL COPA TOTAL T5");
agregarResultado("Fabrizio Escolano", "6-5", "Tomas Hon", "CUARTOS DE FINAL COPA TOTAL T5");
agregarResultado("Tomas Hon", "5-6", "Fabrizio Escolano", "CUARTOS DE FINAL COPA TOTAL T5");
agregarResultado("Jhose", "2-4", "Juli Boetsch", "DESEMPATE CUARTOS DE FINAL COPA TOTAL T5");
agregarResultado("Juli Boetsch", "4-2", "Jhose", "DESEMPATE CUARTOS DE FINAL COPA TOTAL T5");
agregarResultado("Rodri Sebastian", "4-6", "Gabriel Talarico", "SEMIFINAL COPA TOTAL T5");
agregarResultado("Gabriel Talarico", "6-4", "Rodri Sebastian", "SEMIFINAL COPA TOTAL T5");
agregarResultado("Juli Boetsch", "8-10", "Fabrizio Escolano", "SEMIFINAL COPA TOTAL T5");
agregarResultado("Fabrizio Escolano", "10-8", "Juli Boetsch", "SEMIFINAL COPA TOTAL T5");
agregarResultado("Gabriel Talarico", "13-5", "Fabrizio Escolano", "FINAL COPA TOTAL T5");
agregarResultado("Fabrizio Escolano", "5-13", "Gabriel Talarico", "FINAL COPA TOTAL T5");
agregarResultado("Kevin Sivori", "5-11", "Nico Avalos", "COPA CAMPEONES T5");
agregarResultado("Nico Avalos", "11-5", "Kevin Sivori", "COPA CAMPEONES T5");
agregarResultado("Tomas Hon", "6-8", "Jhose", "PROMOCION T5");
agregarResultado("Jhose", "8-6", "Tomas Hon", "PROMOCION T5");
agregarResultado("Koke", "6-11", "Nico Avalos", "PROMOCION T5");
agregarResultado("Nico Avalos", "11-6", "Koke", "PROMOCION T5");
agregarResultado("Lautaro Scocier", "14-11", "Gabriel Talarico", "CUARTOS DE FINAL COPA A T6");
agregarResultado("Gabriel Talarico", "11-14", "Lautaro Scocier", "CUARTOS DE FINAL COPA A T6");
agregarResultado("Mario Talarico", "8-6", "Nico Luchetti (R)", "CUARTOS DE FINAL COPA A T6");
agregarResultado("Nico Luchetti (R)", "6-8", "Mario Talarico", "CUARTOS DE FINAL COPA A T6");
agregarResultado("Nico Avalos", "10-7", "Jhose", "CUARTOS DE FINAL COPA A T6");
agregarResultado("Jhose", "7-10", "Nico Avalos", "CUARTOS DE FINAL COPA A T6");
agregarResultado("Fabrizio Escolano", "12-11", "Kevin Sivori", "CUARTOS DE FINAL COPA A T6");
agregarResultado("Kevin Sivori", "11-12", "Fabrizio Escolano", "CUARTOS DE FINAL COPA A T6");
agregarResultado("Nico Avalos", "12-11", "Mario Talarico", "SEMIFINAL COPA A T6");
agregarResultado("Mario Talarico", "11-12", "Nico Avalos", "SEMIFINAL COPA A T6");
agregarResultado("Lautaro Scocier", "8-16", "Fabrizio Escolano", "SEMIFINAL COPA A T6");
agregarResultado("Fabrizio Escolano", "16-8", "Lautaro Scocier", "SEMIFINAL COPA A T6");
agregarResultado("Nico Avalos", "5-6", "Fabrizio Escolano", "FINAL COPA A T6");
agregarResultado("Fabrizio Escolano", "6-5", "Nico Avalos", "FINAL COPA A T6");
agregarResultado("Moreno Perez", "4-3", "Ramiro Vita", "OCTAVOS DE FINAL COPA B T6");
agregarResultado("Ramiro Vita", "3-4", "Moreno Perez", "OCTAVOS DE FINAL COPA B T6");
agregarResultado("Lucas insua", "2-7", "Veronica Lucchesi", "OCTAVOS DE FINAL COPA B T6");
agregarResultado("Veronica Lucchesi", "7-2", "Lucas insua", "OCTAVOS DE FINAL COPA B T6");
agregarResultado("Santi", "6-4", "Koke", "OCTAVOS DE FINAL COPA B T6");
agregarResultado("Koke", "4-6", "Santi", "OCTAVOS DE FINAL COPA B T6");
agregarResultado("Matias Varela", "5-6", "Joaco Fernandez", "OCTAVOS DE FINAL COPA B T6");
agregarResultado("Joaco Fernandez", "6-5", "Matias Varela", "OCTAVOS DE FINAL COPA B T6");
agregarResultado("Anubis", "7-5", "Matias Diaz", "OCTAVOS DE FINAL COPA B T6");
agregarResultado("Matias Diaz", "5-7", "Anubis", "OCTAVOS DE FINAL COPA B T6");
agregarResultado("Diego", "6-6", "Eze", "OCTAVOS DE FINAL COPA B T6");
agregarResultado("Eze", "6-6", "Diego", "OCTAVOS DE FINAL COPA B T6");
agregarResultado("Diego", "5-6", "Eze", "DESEMPATE OCTAVOS DE FINAL COPA B T6");
agregarResultado("Eze", "6-5", "Diego", "DESEMPATE OCTAVOS DE FINAL COPA B T6");
agregarResultado("Santi", "8-8", "Eze", "CUARTOS DE FINAL COPA B T6");
agregarResultado("Eze", "8-8", "Santi", "CUARTOS DE FINAL COPA B T6");
agregarResultado("Anubis", "4-10", "Veronica Lucchesi", "CUARTOS DE FINAL COPA B T6");
agregarResultado("Veronica Lucchesi", "10-4", "Anubis", "CUARTOS DE FINAL COPA B T6");
agregarResultado("Joaco Fernandez", "7-5", "Moreno Perez", "CUARTOS DE FINAL COPA B T6");
agregarResultado("Moreno Perez", "5-7", "Joaco Fernandez", "CUARTOS DE FINAL COPA B T6");
agregarResultado("Rodrigo Soca", "14-3", "Fede Gerez", "CUARTOS DE FINAL COPA B T6");
agregarResultado("Fede Gerez", "3-14", "Rodrigo Soca", "CUARTOS DE FINAL COPA B T6");
agregarResultado("Santi", "9-10", "Eze", "DESEMPATE CUARTOS DE FINAL COPA B T6");
agregarResultado("Eze", "10-9", "Santi", "DESEMPATE CUARTOS DE FINAL COPA B T6");
agregarResultado("Eze", "9-11", "Veronica Lucchesi", "SEMIFINAL COPA B T6");
agregarResultado("Veronica Lucchesi", "11-9", "Eze", "SEMIFINAL COPA B T6");
agregarResultado("Joaco Fernandez", "8-8", "Rodrigo Soca", "SEMIFINAL COPA B T6");
agregarResultado("Rodrigo Soca", "8-8", "Joaco Fernandez", "SEMIFINAL COPA B T6");
agregarResultado("Joaco Fernandez", "9-11", "Rodrigo Soca", "DESEMPATE SEMIFINAL COPA B T6");
agregarResultado("Rodrigo Soca", "11-9", "Joaco Fernandez", "DESEMPATE SEMIFINAL COPA B T6");
agregarResultado("Veronica Lucchesi", "11-11", "Rodrigo Soca", "FINAL COPA B T6");
agregarResultado("Rodrigo Soca", "11-11", "Veronica Lucchesi", "FINAL COPA B T6");
agregarResultado("Veronica Lucchesi", "3-1", "Rodrigo Soca", "DESEMPATE FINAL COPA B T6");
agregarResultado("Rodrigo Soca", "1-3", "Veronica Lucchesi", "DESEMPATE FINAL COPA B T6");
agregarResultado("Ramiro Vita", "15-8", "Rodrigo Soca", "RONDA 1 COPA TOTAL T6");
agregarResultado("Rodrigo Soca", "8-15", "Ramiro Vita", "RONDA 1 COPA TOTAL T6");
agregarResultado("Lucas Insua", "9-6", "Koke", "RONDA 1 COPA TOTAL T6");
agregarResultado("Koke", "6-9", "Lucas Insua", "RONDA 1 COPA TOTAL T6");
agregarResultado("Eze", "8-7", "Juli Boetsch", "RONDA 1 COPA TOTAL T6");
agregarResultado("Juli Boetsch", "7-8", "Eze", "RONDA 1 COPA TOTAL T6");
agregarResultado("Fede Gerez", "8-1", "Ramiro Caruso", "RONDA 1 COPA TOTAL T6");
agregarResultado("Valentina Scocier", "12-6", "Natanael", "RONDA 1 COPA TOTAL T6");
agregarResultado("Natanael", "6-12", "Valentina Scocier", "RONDA 1 COPA TOTAL T6");
agregarResultado("Mario Talarico", "16-6", "Ramiro Vita", "16AVOS DE FINAL COPA TOTAL T6");
agregarResultado("Ramiro Vita", "6-16", "Mario Talarico", "16AVOS DE FINAL COPA TOTAL T6");
agregarResultado("Pancho Muzzio", "15-9", "Nahuel Scocier", "16AVOS DE FINAL COPA TOTAL T6");
agregarResultado("Nahuel Scocier", "9-15", "Pancho Muzzio", "16AVOS DE FINAL COPA TOTAL T6");
agregarResultado("Nico Avalos", "16-14", "Santi", "16AVOS DE FINAL COPA TOTAL T6");
agregarResultado("Santi", "14-16", "Nico Avalos", "16AVOS DE FINAL COPA TOTAL T6");
agregarResultado("Luciano Hufschmid", "9-7", "Bruno Alonso", "16AVOS DE FINAL COPA TOTAL T6");
agregarResultado("Bruno Alonso", "7-9", "Luciano Hufschmid", "16AVOS DE FINAL COPA TOTAL T6");
agregarResultado("Tomas Hon", "10-14", "Lucas Insua", "16AVOS DE FINAL COPA TOTAL T6");
agregarResultado("Lucas Insua", "14-10", "Tomas Hon", "16AVOS DE FINAL COPA TOTAL T6");
agregarResultado("Rodrigo Talarico", "9-9", "Moreno Perez", "16AVOS DE FINAL COPA TOTAL T6");
agregarResultado("Moreno Perez", "9-9", "Rodrigo Talarico", "16AVOS DE FINAL COPA TOTAL T6");
agregarResultado("Jhose", "6-14", "Eze", "16AVOS DE FINAL COPA TOTAL T6");
agregarResultado("Eze", "14-6", "Jhose", "16AVOS DE FINAL COPA TOTAL T6");
agregarResultado("Lautaro Scocier", "11-9", "Pollo", "16AVOS DE FINAL COPA TOTAL T6");
agregarResultado("Pollo", "9-11", "Lautaro Scocier", "16AVOS DE FINAL COPA TOTAL T6");
agregarResultado("Matias Varela", "16-16", "Fede Gerez", "16AVOS DE FINAL COPA TOTAL T6");
agregarResultado("Fede Gerez", "16-16", "Matias Varela", "16AVOS DE FINAL COPA TOTAL T6");
agregarResultado("Kevin Sivori", "13-14", "Joaco Fernandez", "16AVOS DE FINAL COPA TOTAL T6");
agregarResultado("Joaco Fernandez", "14-13", "Kevin Sivori", "16AVOS DE FINAL COPA TOTAL T6");
agregarResultado("Anubis", "15-18", "Matias Diaz", "16AVOS DE FINAL COPA TOTAL T6");
agregarResultado("Matias Diaz", "18-15", "Anubis", "16AVOS DE FINAL COPA TOTAL T6");
agregarResultado("Joel Marasco", "10-7", "Martin Bustos", "16AVOS DE FINAL COPA TOTAL T6");
agregarResultado("Martin Bustos", "7-10", "Joel Marasco", "16AVOS DE FINAL COPA TOTAL T6");
agregarResultado("Gabriel Talarico", "7-7", "Valentina Scocier", "16AVOS DE FINAL COPA TOTAL T6");
agregarResultado("Valentina Scocier", "7-7", "Gabriel Talarico", "16AVOS DE FINAL COPA TOTAL T6");
agregarResultado("Matheo Olivera", "6-13", "Diego", "16AVOS DE FINAL COPA TOTAL T6");
agregarResultado("Diego", "13-6", "Matheo Olivera", "16AVOS DE FINAL COPA TOTAL T6");
agregarResultado("Rodri Sebastian", "6-15", "Fabrizio Escolano", "16AVOS DE FINAL COPA TOTAL T6");
agregarResultado("Fabrizio Escolano", "15-6", "Rodri Sebastian", "16AVOS DE FINAL COPA TOTAL T6");
agregarResultado("Nico Luchetti (R)", "9-8", "Veronica Luchessi", "16AVOS DE FINAL COPA TOTAL T6");
agregarResultado("Veronica Luchessi", "8-9", "Nico Luchetti (R)", "16AVOS DE FINAL COPA TOTAL T6");
agregarResultado("Rodrigo Talarico", "10-9", "Moreno Perez", "DESEMPATE 16AVOS COPA TOTAL T6");
agregarResultado("Moreno Perez", "9-10", "Rodrigo Talarico", "DESEMPATE 16AVOS COPA TOTAL T6");
agregarResultado("Matias Varela", "18-17", "Fede Gerez", "DESEMPATE 16AVOS COPA TOTAL T6");
agregarResultado("Fede Gerez", "17-18", "Matias Varela", "DESEMPATE 16AVOS COPA TOTAL T6");
agregarResultado("Gabriel Talarico", "11-9", "Valentina Scocier", "DESEMPATE 16AVOS COPA TOTAL T6");
agregarResultado("Valentina Scocier", "9-11", "Gabriel Talarico", "DESEMPATE 16AVOS COPA TOTAL T6");
agregarResultado("Mario Talarico", "10-4", "Pancho Muzzio", "OCTAVOS DE FINAL COPA TOTAL T6");
agregarResultado("Pancho Muzzio", "4-10", "Mario Talarico", "OCTAVOS DE FINAL COPA TOTAL T6");
agregarResultado("Nico Avalos", "8-5", "Luciano Hufschmid", "OCTAVOS DE FINAL COPA TOTAL T6");
agregarResultado("Luciano Hufschmid", "5-8", "Nico Avalos", "OCTAVOS DE FINAL COPA TOTAL T6");
agregarResultado("Lucas Insua", "2-7", "Rodrigo Talarico", "OCTAVOS DE FINAL COPA TOTAL T6");
agregarResultado("Rodrigo Talarico", "7-2", "Lucas Insua", "OCTAVOS DE FINAL COPA TOTAL T6");
agregarResultado("Eze", "6-10", "Lautaro Scocier", "OCTAVOS DE FINAL COPA TOTAL T6");
agregarResultado("Lautaro Scocier", "10-6", "Eze", "OCTAVOS DE FINAL COPA TOTAL T6");
agregarResultado("Matias Varela", "5-6", "Joaco Fernandez", "OCTAVOS DE FINAL COPA TOTAL T6");
agregarResultado("Joaco Fernandez", "6-5", "Matias Varela", "OCTAVOS DE FINAL COPA TOTAL T6");
agregarResultado("Matias Diaz", "5-5", "Joel Marasco", "OCTAVOS DE FINAL COPA TOTAL T6");
agregarResultado("Joel Marasco", "5-5", "Matias Diaz", "OCTAVOS DE FINAL COPA TOTAL T6");
agregarResultado("Gabriel Talarico", "6-6", "Diego", "OCTAVOS DE FINAL COPA TOTAL T6");
agregarResultado("Diego", "6-6", "Gabriel Talarico", "OCTAVOS DE FINAL COPA TOTAL T6");
agregarResultado("Fabrizio Escolano", "9-7", "Nico Luchetti", "OCTAVOS DE FINAL COPA TOTAL T6");
agregarResultado("Nico Luchetti", "7-9", "Fabrizio Escolano", "OCTAVOS DE FINAL COPA TOTAL T6");
agregarResultado("Matias Diaz", "11-13", "Joel Marasco", "DESEMPATE OCTAVOS DE FINAL COPA TOTAL T6");
agregarResultado("Joel Marasco", "13-11", "Matias Diaz", "DESEMPATE OCTAVOS DE FINAL COPA TOTAL T6");
agregarResultado("Gabriel Talarico", "13-11", "Diego", "DESEMPATE OCTAVOS DE FINAL COPA TOTAL T6");
agregarResultado("Diego", "11-13", "Gabriel Talarico", "DESEMPATE OCTAVOS DE FINAL COPA TOTAL T6");
agregarResultado("Mario Talarico", "8-10", "Nico Avalos", "CUARTOS DE FINAL COPA TOTAL T6");
agregarResultado("Nico Avalos", "10-8", "Mario Talarico", "CUARTOS DE FINAL COPA TOTAL T6");
agregarResultado("Rodrigo Talarico", "6-14", "Lautaro Scocier", "CUARTOS DE FINAL COPA TOTAL T6");
agregarResultado("Lautaro Scocier", "14-6", "Rodrigo Talarico", "CUARTOS DE FINAL COPA TOTAL T6");
agregarResultado("Joaco Fernandez", "7-11", "Joel Marasco", "CUARTOS DE FINAL COPA TOTAL T6");
agregarResultado("Joel Marasco", "11-7", "Joaco Fernandez", "CUARTOS DE FINAL COPA TOTAL T6");
agregarResultado("Gabriel Talarico", "11-12", "Fabrizio Escolano", "CUARTOS DE FINAL COPA TOTAL T6");
agregarResultado("Fabrizio Escolano", "12-11", "Gabriel Talarico", "CUARTOS DE FINAL COPA TOTAL T6");
agregarResultado("Nico Avalos", "12-8", "Lautaro Scocier", "SEMIFINAL COPA TOTAL T6");
agregarResultado("Lautaro Scocier", "8-12", "Nico Avalos", "SEMIFINAL COPA TOTAL T6");
agregarResultado("Joel Marasco", "12-16", "Fabrizio Escolano", "SEMIFINAL COPA TOTAL T6");
agregarResultado("Fabrizio Escolano", "16-12", "Joel Marasco", "SEMIFINAL COPA TOTAL T6");
agregarResultado("Joaco Fernandez", "8-6", "Jhose", "PARTIDO POR 48HS DE BAN T6");
agregarResultado("Jhose", "6-8", "Joaco Fernandez", "PARTIDO POR 48HS DE BAN T6");
agregarResultado("Nico Avalos", "5-6", "Fabrizio Escolano", "FINAL COPA TOTAL T6");
agregarResultado("Fabrizio Escolano", "6-5", "Nico Avalos", "FINAL COPA TOTAL T6");
agregarResultado("Rodri Sebastian", "14-6", "Santi", "FINAL COPA DUOS T6");
agregarResultado("Santi", "6-14", "Rodri Sebastian", "FINAL COPA DUOS T6");
agregarResultado("Rodrigo Soca", "14-6", "Gabriel Talarico", "FINAL COPA DUOS T6");
agregarResultado("Gabriel Talarico", "6-14", "Rodrigo Soca", "FINAL COPA DUOS T6");
agregarResultado("Rodri Sebastian", "14-6", "Gabriel Talarico", "FINAL COPA DUOS T6");
agregarResultado("Gabriel Talarico", "6-14", "Rodri Sebastian", "FINAL COPA DUOS T6");
agregarResultado("Rodrigo Soca", "14-6", "Santi", "FINAL COPA DUOS T6");
agregarResultado("Santi", "6-14", "Rodrigo Soca", "FINAL COPA DUOS T6");
agregarResultado("Rodri Sebastian", "3-2", "Santi", "PROMOCION T6");
agregarResultado("Santi", "2-3", "Rodri Sebastian", "PROMOCION T6");
agregarResultado("Nico Luchetti (R)", "5-3", "Eze", "PROMOCION T6");
agregarResultado("Eze", "3-5", "Nico Luchetti (R)", "PROMOCION T6");
agregarResultado("Rodri Sebastian", "3-4", "Gabriel Talarico", "COPA CAMPEONES T6");
agregarResultado("Gabriel Talarico", "4-3", "Rodri Sebastian", "COPA CAMPEONES T6");
agregarResultado("Rodrigo Soca", "11-7", "Gabriel Talarico", "CUARTOS DE FINAL COPA A T7");
agregarResultado("Gabriel Talarico", "7-11", "Rodrigo Soca", "CUARTOS DE FINAL COPA A T7");
agregarResultado("Matheo Olivera", "11-9", "Veronica Lucchesi", "CUARTOS DE FINAL COPA A T7");
agregarResultado("Veronica Lucchesi", "9-11", "Matheo Olivera", "CUARTOS DE FINAL COPA A T7");
agregarResultado("Jhose", "8-8", "Joel Marasco", "CUARTOS DE FINAL COPA A T7");
agregarResultado("Joel Marasco", "8-8", "Jhose", "CUARTOS DE FINAL COPA A T7");
agregarResultado("Nico Luchetti", "4-10", "Fabrizio Escolano", "CUARTOS DE FINAL COPA A T7");
agregarResultado("Fabrizio Escolano", "10-4", "Nico Luchetti", "CUARTOS DE FINAL COPA A T7");
agregarResultado("Gabriel Talarico", "6-3", "Matias Diaz", "DESEMPATE GRUPOS COPA A T7");
agregarResultado("Matias Diaz", "3-6", "Gabriel Talarico", "DESEMPATE GRUPOS COPA A T7");
agregarResultado("Kevin Sivori", "4-4", "Matheo Olivera", "DESEMPATE GRUPOS COPA A T7");
agregarResultado("Matheo Olivera", "4-4", "Kevin Sivori", "DESEMPATE GRUPOS COPA A T7");
agregarResultado("Kevin Sivori", "2-4", "Matheo Olivera", "DESEMPATE GRUPOS COPA A T7");
agregarResultado("Matheo Olivera", "4-2", "Kevin Sivori", "DESEMPATE GRUPOS COPA A T7");
agregarResultado("Jhose", "1-0", "Joel Marasco", "DESEMPATE CUARTOS DE FINAL COPA A T7");
agregarResultado("Joel Marasco", "0-1", "Jhose", "DESEMPATE CUARTOS DE FINAL COPA A T7");
agregarResultado("Fabrizio Escolano", "13-10", "Matheo Olivera", "SEMIFINAL COPA A T7");
agregarResultado("Matheo Olivera", "10-13", "Fabrizio Escolano", "SEMIFINAL COPA A T7");
agregarResultado("Jhose", "14-7", "Rodrigo Soca", "SEMIFINAL COPA A T7");
agregarResultado("Rodrigo Soca", "7-14", "Jhose", "SEMIFINAL COPA A T7");
agregarResultado("Fabrizio Escolano", "10-7", "Jhose", "FINAL COPA A T7");
agregarResultado("Jhose", "7-10", "Fabrizio Escolano", "FINAL COPA A T7");
agregarResultado("Lucas Aguilera", "2-8", "Santi", "OCTAVOS DE FINAL COPA B T7");
agregarResultado("Santi", "8-2", "Lucas Aguilera", "OCTAVOS DE FINAL COPA B T7");
agregarResultado("Eze", "8-2", "Tomas Torcasio", "OCTAVOS DE FINAL COPA B T7");
agregarResultado("Tomas Torcasio", "2-8", "Eze", "OCTAVOS DE FINAL COPA B T7");
agregarResultado("Tomas Delgado", "8-12", "Rodrigo Talarico", "OCTAVOS DE FINAL COPA B T7");
agregarResultado("Rodrigo Talarico", "12-8", "Tomas Delgado", "OCTAVOS DE FINAL COPA B T7");
agregarResultado("Tomas Gonzalez", "7-4", "Ian Gangai", "OCTAVOS DE FINAL COPA B T7");
agregarResultado("Ian Gangai", "4-7", "Tomas Gonzalez", "OCTAVOS DE FINAL COPA B T7");
agregarResultado("Mario Talarico", "10-3", "Lucas Insua", "OCTAVOS DE FINAL COPA B T7");
agregarResultado("Lucas Insua", "3-10", "Mario Talarico", "OCTAVOS DE FINAL COPA B T7");
agregarResultado("Fede Gerez", "4-9", "Anubis", "OCTAVOS DE FINAL COPA B T7");
agregarResultado("Anubis", "9-4", "Fede Gerez", "OCTAVOS DE FINAL COPA B T7");
agregarResultado("Dani Bazan", "6-5", "Luciano Hufschmid", "OCTAVOS DE FINAL COPA B T7");
agregarResultado("Luciano Hufschmid", "5-6", "Dani Bazan", "OCTAVOS DE FINAL COPA B T7");
agregarResultado("Natanael", "3-9", "Anto", "OCTAVOS DE FINAL COPA B T7");
agregarResultado("Anto", "9-3", "Natanael", "OCTAVOS DE FINAL COPA B T7");
agregarResultado("Rodrigo Talarico", "9-2", "Anubis", "CUARTOS DE FINAL COPA B T7");
agregarResultado("Anubis", "2-9", "Rodrigo Talarico", "CUARTOS DE FINAL COPA B T7");
agregarResultado("Mario Talarico", "4-10", "Eze", "CUARTOS DE FINAL COPA B T7");
agregarResultado("Eze", "10-4", "Mario Talarico", "CUARTOS DE FINAL COPA B T7");
agregarResultado("Dani Bazan", "6-11", "Tomas Gonzalez", "CUARTOS DE FINAL COPA B T7");
agregarResultado("Tomas Gonzalez", "11-6", "Dani Bazan", "CUARTOS DE FINAL COPA B T7");
agregarResultado("Santi", "7-4", "Anto", "CUARTOS DE FINAL COPA B T7");
agregarResultado("Anto", "4-7", "Santi", "CUARTOS DE FINAL COPA B T7");
agregarResultado("Eze", "6-5", "Santi", "SEMIFINAL COPA B T7");
agregarResultado("Santi", "5-6", "Eze", "SEMIFINAL COPA B T7");
agregarResultado("Tomas Gonzalez", "7-9", "Rodrigo Talarico", "SEMIFINAL COPA B T7");
agregarResultado("Rodrigo Talarico", "9-7", "Tomas Gonzalez", "SEMIFINAL COPA B T7");
agregarResultado("Eze", "4-5", "Rodrigo Talarico", "FINAL COPA B T7");
agregarResultado("Rodrigo Talarico", "5-4", "Eze", "FINAL COPA B T7");
agregarResultado("Tomas Gonzalez", "9-12", "Ian Gangai", "32AVOS DE FINAL COPA TOTAL T7");
agregarResultado("Ian Gangai", "12-9", "Tomas Gonzalez", "32AVOS DE FINAL COPA TOTAL T7");
agregarResultado("Veronica Lucchesi", "13-2", "Agustin", "32AVOS DE FINAL COPA TOTAL T7");
agregarResultado("Agustin", "2-13", "Veronica Lucchesi", "32AVOS DE FINAL COPA TOTAL T7");
agregarResultado("Fede Gerez", "13-14", "Anto", "32AVOS DE FINAL COPA TOTAL T7");
agregarResultado("Anto", "14-13", "Fede Gerez", "32AVOS DE FINAL COPA TOTAL T7");
agregarResultado("Ramiro Vita", "7-15", "Lucas Aguilera", "32AVOS DE FINAL COPA TOTAL T7");
agregarResultado("Lucas Aguilera", "15-7", "Ramiro Vita", "32AVOS DE FINAL COPA TOTAL T7");
agregarResultado("Matias Diaz", "6-4", "Santino Mercado", "32AVOS DE FINAL COPA TOTAL T7");
agregarResultado("Santino Mercado", "4-6", "Matias Diaz", "32AVOS DE FINAL COPA TOTAL T7");
agregarResultado("Lucas Insua", "6-13", "Tomas Delgado", "32AVOS DE FINAL COPA TOTAL T7");
agregarResultado("Tomas Delgado", "13-6", "Lucas Insua", "32AVOS DE FINAL COPA TOTAL T7");
agregarResultado("Natanael", "4-2", "Joaquin Sampadaro", "32AVOS DE FINAL COPA TOTAL T7");
agregarResultado("Joaquin Sampadaro", "2-4", "Natanael", "32AVOS DE FINAL COPA TOTAL T7");
agregarResultado("Valentina Scocier", "7-14", "Tomas Torcasio", "32AVOS DE FINAL COPA TOTAL T7");
agregarResultado("Tomas Torcasio", "14-7", "Valentina Scocier", "32AVOS DE FINAL COPA TOTAL T7");
agregarResultado("Moreno Perez", "8-8", "Daniel Bazan", "32AVOS DE FINAL COPA TOTAL T7");
agregarResultado("Daniel Bazan", "8-8", "Moreno Perez", "32AVOS DE FINAL COPA TOTAL T7");
agregarResultado("Rodrigo Soca", "16-8", "Nacho Soto", "32AVOS DE FINAL COPA TOTAL T7");
agregarResultado("Nacho Soto", "8-16", "Rodrigo Soca", "32AVOS DE FINAL COPA TOTAL T7");
agregarResultado("Moreno Perez", "2-4", "Dani Bazan", "DESEMPATE 32AVOS DE FINAL COPA TOTAL T7");
agregarResultado("Dani Bazan", "4-2", "Moreno Perez", "DESEMPATE 32AVOS DE FINAL COPA TOTAL T7");
agregarResultado("Lautaro Scocier", "5-8", "Ian Gangai", "16AVOS DE FINAL COPA TOTAL T7");
agregarResultado("Ian Gangai", "8-5", "Lautaro Scocier", "16AVOS DE FINAL COPA TOTAL T7");
agregarResultado("Matias Varela", "6-15", "Eze", "16AVOS DE FINAL COPA TOTAL T7");
agregarResultado("Eze", "15-6", "Matias Varela", "16AVOS DE FINAL COPA TOTAL T7");
agregarResultado("Rodri Sebastian", "8-12", "Veronica Lucchesi", "16AVOS DE FINAL COPA TOTAL T7");
agregarResultado("Veronica Lucchesi", "12-8", "Rodri Sebastian", "16AVOS DE FINAL COPA TOTAL T7");
agregarResultado("Matheo Olivera", "9-7", "Antonella Lopez", "16AVOS DE FINAL COPA TOTAL T7");
agregarResultado("Antonella Lopez", "7-9", "Matheo Olivera", "16AVOS DE FINAL COPA TOTAL T7");
agregarResultado("Mario Talarico", "10-8", "Lucas Aguilera", "16AVOS DE FINAL COPA TOTAL T7");
agregarResultado("Lucas Aguilera", "8-10", "Mario Talarico", "16AVOS DE FINAL COPA TOTAL T7");
agregarResultado("Luciano Hufschmid", "8-12", "Santi", "16AVOS DE FINAL COPA TOTAL T7");
agregarResultado("Santi", "12-8", "Luciano Hufschmid", "16AVOS DE FINAL COPA TOTAL T7");
agregarResultado("Gabriel Talarico", "10-10", "Matias Diaz", "16AVOS DE FINAL COPA TOTAL T7");
agregarResultado("Matias Diaz", "10-10", "Gabriel Talarico", "16AVOS DE FINAL COPA TOTAL T7");
agregarResultado("Pancho Muzzio", "10-5", "Fabrizio Escolano", "16AVOS DE FINAL COPA TOTAL T7");
agregarResultado("Fabrizio Escolano", "5-10", "Pancho Muzzio", "16AVOS DE FINAL COPA TOTAL T7");
agregarResultado("Nico Avalos", "6-10", "Tomas Delgado", "16AVOS DE FINAL COPA TOTAL T7");
agregarResultado("Tomas Delgado", "10-6", "Nico Avalos", "16AVOS DE FINAL COPA TOTAL T7");
agregarResultado("Anubis", "8-12", "Nico Luchetti (R)", "16AVOS DE FINAL COPA TOTAL T7");
agregarResultado("Nico Luchetti (R)", "12-8", "Anubis", "16AVOS DE FINAL COPA TOTAL T7");
agregarResultado("Nahuel Scocier", "8-9", "Natanael", "16AVOS DE FINAL COPA TOTAL T7");
agregarResultado("Natanael", "9-8", "Nahuel Scocier", "16AVOS DE FINAL COPA TOTAL T7");
agregarResultado("Jhose", "10-6", "Tomas Torcasio", "16AVOS DE FINAL COPA TOTAL T7");
agregarResultado("Tomas Torcasio", "6-10", "Jhose", "16AVOS DE FINAL COPA TOTAL T7");
agregarResultado("Joaco Fernandez", "0-6", "Bruno Alonso", "16AVOS DE FINAL COPA TOTAL T7");
agregarResultado("Bruno Alonso", "6-0", "Joaco Fernandez", "16AVOS DE FINAL COPA TOTAL T7");
agregarResultado("Rodrigo Talarico", "10-10", "Rodrigo Soca", "16AVOS DE FINAL COPA TOTAL T7");
agregarResultado("Rodrigo Soca", "10-10", "Rodrigo Talarico", "16AVOS DE FINAL COPA TOTAL T7");
agregarResultado("Joel Marasco", "8-8", "Martin Bustos", "16AVOS DE FINAL COPA TOTAL T7");
agregarResultado("Martin Bustos", "8-8", "Joel Marasco", "16AVOS DE FINAL COPA TOTAL T7");
agregarResultado("Gabriel Talarico", "2-4", "Matias Diaz", "DESEMPATE 16 AVOS DE FINAL COPA TOTAL T7");
agregarResultado("Matias Diaz", "4-2", "Gabriel Talarico", "DESEMPATE 16 AVOS DE FINAL COPA TOTAL T7");
agregarResultado("Rodrigo Talarico", "2-2", "Rodrigo Soca", "DESEMPATE 16 AVOS DE FINAL COPA TOTAL T7");
agregarResultado("Rodrigo Soca", "2-2", "Rodrigo Talarico", "DESEMPATE 16 AVOS DE FINAL COPA TOTAL T7");
agregarResultado("Joel Marasco", "2-0", "Martin Bustos", "DESEMPATE 16 AVOS DE FINAL COPA TOTAL T7");
agregarResultado("Martin Bustos", "0-2", "Joel Marasco", "DESEMPATE 16 AVOS DE FINAL COPA TOTAL T7");
agregarResultado("Rodrigo Talarico", "4-11", "Rodrigo Soca", "DESEMPATE 16AVOS DE FINAL COPA TOTAL T7");
agregarResultado("Rodrigo Soca", "11-4", "Rodrigo Talarico", "DESEMPATE 16AVOS DE FINAL COPA TOTAL T7");
agregarResultado("Kevin Sivori", "4-10", "Dani Bazan", "16AVOS DE FINAL COPA TOTAL T7");
agregarResultado("Dani Bazan", "10-4", "Kevin Sivori", "16AVOS DE FINAL COPA TOTAL T7");
agregarResultado("Ian Gangai", "4-8", "Eze", "OCTAVOS DE FINAL COPA TOTAL T7");
agregarResultado("Eze", "8-4", "Ian Gangai", "OCTAVOS DE FINAL COPA TOTAL T7");
agregarResultado("Veronica Lucchesi", "10-10", "Matheo Olivera", "OCTAVOS DE FINAL COPA TOTAL T7");
agregarResultado("Matheo Olivera", "10-10", "Veronica Lucchesi", "OCTAVOS DE FINAL COPA TOTAL T7");
agregarResultado("Mario Talarico", "10-8", "Santi", "OCTAVOS DE FINAL COPA TOTAL T7");
agregarResultado("Santi", "8-10", "Mario Talarico", "OCTAVOS DE FINAL COPA TOTAL T7");
agregarResultado("Matias Diaz", "11-5", "Pancho Muzzio", "OCTAVOS DE FINAL COPA TOTAL T7");
agregarResultado("Pancho Muzzio", "5-11", "Matias Diaz", "OCTAVOS DE FINAL COPA TOTAL T7");
agregarResultado("Tomas Delgado", "8-7", "Nico Luchetti", "OCTAVOS DE FINAL COPA TOTAL T7");
agregarResultado("Nico Luchetti", "7-8", "Tomas Delgado", "OCTAVOS DE FINAL COPA TOTAL T7");
agregarResultado("Natanael", "3-5", "Jhose", "OCTAVOS DE FINAL COPA TOTAL T7");
agregarResultado("Jhose", "5-3", "Natanael", "OCTAVOS DE FINAL COPA TOTAL T7");
agregarResultado("Daniel Bazan", "6-8", "Bruno Alonso", "OCTAVOS DE FINAL COPA TOTAL T7");
agregarResultado("Bruno Alonso", "8-6", "Daniel Bazan", "OCTAVOS DE FINAL COPA TOTAL T7");
agregarResultado("Rodrigo Soca", "5-10", "Joel Marasco", "OCTAVOS DE FINAL COPA TOTAL T7");
agregarResultado("Joel Marasco", "10-5", "Rodrigo Soca", "OCTAVOS DE FINAL COPA TOTAL T7");
agregarResultado("Veronica Lucchesi", "6-4", "Matheo Olivera", "DESEMPATE OCTAVOS DE FINAL COPA TOTAL T7");
agregarResultado("Matheo Olivera", "4-6", "Veronica Lucchesi", "DESEMPATE OCTAVOS DE FINAL COPA TOTAL T7");
agregarResultado("Eze", "10-9", "Veronica Lucchesi", "CUARTOS DE FINAL COPA TOTAL T7");
agregarResultado("Veronica Lucchesi", "9-10", "Eze", "CUARTOS DE FINAL COPA TOTAL T7");
agregarResultado("Mario Talarico", "4-6", "Matias Diaz", "CUARTOS DE FINAL COPA TOTAL T7");
agregarResultado("Matias Diaz", "6-4", "Mario Talarico", "CUARTOS DE FINAL COPA TOTAL T7");
agregarResultado("Tomas Delgado", "10-8", "Jhose", "CUARTOS DE FINAL COPA TOTAL T7");
agregarResultado("Jhose", "8-10", "Tomas Delgado", "CUARTOS DE FINAL COPA TOTAL T7");
agregarResultado("Bruno Alonso", "7-8", "Joel Marasco", "CUARTOS DE FINAL COPA TOTAL T7");
agregarResultado("Joel Marasco", "8-7", "Bruno Alonso", "CUARTOS DE FINAL COPA TOTAL T7");
agregarResultado("Eze", "6-8", "Matias Diaz", "SEMIFINAL COPA TOTAL T7");
agregarResultado("Matias Diaz", "8-6", "Eze", "SEMIFINAL COPA TOTAL T7");
agregarResultado("Tomas Delgado", "13-7", "Joel Marasco", "SEMIFINAL COPA TOTAL T7");
agregarResultado("Joel Marasco", "7-13", "Tomas Delgado", "SEMIFINAL COPA TOTAL T7");
agregarResultado("Matias Diaz", "9-13", "Tomas Delgado", "FINAL COPA TOTAL T7");
agregarResultado("Tomas Delgado", "13-9", "Matias Diaz", "FINAL COPA TOTAL T7");
agregarResultado("Nahuel Scocier", "10-7", "Fabrizio Esolano", "COPA CAMPEONES T7");
agregarResultado("Fabrizio Esolano", "7-10", "Nahuel Scocier", "COPA CAMPEONES T7");
agregarResultado("Rodrigo Talarico", "18-20", "Matheo Olivera", "FINAL COPA DUOS");
agregarResultado("Matheo Olivera", "20-18", "Rodrigo Talarico", "FINAL COPA DUOS");
agregarResultado("Tomas Delgado", "18-20", "Veronica Lucchesi", "FINAL COPA DUOS");
agregarResultado("Veronica Lucchesi", "20-18", "Tomas Delgado", "FINAL COPA DUOS");
agregarResultado("Rodrigo Talarico", "18-20", "Veronica Lucchesi", "FINAL COPA DUOS");
agregarResultado("Veronica Lucchesi", "20-18", "Rodrigo Talarico", "FINAL COPA DUOS");
agregarResultado("Tomas Delgado", "18-20", "Matheo Olivera", "FINAL COPA DUOS");
agregarResultado("Matheo Olivera", "20-18", "Tomas Delgado", "FINAL COPA DUOS");
agregarResultado("Joaquin Sampadaro", "7-9", "Bruno Alonso", "PROMOCION T7");
agregarResultado("Bruno Alonso", "9-7", "Joaquin Sampadaro", "PROMOCION T7");
agregarResultado("Eze", "4-2", "Nico Luchetti (R)", "PROMOCION T7");
agregarResultado("Nico Luchetti (R)", "2-4", "Eze", "PROMOCION T7");
agregarResultado("Ian Gangai", "13-2", "Kevin Sivori", "PROMOCION T7");
agregarResultado("Kevin Sivori", "2-13", "Ian Gangai", "PROMOCION T7");
agregarResultado("Tomas Delgado", "7-13", "Rodrigo Talarico", "CUARTOS DE FINAL COPA A T8");
agregarResultado("Rodrigo Talarico", "13-7", "Tomas Delgado", "CUARTOS DE FINAL COPA A T8");
agregarResultado("Nahuel Scocier", "14-7", "Lautaro Scocier", "CUARTOS DE FINAL COPA A T8");
agregarResultado("Lautaro Scocier", "7-14", "Nahuel Scocier", "CUARTOS DE FINAL COPA A T8");
agregarResultado("Matheo Olivera", "8-14", "Pancho Muzzio", "CUARTOS DE FINAL COPA A T8");
agregarResultado("Pancho Muzzio", "14-8", "Matheo Olivera", "CUARTOS DE FINAL COPA A T8");
agregarResultado("Ramiro Vita", "11-13", "Ian Gangai", "CUARTOS DE FINAL COPA A T8");
agregarResultado("Ian Gangai", "13-11", "Ramiro Vita", "CUARTOS DE FINAL COPA A T8");
agregarResultado("Ian Gangai", "11-6", "Rodrigo Talarico", "SEMIFINAL COPA A T8");
agregarResultado("Rodrigo Talarico", "6-11", "Ian Gangai", "SEMIFINAL COPA A T8");
agregarResultado("Pancho Muzzio", "7-6", "Nahuel Scocier", "SEMIFINAL COPA A T8");
agregarResultado("Nahuel Scocier", "6-7", "Pancho Muzzio", "SEMIFINAL COPA A T8");
agregarResultado("Ian Gangai", "4-12", "Pancho Muzzio", "FINAL COPA A T8");
agregarResultado("Pancho Muzzio", "12-4", "Ian Gangai", "FINAL COPA A T8");
agregarResultado("Santi", "6-4", "Joaquin Sampadaro", "OCTAVOS DE FINAL COPA B T8");
agregarResultado("Joaquin Sampadaro", "4-6", "Santi", "OCTAVOS DE FINAL COPA B T8");
agregarResultado("Matias Diaz", "6-4", "Nico Luchetti (R)", "OCTAVOS DE FINAL COPA B T8");
agregarResultado("Nico Luchetti (R)", "4-6", "Matias Diaz", "OCTAVOS DE FINAL COPA B T8");
agregarResultado("Lucas Aguilera", "5-4", "Gonzalo Nuñez", "OCTAVOS DE FINAL COPA B T8");
agregarResultado("Rodri Sebastian", "3-6", "Anubis", "OCTAVOS DE FINAL COPA B T8");
agregarResultado("Anubis", "6-3", "Rodri Sebastian", "OCTAVOS DE FINAL COPA B T8");
agregarResultado("Valentina Scocier", "2-4", "Nacho Soto", "OCTAVOS DE FINAL COPA B T8");
agregarResultado("Nacho Soto", "4-2", "Valentina Scocier", "OCTAVOS DE FINAL COPA B T8");
agregarResultado("Renzo Badano", "3-4", "Luciano Hufschmid", "OCTAVOS DE FINAL COPA B T8");
agregarResultado("Luciano Hufschmid", "4-3", "Renzo Badano", "OCTAVOS DE FINAL COPA B T8");
agregarResultado("Tomas Torcasio", "4-8", "Benja", "OCTAVOS DE FINAL COPA B T8");
agregarResultado("Benja", "8-4", "Tomas Torcasio", "OCTAVOS DE FINAL COPA B T8");
agregarResultado("Alexis Segovia", "4-3", "Lucas Insua", "OCTAVOS DE FINAL COPA B T8");
agregarResultado("Lucas Insua", "3-4", "Alexis Segovia", "OCTAVOS DE FINAL COPA B T8");
agregarResultado("Anubis", "3-6", "Nacho Soto", "CUARTOS DE FINAL COPA B T8");
agregarResultado("Nacho Soto", "6-3", "Anubis", "CUARTOS DE FINAL COPA B T8");
agregarResultado("Luciano Hufschmid", "8-12", "Lucas Aguilera", "CUARTOS DE FINAL COPA B T8");
agregarResultado("Lucas Aguilera", "12-8", "Luciano Hufschmid", "CUARTOS DE FINAL COPA B T8");
agregarResultado("Santi", "7-6", "Alexis Segovia", "CUARTOS DE FINAL COPA B T8");
agregarResultado("Alexis Segovia", "6-7", "Santi", "CUARTOS DE FINAL COPA B T8");
agregarResultado("Benja", "11-5", "Matias Diaz", "CUARTOS DE FINAL COPA B T8");
agregarResultado("Matias Diaz", "5-11", "Benja", "CUARTOS DE FINAL COPA B T8");
agregarResultado("Santi", "8-7", "Lucas Aguilera", "SEMIFINAL COPA B T8");
agregarResultado("Lucas Aguilera", "7-8", "Santi", "SEMIFINAL COPA B T8");
agregarResultado("Benja", "7-8", "Nacho Soto", "SEMIFINAL COPA B T8");
agregarResultado("Nacho Soto", "8-7", "Benja", "SEMIFINAL COPA B T8");
agregarResultado("Santi", "11-7", "Nacho Soto", "FINAL COPA B T8");
agregarResultado("Nacho Soto", "7-11", "Santi", "FINAL COPA B T8");
agregarResultado("Dani Bazan", "4-6", "Anto", "32AVOS DE FINAL COPA TOTAL T8");
agregarResultado("Anto", "6-4", "Dani Bazan", "32AVOS DE FINAL COPA TOTAL T8");
agregarResultado("Matias Diaz", "9-7", "Gonzalo Nuñez", "32AVOS DE FINAL COPA TOTAL T8");
agregarResultado("Gonzalo Nuñez", "7-9", "Matias Diaz", "32AVOS DE FINAL COPA TOTAL T8");
agregarResultado("Natanael", "5-8", "Alexis Segovia", "32AVOS DE FINAL COPA TOTAL T8");
agregarResultado("Alexis Segovia", "8-5", "Natanael", "32AVOS DE FINAL COPA TOTAL T8");
agregarResultado("Tomas Delgado", "9-9", "Nacho Soto", "32AVOS DE FINAL COPA TOTAL T8");
agregarResultado("Nacho Soto", "9-9", "Tomas Delgado", "32AVOS DE FINAL COPA TOTAL T8");
agregarResultado("Lucas Insua", "7-6", "Joaquin Sampadaro", "32AVOS DE FINAL COPA TOTAL T8");
agregarResultado("Joaquin Sampadaro", "6-7", "Lucas Insua", "32AVOS DE FINAL COPA TOTAL T8");
agregarResultado("Ian Gangai", "10-6", "Lucas Aguilera", "32AVOS DE FINAL COPA TOTAL T8");
agregarResultado("Lucas Aguilera", "6-10", "Ian Gangai", "32AVOS DE FINAL COPA TOTAL T8");
agregarResultado("Moreno Perez", "5-11", "Renzo Badano", "32AVOS DE FINAL COPA TOTAL T8");
agregarResultado("Renzo Badano", "11-5", "Moreno Perez", "32AVOS DE FINAL COPA TOTAL T8");
agregarResultado("Valentina Scocier", "10-5", "Benja", "32AVOS DE FINAL COPA TOTAL T8");
agregarResultado("Benja", "5-10", "Valentina Scocier", "32AVOS DE FINAL COPA TOTAL T8");
agregarResultado("Tomas Gonzalez", "3-8", "Tomas Torcasio", "32AVOS DE FINAL COPA TOTAL T8");
agregarResultado("Tomas Torcasio", "8-3", "Tomas Gonzalez", "32AVOS DE FINAL COPA TOTAL T8");
agregarResultado("Tomas Delgado", "4-3", "Nacho Soto", "DESEMPATE 32AVOS DE FINAL COPA TOTAL T8");
agregarResultado("Nacho Soto", "3-4", "Tomas Delgado", "DESEMPATE 32AVOS DE FINAL COPA TOTAL T8");
agregarResultado("Mario Talarico", "8-3", "Anto", "16AVOS DE FINAL COPA TOTAL T8");
agregarResultado("Anto", "3-8", "Mario Talarico", "16AVOS DE FINAL COPA TOTAL T8");
agregarResultado("Matias Varela", "3-6", "Nico Luchetti (R)", "16AVOS DE FINAL COPA TOTAL T8");
agregarResultado("Nico Luchetti (R)", "6-3", "Matias Varela", "16AVOS DE FINAL COPA TOTAL T8");
agregarResultado("Nahuel Scocier", "8-4", "Matias Diaz", "16AVOS DE FINAL COPA TOTAL T8");
agregarResultado("Matias Diaz", "4-8", "Nahuel Scocier", "16AVOS DE FINAL COPA TOTAL T8");
agregarResultado("Luciano Hufschmid", "5-6", "Alexis Segovia", "16AVOS DE FINAL COPA TOTAL T8");
agregarResultado("Alexis Segovia", "6-5", "Luciano Hufschmid", "16AVOS DE FINAL COPA TOTAL T8");
agregarResultado("Eze", "4-3", "Veronica Lucchesi", "16AVOS DE FINAL COPA TOTAL T8");
agregarResultado("Veronica Lucchesi", "3-4", "Eze", "16AVOS DE FINAL COPA TOTAL T8");
agregarResultado("Nico Avalos", "5-4", "Lucas Insua", "16AVOS DE FINAL COPA TOTAL T8");
agregarResultado("Lucas Insua", "4-5", "Nico Avalos", "16AVOS DE FINAL COPA TOTAL T8");
agregarResultado("Pancho Muzzio", "5-6", "Martin Bustos", "16AVOS DE FINAL COPA TOTAL T8");
agregarResultado("Martin Bustos", "6-5", "Pancho Muzzio", "16AVOS DE FINAL COPA TOTAL T8");
agregarResultado("Lautaro Scocier", "8-8", "Ian Gangai", "16AVOS DE FINAL COPA TOTAL T8");
agregarResultado("Ian Gangai", "8-8", "Lautaro Scocier", "16AVOS DE FINAL COPA TOTAL T8");
agregarResultado("Fabrizio Escolano", "6-10", "Santi", "16AVOS DE FINAL COPA TOTAL T8");
agregarResultado("Santi", "10-6", "Fabrizio Escolano", "16AVOS DE FINAL COPA TOTAL T8");
agregarResultado("Matheo Olivera", "8-6", "Renzo Badano", "16AVOS DE FINAL COPA TOTAL T8");
agregarResultado("Renzo Badano", "6-8", "Matheo Olivera", "16AVOS DE FINAL COPA TOTAL T8");
agregarResultado("Joel Marasco", "4-9", "Valentina Scocier", "16AVOS DE FINAL COPA TOTAL T8");
agregarResultado("Valentina Scocier", "9-4", "Joel Marasco", "16AVOS DE FINAL COPA TOTAL T8");
agregarResultado("Rodrigo Talarico", "11-8", "Tomas Torcasio", "16AVOS DE FINAL COPA TOTAL T8");
agregarResultado("Tomas Torcasio", "8-11", "Rodrigo Talarico", "16AVOS DE FINAL COPA TOTAL T8");
agregarResultado("Anubis", "6-4", "Bruno Alonso", "16AVOS DE FINAL COPA TOTAL T8");
agregarResultado("Bruno Alonso", "4-6", "Anubis", "16AVOS DE FINAL COPA TOTAL T8");
agregarResultado("Gabriel Talarico", "6-12", "Ramiro Vita", "16AVOS DE FINAL COPA TOTAL T8");
agregarResultado("Ramiro Vita", "12-6", "Gabriel Talarico", "16AVOS DE FINAL COPA TOTAL T8");
agregarResultado("Rodri Sebastian", "7-8", "Rodrigo Soca", "16AVOS DE FINAL COPA TOTAL T8");
agregarResultado("Rodrigo Soca", "8-7", "Rodri Sebastian", "16AVOS DE FINAL COPA TOTAL T8");
agregarResultado("Tomas Delgado", "8-3", "Kevin Sivori", "16AVOS DE FINAL COPA TOTAL T8");
agregarResultado("Kevin Sivori", "3-8", "Tomas Delgado", "16AVOS DE FINAL COPA TOTAL T8");
agregarResultado("Lautaro Scocier", "2-1", "Ian Gangai", "DESEMPATE 16AVOS DE FINAL COPA TOTAL T8");
agregarResultado("Ian Gangai", "1-2", "Lautaro Scocier", "DESEMPATE 16AVOS DE FINAL COPA TOTAL T8");
agregarResultado("Mario Talarico", "3-4", "Nico Luchetti (R)", "OCTAVOS DE FINAL COPA TOTAL T8");
agregarResultado("Nico Luchetti (R)", "4-3", "Mario Talarico", "OCTAVOS DE FINAL COPA TOTAL T8");
agregarResultado("Nahuel Scocier", "3-4", "Alexis Segovia", "OCTAVOS DE FINAL COPA TOTAL T8");
agregarResultado("Alexis Segovia", "4-3", "Nahuel Scocier", "OCTAVOS DE FINAL COPA TOTAL T8");
agregarResultado("Tomas Delgado", "5-4", "Eze", "OCTAVOS DE FINAL COPA TOTAL T8");
agregarResultado("Eze", "4-5", "Tomas Delgado", "OCTAVOS DE FINAL COPA TOTAL T8");
agregarResultado("Nico Avalos", "8-6", "Martin Bustos", "OCTAVOS DE FINAL COPA TOTAL T8");
agregarResultado("Martin Bustos", "6-8", "Nico Avalos", "OCTAVOS DE FINAL COPA TOTAL T8");
agregarResultado("Lautaro Scocier", "5-6", "Santi", "OCTAVOS DE FINAL COPA TOTAL T8");
agregarResultado("Santi", "6-5", "Lautaro Scocier", "OCTAVOS DE FINAL COPA TOTAL T8");
agregarResultado("Matheo Olivera", "6-2", "Valentina Scocier", "OCTAVOS DE FINAL COPA TOTAL T8");
agregarResultado("Valentina Scocier", "2-6", "Matheo Olivera", "OCTAVOS DE FINAL COPA TOTAL T8");
agregarResultado("Rodrigo Talarico", "6-6", "Anubis", "OCTAVOS DE FINAL COPA TOTAL T8");
agregarResultado("Anubis", "6-6", "Rodrigo Talarico", "OCTAVOS DE FINAL COPA TOTAL T8");
agregarResultado("Ramiro Vita", "5-2", "Rodrigo Soca", "OCTAVOS DE FINAL COPA TOTAL T8");
agregarResultado("Rodrigo Soca", "2-5", "Ramiro Vita", "OCTAVOS DE FINAL COPA TOTAL T8");
agregarResultado("Rodrigo Talarico", "5-3", "Anubis", "DESEMPATE OCTAVOS DE FINAL COPA TOTAL T8");
agregarResultado("Anubis", "3-5", "Rodrigo Talarico", "DESEMPATE OCTAVOS DE FINAL COPA TOTAL T8");
agregarResultado("Nico Luchetti (R)", "8-6", "Alexis Segovia", "CUARTOS DE FINAL COPA TOTAL T8");
agregarResultado("Alexis Segovia", "6-8", "Nico Luchetti (R)", "CUARTOS DE FINAL COPA TOTAL T8");
agregarResultado("Tomas Delgado", "7-11", "Nico Avalos", "CUARTOS DE FINAL COPA TOTAL T8");
agregarResultado("Nico Avalos", "11-7", "Tomas Delgado", "CUARTOS DE FINAL COPA TOTAL T8");
agregarResultado("Santi", "7-8", "Matheo Olivera", "CUARTOS DE FINAL COPA TOTAL T8");
agregarResultado("Matheo Olivera", "8-7", "Santi", "CUARTOS DE FINAL COPA TOTAL T8");
agregarResultado("Rodrigo Talarico", "13-11", "Ramiro Vita", "CUARTOS DE FINAL COPA TOTAL T8");
agregarResultado("Ramiro Vita", "11-13", "Rodrigo Talarico", "CUARTOS DE FINAL COPA TOTAL T8");
agregarResultado("Nico Luchetti", "4-7", "Nico Avalos", "SEMIFINAL COPA TOTAL T8");
agregarResultado("Nico Avalos", "7-4", "Nico Luchetti", "SEMIFINAL COPA TOTAL T8");
agregarResultado("Matheo Olivera", "8-6", "Rodrigo Talarico", "SEMIFINAL COPA TOTAL T8");
agregarResultado("Rodrigo Talarico", "6-8", "Matheo Olivera", "SEMIFINAL COPA TOTAL T8");
agregarResultado("Nico Avalos", "4-6", "Matheo Olivera", "FINAL COPA TOTAL T8");
agregarResultado("Matheo Olivera", "6-4", "Nico Avalos", "FINAL COPA TOTAL T8");
agregarResultado("Pancho Muzzio", "9-7", "Nico Avalos", "32AVOS DE FINAL COPA CAMPEONES T8");
agregarResultado("Nico Avalos", "7-9", "Pancho Muzzio", "32AVOS DE FINAL COPA CAMPEONES T8");
agregarResultado("Nahuel Scocier", "10-7", "Gabriel Talarico", "32AVOS DE FINAL COPA CAMPEONES T8");
agregarResultado("Gabriel Talarico", "7-10", "Nahuel Scocier", "32AVOS DE FINAL COPA CAMPEONES T8");
agregarResultado("Pancho Muzzio", "5-8", "Nahuel Scocier", "16AVOS DE FINAL COPA CAMPEONES T8");
agregarResultado("Nahuel Scocier", "8-5", "Pancho Muzzio", "16AVOS DE FINAL COPA CAMPEONES T8");
agregarResultado("Nahuel Scocier", "3-6", "Rodrigo Talarico", "OCTAVOS DE FINAL COPA CAMPEONES T8");
agregarResultado("Rodrigo Talarico", "6-3", "Nahuel Scocier", "OCTAVOS DE FINAL COPA CAMPEONES T8");
agregarResultado("Mario Talarico", "3-2", "Rodrigo Soca", "OCTAVOS DE FINAL COPA CAMPEONES T8");
agregarResultado("Rodrigo Soca", "2-3", "Mario Talarico", "OCTAVOS DE FINAL COPA CAMPEONES T8");
agregarResultado("Matias Diaz", "6-6", "Matheo Olivera", "OCTAVOS DE FINAL COPA CAMPEONES T8");
agregarResultado("Matheo Olivera", "6-6", "Matias Diaz", "OCTAVOS DE FINAL COPA CAMPEONES T8");
agregarResultado("Matias Diaz", "1-2", "Matheo Olivera", "DESEMPATE CUARTOS DE FINAL COPA CAMPEONES T8");
agregarResultado("Matheo Olivera", "2-1", "Matias Diaz", "DESEMPATE CUARTOS DE FINAL COPA CAMPEONES T8");
agregarResultado("Rodrigo Talarico", "13-5", "Mario Talarico", "CUARTOS DE FINAL COPA CAMPEONES T8");
agregarResultado("Mario Talarico", "5-13", "Rodrigo Talarico", "CUARTOS DE FINAL COPA CAMPEONES T8");
agregarResultado("Rodrigo Talarico", "6-13", "Tomas Delgado", "SEMIFINAL COPA CAMPEONES T8");
agregarResultado("Tomas Delgado", "13-6", "Rodrigo Talarico", "SEMIFINAL COPA CAMPEONES T8");
agregarResultado("Matheo Olivera", "8-8", "Fabrizio Escolano", "SEMIFINAL COPA CAMPEONES T8");
agregarResultado("Fabrizio Escolano", "8-8", "Matheo Olivera", "SEMIFINAL COPA CAMPEONES T8");
agregarResultado("Matheo Olivera", "8-7", "Fabrizio Escolano", "DESEMPATE SEMIFINAL COPA CAMPEONES T8");
agregarResultado("Fabrizio Escolano", "7-8", "Matheo Olivera", "DESEMPATE SEMIFINAL COPA CAMPEONES T8");
agregarResultado("Tomas Delgado", "9-6", "Matheo Olivera", "FINAL COPA CAMPEONES T8");
agregarResultado("Matheo Olivera", "6-9", "Tomas Delgado", "FINAL COPA CAMPEONES T8");
agregarResultado("Rodrigo Talarico", "11-15", "Gabriel Talarico", "FINAL COPA DUOS T8");
agregarResultado("Gabriel Talarico", "15-11", "Rodrigo Talarico", "FINAL COPA DUOS T8");
agregarResultado("Ian Gangai", "11-15", "Nacho Soto", "FINAL COPA DUOS T8");
agregarResultado("Nacho Soto", "15-11", "Ian Gangai", "FINAL COPA DUOS T8");
agregarResultado("Rodrigo Talarico", "11-15", "Nacho Soto", "FINAL COPA DUOS T8");
agregarResultado("Nacho Soto", "15-11", "Rodrigo Talarico", "FINAL COPA DUOS T8");
agregarResultado("Ian Gangai", "11-15", "Gabriel Talarico", "FINAL COPA DUOS T8");
agregarResultado("Gabriel Talarico", "15-11", "Ian Gangai", "FINAL COPA DUOS T8");
agregarResultado("Gabriel Talarico", "7-3", "Ramiro Vita", "DESEMPATE 6TO PUESTO LIGA A T8");
agregarResultado("Ramiro Vita", "3-7", "Gabriel Talarico", "DESEMPATE 6TO PUESTO LIGA A T8");
agregarResultado("Matias Diaz", "10-8", "Lucas Insua", "DESEMPATE POR ASCENSO LIGA B T8");
agregarResultado("Lucas Insua", "8-10", "Matias Diaz", "DESEMPATE POR ASCENSO LIGA B T8");
agregarResultado("Bruno Alonso", "12-13", "Antonella Lopez", "PROMOCION T8");
agregarResultado("Antonella Lopez", "13-12", "Bruno Alonso", "PROMOCION T8");
agregarResultado("Tomas Gonzalez", "10-4", "Martin Bustos", "PROMOCION T8");
agregarResultado("Martin Bustos", "4-10", "Tomas Gonzalez", "PROMOCION T8");
agregarResultado("Rodrigo Soca", "6-5", "Lucas Insua", "PROMOCION T8");
agregarResultado("Lucas Insua", "5-6", "Rodrigo Soca", "PROMOCION T8");
agregarResultado("Matias Diaz", "7-4", "Santi", "PLAY OFFS POR EL ASCENSO T8");
agregarResultado("Santi", "4-7", "Matias Diaz", "PLAY OFFS POR EL ASCENSO T8");
agregarResultado("Benja", "4-6", "Antonella Lopez", "PLAY OFFS POR EL ASCENSO T8");
agregarResultado("Antonella Lopez", "6-4", "Benja", "PLAY OFFS POR EL ASCENSO T8");
agregarResultado("Lucas Insua", "8-6", "Luciano Hufschmid", "PLAY OFFS POR EL ASCENSO T8");
agregarResultado("Luciano Hufschmid", "6-8", "Lucas Insua", "PLAY OFFS POR EL ASCENSO T8");
agregarResultado("Tomas Torcasio", "4-2", "Martin Bustos", "PLAY OFFS POR EL ASCENSO T8");
agregarResultado("Martin Bustos", "2-4", "Tomas Torcasio", "PLAY OFFS POR EL ASCENSO T8");
agregarResultado("Santi", "15-14", "Benja", "PERDEDORES CUARTOS PLAY OFF T8");
agregarResultado("Benja", "14-15", "Santi", "PERDEDORES CUARTOS PLAY OFF T8");
agregarResultado("Luciano Hufschmid", "7-8", "Martin Bustos", "PERDEDORES CUARTOS PLAY OFF T8");
agregarResultado("Martin Bustos", "8-7", "Luciano Hufschmid", "PERDEDORES CUARTOS PLAY OFF T8");
agregarResultado("Matias Diaz", "10-4", "Antonella Lopez", "SEMIFINAL PLAY OFF T8");
agregarResultado("Antonella Lopez", "4-10", "Matias Diaz", "SEMIFINAL PLAY OFF T8");
agregarResultado("Lucas Insua", "11-6", "Tomas Torcasio", "SEMIFINAL PLAY OFF T8");
agregarResultado("Tomas Torcasio", "6-11", "Lucas Insua", "SEMIFINAL PLAY OFF T8");
agregarResultado("Santi", "5-0", "Antonella Lopez", "PARTIDO POR PROMOCION T8");
agregarResultado("Antonella Lopez", "0-5", "Santi", "PARTIDO POR PROMOCION T8");
agregarResultado("Martin Bustos", "5-4", "Tomas Torcasio", "PARTIDO POR PROMOCION T8");
agregarResultado("Tomas Torcasio", "4-5", "Martin Bustos", "PARTIDO POR PROMOCION T8");
agregarResultado("Matias Diaz", "6-6", "Lucas Insua", "PARTIDO POR ASCENSO T8");
agregarResultado("Lucas Insua", "6-6", "Matias Diaz", "PARTIDO POR ASCENSO T8");
agregarResultado("Santi", "15-14", "Benja", "DESEMPATE T8");
agregarResultado("Benja", "14-15", "Santi", "DESEMPATE T8");
agregarResultado("Matias Diaz", "4-2", "Lucas Insua", "DESEMPATE POR ASCENSO LIGA B T8");
agregarResultado("Lucas Insua", "2-4", "Matias Diaz", "DESEMPATE POR ASCENSO LIGA B T8");
agregarResultado("Mario Talarico", "10-3", "Lautaro Scocier", "CUARTOS DE FINAL COPA A T9");
agregarResultado("Lautaro Scocier", "3-10", "Mario Talarico", "CUARTOS DE FINAL COPA A T9");
agregarResultado("Nico Avalos", "7-4", "Ian Gangai", "CUARTOS DE FINAL COPA A T9");
agregarResultado("Ian Gangai", "4-7", "Nico Avalos", "CUARTOS DE FINAL COPA A T9");
agregarResultado("Rodrigo Soca", "9-8", "Fabrizio Escolano", "CUARTOS DE FINAL COPA A T9");
agregarResultado("Fabrizio Escolano", "8-9", "Rodrigo Soca", "CUARTOS DE FINAL COPA A T9");
agregarResultado("Matheo Olivera", "9-7", "Tomas Gonzalez", "CUARTOS DE FINAL COPA A T9");
agregarResultado("Tomas Gonzalez", "7-9", "Matheo Olivera", "CUARTOS DE FINAL COPA A T9");
agregarResultado("Mario Talarico", "4-6", "Rodrigo Soca", "SEMIFINAL COPA A T9");
agregarResultado("Rodrigo Soca", "6-4", "Mario Talarico", "SEMIFINAL COPA A T9");
agregarResultado("Nico Avalos", "10-8", "Matheo Olivera", "SEMIFINAL COPA A T9");
agregarResultado("Matheo Olivera", "8-10", "Nico Avalos", "SEMIFINAL COPA A T9");
agregarResultado("Rodrigo Soca", "7-6", "Nico Avalos", "FINAL COPA A T9");
agregarResultado("Nico Avalos", "6-7", "Rodrigo Soca", "FINAL COPA A T9");
agregarResultado("Rodri Sebastian", "4-10", "Martin Bustos", "OCTAVOS DE FINAL COPA B T9");
agregarResultado("Martin Bustos", "10-4", "Rodri Sebastian", "OCTAVOS DE FINAL COPA B T9");
agregarResultado("Eze", "6-8", "Lucas Insua", "OCTAVOS DE FINAL COPA B T9");
agregarResultado("Lucas Insua", "8-6", "Eze", "OCTAVOS DE FINAL COPA B T9");
agregarResultado("Nico Luchetti (R)", "9-9", "Valentina Scocier", "OCTAVOS DE FINAL COPA B T9");
agregarResultado("Valentina Scocier", "9-9", "Nico Luchetti (R)", "OCTAVOS DE FINAL COPA B T9");
agregarResultado("Alexis Segovia", "11-8", "Bruno Alonso", "OCTAVOS DE FINAL COPA B T9");
agregarResultado("Bruno Alonso", "8-11", "Alexis Segovia", "OCTAVOS DE FINAL COPA B T9");
agregarResultado("Nico Luchetti (R)", "2-4", "Valentina Scocier", "DESEMPATE OCTAVOS DE FINAL COPA B T9");
agregarResultado("Valentina Scocier", "4-2", "Nico Luchetti (R)", "DESEMPATE OCTAVOS DE FINAL COPA B T9");
agregarResultado("Natanael", "5-9", "Alexis Segovia", "CUARTOS DE FINAL COPA B T9");
agregarResultado("Alexis Segovia", "9-5", "Natanael", "CUARTOS DE FINAL COPA B T9");
agregarResultado("Kevin Sivori", "5-8", "Lucas Insua", "CUARTOS DE FINAL COPA B T9");
agregarResultado("Lucas Insua", "8-5", "Kevin Sivori", "CUARTOS DE FINAL COPA B T9");
agregarResultado("Dani Bazan", "7-4", "Martin Bustos", "CUARTOS DE FINAL COPA B T9");
agregarResultado("Martin Bustos", "4-7", "Dani Bazan", "CUARTOS DE FINAL COPA B T9");
agregarResultado("Anubis", "5-7", "Valentina Scocier", "CUARTOS DE FINAL COPA B T9");
agregarResultado("Valentina Scocier", "7-5", "Anubis", "CUARTOS DE FINAL COPA B T9");
agregarResultado("Valentina Scocier", "7-6", "Dani Bazan", "SEMIFINAL COPA B T9");
agregarResultado("Dani Bazan", "6-7", "Valentina Scocier", "SEMIFINAL COPA B T9");
agregarResultado("Alexis Segovia", "6-8", "Lucas Insua", "SEMIFINAL COPA B T9");
agregarResultado("Lucas Insua", "8-6", "Alexis Segovia", "SEMIFINAL COPA B T9");
agregarResultado("Valentina Scocier", "8-3", "Lucas Insua", "FINAL COPA B T9");
agregarResultado("Lucas Insua", "3-8", "Valentina Scocier", "FINAL COPA B T9");
agregarResultado("Tomas Gonzalez", "8-10", "Facu Montes", "32AVOS DE FINAL COPA TOTAL T9");
agregarResultado("Facu Montes", "10-8", "Tomas Gonzalez", "32AVOS DE FINAL COPA TOTAL T9");
agregarResultado("Natanael", "12-11", "Renzo Badano", "32AVOS DE FINAL COPA TOTAL T9");
agregarResultado("Renzo Badano", "11-12", "Natanael", "32AVOS DE FINAL COPA TOTAL T9");
agregarResultado("Martin Bustos", "10-12", "Alexis Segovia", "32AVOS DE FINAL COPA TOTAL T9");
agregarResultado("Alexis Segovia", "12-10", "Martin Bustos", "32AVOS DE FINAL COPA TOTAL T9");
agregarResultado("Tomas Delgado", "12-9", "Antonella Lopez", "32AVOS DE FINAL COPA TOTAL T9");
agregarResultado("Antonella Lopez", "9-12", "Tomas Delgado", "32AVOS DE FINAL COPA TOTAL T9");
agregarResultado("Bruno Alonso", "9-7", "Facundo Marchese", "32AVOS DE FINAL COPA TOTAL T9");
agregarResultado("Facundo Marchese", "7-9", "Bruno Alonso", "32AVOS DE FINAL COPA TOTAL T9");
agregarResultado("Moreno Perez", "14-10", "Dani Bazan", "32AVOS DE FINAL COPA TOTAL T9");
agregarResultado("Dani Bazan", "10-14", "Moreno Perez", "32AVOS DE FINAL COPA TOTAL T9");
agregarResultado("Joaco Fernandez", "10-6", "Kraiizer", "32AVOS DE FINAL COPA TOTAL T9");
agregarResultado("Kraiizer", "6-10", "Joaco Fernandez", "32AVOS DE FINAL COPA TOTAL T9");
agregarResultado("Ian Gangai", "12-8", "Lucas Aguilera", "32AVOS DE FINAL COPA TOTAL T9");
agregarResultado("Lucas Aguilera", "8-12", "Ian Gangai", "32AVOS DE FINAL COPA TOTAL T9");
agregarResultado("Matias Diaz", "7-6", "Joaquin Sampadaro", "32AVOS DE FINAL COPA TOTAL T9");
agregarResultado("Joaquin Sampadaro", "6-7", "Matias Diaz", "32AVOS DE FINAL COPA TOTAL T9");
agregarResultado("Valentina Scocier", "6-7", "Gonzalo Nuñez", "32AVOS DE FINAL COPA TOTAL T9");
agregarResultado("Gonzalo Nuñez", "7-6", "Valentina Scocier", "32AVOS DE FINAL COPA TOTAL T9");
agregarResultado("Lucas Insua", "10-13", "Nacho Soto", "32AVOS DE FINAL COPA TOTAL T9");
agregarResultado("Nacho Soto", "13-10", "Lucas Insua", "32AVOS DE FINAL COPA TOTAL T9");
agregarResultado("Matias Varela", "5-10", "Joel Alcalde", "32AVOS DE FINAL COPA TOTAL T9");
agregarResultado("Joel Alcalde", "10-5", "Matias Varela", "32AVOS DE FINAL COPA TOTAL T9");
agregarResultado("Ramiro Vita", "9-10", "Tomas Torcasio", "32AVOS DE FINAL COPA TOTAL T9");
agregarResultado("Tomas Torcasio", "10-9", "Ramiro Vita", "32AVOS DE FINAL COPA TOTAL T9");
agregarResultado("Rodrigo Soca", "11-7", "Benja", "32AVOS DE FINAL COPA TOTAL T9");
agregarResultado("Benja", "7-11", "Rodrigo Soca", "32AVOS DE FINAL COPA TOTAL T9");
agregarResultado("Rodrigo Talarico", "7-8", "Facu Montes", "16AVOS DE FINAL COPA TOTAL T9");
agregarResultado("Facu Montes", "8-7", "Rodrigo Talarico", "16AVOS DE FINAL COPA TOTAL T9");
agregarResultado("Fabrizio Escolano", "8-10", "Santi", "16AVOS DE FINAL COPA TOTAL T9");
agregarResultado("Santi", "10-8", "Fabrizio Escolano", "16AVOS DE FINAL COPA TOTAL T9");
agregarResultado("Kevin Sivori", "11-10", "Natanael", "16AVOS DE FINAL COPA TOTAL T9");
agregarResultado("Natanael", "10-11", "Kevin Sivori", "16AVOS DE FINAL COPA TOTAL T9");
agregarResultado("Pancho Muzzio", "7-8", "Alexis Segovia", "16AVOS DE FINAL COPA TOTAL T9");
agregarResultado("Alexis Segovia", "8-7", "Pancho Muzzio", "16AVOS DE FINAL COPA TOTAL T9");
agregarResultado("Gabriel Talarico", "10-12", "Tomas Delgado", "16AVOS DE FINAL COPA TOTAL T9");
agregarResultado("Tomas Delgado", "12-10", "Gabriel Talarico", "16AVOS DE FINAL COPA TOTAL T9");
agregarResultado("Luciano Hufschmid", "7-10", "Bruno Alonso", "16AVOS DE FINAL COPA TOTAL T9");
agregarResultado("Bruno Alonso", "10-7", "Luciano Hufschmid", "16AVOS DE FINAL COPA TOTAL T9");
agregarResultado("Nahuel Scocier", "9-14", "Moreno Perez", "16AVOS DE FINAL COPA TOTAL T9");
agregarResultado("Moreno Perez", "14-9", "Nahuel Scocier", "16AVOS DE FINAL COPA TOTAL T9");
agregarResultado("Jhose", "10-6", "Joaco Fernandez", "16AVOS DE FINAL COPA TOTAL T9");
agregarResultado("Joaco Fernandez", "6-10", "Jhose", "16AVOS DE FINAL COPA TOTAL T9");
agregarResultado("Lautaro Scocier", "13-22", "Ian Gangai", "16AVOS DE FINAL COPA TOTAL T9");
agregarResultado("Ian Gangai", "22-13", "Lautaro Scocier", "16AVOS DE FINAL COPA TOTAL T9");
agregarResultado("Anubis", "9-10", "Nico Luchetti (R)", "16AVOS DE FINAL COPA TOTAL T9");
agregarResultado("Nico Luchetti (R)", "10-9", "Anubis", "16AVOS DE FINAL COPA TOTAL T9");
agregarResultado("Matheo Olivera", "17-8", "Matias Diaz", "16AVOS DE FINAL COPA TOTAL T9");
agregarResultado("Matias Diaz", "8-17", "Matheo Olivera", "16AVOS DE FINAL COPA TOTAL T9");
agregarResultado("Rodri Sebastian", "10-9", "Gonzalo Nuñez", "16AVOS DE FINAL COPA TOTAL T9");
agregarResultado("Gonzalo Nuñez", "9-10", "Rodri Sebastian", "16AVOS DE FINAL COPA TOTAL T9");
agregarResultado("Mario Talarico", "18-5", "Nacho Soto", "16AVOS DE FINAL COPA TOTAL T9");
agregarResultado("Nacho Soto", "5-18", "Mario Talarico", "16AVOS DE FINAL COPA TOTAL T9");
agregarResultado("Eze", "9-11", "Joel Alcalde", "16AVOS DE FINAL COPA TOTAL T9");
agregarResultado("Joel Alcalde", "11-9", "Eze", "16AVOS DE FINAL COPA TOTAL T9");
agregarResultado("Nico Avalos", "11-7", "Tomas Torcasio", "16AVOS DE FINAL COPA TOTAL T9");
agregarResultado("Tomas Torcasio", "7-11", "Nico Avalos", "16AVOS DE FINAL COPA TOTAL T9");
agregarResultado("Joel Marasco", "6-14", "Rodrigo Soca", "16AVOS DE FINAL COPA TOTAL T9");
agregarResultado("Rodrigo Soca", "14-6", "Joel Marasco", "16AVOS DE FINAL COPA TOTAL T9");
agregarResultado("Facu Montes", "13-4", "Santi", "OCTAVOS DE FINAL COPA TOTAL T9");
agregarResultado("Santi", "4-13", "Facu Montes", "OCTAVOS DE FINAL COPA TOTAL T9");
agregarResultado("Kevin Sivori", "8-11", "Alexis Segovia", "OCTAVOS DE FINAL COPA TOTAL T9");
agregarResultado("Alexis Segovia", "11-8", "Kevin Sivori", "OCTAVOS DE FINAL COPA TOTAL T9");
agregarResultado("Tomas Delgado", "4-8", "Bruno Alonso", "OCTAVOS DE FINAL COPA TOTAL T9");
agregarResultado("Bruno Alonso", "8-4", "Tomas Delgado", "OCTAVOS DE FINAL COPA TOTAL T9");
agregarResultado("Moreno Perez", "6-3", "Jhose", "OCTAVOS DE FINAL COPA TOTAL T9");
agregarResultado("Jhose", "3-6", "Moreno Perez", "OCTAVOS DE FINAL COPA TOTAL T9");
agregarResultado("Ian Gangai", "2-9", "Nico Luchetti (R)", "OCTAVOS DE FINAL COPA TOTAL T9");
agregarResultado("Nico Luchetti (R)", "9-2", "Ian Gangai", "OCTAVOS DE FINAL COPA TOTAL T9");
agregarResultado("Matheo Olivera", "10-4", "Rodri Sebastian", "OCTAVOS DE FINAL COPA TOTAL T9");
agregarResultado("Rodri Sebastian", "4-10", "Matheo Olivera", "OCTAVOS DE FINAL COPA TOTAL T9");
agregarResultado("Mario Talarico", "10-4", "Joel Alcalde", "OCTAVOS DE FINAL COPA TOTAL T9");
agregarResultado("Joel Alcalde", "4-10", "Mario Talarico", "OCTAVOS DE FINAL COPA TOTAL T9");
agregarResultado("Nico Avalos", "11-9", "Rodrigo Soca", "OCTAVOS DE FINAL COPA TOTAL T9");
agregarResultado("Rodrigo Soca", "9-11", "Nico Avalos", "OCTAVOS DE FINAL COPA TOTAL T9");
agregarResultado("Facu Montes", "0-9", "Alexis Segovia", "CUARTOS DE FINAL COPA TOTAL T9");
agregarResultado("Alexis Segovia", "9-0", "Facu Montes", "CUARTOS DE FINAL COPA TOTAL T9");
agregarResultado("Bruno Alonso", "4-7", "Moreno Perez", "CUARTOS DE FINAL COPA TOTAL T9");
agregarResultado("Moreno Perez", "7-4", "Bruno Alonso", "CUARTOS DE FINAL COPA TOTAL T9");
agregarResultado("Nico Luchetti (R)", "5-9", "Matheo Olivera", "CUARTOS DE FINAL COPA TOTAL T9");
agregarResultado("Matheo Olivera", "9-5", "Nico Luchetti (R)", "CUARTOS DE FINAL COPA TOTAL T9");
agregarResultado("Mario Talarico", "10-7", "Nico Avalos", "CUARTOS DE FINAL COPA TOTAL T9");
agregarResultado("Nico Avalos", "7-10", "Mario Talarico", "CUARTOS DE FINAL COPA TOTAL T9");
agregarResultado("Alexis Segovia", "5-7", "Moreno Perez", "SEMIFINAL COPA TOTAL T9");
agregarResultado("Moreno Perez", "7-5", "Alexis Segovia", "SEMIFINAL COPA TOTAL T9");
agregarResultado("Matheo Olivera", "8-4", "Mario Talarico", "SEMIFINAL COPA TOTAL T9");
agregarResultado("Mario Talarico", "4-8", "Matheo Olivera", "SEMIFINAL COPA TOTAL T9");
agregarResultado("Moreno Perez", "11-6", "Matheo Olivera", "FINAL COPA TOTAL T9");
agregarResultado("Matheo Olivera", "6-11", "Moreno Perez", "FINAL COPA TOTAL T9");
agregarResultado("Tomas Delgado", "12-9", "Ramiro Vita", "32AVOS DE FINAL COPA CAMPEONES T9");
agregarResultado("Ramiro Vita", "9-12", "Tomas Delgado", "32AVOS DE FINAL COPA CAMPEONES T9");
agregarResultado("Nico Avalos", "13-12", "Fabrizio Escolano", "32AVOS DE FINAL COPA CAMPEONES T9");
agregarResultado("Fabrizio Escolano", "12-13", "Nico Avalos", "32AVOS DE FINAL COPA CAMPEONES T9");
agregarResultado("Nico Avalos", "11-12", "Tomas Delgado", "16AVOS DE FINAL COPA CAMPEONES T9");
agregarResultado("Tomas Delgado", "12-11", "Nico Avalos", "16AVOS DE FINAL COPA CAMPEONES T9");
agregarResultado("Tomas Delgado", "4-4", "Santi", "OCTAVOS DE FINAL COPA CAMPEONES T9");
agregarResultado("Santi", "4-4", "Tomas Delgado", "OCTAVOS DE FINAL COPA CAMPEONES T9");
agregarResultado("Matias Diaz ", "10-7", "Lautaro Scocier", "OCTAVOS DE FINAL COPA CAMPEONES T9");
agregarResultado("Lautaro Scocier", "7-10", "Matias Diaz ", "OCTAVOS DE FINAL COPA CAMPEONES T9");
agregarResultado("Gabriel Talarico", "9-10", "Nacho Soto", "OCTAVOS DE FINAL COPA CAMPEONES T9");
agregarResultado("Nacho Soto", "10-9", "Gabriel Talarico", "OCTAVOS DE FINAL COPA CAMPEONES T9");
agregarResultado("Tomas Delgado", "1-0", "Santi", "DESEMPATE OCTAVOS DE FINAL COPA CAMPEONES T9");
agregarResultado("Santi", "0-1", "Tomas Delgado", "DESEMPATE OCTAVOS DE FINAL COPA CAMPEONES T9");
agregarResultado("Tomas Delgado", "2-6", "Matias Diaz", "CUARTOS DE FINAL COPA CAMPEONES T9");
agregarResultado("Matias Diaz", "6-2", "Tomas Delgado", "CUARTOS DE FINAL COPA CAMPEONES T9");
agregarResultado("Nacho Soto", "5-6", "Pancho Muzzio", "CUARTOS DE FINAL COPA CAMPEONES T9");
agregarResultado("Pancho Muzzio", "6-5", "Nacho Soto", "CUARTOS DE FINAL COPA CAMPEONES T9");
agregarResultado("Matias Diaz", "4-8", "Matheo Olivera", "SEMIFINAL COPA CAMPEONES T9");
agregarResultado("Matheo Olivera", "8-4", "Matias Diaz", "SEMIFINAL COPA CAMPEONES T9");
agregarResultado("Pancho Muzzio", "7-4", "Mario Talarico", "SEMIFINAL COPA CAMPEONES T9");
agregarResultado("Mario Talarico", "4-7", "Pancho Muzzio", "SEMIFINAL COPA CAMPEONES T9");
agregarResultado("Matheo Olivera", "6-5", "Pancho Muzzio", "FINAL COPA CAMPEONES T9");
agregarResultado("Pancho Muzzio", "5-6", "Matheo Olivera", "FINAL COPA CAMPEONES T9");
agregarResultado("Bruno Alonso", "15-16", "Kevin Sivori", "FINAL COPA DUOS T9");
agregarResultado("Kevin Sivori", "16-15", "Bruno Alonso", "FINAL COPA DUOS T9");
agregarResultado("Nico Avalos", "15-16", "Matheo Olivera", "FINAL COPA DUOS T9");
agregarResultado("Matheo Olivera", "16-15", "Nico Avalos", "FINAL COPA DUOS T9");
agregarResultado("Bruno Alonso", "15-16", "Matheo Olivera", "FINAL COPA DUOS T9");
agregarResultado("Matheo Olivera", "16-15", "Bruno Alonso", "FINAL COPA DUOS T9");
agregarResultado("Nico Avalos", "15-16", "Kevin Sivori", "FINAL COPA DUOS T9");
agregarResultado("Kevin Sivori", "16-15", "Nico Avalos", "FINAL COPA DUOS T9");
agregarResultado("Mario Talarico", "6-9", "Natanael", "PROMOCION T9");
agregarResultado("Natanael", "9-6", "Mario Talarico", "PROMOCION T9");
agregarResultado("Tomas Gonzalez", "6-15", "Lucas Aguilera", "PROMOCION T9");
agregarResultado("Lucas Aguilera", "15-6", "Tomas Gonzalez", "PROMOCION T9");
agregarResultado("Joel Marasco", "7-8", "Gonzalo Nuñez", "PROMOCION T9");
agregarResultado("Gonzalo Nuñez", "8-7", "Joel Marasco", "PROMOCION T9");
agregarResultado("Gabriel Talarico", "5-10", "Fabrizio Escolano", "COPA CLASICO T9");
agregarResultado("Fabrizio Escolano", "10-5", "Gabriel Talarico", "COPA CLASICO T9");
agregarResultado("Valentina Scocier", "8-7", "Kevin Sivori", "PLAY OFFS ASCENSO T9");
agregarResultado("Kevin Sivori", "7-8", "Valentina Scocier", "PLAY OFFS ASCENSO T9");
agregarResultado("Nacho Soto", "6-5", "Martin Bustos", "PLAY OFFS ASCENSO T9");
agregarResultado("Martin Bustos", "5-6", "Nacho Soto", "PLAY OFFS ASCENSO T9");
agregarResultado("Lucas Insua", "7-6", "Benja", "PLAY OFFS ASCENSO T9");
agregarResultado("Benja", "6-7", "Lucas Insua", "PLAY OFFS ASCENSO T9");
agregarResultado("Luciano Hufschmid", "9-13", "Lucas Aguilera", "PLAY OFFS ASCENSO T9");
agregarResultado("Lucas Aguilera", "13-9", "Luciano Hufschmid", "PLAY OFFS ASCENSO T9");
agregarResultado("Valentina Scocier", "7-4", "Nacho Soto", "PLAY OFFS ASCENSO T9");
agregarResultado("Nacho Soto", "4-7", "Valentina Scocier", "PLAY OFFS ASCENSO T9");
agregarResultado("Lucas Insua", "7-5", "Lucas Aguilera", "PLAY OFFS ASCENSO T9");
agregarResultado("Lucas Aguilera", "5-7", "Lucas Insua", "PLAY OFFS ASCENSO T9");
agregarResultado("Valentina Scocier", "6-7", "Lucas Insua", "FINAL POR ASCENSO T9");
agregarResultado("Lucas Insua", "7-6", "Valentina Scocier", "FINAL POR ASCENSO T9");
agregarResultado("Felipe Galante", "3-3", "Alexis Segovia", "CUARTOS DE FINAL ZONA ORO QATAR 2022");
agregarResultado("Alexis Segovia", "3-3", "Felipe Galante", "CUARTOS DE FINAL ZONA ORO QATAR 2022");
agregarResultado("Facundo Marchese", "3-2", "Kraiizer", "CUARTOS DE FINAL ZONA ORO QATAR 2022");
agregarResultado("Kraiizer", "2-3", "Facundo Marchese", "CUARTOS DE FINAL ZONA ORO QATAR 2022");
agregarResultado("Fabrizio Escolano", "4-3", "Matheo Olivera", "CUARTOS DE FINAL ZONA ORO QATAR 2022");
agregarResultado("Matheo Olivera", "3-4", "Fabrizio Escolano", "CUARTOS DE FINAL ZONA ORO QATAR 2022");
agregarResultado("Jhose", "2-2", "Rodri Sebastian", "CUARTOS DE FINAL ZONA ORO QATAR 2022");
agregarResultado("Rodri Sebastian", "2-2", "Jhose", "CUARTOS DE FINAL ZONA ORO QATAR 2022");
agregarResultado("Joel Marasco", "3-5", "Tomas Delgado", "CUARTOS DE FINAL ZONA PLATA QATAR 2022");
agregarResultado("Tomas Delgado", "5-3", "Joel Marasco", "CUARTOS DE FINAL ZONA PLATA QATAR 2022");
agregarResultado("Martin Bustos", "3-2", "Mariano Gallucci", "CUARTOS DE FINAL ZONA PLATA QATAR 2022");
agregarResultado("Bruno Alonso", "6-3", "Santi", "CUARTOS DE FINAL ZONA PLATA QATAR 2022");
agregarResultado("Santi", "3-6", "Bruno Alonso", "CUARTOS DE FINAL ZONA PLATA QATAR 2022");
agregarResultado("Lautaro Scocier", "5-3", "Luciano Hufschmid", "CUARTOS DE FINAL ZONA PLATA QATAR 2022");
agregarResultado("Luciano Hufschmid", "3-5", "Lautaro Scocier", "CUARTOS DE FINAL ZONA PLATA QATAR 2022");
agregarResultado("Joaquin Sampadaro", "2-3", "Gonzalo Nuñez", "CUARTOS DE FINAL ZONA BRONCE QATAR 2022");
agregarResultado("Gonzalo Nuñez", "3-2", "Joaquin Sampadaro", "CUARTOS DE FINAL ZONA BRONCE QATAR 2022");
agregarResultado("Ignacio Cejas", "4-2", "Valentina Scocier", "CUARTOS DE FINAL ZONA BRONCE QATAR 2022");
agregarResultado("Valentina Scocier", "2-4", "Ignacio Cejas", "CUARTOS DE FINAL ZONA BRONCE QATAR 2022");
agregarResultado("Nahuel Scocier", "6-6", "Bautista Coria", "CUARTOS DE FINAL ZONA BRONCE QATAR 2022");
agregarResultado("Bautista Coria", "6-6", "Nahuel Scocier", "CUARTOS DE FINAL ZONA BRONCE QATAR 2022");
agregarResultado("Tomas Gonzalez", "2-6", "Ian Gangai", "CUARTOS DE FINAL ZONA BRONCE QATAR 2022");
agregarResultado("Ian Gangai", "6-2", "Tomas Gonzalez", "CUARTOS DE FINAL ZONA BRONCE QATAR 2022");
agregarResultado("Felipe Galante", "2-2", "Facundo Marchese", "SEMIFINAL ZONA ORO QATAR 2022");
agregarResultado("Facundo Marchese", "2-2", "Felipe Galante", "SEMIFINAL ZONA ORO QATAR 2022");
agregarResultado("Fabrizio Escolano", "2-2", "Jhose", "SEMIFINAL ZONA ORO QATAR 2022");
agregarResultado("Jhose", "2-2", "Fabrizio Escolano", "SEMIFINAL ZONA ORO QATAR 2022");
agregarResultado("Tomas Delgado", "2-1", "Martin Bustos", "SEMIFINAL ZONA PLATA QATAR 2022");
agregarResultado("Martin Bustos", "1-2", "Tomas Delgado", "SEMIFINAL ZONA PLATA QATAR 2022");
agregarResultado("Bruno Alonso", "2-1", "Lautaro Scocier", "SEMIFINAL ZONA PLATA QATAR 2022");
agregarResultado("Lautaro Scocier", "1-2", "Bruno Alonso", "SEMIFINAL ZONA PLATA QATAR 2022");
agregarResultado("Gonzalo Nuñez", "2-2", "Ignacio Cejas", "SEMIFINAL ZONA BRONCE QATAR 2022");
agregarResultado("Ignacio Cejas", "2-2", "Gonzalo Nuñez", "SEMIFINAL ZONA BRONCE QATAR 2022");
agregarResultado("Bautista Coria", "2-1", "Ian Gangai", "SEMIFINAL ZONA BRONCE QATAR 2022");
agregarResultado("Ian Gangai", "1-2", "Bautista Coria", "SEMIFINAL ZONA BRONCE QATAR 2022");
agregarResultado("Felipe Galante", "8-6", "Jhose", "FINAL ZONA ORO QATAR 2022");
agregarResultado("Jhose", "6-8", "Felipe Galante", "FINAL ZONA ORO QATAR 2022");
agregarResultado("Facundo Marchese", "2-4", "Fabrizio Escolano", "3ER PUESTO ZONA ORO QATAR 2022");
agregarResultado("Fabrizio Escolano", "4-2", "Facundo Marchese", "3ER PUESTO ZONA ORO QATAR 2022");
agregarResultado("Tomas Delgado", "3-4", "Bruno Alonso", "FINAL ZONA PLATA QATAR 2022");
agregarResultado("Bruno Alonso", "4-3", "Tomas Delgado", "FINAL ZONA PLATA QATAR 2022");
agregarResultado("Lautaro Scocier", "3-4", "Martin Bustos", "3ER PUESTO ZONA PLATA QATAR 2022");
agregarResultado("Martin Bustos", "4-3", "Lautaro Scocier", "3ER PUESTO ZONA PLATA QATAR 2022");
agregarResultado("Gonzalo Nuñez", "4-3", "Bautista Coria", "FINAL ZONA BRONCE QATAR 2022");
agregarResultado("Bautista Coria", "3-4", "Gonzalo Nuñez", "FINAL ZONA BRONCE QATAR 2022");
agregarResultado("Ignacio Cejas", "0-3", "Ian Gangai", "3ER PUESTO ZONA BRONCE QATAR 2022");
agregarResultado("Ian Gangai", "3-0", "Ignacio Cejas", "3ER PUESTO ZONA BRONCE QATAR 2022");
agregarResultado("Lautaro Scocier", "8-7", "Natanael", "OCTAVOS DE FINAL COPA A T11");
agregarResultado("Natanael", "7-8", "Lautaro Scocier", "OCTAVOS DE FINAL COPA A T11");
agregarResultado("Moreno Perez", "19-3", "Gonzalo Nuñez", "OCTAVOS DE FINAL COPA A T11");
agregarResultado("Gonzalo Nuñez", "3-19", "Moreno Perez", "OCTAVOS DE FINAL COPA A T11");
agregarResultado("Valentina Scocier", "7-11", "Rodrigo Talarico", "OCTAVOS DE FINAL COPA A T11");
agregarResultado("Rodrigo Talarico", "11-7", "Valentina Scocier", "OCTAVOS DE FINAL COPA A T11");
agregarResultado("Lucas Aguilera", "13-7", "Lucas Insua", "OCTAVOS DE FINAL COPA A T11");
agregarResultado("Lucas Insua", "7-13", "Lucas Aguilera", "OCTAVOS DE FINAL COPA A T11");
agregarResultado("Lucas Aguilera", "13-10", "Matheo Olivera", "CUARTOS DE FINAL COPA A T11");
agregarResultado("Matheo Olivera", "10-13", "Lucas Aguilera", "CUARTOS DE FINAL COPA A T11");
agregarResultado("Lautaro Scocier", "12-11", "Ian Gangai", "CUARTOS DE FINAL COPA A T11");
agregarResultado("Ian Gangai", "11-12", "Lautaro Scocier", "CUARTOS DE FINAL COPA A T11");
agregarResultado("Moreno Perez", "9-13", "Nico Avalos", "CUARTOS DE FINAL COPA A T11");
agregarResultado("Nico Avalos", "13-9", "Moreno Perez", "CUARTOS DE FINAL COPA A T11");
agregarResultado("Rodrigo Talarico", "10-5", "Rodrigo Soca", "CUARTOS DE FINAL COPA A T11");
agregarResultado("Rodrigo Soca", "5-10", "Rodrigo Talarico", "CUARTOS DE FINAL COPA A T11");
agregarResultado("Rodrigo Talarico", "7-12", "Nico Avalos", "SEMIFINAL COPA A T11");
agregarResultado("Nico Avalos", "12-7", "Rodrigo Talarico", "SEMIFINAL COPA A T11");
agregarResultado("Lucas Aguilera", "13-7", "Lautaro Scocier", "SEMIFINAL COPA A T11");
agregarResultado("Lautaro Scocier", "7-13", "Lucas Aguilera", "SEMIFINAL COPA A T11");
agregarResultado("Nico Avalos", "7-9", "Lucas Aguilera", "FINAL COPA A T11");
agregarResultado("Lucas Aguilera", "9-7", "Nico Avalos", "FINAL COPA A T11");
agregarResultado("Kevin Sivori", "10-12", "Joaquin Sampadaro", "OCTAVOS DE FINAL COPA B T11");
agregarResultado("Joaquin Sampadaro", "12-10", "Kevin Sivori", "OCTAVOS DE FINAL COPA B T11");
agregarResultado("Eze", "9-7", "Nacho Soto", "OCTAVOS DE FINAL COPA B T11");
agregarResultado("Nacho Soto", "7-9", "Eze", "OCTAVOS DE FINAL COPA B T11");
agregarResultado("Alexis Segovia", "4-8", "Luciano Hufschmid", "OCTAVOS DE FINAL COPA B T11");
agregarResultado("Luciano Hufschmid", "8-4", "Alexis Segovia", "OCTAVOS DE FINAL COPA B T11");
agregarResultado("Tomas Torcasio", "9-8", "Bruno Alonso", "OCTAVOS DE FINAL COPA B T11");
agregarResultado("Bruno Alonso", "8-9", "Tomas Torcasio", "OCTAVOS DE FINAL COPA B T11");
agregarResultado("Joaquin Sampadaro", "9-10", "Martin Bustos", "CUARTOS DE FINAL COPA B T11");
agregarResultado("Martin Bustos", "10-9", "Joaquin Sampadaro", "CUARTOS DE FINAL COPA B T11");
agregarResultado("Eze", "10-5", "Santi", "CUARTOS DE FINAL COPA B T11");
agregarResultado("Santi", "5-10", "Eze", "CUARTOS DE FINAL COPA B T11");
agregarResultado("Tomas Torcasio", "6-11", "Joel Marasco", "CUARTOS DE FINAL COPA B T11");
agregarResultado("Joel Marasco", "11-6", "Tomas Torcasio", "CUARTOS DE FINAL COPA B T11");
agregarResultado("Luciano Hufschmid", "15-6", "Tomas Delgado", "CUARTOS DE FINAL COPA B T11");
agregarResultado("Tomas Delgado", "6-15", "Luciano Hufschmid", "CUARTOS DE FINAL COPA B T11");
agregarResultado("Luciano Hufschmid", "10-12", "Martin Bustos", "SEMIFINAL COPA B T11");
agregarResultado("Martin Bustos", "12-10", "Luciano Hufschmid", "SEMIFINAL COPA B T11");
agregarResultado("Eze", "6-9", "Joel Marasco", "SEMIFINAL COPA B T11");
agregarResultado("Joel Marasco", "9-6", "Eze", "SEMIFINAL COPA B T11");
agregarResultado("Martin Bustos", "5-7", "Joel Marasco", "FINAL COPA B T11");
agregarResultado("Joel Marasco", "7-5", "Martin Bustos", "FINAL COPA B T11");
agregarResultado("Leandro Montes", "5-10", "Joel Alcalde", "OCTAVOS DE FINAL COPA C T11");
agregarResultado("Joel Alcalde", "10-5", "Leandro Montes", "OCTAVOS DE FINAL COPA C T11");
agregarResultado("Jhose", "8-4", "Azul Quispe", "OCTAVOS DE FINAL COPA C T11");
agregarResultado("Azul Quispe", "4-8", "Jhose", "OCTAVOS DE FINAL COPA C T11");
agregarResultado("Bautista Coria", "7-6", "Rodri Sebastian", "OCTAVOS DE FINAL COPA C T11");
agregarResultado("Rodri Sebastian", "6-7", "Bautista Coria", "OCTAVOS DE FINAL COPA C T11");
agregarResultado("Renzo Badano", "7-9", "Felipe Galante", "OCTAVOS DE FINAL COPA C T11");
agregarResultado("Felipe Galante", "9-7", "Renzo Badano", "OCTAVOS DE FINAL COPA C T11");
agregarResultado("Matias Varela", "2-4", "Fede Salatino", "OCTAVOS DE FINAL COPA C T11");
agregarResultado("Fede Salatino", "4-2", "Matias Varela", "OCTAVOS DE FINAL COPA C T11");
agregarResultado("Franco Przepiorka", "18-4", "Anubis", "OCTAVOS DE FINAL COPA C T11");
agregarResultado("Anubis", "4-18", "Franco Przepiorka", "OCTAVOS DE FINAL COPA C T11");
agregarResultado("Ignacio Cejas", "10-2", "Nico Luchetti (R)", "OCTAVOS DE FINAL COPA C T11");
agregarResultado("Nico Luchetti (R)", "2-10", "Ignacio Cejas", "OCTAVOS DE FINAL COPA C T11");
agregarResultado("Kraiizer", "0-6", "Axel", "OCTAVOS DE FINAL COPA C T11");
agregarResultado("Axel", "6-0", "Kraiizer", "OCTAVOS DE FINAL COPA C T11");
agregarResultado("Felipe Galante", "9-10", "Joel Alcalde", "CUARTOS DE FINAL COPA C T11");
agregarResultado("Joel Alcalde", "10-9", "Felipe Galante", "CUARTOS DE FINAL COPA C T11");
agregarResultado("Jhose", "7-6", "Ignacio Cejas", "CUARTOS DE FINAL COPA C T11");
agregarResultado("Ignacio Cejas", "6-7", "Jhose", "CUARTOS DE FINAL COPA C T11");
agregarResultado("Bautista Coria", "7-7", "Axel", "CUARTOS DE FINAL COPA C T11");
agregarResultado("Axel", "7-7", "Bautista Coria", "CUARTOS DE FINAL COPA C T11");
agregarResultado("Fede Salatino", "10-7", "Franco Przepiorka", "CUARTOS DE FINAL COPA C T11");
agregarResultado("Franco Przepiorka", "7-10", "Fede Salatino", "CUARTOS DE FINAL COPA C T11");
agregarResultado("Bautista Coria", "1-4", "Axel", "DESEMPATE CUARTOS DE FINAL COPA C T11");
agregarResultado("Axel", "4-1", "Bautista Coria", "DESEMPATE CUARTOS DE FINAL COPA C T11");
agregarResultado("Axel", "10-9", "Jhose", "SEMIFINAL COPA C T11");
agregarResultado("Jhose", "9-10", "Axel", "SEMIFINAL COPA C T11");
agregarResultado("Fede Salatino", "4-7", "Joel Alcalde", "SEMIFINAL COPA C T11");
agregarResultado("Joel Alcalde", "7-4", "Fede Salatino", "SEMIFINAL COPA C T11");
agregarResultado("Axel", "8-6", "Joel Alcalde", "FINAL COPA C T11");
agregarResultado("Joel Alcalde", "6-8", "Axel", "FINAL COPA C T11");
agregarResultado("Azul Quispe", "1-2", "Moreno Perez", "FASE DE GRUPOS COPA TOTAL T11");
agregarResultado("Moreno Perez", "2-1", "Azul Quispe", "FASE DE GRUPOS COPA TOTAL T11");
agregarResultado("Antonella Lopez", "0-0", "Santi", "FASE DE GRUPOS COPA TOTAL T11");
agregarResultado("Santi", "0-0", "Antonella Lopez", "FASE DE GRUPOS COPA TOTAL T11");
agregarResultado("Natanael", "0-4", "Martin Bustos", "FASE DE GRUPOS COPA TOTAL T11");
agregarResultado("Martin Bustos", "4-0", "Natanael", "FASE DE GRUPOS COPA TOTAL T11");
agregarResultado("Franco Przepiorka", "0-0", "Pancho Muzzio", "FASE DE GRUPOS COPA TOTAL T11");
agregarResultado("Pancho Muzzio", "0-0", "Franco Przepiorka", "FASE DE GRUPOS COPA TOTAL T11");
agregarResultado("Axel", "0-0", "Nahuel Scocier", "FASE DE GRUPOS COPA TOTAL T11");
agregarResultado("Nahuel Scocier", "0-0", "Axel", "FASE DE GRUPOS COPA TOTAL T11");
agregarResultado("Luciano Hufschmid", "2-1", "Lucas Insua", "FASE DE GRUPOS COPA TOTAL T11");
agregarResultado("Lucas Insua", "1-2", "Luciano Hufschmid", "FASE DE GRUPOS COPA TOTAL T11");
agregarResultado("Bautista Coria", "1-4", "Tomas Delgado", "FASE DE GRUPOS COPA TOTAL T11");
agregarResultado("Tomas Delgado", "4-1", "Bautista Coria", "FASE DE GRUPOS COPA TOTAL T11");
agregarResultado("Kraiizer", "0-0", "Mario Talarico", "FASE DE GRUPOS COPA TOTAL T11");
agregarResultado("Mario Talarico", "0-0", "Kraiizer", "FASE DE GRUPOS COPA TOTAL T11");
agregarResultado("Tomas Gonzalez", "4-1", "Rodri Sebastian", "FASE DE GRUPOS COPA TOTAL T11");
agregarResultado("Rodri Sebastian", "1-4", "Tomas Gonzalez", "FASE DE GRUPOS COPA TOTAL T11");
agregarResultado("Nicolas Lucero", "0-1", "Matheo Olivera", "FASE DE GRUPOS COPA TOTAL T11");
agregarResultado("Matheo Olivera", "1-0", "Nicolas Lucero", "FASE DE GRUPOS COPA TOTAL T11");
agregarResultado("Joel Alcalde", "0-1", "Rodrigo Soca", "FASE DE GRUPOS COPA TOTAL T11");
agregarResultado("Rodrigo Soca", "1-0", "Joel Alcalde", "FASE DE GRUPOS COPA TOTAL T11");
agregarResultado("Tomas Torcasio", "1-2", "Benja", "FASE DE GRUPOS COPA TOTAL T11");
agregarResultado("Benja", "2-1", "Tomas Torcasio", "FASE DE GRUPOS COPA TOTAL T11");
agregarResultado("Leandro Montes", "0-4", "Ian Gangai", "FASE DE GRUPOS COPA TOTAL T11");
agregarResultado("Ian Gangai", "4-0", "Leandro Montes", "FASE DE GRUPOS COPA TOTAL T11");
agregarResultado("Matias Varela", "1-0", "Nacho Soto", "FASE DE GRUPOS COPA TOTAL T11");
agregarResultado("Nacho Soto", "0-1", "Matias Varela", "FASE DE GRUPOS COPA TOTAL T11");
agregarResultado("Renzo Badano", "0-3", "Lucas Aguilera", "FASE DE GRUPOS COPA TOTAL T11");
agregarResultado("Lucas Aguilera", "3-0", "Renzo Badano", "FASE DE GRUPOS COPA TOTAL T11");
agregarResultado("Nicolas Borea", "0-1", "Fabrizio Escolano", "FASE DE GRUPOS COPA TOTAL T11");
agregarResultado("Fabrizio Escolano", "1-0", "Nicolas Borea", "FASE DE GRUPOS COPA TOTAL T11");
agregarResultado("Facundo Marchese", "2-1", "Alexis Segovia", "FASE DE GRUPOS COPA TOTAL T11");
agregarResultado("Alexis Segovia", "1-2", "Facundo Marchese", "FASE DE GRUPOS COPA TOTAL T11");
agregarResultado("Gonzalo Nuñez", "2-0", "Anubis", "FASE DE GRUPOS COPA TOTAL T11");
agregarResultado("Anubis", "0-2", "Gonzalo Nuñez", "FASE DE GRUPOS COPA TOTAL T11");
agregarResultado("Mariano Gallucci", "1-0", "Rodrigo Talarico", "FASE DE GRUPOS COPA TOTAL T11");
agregarResultado("Rodrigo Talarico", "0-1", "Mariano Gallucci", "FASE DE GRUPOS COPA TOTAL T11");
agregarResultado("Felipe Galante", "0-1", "Gabriel Talarico", "FASE DE GRUPOS COPA TOTAL T11");
agregarResultado("Gabriel Talarico", "1-0", "Felipe Galante", "FASE DE GRUPOS COPA TOTAL T11");
agregarResultado("Kevin Sivori", "2-1", "Valentina Scocier", "FASE DE GRUPOS COPA TOTAL T11");
agregarResultado("Valentina Scocier", "1-2", "Kevin Sivori", "FASE DE GRUPOS COPA TOTAL T11");
agregarResultado("Fede Salatino", "0-2", "Nico Avalos", "FASE DE GRUPOS COPA TOTAL T11");
agregarResultado("Nico Avalos", "2-0", "Fede Salatino", "FASE DE GRUPOS COPA TOTAL T11");
agregarResultado("Jhose", "2-4", "Bruno Alonso", "FASE DE GRUPOS COPA TOTAL T11");
agregarResultado("Bruno Alonso", "4-2", "Jhose", "FASE DE GRUPOS COPA TOTAL T11");
agregarResultado("Nico Luchetti (R)", "0-0", "Joel Marasco", "FASE DE GRUPOS COPA TOTAL T11");
agregarResultado("Joel Marasco", "0-0", "Nico Luchetti (R)", "FASE DE GRUPOS COPA TOTAL T11");
agregarResultado("Ignacio Cejas", "2-2", "Ramiro Vita", "FASE DE GRUPOS COPA TOTAL T11");
agregarResultado("Ramiro Vita", "2-2", "Ignacio Cejas", "FASE DE GRUPOS COPA TOTAL T11");
agregarResultado("Joaquin Sampadaro", "1-1", "Lautaro Scocier", "FASE DE GRUPOS COPA TOTAL T11");
agregarResultado("Lautaro Scocier", "1-1", "Joaquin Sampadaro", "FASE DE GRUPOS COPA TOTAL T11");
agregarResultado("Dani Bazan", "0-2", "Eze", "FASE DE GRUPOS COPA TOTAL T11");
agregarResultado("Eze", "2-0", "Dani Bazan", "FASE DE GRUPOS COPA TOTAL T11");
agregarResultado("Natanael", "1-1", "Moreno Perez", "FASE DE GRUPOS COPA TOTAL T11");
agregarResultado("Moreno Perez", "1-1", "Natanael", "FASE DE GRUPOS COPA TOTAL T11");
agregarResultado("Martin Bustos", "2-2", "Antonella Lopez", "FASE DE GRUPOS COPA TOTAL T11");
agregarResultado("Antonella Lopez", "2-2", "Martin Bustos", "FASE DE GRUPOS COPA TOTAL T11");
agregarResultado("Santi", "1-4", "Azul Quispe", "FASE DE GRUPOS COPA TOTAL T11");
agregarResultado("Azul Quispe", "4-1", "Santi", "FASE DE GRUPOS COPA TOTAL T11");
agregarResultado("Luciano Hufschmid", "3-3", "Pancho Muzzio", "FASE DE GRUPOS COPA TOTAL T11");
agregarResultado("Pancho Muzzio", "3-3", "Luciano Hufschmid", "FASE DE GRUPOS COPA TOTAL T11");
agregarResultado("Lucas Insua", "1-1", "Axel", "FASE DE GRUPOS COPA TOTAL T11");
agregarResultado("Axel", "1-1", "Lucas Insua", "FASE DE GRUPOS COPA TOTAL T11");
agregarResultado("Nahuel Scocier", "1-2", "Franco Przepiorka", "FASE DE GRUPOS COPA TOTAL T11");
agregarResultado("Franco Przepiorka", "2-1", "Nahuel Scocier", "FASE DE GRUPOS COPA TOTAL T11");
agregarResultado("Tomas Gonzalez", "0-2", "Tomas Delgado", "FASE DE GRUPOS COPA TOTAL T11");
agregarResultado("Tomas Delgado", "2-0", "Tomas Gonzalez", "FASE DE GRUPOS COPA TOTAL T11");
agregarResultado("Rodri Sebastian", "2-0", "Kraiizer", "FASE DE GRUPOS COPA TOTAL T11");
agregarResultado("Kraiizer", "0-2", "Rodri Sebastian", "FASE DE GRUPOS COPA TOTAL T11");
agregarResultado("Mario Talarico", "2-2", "Bautista Coria", "FASE DE GRUPOS COPA TOTAL T11");
agregarResultado("Bautista Coria", "2-2", "Mario Talarico", "FASE DE GRUPOS COPA TOTAL T11");
agregarResultado("Tomas Torcasio", "4-6", "Matheo Olivera", "FASE DE GRUPOS COPA TOTAL T11");
agregarResultado("Matheo Olivera", "6-4", "Tomas Torcasio", "FASE DE GRUPOS COPA TOTAL T11");
agregarResultado("Benja", "0-3", "Joel Alcalde", "FASE DE GRUPOS COPA TOTAL T11");
agregarResultado("Joel Alcalde", "3-0", "Benja", "FASE DE GRUPOS COPA TOTAL T11");
agregarResultado("Rodrigo Soca", "7-0", "Nicolas Lucero", "FASE DE GRUPOS COPA TOTAL T11");
agregarResultado("Nicolas Lucero", "0-7", "Rodrigo Soca", "FASE DE GRUPOS COPA TOTAL T11");
agregarResultado("Renzo Badano", "4-5", "Ian Gangai", "FASE DE GRUPOS COPA TOTAL T11");
agregarResultado("Ian Gangai", "5-4", "Renzo Badano", "FASE DE GRUPOS COPA TOTAL T11");
agregarResultado("Lucas Aguilera", "3-1", "Matias Varela", "FASE DE GRUPOS COPA TOTAL T11");
agregarResultado("Matias Varela", "1-3", "Lucas Aguilera", "FASE DE GRUPOS COPA TOTAL T11");
agregarResultado("Nacho Soto", "2-3", "Leandro Montes", "FASE DE GRUPOS COPA TOTAL T11");
agregarResultado("Leandro Montes", "3-2", "Nacho Soto", "FASE DE GRUPOS COPA TOTAL T11");
agregarResultado("Gonzalo Nuñez", "1-4", "Fabrizio Escolano", "FASE DE GRUPOS COPA TOTAL T11");
agregarResultado("Fabrizio Escolano", "4-1", "Gonzalo Nuñez", "FASE DE GRUPOS COPA TOTAL T11");
agregarResultado("Anubis", "1-2", "Facundo Marchese", "FASE DE GRUPOS COPA TOTAL T11");
agregarResultado("Facundo Marchese", "2-1", "Anubis", "FASE DE GRUPOS COPA TOTAL T11");
agregarResultado("Alexis Segovia", "1-0", "Nicolas Borea", "FASE DE GRUPOS COPA TOTAL T11");
agregarResultado("Nicolas Borea", "0-1", "Alexis Segovia", "FASE DE GRUPOS COPA TOTAL T11");
agregarResultado("Kevin Sivori", "2-2", "Rodrigo Talarico", "FASE DE GRUPOS COPA TOTAL T11");
agregarResultado("Rodrigo Talarico", "2-2", "Kevin Sivori", "FASE DE GRUPOS COPA TOTAL T11");
agregarResultado("Valentina Scocier", "2-1", "Felipe Galante", "FASE DE GRUPOS COPA TOTAL T11");
agregarResultado("Felipe Galante", "1-2", "Valentina Scocier", "FASE DE GRUPOS COPA TOTAL T11");
agregarResultado("Gabriel Talarico", "4-0", "Mariano Gallucci", "FASE DE GRUPOS COPA TOTAL T11");
agregarResultado("Mariano Gallucci", "0-4", "Gabriel Talarico", "FASE DE GRUPOS COPA TOTAL T11");
agregarResultado("Nico Luchetti (R)", "3-3", "Nico Avalos", "FASE DE GRUPOS COPA TOTAL T11");
agregarResultado("Nico Avalos", "3-3", "Nico Luchetti (R)", "FASE DE GRUPOS COPA TOTAL T11");
agregarResultado("Joel Marasco", "7-1", "Jhose", "FASE DE GRUPOS COPA TOTAL T11");
agregarResultado("Jhose", "1-7", "Joel Marasco", "FASE DE GRUPOS COPA TOTAL T11");
agregarResultado("Bruno Alonso", "1-3", "Fede Salatino", "FASE DE GRUPOS COPA TOTAL T11");
agregarResultado("Fede Salatino", "3-1", "Bruno Alonso", "FASE DE GRUPOS COPA TOTAL T11");
agregarResultado("Dani Bazan", "2-3", "Ramiro Vita", "FASE DE GRUPOS COPA TOTAL T11");
agregarResultado("Ramiro Vita", "3-2", "Dani Bazan", "FASE DE GRUPOS COPA TOTAL T11");
agregarResultado("Eze", "2-5", "Joaquin Sampadaro", "FASE DE GRUPOS COPA TOTAL T11");
agregarResultado("Joaquin Sampadaro", "5-2", "Eze", "FASE DE GRUPOS COPA TOTAL T11");
agregarResultado("Lautaro Scocier", "2-5", "Ignacio Cejas", "FASE DE GRUPOS COPA TOTAL T11");
agregarResultado("Ignacio Cejas", "5-2", "Lautaro Scocier", "FASE DE GRUPOS COPA TOTAL T11");
agregarResultado("Santi", "4-4", "Moreno Perez", "FASE DE GRUPOS COPA TOTAL T11");
agregarResultado("Moreno Perez", "4-4", "Santi", "FASE DE GRUPOS COPA TOTAL T11");
agregarResultado("Azul Quispe", "3-5", "Martin Bustos", "FASE DE GRUPOS COPA TOTAL T11");
agregarResultado("Martin Bustos", "5-3", "Azul Quispe", "FASE DE GRUPOS COPA TOTAL T11");
agregarResultado("Antonella Lopez", "0-7", "Natanael", "FASE DE GRUPOS COPA TOTAL T11");
agregarResultado("Natanael", "7-0", "Antonella Lopez", "FASE DE GRUPOS COPA TOTAL T11");
agregarResultado("Nahuel Scocier", "1-3", "Pancho Muzzio", "FASE DE GRUPOS COPA TOTAL T11");
agregarResultado("Pancho Muzzio", "3-1", "Nahuel Scocier", "FASE DE GRUPOS COPA TOTAL T11");
agregarResultado("Franco Przepiorka", "0-1", "Lucas Insua", "FASE DE GRUPOS COPA TOTAL T11");
agregarResultado("Lucas Insua", "1-0", "Franco Przepiorka", "FASE DE GRUPOS COPA TOTAL T11");
agregarResultado("Axel", "2-2", "Luciano Hufschmid", "FASE DE GRUPOS COPA TOTAL T11");
agregarResultado("Luciano Hufschmid", "2-2", "Axel", "FASE DE GRUPOS COPA TOTAL T11");
agregarResultado("Mario Talarico", "3-8", "Tomas Delgado", "FASE DE GRUPOS COPA TOTAL T11");
agregarResultado("Tomas Delgado", "8-3", "Mario Talarico", "FASE DE GRUPOS COPA TOTAL T11");
agregarResultado("Bautista Coria", "4-7", "Rodri Sebastian", "FASE DE GRUPOS COPA TOTAL T11");
agregarResultado("Rodri Sebastian", "7-4", "Bautista Coria", "FASE DE GRUPOS COPA TOTAL T11");
agregarResultado("Kraiizer", "2-4", "Tomas Gonzalez", "FASE DE GRUPOS COPA TOTAL T11");
agregarResultado("Tomas Gonzalez", "4-2", "Kraiizer", "FASE DE GRUPOS COPA TOTAL T11");
agregarResultado("Rodrigo Soca", "4-5", "Matheo Olivera", "FASE DE GRUPOS COPA TOTAL T11");
agregarResultado("Matheo Olivera", "5-4", "Rodrigo Soca", "FASE DE GRUPOS COPA TOTAL T11");
agregarResultado("Nicolas Lucero", "5-0", "Benja", "FASE DE GRUPOS COPA TOTAL T11");
agregarResultado("Benja", "0-5", "Nicolas Lucero", "FASE DE GRUPOS COPA TOTAL T11");
agregarResultado("Joel Alcalde", "0-5", "Tomas Torcasio", "FASE DE GRUPOS COPA TOTAL T11");
agregarResultado("Tomas Torcasio", "5-0", "Joel Alcalde", "FASE DE GRUPOS COPA TOTAL T11");
agregarResultado("Nacho Soto", "4-4", "Ian Gangai", "FASE DE GRUPOS COPA TOTAL T11");
agregarResultado("Ian Gangai", "4-4", "Nacho Soto", "FASE DE GRUPOS COPA TOTAL T11");
agregarResultado("Leandro Montes", "8-5", "Lucas Aguilera", "FASE DE GRUPOS COPA TOTAL T11");
agregarResultado("Lucas Aguilera", "5-8", "Leandro Montes", "FASE DE GRUPOS COPA TOTAL T11");
agregarResultado("Matias Varela", "7-0", "Renzo Badano", "FASE DE GRUPOS COPA TOTAL T11");
agregarResultado("Renzo Badano", "0-7", "Matias Varela", "FASE DE GRUPOS COPA TOTAL T11");
agregarResultado("Alexis Segovia", "7-5", "Fabrizio Escolano", "FASE DE GRUPOS COPA TOTAL T11");
agregarResultado("Fabrizio Escolano", "5-7", "Alexis Segovia", "FASE DE GRUPOS COPA TOTAL T11");
agregarResultado("Nicolas Borea", "0-3", "Anubis", "FASE DE GRUPOS COPA TOTAL T11");
agregarResultado("Anubis", "3-0", "Nicolas Borea", "FASE DE GRUPOS COPA TOTAL T11");
agregarResultado("Facundo Marchese", "6-5", "Gonzalo Nuñez", "FASE DE GRUPOS COPA TOTAL T11");
agregarResultado("Gonzalo Nuñez", "5-6", "Facundo Marchese", "FASE DE GRUPOS COPA TOTAL T11");
agregarResultado("Gabriel Talarico", "4-5", "Rodrigo Talarico", "FASE DE GRUPOS COPA TOTAL T11");
agregarResultado("Rodrigo Talarico", "5-4", "Gabriel Talarico", "FASE DE GRUPOS COPA TOTAL T11");
agregarResultado("Mariano Gallucci", "4-5", "Valentina Scocier", "FASE DE GRUPOS COPA TOTAL T11");
agregarResultado("Valentina Scocier", "5-4", "Mariano Gallucci", "FASE DE GRUPOS COPA TOTAL T11");
agregarResultado("Felipe Galante", "7-8", "Kevin Sivori", "FASE DE GRUPOS COPA TOTAL T11");
agregarResultado("Kevin Sivori", "8-7", "Felipe Galante", "FASE DE GRUPOS COPA TOTAL T11");
agregarResultado("Bruno Alonso", "4-6", "Nico Avalos", "FASE DE GRUPOS COPA TOTAL T11");
agregarResultado("Nico Avalos", "6-4", "Bruno Alonso", "FASE DE GRUPOS COPA TOTAL T11");
agregarResultado("Fede Salatino", "0-3", "Joel Marasco", "FASE DE GRUPOS COPA TOTAL T11");
agregarResultado("Joel Marasco", "3-0", "Fede Salatino", "FASE DE GRUPOS COPA TOTAL T11");
agregarResultado("Jhose", "5-3", "Nico Luchetti (R)", "FASE DE GRUPOS COPA TOTAL T11");
agregarResultado("Nico Luchetti (R)", "3-5", "Jhose", "FASE DE GRUPOS COPA TOTAL T11");
agregarResultado("Lautaro Scocier", "4-0", "Ramiro Vita", "FASE DE GRUPOS COPA TOTAL T11");
agregarResultado("Ramiro Vita", "0-4", "Lautaro Scocier", "FASE DE GRUPOS COPA TOTAL T11");
agregarResultado("Ignacio Cejas", "4-6", "Eze", "FASE DE GRUPOS COPA TOTAL T11");
agregarResultado("Eze", "6-4", "Ignacio Cejas", "FASE DE GRUPOS COPA TOTAL T11");
agregarResultado("Joaquin Sampadaro", "3-3", "Dani Bazan", "FASE DE GRUPOS COPA TOTAL T11");
agregarResultado("Dani Bazan", "3-3", "Joaquin Sampadaro", "FASE DE GRUPOS COPA TOTAL T11");
agregarResultado("Antonella Lopez", "1-2", "Moreno Perez", "FASE DE GRUPOS COPA TOTAL T11");
agregarResultado("Moreno Perez", "2-1", "Antonella Lopez", "FASE DE GRUPOS COPA TOTAL T11");
agregarResultado("Natanael", "4-10", "Azul Quispe", "FASE DE GRUPOS COPA TOTAL T11");
agregarResultado("Azul Quispe", "10-4", "Natanael", "FASE DE GRUPOS COPA TOTAL T11");
agregarResultado("Martin Bustos", "3-3", "Santi", "FASE DE GRUPOS COPA TOTAL T11");
agregarResultado("Santi", "3-3", "Martin Bustos", "FASE DE GRUPOS COPA TOTAL T11");
agregarResultado("Axel", "4-2", "Pancho Muzzio", "FASE DE GRUPOS COPA TOTAL T11");
agregarResultado("Pancho Muzzio", "2-4", "Axel", "FASE DE GRUPOS COPA TOTAL T11");
agregarResultado("Luciano Hufschmid", "2-2", "Franco Przepiorka", "FASE DE GRUPOS COPA TOTAL T11");
agregarResultado("Franco Przepiorka", "2-2", "Luciano Hufschmid", "FASE DE GRUPOS COPA TOTAL T11");
agregarResultado("Lucas Insua", "2-3", "Nahuel Scocier", "FASE DE GRUPOS COPA TOTAL T11");
agregarResultado("Nahuel Scocier", "3-2", "Lucas Insua", "FASE DE GRUPOS COPA TOTAL T11");
agregarResultado("Kraiizer", "0-2", "Tomas Delgado", "FASE DE GRUPOS COPA TOTAL T11");
agregarResultado("Tomas Delgado", "2-0", "Kraiizer", "FASE DE GRUPOS COPA TOTAL T11");
agregarResultado("Tomas Gonzalez", "0-5", "Bautista Coria", "FASE DE GRUPOS COPA TOTAL T11");
agregarResultado("Bautista Coria", "5-0", "Tomas Gonzalez", "FASE DE GRUPOS COPA TOTAL T11");
agregarResultado("Rodri Sebastian", "2-2", "Mario Talarico", "FASE DE GRUPOS COPA TOTAL T11");
agregarResultado("Mario Talarico", "2-2", "Rodri Sebastian", "FASE DE GRUPOS COPA TOTAL T11");
agregarResultado("Joel Alcalde", "2-2", "Matheo Olivera", "FASE DE GRUPOS COPA TOTAL T11");
agregarResultado("Matheo Olivera", "2-2", "Joel Alcalde", "FASE DE GRUPOS COPA TOTAL T11");
agregarResultado("Tomas Torcasio", "2-0", "Nicolas Lucero", "FASE DE GRUPOS COPA TOTAL T11");
agregarResultado("Nicolas Lucero", "0-2", "Tomas Torcasio", "FASE DE GRUPOS COPA TOTAL T11");
agregarResultado("Benja", "2-2", "Rodrigo Soca", "FASE DE GRUPOS COPA TOTAL T11");
agregarResultado("Rodrigo Soca", "2-2", "Benja", "FASE DE GRUPOS COPA TOTAL T11");
agregarResultado("Matias Varela", "2-4", "Ian Gangai", "FASE DE GRUPOS COPA TOTAL T11");
agregarResultado("Ian Gangai", "4-2", "Matias Varela", "FASE DE GRUPOS COPA TOTAL T11");
agregarResultado("Renzo Badano", "6-4", "Leandro Montes", "FASE DE GRUPOS COPA TOTAL T11");
agregarResultado("Leandro Montes", "4-6", "Renzo Badano", "FASE DE GRUPOS COPA TOTAL T11");
agregarResultado("Lucas Aguilera", "5-5", "Nacho Soto", "FASE DE GRUPOS COPA TOTAL T11");
agregarResultado("Nacho Soto", "5-5", "Lucas Aguilera", "FASE DE GRUPOS COPA TOTAL T11");
agregarResultado("Facundo Marchese", "2-2", "Fabrizio Escolano", "FASE DE GRUPOS COPA TOTAL T11");
agregarResultado("Fabrizio Escolano", "2-2", "Facundo Marchese", "FASE DE GRUPOS COPA TOTAL T11");
agregarResultado("Gonzalo Nuñez", "1-0", "Nicolas Borea", "FASE DE GRUPOS COPA TOTAL T11");
agregarResultado("Nicolas Borea", "0-1", "Gonzalo Nuñez", "FASE DE GRUPOS COPA TOTAL T11");
agregarResultado("Anubis", "4-0", "Alexis Segovia", "FASE DE GRUPOS COPA TOTAL T11");
agregarResultado("Alexis Segovia", "0-4", "Anubis", "FASE DE GRUPOS COPA TOTAL T11");
agregarResultado("Felipe Galante", "2-2", "Rodrigo Talarico", "FASE DE GRUPOS COPA TOTAL T11");
agregarResultado("Rodrigo Talarico", "2-2", "Felipe Galante", "FASE DE GRUPOS COPA TOTAL T11");
agregarResultado("Kevin Sivori", "2-0", "Mariano Gallucci", "FASE DE GRUPOS COPA TOTAL T11");
agregarResultado("Mariano Gallucci", "0-2", "Kevin Sivori", "FASE DE GRUPOS COPA TOTAL T11");
agregarResultado("Valentina Scocier", "3-2", "Gabriel Talarico", "FASE DE GRUPOS COPA TOTAL T11");
agregarResultado("Gabriel Talarico", "2-3", "Valentina Scocier", "FASE DE GRUPOS COPA TOTAL T11");
agregarResultado("Jhose", "3-2", "Nico Avalos", "FASE DE GRUPOS COPA TOTAL T11");
agregarResultado("Nico Avalos", "2-3", "Jhose", "FASE DE GRUPOS COPA TOTAL T11");
agregarResultado("Nico Luchetti (R)", "7-6", "Fede Salatino", "FASE DE GRUPOS COPA TOTAL T11");
agregarResultado("Fede Salatino", "6-7", "Nico Luchetti (R)", "FASE DE GRUPOS COPA TOTAL T11");
agregarResultado("Joel Marasco", "3-5", "Bruno Alonso", "FASE DE GRUPOS COPA TOTAL T11");
agregarResultado("Bruno Alonso", "5-3", "Joel Marasco", "FASE DE GRUPOS COPA TOTAL T11");
agregarResultado("Joaquin Sampadaro", "2-2", "Ramiro Vita", "FASE DE GRUPOS COPA TOTAL T11");
agregarResultado("Ramiro Vita", "2-2", "Joaquin Sampadaro", "FASE DE GRUPOS COPA TOTAL T11");
agregarResultado("Dani Bazan", "4-2", "Ignacio Cejas", "FASE DE GRUPOS COPA TOTAL T11");
agregarResultado("Ignacio Cejas", "2-4", "Dani Bazan", "FASE DE GRUPOS COPA TOTAL T11");
agregarResultado("Eze", "3-2", "Lautaro Scocier", "FASE DE GRUPOS COPA TOTAL T11");
agregarResultado("Lautaro Scocier", "2-3", "Eze", "FASE DE GRUPOS COPA TOTAL T11");
agregarResultado("Martin Bustos", "5-1", "Moreno Perez", "FASE DE GRUPOS COPA TOTAL T11");
agregarResultado("Moreno Perez", "1-5", "Martin Bustos", "FASE DE GRUPOS COPA TOTAL T11");
agregarResultado("Santi", "6-2", "Natanael", "FASE DE GRUPOS COPA TOTAL T11");
agregarResultado("Natanael", "2-6", "Santi", "FASE DE GRUPOS COPA TOTAL T11");
agregarResultado("Azul Quispe", "3-0", "Antonella Lopez", "FASE DE GRUPOS COPA TOTAL T11");
agregarResultado("Antonella Lopez", "0-3", "Azul Quispe", "FASE DE GRUPOS COPA TOTAL T11");
agregarResultado("Lucas Insua", "2-2", "Pancho Muzzio", "FASE DE GRUPOS COPA TOTAL T11");
agregarResultado("Pancho Muzzio", "2-2", "Lucas Insua", "FASE DE GRUPOS COPA TOTAL T11");
agregarResultado("Nahuel Scocier", "2-2", "Luciano Hufschmid", "FASE DE GRUPOS COPA TOTAL T11");
agregarResultado("Luciano Hufschmid", "2-2", "Nahuel Scocier", "FASE DE GRUPOS COPA TOTAL T11");
agregarResultado("Franco Przepiorka", "0-4", "Axel", "FASE DE GRUPOS COPA TOTAL T11");
agregarResultado("Axel", "4-0", "Franco Przepiorka", "FASE DE GRUPOS COPA TOTAL T11");
agregarResultado("Rodri Sebastian", "2-2", "Tomas Delgado", "FASE DE GRUPOS COPA TOTAL T11");
agregarResultado("Tomas Delgado", "2-2", "Rodri Sebastian", "FASE DE GRUPOS COPA TOTAL T11");
agregarResultado("Mario Talarico", "4-2", "Tomas Gonzalez", "FASE DE GRUPOS COPA TOTAL T11");
agregarResultado("Tomas Gonzalez", "2-4", "Mario Talarico", "FASE DE GRUPOS COPA TOTAL T11");
agregarResultado("Bautista Coria", "2-5", "Kraiizer", "FASE DE GRUPOS COPA TOTAL T11");
agregarResultado("Kraiizer", "5-2", "Bautista Coria", "FASE DE GRUPOS COPA TOTAL T11");
agregarResultado("Benja", "2-2", "Matheo Olivera", "FASE DE GRUPOS COPA TOTAL T11");
agregarResultado("Matheo Olivera", "2-2", "Benja", "FASE DE GRUPOS COPA TOTAL T11");
agregarResultado("Rodrigo Soca", "1-2", "Tomas Torcasio", "FASE DE GRUPOS COPA TOTAL T11");
agregarResultado("Tomas Torcasio", "2-1", "Rodrigo Soca", "FASE DE GRUPOS COPA TOTAL T11");
agregarResultado("Nicolas Lucero", "0-2", "Joel Alcalde", "FASE DE GRUPOS COPA TOTAL T11");
agregarResultado("Joel Alcalde", "2-0", "Nicolas Lucero", "FASE DE GRUPOS COPA TOTAL T11");
agregarResultado("Lucas Aguilera", "2-1", "Ian Gangai", "FASE DE GRUPOS COPA TOTAL T11");
agregarResultado("Ian Gangai", "1-2", "Lucas Aguilera", "FASE DE GRUPOS COPA TOTAL T11");
agregarResultado("Nacho Soto", "3-2", "Renzo Badano", "FASE DE GRUPOS COPA TOTAL T11");
agregarResultado("Renzo Badano", "2-3", "Nacho Soto", "FASE DE GRUPOS COPA TOTAL T11");
agregarResultado("Leandro Montes", "3-2", "Matias Varela", "FASE DE GRUPOS COPA TOTAL T11");
agregarResultado("Matias Varela", "2-3", "Leandro Montes", "FASE DE GRUPOS COPA TOTAL T11");
agregarResultado("Anubis", "4-1", "Fabrizio Escolano", "FASE DE GRUPOS COPA TOTAL T11");
agregarResultado("Fabrizio Escolano", "1-4", "Anubis", "FASE DE GRUPOS COPA TOTAL T11");
agregarResultado("Alexis Segovia", "2-3", "Gonzalo Nuñez", "FASE DE GRUPOS COPA TOTAL T11");
agregarResultado("Gonzalo Nuñez", "3-2", "Alexis Segovia", "FASE DE GRUPOS COPA TOTAL T11");
agregarResultado("Nicolas Borea", "0-2", "Facundo Marchese", "FASE DE GRUPOS COPA TOTAL T11");
agregarResultado("Facundo Marchese", "2-0", "Nicolas Borea", "FASE DE GRUPOS COPA TOTAL T11");
agregarResultado("Valentina Scocier", "3-0", "Rodrigo Talarico", "FASE DE GRUPOS COPA TOTAL T11");
agregarResultado("Rodrigo Talarico", "0-3", "Valentina Scocier", "FASE DE GRUPOS COPA TOTAL T11");
agregarResultado("Gabriel Talarico", "2-2", "Kevin Sivori", "FASE DE GRUPOS COPA TOTAL T11");
agregarResultado("Kevin Sivori", "2-2", "Gabriel Talarico", "FASE DE GRUPOS COPA TOTAL T11");
agregarResultado("Mariano Gallucci", "1-2", "Felipe Galante", "FASE DE GRUPOS COPA TOTAL T11");
agregarResultado("Felipe Galante", "2-1", "Mariano Gallucci", "FASE DE GRUPOS COPA TOTAL T11");
agregarResultado("Joel Marasco", "2-3", "Nico Avalos", "FASE DE GRUPOS COPA TOTAL T11");
agregarResultado("Nico Avalos", "3-2", "Joel Marasco", "FASE DE GRUPOS COPA TOTAL T11");
agregarResultado("Bruno Alonso", "1-2", "Nico Luchetti (R)", "FASE DE GRUPOS COPA TOTAL T11");
agregarResultado("Nico Luchetti (R)", "2-1", "Bruno Alonso", "FASE DE GRUPOS COPA TOTAL T11");
agregarResultado("Fede Salatino", "1-1", "Jhose", "FASE DE GRUPOS COPA TOTAL T11");
agregarResultado("Jhose", "1-1", "Fede Salatino", "FASE DE GRUPOS COPA TOTAL T11");
agregarResultado("Eze", "2-2", "Ramiro Vita", "FASE DE GRUPOS COPA TOTAL T11");
agregarResultado("Ramiro Vita", "2-2", "Eze", "FASE DE GRUPOS COPA TOTAL T11");
agregarResultado("Lautaro Scocier", "0-2", "Dani Bazan", "FASE DE GRUPOS COPA TOTAL T11");
agregarResultado("Dani Bazan", "2-0", "Lautaro Scocier", "FASE DE GRUPOS COPA TOTAL T11");
agregarResultado("Ignacio Cejas", "0-2", "Joaquin Sampadaro", "FASE DE GRUPOS COPA TOTAL T11");
agregarResultado("Joaquin Sampadaro", "2-0", "Ignacio Cejas", "FASE DE GRUPOS COPA TOTAL T11");
agregarResultado("Martin Bustos", "2-9", "Matheo Olivera", "OCTAVOS DE FINAL COPA TOTAL T11");
agregarResultado("Matheo Olivera", "9-2", "Martin Bustos", "OCTAVOS DE FINAL COPA TOTAL T11");
agregarResultado("Joaquin Sampadaro", "12-13", "Lucas Aguilera", "OCTAVOS DE FINAL COPA TOTAL T11");
agregarResultado("Lucas Aguilera", "13-12", "Joaquin Sampadaro", "OCTAVOS DE FINAL COPA TOTAL T11");
agregarResultado("Anubis", "4-4", "Azul Quispe", "OCTAVOS DE FINAL COPA TOTAL T11");
agregarResultado("Azul Quispe", "4-4", "Anubis", "OCTAVOS DE FINAL COPA TOTAL T11");
agregarResultado("Facundo Marchese", "7-7", "Valentina Scocier", "OCTAVOS DE FINAL COPA TOTAL T11");
agregarResultado("Valentina Scocier", "7-7", "Facundo Marchese", "OCTAVOS DE FINAL COPA TOTAL T11");
agregarResultado("Ian Gangai", "9-7", "Tomas Delgado", "OCTAVOS DE FINAL COPA TOTAL T11");
agregarResultado("Tomas Delgado", "7-9", "Ian Gangai", "OCTAVOS DE FINAL COPA TOTAL T11");
agregarResultado("Nico Avalos", "8-9", "Tomas Torcasio", "OCTAVOS DE FINAL COPA TOTAL T11");
agregarResultado("Tomas Torcasio", "9-8", "Nico Avalos", "OCTAVOS DE FINAL COPA TOTAL T11");
agregarResultado("Rodri Sebastian", "6-6", "Axel", "OCTAVOS DE FINAL COPA TOTAL T11");
agregarResultado("Axel", "6-6", "Rodri Sebastian", "OCTAVOS DE FINAL COPA TOTAL T11");
agregarResultado("Eze", "9-10", "Kevin Sivori", "OCTAVOS DE FINAL COPA TOTAL T11");
agregarResultado("Kevin Sivori", "10-9", "Eze", "OCTAVOS DE FINAL COPA TOTAL T11");
agregarResultado("Anubis", "10-5", "Azul Quispe", "DESEMPATE OCTAVOS DE FINAL COPA TOTAL T11");
agregarResultado("Azul Quispe", "5-10", "Anubis", "DESEMPATE OCTAVOS DE FINAL COPA TOTAL T11");
agregarResultado("Facundo Marchese", "11-9", "Valentina Scocier", "DESEMPATE OCTAVOS DE FINAL COPA TOTAL T11");
agregarResultado("Valentina Scocier", "9-11", "Facundo Marchese", "DESEMPATE OCTAVOS DE FINAL COPA TOTAL T11");
agregarResultado("Rodri Sebastian", "8-6", "Axel", "DESEMPATE OCTAVOS DE FINAL COPA TOTAL T11");
agregarResultado("Axel", "6-8", "Rodri Sebastian", "DESEMPATE OCTAVOS DE FINAL COPA TOTAL T11");
agregarResultado("Matheo Olivera", "10-13", "Lucas Aguilera", "CUARTOS DE FINAL COPA TOTAL T11");
agregarResultado("Lucas Aguilera", "13-10", "Matheo Olivera", "CUARTOS DE FINAL COPA TOTAL T11");
agregarResultado("Anubis", "9-9", "Facundo Marchese", "CUARTOS DE FINAL COPA TOTAL T11");
agregarResultado("Facundo Marchese", "9-9", "Anubis", "CUARTOS DE FINAL COPA TOTAL T11");
agregarResultado("Ian Gangai", "11-6", "Tomas Torcasio", "CUARTOS DE FINAL COPA TOTAL T11");
agregarResultado("Tomas Torcasio", "6-11", "Ian Gangai", "CUARTOS DE FINAL COPA TOTAL T11");
agregarResultado("Rodri Sebastian", "0-10", "Kevin Sivori", "CUARTOS DE FINAL COPA TOTAL T11");
agregarResultado("Kevin Sivori", "10-0", "Rodri Sebastian", "CUARTOS DE FINAL COPA TOTAL T11");
agregarResultado("Anubis", "11-13", "Facundo Marchese", "DESEMPATE CUARTOS DE FINAL COPA TOTAL T11");
agregarResultado("Facundo Marchese", "13-11", "Anubis", "DESEMPATE CUARTOS DE FINAL COPA TOTAL T11");
agregarResultado("Lucas Aguilera", "13-12", "Facundo Marchese", "SEMIFINAL COPA TOTAL T11");
agregarResultado("Facundo Marchese", "12-13", "Lucas Aguilera", "SEMIFINAL COPA TOTAL T11");
agregarResultado("Ian Gangai", "6-8", "Kevin Sivori", "SEMIFINAL COPA TOTAL T11");
agregarResultado("Kevin Sivori", "8-6", "Ian Gangai", "SEMIFINAL COPA TOTAL T11");
agregarResultado("Lucas Aguilera", "9-4", "Kevin Sivori", "FINAL COPA TOTAL T11");
agregarResultado("Kevin Sivori", "4-9", "Lucas Aguilera", "FINAL COPA TOTAL T11");
agregarResultado("Ramiro Vita", "4-0", "Antonella Lopez", "32AVOS DE FINAL COPA CAMPEONES T11");
agregarResultado("Antonella Lopez", "0-4", "Ramiro Vita", "32AVOS DE FINAL COPA CAMPEONES T11");
agregarResultado("Ian Gangai", "9-8", "Lautaro Scocier", "32AVOS DE FINAL COPA CAMPEONES T11");
agregarResultado("Lautaro Scocier", "8-9", "Ian Gangai", "32AVOS DE FINAL COPA CAMPEONES T11");
agregarResultado("Ramiro Vita", "7-13", "Ian Gangai", "16AVOS DE FINAL COPA CAMPEONES T11");
agregarResultado("Ian Gangai", "13-7", "Ramiro Vita", "16AVOS DE FINAL COPA CAMPEONES T11");
agregarResultado("Ian Gangai", "9-7", "Valentina Scocier", "OCTAVOS DE FINAL COPA CAMPEONES T11");
agregarResultado("Valentina Scocier", "7-9", "Ian Gangai", "OCTAVOS DE FINAL COPA CAMPEONES T11");
agregarResultado("Lucas Insua", "7-8", "Nico Avalos", "OCTAVOS DE FINAL COPA CAMPEONES T11");
agregarResultado("Nico Avalos", "8-7", "Lucas Insua", "OCTAVOS DE FINAL COPA CAMPEONES T11");
agregarResultado("Kevin Sivori", "10-9", "Matheo Olivera", "OCTAVOS DE FINAL COPA CAMPEONES T11");
agregarResultado("Matheo Olivera", "9-10", "Kevin Sivori", "OCTAVOS DE FINAL COPA CAMPEONES T11");
agregarResultado("Ian Gangai", "11-13", "Nico Avalos", "CUARTOS DE FINAL COPA CAMPEONES T11");
agregarResultado("Nico Avalos", "13-11", "Ian Gangai", "CUARTOS DE FINAL COPA CAMPEONES T11");
agregarResultado("Kevin Sivori", "10-5", "Rodrigo Soca", "CUARTOS DE FINAL COPA CAMPEONES T11");
agregarResultado("Rodrigo Soca", "5-10", "Kevin Sivori", "CUARTOS DE FINAL COPA CAMPEONES T11");
agregarResultado("Nico Avalos", "12-9", "Fabrizio Escolano", "SEMIFINAL COPA CAMPEONES T11");
agregarResultado("Fabrizio Escolano", "9-12", "Nico Avalos", "SEMIFINAL COPA CAMPEONES T11");
agregarResultado("Kevin Sivori", "8-14", "Moreno Perez", "SEMIFINAL COPA CAMPEONES T11");
agregarResultado("Moreno Perez", "14-8", "Kevin Sivori", "SEMIFINAL COPA CAMPEONES T11");
agregarResultado("Nico Avalos", "7-8", "Moreno Perez", "FINAL COPA CAMPEONES T11");
agregarResultado("Moreno Perez", "8-7", "Nico Avalos", "FINAL COPA CAMPEONES T11");
agregarResultado("Martin Bustos", "14-17", "Moreno Perez", "FINAL COPA DUOS T11");
agregarResultado("Moreno Perez", "17-14", "Martin Bustos", "FINAL COPA DUOS T11");
agregarResultado("Lucas Aguilera", "14-17", "Anubis", "FINAL COPA DUOS T11");
agregarResultado("Anubis", "17-14", "Lucas Aguilera", "FINAL COPA DUOS T11");
agregarResultado("Martin Bustos", "14-17", "Anubis", "FINAL COPA DUOS T11");
agregarResultado("Anubis", "17-14", "Martin Bustos", "FINAL COPA DUOS T11");
agregarResultado("Lucas Aguilera", "14-17", "Moreno Perez", "FINAL COPA DUOS T11");
agregarResultado("Moreno Perez", "17-14", "Lucas Aguilera", "FINAL COPA DUOS T11");
agregarResultado("Valentina Scocier", "6-5", "Nacho Soto", "PROMOCION T11");
agregarResultado("Nacho Soto", "5-6", "Valentina Scocier", "PROMOCION T11");
agregarResultado("Nahuel Scocier", "7-4", "Kevin Sivori", "PROMOCION T11");
agregarResultado("Kevin Sivori", "4-7", "Nahuel Scocier", "PROMOCION T11");
agregarResultado("Lucas Insua", "7-5", "Nahuel Scocier", "OCTAVOS DE FINAL COPA A T12");
agregarResultado("Nahuel Scocier", "5-7", "Lucas Insua", "OCTAVOS DE FINAL COPA A T12");
agregarResultado("Nico Avalos", "5-7", "Rodrigo Soca", "OCTAVOS DE FINAL COPA A T12");
agregarResultado("Rodrigo Soca", "7-5", "Nico Avalos", "OCTAVOS DE FINAL COPA A T12");
agregarResultado("Valentina Scocier", "9-7", "Lucas Aguilera", "OCTAVOS DE FINAL COPA A T12");
agregarResultado("Lucas Aguilera", "7-9", "Valentina Scocier", "OCTAVOS DE FINAL COPA A T12");
agregarResultado("Gabriel Talarico", "9-7", "Matheo Olivera", "OCTAVOS DE FINAL COPA A T12");
agregarResultado("Matheo Olivera", "7-9", "Gabriel Talarico", "OCTAVOS DE FINAL COPA A T12");
agregarResultado("Moreno Perez", "8-3", "Lucas Insua", "CUARTOS DE FINAL COPA A T12");
agregarResultado("Lucas Insua", "3-8", "Moreno Perez", "CUARTOS DE FINAL COPA A T12");
agregarResultado("Tomas Delgado", "6-4", "Valentina Scocier", "CUARTOS DE FINAL COPA A T12");
agregarResultado("Valentina Scocier", "4-6", "Tomas Delgado", "CUARTOS DE FINAL COPA A T12");
agregarResultado("Fabrizio Escolano", "9-6", "Gabriel Talarico", "CUARTOS DE FINAL COPA A T12");
agregarResultado("Gabriel Talarico", "6-9", "Fabrizio Escolano", "CUARTOS DE FINAL COPA A T12");
agregarResultado("Joel Marasco", "7-4", "Rodrigo Soca", "CUARTOS DE FINAL COPA A T12");
agregarResultado("Rodrigo Soca", "4-7", "Joel Marasco", "CUARTOS DE FINAL COPA A T12");
agregarResultado("Moreno Perez", "8-11", "Fabrizio Escolano", "SEMIFINAL COPA A T12");
agregarResultado("Fabrizio Escolano", "11-8", "Moreno Perez", "SEMIFINAL COPA A T12");
agregarResultado("Tomas Delgado", "5-7", "Joel Marasco", "SEMIFINAL COPA A T12");
agregarResultado("Joel Marasco", "7-5", "Tomas Delgado", "SEMIFINAL COPA A T12");
agregarResultado("Fabrizio Escolano", "10-7", "Joel Marasco", "FINAL COPA A T12");
agregarResultado("Joel Marasco", "7-10", "Fabrizio Escolano", "FINAL COPA A T12");
agregarResultado("Antonella Lopez", "5-9", "Felipe Galante", "OCTAVOS DE FINAL COPA B T12");
agregarResultado("Felipe Galante", "9-5", "Antonella Lopez", "OCTAVOS DE FINAL COPA B T12");
agregarResultado("Martin Bustos", "10-7", "Gonzalo Nuñez", "OCTAVOS DE FINAL COPA B T12");
agregarResultado("Gonzalo Nuñez", "7-10", "Martin Bustos", "OCTAVOS DE FINAL COPA B T12");
agregarResultado("Bruno Alonso", "4-5", "Axel", "OCTAVOS DE FINAL COPA B T12");
agregarResultado("Axel", "5-4", "Bruno Alonso", "OCTAVOS DE FINAL COPA B T12");
agregarResultado("Joaquin Sampadaro", "6-0", "Mario Talarico", "OCTAVOS DE FINAL COPA B T12");
agregarResultado("Mario Talarico", "0-6", "Joaquin Sampadaro", "OCTAVOS DE FINAL COPA B T12");
agregarResultado("Eze", "8-8", "Joaquin Sampadaro", "CUARTOS DE FINAL COPA B T12");
agregarResultado("Joaquin Sampadaro", "8-8", "Eze", "CUARTOS DE FINAL COPA B T12");
agregarResultado("Rodri Sebastian", "7-6", "Felipe Galante", "CUARTOS DE FINAL COPA B T12");
agregarResultado("Felipe Galante", "6-7", "Rodri Sebastian", "CUARTOS DE FINAL COPA B T12");
agregarResultado("Kraiizer", "6-6", "Axel", "CUARTOS DE FINAL COPA B T12");
agregarResultado("Axel", "6-6", "Kraiizer", "CUARTOS DE FINAL COPA B T12");
agregarResultado("Tomas Torcasio", "7-7", "Martin Bustos", "CUARTOS DE FINAL COPA B T12");
agregarResultado("Martin Bustos", "7-7", "Tomas Torcasio", "CUARTOS DE FINAL COPA B T12");
agregarResultado("Eze", "5-6", "Joaquin Sampadaro", "DESEMPATE CUARTOS DE FINAL COPA B T12");
agregarResultado("Joaquin Sampadaro", "6-5", "Eze", "DESEMPATE CUARTOS DE FINAL COPA B T12");
agregarResultado("Kraiizer", "4-7", "Axel", "DESEMPATE CUARTOS DE FINAL COPA B T12");
agregarResultado("Axel", "7-4", "Kraiizer", "DESEMPATE CUARTOS DE FINAL COPA B T12");
agregarResultado("Tomas Torcasio", "8-4", "Martin Bustos", "DESEMPATE CUARTOS DE FINAL COPA B T12");
agregarResultado("Martin Bustos", "4-8", "Tomas Torcasio", "DESEMPATE CUARTOS DE FINAL COPA B T12");
agregarResultado("Rodri Sebastian", "3-10", "Axel", "SEMIFINAL COPA B T12");
agregarResultado("Axel", "10-3", "Rodri Sebastian", "SEMIFINAL COPA B T12");
agregarResultado("Tomas Torcasio", "10-7", "Joaquin Sampadaro", "SEMIFINAL COPA B T12");
agregarResultado("Joaquin Sampadaro", "7-10", "Tomas Torcasio", "SEMIFINAL COPA B T12");
agregarResultado("Axel", "6-9", "Tomas Torcasio", "FINAL COPA B T12");
agregarResultado("Tomas Torcasio", "9-6", "Axel", "FINAL COPA B T12");
agregarResultado("Luciano Hufschmid", "5-8", "Anubis", "OCTAVOS DE FINAL COPA C T12");
agregarResultado("Anubis", "8-5", "Luciano Hufschmid", "OCTAVOS DE FINAL COPA C T12");
agregarResultado("Ignacio Cejas", "4-6", "Dani Bazan", "OCTAVOS DE FINAL COPA C T12");
agregarResultado("Dani Bazan", "6-4", "Ignacio Cejas", "OCTAVOS DE FINAL COPA C T12");
agregarResultado("Renzo Badano", "2-5", "Nico Luchetti (R)", "OCTAVOS DE FINAL COPA C T12");
agregarResultado("Nico Luchetti (R)", "5-2", "Renzo Badano", "OCTAVOS DE FINAL COPA C T12");
agregarResultado("Jhose", "1-5", "Alexis Segovia", "OCTAVOS DE FINAL COPA C T12");
agregarResultado("Alexis Segovia", "5-1", "Jhose", "OCTAVOS DE FINAL COPA C T12");
agregarResultado("Azul Quispe", "10-8", "Anubis", "CUARTOS DE FINAL COPA C T12");
agregarResultado("Anubis", "8-10", "Azul Quispe", "CUARTOS DE FINAL COPA C T12");
agregarResultado("Joel Alcalde", "4-8", "Dani Bazan", "CUARTOS DE FINAL COPA C T12");
agregarResultado("Dani Bazan", "8-4", "Joel Alcalde", "CUARTOS DE FINAL COPA C T12");
agregarResultado("Benja", "4-4", "Alexis Segovia", "CUARTOS DE FINAL COPA C T12");
agregarResultado("Alexis Segovia", "4-4", "Benja", "CUARTOS DE FINAL COPA C T12");
agregarResultado("Franco Przepiorka", "8-9", "Nico Luchetti (R)", "CUARTOS DE FINAL COPA C T12");
agregarResultado("Nico Luchetti (R)", "9-8", "Franco Przepiorka", "CUARTOS DE FINAL COPA C T12");
agregarResultado("Benja", "7-5", "Alexis Segovia", "DESEMPATE CUARTOS DE FINAL COPA C T12");
agregarResultado("Alexis Segovia", "5-7", "Benja", "DESEMPATE CUARTOS DE FINAL COPA C T12");
agregarResultado("Benja", "5-4", "Azul Quispe", "SEMIFINAL COPA C T12");
agregarResultado("Azul Quispe", "4-5", "Benja", "SEMIFINAL COPA C T12");
agregarResultado("Dani Bazan", "7-3", "Nico Luchetti (R)", "SEMIFINAL COPA C T12");
agregarResultado("Nico Luchetti (R)", "3-7", "Dani Bazan", "SEMIFINAL COPA C T12");
agregarResultado("Benja", "15-10", "Dani Bazan", "FINAL COPA C T12");
agregarResultado("Dani Bazan", "10-15", "Benja", "FINAL COPA C T12");
agregarResultado("Leandro Montes", "0-0", "Pancho Muzzio", "FASE DE GRUPOS COPA TOTAL T12");
agregarResultado("Pancho Muzzio", "0-0", "Leandro Montes", "FASE DE GRUPOS COPA TOTAL T12");
agregarResultado("Rodri Sebastian", "0-0", "Alexis Segovia", "FASE DE GRUPOS COPA TOTAL T12");
agregarResultado("Alexis Segovia", "0-0", "Rodri Sebastian", "FASE DE GRUPOS COPA TOTAL T12");
agregarResultado("Pancho Muzzio", "4-4", "Lucas Aguilera", "FASE DE GRUPOS COPA TOTAL T12");
agregarResultado("Lucas Aguilera", "4-4", "Pancho Muzzio", "FASE DE GRUPOS COPA TOTAL T12");
agregarResultado("Leandro Montes", "1-5", "Rodri Sebastian", "FASE DE GRUPOS COPA TOTAL T12");
agregarResultado("Rodri Sebastian", "5-1", "Leandro Montes", "FASE DE GRUPOS COPA TOTAL T12");
agregarResultado("Mariano Gallucci", "0-3", "Eze", "FASE DE GRUPOS COPA TOTAL T12");
agregarResultado("Eze", "3-0", "Mariano Gallucci", "FASE DE GRUPOS COPA TOTAL T12");
agregarResultado("Antonella Lopez", "1-0", "Nico Luchetti (R)", "FASE DE GRUPOS COPA TOTAL T12");
agregarResultado("Nico Luchetti (R)", "0-1", "Antonella Lopez", "FASE DE GRUPOS COPA TOTAL T12");
agregarResultado("Eze", "6-1", "Nico Avalos", "FASE DE GRUPOS COPA TOTAL T12");
agregarResultado("Nico Avalos", "1-6", "Eze", "FASE DE GRUPOS COPA TOTAL T12");
agregarResultado("Mariano Gallucci", "0-1", "Antonella Lopez", "FASE DE GRUPOS COPA TOTAL T12");
agregarResultado("Antonella Lopez", "1-0", "Mariano Gallucci", "FASE DE GRUPOS COPA TOTAL T12");
agregarResultado("Joel Alcalde", "2-0", "Ramiro Vita", "FASE DE GRUPOS COPA TOTAL T12");
agregarResultado("Ramiro Vita", "0-2", "Joel Alcalde", "FASE DE GRUPOS COPA TOTAL T12");
agregarResultado("Dani Bazan", "0-1", "Bruno Alonso", "FASE DE GRUPOS COPA TOTAL T12");
agregarResultado("Bruno Alonso", "1-0", "Dani Bazan", "FASE DE GRUPOS COPA TOTAL T12");
agregarResultado("Ramiro Vita", "0-4", "Ian Gangai", "FASE DE GRUPOS COPA TOTAL T12");
agregarResultado("Ian Gangai", "4-0", "Ramiro Vita", "FASE DE GRUPOS COPA TOTAL T12");
agregarResultado("Joel Alcalde", "3-2", "Dani Bazan", "FASE DE GRUPOS COPA TOTAL T12");
agregarResultado("Dani Bazan", "2-3", "Joel Alcalde", "FASE DE GRUPOS COPA TOTAL T12");
agregarResultado("Ignacio Cejas", "0-0", "Jhose", "FASE DE GRUPOS COPA TOTAL T12");
agregarResultado("Jhose", "0-0", "Ignacio Cejas", "FASE DE GRUPOS COPA TOTAL T12");
agregarResultado("Gonzalo Nuñez", "0-0", "Natanael", "FASE DE GRUPOS COPA TOTAL T12");
agregarResultado("Natanael", "0-0", "Gonzalo Nuñez", "FASE DE GRUPOS COPA TOTAL T12");
agregarResultado("Jhose", "5-1", "Rodrigo Soca", "FASE DE GRUPOS COPA TOTAL T12");
agregarResultado("Rodrigo Soca", "1-5", "Jhose", "FASE DE GRUPOS COPA TOTAL T12");
agregarResultado("Ignacio Cejas", "0-3", "Gonzalo Nuñez", "FASE DE GRUPOS COPA TOTAL T12");
agregarResultado("Gonzalo Nuñez", "3-0", "Ignacio Cejas", "FASE DE GRUPOS COPA TOTAL T12");
agregarResultado("Fede Salatino", "0-0", "Nahuel Scocier", "FASE DE GRUPOS COPA TOTAL T12");
agregarResultado("Nahuel Scocier", "0-0", "Fede Salatino", "FASE DE GRUPOS COPA TOTAL T12");
agregarResultado("Benja", "0-4", "Lucas Insua", "FASE DE GRUPOS COPA TOTAL T12");
agregarResultado("Lucas Insua", "4-0", "Benja", "FASE DE GRUPOS COPA TOTAL T12");
agregarResultado("Nahuel Scocier", "6-1", "Rodrigo Talarico", "FASE DE GRUPOS COPA TOTAL T12");
agregarResultado("Rodrigo Talarico", "1-6", "Nahuel Scocier", "FASE DE GRUPOS COPA TOTAL T12");
agregarResultado("Fede Salatino", "0-2", "Benja", "FASE DE GRUPOS COPA TOTAL T12");
agregarResultado("Benja", "2-0", "Fede Salatino", "FASE DE GRUPOS COPA TOTAL T12");
agregarResultado("Franco Przepiorka", "0-2", "Gabriel Talarico", "FASE DE GRUPOS COPA TOTAL T12");
agregarResultado("Gabriel Talarico", "2-0", "Franco Przepiorka", "FASE DE GRUPOS COPA TOTAL T12");
agregarResultado("Luciano Hufschmid", "0-0", "Nacho Soto", "FASE DE GRUPOS COPA TOTAL T12");
agregarResultado("Nacho Soto", "0-0", "Luciano Hufschmid", "FASE DE GRUPOS COPA TOTAL T12");
agregarResultado("Gabriel Talarico", "2-5", "Fabrizio Escolano", "FASE DE GRUPOS COPA TOTAL T12");
agregarResultado("Fabrizio Escolano", "5-2", "Gabriel Talarico", "FASE DE GRUPOS COPA TOTAL T12");
agregarResultado("Franco Przepiorka", "6-0", "Luciano Hufschmid", "FASE DE GRUPOS COPA TOTAL T12");
agregarResultado("Luciano Hufschmid", "0-6", "Franco Przepiorka", "FASE DE GRUPOS COPA TOTAL T12");
agregarResultado("Azul Quispe", "1-0", "Kevin Sivori", "FASE DE GRUPOS COPA TOTAL T12");
agregarResultado("Kevin Sivori", "0-1", "Azul Quispe", "FASE DE GRUPOS COPA TOTAL T12");
agregarResultado("Renzo Badano", "0-0", "Facundo Marchese", "FASE DE GRUPOS COPA TOTAL T12");
agregarResultado("Facundo Marchese", "0-0", "Renzo Badano", "FASE DE GRUPOS COPA TOTAL T12");
agregarResultado("Kevin Sivori", "3-1", "Mario Talarico", "FASE DE GRUPOS COPA TOTAL T12");
agregarResultado("Mario Talarico", "1-3", "Kevin Sivori", "FASE DE GRUPOS COPA TOTAL T12");
agregarResultado("Azul Quispe", "4-1", "Renzo Badano", "FASE DE GRUPOS COPA TOTAL T12");
agregarResultado("Renzo Badano", "1-4", "Azul Quispe", "FASE DE GRUPOS COPA TOTAL T12");
agregarResultado("Bautista Coria", "1-0", "Santi", "FASE DE GRUPOS COPA TOTAL T12");
agregarResultado("Santi", "0-1", "Bautista Coria", "FASE DE GRUPOS COPA TOTAL T12");
agregarResultado("Tomas Torcasio", "0-2", "Martin Bustos", "FASE DE GRUPOS COPA TOTAL T12");
agregarResultado("Martin Bustos", "2-0", "Tomas Torcasio", "FASE DE GRUPOS COPA TOTAL T12");
agregarResultado("Santi", "0-6", "Moreno Perez", "FASE DE GRUPOS COPA TOTAL T12");
agregarResultado("Moreno Perez", "6-0", "Santi", "FASE DE GRUPOS COPA TOTAL T12");
agregarResultado("Bautista Coria", "2-6", "Tomas Torcasio", "FASE DE GRUPOS COPA TOTAL T12");
agregarResultado("Tomas Torcasio", "6-2", "Bautista Coria", "FASE DE GRUPOS COPA TOTAL T12");
agregarResultado("Kraiizer", "3-0", "Joel Marasco", "FASE DE GRUPOS COPA TOTAL T12");
agregarResultado("Joel Marasco", "0-3", "Kraiizer", "FASE DE GRUPOS COPA TOTAL T12");
agregarResultado("Joaquin Sampadaro", "0-3", "Valentina Scocier", "FASE DE GRUPOS COPA TOTAL T12");
agregarResultado("Valentina Scocier", "3-0", "Joaquin Sampadaro", "FASE DE GRUPOS COPA TOTAL T12");
agregarResultado("Joel Marasco", "7-4", "Tomas Delgado", "FASE DE GRUPOS COPA TOTAL T12");
agregarResultado("Tomas Delgado", "4-7", "Joel Marasco", "FASE DE GRUPOS COPA TOTAL T12");
agregarResultado("Kraiizer", "1-1", "Joaquin Sampadaro", "FASE DE GRUPOS COPA TOTAL T12");
agregarResultado("Joaquin Sampadaro", "1-1", "Kraiizer", "FASE DE GRUPOS COPA TOTAL T12");
agregarResultado("Axel", "0-1", "Lautaro Scocier", "FASE DE GRUPOS COPA TOTAL T12");
agregarResultado("Lautaro Scocier", "1-0", "Axel", "FASE DE GRUPOS COPA TOTAL T12");
agregarResultado("Felipe Galante", "0-0", "Anubis", "FASE DE GRUPOS COPA TOTAL T12");
agregarResultado("Anubis", "0-0", "Felipe Galante", "FASE DE GRUPOS COPA TOTAL T12");
agregarResultado("Lautaro Scocier", "0-5", "Matheo Olivera", "FASE DE GRUPOS COPA TOTAL T12");
agregarResultado("Matheo Olivera", "5-0", "Lautaro Scocier", "FASE DE GRUPOS COPA TOTAL T12");
agregarResultado("Axel", "0-4", "Felipe Galante", "FASE DE GRUPOS COPA TOTAL T12");
agregarResultado("Felipe Galante", "4-0", "Axel", "FASE DE GRUPOS COPA TOTAL T12");
agregarResultado("Alexis Segovia", "4-4", "Lucas Aguilera", "FASE DE GRUPOS COPA TOTAL T12");
agregarResultado("Lucas Aguilera", "4-4", "Alexis Segovia", "FASE DE GRUPOS COPA TOTAL T12");
agregarResultado("Pancho Muzzio", "2-8", "Rodri Sebastian", "FASE DE GRUPOS COPA TOTAL T12");
agregarResultado("Rodri Sebastian", "8-2", "Pancho Muzzio", "FASE DE GRUPOS COPA TOTAL T12");
agregarResultado("Rodri Sebastian", "0-0", "Lucas Aguilera", "FASE DE GRUPOS COPA TOTAL T12");
agregarResultado("Lucas Aguilera", "0-0", "Rodri Sebastian", "FASE DE GRUPOS COPA TOTAL T12");
agregarResultado("Alexis Segovia", "1-0", "Leandro Montes", "FASE DE GRUPOS COPA TOTAL T12");
agregarResultado("Leandro Montes", "0-1", "Alexis Segovia", "FASE DE GRUPOS COPA TOTAL T12");
agregarResultado("Nico Luchetti (R)", "5-3", "Nico Avalos", "FASE DE GRUPOS COPA TOTAL T12");
agregarResultado("Nico Avalos", "3-5", "Nico Luchetti (R)", "FASE DE GRUPOS COPA TOTAL T12");
agregarResultado("Eze", "6-2", "Antonella Lopez", "FASE DE GRUPOS COPA TOTAL T12");
agregarResultado("Antonella Lopez", "2-6", "Eze", "FASE DE GRUPOS COPA TOTAL T12");
agregarResultado("Antonella Lopez", "1-0", "Nico Avalos", "FASE DE GRUPOS COPA TOTAL T12");
agregarResultado("Nico Avalos", "0-1", "Antonella Lopez", "FASE DE GRUPOS COPA TOTAL T12");
agregarResultado("Nico Luchetti (R)", "3-0", "Mariano Gallucci", "FASE DE GRUPOS COPA TOTAL T12");
agregarResultado("Mariano Gallucci", "0-3", "Nico Luchetti (R)", "FASE DE GRUPOS COPA TOTAL T12");
agregarResultado("Bruno Alonso", "3-3", "Ian Gangai", "FASE DE GRUPOS COPA TOTAL T12");
agregarResultado("Ian Gangai", "3-3", "Bruno Alonso", "FASE DE GRUPOS COPA TOTAL T12");
agregarResultado("Ramiro Vita", "0-3", "Dani Bazan", "FASE DE GRUPOS COPA TOTAL T12");
agregarResultado("Dani Bazan", "3-0", "Ramiro Vita", "FASE DE GRUPOS COPA TOTAL T12");
agregarResultado("Dani Bazan", "1-0", "Ian Gangai", "FASE DE GRUPOS COPA TOTAL T12");
agregarResultado("Ian Gangai", "0-1", "Dani Bazan", "FASE DE GRUPOS COPA TOTAL T12");
agregarResultado("Bruno Alonso", "1-3", "Joel Alcalde", "FASE DE GRUPOS COPA TOTAL T12");
agregarResultado("Joel Alcalde", "3-1", "Bruno Alonso", "FASE DE GRUPOS COPA TOTAL T12");
agregarResultado("Natanael", "4-5", "Rodrigo Soca", "FASE DE GRUPOS COPA TOTAL T12");
agregarResultado("Rodrigo Soca", "5-4", "Natanael", "FASE DE GRUPOS COPA TOTAL T12");
agregarResultado("Jhose", "2-4", "Gonzalo Nuñez", "FASE DE GRUPOS COPA TOTAL T12");
agregarResultado("Gonzalo Nuñez", "4-2", "Jhose", "FASE DE GRUPOS COPA TOTAL T12");
agregarResultado("Gonzalo Nuñez", "0-3", "Rodrigo Soca", "FASE DE GRUPOS COPA TOTAL T12");
agregarResultado("Rodrigo Soca", "3-0", "Gonzalo Nuñez", "FASE DE GRUPOS COPA TOTAL T12");
agregarResultado("Natanael", "0-3", "Ignacio Cejas", "FASE DE GRUPOS COPA TOTAL T12");
agregarResultado("Ignacio Cejas", "3-0", "Natanael", "FASE DE GRUPOS COPA TOTAL T12");
agregarResultado("Lucas Insua", "4-3", "Rodrigo Talarico", "FASE DE GRUPOS COPA TOTAL T12");
agregarResultado("Rodrigo Talarico", "3-4", "Lucas Insua", "FASE DE GRUPOS COPA TOTAL T12");
agregarResultado("Nahuel Scocier", "6-3", "Benja", "FASE DE GRUPOS COPA TOTAL T12");
agregarResultado("Benja", "3-6", "Nahuel Scocier", "FASE DE GRUPOS COPA TOTAL T12");
agregarResultado("Benja", "0-0", "Rodrigo Talarico", "FASE DE GRUPOS COPA TOTAL T12");
agregarResultado("Rodrigo Talarico", "0-0", "Benja", "FASE DE GRUPOS COPA TOTAL T12");
agregarResultado("Lucas Insua", "4-0", "Fede Salatino", "FASE DE GRUPOS COPA TOTAL T12");
agregarResultado("Fede Salatino", "0-4", "Lucas Insua", "FASE DE GRUPOS COPA TOTAL T12");
agregarResultado("Nacho Soto", "3-3", "Fabrizio Escolano", "FASE DE GRUPOS COPA TOTAL T12");
agregarResultado("Fabrizio Escolano", "3-3", "Nacho Soto", "FASE DE GRUPOS COPA TOTAL T12");
agregarResultado("Gabriel Talarico", "3-6", "Luciano Hufschmid", "FASE DE GRUPOS COPA TOTAL T12");
agregarResultado("Luciano Hufschmid", "6-3", "Gabriel Talarico", "FASE DE GRUPOS COPA TOTAL T12");
agregarResultado("Luciano Hufschmid", "0-1", "Fabrizio Escolano", "FASE DE GRUPOS COPA TOTAL T12");
agregarResultado("Fabrizio Escolano", "1-0", "Luciano Hufschmid", "FASE DE GRUPOS COPA TOTAL T12");
agregarResultado("Nacho Soto", "0-3", "Franco Przepiorka", "FASE DE GRUPOS COPA TOTAL T12");
agregarResultado("Franco Przepiorka", "3-0", "Nacho Soto", "FASE DE GRUPOS COPA TOTAL T12");
agregarResultado("Facundo Marchese", "1-3", "Mario Talarico", "FASE DE GRUPOS COPA TOTAL T12");
agregarResultado("Mario Talarico", "3-1", "Facundo Marchese", "FASE DE GRUPOS COPA TOTAL T12");
agregarResultado("Kevin Sivori", "3-3", "Renzo Badano", "FASE DE GRUPOS COPA TOTAL T12");
agregarResultado("Renzo Badano", "3-3", "Kevin Sivori", "FASE DE GRUPOS COPA TOTAL T12");
agregarResultado("Renzo Badano", "4-6", "Mario Talarico", "FASE DE GRUPOS COPA TOTAL T12");
agregarResultado("Mario Talarico", "6-4", "Renzo Badano", "FASE DE GRUPOS COPA TOTAL T12");
agregarResultado("Facundo Marchese", "0-3", "Azul Quispe", "FASE DE GRUPOS COPA TOTAL T12");
agregarResultado("Azul Quispe", "3-0", "Facundo Marchese", "FASE DE GRUPOS COPA TOTAL T12");
agregarResultado("Martin Bustos", "3-2", "Moreno Perez", "FASE DE GRUPOS COPA TOTAL T12");
agregarResultado("Moreno Perez", "2-3", "Martin Bustos", "FASE DE GRUPOS COPA TOTAL T12");
agregarResultado("Santi", "1-5", "Tomas Torcasio", "FASE DE GRUPOS COPA TOTAL T12");
agregarResultado("Tomas Torcasio", "5-1", "Santi", "FASE DE GRUPOS COPA TOTAL T12");
agregarResultado("Tomas Torcasio", "0-3", "Moreno Perez", "FASE DE GRUPOS COPA TOTAL T12");
agregarResultado("Moreno Perez", "3-0", "Tomas Torcasio", "FASE DE GRUPOS COPA TOTAL T12");
agregarResultado("Martin Bustos", "0-0", "Bautista Coria", "FASE DE GRUPOS COPA TOTAL T12");
agregarResultado("Bautista Coria", "0-0", "Martin Bustos", "FASE DE GRUPOS COPA TOTAL T12");
agregarResultado("Valentina Scocier", "3-5", "Tomas Delgado", "FASE DE GRUPOS COPA TOTAL T12");
agregarResultado("Tomas Delgado", "5-3", "Valentina Scocier", "FASE DE GRUPOS COPA TOTAL T12");
agregarResultado("Joel Marasco", "4-4", "Joaquin Sampadaro", "FASE DE GRUPOS COPA TOTAL T12");
agregarResultado("Joaquin Sampadaro", "4-4", "Joel Marasco", "FASE DE GRUPOS COPA TOTAL T12");
agregarResultado("Joaquin Sampadaro", "0-0", "Tomas Delgado", "FASE DE GRUPOS COPA TOTAL T12");
agregarResultado("Tomas Delgado", "0-0", "Joaquin Sampadaro", "FASE DE GRUPOS COPA TOTAL T12");
agregarResultado("Valentina Scocier", "0-3", "Kraiizer", "FASE DE GRUPOS COPA TOTAL T12");
agregarResultado("Kraiizer", "3-0", "Valentina Scocier", "FASE DE GRUPOS COPA TOTAL T12");
agregarResultado("Anubis", "3-3", "Matheo Olivera", "FASE DE GRUPOS COPA TOTAL T12");
agregarResultado("Matheo Olivera", "3-3", "Anubis", "FASE DE GRUPOS COPA TOTAL T12");
agregarResultado("Lautaro Scocier", "2-4", "Felipe Galante", "FASE DE GRUPOS COPA TOTAL T12");
agregarResultado("Felipe Galante", "4-2", "Lautaro Scocier", "FASE DE GRUPOS COPA TOTAL T12");
agregarResultado("Felipe Galante", "0-4", "Matheo Olivera", "FASE DE GRUPOS COPA TOTAL T12");
agregarResultado("Matheo Olivera", "4-0", "Felipe Galante", "FASE DE GRUPOS COPA TOTAL T12");
agregarResultado("Anubis", "0-3", "Axel", "FASE DE GRUPOS COPA TOTAL T12");
agregarResultado("Axel", "3-0", "Anubis", "FASE DE GRUPOS COPA TOTAL T12");
agregarResultado("Leandro Montes", "0-1", "Lucas Aguilera", "FASE DE GRUPOS COPA TOTAL T12");
agregarResultado("Lucas Aguilera", "1-0", "Leandro Montes", "FASE DE GRUPOS COPA TOTAL T12");
agregarResultado("Alexis Segovia", "4-2", "Pancho Muzzio", "FASE DE GRUPOS COPA TOTAL T12");
agregarResultado("Pancho Muzzio", "2-4", "Alexis Segovia", "FASE DE GRUPOS COPA TOTAL T12");
agregarResultado("Mariano Gallucci", "3-3", "Nico Avalos", "FASE DE GRUPOS COPA TOTAL T12");
agregarResultado("Nico Avalos", "3-3", "Mariano Gallucci", "FASE DE GRUPOS COPA TOTAL T12");
agregarResultado("Nico Luchetti (R)", "2-2", "Eze", "FASE DE GRUPOS COPA TOTAL T12");
agregarResultado("Eze", "2-2", "Nico Luchetti (R)", "FASE DE GRUPOS COPA TOTAL T12");
agregarResultado("Joel Alcalde", "2-2", "Ian Gangai", "FASE DE GRUPOS COPA TOTAL T12");
agregarResultado("Ian Gangai", "2-2", "Joel Alcalde", "FASE DE GRUPOS COPA TOTAL T12");
agregarResultado("Bruno Alonso", "3-6", "Ramiro Vita", "FASE DE GRUPOS COPA TOTAL T12");
agregarResultado("Ramiro Vita", "6-3", "Bruno Alonso", "FASE DE GRUPOS COPA TOTAL T12");
agregarResultado("Ignacio Cejas", "1-2", "Rodrigo Soca", "FASE DE GRUPOS COPA TOTAL T12");
agregarResultado("Rodrigo Soca", "2-1", "Ignacio Cejas", "FASE DE GRUPOS COPA TOTAL T12");
agregarResultado("Natanael", "2-1", "Jhose", "FASE DE GRUPOS COPA TOTAL T12");
agregarResultado("Jhose", "1-2", "Natanael", "FASE DE GRUPOS COPA TOTAL T12");
agregarResultado("Fede Salatino", "0-3", "Rodrigo Talarico", "FASE DE GRUPOS COPA TOTAL T12");
agregarResultado("Rodrigo Talarico", "3-0", "Fede Salatino", "FASE DE GRUPOS COPA TOTAL T12");
agregarResultado("Lucas Insua", "2-2", "Nahuel Scocier", "FASE DE GRUPOS COPA TOTAL T12");
agregarResultado("Nahuel Scocier", "2-2", "Lucas Insua", "FASE DE GRUPOS COPA TOTAL T12");
agregarResultado("Franco Przepiorka", "1-3", "Fabrizio Escolano", "FASE DE GRUPOS COPA TOTAL T12");
agregarResultado("Fabrizio Escolano", "3-1", "Franco Przepiorka", "FASE DE GRUPOS COPA TOTAL T12");
agregarResultado("Nacho Soto", "3-2", "Gabriel Talarico", "FASE DE GRUPOS COPA TOTAL T12");
agregarResultado("Gabriel Talarico", "2-3", "Nacho Soto", "FASE DE GRUPOS COPA TOTAL T12");
agregarResultado("Azul Quispe", "2-2", "Mario Talarico", "FASE DE GRUPOS COPA TOTAL T12");
agregarResultado("Mario Talarico", "2-2", "Azul Quispe", "FASE DE GRUPOS COPA TOTAL T12");
agregarResultado("Facundo Marchese", "3-3", "Kevin Sivori", "FASE DE GRUPOS COPA TOTAL T12");
agregarResultado("Kevin Sivori", "3-3", "Facundo Marchese", "FASE DE GRUPOS COPA TOTAL T12");
agregarResultado("Bautista Coria", "2-1", "Moreno Perez", "FASE DE GRUPOS COPA TOTAL T12");
agregarResultado("Moreno Perez", "1-2", "Bautista Coria", "FASE DE GRUPOS COPA TOTAL T12");
agregarResultado("Martin Bustos", "2-0", "Santi", "FASE DE GRUPOS COPA TOTAL T12");
agregarResultado("Santi", "0-2", "Martin Bustos", "FASE DE GRUPOS COPA TOTAL T12");
agregarResultado("Kraiizer", "4-2", "Tomas Delgado", "FASE DE GRUPOS COPA TOTAL T12");
agregarResultado("Tomas Delgado", "2-4", "Kraiizer", "FASE DE GRUPOS COPA TOTAL T12");
agregarResultado("Valentina Scocier", "0-3", "Joel Marasco", "FASE DE GRUPOS COPA TOTAL T12");
agregarResultado("Joel Marasco", "3-0", "Valentina Scocier", "FASE DE GRUPOS COPA TOTAL T12");
agregarResultado("Axel", "2-2", "Matheo Olivera", "FASE DE GRUPOS COPA TOTAL T12");
agregarResultado("Matheo Olivera", "2-2", "Axel", "FASE DE GRUPOS COPA TOTAL T12");
agregarResultado("Anubis", "0-2", "Lautaro Scocier", "FASE DE GRUPOS COPA TOTAL T12");
agregarResultado("Lautaro Scocier", "2-0", "Anubis", "FASE DE GRUPOS COPA TOTAL T12");
agregarResultado("Gonzalo Nuñez", "7-2", "Joel Alcalde", "OCTAVOS DE FINAL COPA TOTAL T12");
agregarResultado("Joel Alcalde", "2-7", "Gonzalo Nuñez", "OCTAVOS DE FINAL COPA TOTAL T12");
agregarResultado("Martin Bustos", "10-8", "Rodri Sebastian", "OCTAVOS DE FINAL COPA TOTAL T12");
agregarResultado("Rodri Sebastian", "8-10", "Martin Bustos", "OCTAVOS DE FINAL COPA TOTAL T12");
agregarResultado("Antonella Lopez", "5-9", "Felipe Galante", "OCTAVOS DE FINAL COPA TOTAL T12");
agregarResultado("Felipe Galante", "9-5", "Antonella Lopez", "OCTAVOS DE FINAL COPA TOTAL T12");
agregarResultado("Eze", "6-7", "Rodrigo Soca", "OCTAVOS DE FINAL COPA TOTAL T12");
agregarResultado("Rodrigo Soca", "7-6", "Eze", "OCTAVOS DE FINAL COPA TOTAL T12");
agregarResultado("Lucas Insua", "7-5", "Fabrizio Escolano", "OCTAVOS DE FINAL COPA TOTAL T12");
agregarResultado("Fabrizio Escolano", "5-7", "Lucas Insua", "OCTAVOS DE FINAL COPA TOTAL T12");
agregarResultado("Azul Quispe", "5-1", "Kraiizer", "OCTAVOS DE FINAL COPA TOTAL T12");
agregarResultado("Kraiizer", "1-5", "Azul Quispe", "OCTAVOS DE FINAL COPA TOTAL T12");
agregarResultado("Nahuel Scocier", "5-5", "Alexis Segovia", "OCTAVOS DE FINAL COPA TOTAL T12");
agregarResultado("Alexis Segovia", "5-5", "Nahuel Scocier", "OCTAVOS DE FINAL COPA TOTAL T12");
agregarResultado("Matheo Olivera", "7-10", "Joel Marasco", "OCTAVOS DE FINAL COPA TOTAL T12");
agregarResultado("Joel Marasco", "10-7", "Matheo Olivera", "OCTAVOS DE FINAL COPA TOTAL T12");
agregarResultado("Nahuel Scocier", "4-7", "Alexis Segovia", "DESEMPATE OCTAVOS DE FINAL COPA TOTAL T12");
agregarResultado("Alexis Segovia", "7-4", "Nahuel Scocier", "DESEMPATE OCTAVOS DE FINAL COPA TOTAL T12");
agregarResultado("Gonzalo Nuñez", "4-7", "Martin Bustos", "CUARTOS DE FINAL COPA TOTAL T12");
agregarResultado("Martin Bustos", "7-4", "Gonzalo Nuñez", "CUARTOS DE FINAL COPA TOTAL T12");
agregarResultado("Felipe Galante", "6-4", "Rodrigo Soca", "CUARTOS DE FINAL COPA TOTAL T12");
agregarResultado("Rodrigo Soca", "4-6", "Felipe Galante", "CUARTOS DE FINAL COPA TOTAL T12");
agregarResultado("Lucas Insua", "3-10", "Azul Quispe", "CUARTOS DE FINAL COPA TOTAL T12");
agregarResultado("Azul Quispe", "10-3", "Lucas Insua", "CUARTOS DE FINAL COPA TOTAL T12");
agregarResultado("Alexis Segovia", "4-7", "Joel Marasco", "CUARTOS DE FINAL COPA TOTAL T12");
agregarResultado("Joel Marasco", "7-4", "Alexis Segovia", "CUARTOS DE FINAL COPA TOTAL T12");
agregarResultado("Martin Bustos", "3-7", "Felipe Galante", "SEMIFINAL COPA TOTAL T12");
agregarResultado("Felipe Galante", "7-3", "Martin Bustos", "SEMIFINAL COPA TOTAL T12");
agregarResultado("Azul Quispe", "4-7", "Joel Marasco", "SEMIFINAL COPA TOTAL T12");
agregarResultado("Joel Marasco", "7-4", "Azul Quispe", "SEMIFINAL COPA TOTAL T12");
agregarResultado("Felipe Galante", "4-7", "Joel Marasco", "FINAL COPA TOTAL T12");
agregarResultado("Joel Marasco", "7-4", "Felipe Galante", "FINAL COPA TOTAL T12");
agregarResultado("Rodrigo Talarico", "7-3", "Lautaro Scocier", "32AVOS DE FINAL COPA CAMPEONES T12");
agregarResultado("Lautaro Scocier", "3-7", "Rodrigo Talarico", "32AVOS DE FINAL COPA CAMPEONES T12");
agregarResultado("Lucas Insua", "8-8", "Moreno Perez", "32AVOS DE FINAL COPA CAMPEONES T12");
agregarResultado("Moreno Perez", "8-8", "Lucas Insua", "32AVOS DE FINAL COPA CAMPEONES T12");
agregarResultado("Lucas Insua", "3-2", "Moreno Perez", "DESEMPATE 32AVOS DE FINAL COPA CAMPEONES T12");
agregarResultado("Moreno Perez", "2-3", "Lucas Insua", "DESEMPATE 32AVOS DE FINAL COPA CAMPEONES T12");
agregarResultado("Rodrigo Talarico", "4-7", "Lucas Insua", "16AVOS DE FINAL COPA CAMPEONES T12");
agregarResultado("Lucas Insua", "7-4", "Rodrigo Talarico", "16AVOS DE FINAL COPA CAMPEONES T12");
agregarResultado("Lucas Insua", "7-10", "Joel Marasco", "OCTAVOS DE FINAL COPA CAMPEONES T12");
agregarResultado("Joel Marasco", "10-7", "Lucas Insua", "OCTAVOS DE FINAL COPA CAMPEONES T12");
agregarResultado("Tomas Delgado", "10-5", "Fabrizio Escolano", "OCTAVOS DE FINAL COPA CAMPEONES T12");
agregarResultado("Fabrizio Escolano", "5-10", "Tomas Delgado", "OCTAVOS DE FINAL COPA CAMPEONES T12");
agregarResultado("Matheo Olivera", "7-10", "Martin Bustos", "OCTAVOS DE FINAL COPA CAMPEONES T12");
agregarResultado("Martin Bustos", "10-7", "Matheo Olivera", "OCTAVOS DE FINAL COPA CAMPEONES T12");
agregarResultado("Tomas Delgado", "6-7", "Joel Marasco", "CUARTOS DE FINAL COPA CAMPEONES T12");
agregarResultado("Joel Marasco", "7-6", "Tomas Delgado", "CUARTOS DE FINAL COPA CAMPEONES T12");
agregarResultado("Martin Bustos", "7-8", "Anubis", "CUARTOS DE FINAL COPA CAMPEONES T12");
agregarResultado("Anubis", "8-7", "Martin Bustos", "CUARTOS DE FINAL COPA CAMPEONES T12");
agregarResultado("Lucas Aguilera", "3-7", "Joel Marasco", "SEMIFINAL COPA CAMPEONES T12");
agregarResultado("Joel Marasco", "7-3", "Lucas Aguilera", "SEMIFINAL COPA CAMPEONES T12");
agregarResultado("Nico Avalos", "8-8", "Anubis", "SEMIFINAL COPA CAMPEONES T12");
agregarResultado("Anubis", "8-8", "Nico Avalos", "SEMIFINAL COPA CAMPEONES T12");
agregarResultado("Nico Avalos", "7-6", "Anubis", "DESEMPATE SEMIFINAL COPA CAMPEONES T12");
agregarResultado("Anubis", "6-7", "Nico Avalos", "DESEMPATE SEMIFINAL COPA CAMPEONES T12");
agregarResultado("Joel Marasco", "7-9", "Nico Avalos", "FINAL COPA CAMPEONES T12");
agregarResultado("Nico Avalos", "9-7", "Joel Marasco", "FINAL COPA CAMPEONES T12");
agregarResultado("Matheo Olivera", "11-15", "Joel Marasco", "FINAL COPA DUOS T12");
agregarResultado("Joel Marasco", "15-11", "Matheo Olivera", "FINAL COPA DUOS T12");
agregarResultado("Nahuel Scocier", "11-15", "Tomas Delgado", "FINAL COPA DUOS T12");
agregarResultado("Tomas Delgado", "15-11", "Nahuel Scocier", "FINAL COPA DUOS T12");
agregarResultado("Matheo Olivera", "11-15", "Tomas Delgado", "FINAL COPA DUOS T12");
agregarResultado("Tomas Delgado", "15-11", "Matheo Olivera", "FINAL COPA DUOS T12");
agregarResultado("Nahuel Scocier", "11-15", "Joel Marasco", "FINAL COPA DUOS T12");
agregarResultado("Joel Marasco", "15-11", "Nahuel Scocier", "FINAL COPA DUOS T12");
agregarResultado("Mario Talarico", "9-9", "Ramiro Vita", "PROMOCION T12");
agregarResultado("Ramiro Vita", "9-9", "Mario Talarico", "PROMOCION T12");
agregarResultado("Felipe Galante", "4-15", "Ian Gangai", "PROMOCION T12");
agregarResultado("Ian Gangai", "15-4", "Felipe Galante", "PROMOCION T12");
agregarResultado("Mario Talarico", "3-0", "Ramiro Vita", "DESEMPATE PROMOCION T12");
agregarResultado("Ramiro Vita", "0-3", "Mario Talarico", "DESEMPATE PROMOCION T12");
agregarResultado("Jhose", "14-16", "Luciano Hufschmid", "DESEMPATE LIGA C T12");
agregarResultado("Luciano Hufschmid", "16-14", "Jhose", "DESEMPATE LIGA C T12");
agregarResultado("Rodrigo Soca", "12-4", "Pancho Muzzio", "OCTAVOS DE FINAL COPA A T13");
agregarResultado("Pancho Muzzio", "4-12", "Rodrigo Soca", "OCTAVOS DE FINAL COPA A T13");
agregarResultado("Lucas Aguilera", "5-11", "Mario Talarico", "OCTAVOS DE FINAL COPA A T13");
agregarResultado("Mario Talarico", "11-5", "Lucas Aguilera", "OCTAVOS DE FINAL COPA A T13");
agregarResultado("Fabrizio Escolano", "10-7", "Lautaro Scocier", "OCTAVOS DE FINAL COPA A T13");
agregarResultado("Lautaro Scocier", "7-10", "Fabrizio Escolano", "OCTAVOS DE FINAL COPA A T13");
agregarResultado("Joel Marasco", "13-9", "Tomas Torcasio", "OCTAVOS DE FINAL COPA A T13");
agregarResultado("Tomas Torcasio", "9-13", "Joel Marasco", "OCTAVOS DE FINAL COPA A T13");
agregarResultado("Kevin Sivori", "5-11", "Rodrigo Soca", "CUARTOS DE FINAL COPA A T13");
agregarResultado("Rodrigo Soca", "11-5", "Kevin Sivori", "CUARTOS DE FINAL COPA A T13");
agregarResultado("Moreno Perez", "6-11", "Fabrizio Escolano", "CUARTOS DE FINAL COPA A T13");
agregarResultado("Fabrizio Escolano", "11-6", "Moreno Perez", "CUARTOS DE FINAL COPA A T13");
agregarResultado("Lucas Insua", "10-6", "Mario Talarico", "CUARTOS DE FINAL COPA A T13");
agregarResultado("Mario Talarico", "6-10", "Lucas Insua", "CUARTOS DE FINAL COPA A T13");
agregarResultado("Nico Avalos", "7-5", "Joel Marasco", "CUARTOS DE FINAL COPA A T13");
agregarResultado("Joel Marasco", "5-7", "Nico Avalos", "CUARTOS DE FINAL COPA A T13");
agregarResultado("Fabrizio Escolano", "6-12", "Nico Avalos", "SEMIFINAL COPA A T13");
agregarResultado("Nico Avalos", "12-6", "Fabrizio Escolano", "SEMIFINAL COPA A T13");
agregarResultado("Rodrigo Soca", "4-15", "Lucas Insua", "SEMIFINAL COPA A T13");
agregarResultado("Lucas Insua", "15-4", "Rodrigo Soca", "SEMIFINAL COPA A T13");
agregarResultado("Lucas Insua", "8-10", "Nico Avalos", "FINAL COPA A T13");
agregarResultado("Nico Avalos", "10-8", "Lucas Insua", "FINAL COPA A T13");
agregarResultado("Benja", "6-6", "Alexis Segovia", "OCTAVOS DE FINAL COPA B T13");
agregarResultado("Alexis Segovia", "6-6", "Benja", "OCTAVOS DE FINAL COPA B T13");
agregarResultado("Gonzalo Nuñez", "4-10", "Natanael", "OCTAVOS DE FINAL COPA B T13");
agregarResultado("Natanael", "10-4", "Gonzalo Nuñez", "OCTAVOS DE FINAL COPA B T13");
agregarResultado("Jhose", "14-6", "Ramiro Vita", "OCTAVOS DE FINAL COPA B T13");
agregarResultado("Ramiro Vita", "6-14", "Jhose", "OCTAVOS DE FINAL COPA B T13");
agregarResultado("Facundo Marchese", "1-7", "Axel", "OCTAVOS DE FINAL COPA B T13");
agregarResultado("Axel", "7-1", "Facundo Marchese", "OCTAVOS DE FINAL COPA B T13");
agregarResultado("Benja", "0-3", "Alexis Segovia", "DESEMPATE OCTAVOS DE FINAL COPA B T13");
agregarResultado("Alexis Segovia", "3-0", "Benja", "DESEMPATE OCTAVOS DE FINAL COPA B T13");
agregarResultado("Tomas Delgado", "12-3", "Axel", "CUARTOS DE FINAL COPA B T13");
agregarResultado("Axel", "3-12", "Tomas Delgado", "CUARTOS DE FINAL COPA B T13");
agregarResultado("Luciano Hufschmid", "8-7", "Alexis Segovia", "CUARTOS DE FINAL COPA B T13");
agregarResultado("Alexis Segovia", "7-8", "Luciano Hufschmid", "CUARTOS DE FINAL COPA B T13");
agregarResultado("Eze", "9-6", "Natanael", "CUARTOS DE FINAL COPA B T13");
agregarResultado("Natanael", "6-9", "Eze", "CUARTOS DE FINAL COPA B T13");
agregarResultado("Nacho Soto", "4-12", "Jhose", "CUARTOS DE FINAL COPA B T13");
agregarResultado("Jhose", "12-4", "Nacho Soto", "CUARTOS DE FINAL COPA B T13");
agregarResultado("Jhose", "10-11", "Eze", "SEMIFINAL COPA B T13");
agregarResultado("Eze", "11-10", "Jhose", "SEMIFINAL COPA B T13");
agregarResultado("Tomas Delgado", "12-15", "Luciano Hufschmid", "SEMIFINAL COPA B T13");
agregarResultado("Luciano Hufschmid", "15-12", "Tomas Delgado", "SEMIFINAL COPA B T13");
agregarResultado("Luciano Hufschmid", "5-9", "Eze", "FINAL COPA B T13");
agregarResultado("Eze", "9-5", "Luciano Hufschmid", "FINAL COPA B T13");
agregarResultado("Yago", "6-12", "Nico Luchetti (R)", "OCTAVOS DE FINAL COPA C T13");
agregarResultado("Nico Luchetti (R)", "12-6", "Yago", "OCTAVOS DE FINAL COPA C T13");
agregarResultado("Dani Bazan", "12-7", "Bautista Coria", "OCTAVOS DE FINAL COPA C T13");
agregarResultado("Bautista Coria", "7-12", "Dani Bazan", "OCTAVOS DE FINAL COPA C T13");
agregarResultado("Martin Bustos", "5-9", "Renzo Badano", "OCTAVOS DE FINAL COPA C T13");
agregarResultado("Renzo Badano", "9-5", "Martin Bustos", "OCTAVOS DE FINAL COPA C T13");
agregarResultado("Pollo", "11-7", "Leandro Montes", "OCTAVOS DE FINAL COPA C T13");
agregarResultado("Leandro Montes", "7-11", "Pollo", "OCTAVOS DE FINAL COPA C T13");
agregarResultado("Joel Alcalde", "11-9", "Renzo Badano", "CUARTOS DE FINAL COPA C T13");
agregarResultado("Renzo Badano", "9-11", "Joel Alcalde", "CUARTOS DE FINAL COPA C T13");
agregarResultado("Azul Quispe", "8-6", "Nico Luchetti (R)", "CUARTOS DE FINAL COPA C T13");
agregarResultado("Nico Luchetti (R)", "6-8", "Azul Quispe", "CUARTOS DE FINAL COPA C T13");
agregarResultado("Matias Varela", "7-10", "Pollo", "CUARTOS DE FINAL COPA C T13");
agregarResultado("Pollo", "10-7", "Matias Varela", "CUARTOS DE FINAL COPA C T13");
agregarResultado("Cami", "9-11", "Dani Bazan", "CUARTOS DE FINAL COPA C T13");
agregarResultado("Dani Bazan", "11-9", "Cami", "CUARTOS DE FINAL COPA C T13");
agregarResultado("Dani Bazan", "12-9", "Joel Alcalde", "SEMIFINAL COPA C T13");
agregarResultado("Joel Alcalde", "9-12", "Dani Bazan", "SEMIFINAL COPA C T13");
agregarResultado("Pollo", "8-8", "Azul Quispe", "SEMIFINAL COPA C T13");
agregarResultado("Azul Quispe", "8-8", "Pollo", "SEMIFINAL COPA C T13");
agregarResultado("Pollo", "4-4", "Azul Quispe", "DESEMPATE SEMIFINAL COPA C T13");
agregarResultado("Azul Quispe", "4-4", "Pollo", "DESEMPATE SEMIFINAL COPA C T13");
agregarResultado("Pollo", "5-3", "Azul Quispe", "DESEMPATE 2 SEMIFINAL COPA C T13");
agregarResultado("Azul Quispe", "3-5", "Pollo", "DESEMPATE 2 SEMIFINAL COPA C T13");
agregarResultado("Dani Bazan", "9-11", "Pollo", "FINAL COPA C T13");
agregarResultado("Pollo", "11-9", "Dani Bazan", "FINAL COPA C T13");
agregarResultado("Ignacio Cejas", "2-3", "Joel Marasco", "FASE DE GRUPOS COPA TOTAL T13");
agregarResultado("Joel Marasco", "3-2", "Ignacio Cejas", "FASE DE GRUPOS COPA TOTAL T13");
agregarResultado("Gabriel Talarico", "2-3", "Dani Bazan", "FASE DE GRUPOS COPA TOTAL T13");
agregarResultado("Dani Bazan", "3-2", "Gabriel Talarico", "FASE DE GRUPOS COPA TOTAL T13");
agregarResultado("Azul Quispe", "1-3", "Lucas Aguilera", "FASE DE GRUPOS COPA TOTAL T13");
agregarResultado("Lucas Aguilera", "3-1", "Azul Quispe", "FASE DE GRUPOS COPA TOTAL T13");
agregarResultado("Nahuel Scocier", "5-3", "Nacho Soto", "FASE DE GRUPOS COPA TOTAL T13");
agregarResultado("Nacho Soto", "3-5", "Nahuel Scocier", "FASE DE GRUPOS COPA TOTAL T13");
agregarResultado("Matias Varela", "3-3", "Lucas Insua", "FASE DE GRUPOS COPA TOTAL T13");
agregarResultado("Lucas Insua", "3-3", "Matias Varela", "FASE DE GRUPOS COPA TOTAL T13");
agregarResultado("Lautaro Scocier", "1-2", "Facundo Marchese", "FASE DE GRUPOS COPA TOTAL T13");
agregarResultado("Facundo Marchese", "2-1", "Lautaro Scocier", "FASE DE GRUPOS COPA TOTAL T13");
agregarResultado("Franco Przepiorka", "0-3", "Ian Gangai", "FASE DE GRUPOS COPA TOTAL T13");
agregarResultado("Ian Gangai", "3-0", "Franco Przepiorka", "FASE DE GRUPOS COPA TOTAL T13");
agregarResultado("Tomas Delgado", "3-4", "Joel Alcalde", "FASE DE GRUPOS COPA TOTAL T13");
agregarResultado("Joel Alcalde", "4-3", "Tomas Delgado", "FASE DE GRUPOS COPA TOTAL T13");
agregarResultado("Pollo", "3-6", "Nico Avalos", "FASE DE GRUPOS COPA TOTAL T13");
agregarResultado("Nico Avalos", "6-3", "Pollo", "FASE DE GRUPOS COPA TOTAL T13");
agregarResultado("Rodrigo Talarico", "4-2", "Axel", "FASE DE GRUPOS COPA TOTAL T13");
agregarResultado("Axel", "2-4", "Rodrigo Talarico", "FASE DE GRUPOS COPA TOTAL T13");
agregarResultado("Bautista Coria", "3-3", "Fabrizio Escolano", "FASE DE GRUPOS COPA TOTAL T13");
agregarResultado("Fabrizio Escolano", "3-3", "Bautista Coria", "FASE DE GRUPOS COPA TOTAL T13");
agregarResultado("Eze", "5-0", "Joaquin Sampadaro", "FASE DE GRUPOS COPA TOTAL T13");
agregarResultado("Joaquin Sampadaro", "0-5", "Eze", "FASE DE GRUPOS COPA TOTAL T13");
agregarResultado("Leandro Montes", "3-4", "Kevin Sivori", "FASE DE GRUPOS COPA TOTAL T13");
agregarResultado("Kevin Sivori", "4-3", "Leandro Montes", "FASE DE GRUPOS COPA TOTAL T13");
agregarResultado("Ramiro Vita", "0-1", "Santi", "FASE DE GRUPOS COPA TOTAL T13");
agregarResultado("Santi", "1-0", "Ramiro Vita", "FASE DE GRUPOS COPA TOTAL T13");
agregarResultado("Kraiizer", "0-3", "Moreno Perez", "FASE DE GRUPOS COPA TOTAL T13");
agregarResultado("Moreno Perez", "3-0", "Kraiizer", "FASE DE GRUPOS COPA TOTAL T13");
agregarResultado("Felipe Galante", "3-5", "Nico Luchetti (R)", "FASE DE GRUPOS COPA TOTAL T13");
agregarResultado("Nico Luchetti (R)", "5-3", "Felipe Galante", "FASE DE GRUPOS COPA TOTAL T13");
agregarResultado("Yago", "3-1", "Matheo Olivera", "FASE DE GRUPOS COPA TOTAL T13");
agregarResultado("Matheo Olivera", "1-3", "Yago", "FASE DE GRUPOS COPA TOTAL T13");
agregarResultado("Martin Bustos", "1-3", "Benja", "FASE DE GRUPOS COPA TOTAL T13");
agregarResultado("Benja", "3-1", "Martin Bustos", "FASE DE GRUPOS COPA TOTAL T13");
agregarResultado("Rodrigo Soca", "3-0", "Valentina Scocier", "FASE DE GRUPOS COPA TOTAL T13");
agregarResultado("Valentina Scocier", "0-3", "Rodrigo Soca", "FASE DE GRUPOS COPA TOTAL T13");
agregarResultado("Luciano Hufschmid", "4-0", "Renzo Badano", "FASE DE GRUPOS COPA TOTAL T13");
agregarResultado("Renzo Badano", "0-4", "Luciano Hufschmid", "FASE DE GRUPOS COPA TOTAL T13");
agregarResultado("Cami", "5-5", "Pancho Muzzio", "FASE DE GRUPOS COPA TOTAL T13");
agregarResultado("Pancho Muzzio", "5-5", "Cami", "FASE DE GRUPOS COPA TOTAL T13");
agregarResultado("Gonzalo Nuñez", "6-2", "Gabriel Talarico", "FASE DE GRUPOS COPA TOTAL T13");
agregarResultado("Gabriel Talarico", "2-6", "Gonzalo Nuñez", "FASE DE GRUPOS COPA TOTAL T13");
agregarResultado("Dani Bazan", "2-0", "Ignacio Cejas", "FASE DE GRUPOS COPA TOTAL T13");
agregarResultado("Ignacio Cejas", "0-2", "Dani Bazan", "FASE DE GRUPOS COPA TOTAL T13");
agregarResultado("Alexis Segovia", "2-2", "Nahuel Scocier", "FASE DE GRUPOS COPA TOTAL T13");
agregarResultado("Nahuel Scocier", "2-2", "Alexis Segovia", "FASE DE GRUPOS COPA TOTAL T13");
agregarResultado("Nacho Soto", "4-2", "Azul Quispe", "FASE DE GRUPOS COPA TOTAL T13");
agregarResultado("Azul Quispe", "2-4", "Nacho Soto", "FASE DE GRUPOS COPA TOTAL T13");
agregarResultado("Natanael", "2-3", "Lautaro Scocier", "FASE DE GRUPOS COPA TOTAL T13");
agregarResultado("Lautaro Scocier", "3-2", "Natanael", "FASE DE GRUPOS COPA TOTAL T13");
agregarResultado("Facundo Marchese", "2-4", "Matias Varela", "FASE DE GRUPOS COPA TOTAL T13");
agregarResultado("Matias Varela", "4-2", "Facundo Marchese", "FASE DE GRUPOS COPA TOTAL T13");
agregarResultado("Anubis", "1-6", "Tomas Delgado", "FASE DE GRUPOS COPA TOTAL T13");
agregarResultado("Tomas Delgado", "6-1", "Anubis", "FASE DE GRUPOS COPA TOTAL T13");
agregarResultado("Joel Alcalde", "6-0", "Franco Przepiorka", "FASE DE GRUPOS COPA TOTAL T13");
agregarResultado("Franco Przepiorka", "0-6", "Joel Alcalde", "FASE DE GRUPOS COPA TOTAL T13");
agregarResultado("Mario Talarico", "2-5", "Rodrigo Talarico", "FASE DE GRUPOS COPA TOTAL T13");
agregarResultado("Rodrigo Talarico", "5-2", "Mario Talarico", "FASE DE GRUPOS COPA TOTAL T13");
agregarResultado("Axel", "2-3", "Pollo", "FASE DE GRUPOS COPA TOTAL T13");
agregarResultado("Pollo", "3-2", "Axel", "FASE DE GRUPOS COPA TOTAL T13");
agregarResultado("Jhose", "3-2", "Eze", "FASE DE GRUPOS COPA TOTAL T13");
agregarResultado("Eze", "2-3", "Jhose", "FASE DE GRUPOS COPA TOTAL T13");
agregarResultado("Joaquin Sampadaro", "5-1", "Bautista Coria", "FASE DE GRUPOS COPA TOTAL T13");
agregarResultado("Bautista Coria", "1-5", "Joaquin Sampadaro", "FASE DE GRUPOS COPA TOTAL T13");
agregarResultado("Tomas Torcasio", "3-0", "Ramiro Vita", "FASE DE GRUPOS COPA TOTAL T13");
agregarResultado("Ramiro Vita", "0-3", "Tomas Torcasio", "FASE DE GRUPOS COPA TOTAL T13");
agregarResultado("Santi", "1-3", "Leandro Montes", "FASE DE GRUPOS COPA TOTAL T13");
agregarResultado("Leandro Montes", "3-1", "Santi", "FASE DE GRUPOS COPA TOTAL T13");
agregarResultado("Bruno Alonso", "1-2", "Felipe Galante", "FASE DE GRUPOS COPA TOTAL T13");
agregarResultado("Felipe Galante", "2-1", "Bruno Alonso", "FASE DE GRUPOS COPA TOTAL T13");
agregarResultado("Nico Luchetti (R)", "5-0", "Kraiizer", "FASE DE GRUPOS COPA TOTAL T13");
agregarResultado("Kraiizer", "0-5", "Nico Luchetti (R)", "FASE DE GRUPOS COPA TOTAL T13");
agregarResultado("Rodri Sebastian", "3-4", "Martin Bustos", "FASE DE GRUPOS COPA TOTAL T13");
agregarResultado("Martin Bustos", "4-3", "Rodri Sebastian", "FASE DE GRUPOS COPA TOTAL T13");
agregarResultado("Benja", "2-2", "Yago", "FASE DE GRUPOS COPA TOTAL T13");
agregarResultado("Yago", "2-2", "Benja", "FASE DE GRUPOS COPA TOTAL T13");
agregarResultado("Renzo Badano", "4-6", "Rodrigo Soca", "FASE DE GRUPOS COPA TOTAL T13");
agregarResultado("Rodrigo Soca", "6-4", "Renzo Badano", "FASE DE GRUPOS COPA TOTAL T13");
agregarResultado("Pancho Muzzio", "2-0", "Valentina Scocier", "FASE DE GRUPOS COPA TOTAL T13");
agregarResultado("Valentina Scocier", "0-2", "Pancho Muzzio", "FASE DE GRUPOS COPA TOTAL T13");
agregarResultado("Cami", "1-5", "Luciano Hufschmid", "FASE DE GRUPOS COPA TOTAL T13");
agregarResultado("Luciano Hufschmid", "5-1", "Cami", "FASE DE GRUPOS COPA TOTAL T13");
agregarResultado("Dani Bazan", "1-0", "Joel Marasco", "FASE DE GRUPOS COPA TOTAL T13");
agregarResultado("Joel Marasco", "0-1", "Dani Bazan", "FASE DE GRUPOS COPA TOTAL T13");
agregarResultado("Gonzalo Nuñez", "1-1", "Ignacio Cejas", "FASE DE GRUPOS COPA TOTAL T13");
agregarResultado("Ignacio Cejas", "1-1", "Gonzalo Nuñez", "FASE DE GRUPOS COPA TOTAL T13");
agregarResultado("GRUPO 2", "NaN-NaN", "", "FASE DE GRUPOS COPA TOTAL T13");
agregarResultado("", "NaN-NaN", "GRUPO 2", "FASE DE GRUPOS COPA TOTAL T13");
agregarResultado("Nacho Soto", "1-3", "Lucas Aguilera", "FASE DE GRUPOS COPA TOTAL T13");
agregarResultado("Lucas Aguilera", "3-1", "Nacho Soto", "FASE DE GRUPOS COPA TOTAL T13");
agregarResultado("Alexis Segovia", "2-2", "Azul Quispe", "FASE DE GRUPOS COPA TOTAL T13");
agregarResultado("Azul Quispe", "2-2", "Alexis Segovia", "FASE DE GRUPOS COPA TOTAL T13");
agregarResultado("Facundo Marchese", "4-6", "Lucas Insua", "FASE DE GRUPOS COPA TOTAL T13");
agregarResultado("Lucas Insua", "6-4", "Facundo Marchese", "FASE DE GRUPOS COPA TOTAL T13");
agregarResultado("Natanael", "0-0", "Matias Varela", "FASE DE GRUPOS COPA TOTAL T13");
agregarResultado("Matias Varela", "0-0", "Natanael", "FASE DE GRUPOS COPA TOTAL T13");
agregarResultado("Joel Alcalde", "1-5", "Ian Gangai", "FASE DE GRUPOS COPA TOTAL T13");
agregarResultado("Ian Gangai", "5-1", "Joel Alcalde", "FASE DE GRUPOS COPA TOTAL T13");
agregarResultado("Anubis", "1-0", "Franco Przepiorka", "FASE DE GRUPOS COPA TOTAL T13");
agregarResultado("Franco Przepiorka", "0-1", "Anubis", "FASE DE GRUPOS COPA TOTAL T13");
agregarResultado("Axel", "2-1", "Nico Avalos", "FASE DE GRUPOS COPA TOTAL T13");
agregarResultado("Nico Avalos", "1-2", "Axel", "FASE DE GRUPOS COPA TOTAL T13");
agregarResultado("Mario Talarico", "0-5", "Pollo", "FASE DE GRUPOS COPA TOTAL T13");
agregarResultado("Pollo", "5-0", "Mario Talarico", "FASE DE GRUPOS COPA TOTAL T13");
agregarResultado("Joaquin Sampadaro", "0-1", "Fabrizio Escolano", "FASE DE GRUPOS COPA TOTAL T13");
agregarResultado("Fabrizio Escolano", "1-0", "Joaquin Sampadaro", "FASE DE GRUPOS COPA TOTAL T13");
agregarResultado("Jhose", "3-0", "Bautista Coria", "FASE DE GRUPOS COPA TOTAL T13");
agregarResultado("Bautista Coria", "0-3", "Jhose", "FASE DE GRUPOS COPA TOTAL T13");
agregarResultado("Santi", "3-3", "Kevin Sivori", "FASE DE GRUPOS COPA TOTAL T13");
agregarResultado("Kevin Sivori", "3-3", "Santi", "FASE DE GRUPOS COPA TOTAL T13");
agregarResultado("Tomas Torcasio", "3-0", "Leandro Montes", "FASE DE GRUPOS COPA TOTAL T13");
agregarResultado("Leandro Montes", "0-3", "Tomas Torcasio", "FASE DE GRUPOS COPA TOTAL T13");
agregarResultado("Nico Luchetti (R)", "0-4", "Moreno Perez", "FASE DE GRUPOS COPA TOTAL T13");
agregarResultado("Moreno Perez", "4-0", "Nico Luchetti (R)", "FASE DE GRUPOS COPA TOTAL T13");
agregarResultado("Bruno Alonso", "2-0", "Kraiizer", "FASE DE GRUPOS COPA TOTAL T13");
agregarResultado("Kraiizer", "0-2", "Bruno Alonso", "FASE DE GRUPOS COPA TOTAL T13");
agregarResultado("Benja", "0-0", "Matheo Olivera", "FASE DE GRUPOS COPA TOTAL T13");
agregarResultado("Matheo Olivera", "0-0", "Benja", "FASE DE GRUPOS COPA TOTAL T13");
agregarResultado("Rodri Sebastian", "1-0", "Yago", "FASE DE GRUPOS COPA TOTAL T13");
agregarResultado("Yago", "0-1", "Rodri Sebastian", "FASE DE GRUPOS COPA TOTAL T13");
agregarResultado("Rodrigo Soca", "2-0", "Pancho Muzzio", "FASE DE GRUPOS COPA TOTAL T13");
agregarResultado("Pancho Muzzio", "0-2", "Rodrigo Soca", "FASE DE GRUPOS COPA TOTAL T13");
agregarResultado("Renzo Badano", "0-2", "Cami", "FASE DE GRUPOS COPA TOTAL T13");
agregarResultado("Cami", "2-0", "Renzo Badano", "FASE DE GRUPOS COPA TOTAL T13");
agregarResultado("Valentina Scocier", "0-2", "Luciano Hufschmid", "FASE DE GRUPOS COPA TOTAL T13");
agregarResultado("Luciano Hufschmid", "2-0", "Valentina Scocier", "FASE DE GRUPOS COPA TOTAL T13");
agregarResultado("Ignacio Cejas", "1-3", "Gabriel Talarico", "FASE DE GRUPOS COPA TOTAL T13");
agregarResultado("Gabriel Talarico", "3-1", "Ignacio Cejas", "FASE DE GRUPOS COPA TOTAL T13");
agregarResultado("Joel Marasco", "2-2", "Gonzalo Nuñez", "FASE DE GRUPOS COPA TOTAL T13");
agregarResultado("Gonzalo Nuñez", "2-2", "Joel Marasco", "FASE DE GRUPOS COPA TOTAL T13");
agregarResultado("Azul Quispe", "4-0", "Nahuel Scocier", "FASE DE GRUPOS COPA TOTAL T13");
agregarResultado("Nahuel Scocier", "0-4", "Azul Quispe", "FASE DE GRUPOS COPA TOTAL T13");
agregarResultado("Lucas Aguilera", "4-2", "Alexis Segovia", "FASE DE GRUPOS COPA TOTAL T13");
agregarResultado("Alexis Segovia", "2-4", "Lucas Aguilera", "FASE DE GRUPOS COPA TOTAL T13");
agregarResultado("Matias Varela", "3-4", "Lautaro Scocier", "FASE DE GRUPOS COPA TOTAL T13");
agregarResultado("Lautaro Scocier", "4-3", "Matias Varela", "FASE DE GRUPOS COPA TOTAL T13");
agregarResultado("Lucas Insua", "1-4", "Natanael", "FASE DE GRUPOS COPA TOTAL T13");
agregarResultado("Natanael", "4-1", "Lucas Insua", "FASE DE GRUPOS COPA TOTAL T13");
agregarResultado("Franco Przepiorka", "0-4", "Tomas Delgado", "FASE DE GRUPOS COPA TOTAL T13");
agregarResultado("Tomas Delgado", "4-0", "Franco Przepiorka", "FASE DE GRUPOS COPA TOTAL T13");
agregarResultado("Ian Gangai", "1-2", "Anubis", "FASE DE GRUPOS COPA TOTAL T13");
agregarResultado("Anubis", "2-1", "Ian Gangai", "FASE DE GRUPOS COPA TOTAL T13");
agregarResultado("Pollo", "1-1", "Rodrigo Talarico", "FASE DE GRUPOS COPA TOTAL T13");
agregarResultado("Rodrigo Talarico", "1-1", "Pollo", "FASE DE GRUPOS COPA TOTAL T13");
agregarResultado("Nico Avalos", "6-2", "Mario Talarico", "FASE DE GRUPOS COPA TOTAL T13");
agregarResultado("Mario Talarico", "2-6", "Nico Avalos", "FASE DE GRUPOS COPA TOTAL T13");
agregarResultado("Bautista Coria", "2-3", "Eze", "FASE DE GRUPOS COPA TOTAL T13");
agregarResultado("Eze", "3-2", "Bautista Coria", "FASE DE GRUPOS COPA TOTAL T13");
agregarResultado("Fabrizio Escolano", "2-3", "Jhose", "FASE DE GRUPOS COPA TOTAL T13");
agregarResultado("Jhose", "3-2", "Fabrizio Escolano", "FASE DE GRUPOS COPA TOTAL T13");
agregarResultado("Leandro Montes", "1-3", "Ramiro Vita", "FASE DE GRUPOS COPA TOTAL T13");
agregarResultado("Ramiro Vita", "3-1", "Leandro Montes", "FASE DE GRUPOS COPA TOTAL T13");
agregarResultado("Kevin Sivori", "4-4", "Tomas Torcasio", "FASE DE GRUPOS COPA TOTAL T13");
agregarResultado("Tomas Torcasio", "4-4", "Kevin Sivori", "FASE DE GRUPOS COPA TOTAL T13");
agregarResultado("Kraiizer", "2-2", "Felipe Galante", "FASE DE GRUPOS COPA TOTAL T13");
agregarResultado("Felipe Galante", "2-2", "Kraiizer", "FASE DE GRUPOS COPA TOTAL T13");
agregarResultado("Moreno Perez", "5-2", "Bruno Alonso", "FASE DE GRUPOS COPA TOTAL T13");
agregarResultado("Bruno Alonso", "2-5", "Moreno Perez", "FASE DE GRUPOS COPA TOTAL T13");
agregarResultado("Yago", "3-4", "Martin Bustos", "FASE DE GRUPOS COPA TOTAL T13");
agregarResultado("Martin Bustos", "4-3", "Yago", "FASE DE GRUPOS COPA TOTAL T13");
agregarResultado("Matheo Olivera", "2-0", "Rodri Sebastian", "FASE DE GRUPOS COPA TOTAL T13");
agregarResultado("Rodri Sebastian", "0-2", "Matheo Olivera", "FASE DE GRUPOS COPA TOTAL T13");
agregarResultado("Cami", "2-4", "Rodrigo Soca", "FASE DE GRUPOS COPA TOTAL T13");
agregarResultado("Rodrigo Soca", "4-2", "Cami", "FASE DE GRUPOS COPA TOTAL T13");
agregarResultado("Luciano Hufschmid", "3-4", "Pancho Muzzio", "FASE DE GRUPOS COPA TOTAL T13");
agregarResultado("Pancho Muzzio", "4-3", "Luciano Hufschmid", "FASE DE GRUPOS COPA TOTAL T13");
agregarResultado("Valentina Scocier", "1-3", "Renzo Badano", "FASE DE GRUPOS COPA TOTAL T13");
agregarResultado("Renzo Badano", "3-1", "Valentina Scocier", "FASE DE GRUPOS COPA TOTAL T13");
agregarResultado("Gonzalo Nuñez", "2-1", "Dani Bazan", "FASE DE GRUPOS COPA TOTAL T13");
agregarResultado("Dani Bazan", "1-2", "Gonzalo Nuñez", "FASE DE GRUPOS COPA TOTAL T13");
agregarResultado("Gabriel Talarico", "1-5", "Joel Marasco", "FASE DE GRUPOS COPA TOTAL T13");
agregarResultado("Joel Marasco", "5-1", "Gabriel Talarico", "FASE DE GRUPOS COPA TOTAL T13");
agregarResultado("Alexis Segovia", "0-3", "Nacho Soto", "FASE DE GRUPOS COPA TOTAL T13");
agregarResultado("Nacho Soto", "3-0", "Alexis Segovia", "FASE DE GRUPOS COPA TOTAL T13");
agregarResultado("Nahuel Scocier", "0-2", "Lucas Aguilera", "FASE DE GRUPOS COPA TOTAL T13");
agregarResultado("Lucas Aguilera", "2-0", "Nahuel Scocier", "FASE DE GRUPOS COPA TOTAL T13");
agregarResultado("Natanael", "3-5", "Facundo Marchese", "FASE DE GRUPOS COPA TOTAL T13");
agregarResultado("Facundo Marchese", "5-3", "Natanael", "FASE DE GRUPOS COPA TOTAL T13");
agregarResultado("Lautaro Scocier", "1-4", "Lucas Insua", "FASE DE GRUPOS COPA TOTAL T13");
agregarResultado("Lucas Insua", "4-1", "Lautaro Scocier", "FASE DE GRUPOS COPA TOTAL T13");
agregarResultado("Anubis", "3-2", "Joel Alcalde", "FASE DE GRUPOS COPA TOTAL T13");
agregarResultado("Joel Alcalde", "2-3", "Anubis", "FASE DE GRUPOS COPA TOTAL T13");
agregarResultado("Tomas Delgado", "0-2", "Ian Gangai", "FASE DE GRUPOS COPA TOTAL T13");
agregarResultado("Ian Gangai", "2-0", "Tomas Delgado", "FASE DE GRUPOS COPA TOTAL T13");
agregarResultado("Mario Talarico", "1-0", "Axel", "FASE DE GRUPOS COPA TOTAL T13");
agregarResultado("Axel", "0-1", "Mario Talarico", "FASE DE GRUPOS COPA TOTAL T13");
agregarResultado("Rodrigo Talarico", "1-4", "Nico Avalos", "FASE DE GRUPOS COPA TOTAL T13");
agregarResultado("Nico Avalos", "4-1", "Rodrigo Talarico", "FASE DE GRUPOS COPA TOTAL T13");
agregarResultado("Jhose", "1-2", "Joaquin Sampadaro", "FASE DE GRUPOS COPA TOTAL T13");
agregarResultado("Joaquin Sampadaro", "2-1", "Jhose", "FASE DE GRUPOS COPA TOTAL T13");
agregarResultado("Eze", "8-2", "Fabrizio Escolano", "FASE DE GRUPOS COPA TOTAL T13");
agregarResultado("Fabrizio Escolano", "2-8", "Eze", "FASE DE GRUPOS COPA TOTAL T13");
agregarResultado("Tomas Torcasio", "1-1", "Santi", "FASE DE GRUPOS COPA TOTAL T13");
agregarResultado("Santi", "1-1", "Tomas Torcasio", "FASE DE GRUPOS COPA TOTAL T13");
agregarResultado("Ramiro Vita", "1-7", "Kevin Sivori", "FASE DE GRUPOS COPA TOTAL T13");
agregarResultado("Kevin Sivori", "7-1", "Ramiro Vita", "FASE DE GRUPOS COPA TOTAL T13");
agregarResultado("Bruno Alonso", "3-5", "Nico Luchetti (R)", "FASE DE GRUPOS COPA TOTAL T13");
agregarResultado("Nico Luchetti (R)", "5-3", "Bruno Alonso", "FASE DE GRUPOS COPA TOTAL T13");
agregarResultado("Felipe Galante", "0-7", "Moreno Perez", "FASE DE GRUPOS COPA TOTAL T13");
agregarResultado("Moreno Perez", "7-0", "Felipe Galante", "FASE DE GRUPOS COPA TOTAL T13");
agregarResultado("Rodri Sebastian", "0-1", "Benja", "FASE DE GRUPOS COPA TOTAL T13");
agregarResultado("Benja", "1-0", "Rodri Sebastian", "FASE DE GRUPOS COPA TOTAL T13");
agregarResultado("Martin Bustos", "2-2", "Matheo Olivera", "FASE DE GRUPOS COPA TOTAL T13");
agregarResultado("Matheo Olivera", "2-2", "Martin Bustos", "FASE DE GRUPOS COPA TOTAL T13");
agregarResultado("Rodrigo Soca", "4-1", "Luciano Hufschmid", "FASE DE GRUPOS COPA TOTAL T13");
agregarResultado("Luciano Hufschmid", "1-4", "Rodrigo Soca", "FASE DE GRUPOS COPA TOTAL T13");
agregarResultado("Cami", "1-0", "Valentina Scocier", "FASE DE GRUPOS COPA TOTAL T13");
agregarResultado("Valentina Scocier", "0-1", "Cami", "FASE DE GRUPOS COPA TOTAL T13");
agregarResultado("Pancho Muzzio", "2-2", "Renzo Badano", "FASE DE GRUPOS COPA TOTAL T13");
agregarResultado("Renzo Badano", "2-2", "Pancho Muzzio", "FASE DE GRUPOS COPA TOTAL T13");
agregarResultado("Luciano Hufschmid", "4-9", "Kevin Sivori", "OCTAVOS DE FINAL COPA TOTAL T13");
agregarResultado("Kevin Sivori", "9-4", "Luciano Hufschmid", "OCTAVOS DE FINAL COPA TOTAL T13");
agregarResultado("Nico Avalos", "7-12", "Anubis", "OCTAVOS DE FINAL COPA TOTAL T13");
agregarResultado("Anubis", "12-7", "Nico Avalos", "OCTAVOS DE FINAL COPA TOTAL T13");
agregarResultado("Lucas Aguilera", "5-9", "Lucas Insua", "OCTAVOS DE FINAL COPA TOTAL T13");
agregarResultado("Lucas Insua", "9-5", "Lucas Aguilera", "OCTAVOS DE FINAL COPA TOTAL T13");
agregarResultado("Jhose", "14-12", "Dani Bazan", "OCTAVOS DE FINAL COPA TOTAL T13");
agregarResultado("Dani Bazan", "12-14", "Jhose", "OCTAVOS DE FINAL COPA TOTAL T13");
agregarResultado("Gonzalo Nuñez", "4-9", "Tomas Torcasio", "OCTAVOS DE FINAL COPA TOTAL T13");
agregarResultado("Tomas Torcasio", "9-4", "Gonzalo Nuñez", "OCTAVOS DE FINAL COPA TOTAL T13");
agregarResultado("Ian Gangai", "8-6", "Benja", "OCTAVOS DE FINAL COPA TOTAL T13");
agregarResultado("Benja", "6-8", "Ian Gangai", "OCTAVOS DE FINAL COPA TOTAL T13");
agregarResultado("Eze", "10-12", "Rodrigo Soca", "OCTAVOS DE FINAL COPA TOTAL T13");
agregarResultado("Rodrigo Soca", "12-10", "Eze", "OCTAVOS DE FINAL COPA TOTAL T13");
agregarResultado("Moreno Perez", "10-12", "Nico Luchetti (R)", "OCTAVOS DE FINAL COPA TOTAL T13");
agregarResultado("Nico Luchetti (R)", "12-10", "Moreno Perez", "OCTAVOS DE FINAL COPA TOTAL T13");
agregarResultado("Lucas Insua", "10-11", "Rodrigo Soca", "CUARTOS DE FINAL COPA TOTAL T13");
agregarResultado("Rodrigo Soca", "11-10", "Lucas Insua", "CUARTOS DE FINAL COPA TOTAL T13");
agregarResultado("Jhose", "12-5", "Kevin Sivori", "CUARTOS DE FINAL COPA TOTAL T13");
agregarResultado("Kevin Sivori", "5-12", "Jhose", "CUARTOS DE FINAL COPA TOTAL T13");
agregarResultado("Nico Luchetti (R)", "6-8", "Tomas Torcasio", "CUARTOS DE FINAL COPA TOTAL T13");
agregarResultado("Tomas Torcasio", "8-6", "Nico Luchetti (R)", "CUARTOS DE FINAL COPA TOTAL T13");
agregarResultado("Anubis", "6-11", "Ian Gangai", "CUARTOS DE FINAL COPA TOTAL T13");
agregarResultado("Ian Gangai", "11-6", "Anubis", "CUARTOS DE FINAL COPA TOTAL T13");
agregarResultado("Tomas Torcasio", "6-7", "Ian Gangai", "SEMIFINAL COPA TOTAL T13");
agregarResultado("Ian Gangai", "7-6", "Tomas Torcasio", "SEMIFINAL COPA TOTAL T13");
agregarResultado("Jhose", "10-4", "Rodrigo Soca", "SEMIFINAL COPA TOTAL T13");
agregarResultado("Rodrigo Soca", "4-10", "Jhose", "SEMIFINAL COPA TOTAL T13");
agregarResultado("Ian Gangai", "10-6", "Jhose", "FINAL COPA TOTAL T13");
agregarResultado("Jhose", "6-10", "Ian Gangai", "FINAL COPA TOTAL T13");
agregarResultado("Pancho Muzzio", "7-9", "Lucas Insua", "32AVOS DE FINAL COPA CAMPEONES T13");
agregarResultado("Lucas Insua", "9-7", "Pancho Muzzio", "32AVOS DE FINAL COPA CAMPEONES T13");
agregarResultado("Nico Avalos", "10-10", "Moreno Perez", "32AVOS DE FINAL COPA CAMPEONES T13");
agregarResultado("Moreno Perez", "10-10", "Nico Avalos", "32AVOS DE FINAL COPA CAMPEONES T13");
agregarResultado("Nico Avalos", "3-5", "Moreno Perez", "DESEMPATE 32AVOS DE FINAL COPA CAMPEONES T13");
agregarResultado("Moreno Perez", "5-3", "Nico Avalos", "DESEMPATE 32AVOS DE FINAL COPA CAMPEONES T13");
agregarResultado("Moreno Perez", "17-9", "Lucas Insua", "16AVOS DE FINAL COPA CAMPEONES T13");
agregarResultado("Lucas Insua", "9-17", "Moreno Perez", "16AVOS DE FINAL COPA CAMPEONES T13");
agregarResultado("Moreno Perez", "10-9", "Tomas Torcasio", "OCTAVOS DE FINAL COPA CAMPEONES T13");
agregarResultado("Tomas Torcasio", "9-10", "Moreno Perez", "OCTAVOS DE FINAL COPA CAMPEONES T13");
agregarResultado("Kevin Sivori", "9-8", "Ian Gangai", "OCTAVOS DE FINAL COPA CAMPEONES T13");
agregarResultado("Ian Gangai", "8-9", "Kevin Sivori", "OCTAVOS DE FINAL COPA CAMPEONES T13");
agregarResultado("Tomas Delgado", "10-7", "Matheo Olivera", "OCTAVOS DE FINAL COPA CAMPEONES T13");
agregarResultado("Matheo Olivera", "7-10", "Tomas Delgado", "OCTAVOS DE FINAL COPA CAMPEONES T13");
agregarResultado("Moreno Perez", "6-4", "Kevin Sivori", "CUARTOS DE FINAL COPA CAMPEONES T13");
agregarResultado("Kevin Sivori", "4-6", "Moreno Perez", "CUARTOS DE FINAL COPA CAMPEONES T13");
agregarResultado("Tomas Delgado", "12-11", "Fabrizio Escolano", "CUARTOS DE FINAL COPA CAMPEONES T13");
agregarResultado("Fabrizio Escolano", "11-12", "Tomas Delgado", "CUARTOS DE FINAL COPA CAMPEONES T13");
agregarResultado("Moreno Perez", "9-3", "Joel Marasco", "SEMIFINAL COPA CAMPEONES T13");
agregarResultado("Joel Marasco", "3-9", "Moreno Perez", "SEMIFINAL COPA CAMPEONES T13");
agregarResultado("Tomas Delgado", "12-13", "Gabriel Talarico", "SEMIFINAL COPA CAMPEONES T13");
agregarResultado("Gabriel Talarico", "13-12", "Tomas Delgado", "SEMIFINAL COPA CAMPEONES T13");
agregarResultado("Moreno Perez", "4-6", "Gabriel Talarico", "FINAL COPA CAMPEONES T13");
agregarResultado("Gabriel Talarico", "6-4", "Moreno Perez", "FINAL COPA CAMPEONES T13");
agregarResultado("Mario Talarico", "13-17", "Joel Alcalde", "FINAL COPA DUOS T13");
agregarResultado("Joel Alcalde", "17-13", "Mario Talarico", "FINAL COPA DUOS T13");
agregarResultado("Tomas Delgado", "13-17", "Dani Bazan", "FINAL COPA DUOS T13");
agregarResultado("Dani Bazan", "17-13", "Tomas Delgado", "FINAL COPA DUOS T13");
agregarResultado("Mario Talarico", "13-17", "Dani Bazan", "FINAL COPA DUOS T13");
agregarResultado("Dani Bazan", "17-13", "Mario Talarico", "FINAL COPA DUOS T13");
agregarResultado("Tomas Delgado", "13-17", "Joel Alcalde", "FINAL COPA DUOS T13");
agregarResultado("Joel Alcalde", "17-13", "Tomas Delgado", "FINAL COPA DUOS T13");
agregarResultado("Lucas Aguilera", "5-10", "Facundo Marchese", "PROMOCION 1RA DIVISION T13");
agregarResultado("Facundo Marchese", "10-5", "Lucas Aguilera", "PROMOCION 1RA DIVISION T13");
agregarResultado("Tomas Torcasio", "8-7", "Tomas Delgado", "PROMOCION 1RA DIVISION T13");
agregarResultado("Tomas Delgado", "7-8", "Tomas Torcasio", "PROMOCION 1RA DIVISION T13");
agregarResultado("Jhose", "6-7", "Renzo Badano", "PROMOCION 2DA DIVISION T13");
agregarResultado("Renzo Badano", "7-6", "Jhose", "PROMOCION 2DA DIVISION T13");
agregarResultado("Benja", "3-6", "Azul Quispe", "PROMOCION 2DA DIVISION T13");
agregarResultado("Azul Quispe", "6-3", "Benja", "PROMOCION 2DA DIVISION T13");
agregarResultado("Nacho Soto", "6-6", "Ian Gangai", "OCTAVOS DE FINAL COPA A T14");
agregarResultado("Ian Gangai", "6-6", "Nacho Soto", "OCTAVOS DE FINAL COPA A T14");
agregarResultado("Nico Avalos", "18-14", "Fabrizio Escolano", "OCTAVOS DE FINAL COPA A T14");
agregarResultado("Fabrizio Escolano", "14-18", "Nico Avalos", "OCTAVOS DE FINAL COPA A T14");
agregarResultado("Tomas Torcasio", "10-7", "Matheo Olivera", "OCTAVOS DE FINAL COPA A T14");
agregarResultado("Matheo Olivera", "7-10", "Tomas Torcasio", "OCTAVOS DE FINAL COPA A T14");
agregarResultado("Gabriel Talarico", "6-19", "Joel Marasco", "OCTAVOS DE FINAL COPA A T14");
agregarResultado("Joel Marasco", "19-6", "Gabriel Talarico", "OCTAVOS DE FINAL COPA A T14");
agregarResultado("Nacho Soto", "1-4", "Ian Gangai", "DESEMPATE OCTAVOS DE FINAL COPA A T14");
agregarResultado("Ian Gangai", "4-1", "Nacho Soto", "DESEMPATE OCTAVOS DE FINAL COPA A T14");
agregarResultado("Lucas Insua", "9-9", "Ian Gangai", "CUARTOS DE FINAL COPA A T14");
agregarResultado("Ian Gangai", "9-9", "Lucas Insua", "CUARTOS DE FINAL COPA A T14");
agregarResultado("Eze", "19-12", "Nico Avalos", "CUARTOS DE FINAL COPA A T14");
agregarResultado("Nico Avalos", "12-19", "Eze", "CUARTOS DE FINAL COPA A T14");
agregarResultado("Alexis Segovia", "14-6", "Tomas Torcasio", "CUARTOS DE FINAL COPA A T14");
agregarResultado("Tomas Torcasio", "6-14", "Alexis Segovia", "CUARTOS DE FINAL COPA A T14");
agregarResultado("Moreno Perez", "7-10", "Joel Marasco", "CUARTOS DE FINAL COPA A T14");
agregarResultado("Joel Marasco", "10-7", "Moreno Perez", "CUARTOS DE FINAL COPA A T14");
agregarResultado("Lucas Insua", "3-4", "Ian Gangai", "DESEMPATE CUARTOS DE FINAL COPA A T14");
agregarResultado("Ian Gangai", "4-3", "Lucas Insua", "DESEMPATE CUARTOS DE FINAL COPA A T14");
agregarResultado("Eze", "5-2", "Joel Marasco", "SEMIFINAL COPA A T14");
agregarResultado("Joel Marasco", "2-5", "Eze", "SEMIFINAL COPA A T14");
agregarResultado("Ian Gangai", "5-6", "Alexis Segovia", "SEMIFINAL COPA A T14");
agregarResultado("Alexis Segovia", "6-5", "Ian Gangai", "SEMIFINAL COPA A T14");
agregarResultado("Eze", "5-17", "Alexis Segovia", "FINAL COPA A T14");
agregarResultado("Alexis Segovia", "17-5", "Eze", "FINAL COPA A T14");
agregarResultado("Pollo", "9-8", "Gonzalo Nuñez", "OCTAVOS DE FINAL COPA B T14");
agregarResultado("Gonzalo Nuñez", "8-9", "Pollo", "OCTAVOS DE FINAL COPA B T14");
agregarResultado("Renzo Badano", "11-9", "Ignacio Cejas", "OCTAVOS DE FINAL COPA B T14");
agregarResultado("Ignacio Cejas", "9-11", "Renzo Badano", "OCTAVOS DE FINAL COPA B T14");
agregarResultado("Azul Quispe", "11-6", "Ramiro Vita", "OCTAVOS DE FINAL COPA B T14");
agregarResultado("Ramiro Vita", "6-11", "Azul Quispe", "OCTAVOS DE FINAL COPA B T14");
agregarResultado("Rodrigo Talarico", "6-9", "Tomas Delgado", "OCTAVOS DE FINAL COPA B T14");
agregarResultado("Tomas Delgado", "9-6", "Rodrigo Talarico", "OCTAVOS DE FINAL COPA B T14");
agregarResultado("Rodrigo Soca", "7-8", "Pollo", "CUARTOS DE FINAL COPA B T14");
agregarResultado("Pollo", "8-7", "Rodrigo Soca", "CUARTOS DE FINAL COPA B T14");
agregarResultado("Lucas Aguilera", "5-14", "Renzo Badano", "CUARTOS DE FINAL COPA B T14");
agregarResultado("Renzo Badano", "14-5", "Lucas Aguilera", "CUARTOS DE FINAL COPA B T14");
agregarResultado("Joel Alcalde", "6-5", "Azul Quispe", "CUARTOS DE FINAL COPA B T14");
agregarResultado("Azul Quispe", "5-6", "Joel Alcalde", "CUARTOS DE FINAL COPA B T14");
agregarResultado("Yago", "13-9", "Tomas Delgado", "CUARTOS DE FINAL COPA B T14");
agregarResultado("Tomas Delgado", "9-13", "Yago", "CUARTOS DE FINAL COPA B T14");
agregarResultado("Pollo", "10-4", "Joel Alcalde", "SEMIFINAL COPA B T14");
agregarResultado("Joel Alcalde", "4-10", "Pollo", "SEMIFINAL COPA B T14");
agregarResultado("Renzo Badano", "6-5", "Yago", "SEMIFINAL COPA B T14");
agregarResultado("Yago", "5-6", "Renzo Badano", "SEMIFINAL COPA B T14");
agregarResultado("Pollo", "7-8", "Renzo Badano", "FINAL COPA B T14");
agregarResultado("Renzo Badano", "8-7", "Pollo", "FINAL COPA B T14");
agregarResultado("Martin Bustos", "0-8", "Jhose", "CUARTOS DE FINAL COPA C T14");
agregarResultado("Jhose", "8-0", "Martin Bustos", "CUARTOS DE FINAL COPA C T14");
agregarResultado("Kraiizer", "10-10", "Bautista Coria", "CUARTOS DE FINAL COPA C T14");
agregarResultado("Bautista Coria", "10-10", "Kraiizer", "CUARTOS DE FINAL COPA C T14");
agregarResultado("Cami", "9-13", "Benja", "CUARTOS DE FINAL COPA C T14");
agregarResultado("Benja", "13-9", "Cami", "CUARTOS DE FINAL COPA C T14");
agregarResultado("Nico Luchetti", "8-10", "Joaco Fernandez", "CUARTOS DE FINAL COPA C T14");
agregarResultado("Joaco Fernandez", "10-8", "Nico Luchetti", "CUARTOS DE FINAL COPA C T14");
agregarResultado("Kraiizer", "3-1", "Bautista Coria", "DESEMPATE CUARTOS DE FINAL COPA C T14");
agregarResultado("Bautista Coria", "1-3", "Kraiizer", "DESEMPATE CUARTOS DE FINAL COPA C T14");
agregarResultado("Kraiizer", "7-6", "Benja", "SEMIFINAL COPA C T14");
agregarResultado("Benja", "6-7", "Kraiizer", "SEMIFINAL COPA C T14");
agregarResultado("Joaco Fernandez", "5-7", "Jhose", "SEMIFINAL COPA C T14");
agregarResultado("Jhose", "7-5", "Joaco Fernandez", "SEMIFINAL COPA C T14");
agregarResultado("Kraiizer", "7-9", "Jhose", "FINAL COPA C T14");
agregarResultado("Jhose", "9-7", "Kraiizer", "FINAL COPA C T14");
agregarResultado("Kraiizer", "6-3", "Gabriel Talarico", "FASE DE GRUPOS COPA TOTAL T14");
agregarResultado("Gabriel Talarico", "3-6", "Kraiizer", "FASE DE GRUPOS COPA TOTAL T14");
agregarResultado("Benja", "6-5", "Luciano Hufschmid", "FASE DE GRUPOS COPA TOTAL T14");
agregarResultado("Luciano Hufschmid", "5-6", "Benja", "FASE DE GRUPOS COPA TOTAL T14");
agregarResultado("Bautista Coria", "4-4", "Tomas Torcasio", "FASE DE GRUPOS COPA TOTAL T14");
agregarResultado("Tomas Torcasio", "4-4", "Bautista Coria", "FASE DE GRUPOS COPA TOTAL T14");
agregarResultado("Dani Bazan", "2-4", "Rodrigo Talarico", "FASE DE GRUPOS COPA TOTAL T14");
agregarResultado("Rodrigo Talarico", "4-2", "Dani Bazan", "FASE DE GRUPOS COPA TOTAL T14");
agregarResultado("Cami", "4-5", "Tomas Delgado", "FASE DE GRUPOS COPA TOTAL T14");
agregarResultado("Tomas Delgado", "5-4", "Cami", "FASE DE GRUPOS COPA TOTAL T14");
agregarResultado("Joaquin Sampadaro", "4-7", "Martin Bustos", "FASE DE GRUPOS COPA TOTAL T14");
agregarResultado("Martin Bustos", "7-4", "Joaquin Sampadaro", "FASE DE GRUPOS COPA TOTAL T14");
agregarResultado("Matias Varela", "3-2", "Felipe Galante", "FASE DE GRUPOS COPA TOTAL T14");
agregarResultado("Felipe Galante", "2-3", "Matias Varela", "FASE DE GRUPOS COPA TOTAL T14");
agregarResultado("Bruno Alonso", "2-3", "Jhose", "FASE DE GRUPOS COPA TOTAL T14");
agregarResultado("Jhose", "3-2", "Bruno Alonso", "FASE DE GRUPOS COPA TOTAL T14");
agregarResultado("Renzo Badano", "5-4", "Lautaro Scocier", "FASE DE GRUPOS COPA TOTAL T14");
agregarResultado("Lautaro Scocier", "4-5", "Renzo Badano", "FASE DE GRUPOS COPA TOTAL T14");
agregarResultado("Axel", "0-2", "Nacho Soto", "FASE DE GRUPOS COPA TOTAL T14");
agregarResultado("Nacho Soto", "2-0", "Axel", "FASE DE GRUPOS COPA TOTAL T14");
agregarResultado("Nico Luchetti (R)", "4-7", "Eze", "FASE DE GRUPOS COPA TOTAL T14");
agregarResultado("Eze", "7-4", "Nico Luchetti (R)", "FASE DE GRUPOS COPA TOTAL T14");
agregarResultado("Joel Alcalde", "5-3", "Gonzalo Nuñez", "FASE DE GRUPOS COPA TOTAL T14");
agregarResultado("Gonzalo Nuñez", "3-5", "Joel Alcalde", "FASE DE GRUPOS COPA TOTAL T14");
agregarResultado("Pollo", "3-3", "Pancho Muzzio", "FASE DE GRUPOS COPA TOTAL T14");
agregarResultado("Pancho Muzzio", "3-3", "Pollo", "FASE DE GRUPOS COPA TOTAL T14");
agregarResultado("Natanael", "6-6", "Alexis Segovia", "FASE DE GRUPOS COPA TOTAL T14");
agregarResultado("Alexis Segovia", "6-6", "Natanael", "FASE DE GRUPOS COPA TOTAL T14");
agregarResultado("Joaco Fernandez", "3-4", "Facundo Marchese", "FASE DE GRUPOS COPA TOTAL T14");
agregarResultado("Facundo Marchese", "4-3", "Joaco Fernandez", "FASE DE GRUPOS COPA TOTAL T14");
agregarResultado("Ignacio Cejas", "3-2", "Mario Talarico", "FASE DE GRUPOS COPA TOTAL T14");
agregarResultado("Mario Talarico", "2-3", "Ignacio Cejas", "FASE DE GRUPOS COPA TOTAL T14");
agregarResultado("Ramiro Vita", "2-5", "Moreno Perez", "FASE DE GRUPOS COPA TOTAL T14");
agregarResultado("Moreno Perez", "5-2", "Ramiro Vita", "FASE DE GRUPOS COPA TOTAL T14");
agregarResultado("Yago", "3-5", "Anubis", "FASE DE GRUPOS COPA TOTAL T14");
agregarResultado("Anubis", "5-3", "Yago", "FASE DE GRUPOS COPA TOTAL T14");
agregarResultado("Leandro Montes", "1-4", "Matheo Olivera", "FASE DE GRUPOS COPA TOTAL T14");
agregarResultado("Matheo Olivera", "4-1", "Leandro Montes", "FASE DE GRUPOS COPA TOTAL T14");
agregarResultado("Azul Quispe", "2-5", "Fabrizio Escolano", "FASE DE GRUPOS COPA TOTAL T14");
agregarResultado("Fabrizio Escolano", "5-2", "Azul Quispe", "FASE DE GRUPOS COPA TOTAL T14");
agregarResultado("Gabriel Talarico", "3-1", "Ian Gangai", "FASE DE GRUPOS COPA TOTAL T14");
agregarResultado("Ian Gangai", "1-3", "Gabriel Talarico", "FASE DE GRUPOS COPA TOTAL T14");
agregarResultado("Kraiizer", "2-1", "Benja", "FASE DE GRUPOS COPA TOTAL T14");
agregarResultado("Benja", "1-2", "Kraiizer", "FASE DE GRUPOS COPA TOTAL T14");
agregarResultado("Tomas Torcasio", "3-1", "Joel Marasco", "FASE DE GRUPOS COPA TOTAL T14");
agregarResultado("Joel Marasco", "1-3", "Tomas Torcasio", "FASE DE GRUPOS COPA TOTAL T14");
agregarResultado("Bautista Coria", "2-3", "Dani Bazan", "FASE DE GRUPOS COPA TOTAL T14");
agregarResultado("Dani Bazan", "3-2", "Bautista Coria", "FASE DE GRUPOS COPA TOTAL T14");
agregarResultado("Tomas Delgado", "2-1", "Kevin Sivori", "FASE DE GRUPOS COPA TOTAL T14");
agregarResultado("Kevin Sivori", "1-2", "Tomas Delgado", "FASE DE GRUPOS COPA TOTAL T14");
agregarResultado("Cami", "5-2", "Joaquin Sampadaro", "FASE DE GRUPOS COPA TOTAL T14");
agregarResultado("Joaquin Sampadaro", "2-5", "Cami", "FASE DE GRUPOS COPA TOTAL T14");
agregarResultado("Felipe Galante", "1-1", "Kevin Sivori", "FASE DE GRUPOS COPA TOTAL T14");
agregarResultado("Kevin Sivori", "1-1", "Felipe Galante", "FASE DE GRUPOS COPA TOTAL T14");
agregarResultado("Matias Varela", "2-2", "Bruno Alonso", "FASE DE GRUPOS COPA TOTAL T14");
agregarResultado("Bruno Alonso", "2-2", "Matias Varela", "FASE DE GRUPOS COPA TOTAL T14");
agregarResultado("Lautaro Scocier", "2-3", "Lucas Aguilera", "FASE DE GRUPOS COPA TOTAL T14");
agregarResultado("Lucas Aguilera", "3-2", "Lautaro Scocier", "FASE DE GRUPOS COPA TOTAL T14");
agregarResultado("Renzo Badano", "2-0", "Axel", "FASE DE GRUPOS COPA TOTAL T14");
agregarResultado("Axel", "0-2", "Renzo Badano", "FASE DE GRUPOS COPA TOTAL T14");
agregarResultado("Eze", "1-3", "Rodrigo Soca", "FASE DE GRUPOS COPA TOTAL T14");
agregarResultado("Rodrigo Soca", "3-1", "Eze", "FASE DE GRUPOS COPA TOTAL T14");
agregarResultado("Nico Luchetti (R)", "6-4", "Joel Alcalde", "FASE DE GRUPOS COPA TOTAL T14");
agregarResultado("Joel Alcalde", "4-6", "Nico Luchetti (R)", "FASE DE GRUPOS COPA TOTAL T14");
agregarResultado("Pancho Muzzio", "2-1", "Nico Avalos", "FASE DE GRUPOS COPA TOTAL T14");
agregarResultado("Nico Avalos", "1-2", "Pancho Muzzio", "FASE DE GRUPOS COPA TOTAL T14");
agregarResultado("Pollo", "1-2", "Natanael", "FASE DE GRUPOS COPA TOTAL T14");
agregarResultado("Natanael", "2-1", "Pollo", "FASE DE GRUPOS COPA TOTAL T14");
agregarResultado("Mario Talarico", "1-2", "Facundo Marchese", "FASE DE GRUPOS COPA TOTAL T14");
agregarResultado("Facundo Marchese", "2-1", "Mario Talarico", "FASE DE GRUPOS COPA TOTAL T14");
agregarResultado("Joaco Fernandez", "1-1", "Moreno Perez", "FASE DE GRUPOS COPA TOTAL T14");
agregarResultado("Moreno Perez", "1-1", "Joaco Fernandez", "FASE DE GRUPOS COPA TOTAL T14");
agregarResultado("Ignacio Cejas", "2-4", "Ramiro Vita", "FASE DE GRUPOS COPA TOTAL T14");
agregarResultado("Ramiro Vita", "4-2", "Ignacio Cejas", "FASE DE GRUPOS COPA TOTAL T14");
agregarResultado("Matheo Olivera", "1-3", "Anubis", "FASE DE GRUPOS COPA TOTAL T14");
agregarResultado("Anubis", "3-1", "Matheo Olivera", "FASE DE GRUPOS COPA TOTAL T14");
agregarResultado("Yago", "1-2", "Fabrizio Escolano", "FASE DE GRUPOS COPA TOTAL T14");
agregarResultado("Fabrizio Escolano", "2-1", "Yago", "FASE DE GRUPOS COPA TOTAL T14");
agregarResultado("Leandro Montes", "0-1", "Azul Quispe", "FASE DE GRUPOS COPA TOTAL T14");
agregarResultado("Azul Quispe", "1-0", "Leandro Montes", "FASE DE GRUPOS COPA TOTAL T14");
agregarResultado("Luciano Hufschmid", "5-5", "Ian Gangai", "FASE DE GRUPOS COPA TOTAL T14");
agregarResultado("Ian Gangai", "5-5", "Luciano Hufschmid", "FASE DE GRUPOS COPA TOTAL T14");
agregarResultado("Gabriel Talarico", "5-5", "Benja", "FASE DE GRUPOS COPA TOTAL T14");
agregarResultado("Benja", "5-5", "Gabriel Talarico", "FASE DE GRUPOS COPA TOTAL T14");
agregarResultado("Rodrigo Talarico", "5-4", "Joel Marasco", "FASE DE GRUPOS COPA TOTAL T14");
agregarResultado("Joel Marasco", "4-5", "Rodrigo Talarico", "FASE DE GRUPOS COPA TOTAL T14");
agregarResultado("Tomas Torcasio", "3-1", "Dani Bazan", "FASE DE GRUPOS COPA TOTAL T14");
agregarResultado("Dani Bazan", "1-3", "Tomas Torcasio", "FASE DE GRUPOS COPA TOTAL T14");
agregarResultado("Martin Bustos", "5-1", "Kevin Sivori", "FASE DE GRUPOS COPA TOTAL T14");
agregarResultado("Kevin Sivori", "1-5", "Martin Bustos", "FASE DE GRUPOS COPA TOTAL T14");
agregarResultado("Tomas Delgado", "3-4", "Joaquin Sampadaro", "FASE DE GRUPOS COPA TOTAL T14");
agregarResultado("Joaquin Sampadaro", "4-3", "Tomas Delgado", "FASE DE GRUPOS COPA TOTAL T14");
agregarResultado("Jhose", "2-1", "Kevin Sivori", "FASE DE GRUPOS COPA TOTAL T14");
agregarResultado("Kevin Sivori", "1-2", "Jhose", "FASE DE GRUPOS COPA TOTAL T14");
agregarResultado("Felipe Galante", "7-3", "Bruno Alonso", "FASE DE GRUPOS COPA TOTAL T14");
agregarResultado("Bruno Alonso", "3-7", "Felipe Galante", "FASE DE GRUPOS COPA TOTAL T14");
agregarResultado("Nacho Soto", "6-3", "Lucas Aguilera", "FASE DE GRUPOS COPA TOTAL T14");
agregarResultado("Lucas Aguilera", "3-6", "Nacho Soto", "FASE DE GRUPOS COPA TOTAL T14");
agregarResultado("Lautaro Scocier", "3-0", "Axel", "FASE DE GRUPOS COPA TOTAL T14");
agregarResultado("Axel", "0-3", "Lautaro Scocier", "FASE DE GRUPOS COPA TOTAL T14");
agregarResultado("Gonzalo Nuñez", "4-5", "Rodrigo Soca", "FASE DE GRUPOS COPA TOTAL T14");
agregarResultado("Rodrigo Soca", "5-4", "Gonzalo Nuñez", "FASE DE GRUPOS COPA TOTAL T14");
agregarResultado("Eze", "8-6", "Joel Alcalde", "FASE DE GRUPOS COPA TOTAL T14");
agregarResultado("Joel Alcalde", "6-8", "Eze", "FASE DE GRUPOS COPA TOTAL T14");
agregarResultado("Alexis Segovia", "5-5", "Nico Avalos", "FASE DE GRUPOS COPA TOTAL T14");
agregarResultado("Nico Avalos", "5-5", "Alexis Segovia", "FASE DE GRUPOS COPA TOTAL T14");
agregarResultado("Pancho Muzzio", "5-2", "Natanael", "FASE DE GRUPOS COPA TOTAL T14");
agregarResultado("Natanael", "2-5", "Pancho Muzzio", "FASE DE GRUPOS COPA TOTAL T14");
agregarResultado("Moreno Perez", "4-3", "Facundo Marchese", "FASE DE GRUPOS COPA TOTAL T14");
agregarResultado("Facundo Marchese", "3-4", "Moreno Perez", "FASE DE GRUPOS COPA TOTAL T14");
agregarResultado("Mario Talarico", "7-2", "Ramiro Vita", "FASE DE GRUPOS COPA TOTAL T14");
agregarResultado("Ramiro Vita", "2-7", "Mario Talarico", "FASE DE GRUPOS COPA TOTAL T14");
agregarResultado("Joaco Fernandez", "3-4", "Ignacio Cejas", "FASE DE GRUPOS COPA TOTAL T14");
agregarResultado("Ignacio Cejas", "4-3", "Joaco Fernandez", "FASE DE GRUPOS COPA TOTAL T14");
agregarResultado("Fabrizio Escolano", "3-2", "Anubis", "FASE DE GRUPOS COPA TOTAL T14");
agregarResultado("Anubis", "2-3", "Fabrizio Escolano", "FASE DE GRUPOS COPA TOTAL T14");
agregarResultado("Matheo Olivera", "4-2", "Azul Quispe", "FASE DE GRUPOS COPA TOTAL T14");
agregarResultado("Azul Quispe", "2-4", "Matheo Olivera", "FASE DE GRUPOS COPA TOTAL T14");
agregarResultado("Yago", "8-0", "Leandro Montes", "FASE DE GRUPOS COPA TOTAL T14");
agregarResultado("Leandro Montes", "0-8", "Yago", "FASE DE GRUPOS COPA TOTAL T14");
agregarResultado("Benja", "2-3", "Ian Gangai", "FASE DE GRUPOS COPA TOTAL T14");
agregarResultado("Ian Gangai", "3-2", "Benja", "FASE DE GRUPOS COPA TOTAL T14");
agregarResultado("Luciano Hufschmid", "0-3", "Kraiizer", "FASE DE GRUPOS COPA TOTAL T14");
agregarResultado("Kraiizer", "3-0", "Luciano Hufschmid", "FASE DE GRUPOS COPA TOTAL T14");
agregarResultado("Dani Bazan", "1-1", "Joel Marasco", "FASE DE GRUPOS COPA TOTAL T14");
agregarResultado("Joel Marasco", "1-1", "Dani Bazan", "FASE DE GRUPOS COPA TOTAL T14");
agregarResultado("Rodrigo Talarico", "0-6", "Bautista Coria", "FASE DE GRUPOS COPA TOTAL T14");
agregarResultado("Bautista Coria", "6-0", "Rodrigo Talarico", "FASE DE GRUPOS COPA TOTAL T14");
agregarResultado("Joaquin Sampadaro", "0-1", "Lucas Insua", "FASE DE GRUPOS COPA TOTAL T14");
agregarResultado("Lucas Insua", "1-0", "Joaquin Sampadaro", "FASE DE GRUPOS COPA TOTAL T14");
agregarResultado("Martin Bustos", "1-10", "Cami", "FASE DE GRUPOS COPA TOTAL T14");
agregarResultado("Cami", "10-1", "Martin Bustos", "FASE DE GRUPOS COPA TOTAL T14");
agregarResultado("Bruno Alonso", "1-0", "Kevin Sivori", "FASE DE GRUPOS COPA TOTAL T14");
agregarResultado("Kevin Sivori", "0-1", "Bruno Alonso", "FASE DE GRUPOS COPA TOTAL T14");
agregarResultado("Jhose", "1-1", "Matias Varela", "FASE DE GRUPOS COPA TOTAL T14");
agregarResultado("Matias Varela", "1-1", "Jhose", "FASE DE GRUPOS COPA TOTAL T14");
agregarResultado("Axel", "0-0", "Lucas Aguilera", "FASE DE GRUPOS COPA TOTAL T14");
agregarResultado("Lucas Aguilera", "0-0", "Axel", "FASE DE GRUPOS COPA TOTAL T14");
agregarResultado("Nacho Soto", "4-1", "Renzo Badano", "FASE DE GRUPOS COPA TOTAL T14");
agregarResultado("Renzo Badano", "1-4", "Nacho Soto", "FASE DE GRUPOS COPA TOTAL T14");
agregarResultado("Joel Alcalde", "1-1", "Rodrigo Soca", "FASE DE GRUPOS COPA TOTAL T14");
agregarResultado("Rodrigo Soca", "1-1", "Joel Alcalde", "FASE DE GRUPOS COPA TOTAL T14");
agregarResultado("Gonzalo Nuñez", "0-4", "Nico Luchetti (R)", "FASE DE GRUPOS COPA TOTAL T14");
agregarResultado("Nico Luchetti (R)", "4-0", "Gonzalo Nuñez", "FASE DE GRUPOS COPA TOTAL T14");
agregarResultado("Natanael", "0-4", "Nico Avalos", "FASE DE GRUPOS COPA TOTAL T14");
agregarResultado("Nico Avalos", "4-0", "Natanael", "FASE DE GRUPOS COPA TOTAL T14");
agregarResultado("Alexis Segovia", "2-1", "Pollo", "FASE DE GRUPOS COPA TOTAL T14");
agregarResultado("Pollo", "1-2", "Alexis Segovia", "FASE DE GRUPOS COPA TOTAL T14");
agregarResultado("Ramiro Vita", "1-1", "Facundo Marchese", "FASE DE GRUPOS COPA TOTAL T14");
agregarResultado("Facundo Marchese", "1-1", "Ramiro Vita", "FASE DE GRUPOS COPA TOTAL T14");
agregarResultado("Moreno Perez", "4-1", "Ignacio Cejas", "FASE DE GRUPOS COPA TOTAL T14");
agregarResultado("Ignacio Cejas", "1-4", "Moreno Perez", "FASE DE GRUPOS COPA TOTAL T14");
agregarResultado("Mario Talarico", "2-3", "Joaco Fernandez", "FASE DE GRUPOS COPA TOTAL T14");
agregarResultado("Joaco Fernandez", "3-2", "Mario Talarico", "FASE DE GRUPOS COPA TOTAL T14");
agregarResultado("Azul Quispe", "3-0", "Anubis", "FASE DE GRUPOS COPA TOTAL T14");
agregarResultado("Anubis", "0-3", "Azul Quispe", "FASE DE GRUPOS COPA TOTAL T14");
agregarResultado("Fabrizio Escolano", "2-0", "Leandro Montes", "FASE DE GRUPOS COPA TOTAL T14");
agregarResultado("Leandro Montes", "0-2", "Fabrizio Escolano", "FASE DE GRUPOS COPA TOTAL T14");
agregarResultado("Matheo Olivera", "6-0", "Yago", "FASE DE GRUPOS COPA TOTAL T14");
agregarResultado("Yago", "0-6", "Matheo Olivera", "FASE DE GRUPOS COPA TOTAL T14");
agregarResultado("Kraiizer", "2-1", "Ian Gangai", "FASE DE GRUPOS COPA TOTAL T14");
agregarResultado("Ian Gangai", "1-2", "Kraiizer", "FASE DE GRUPOS COPA TOTAL T14");
agregarResultado("Luciano Hufschmid", "1-4", "Gabriel Talarico", "FASE DE GRUPOS COPA TOTAL T14");
agregarResultado("Gabriel Talarico", "4-1", "Luciano Hufschmid", "FASE DE GRUPOS COPA TOTAL T14");
agregarResultado("Bautista Coria", "4-1", "Joel Marasco", "FASE DE GRUPOS COPA TOTAL T14");
agregarResultado("Joel Marasco", "1-4", "Bautista Coria", "FASE DE GRUPOS COPA TOTAL T14");
agregarResultado("Rodrigo Talarico", "1-1", "Tomas Torcasio", "FASE DE GRUPOS COPA TOTAL T14");
agregarResultado("Tomas Torcasio", "1-1", "Rodrigo Talarico", "FASE DE GRUPOS COPA TOTAL T14");
agregarResultado("Cami", "5-3", "Lucas Insua", "FASE DE GRUPOS COPA TOTAL T14");
agregarResultado("Lucas Insua", "3-5", "Cami", "FASE DE GRUPOS COPA TOTAL T14");
agregarResultado("Martin Bustos", "0-1", "Tomas Delgado", "FASE DE GRUPOS COPA TOTAL T14");
agregarResultado("Tomas Delgado", "1-0", "Martin Bustos", "FASE DE GRUPOS COPA TOTAL T14");
agregarResultado("Matias Varela", "3-2", "Kevin Sivori", "FASE DE GRUPOS COPA TOTAL T14");
agregarResultado("Kevin Sivori", "2-3", "Matias Varela", "FASE DE GRUPOS COPA TOTAL T14");
agregarResultado("Jhose", "4-0", "Felipe Galante", "FASE DE GRUPOS COPA TOTAL T14");
agregarResultado("Felipe Galante", "0-4", "Jhose", "FASE DE GRUPOS COPA TOTAL T14");
agregarResultado("Renzo Badano", "1-3", "Lucas Aguilera", "FASE DE GRUPOS COPA TOTAL T14");
agregarResultado("Lucas Aguilera", "3-1", "Renzo Badano", "FASE DE GRUPOS COPA TOTAL T14");
agregarResultado("Nacho Soto", "1-0", "Lautaro Scocier", "FASE DE GRUPOS COPA TOTAL T14");
agregarResultado("Lautaro Scocier", "0-1", "Nacho Soto", "FASE DE GRUPOS COPA TOTAL T14");
agregarResultado("Nico Luchetti (R)", "6-4", "Rodrigo Soca", "FASE DE GRUPOS COPA TOTAL T14");
agregarResultado("Rodrigo Soca", "4-6", "Nico Luchetti (R)", "FASE DE GRUPOS COPA TOTAL T14");
agregarResultado("Gonzalo Nuñez", "3-2", "Eze", "FASE DE GRUPOS COPA TOTAL T14");
agregarResultado("Eze", "2-3", "Gonzalo Nuñez", "FASE DE GRUPOS COPA TOTAL T14");
agregarResultado("Pollo", "4-1", "Nico Avalos", "FASE DE GRUPOS COPA TOTAL T14");
agregarResultado("Nico Avalos", "1-4", "Pollo", "FASE DE GRUPOS COPA TOTAL T14");
agregarResultado("Alexis Segovia", "2-1", "Pancho Muzzio", "FASE DE GRUPOS COPA TOTAL T14");
agregarResultado("Pancho Muzzio", "1-2", "Alexis Segovia", "FASE DE GRUPOS COPA TOTAL T14");
agregarResultado("Ignacio Cejas", "5-2", "Facundo Marchese", "FASE DE GRUPOS COPA TOTAL T14");
agregarResultado("Facundo Marchese", "2-5", "Ignacio Cejas", "FASE DE GRUPOS COPA TOTAL T14");
agregarResultado("Ramiro Vita", "5-4", "Joaco Fernandez", "FASE DE GRUPOS COPA TOTAL T14");
agregarResultado("Joaco Fernandez", "4-5", "Ramiro Vita", "FASE DE GRUPOS COPA TOTAL T14");
agregarResultado("Moreno Perez", "4-1", "Mario Talarico", "FASE DE GRUPOS COPA TOTAL T14");
agregarResultado("Mario Talarico", "1-4", "Moreno Perez", "FASE DE GRUPOS COPA TOTAL T14");
agregarResultado("Leandro Montes", "2-1", "Anubis", "FASE DE GRUPOS COPA TOTAL T14");
agregarResultado("Anubis", "1-2", "Leandro Montes", "FASE DE GRUPOS COPA TOTAL T14");
agregarResultado("Azul Quispe", "1-2", "Yago", "FASE DE GRUPOS COPA TOTAL T14");
agregarResultado("Yago", "2-1", "Azul Quispe", "FASE DE GRUPOS COPA TOTAL T14");
agregarResultado("Fabrizio Escolano", "3-1", "Matheo Olivera", "FASE DE GRUPOS COPA TOTAL T14");
agregarResultado("Matheo Olivera", "1-3", "Fabrizio Escolano", "FASE DE GRUPOS COPA TOTAL T14");
agregarResultado("Alexis Segovia", "6-14", "Fabrizio Escolano", "OCTAVOS DE FINAL COPA TOTAL T14");
agregarResultado("Fabrizio Escolano", "14-6", "Alexis Segovia", "OCTAVOS DE FINAL COPA TOTAL T14");
agregarResultado("Gabriel Talarico", "6-9", "Ignacio Cejas", "OCTAVOS DE FINAL COPA TOTAL T14");
agregarResultado("Ignacio Cejas", "9-6", "Gabriel Talarico", "OCTAVOS DE FINAL COPA TOTAL T14");
agregarResultado("Bautista Coria", "7-7", "Cami", "OCTAVOS DE FINAL COPA TOTAL T14");
agregarResultado("Cami", "7-7", "Bautista Coria", "OCTAVOS DE FINAL COPA TOTAL T14");
agregarResultado("Tomas Torcasio", "10-7", "Matheo Olivera", "OCTAVOS DE FINAL COPA TOTAL T14");
agregarResultado("Matheo Olivera", "7-10", "Tomas Torcasio", "OCTAVOS DE FINAL COPA TOTAL T14");
agregarResultado("Kraiizer", "10-10", "Pancho Muzzio", "OCTAVOS DE FINAL COPA TOTAL T14");
agregarResultado("Pancho Muzzio", "10-10", "Kraiizer", "OCTAVOS DE FINAL COPA TOTAL T14");
agregarResultado("Matias Varela", "5-6", "Nacho Soto", "OCTAVOS DE FINAL COPA TOTAL T14");
agregarResultado("Nacho Soto", "6-5", "Matias Varela", "OCTAVOS DE FINAL COPA TOTAL T14");
agregarResultado("Lucas Insua", "10-11", "Jhose", "OCTAVOS DE FINAL COPA TOTAL T14");
agregarResultado("Jhose", "11-10", "Lucas Insua", "OCTAVOS DE FINAL COPA TOTAL T14");
agregarResultado("Moreno Perez", "7-10", "Nico Luchetti (R)", "OCTAVOS DE FINAL COPA TOTAL T14");
agregarResultado("Nico Luchetti (R)", "10-7", "Moreno Perez", "OCTAVOS DE FINAL COPA TOTAL T14");
agregarResultado("Bautista Coria", "0-1", "Cami", "DESEMPATE OCTAVOS DE FINAL COPA TOTAL T14");
agregarResultado("Cami", "1-0", "Bautista Coria", "DESEMPATE OCTAVOS DE FINAL COPA TOTAL T14");
agregarResultado("Kraiizer", "0-4", "Pancho Muzzio", "DESEMPATE OCTAVOS DE FINAL COPA TOTAL T14");
agregarResultado("Pancho Muzzio", "4-0", "Kraiizer", "DESEMPATE OCTAVOS DE FINAL COPA TOTAL T14");
agregarResultado("Nacho Soto", "17-11", "Ignacio Cejas", "CUARTOS DE FINAL COPA TOTAL T14");
agregarResultado("Ignacio Cejas", "11-17", "Nacho Soto", "CUARTOS DE FINAL COPA TOTAL T14");
agregarResultado("Pancho Muzzio", "14-8", "Nico Luchetti (R)", "CUARTOS DE FINAL COPA TOTAL T14");
agregarResultado("Nico Luchetti (R)", "8-14", "Pancho Muzzio", "CUARTOS DE FINAL COPA TOTAL T14");
agregarResultado("Tomas Torcasio", "6-8", "Jhose", "CUARTOS DE FINAL COPA TOTAL T14");
agregarResultado("Jhose", "8-6", "Tomas Torcasio", "CUARTOS DE FINAL COPA TOTAL T14");
agregarResultado("Cami", "9-16", "Fabrizio Escolano", "CUARTOS DE FINAL COPA TOTAL T14");
agregarResultado("Fabrizio Escolano", "16-9", "Cami", "CUARTOS DE FINAL COPA TOTAL T14");
agregarResultado("Nacho Soto", "9-8", "Fabrizio Escolano", "SEMIFINAL COPA TOTAL T14");
agregarResultado("Fabrizio Escolano", "8-9", "Nacho Soto", "SEMIFINAL COPA TOTAL T14");
agregarResultado("Pancho Muzzio", "8-7", "Jhose", "SEMIFINAL COPA TOTAL T14");
agregarResultado("Jhose", "7-8", "Pancho Muzzio", "SEMIFINAL COPA TOTAL T14");
agregarResultado("Nacho Soto", "11-11", "Pancho Muzzio", "FINAL COPA TOTAL T14");
agregarResultado("Pancho Muzzio", "11-11", "Nacho Soto", "FINAL COPA TOTAL T14");
agregarResultado("Nacho Soto", "12-11", "Pancho Muzzio", "DESEMPATE FINAL COPA TOTAL T14");
agregarResultado("Pancho Muzzio", "11-12", "Nacho Soto", "DESEMPATE FINAL COPA TOTAL T14");
agregarResultado("Joel Marasco", "9-9", "Matheo Olivera", "32AVOS DE FINAL COPA CAMPEONES T14");
agregarResultado("Matheo Olivera", "9-9", "Joel Marasco", "32AVOS DE FINAL COPA CAMPEONES T14");
agregarResultado("Lautaro Scocier", "9-4", "Kevin Sivori", "32AVOS DE FINAL COPA CAMPEONES T14");
agregarResultado("Kevin Sivori", "4-9", "Lautaro Scocier", "32AVOS DE FINAL COPA CAMPEONES T14");
agregarResultado("Joel Marasco", "2-1", "Matheo Olivera", "DESEMPATE 32AVOS COPA CAMPEONES T14");
agregarResultado("Matheo Olivera", "1-2", "Joel Marasco", "DESEMPATE 32AVOS COPA CAMPEONES T14");
agregarResultado("Joel Marasco", "7-1", "Lautaro Scocier", "16AVOS DE FINAL COPA CAMPEONES T14");
agregarResultado("Lautaro Scocier", "1-7", "Joel Marasco", "16AVOS DE FINAL COPA CAMPEONES T14");
agregarResultado("Joel Marasco", "19-14", "Eze", "OCTAVOS DE FINAL COPA CAMPEONES T14");
agregarResultado("Eze", "14-19", "Joel Marasco", "OCTAVOS DE FINAL COPA CAMPEONES T14");
agregarResultado("Nacho Soto", "6-10", "Pancho Muzzio", "OCTAVOS DE FINAL COPA CAMPEONES T14");
agregarResultado("Pancho Muzzio", "10-6", "Nacho Soto", "OCTAVOS DE FINAL COPA CAMPEONES T14");
agregarResultado("Joel Alcalde", "18-4", "Dani Bazan", "OCTAVOS DE FINAL COPA CAMPEONES T14");
agregarResultado("Dani Bazan", "4-18", "Joel Alcalde", "OCTAVOS DE FINAL COPA CAMPEONES T14");
agregarResultado("Joel Marasco", "10-14", "Pancho Muzzio", "CUARTOS DE FINAL COPA CAMPEONES T14");
agregarResultado("Pancho Muzzio", "14-10", "Joel Marasco", "CUARTOS DE FINAL COPA CAMPEONES T14");
agregarResultado("Joel Alcalde", "6-12", "Nico Avalos", "CUARTOS DE FINAL COPA CAMPEONES T14");
agregarResultado("Nico Avalos", "12-6", "Joel Alcalde", "CUARTOS DE FINAL COPA CAMPEONES T14");
agregarResultado("Pancho Muzzio", "8-5", "Ian Gangai", "SEMIFINAL COPA CAMPEONES T14");
agregarResultado("Ian Gangai", "5-8", "Pancho Muzzio", "SEMIFINAL COPA CAMPEONES T14");
agregarResultado("Nico Avalos", "8-4", "Mario Talarico", "SEMIFINAL COPA CAMPEONES T14");
agregarResultado("Mario Talarico", "4-8", "Nico Avalos", "SEMIFINAL COPA CAMPEONES T14");
agregarResultado("Pancho Muzzio", "11-7", "Nico Avalos", "FINAL COPA CAMPEONES T14");
agregarResultado("Nico Avalos", "7-11", "Pancho Muzzio", "FINAL COPA CAMPEONES T14");
agregarResultado("Moreno Perez", "14-21", "Nico Luchetti (R)", "FINAL COPA DUOS T14");
agregarResultado("Nico Luchetti (R)", "21-14", "Moreno Perez", "FINAL COPA DUOS T14");
agregarResultado("Nico Avalos", "14-21", "Fabrizio Escolano", "FINAL COPA DUOS T14");
agregarResultado("Fabrizio Escolano", "21-14", "Nico Avalos", "FINAL COPA DUOS T14");
agregarResultado("Moreno Perez", "14-21", "Fabrizio Escolano", "FINAL COPA DUOS T14");
agregarResultado("Fabrizio Escolano", "21-14", "Moreno Perez", "FINAL COPA DUOS T14");
agregarResultado("Nico Avalos", "14-21", "Nico Luchetti (R)", "FINAL COPA DUOS T14");
agregarResultado("Nico Luchetti (R)", "21-14", "Nico Avalos", "FINAL COPA DUOS T14");
agregarResultado("Facundo Marchese", "5-0", "Joel Alcalde", "PROMOCION 1RA DIVISION T14");
agregarResultado("Joel Alcalde", "0-5", "Facundo Marchese", "PROMOCION 1RA DIVISION T14");
agregarResultado("Nacho Soto", "4-2", "Ignacio Cejas", "PROMOCION 1RA DIVISION T14");
agregarResultado("Ignacio Cejas", "2-4", "Nacho Soto", "PROMOCION 1RA DIVISION T14");
agregarResultado("Gonzalo Nuñez", "1-1", "Dani Bazan", "PROMOCION 2DA DIVISION T14");
agregarResultado("Dani Bazan", "1-1", "Gonzalo Nuñez", "PROMOCION 2DA DIVISION T14");
agregarResultado("Yago", "2-4", "Camila Bussetto", "PROMOCION 2DA DIVISION T14");
agregarResultado("Camila Bussetto", "4-2", "Yago", "PROMOCION 2DA DIVISION T14");
agregarResultado("Gonzalo Nuñez", "4-1", "Dani Bazan", "DESEMPAT EPROMOCION 2DA DIVISION T14");
agregarResultado("Dani Bazan", "1-4", "Gonzalo Nuñez", "DESEMPAT EPROMOCION 2DA DIVISION T14");
agregarResultado("Bruno Alonso", "3-9", "Moreno Perez", "OCTAVOS DE FINAL COPA A T15");
agregarResultado("Moreno Perez", "9-3", "Bruno Alonso", "OCTAVOS DE FINAL COPA A T15");
agregarResultado("Pollo", "6-9", "Rodrigo Soca", "OCTAVOS DE FINAL COPA A T15");
agregarResultado("Rodrigo Soca", "9-6", "Pollo", "OCTAVOS DE FINAL COPA A T15");
agregarResultado("Facundo Marchese", "4-6", "Pancho Muzzio", "OCTAVOS DE FINAL COPA A T15");
agregarResultado("Pancho Muzzio", "6-4", "Facundo Marchese", "OCTAVOS DE FINAL COPA A T15");
agregarResultado("Renzo Badano", "8-9", "Tomas Torcasio", "OCTAVOS DE FINAL COPA A T15");
agregarResultado("Tomas Torcasio", "9-8", "Renzo Badano", "OCTAVOS DE FINAL COPA A T15");
agregarResultado("Lucas Insua", "5-7", "Moreno Perez", "CUARTOS DE FINAL COPA A T15");
agregarResultado("Moreno Perez", "7-5", "Lucas Insua", "CUARTOS DE FINAL COPA A T15");
agregarResultado("Gabriel Talarico", "6-14", "Rodrigo Soca", "CUARTOS DE FINAL COPA A T15");
agregarResultado("Rodrigo Soca", "14-6", "Gabriel Talarico", "CUARTOS DE FINAL COPA A T15");
agregarResultado("Luciano Hufschmid", "4-9", "Pancho Muzzio", "CUARTOS DE FINAL COPA A T15");
agregarResultado("Pancho Muzzio", "9-4", "Luciano Hufschmid", "CUARTOS DE FINAL COPA A T15");
agregarResultado("Alexis Segovia", "3-11", "Tomas Torcasio", "CUARTOS DE FINAL COPA A T15");
agregarResultado("Tomas Torcasio", "11-3", "Alexis Segovia", "CUARTOS DE FINAL COPA A T15");
agregarResultado("Pancho Muzzio", "8-11", "Tomas Torcasio", "SEMIFINAL COPA A T15");
agregarResultado("Tomas Torcasio", "11-8", "Pancho Muzzio", "SEMIFINAL COPA A T15");
agregarResultado("Rodrigo Soca", "15-15", "Moreno Perez", "SEMIFINAL COPA A T15");
agregarResultado("Moreno Perez", "15-15", "Rodrigo Soca", "SEMIFINAL COPA A T15");
agregarResultado("Rodrigo Soca", "6-0", "Moreno Perez", "DESEMPATE SEMIFINAL COPA A T15");
agregarResultado("Moreno Perez", "0-6", "Rodrigo Soca", "DESEMPATE SEMIFINAL COPA A T15");
agregarResultado("Rodrigo Soca", "12-10", "Tomas Torcasio", "FINAL COPA A T15");
agregarResultado("Tomas Torcasio", "10-12", "Rodrigo Soca", "FINAL COPA A T15");
agregarResultado("Jhose", "10-6", "Cami", "OCTAVOS DE FINAL COPA B T15");
agregarResultado("Cami", "6-10", "Jhose", "OCTAVOS DE FINAL COPA B T15");
agregarResultado("Lucas Aguilera", "7-4", "Gonzalo Nuñez", "OCTAVOS DE FINAL COPA B T15");
agregarResultado("Gonzalo Nuñez", "4-7", "Lucas Aguilera", "OCTAVOS DE FINAL COPA B T15");
agregarResultado("Rodrigo Talarico", "5-4", "Azul Quispe", "OCTAVOS DE FINAL COPA B T15");
agregarResultado("Azul Quispe", "4-5", "Rodrigo Talarico", "OCTAVOS DE FINAL COPA B T15");
agregarResultado("Tomas Delgado", "8-5", "Ignacio Cejas", "OCTAVOS DE FINAL COPA B T15");
agregarResultado("Ignacio Cejas", "5-8", "Tomas Delgado", "OCTAVOS DE FINAL COPA B T15");
agregarResultado("Joel Alcalde", "6-10", "Jhose", "CUARTOS DE FINAL COPA B T15");
agregarResultado("Jhose", "10-6", "Joel Alcalde", "CUARTOS DE FINAL COPA B T15");
agregarResultado("Joaco Fernandez", "6-10", "Rodrigo Talarico", "CUARTOS DE FINAL COPA B T15");
agregarResultado("Rodrigo Talarico", "10-6", "Joaco Fernandez", "CUARTOS DE FINAL COPA B T15");
agregarResultado("Matias Varela", "5-14", "Tomas Delgado", "CUARTOS DE FINAL COPA B T15");
agregarResultado("Tomas Delgado", "14-5", "Matias Varela", "CUARTOS DE FINAL COPA B T15");
agregarResultado("Benja", "5-8", "Lucas Aguilera", "CUARTOS DE FINAL COPA B T15");
agregarResultado("Lucas Aguilera", "8-5", "Benja", "CUARTOS DE FINAL COPA B T15");
agregarResultado("Jhose", "13-20", "Lucas Aguilera", "SEMIFINAL COPA B T15");
agregarResultado("Lucas Aguilera", "20-13", "Jhose", "SEMIFINAL COPA B T15");
agregarResultado("Rodrigo Talarico", "20-11", "Tomas Delgado", "SEMIFINAL COPA B T15");
agregarResultado("Tomas Delgado", "11-20", "Rodrigo Talarico", "SEMIFINAL COPA B T15");
agregarResultado("Rodrigo Talarico", "11-12", "Lucas Aguilera", "FINAL COPA B T15");
agregarResultado("Lucas Aguilera", "12-11", "Rodrigo Talarico", "FINAL COPA B T15");
agregarResultado("Nico Luchetti (R)", "8-8", "Bautista Coria", "CUARTOS DE FINAL COPA C T15");
agregarResultado("Bautista Coria", "8-8", "Nico Luchetti (R)", "CUARTOS DE FINAL COPA C T15");
agregarResultado("Joaquin Sampadaro", "7-8", "Santi", "CUARTOS DE FINAL COPA C T15");
agregarResultado("Santi", "8-7", "Joaquin Sampadaro", "CUARTOS DE FINAL COPA C T15");
agregarResultado("Yago", "6-5", "Kraiizer", "CUARTOS DE FINAL COPA C T15");
agregarResultado("Kraiizer", "5-6", "Yago", "CUARTOS DE FINAL COPA C T15");
agregarResultado("Anubis", "9-9", "Dani Bazan", "CUARTOS DE FINAL COPA C T15");
agregarResultado("Dani Bazan", "9-9", "Anubis", "CUARTOS DE FINAL COPA C T15");
agregarResultado("Nico Luchetti (R)", "1-1", "Bautista Coria", "DESEMPATE CUARTOS DE FINAL COPA C T15");
agregarResultado("Bautista Coria", "1-1", "Nico Luchetti (R)", "DESEMPATE CUARTOS DE FINAL COPA C T15");
agregarResultado("Anubis", "1-0", "Dani Bazan", "DESEMPATE CUARTOS DE FINAL COPA C T15");
agregarResultado("Dani Bazan", "0-1", "Anubis", "DESEMPATE CUARTOS DE FINAL COPA C T15");
agregarResultado("Nico Luchetti (R)", "3-5", "Bautista Coria", "DESEMPATE 2 CUARTOS DE FINAL COPA C T15");
agregarResultado("Bautista Coria", "5-3", "Nico Luchetti (R)", "DESEMPATE 2 CUARTOS DE FINAL COPA C T15");
agregarResultado("Bautista Coria", "6-14", "Anubis", "SEMIFINAL COPA C T15");
agregarResultado("Anubis", "14-6", "Bautista Coria", "SEMIFINAL COPA C T15");
agregarResultado("Santi", "8-16", "Yago", "SEMIFINAL COPA C T15");
agregarResultado("Yago", "16-8", "Santi", "SEMIFINAL COPA C T15");
agregarResultado("Anubis", "5-6", "Yago", "FINAL COPA C T15");
agregarResultado("Yago", "6-5", "Anubis", "FINAL COPA C T15");
agregarResultado("Nacho Soto", "2-7", "Pancho Muzzio", "FASE DE GRUPOS COPA TOTAL T15");
agregarResultado("Pancho Muzzio", "7-2", "Nacho Soto", "FASE DE GRUPOS COPA TOTAL T15");
agregarResultado("Anubis", "0-4", "Yago", "FASE DE GRUPOS COPA TOTAL T15");
agregarResultado("Yago", "4-0", "Anubis", "FASE DE GRUPOS COPA TOTAL T15");
agregarResultado("Matheo Olivera", "1-3", "Tomas Torcasio", "FASE DE GRUPOS COPA TOTAL T15");
agregarResultado("Tomas Torcasio", "3-1", "Matheo Olivera", "FASE DE GRUPOS COPA TOTAL T15");
agregarResultado("Felipe Galante", "0-0", "Matias Varela", "FASE DE GRUPOS COPA TOTAL T15");
agregarResultado("Matias Varela", "0-0", "Felipe Galante", "FASE DE GRUPOS COPA TOTAL T15");
agregarResultado("Fabrizio Escolano", "0-0", "Kevin Sivori", "FASE DE GRUPOS COPA TOTAL T15");
agregarResultado("Kevin Sivori", "0-0", "Fabrizio Escolano", "FASE DE GRUPOS COPA TOTAL T15");
agregarResultado("Rodrigo Talarico", "3-1", "Cami", "FASE DE GRUPOS COPA TOTAL T15");
agregarResultado("Cami", "1-3", "Rodrigo Talarico", "FASE DE GRUPOS COPA TOTAL T15");
agregarResultado("Nico Avalos", "1-4", "Rodrigo Soca", "FASE DE GRUPOS COPA TOTAL T15");
agregarResultado("Rodrigo Soca", "4-1", "Nico Avalos", "FASE DE GRUPOS COPA TOTAL T15");
agregarResultado("Alexis Segovia", "1-3", "Joaco Fernandez", "FASE DE GRUPOS COPA TOTAL T15");
agregarResultado("Joaco Fernandez", "3-1", "Alexis Segovia", "FASE DE GRUPOS COPA TOTAL T15");
agregarResultado("Gabriel Talarico", "0-1", "Jhose", "FASE DE GRUPOS COPA TOTAL T15");
agregarResultado("Jhose", "1-0", "Gabriel Talarico", "FASE DE GRUPOS COPA TOTAL T15");
agregarResultado("Luciano Hufschmid", "3-0", "Antonella Lopez", "FASE DE GRUPOS COPA TOTAL T15");
agregarResultado("Antonella Lopez", "0-3", "Luciano Hufschmid", "FASE DE GRUPOS COPA TOTAL T15");
agregarResultado("Joel Marasco", "0-4", "Mario Talarico", "FASE DE GRUPOS COPA TOTAL T15");
agregarResultado("Mario Talarico", "4-0", "Joel Marasco", "FASE DE GRUPOS COPA TOTAL T15");
agregarResultado("Facundo Marchese", "3-3", "Santi", "FASE DE GRUPOS COPA TOTAL T15");
agregarResultado("Santi", "3-3", "Facundo Marchese", "FASE DE GRUPOS COPA TOTAL T15");
agregarResultado("Lucas Aguilera", "0-1", "Lucas Insua", "FASE DE GRUPOS COPA TOTAL T15");
agregarResultado("Lucas Insua", "1-0", "Lucas Aguilera", "FASE DE GRUPOS COPA TOTAL T15");
agregarResultado("Bruno Alonso", "7-0", "Bautista Coria", "FASE DE GRUPOS COPA TOTAL T15");
agregarResultado("Bautista Coria", "0-7", "Bruno Alonso", "FASE DE GRUPOS COPA TOTAL T15");
agregarResultado("Ian Gangai", "3-3", "Tomas Delgado", "FASE DE GRUPOS COPA TOTAL T15");
agregarResultado("Tomas Delgado", "3-3", "Ian Gangai", "FASE DE GRUPOS COPA TOTAL T15");
agregarResultado("Joel Alcalde", "5-4", "Pollo", "FASE DE GRUPOS COPA TOTAL T15");
agregarResultado("Pollo", "4-5", "Joel Alcalde", "FASE DE GRUPOS COPA TOTAL T15");
agregarResultado("Moreno Perez", "4-1", "Eze", "FASE DE GRUPOS COPA TOTAL T15");
agregarResultado("Eze", "1-4", "Moreno Perez", "FASE DE GRUPOS COPA TOTAL T15");
agregarResultado("Gonzalo Nuñez", "1-0", "Leandro Montes", "FASE DE GRUPOS COPA TOTAL T15");
agregarResultado("Leandro Montes", "0-1", "Gonzalo Nuñez", "FASE DE GRUPOS COPA TOTAL T15");
agregarResultado("Pancho Muzzio", "4-7", "Renzo Badano", "FASE DE GRUPOS COPA TOTAL T15");
agregarResultado("Renzo Badano", "7-4", "Pancho Muzzio", "FASE DE GRUPOS COPA TOTAL T15");
agregarResultado("Nacho Soto", "4-5", "Anubis", "FASE DE GRUPOS COPA TOTAL T15");
agregarResultado("Anubis", "5-4", "Nacho Soto", "FASE DE GRUPOS COPA TOTAL T15");
agregarResultado("Tomas Torcasio", "3-3", "Ignacio Cejas", "FASE DE GRUPOS COPA TOTAL T15");
agregarResultado("Ignacio Cejas", "3-3", "Tomas Torcasio", "FASE DE GRUPOS COPA TOTAL T15");
agregarResultado("Matheo Olivera", "3-2", "Felipe Galante", "FASE DE GRUPOS COPA TOTAL T15");
agregarResultado("Felipe Galante", "2-3", "Matheo Olivera", "FASE DE GRUPOS COPA TOTAL T15");
agregarResultado("Kevin Sivori", "2-6", "Nico Luchetti", "FASE DE GRUPOS COPA TOTAL T15");
agregarResultado("Nico Luchetti", "6-2", "Kevin Sivori", "FASE DE GRUPOS COPA TOTAL T15");
agregarResultado("Fabrizio Escolano", "5-5", "Rodrigo Talarico", "FASE DE GRUPOS COPA TOTAL T15");
agregarResultado("Rodrigo Talarico", "5-5", "Fabrizio Escolano", "FASE DE GRUPOS COPA TOTAL T15");
agregarResultado("Rodrigo Soca", "1-5", "Kraiizer", "FASE DE GRUPOS COPA TOTAL T15");
agregarResultado("Kraiizer", "5-1", "Rodrigo Soca", "FASE DE GRUPOS COPA TOTAL T15");
agregarResultado("Nico Avalos", "3-7", "Alexis Segovia", "FASE DE GRUPOS COPA TOTAL T15");
agregarResultado("Alexis Segovia", "7-3", "Nico Avalos", "FASE DE GRUPOS COPA TOTAL T15");
agregarResultado("Jhose", "5-1", "Azul Quispe", "FASE DE GRUPOS COPA TOTAL T15");
agregarResultado("Azul Quispe", "1-5", "Jhose", "FASE DE GRUPOS COPA TOTAL T15");
agregarResultado("Gabriel Talarico", "3-6", "Luciano Hufschmid", "FASE DE GRUPOS COPA TOTAL T15");
agregarResultado("Luciano Hufschmid", "6-3", "Gabriel Talarico", "FASE DE GRUPOS COPA TOTAL T15");
agregarResultado("Mario Talarico", "3-0", "Natanael", "FASE DE GRUPOS COPA TOTAL T15");
agregarResultado("Natanael", "0-3", "Mario Talarico", "FASE DE GRUPOS COPA TOTAL T15");
agregarResultado("Joel Marasco", "2-6", "Facundo Marchese", "FASE DE GRUPOS COPA TOTAL T15");
agregarResultado("Facundo Marchese", "6-2", "Joel Marasco", "FASE DE GRUPOS COPA TOTAL T15");
agregarResultado("Lucas Insua", "4-2", "Dani Bazan", "FASE DE GRUPOS COPA TOTAL T15");
agregarResultado("Dani Bazan", "2-4", "Lucas Insua", "FASE DE GRUPOS COPA TOTAL T15");
agregarResultado("Lucas Aguilera", "3-1", "Bruno Alonso", "FASE DE GRUPOS COPA TOTAL T15");
agregarResultado("Bruno Alonso", "1-3", "Lucas Aguilera", "FASE DE GRUPOS COPA TOTAL T15");
agregarResultado("Tomas Delgado", "3-4", "Benja", "FASE DE GRUPOS COPA TOTAL T15");
agregarResultado("Benja", "4-3", "Tomas Delgado", "FASE DE GRUPOS COPA TOTAL T15");
agregarResultado("Ian Gangai", "2-6", "Joel Alcalde", "FASE DE GRUPOS COPA TOTAL T15");
agregarResultado("Joel Alcalde", "6-2", "Ian Gangai", "FASE DE GRUPOS COPA TOTAL T15");
agregarResultado("Eze", "1-5", "Joaquin Sampadaro", "FASE DE GRUPOS COPA TOTAL T15");
agregarResultado("Joaquin Sampadaro", "5-1", "Eze", "FASE DE GRUPOS COPA TOTAL T15");
agregarResultado("Moreno Perez", "1-5", "Gonzalo Nuñez", "FASE DE GRUPOS COPA TOTAL T15");
agregarResultado("Gonzalo Nuñez", "5-1", "Moreno Perez", "FASE DE GRUPOS COPA TOTAL T15");
agregarResultado("Yago", "1-2", "Renzo Badano", "FASE DE GRUPOS COPA TOTAL T15");
agregarResultado("Renzo Badano", "2-1", "Yago", "FASE DE GRUPOS COPA TOTAL T15");
agregarResultado("Pancho Muzzio", "2-3", "Anubis", "FASE DE GRUPOS COPA TOTAL T15");
agregarResultado("Anubis", "3-2", "Pancho Muzzio", "FASE DE GRUPOS COPA TOTAL T15");
agregarResultado("Matias Varela", "0-1", "Ignacio Cejas", "FASE DE GRUPOS COPA TOTAL T15");
agregarResultado("Ignacio Cejas", "1-0", "Matias Varela", "FASE DE GRUPOS COPA TOTAL T15");
agregarResultado("Tomas Torcasio", "1-4", "Felipe Galante", "FASE DE GRUPOS COPA TOTAL T15");
agregarResultado("Felipe Galante", "4-1", "Tomas Torcasio", "FASE DE GRUPOS COPA TOTAL T15");
agregarResultado("Cami", "4-1", "Nico Luchetti", "FASE DE GRUPOS COPA TOTAL T15");
agregarResultado("Nico Luchetti", "1-4", "Cami", "FASE DE GRUPOS COPA TOTAL T15");
agregarResultado("Kevin Sivori", "2-4", "Rodrigo Talarico", "FASE DE GRUPOS COPA TOTAL T15");
agregarResultado("Rodrigo Talarico", "4-2", "Kevin Sivori", "FASE DE GRUPOS COPA TOTAL T15");
agregarResultado("Joaco Fernandez", "4-3", "Kraiizer", "FASE DE GRUPOS COPA TOTAL T15");
agregarResultado("Kraiizer", "3-4", "Joaco Fernandez", "FASE DE GRUPOS COPA TOTAL T15");
agregarResultado("Rodrigo Soca", "1-2", "Alexis Segovia", "FASE DE GRUPOS COPA TOTAL T15");
agregarResultado("Alexis Segovia", "2-1", "Rodrigo Soca", "FASE DE GRUPOS COPA TOTAL T15");
agregarResultado("Antonella Lopez", "0-1", "Azul Quispe", "FASE DE GRUPOS COPA TOTAL T15");
agregarResultado("Azul Quispe", "1-0", "Antonella Lopez", "FASE DE GRUPOS COPA TOTAL T15");
agregarResultado("Jhose", "3-1", "Luciano Hufschmid", "FASE DE GRUPOS COPA TOTAL T15");
agregarResultado("Luciano Hufschmid", "1-3", "Jhose", "FASE DE GRUPOS COPA TOTAL T15");
agregarResultado("Santi", "1-0", "Natanael", "FASE DE GRUPOS COPA TOTAL T15");
agregarResultado("Natanael", "0-1", "Santi", "FASE DE GRUPOS COPA TOTAL T15");
agregarResultado("Mario Talarico", "2-6", "Facundo Marchese", "FASE DE GRUPOS COPA TOTAL T15");
agregarResultado("Facundo Marchese", "6-2", "Mario Talarico", "FASE DE GRUPOS COPA TOTAL T15");
agregarResultado("Bautista Coria", "4-1", "Dani Bazan", "FASE DE GRUPOS COPA TOTAL T15");
agregarResultado("Dani Bazan", "1-4", "Bautista Coria", "FASE DE GRUPOS COPA TOTAL T15");
agregarResultado("Lucas Insua", "2-1", "Bruno Alonso", "FASE DE GRUPOS COPA TOTAL T15");
agregarResultado("Bruno Alonso", "1-2", "Lucas Insua", "FASE DE GRUPOS COPA TOTAL T15");
agregarResultado("Pollo", "3-2", "Benja", "FASE DE GRUPOS COPA TOTAL T15");
agregarResultado("Benja", "2-3", "Pollo", "FASE DE GRUPOS COPA TOTAL T15");
agregarResultado("Tomas Delgado", "5-2", "Joel Alcalde", "FASE DE GRUPOS COPA TOTAL T15");
agregarResultado("Joel Alcalde", "2-5", "Tomas Delgado", "FASE DE GRUPOS COPA TOTAL T15");
agregarResultado("Leandro Montes", "1-2", "Joaquin Sampadaro", "FASE DE GRUPOS COPA TOTAL T15");
agregarResultado("Joaquin Sampadaro", "2-1", "Leandro Montes", "FASE DE GRUPOS COPA TOTAL T15");
agregarResultado("Eze", "0-1", "Gonzalo Nuñez", "FASE DE GRUPOS COPA TOTAL T15");
agregarResultado("Gonzalo Nuñez", "1-0", "Eze", "FASE DE GRUPOS COPA TOTAL T15");
agregarResultado("Anubis", "1-3", "Renzo Badano", "FASE DE GRUPOS COPA TOTAL T15");
agregarResultado("Renzo Badano", "3-1", "Anubis", "FASE DE GRUPOS COPA TOTAL T15");
agregarResultado("Yago", "1-1", "Nacho Soto", "FASE DE GRUPOS COPA TOTAL T15");
agregarResultado("Nacho Soto", "1-1", "Yago", "FASE DE GRUPOS COPA TOTAL T15");
agregarResultado("Felipe Galante", "0-1", "Ignacio Cejas", "FASE DE GRUPOS COPA TOTAL T15");
agregarResultado("Ignacio Cejas", "1-0", "Felipe Galante", "FASE DE GRUPOS COPA TOTAL T15");
agregarResultado("Matias Varela", "6-4", "Matheo Olivera", "FASE DE GRUPOS COPA TOTAL T15");
agregarResultado("Matheo Olivera", "4-6", "Matias Varela", "FASE DE GRUPOS COPA TOTAL T15");
agregarResultado("Rodrigo Talarico", "7-3", "Nico Luchetti", "FASE DE GRUPOS COPA TOTAL T15");
agregarResultado("Nico Luchetti", "3-7", "Rodrigo Talarico", "FASE DE GRUPOS COPA TOTAL T15");
agregarResultado("Cami", "2-4", "Fabrizio Escolano", "FASE DE GRUPOS COPA TOTAL T15");
agregarResultado("Fabrizio Escolano", "4-2", "Cami", "FASE DE GRUPOS COPA TOTAL T15");
agregarResultado("Alexis Segovia", "4-2", "Kraiizer", "FASE DE GRUPOS COPA TOTAL T15");
agregarResultado("Kraiizer", "2-4", "Alexis Segovia", "FASE DE GRUPOS COPA TOTAL T15");
agregarResultado("Joaco Fernandez", "6-1", "Nico Avalos", "FASE DE GRUPOS COPA TOTAL T15");
agregarResultado("Nico Avalos", "1-6", "Joaco Fernandez", "FASE DE GRUPOS COPA TOTAL T15");
agregarResultado("Luciano Hufschmid", "5-3", "Azul Quispe", "FASE DE GRUPOS COPA TOTAL T15");
agregarResultado("Azul Quispe", "3-5", "Luciano Hufschmid", "FASE DE GRUPOS COPA TOTAL T15");
agregarResultado("Antonella Lopez", "2-5", "Gabriel Talarico", "FASE DE GRUPOS COPA TOTAL T15");
agregarResultado("Gabriel Talarico", "5-2", "Antonella Lopez", "FASE DE GRUPOS COPA TOTAL T15");
agregarResultado("Facundo Marchese", "1-0", "Natanael", "FASE DE GRUPOS COPA TOTAL T15");
agregarResultado("Natanael", "0-1", "Facundo Marchese", "FASE DE GRUPOS COPA TOTAL T15");
agregarResultado("Santi", "0-4", "Joel Marasco", "FASE DE GRUPOS COPA TOTAL T15");
agregarResultado("Joel Marasco", "4-0", "Santi", "FASE DE GRUPOS COPA TOTAL T15");
agregarResultado("Bruno Alonso", "5-5", "Dani Bazan", "FASE DE GRUPOS COPA TOTAL T15");
agregarResultado("Dani Bazan", "5-5", "Bruno Alonso", "FASE DE GRUPOS COPA TOTAL T15");
agregarResultado("Bautista Coria", "3-2", "Lucas Aguilera", "FASE DE GRUPOS COPA TOTAL T15");
agregarResultado("Lucas Aguilera", "2-3", "Bautista Coria", "FASE DE GRUPOS COPA TOTAL T15");
agregarResultado("Joel Alcalde", "3-4", "Benja", "FASE DE GRUPOS COPA TOTAL T15");
agregarResultado("Benja", "4-3", "Joel Alcalde", "FASE DE GRUPOS COPA TOTAL T15");
agregarResultado("Pollo", "3-4", "Ian Gangai", "FASE DE GRUPOS COPA TOTAL T15");
agregarResultado("Ian Gangai", "4-3", "Pollo", "FASE DE GRUPOS COPA TOTAL T15");
agregarResultado("Gonzalo Nuñez", "0-7", "Joaquin Sampadaro", "FASE DE GRUPOS COPA TOTAL T15");
agregarResultado("Joaquin Sampadaro", "7-0", "Gonzalo Nuñez", "FASE DE GRUPOS COPA TOTAL T15");
agregarResultado("Leandro Montes", "0-9", "Moreno Perez", "FASE DE GRUPOS COPA TOTAL T15");
agregarResultado("Moreno Perez", "9-0", "Leandro Montes", "FASE DE GRUPOS COPA TOTAL T15");
agregarResultado("Nacho Soto", "4-1", "Renzo Badano", "FASE DE GRUPOS COPA TOTAL T15");
agregarResultado("Renzo Badano", "1-4", "Nacho Soto", "FASE DE GRUPOS COPA TOTAL T15");
agregarResultado("Yago", "3-5", "Pancho Muzzio", "FASE DE GRUPOS COPA TOTAL T15");
agregarResultado("Pancho Muzzio", "5-3", "Yago", "FASE DE GRUPOS COPA TOTAL T15");
agregarResultado("Matheo Olivera", "2-1", "Ignacio Cejas", "FASE DE GRUPOS COPA TOTAL T15");
agregarResultado("Ignacio Cejas", "1-2", "Matheo Olivera", "FASE DE GRUPOS COPA TOTAL T15");
agregarResultado("Matias Varela", "6-4", "Tomas Torcasio", "FASE DE GRUPOS COPA TOTAL T15");
agregarResultado("Tomas Torcasio", "4-6", "Matias Varela", "FASE DE GRUPOS COPA TOTAL T15");
agregarResultado("Fabrizio Escolano", "7-4", "Nico Luchetti", "FASE DE GRUPOS COPA TOTAL T15");
agregarResultado("Nico Luchetti", "4-7", "Fabrizio Escolano", "FASE DE GRUPOS COPA TOTAL T15");
agregarResultado("Cami", "6-4", "Kevin Sivori", "FASE DE GRUPOS COPA TOTAL T15");
agregarResultado("Kevin Sivori", "4-6", "Cami", "FASE DE GRUPOS COPA TOTAL T15");
agregarResultado("Nico Avalos", "6-2", "Kraiizer", "FASE DE GRUPOS COPA TOTAL T15");
agregarResultado("Kraiizer", "2-6", "Nico Avalos", "FASE DE GRUPOS COPA TOTAL T15");
agregarResultado("Joaco Fernandez", "6-2", "Rodrigo Soca", "FASE DE GRUPOS COPA TOTAL T15");
agregarResultado("Rodrigo Soca", "2-6", "Joaco Fernandez", "FASE DE GRUPOS COPA TOTAL T15");
agregarResultado("Gabriel Talarico", "5-2", "Azul Quispe", "FASE DE GRUPOS COPA TOTAL T15");
agregarResultado("Azul Quispe", "2-5", "Gabriel Talarico", "FASE DE GRUPOS COPA TOTAL T15");
agregarResultado("Antonella Lopez", "2-3", "Jhose", "FASE DE GRUPOS COPA TOTAL T15");
agregarResultado("Jhose", "3-2", "Antonella Lopez", "FASE DE GRUPOS COPA TOTAL T15");
agregarResultado("Joel Marasco", "3-4", "Natanael", "FASE DE GRUPOS COPA TOTAL T15");
agregarResultado("Natanael", "4-3", "Joel Marasco", "FASE DE GRUPOS COPA TOTAL T15");
agregarResultado("Santi", "0-6", "Mario Talarico", "FASE DE GRUPOS COPA TOTAL T15");
agregarResultado("Mario Talarico", "6-0", "Santi", "FASE DE GRUPOS COPA TOTAL T15");
agregarResultado("Lucas Aguilera", "5-3", "Dani Bazan", "FASE DE GRUPOS COPA TOTAL T15");
agregarResultado("Dani Bazan", "3-5", "Lucas Aguilera", "FASE DE GRUPOS COPA TOTAL T15");
agregarResultado("Bautista Coria", "2-7", "Lucas Insua", "FASE DE GRUPOS COPA TOTAL T15");
agregarResultado("Lucas Insua", "7-2", "Bautista Coria", "FASE DE GRUPOS COPA TOTAL T15");
agregarResultado("Ian Gangai", "4-4", "Benja", "FASE DE GRUPOS COPA TOTAL T15");
agregarResultado("Benja", "4-4", "Ian Gangai", "FASE DE GRUPOS COPA TOTAL T15");
agregarResultado("Pollo", "6-3", "Tomas Delgado", "FASE DE GRUPOS COPA TOTAL T15");
agregarResultado("Tomas Delgado", "3-6", "Pollo", "FASE DE GRUPOS COPA TOTAL T15");
agregarResultado("Moreno Perez", "3-5", "Joaquin Sampadaro", "FASE DE GRUPOS COPA TOTAL T15");
agregarResultado("Joaquin Sampadaro", "5-3", "Moreno Perez", "FASE DE GRUPOS COPA TOTAL T15");
agregarResultado("Leandro Montes", "0-0", "Eze", "FASE DE GRUPOS COPA TOTAL T15");
agregarResultado("Eze", "0-0", "Leandro Montes", "FASE DE GRUPOS COPA TOTAL T15");
agregarResultado("Pancho Muzzio", "6-4", "Gonzalo Nuñez", "OCTAVOS DE FINAL COPA TOTAL T15");
agregarResultado("Gonzalo Nuñez", "4-6", "Pancho Muzzio", "OCTAVOS DE FINAL COPA TOTAL T15");
agregarResultado("Joaquin Sampadaro", "2-3", "Benja", "OCTAVOS DE FINAL COPA TOTAL T15");
agregarResultado("Benja", "3-2", "Joaquin Sampadaro", "OCTAVOS DE FINAL COPA TOTAL T15");
agregarResultado("Jhose", "10-3", "Lucas Insua", "OCTAVOS DE FINAL COPA TOTAL T15");
agregarResultado("Lucas Insua", "3-10", "Jhose", "OCTAVOS DE FINAL COPA TOTAL T15");
agregarResultado("Fabrizio Escolano", "4-4", "Joaco Fernandez", "OCTAVOS DE FINAL COPA TOTAL T15");
agregarResultado("Joaco Fernandez", "4-4", "Fabrizio Escolano", "OCTAVOS DE FINAL COPA TOTAL T15");
agregarResultado("Rodrigo Talarico", "5-5", "Ignacio Cejas", "OCTAVOS DE FINAL COPA TOTAL T15");
agregarResultado("Ignacio Cejas", "5-5", "Rodrigo Talarico", "OCTAVOS DE FINAL COPA TOTAL T15");
agregarResultado("Alexis Segovia", "4-4", "Matias Varela", "OCTAVOS DE FINAL COPA TOTAL T15");
agregarResultado("Matias Varela", "4-4", "Alexis Segovia", "OCTAVOS DE FINAL COPA TOTAL T15");
agregarResultado("Facundo Marchese", "4-9", "Luciano Hufschmid", "OCTAVOS DE FINAL COPA TOTAL T15");
agregarResultado("Luciano Hufschmid", "9-4", "Facundo Marchese", "OCTAVOS DE FINAL COPA TOTAL T15");
agregarResultado("Renzo Badano", "8-8", "Mario Talarico", "OCTAVOS DE FINAL COPA TOTAL T15");
agregarResultado("Mario Talarico", "8-8", "Renzo Badano", "OCTAVOS DE FINAL COPA TOTAL T15");
agregarResultado("Fabrizio Escolano", "7-10", "Joaco Fernandez", "DESEMPATE OCTAVOS DE FINAL COPA TOTAL T15");
agregarResultado("Joaco Fernandez", "10-7", "Fabrizio Escolano", "DESEMPATE OCTAVOS DE FINAL COPA TOTAL T15");
agregarResultado("Rodrigo Talarico", "5-6", "Ignacio Cejas", "DESEMPATE OCTAVOS DE FINAL COPA TOTAL T15");
agregarResultado("Ignacio Cejas", "6-5", "Rodrigo Talarico", "DESEMPATE OCTAVOS DE FINAL COPA TOTAL T15");
agregarResultado("Alexis Segovia", "4-11", "Matias Varela", "DESEMPATE OCTAVOS DE FINAL COPA TOTAL T15");
agregarResultado("Matias Varela", "11-4", "Alexis Segovia", "DESEMPATE OCTAVOS DE FINAL COPA TOTAL T15");
agregarResultado("Renzo Badano", "11-9", "Mario Talarico", "DESEMPATE OCTAVOS DE FINAL COPA TOTAL T15");
agregarResultado("Mario Talarico", "9-11", "Renzo Badano", "DESEMPATE OCTAVOS DE FINAL COPA TOTAL T15");
agregarResultado("Ignacio Cejas", "13-10", "Jhose", "CUARTOS DE FINAL COPA TOTAL T15");
agregarResultado("Jhose", "10-13", "Ignacio Cejas", "CUARTOS DE FINAL COPA TOTAL T15");
agregarResultado("Benja", "5-9", "Pancho Muzzio", "CUARTOS DE FINAL COPA TOTAL T15");
agregarResultado("Pancho Muzzio", "9-5", "Benja", "CUARTOS DE FINAL COPA TOTAL T15");
agregarResultado("Renzo Badano", "7-6", "Joaco Fernandez", "CUARTOS DE FINAL COPA TOTAL T15");
agregarResultado("Joaco Fernandez", "6-7", "Renzo Badano", "CUARTOS DE FINAL COPA TOTAL T15");
agregarResultado("Matias Varela", "5-4", "Luciano Hufschmid", "CUARTOS DE FINAL COPA TOTAL T15");
agregarResultado("Luciano Hufschmid", "4-5", "Matias Varela", "CUARTOS DE FINAL COPA TOTAL T15");
agregarResultado("Renzo Badano", "9-8", "Pancho Muzzio", "SEMIFINAL COPA TOTAL T15");
agregarResultado("Pancho Muzzio", "8-9", "Renzo Badano", "SEMIFINAL COPA TOTAL T15");
agregarResultado("Ignacio Cejas", "16-10", "Matias Varela", "SEMIFINAL COPA TOTAL T15");
agregarResultado("Matias Varela", "10-16", "Ignacio Cejas", "SEMIFINAL COPA TOTAL T15");
agregarResultado("Renzo Badano", "5-12", "Ignacio Cejas", "FINAL COPA TOTAL T15");
agregarResultado("Ignacio Cejas", "12-5", "Renzo Badano", "FINAL COPA TOTAL T15");
agregarResultado("Benja", "9-9", "Jhose", "64AVOS DE FINAL COPA CAMPEONES T15");
agregarResultado("Jhose", "9-9", "Benja", "64AVOS DE FINAL COPA CAMPEONES T15");
agregarResultado("Benja", "2-8", "Jhose", "DESEMPATE 64AVOS DE FINAL COPA CAMPEONES T15");
agregarResultado("Jhose", "8-2", "Benja", "DESEMPATE 64AVOS DE FINAL COPA CAMPEONES T15");
agregarResultado("Jhose", "8-8", "Pancho Muzzio", "32AVOS DE FINAL COPA CAMPEONES T15");
agregarResultado("Pancho Muzzio", "8-8", "Jhose", "32AVOS DE FINAL COPA CAMPEONES T15");
agregarResultado("Ian Gangai", "11-13", "Moreno Perez", "32AVOS DE FINAL COPA CAMPEONES T15");
agregarResultado("Moreno Perez", "13-11", "Ian Gangai", "32AVOS DE FINAL COPA CAMPEONES T15");
agregarResultado("Renzo Badano", "6-17", "Luciano Hufschmid", "32AVOS DE FINAL COPA CAMPEONES T15");
agregarResultado("Luciano Hufschmid", "17-6", "Renzo Badano", "32AVOS DE FINAL COPA CAMPEONES T15");
agregarResultado("Jhose", "6-3", "Pancho Muzzio", "DESEMPATE 32AVOS DE FINAL COPA CAMPEONES T15");
agregarResultado("Pancho Muzzio", "3-6", "Jhose", "DESEMPATE 32AVOS DE FINAL COPA CAMPEONES T15");
agregarResultado("Jhose", "10-8", "Mario Talarico", "16AVOS DE FINAL COPA CAMPEONES T15");
agregarResultado("Mario Talarico", "8-10", "Jhose", "16AVOS DE FINAL COPA CAMPEONES T15");
agregarResultado("Moreno Perez", "9-9", "Luciano Hufschmid", "16AVOS DE FINAL COPA CAMPEONES T15");
agregarResultado("Luciano Hufschmid", "9-9", "Moreno Perez", "16AVOS DE FINAL COPA CAMPEONES T15");
agregarResultado("Moreno Perez", "6-2", "Luciano Hufschmid", "DESEMPATE 16AVOS DE FINAL COPA CAMPEONES T15");
agregarResultado("Luciano Hufschmid", "2-6", "Moreno Perez", "DESEMPATE 16AVOS DE FINAL COPA CAMPEONES T15");
agregarResultado("Jhose", "10-8", "Nico Luchetti (R)", "OCTAVOS DE FINAL COPA CAMPEONES T15");
agregarResultado("Nico Luchetti (R)", "8-10", "Jhose", "OCTAVOS DE FINAL COPA CAMPEONES T15");
agregarResultado("Moreno Perez", "7-9", "Fabrizio Escolano", "OCTAVOS DE FINAL COPA CAMPEONES T15");
agregarResultado("Fabrizio Escolano", "9-7", "Moreno Perez", "OCTAVOS DE FINAL COPA CAMPEONES T15");
agregarResultado("Gabriel Talarico", "6-14", "Rodrigo Soca", "OCTAVOS DE FINAL COPA CAMPEONES T15");
agregarResultado("Rodrigo Soca", "14-6", "Gabriel Talarico", "OCTAVOS DE FINAL COPA CAMPEONES T15");
agregarResultado("Jhose", "13-4", "Alexis Segovia", "CUARTOS DE FINAL COPA CAMPEONES T15");
agregarResultado("Alexis Segovia", "4-13", "Jhose", "CUARTOS DE FINAL COPA CAMPEONES T15");
agregarResultado("Fabrizio Escolano", "24-15", "Rodrigo Soca", "CUARTOS DE FINAL COPA CAMPEONES T15");
agregarResultado("Rodrigo Soca", "15-24", "Fabrizio Escolano", "CUARTOS DE FINAL COPA CAMPEONES T15");
agregarResultado("Jhose", "8-5", "Nacho Soto", "SEMIFINAL COPA CAMPEONES T15");
agregarResultado("Nacho Soto", "5-8", "Jhose", "SEMIFINAL COPA CAMPEONES T15");
agregarResultado("Fabrizio Escolano", "8-10", "Tomas Torcasio", "SEMIFINAL COPA CAMPEONES T15");
agregarResultado("Tomas Torcasio", "10-8", "Fabrizio Escolano", "SEMIFINAL COPA CAMPEONES T15");
agregarResultado("Jhose", "6-9", "Tomas Torcasio", "FINAL COPA CAMPEONES T15");
agregarResultado("Tomas Torcasio", "9-6", "Jhose", "FINAL COPA CAMPEONES T15");
agregarResultado("Rodrigo Talarico", "21-17", "Tomas Torcasio", "FINAL COPA DUOS");
agregarResultado("Tomas Torcasio", "17-21", "Rodrigo Talarico", "FINAL COPA DUOS");
agregarResultado("Kevin Sivori", "21-17", "Moreno Perez", "FINAL COPA DUOS");
agregarResultado("Moreno Perez", "17-21", "Kevin Sivori", "FINAL COPA DUOS");
agregarResultado("Rodrigo Talarico", "21-17", "Moreno Perez", "FINAL COPA DUOS");
agregarResultado("Moreno Perez", "17-21", "Rodrigo Talarico", "FINAL COPA DUOS");
agregarResultado("Kevin Sivori", "21-17", "Tomas Torcasio", "FINAL COPA DUOS");
agregarResultado("Tomas Torcasio", "17-21", "Kevin Sivori", "FINAL COPA DUOS");
agregarResultado("Pollo", "2-0", "Nacho Soto", "DESEMPATE LIGA A T15");
agregarResultado("Nacho Soto", "0-2", "Pollo", "DESEMPATE LIGA A T15");
agregarResultado("Pollo", "8-8", "Jhose", "PROMOCION 1RA DIVISION T15");
agregarResultado("Jhose", "8-8", "Pollo", "PROMOCION 1RA DIVISION T15");
agregarResultado("Joel Marasco", "6-6", "Eze", "PROMOCION 1RA DIVISION T15");
agregarResultado("Eze", "6-6", "Joel Marasco", "PROMOCION 1RA DIVISION T15");
agregarResultado("Gonzalo Nuñez", "10-7", "Joaquin Sampadaro", "PROMOCION 2DA DIVISION T15");
agregarResultado("Joaquin Sampadaro", "7-10", "Gonzalo Nuñez", "PROMOCION 2DA DIVISION T15");
agregarResultado("Rodrigo Talarico", "11-5", "Bautista Coria", "PROMOCION 2DA DIVISION T15");
agregarResultado("Bautista Coria", "5-11", "Rodrigo Talarico", "PROMOCION 2DA DIVISION T15");
agregarResultado("Anubis", "3-4", "Yago", "DESEMPATE LIGA C T15");
agregarResultado("Yago", "4-3", "Anubis", "DESEMPATE LIGA C T15");
agregarResultado("Tomas Torcasio", "4-4", "Matheo Olivera", "OCTAVOS DE FINAL COPA A T16");
agregarResultado("Matheo Olivera", "4-4", "Tomas Torcasio", "OCTAVOS DE FINAL COPA A T16");
agregarResultado("Ian Gangai", "8-7", "Fabrizio Escolano", "OCTAVOS DE FINAL COPA A T16");
agregarResultado("Fabrizio Escolano", "7-8", "Ian Gangai", "OCTAVOS DE FINAL COPA A T16");
agregarResultado("Pollo", "5-4", "Nico Avalos", "OCTAVOS DE FINAL COPA A T16");
agregarResultado("Nico Avalos", "4-5", "Pollo", "OCTAVOS DE FINAL COPA A T16");
agregarResultado("Tomas Delgado", "4-7", "Facundo Marchese", "OCTAVOS DE FINAL COPA A T16");
agregarResultado("Facundo Marchese", "7-4", "Tomas Delgado", "OCTAVOS DE FINAL COPA A T16");
agregarResultado("Tomas Torcasio", "1-1", "Matheo Olivera", "DESEMPATE OCTAVOS DE FINAL COPA A T16");
agregarResultado("Matheo Olivera", "1-1", "Tomas Torcasio", "DESEMPATE OCTAVOS DE FINAL COPA A T16");
agregarResultado("Tomas Torcasio", "4-0", "Matheo Olivera", "DESEMPATE 2 OCTAVOS DE FINAL COPA A T16");
agregarResultado("Matheo Olivera", "0-4", "Tomas Torcasio", "DESEMPATE 2 OCTAVOS DE FINAL COPA A T16");
agregarResultado("Mario Talarico", "4-12", "Tomas Torcasio", "CUARTOS DE FINAL COPA A T16");
agregarResultado("Tomas Torcasio", "12-4", "Mario Talarico", "CUARTOS DE FINAL COPA A T16");
agregarResultado("Moreno Perez", "5-7", "Pollo", "CUARTOS DE FINAL COPA A T16");
agregarResultado("Pollo", "7-5", "Moreno Perez", "CUARTOS DE FINAL COPA A T16");
agregarResultado("Rodrigo Soca", "6-6", "Ian Gangai", "CUARTOS DE FINAL COPA A T16");
agregarResultado("Ian Gangai", "6-6", "Rodrigo Soca", "CUARTOS DE FINAL COPA A T16");
agregarResultado("Lucas Aguilera", "5-5", "Facundo Marchese", "CUARTOS DE FINAL COPA A T16");
agregarResultado("Facundo Marchese", "5-5", "Lucas Aguilera", "CUARTOS DE FINAL COPA A T16");
agregarResultado("Rodrigo Soca", "6-2", "Ian Gangai", "DESEMPATE CUARTOS DE FINAL COPA A");
agregarResultado("Ian Gangai", "2-6", "Rodrigo Soca", "DESEMPATE CUARTOS DE FINAL COPA A");
agregarResultado("Lucas Aguilera", "6-6", "Facundo Marchese", "DESEMPATE CUARTOS DE FINAL COPA A");
agregarResultado("Facundo Marchese", "6-6", "Lucas Aguilera", "DESEMPATE CUARTOS DE FINAL COPA A");
agregarResultado("Lucas Aguilera", "1-5", "Facundo Marchese", "DESEMPATE 2 CUARTOS DE FINAL COPA A T16");
agregarResultado("Facundo Marchese", "5-1", "Lucas Aguilera", "DESEMPATE 2 CUARTOS DE FINAL COPA A T16");
agregarResultado("Rodrigo Soca", "4-3", "Facundo Marchese", "SEMIFINAL COPA A T16");
agregarResultado("Facundo Marchese", "3-4", "Rodrigo Soca", "SEMIFINAL COPA A T16");
agregarResultado("Tomas Torcasio", "2-4", "Pollo", "SEMIFINAL COPA A T16");
agregarResultado("Pollo", "4-2", "Tomas Torcasio", "SEMIFINAL COPA A T16");
agregarResultado("Rodrigo Soca", "7-3", "Pollo", "FINAL COPA A T16");
agregarResultado("Pollo", "3-7", "Rodrigo Soca", "FINAL COPA A T16");
agregarResultado("Gonzalo Nuñez", "3-5", "Yago", "OCTAVOS DE FINAL COPA B T16");
agregarResultado("Yago", "5-3", "Gonzalo Nuñez", "OCTAVOS DE FINAL COPA B T16");
agregarResultado("Joaco Fernandez", "6-5", "Rodrigo Talarico", "OCTAVOS DE FINAL COPA B T16");
agregarResultado("Rodrigo Talarico", "5-6", "Joaco Fernandez", "OCTAVOS DE FINAL COPA B T16");
agregarResultado("Benja", "3-2", "Matias Varela", "OCTAVOS DE FINAL COPA B T16");
agregarResultado("Matias Varela", "2-3", "Benja", "OCTAVOS DE FINAL COPA B T16");
agregarResultado("Nacho Soto", "5-4", "Jhose", "OCTAVOS DE FINAL COPA B T16");
agregarResultado("Jhose", "4-5", "Nacho Soto", "OCTAVOS DE FINAL COPA B T16");
agregarResultado("Ignacio Cejas", "6-4", "Nacho Soto", "CUARTOS DE FINAL COPA B T16");
agregarResultado("Nacho Soto", "4-6", "Ignacio Cejas", "CUARTOS DE FINAL COPA B T16");
agregarResultado("Cami", "6-7", "Joaco Fernandez", "CUARTOS DE FINAL COPA B T16");
agregarResultado("Joaco Fernandez", "7-6", "Cami", "CUARTOS DE FINAL COPA B T16");
agregarResultado("Anubis", "4-8", "Yago", "CUARTOS DE FINAL COPA B T16");
agregarResultado("Yago", "8-4", "Anubis", "CUARTOS DE FINAL COPA B T16");
agregarResultado("Eze", "1-6", "Benja", "CUARTOS DE FINAL COPA B T16");
agregarResultado("Benja", "6-1", "Eze", "CUARTOS DE FINAL COPA B T16");
agregarResultado("Ignacio Cejas", "5-2", "Yago", "SEMIFINAL COPA B T16");
agregarResultado("Yago", "2-5", "Ignacio Cejas", "SEMIFINAL COPA B T16");
agregarResultado("Benja", "3-3", "Joaco Fernandez", "SEMIFINAL COPA B T16");
agregarResultado("Joaco Fernandez", "3-3", "Benja", "SEMIFINAL COPA B T16");
agregarResultado("Benja", "0-1", "Joaco Fernandez", "DESEMPATE SEMIFINAL COPA B T16");
agregarResultado("Joaco Fernandez", "1-0", "Benja", "DESEMPATE SEMIFINAL COPA B T16");
agregarResultado("Ignacio Cejas", "3-9", "Joaco Fernandez", "FINAL COPA B T16");
agregarResultado("Joaco Fernandez", "9-3", "Ignacio Cejas", "FINAL COPA B T16");
agregarResultado("Nico Luchetti (R)", "3-0", "Santi", "CUARTOS DE FINAL COPA C T16");
agregarResultado("Santi", "0-3", "Nico Luchetti (R)", "CUARTOS DE FINAL COPA C T16");
agregarResultado("Ramiro Ebel", "5-11", "Nico Luchetti (C)", "CUARTOS DE FINAL COPA C T16");
agregarResultado("Nico Luchetti (C)", "11-5", "Ramiro Ebel", "CUARTOS DE FINAL COPA C T16");
agregarResultado("Dani Bazan", "5-7", "Federico Moreno", "CUARTOS DE FINAL COPA C T16");
agregarResultado("Leandro Montes", "13-13", "Bautista Coria", "CUARTOS DE FINAL COPA C T16");
agregarResultado("Bautista Coria", "13-13", "Leandro Montes", "CUARTOS DE FINAL COPA C T16");
agregarResultado("Leandro Montes", "1-4", "Bautista Coria", "DESEMPATE CUARTOS DE FINAL COPA C T16");
agregarResultado("Bautista Coria", "4-1", "Leandro Montes", "DESEMPATE CUARTOS DE FINAL COPA C T16");
agregarResultado("Bautista Coria", "4-1", "Federico Moreno", "SEMIFINAL COPA C T16");
agregarResultado("Nico Luchetti (C)", "3-6", "Nico Luchetti (R)", "SEMIFINAL COPA C T16");
agregarResultado("Nico Luchetti (R)", "6-3", "Nico Luchetti (C)", "SEMIFINAL COPA C T16");
agregarResultado("Bautista Coria", "5-0", "Nico Luchetti (R)", "FINAL COPA C T16");
agregarResultado("Nico Luchetti (R)", "0-5", "Bautista Coria", "FINAL COPA C T16");
agregarResultado("Anubis", "4-4", "Ignacio Cejas", "FASE DE GRUPOS COPA TOTAL T16");
agregarResultado("Ignacio Cejas", "4-4", "Anubis", "FASE DE GRUPOS COPA TOTAL T16");
agregarResultado("Lucas Aguilera", "4-0", "Joel Alcalde", "FASE DE GRUPOS COPA TOTAL T16");
agregarResultado("Joel Alcalde", "0-4", "Lucas Aguilera", "FASE DE GRUPOS COPA TOTAL T16");
agregarResultado("Bautista Coria", "2-7", "Fabrizio Escolano", "FASE DE GRUPOS COPA TOTAL T16");
agregarResultado("Fabrizio Escolano", "7-2", "Bautista Coria", "FASE DE GRUPOS COPA TOTAL T16");
agregarResultado("Tomas Delgado", "5-4", "Nacho Soto", "FASE DE GRUPOS COPA TOTAL T16");
agregarResultado("Nacho Soto", "4-5", "Tomas Delgado", "FASE DE GRUPOS COPA TOTAL T16");
agregarResultado("Azul Quispe", "2-4", "Rodrigo Soca", "FASE DE GRUPOS COPA TOTAL T16");
agregarResultado("Rodrigo Soca", "4-2", "Azul Quispe", "FASE DE GRUPOS COPA TOTAL T16");
agregarResultado("Mario Talarico", "1-2", "Rodrigo Talarico", "FASE DE GRUPOS COPA TOTAL T16");
agregarResultado("Rodrigo Talarico", "2-1", "Mario Talarico", "FASE DE GRUPOS COPA TOTAL T16");
agregarResultado("Kraiizer", "0-1", "Moreno Perez", "FASE DE GRUPOS COPA TOTAL T16");
agregarResultado("Moreno Perez", "1-0", "Kraiizer", "FASE DE GRUPOS COPA TOTAL T16");
agregarResultado("Pancho Muzzio", "4-2", "Jhose", "FASE DE GRUPOS COPA TOTAL T16");
agregarResultado("Jhose", "2-4", "Pancho Muzzio", "FASE DE GRUPOS COPA TOTAL T16");
agregarResultado("Dani Bazan", "0-4", "Ian Gangai", "FASE DE GRUPOS COPA TOTAL T16");
agregarResultado("Ian Gangai", "4-0", "Dani Bazan", "FASE DE GRUPOS COPA TOTAL T16");
agregarResultado("Eze", "2-5", "Facundo Marchese", "FASE DE GRUPOS COPA TOTAL T16");
agregarResultado("Facundo Marchese", "5-2", "Eze", "FASE DE GRUPOS COPA TOTAL T16");
agregarResultado("Joaquin Sampadaro", "0-3", "Lucas Insua", "FASE DE GRUPOS COPA TOTAL T16");
agregarResultado("Lucas Insua", "3-0", "Joaquin Sampadaro", "FASE DE GRUPOS COPA TOTAL T16");
agregarResultado("Matheo Olivera", "0-2", "Bruno Alonso", "FASE DE GRUPOS COPA TOTAL T16");
agregarResultado("Bruno Alonso", "2-0", "Matheo Olivera", "FASE DE GRUPOS COPA TOTAL T16");
agregarResultado("Benja", "4-0", "Nico Avalos", "FASE DE GRUPOS COPA TOTAL T16");
agregarResultado("Nico Avalos", "0-4", "Benja", "FASE DE GRUPOS COPA TOTAL T16");
agregarResultado("Kevin Sivori", "3-2", "Gonzalo Nuñez", "FASE DE GRUPOS COPA TOTAL T16");
agregarResultado("Gonzalo Nuñez", "2-3", "Kevin Sivori", "FASE DE GRUPOS COPA TOTAL T16");
agregarResultado("Pollo", "2-2", "Tomas Torcasio", "FASE DE GRUPOS COPA TOTAL T16");
agregarResultado("Tomas Torcasio", "2-2", "Pollo", "FASE DE GRUPOS COPA TOTAL T16");
agregarResultado("Alexis Segovia", "1-4", "Luciano Hufschmid", "FASE DE GRUPOS COPA TOTAL T16");
agregarResultado("Luciano Hufschmid", "4-1", "Alexis Segovia", "FASE DE GRUPOS COPA TOTAL T16");
agregarResultado("Gabriel Talarico", "3-0", "Nico Luchetti (R)", "FASE DE GRUPOS COPA TOTAL T16");
agregarResultado("Nico Luchetti (R)", "0-3", "Gabriel Talarico", "FASE DE GRUPOS COPA TOTAL T16");
agregarResultado("Cami", "5-0", "Joel Marasco", "FASE DE GRUPOS COPA TOTAL T16");
agregarResultado("Joel Marasco", "0-5", "Cami", "FASE DE GRUPOS COPA TOTAL T16");
agregarResultado("Renzo Badano", "1-1", "Joaco Fernandez", "FASE DE GRUPOS COPA TOTAL T16");
agregarResultado("Joaco Fernandez", "1-1", "Renzo Badano", "FASE DE GRUPOS COPA TOTAL T16");
agregarResultado("Ignacio Cejas", "2-1", "Ramiro Ebel", "FASE DE GRUPOS COPA TOTAL T16");
agregarResultado("Ramiro Ebel", "1-2", "Ignacio Cejas", "FASE DE GRUPOS COPA TOTAL T16");
agregarResultado("Anubis", "3-2", "Lucas Aguilera", "FASE DE GRUPOS COPA TOTAL T16");
agregarResultado("Lucas Aguilera", "2-3", "Anubis", "FASE DE GRUPOS COPA TOTAL T16");
agregarResultado("Fabrizio Escolano", "2-0", "Matias Varela", "FASE DE GRUPOS COPA TOTAL T16");
agregarResultado("Matias Varela", "0-2", "Fabrizio Escolano", "FASE DE GRUPOS COPA TOTAL T16");
agregarResultado("Bautista Coria", "2-2", "Tomas Delgado", "FASE DE GRUPOS COPA TOTAL T16");
agregarResultado("Tomas Delgado", "2-2", "Bautista Coria", "FASE DE GRUPOS COPA TOTAL T16");
agregarResultado("Rodrigo Soca", "2-2", "Leandro Montes", "FASE DE GRUPOS COPA TOTAL T16");
agregarResultado("Leandro Montes", "2-2", "Rodrigo Soca", "FASE DE GRUPOS COPA TOTAL T16");
agregarResultado("Azul Quispe", "1-2", "Mario Talarico", "FASE DE GRUPOS COPA TOTAL T16");
agregarResultado("Mario Talarico", "2-1", "Azul Quispe", "FASE DE GRUPOS COPA TOTAL T16");
agregarResultado("Moreno Perez", "2-1", "Nico Luchetti (C)", "FASE DE GRUPOS COPA TOTAL T16");
agregarResultado("Nico Luchetti (C)", "1-2", "Moreno Perez", "FASE DE GRUPOS COPA TOTAL T16");
agregarResultado("Kraiizer", "0-1", "Pancho Muzzio", "FASE DE GRUPOS COPA TOTAL T16");
agregarResultado("Pancho Muzzio", "1-0", "Kraiizer", "FASE DE GRUPOS COPA TOTAL T16");
agregarResultado("Ian Gangai", "3-1", "Yago", "FASE DE GRUPOS COPA TOTAL T16");
agregarResultado("Yago", "1-3", "Ian Gangai", "FASE DE GRUPOS COPA TOTAL T16");
agregarResultado("Dani Bazan", "3-1", "Eze", "FASE DE GRUPOS COPA TOTAL T16");
agregarResultado("Eze", "1-3", "Dani Bazan", "FASE DE GRUPOS COPA TOTAL T16");
agregarResultado("Lucas Insua", "1-2", "Santi", "FASE DE GRUPOS COPA TOTAL T16");
agregarResultado("Santi", "2-1", "Lucas Insua", "FASE DE GRUPOS COPA TOTAL T16");
agregarResultado("Joaquin Sampadaro", "2-0", "Matheo Olivera", "FASE DE GRUPOS COPA TOTAL T16");
agregarResultado("Matheo Olivera", "0-2", "Joaquin Sampadaro", "FASE DE GRUPOS COPA TOTAL T16");
agregarResultado("Nico Avalos", "0-0", "Federico Moreno", "FASE DE GRUPOS COPA TOTAL T16");
agregarResultado("Benja", "1-1", "Kevin Sivori", "FASE DE GRUPOS COPA TOTAL T16");
agregarResultado("Kevin Sivori", "1-1", "Benja", "FASE DE GRUPOS COPA TOTAL T16");
agregarResultado("Tomas Torcasio", "2-0", "Lautaro Scocier", "FASE DE GRUPOS COPA TOTAL T16");
agregarResultado("Lautaro Scocier", "0-2", "Tomas Torcasio", "FASE DE GRUPOS COPA TOTAL T16");
agregarResultado("Pollo", "1-0", "Alexis Segovia", "FASE DE GRUPOS COPA TOTAL T16");
agregarResultado("Alexis Segovia", "0-1", "Pollo", "FASE DE GRUPOS COPA TOTAL T16");
agregarResultado("Joel Marasco", "1-2", "Nico Luchetti (R)", "FASE DE GRUPOS COPA TOTAL T16");
agregarResultado("Nico Luchetti (R)", "2-1", "Joel Marasco", "FASE DE GRUPOS COPA TOTAL T16");
agregarResultado("Gabriel Talarico", "2-1", "Joaco Fernandez", "FASE DE GRUPOS COPA TOTAL T16");
agregarResultado("Joaco Fernandez", "1-2", "Gabriel Talarico", "FASE DE GRUPOS COPA TOTAL T16");
agregarResultado("Cami", "5-2", "Renzo Badano", "FASE DE GRUPOS COPA TOTAL T16");
agregarResultado("Renzo Badano", "2-5", "Cami", "FASE DE GRUPOS COPA TOTAL T16");
agregarResultado("Joel Alcalde", "0-3", "Ramiro Ebel", "FASE DE GRUPOS COPA TOTAL T16");
agregarResultado("Ramiro Ebel", "3-0", "Joel Alcalde", "FASE DE GRUPOS COPA TOTAL T16");
agregarResultado("Ignacio Cejas", "2-7", "Lucas Aguilera", "FASE DE GRUPOS COPA TOTAL T16");
agregarResultado("Lucas Aguilera", "7-2", "Ignacio Cejas", "FASE DE GRUPOS COPA TOTAL T16");
agregarResultado("Nacho Soto", "1-4", "Matias Varela", "FASE DE GRUPOS COPA TOTAL T16");
agregarResultado("Matias Varela", "4-1", "Nacho Soto", "FASE DE GRUPOS COPA TOTAL T16");
agregarResultado("Fabrizio Escolano", "1-5", "Tomas Delgado", "FASE DE GRUPOS COPA TOTAL T16");
agregarResultado("Tomas Delgado", "5-1", "Fabrizio Escolano", "FASE DE GRUPOS COPA TOTAL T16");
agregarResultado("Rodrigo Talarico", "1-1", "Leandro Montes", "FASE DE GRUPOS COPA TOTAL T16");
agregarResultado("Leandro Montes", "1-1", "Rodrigo Talarico", "FASE DE GRUPOS COPA TOTAL T16");
agregarResultado("Rodrigo Soca", "1-6", "Mario Talarico", "FASE DE GRUPOS COPA TOTAL T16");
agregarResultado("Mario Talarico", "6-1", "Rodrigo Soca", "FASE DE GRUPOS COPA TOTAL T16");
agregarResultado("Jhose", "2-3", "Nico Luchetti (C)", "FASE DE GRUPOS COPA TOTAL T16");
agregarResultado("Nico Luchetti (C)", "3-2", "Jhose", "FASE DE GRUPOS COPA TOTAL T16");
agregarResultado("Moreno Perez", "3-3", "Pancho Muzzio", "FASE DE GRUPOS COPA TOTAL T16");
agregarResultado("Pancho Muzzio", "3-3", "Moreno Perez", "FASE DE GRUPOS COPA TOTAL T16");
agregarResultado("Facundo Marchese", "2-0", "Yago", "FASE DE GRUPOS COPA TOTAL T16");
agregarResultado("Yago", "0-2", "Facundo Marchese", "FASE DE GRUPOS COPA TOTAL T16");
agregarResultado("Ian Gangai", "1-7", "Eze", "FASE DE GRUPOS COPA TOTAL T16");
agregarResultado("Eze", "7-1", "Ian Gangai", "FASE DE GRUPOS COPA TOTAL T16");
agregarResultado("Bruno Alonso", "3-2", "Santi", "FASE DE GRUPOS COPA TOTAL T16");
agregarResultado("Santi", "2-3", "Bruno Alonso", "FASE DE GRUPOS COPA TOTAL T16");
agregarResultado("Lucas Insua", "3-6", "Matheo Olivera", "FASE DE GRUPOS COPA TOTAL T16");
agregarResultado("Matheo Olivera", "6-3", "Lucas Insua", "FASE DE GRUPOS COPA TOTAL T16");
agregarResultado("Gonzalo Nuñez", "3-0", "Federico Moreno", "FASE DE GRUPOS COPA TOTAL T16");
agregarResultado("Nico Avalos", "6-4", "Kevin Sivori", "FASE DE GRUPOS COPA TOTAL T16");
agregarResultado("Kevin Sivori", "4-6", "Nico Avalos", "FASE DE GRUPOS COPA TOTAL T16");
agregarResultado("Luciano Hufschmid", "1-3", "Lautaro Scocier", "FASE DE GRUPOS COPA TOTAL T16");
agregarResultado("Lautaro Scocier", "3-1", "Luciano Hufschmid", "FASE DE GRUPOS COPA TOTAL T16");
agregarResultado("Tomas Torcasio", "5-0", "Alexis Segovia", "FASE DE GRUPOS COPA TOTAL T16");
agregarResultado("Alexis Segovia", "0-5", "Tomas Torcasio", "FASE DE GRUPOS COPA TOTAL T16");
agregarResultado("Joaco Fernandez", "6-1", "Nico Luchetti (R)", "FASE DE GRUPOS COPA TOTAL T16");
agregarResultado("Nico Luchetti (R)", "1-6", "Joaco Fernandez", "FASE DE GRUPOS COPA TOTAL T16");
agregarResultado("Joel Marasco", "0-1", "Renzo Badano", "FASE DE GRUPOS COPA TOTAL T16");
agregarResultado("Renzo Badano", "1-0", "Joel Marasco", "FASE DE GRUPOS COPA TOTAL T16");
agregarResultado("Gabriel Talarico", "4-4", "Cami", "FASE DE GRUPOS COPA TOTAL T16");
agregarResultado("Cami", "4-4", "Gabriel Talarico", "FASE DE GRUPOS COPA TOTAL T16");
agregarResultado("Lucas Aguilera", "5-1", "Ramiro Ebel", "FASE DE GRUPOS COPA TOTAL T16");
agregarResultado("Ramiro Ebel", "1-5", "Lucas Aguilera", "FASE DE GRUPOS COPA TOTAL T16");
agregarResultado("Joel Alcalde", "1-4", "Anubis", "FASE DE GRUPOS COPA TOTAL T16");
agregarResultado("Anubis", "4-1", "Joel Alcalde", "FASE DE GRUPOS COPA TOTAL T16");
agregarResultado("Tomas Delgado", "1-1", "Matias Varela", "FASE DE GRUPOS COPA TOTAL T16");
agregarResultado("Matias Varela", "1-1", "Tomas Delgado", "FASE DE GRUPOS COPA TOTAL T16");
agregarResultado("Nacho Soto", "4-1", "Bautista Coria", "FASE DE GRUPOS COPA TOTAL T16");
agregarResultado("Bautista Coria", "1-4", "Nacho Soto", "FASE DE GRUPOS COPA TOTAL T16");
agregarResultado("Mario Talarico", "0-0", "Leandro Montes", "FASE DE GRUPOS COPA TOTAL T16");
agregarResultado("Leandro Montes", "0-0", "Mario Talarico", "FASE DE GRUPOS COPA TOTAL T16");
agregarResultado("Rodrigo Talarico", "4-1", "Azul Quispe", "FASE DE GRUPOS COPA TOTAL T16");
agregarResultado("Azul Quispe", "1-4", "Rodrigo Talarico", "FASE DE GRUPOS COPA TOTAL T16");
agregarResultado("Pancho Muzzio", "2-3", "Nico Luchetti (C)", "FASE DE GRUPOS COPA TOTAL T16");
agregarResultado("Nico Luchetti (C)", "3-2", "Pancho Muzzio", "FASE DE GRUPOS COPA TOTAL T16");
agregarResultado("Jhose", "2-0", "Kraiizer", "FASE DE GRUPOS COPA TOTAL T16");
agregarResultado("Kraiizer", "0-2", "Jhose", "FASE DE GRUPOS COPA TOTAL T16");
agregarResultado("Eze", "1-1", "Yago", "FASE DE GRUPOS COPA TOTAL T16");
agregarResultado("Yago", "1-1", "Eze", "FASE DE GRUPOS COPA TOTAL T16");
agregarResultado("Facundo Marchese", "4-2", "Dani Bazan", "FASE DE GRUPOS COPA TOTAL T16");
agregarResultado("Dani Bazan", "2-4", "Facundo Marchese", "FASE DE GRUPOS COPA TOTAL T16");
agregarResultado("Matheo Olivera", "4-1", "Santi", "FASE DE GRUPOS COPA TOTAL T16");
agregarResultado("Santi", "1-4", "Matheo Olivera", "FASE DE GRUPOS COPA TOTAL T16");
agregarResultado("Bruno Alonso", "3-1", "Joaquin Sampadaro", "FASE DE GRUPOS COPA TOTAL T16");
agregarResultado("Joaquin Sampadaro", "1-3", "Bruno Alonso", "FASE DE GRUPOS COPA TOTAL T16");
agregarResultado("Kevin Sivori", "1-0", "Federico Moreno", "FASE DE GRUPOS COPA TOTAL T16");
agregarResultado("Gonzalo Nuñez", "4-1", "Benja", "FASE DE GRUPOS COPA TOTAL T16");
agregarResultado("Benja", "1-4", "Gonzalo Nuñez", "FASE DE GRUPOS COPA TOTAL T16");
agregarResultado("Alexis Segovia", "5-0", "Lautaro Scocier", "FASE DE GRUPOS COPA TOTAL T16");
agregarResultado("Lautaro Scocier", "0-5", "Alexis Segovia", "FASE DE GRUPOS COPA TOTAL T16");
agregarResultado("Luciano Hufschmid", "1-9", "Pollo", "FASE DE GRUPOS COPA TOTAL T16");
agregarResultado("Pollo", "9-1", "Luciano Hufschmid", "FASE DE GRUPOS COPA TOTAL T16");
agregarResultado("Renzo Badano", "2-0", "Nico Luchetti (R)", "FASE DE GRUPOS COPA TOTAL T16");
agregarResultado("Nico Luchetti (R)", "0-2", "Renzo Badano", "FASE DE GRUPOS COPA TOTAL T16");
agregarResultado("Joaco Fernandez", "1-4", "Cami", "FASE DE GRUPOS COPA TOTAL T16");
agregarResultado("Cami", "4-1", "Joaco Fernandez", "FASE DE GRUPOS COPA TOTAL T16");
agregarResultado("Joel Marasco", "0-0", "Gabriel Talarico", "FASE DE GRUPOS COPA TOTAL T16");
agregarResultado("Gabriel Talarico", "0-0", "Joel Marasco", "FASE DE GRUPOS COPA TOTAL T16");
agregarResultado("Anubis", "2-1", "Ramiro Ebel", "FASE DE GRUPOS COPA TOTAL T16");
agregarResultado("Ramiro Ebel", "1-2", "Anubis", "FASE DE GRUPOS COPA TOTAL T16");
agregarResultado("Joel Alcalde", "3-2", "Ignacio Cejas", "FASE DE GRUPOS COPA TOTAL T16");
agregarResultado("Ignacio Cejas", "2-3", "Joel Alcalde", "FASE DE GRUPOS COPA TOTAL T16");
agregarResultado("Bautista Coria", "2-3", "Matias Varela", "FASE DE GRUPOS COPA TOTAL T16");
agregarResultado("Matias Varela", "3-2", "Bautista Coria", "FASE DE GRUPOS COPA TOTAL T16");
agregarResultado("Nacho Soto", "4-3", "Fabrizio Escolano", "FASE DE GRUPOS COPA TOTAL T16");
agregarResultado("Fabrizio Escolano", "3-4", "Nacho Soto", "FASE DE GRUPOS COPA TOTAL T16");
agregarResultado("Azul Quispe", "2-3", "Leandro Montes", "FASE DE GRUPOS COPA TOTAL T16");
agregarResultado("Leandro Montes", "3-2", "Azul Quispe", "FASE DE GRUPOS COPA TOTAL T16");
agregarResultado("Rodrigo Talarico", "1-3", "Rodrigo Soca", "FASE DE GRUPOS COPA TOTAL T16");
agregarResultado("Rodrigo Soca", "3-1", "Rodrigo Talarico", "FASE DE GRUPOS COPA TOTAL T16");
agregarResultado("Kraiizer", "0-2", "Nico Luchetti (C)", "FASE DE GRUPOS COPA TOTAL T16");
agregarResultado("Nico Luchetti (C)", "2-0", "Kraiizer", "FASE DE GRUPOS COPA TOTAL T16");
agregarResultado("Jhose", "5-5", "Moreno Perez", "FASE DE GRUPOS COPA TOTAL T16");
agregarResultado("Moreno Perez", "5-5", "Jhose", "FASE DE GRUPOS COPA TOTAL T16");
agregarResultado("Dani Bazan", "5-3", "Yago", "FASE DE GRUPOS COPA TOTAL T16");
agregarResultado("Yago", "3-5", "Dani Bazan", "FASE DE GRUPOS COPA TOTAL T16");
agregarResultado("Facundo Marchese", "2-4", "Ian Gangai", "FASE DE GRUPOS COPA TOTAL T16");
agregarResultado("Ian Gangai", "4-2", "Facundo Marchese", "FASE DE GRUPOS COPA TOTAL T16");
agregarResultado("Joaquin Sampadaro", "2-2", "Santi", "FASE DE GRUPOS COPA TOTAL T16");
agregarResultado("Santi", "2-2", "Joaquin Sampadaro", "FASE DE GRUPOS COPA TOTAL T16");
agregarResultado("Bruno Alonso", "3-5", "Lucas Insua", "FASE DE GRUPOS COPA TOTAL T16");
agregarResultado("Lucas Insua", "5-3", "Bruno Alonso", "FASE DE GRUPOS COPA TOTAL T16");
agregarResultado("Benja", "3-1", "Federico Moreno", "FASE DE GRUPOS COPA TOTAL T16");
agregarResultado("Gonzalo Nuñez", "2-3", "Nico Avalos", "FASE DE GRUPOS COPA TOTAL T16");
agregarResultado("Nico Avalos", "3-2", "Gonzalo Nuñez", "FASE DE GRUPOS COPA TOTAL T16");
agregarResultado("Pollo", "2-0", "Lautaro Scocier", "FASE DE GRUPOS COPA TOTAL T16");
agregarResultado("Lautaro Scocier", "0-2", "Pollo", "FASE DE GRUPOS COPA TOTAL T16");
agregarResultado("Luciano Hufschmid", "3-3", "Tomas Torcasio", "FASE DE GRUPOS COPA TOTAL T16");
agregarResultado("Tomas Torcasio", "3-3", "Luciano Hufschmid", "FASE DE GRUPOS COPA TOTAL T16");
agregarResultado("Cami", "6-3", "Nico Luchetti (R)", "FASE DE GRUPOS COPA TOTAL T16");
agregarResultado("Nico Luchetti (R)", "3-6", "Cami", "FASE DE GRUPOS COPA TOTAL T16");
agregarResultado("Renzo Badano", "3-2", "Gabriel Talarico", "FASE DE GRUPOS COPA TOTAL T16");
agregarResultado("Gabriel Talarico", "2-3", "Renzo Badano", "FASE DE GRUPOS COPA TOTAL T16");
agregarResultado("Joaco Fernandez", "3-3", "Joel Marasco", "FASE DE GRUPOS COPA TOTAL T16");
agregarResultado("Joel Marasco", "3-3", "Joaco Fernandez", "FASE DE GRUPOS COPA TOTAL T16");
agregarResultado("Bruno Alonso", "6-10", "Lucas Aguilera", "OCTAVOS DE FINAL COPA TOTAL T16");
agregarResultado("Lucas Aguilera", "10-6", "Bruno Alonso", "OCTAVOS DE FINAL COPA TOTAL T16");
agregarResultado("Renzo Badano", "4-6", "Mario Talarico", "OCTAVOS DE FINAL COPA TOTAL T16");
agregarResultado("Mario Talarico", "6-4", "Renzo Badano", "OCTAVOS DE FINAL COPA TOTAL T16");
agregarResultado("Moreno Perez", "10-3", "Benja", "OCTAVOS DE FINAL COPA TOTAL T16");
agregarResultado("Benja", "3-10", "Moreno Perez", "OCTAVOS DE FINAL COPA TOTAL T16");
agregarResultado("Rodrigo Talarico", "5-4", "Tomas Torcasio", "OCTAVOS DE FINAL COPA TOTAL T16");
agregarResultado("Tomas Torcasio", "4-5", "Rodrigo Talarico", "OCTAVOS DE FINAL COPA TOTAL T16");
agregarResultado("Pollo", "5-7", "Facundo Marchese", "OCTAVOS DE FINAL COPA TOTAL T16");
agregarResultado("Facundo Marchese", "7-5", "Pollo", "OCTAVOS DE FINAL COPA TOTAL T16");
agregarResultado("Tomas Delgado", "4-8", "Ian Gangai", "OCTAVOS DE FINAL COPA TOTAL T16");
agregarResultado("Ian Gangai", "8-4", "Tomas Delgado", "OCTAVOS DE FINAL COPA TOTAL T16");
agregarResultado("Matias Varela", "2-7", "Cami", "OCTAVOS DE FINAL COPA TOTAL T16");
agregarResultado("Cami", "7-2", "Matias Varela", "OCTAVOS DE FINAL COPA TOTAL T16");
agregarResultado("Anubis", "7-4", "Nico Luchetti (C)", "OCTAVOS DE FINAL COPA TOTAL T16");
agregarResultado("Nico Luchetti (C)", "4-7", "Anubis", "OCTAVOS DE FINAL COPA TOTAL T16");
agregarResultado("Lucas Aguilera", "5-6", "Cami", "CUARTOS DE FINAL COPA TOTAL T16");
agregarResultado("Cami", "6-5", "Lucas Aguilera", "CUARTOS DE FINAL COPA TOTAL T16");
agregarResultado("Anubis", "4-4", "Mario Talarico", "CUARTOS DE FINAL COPA TOTAL T16");
agregarResultado("Mario Talarico", "4-4", "Anubis", "CUARTOS DE FINAL COPA TOTAL T16");
agregarResultado("Moreno Perez", "5-9", "Rodrigo Talarico", "CUARTOS DE FINAL COPA TOTAL T16");
agregarResultado("Rodrigo Talarico", "9-5", "Moreno Perez", "CUARTOS DE FINAL COPA TOTAL T16");
agregarResultado("Facundo Marchese", "5-6", "Ian Gangai", "CUARTOS DE FINAL COPA TOTAL T16");
agregarResultado("Ian Gangai", "6-5", "Facundo Marchese", "CUARTOS DE FINAL COPA TOTAL T16");
agregarResultado("Anubis", "5-3", "Mario Talarico", "DESEMPATE CUARTOS DE FINAL COPA TOTAL T16");
agregarResultado("Mario Talarico", "3-5", "Anubis", "DESEMPATE CUARTOS DE FINAL COPA TOTAL T16");
agregarResultado("Rodrigo Talarico", "7-3", "Cami", "SEMIFINAL COPA TOTAL T16");
agregarResultado("Cami", "3-7", "Rodrigo Talarico", "SEMIFINAL COPA TOTAL T16");
agregarResultado("Anubis", "1-5", "Ian Gangai", "SEMIFINAL COPA TOTAL T16");
agregarResultado("Ian Gangai", "5-1", "Anubis", "SEMIFINAL COPA TOTAL T16");
agregarResultado("Rodrigo Talarico", "6-6", "Ian Gangai", "FINAL COPA TOTAL T16");
agregarResultado("Ian Gangai", "6-6", "Rodrigo Talarico", "FINAL COPA TOTAL T16");
agregarResultado("Rodrigo Talarico", "4-2", "Ian Gangai", "DESEMPATE COPA TOTAL T16");
agregarResultado("Ian Gangai", "2-4", "Rodrigo Talarico", "DESEMPATE COPA TOTAL T16");
agregarResultado("Anubis", "11-3", "Yago", "64AVOS DE FINAL COPA CAMPEONES T16");
agregarResultado("Yago", "3-11", "Anubis", "64AVOS DE FINAL COPA CAMPEONES T16");
agregarResultado("Anubis", "7-11", "Ian Gangai", "32AVOS DE FINAL COPA CAMPEONES T16");
agregarResultado("Ian Gangai", "11-7", "Anubis", "32AVOS DE FINAL COPA CAMPEONES T16");
agregarResultado("Lucas Insua", "5-10", "Jhose", "32AVOS DE FINAL COPA CAMPEONES T16");
agregarResultado("Jhose", "10-5", "Lucas Insua", "32AVOS DE FINAL COPA CAMPEONES T16");
agregarResultado("Lucas Aguilera", "9-9", "Nico Avalos", "32AVOS DE FINAL COPA CAMPEONES T16");
agregarResultado("Nico Avalos", "9-9", "Lucas Aguilera", "32AVOS DE FINAL COPA CAMPEONES T16");
agregarResultado("Lucas Aguilera", "4-1", "Nico Avalos", "DESEMPATE 32AVOS DE FINAL COPA CAMPEONES T16");
agregarResultado("Nico Avalos", "1-4", "Lucas Aguilera", "DESEMPATE 32AVOS DE FINAL COPA CAMPEONES T16");
agregarResultado("Ian Gangai", "8-6", "Bruno Alonso", "16AVOS DE FINAL COPA CAMPEONES T16");
agregarResultado("Bruno Alonso", "6-8", "Ian Gangai", "16AVOS DE FINAL COPA CAMPEONES T16");
agregarResultado("Jhose", "4-10", "Lucas Aguilera", "16AVOS DE FINAL COPA CAMPEONES T16");
agregarResultado("Lucas Aguilera", "10-4", "Jhose", "16AVOS DE FINAL COPA CAMPEONES T16");
agregarResultado("Ian Gangai", "6-9", "Rodrigo Talarico", "OCTAVOS DE FINAL COPA CAMPEONES T16");
agregarResultado("Rodrigo Talarico", "9-6", "Ian Gangai", "OCTAVOS DE FINAL COPA CAMPEONES T16");
agregarResultado("Lucas Aguilera", "5-8", "Kevin Sivori", "OCTAVOS DE FINAL COPA CAMPEONES T16");
agregarResultado("Kevin Sivori", "8-5", "Lucas Aguilera", "OCTAVOS DE FINAL COPA CAMPEONES T16");
agregarResultado("Tomas Delgado", "4-5", "Moreno Perez", "OCTAVOS DE FINAL COPA CAMPEONES T16");
agregarResultado("Moreno Perez", "5-4", "Tomas Delgado", "OCTAVOS DE FINAL COPA CAMPEONES T16");
agregarResultado("Rodrigo Talarico", "7-2", "Tomas Torcasio", "CUARTOS DE FINAL COPA CAMPEONES T16");
agregarResultado("Tomas Torcasio", "2-7", "Rodrigo Talarico", "CUARTOS DE FINAL COPA CAMPEONES T16");
agregarResultado("Kevin Sivori", "5-6", "Moreno Perez", "CUARTOS DE FINAL COPA CAMPEONES T16");
agregarResultado("Moreno Perez", "6-5", "Kevin Sivori", "CUARTOS DE FINAL COPA CAMPEONES T16");
agregarResultado("Rodrigo Talarico", "6-3", "Ignacio Cejas", "SEMIFINAL COPA CAMPEONES T16");
agregarResultado("Ignacio Cejas", "3-6", "Rodrigo Talarico", "SEMIFINAL COPA CAMPEONES T16");
agregarResultado("Moreno Perez", "2-6", "Rodrigo Soca", "SEMIFINAL COPA CAMPEONES T16");
agregarResultado("Rodrigo Soca", "6-2", "Moreno Perez", "SEMIFINAL COPA CAMPEONES T16");
agregarResultado("Rodrigo Talarico", "7-9", "Rodrigo Soca", "FINAL COPA CAMPEONES T16");
agregarResultado("Rodrigo Soca", "9-7", "Rodrigo Talarico", "FINAL COPA CAMPEONES T16");
agregarResultado("Fabrizio Escolano", "13-8", "Nico Avalos", "FINAL COPA DUOS T16");
agregarResultado("Nico Avalos", "8-13", "Fabrizio Escolano", "FINAL COPA DUOS T16");
agregarResultado("Bruno Alonso", "13-8", "Lucas Aguilera", "FINAL COPA DUOS T16");
agregarResultado("Lucas Aguilera", "8-13", "Bruno Alonso", "FINAL COPA DUOS T16");
agregarResultado("Fabrizio Escolano", "13-8", "Lucas Aguilera", "FINAL COPA DUOS T16");
agregarResultado("Lucas Aguilera", "8-13", "Fabrizio Escolano", "FINAL COPA DUOS T16");
agregarResultado("Bruno Alonso", "13-8", "Nico Avalos", "FINAL COPA DUOS T16");
agregarResultado("Nico Avalos", "8-13", "Bruno Alonso", "FINAL COPA DUOS T16");
agregarResultado("Facundo Marchese", "7-6", "Kevin Sivori", "DESEMPATE PRIMERA DIVISION T16");
agregarResultado("Kevin Sivori", "6-7", "Facundo Marchese", "DESEMPATE PRIMERA DIVISION T16");
agregarResultado("Anubis", "6-5", "Matias Varela", "DESEMPATE SEGUNDA DIVISION T16");
agregarResultado("Matias Varela", "5-6", "Anubis", "DESEMPATE SEGUNDA DIVISION T16");
agregarResultado("Kevin Sivori", "2-4", "Benja", "PROMOCION PRIMERA DIVISION T16");
agregarResultado("Benja", "4-2", "Kevin Sivori", "PROMOCION PRIMERA DIVISION T16");
agregarResultado("Nico Avalos", "4-0", "Joel Alcalde", "PROMOCION PRIMERA DIVISION T16");
agregarResultado("Joel Alcalde", "0-4", "Nico Avalos", "PROMOCION PRIMERA DIVISION T16");
agregarResultado("Matias Varela", "0-5", "Nico Luchetti (R)", "PROMOCION SEGUNDA DIVISION T16");
agregarResultado("Nico Luchetti (R)", "5-0", "Matias Varela", "PROMOCION SEGUNDA DIVISION T16");
agregarResultado("Alexis Segovia", "1-0", "Ramiro Ebel", "PROMOCION SEGUNDA DIVISION T16");
agregarResultado("Ramiro Ebel", "0-1", "Alexis Segovia", "PROMOCION SEGUNDA DIVISION T16");
agregarResultado("Joaquin Sampadaro", "10-5", "Dani Bazan", "SEMIFINAL COPA C T17");
agregarResultado("Dani Bazan", "5-10", "Joaquin Sampadaro", "SEMIFINAL COPA C T17");
agregarResultado("Azul Quispe", "9-3", "Ramiro Ebel", "SEMIFINAL COPA C T17");
agregarResultado("Ramiro Ebel", "3-9", "Azul Quispe", "SEMIFINAL COPA C T17");
agregarResultado("Joaquin Sampadaro", "8-5", "Azul Quispe", "FINAL COPA C T17");
agregarResultado("Azul Quispe", "5-8", "Joaquin Sampadaro", "FINAL COPA C T17");
agregarResultado("Kevin Sivori", "1-5", "Rodrigo Talarico", "CUARTOS DE FINAL COPA B T17");
agregarResultado("Rodrigo Talarico", "5-1", "Kevin Sivori", "CUARTOS DE FINAL COPA B T17");
agregarResultado("Nacho Soto", "0-4", "Ignacio Cejas", "CUARTOS DE FINAL COPA B T17");
agregarResultado("Ignacio Cejas", "4-0", "Nacho Soto", "CUARTOS DE FINAL COPA B T17");
agregarResultado("Jhose", "3-3", "Anubis", "CUARTOS DE FINAL COPA B T17");
agregarResultado("Anubis", "3-3", "Jhose", "CUARTOS DE FINAL COPA B T17");
agregarResultado("Joel Alcalde", "7-5", "Cami", "CUARTOS DE FINAL COPA B T17");
agregarResultado("Cami", "5-7", "Joel Alcalde", "CUARTOS DE FINAL COPA B T17");
agregarResultado("Jhose", "2-3", "Anubis", "DESEMPATE CUARTOS DE FINAL COPA B T17");
agregarResultado("Anubis", "3-2", "Jhose", "DESEMPATE CUARTOS DE FINAL COPA B T17");
agregarResultado("Anubis", "5-8", "Ignacio Cejas", "SEMIFINAL COPA B T17");
agregarResultado("Ignacio Cejas", "8-5", "Anubis", "SEMIFINAL COPA B T17");
agregarResultado("Rodrigo Talarico", "8-12", "Joel Alcalde", "SEMIFINAL COPA B T17");
agregarResultado("Joel Alcalde", "12-8", "Rodrigo Talarico", "SEMIFINAL COPA B T17");
agregarResultado("Ignacio Cejas", "8-10", "Joel Alcalde", "FINAL COPA B T17");
agregarResultado("Joel Alcalde", "10-8", "Ignacio Cejas", "FINAL COPA B T17");
agregarResultado("Mario Talarico", "12-12", "Bruno Alonso", "OCTAVOS DE FINAL COPA A T17");
agregarResultado("Bruno Alonso", "12-12", "Mario Talarico", "OCTAVOS DE FINAL COPA A T17");
agregarResultado("Joaco Fernandez", "4-11", "Nico Avalos", "OCTAVOS DE FINAL COPA A T17");
agregarResultado("Nico Avalos", "11-4", "Joaco Fernandez", "OCTAVOS DE FINAL COPA A T17");
agregarResultado("Benja", "3-6", "Ian Gangai", "OCTAVOS DE FINAL COPA A T17");
agregarResultado("Ian Gangai", "6-3", "Benja", "OCTAVOS DE FINAL COPA A T17");
agregarResultado("Pollo", "8-8", "Renzo Badano", "OCTAVOS DE FINAL COPA A T17");
agregarResultado("Renzo Badano", "8-8", "Pollo", "OCTAVOS DE FINAL COPA A T17");
agregarResultado("Mario Talarico", "3-1", "Bruno Alonso", "DESEMPATE OCTAVOS DE FINAL COPA A T17");
agregarResultado("Bruno Alonso", "1-3", "Mario Talarico", "DESEMPATE OCTAVOS DE FINAL COPA A T17");
agregarResultado("Pollo", "1-0", "Renzo Badano", "DESEMPATE OCTAVOS DE FINAL COPA A T17");
agregarResultado("Renzo Badano", "0-1", "Pollo", "DESEMPATE OCTAVOS DE FINAL COPA A T17");
agregarResultado("Luciano Hufschmid", "3-8", "Pollo", "CUARTOS DE FINAL COPA A T17");
agregarResultado("Pollo", "8-3", "Luciano Hufschmid", "CUARTOS DE FINAL COPA A T17");
agregarResultado("Pancho Muzzio", "6-5", "Ian Gangai", "CUARTOS DE FINAL COPA A T17");
agregarResultado("Ian Gangai", "5-6", "Pancho Muzzio", "CUARTOS DE FINAL COPA A T17");
agregarResultado("Lucas Aguilera", "8-11", "Mario Talarico", "CUARTOS DE FINAL COPA A T17");
agregarResultado("Mario Talarico", "11-8", "Lucas Aguilera", "CUARTOS DE FINAL COPA A T17");
agregarResultado("Facundo Marchese", "4-4", "Nico Avalos", "CUARTOS DE FINAL COPA A T17");
agregarResultado("Nico Avalos", "4-4", "Facundo Marchese", "CUARTOS DE FINAL COPA A T17");
agregarResultado("Facundo Marchese", "0-1", "Nico Avalos", "DESEMPATE CUARTOS DE FINAL COPA A T17");
agregarResultado("Nico Avalos", "1-0", "Facundo Marchese", "DESEMPATE CUARTOS DE FINAL COPA A T17");
agregarResultado("Pollo", "6-8", "Pancho Muzzio", "SEMIFINAL COPA A T17");
agregarResultado("Pancho Muzzio", "8-6", "Pollo", "SEMIFINAL COPA A T17");
agregarResultado("Mario Talarico", "5-7", "Nico Avalos", "SEMIFINAL COPA A T17");
agregarResultado("Nico Avalos", "7-5", "Mario Talarico", "SEMIFINAL COPA A T17");
agregarResultado("Pancho Muzzio", "6-10", "Nico Avalos", "FINAL COPA A T17");
agregarResultado("Nico Avalos", "10-6", "Pancho Muzzio", "FINAL COPA A T17");
agregarResultado("Bautista Coria", "2-0", "Nico Luchetti (R)", "FASE DE GRUPOS COPA TOTAL T17");
agregarResultado("Nico Luchetti (R)", "0-2", "Bautista Coria", "FASE DE GRUPOS COPA TOTAL T17");
agregarResultado("Matheo Olivera", "0-5", "Rodrigo Talarico", "FASE DE GRUPOS COPA TOTAL T17");
agregarResultado("Rodrigo Talarico", "5-0", "Matheo Olivera", "FASE DE GRUPOS COPA TOTAL T17");
agregarResultado("Rodrigo Talarico", "0-0", "Nico Luchetti (R)", "FASE DE GRUPOS COPA TOTAL T17");
agregarResultado("Nico Luchetti (R)", "0-0", "Rodrigo Talarico", "FASE DE GRUPOS COPA TOTAL T17");
agregarResultado("Bautista Coria", "2-0", "Matheo Olivera", "FASE DE GRUPOS COPA TOTAL T17");
agregarResultado("Matheo Olivera", "0-2", "Bautista Coria", "FASE DE GRUPOS COPA TOTAL T17");
agregarResultado("Joaquin Sampadaro", "0-2", "Bruno Alonso", "FASE DE GRUPOS COPA TOTAL T17");
agregarResultado("Bruno Alonso", "2-0", "Joaquin Sampadaro", "FASE DE GRUPOS COPA TOTAL T17");
agregarResultado("Jhose", "4-6", "Rodrigo Soca", "FASE DE GRUPOS COPA TOTAL T17");
agregarResultado("Rodrigo Soca", "6-4", "Jhose", "FASE DE GRUPOS COPA TOTAL T17");
agregarResultado("Rodrigo Soca", "0-2", "Bruno Alonso", "FASE DE GRUPOS COPA TOTAL T17");
agregarResultado("Bruno Alonso", "2-0", "Rodrigo Soca", "FASE DE GRUPOS COPA TOTAL T17");
agregarResultado("Joaquin Sampadaro", "1-5", "Jhose", "FASE DE GRUPOS COPA TOTAL T17");
agregarResultado("Jhose", "5-1", "Joaquin Sampadaro", "FASE DE GRUPOS COPA TOTAL T17");
agregarResultado("Federico Moreno", "1-6", "Ignacio Cejas", "FASE DE GRUPOS COPA TOTAL T17");
agregarResultado("Ignacio Cejas", "6-1", "Federico Moreno", "FASE DE GRUPOS COPA TOTAL T17");
agregarResultado("Luciano Hufschmid", "6-4", "Lucas Insua", "FASE DE GRUPOS COPA TOTAL T17");
agregarResultado("Lucas Insua", "4-6", "Luciano Hufschmid", "FASE DE GRUPOS COPA TOTAL T17");
agregarResultado("Lucas Insua", "1-0", "Ignacio Cejas", "FASE DE GRUPOS COPA TOTAL T17");
agregarResultado("Ignacio Cejas", "0-1", "Lucas Insua", "FASE DE GRUPOS COPA TOTAL T17");
agregarResultado("Federico Moreno", "1-1", "Luciano Hufschmid", "FASE DE GRUPOS COPA TOTAL T17");
agregarResultado("Luciano Hufschmid", "1-1", "Federico Moreno", "FASE DE GRUPOS COPA TOTAL T17");
agregarResultado("Santi", "0-0", "Gonzalo Nuñez", "FASE DE GRUPOS COPA TOTAL T17");
agregarResultado("Gonzalo Nuñez", "0-0", "Santi", "FASE DE GRUPOS COPA TOTAL T17");
agregarResultado("Lucas Aguilera", "4-3", "Nico Avalos", "FASE DE GRUPOS COPA TOTAL T17");
agregarResultado("Nico Avalos", "3-4", "Lucas Aguilera", "FASE DE GRUPOS COPA TOTAL T17");
agregarResultado("Nico Avalos", "1-0", "Gonzalo Nuñez", "FASE DE GRUPOS COPA TOTAL T17");
agregarResultado("Gonzalo Nuñez", "0-1", "Nico Avalos", "FASE DE GRUPOS COPA TOTAL T17");
agregarResultado("Santi", "0-1", "Lucas Aguilera", "FASE DE GRUPOS COPA TOTAL T17");
agregarResultado("Lucas Aguilera", "1-0", "Santi", "FASE DE GRUPOS COPA TOTAL T17");
agregarResultado("Yago", "4-7", "Anubis", "FASE DE GRUPOS COPA TOTAL T17");
agregarResultado("Anubis", "7-4", "Yago", "FASE DE GRUPOS COPA TOTAL T17");
agregarResultado("Nacho Soto", "2-3", "Mario Talarico", "FASE DE GRUPOS COPA TOTAL T17");
agregarResultado("Mario Talarico", "3-2", "Nacho Soto", "FASE DE GRUPOS COPA TOTAL T17");
agregarResultado("Mario Talarico", "1-2", "Anubis", "FASE DE GRUPOS COPA TOTAL T17");
agregarResultado("Anubis", "2-1", "Mario Talarico", "FASE DE GRUPOS COPA TOTAL T17");
agregarResultado("Yago", "0-3", "Nacho Soto", "FASE DE GRUPOS COPA TOTAL T17");
agregarResultado("Nacho Soto", "3-0", "Yago", "FASE DE GRUPOS COPA TOTAL T17");
agregarResultado("Ramiro Ebel", "0-1", "Renzo Badano", "FASE DE GRUPOS COPA TOTAL T17");
agregarResultado("Renzo Badano", "1-0", "Ramiro Ebel", "FASE DE GRUPOS COPA TOTAL T17");
agregarResultado("Tomas Delgado", "1-1", "Ian Gangai", "FASE DE GRUPOS COPA TOTAL T17");
agregarResultado("Ian Gangai", "1-1", "Tomas Delgado", "FASE DE GRUPOS COPA TOTAL T17");
agregarResultado("Ian Gangai", "1-0", "Renzo Badano", "FASE DE GRUPOS COPA TOTAL T17");
agregarResultado("Renzo Badano", "0-1", "Ian Gangai", "FASE DE GRUPOS COPA TOTAL T17");
agregarResultado("Ramiro Ebel", "0-0", "Tomas Delgado", "FASE DE GRUPOS COPA TOTAL T17");
agregarResultado("Tomas Delgado", "0-0", "Ramiro Ebel", "FASE DE GRUPOS COPA TOTAL T17");
agregarResultado("Nico Luchetti (C)", "0-0", "Joel Alcalde", "FASE DE GRUPOS COPA TOTAL T17");
agregarResultado("Joel Alcalde", "0-0", "Nico Luchetti (C)", "FASE DE GRUPOS COPA TOTAL T17");
agregarResultado("Alexis Segovia", "0-0", "Joel Marasco", "FASE DE GRUPOS COPA TOTAL T17");
agregarResultado("Joel Marasco", "0-0", "Alexis Segovia", "FASE DE GRUPOS COPA TOTAL T17");
agregarResultado("Joel Marasco", "1-4", "Joel Alcalde", "FASE DE GRUPOS COPA TOTAL T17");
agregarResultado("Joel Alcalde", "4-1", "Joel Marasco", "FASE DE GRUPOS COPA TOTAL T17");
agregarResultado("Nico Luchetti (C)", "0-0", "Alexis Segovia", "FASE DE GRUPOS COPA TOTAL T17");
agregarResultado("Alexis Segovia", "0-0", "Nico Luchetti (C)", "FASE DE GRUPOS COPA TOTAL T17");
agregarResultado("Leandro Montes", "0-4", "Azul Quispe", "FASE DE GRUPOS COPA TOTAL T17");
agregarResultado("Azul Quispe", "4-0", "Leandro Montes", "FASE DE GRUPOS COPA TOTAL T17");
agregarResultado("Kevin Sivori", "5-2", "Tomas Torcasio", "FASE DE GRUPOS COPA TOTAL T17");
agregarResultado("Tomas Torcasio", "2-5", "Kevin Sivori", "FASE DE GRUPOS COPA TOTAL T17");
agregarResultado("Tomas Torcasio", "1-1", "Azul Quispe", "FASE DE GRUPOS COPA TOTAL T17");
agregarResultado("Azul Quispe", "1-1", "Tomas Torcasio", "FASE DE GRUPOS COPA TOTAL T17");
agregarResultado("Leandro Montes", "0-3", "Kevin Sivori", "FASE DE GRUPOS COPA TOTAL T17");
agregarResultado("Kevin Sivori", "3-0", "Leandro Montes", "FASE DE GRUPOS COPA TOTAL T17");
agregarResultado("Joaco Fernandez", "6-6", "Benja", "FASE DE GRUPOS COPA TOTAL T17");
agregarResultado("Benja", "6-6", "Joaco Fernandez", "FASE DE GRUPOS COPA TOTAL T17");
agregarResultado("Facundo Marchese", "5-4", "Moreno Perez", "FASE DE GRUPOS COPA TOTAL T17");
agregarResultado("Moreno Perez", "4-5", "Facundo Marchese", "FASE DE GRUPOS COPA TOTAL T17");
agregarResultado("Moreno Perez", "0-1", "Benja", "FASE DE GRUPOS COPA TOTAL T17");
agregarResultado("Benja", "1-0", "Moreno Perez", "FASE DE GRUPOS COPA TOTAL T17");
agregarResultado("Joaco Fernandez", "1-2", "Facundo Marchese", "FASE DE GRUPOS COPA TOTAL T17");
agregarResultado("Facundo Marchese", "2-1", "Joaco Fernandez", "FASE DE GRUPOS COPA TOTAL T17");
agregarResultado("Dani Bazan", "1-1", "Cami", "FASE DE GRUPOS COPA TOTAL T17");
agregarResultado("Cami", "1-1", "Dani Bazan", "FASE DE GRUPOS COPA TOTAL T17");
agregarResultado("Eze", "2-4", "Pancho Muzzio", "FASE DE GRUPOS COPA TOTAL T17");
agregarResultado("Pancho Muzzio", "4-2", "Eze", "FASE DE GRUPOS COPA TOTAL T17");
agregarResultado("Pancho Muzzio", "3-0", "Cami", "FASE DE GRUPOS COPA TOTAL T17");
agregarResultado("Cami", "0-3", "Pancho Muzzio", "FASE DE GRUPOS COPA TOTAL T17");
agregarResultado("Dani Bazan", "2-0", "Eze", "FASE DE GRUPOS COPA TOTAL T17");
agregarResultado("Eze", "0-2", "Dani Bazan", "FASE DE GRUPOS COPA TOTAL T17");
agregarResultado("Matias Varela", "0-2", "Pollo", "FASE DE GRUPOS COPA TOTAL T17");
agregarResultado("Pollo", "2-0", "Matias Varela", "FASE DE GRUPOS COPA TOTAL T17");
agregarResultado("Gabriel Talarico", "1-2", "Fabrizio Escolano", "FASE DE GRUPOS COPA TOTAL T17");
agregarResultado("Fabrizio Escolano", "2-1", "Gabriel Talarico", "FASE DE GRUPOS COPA TOTAL T17");
agregarResultado("Fabrizio Escolano", "0-0", "Pollo", "FASE DE GRUPOS COPA TOTAL T17");
agregarResultado("Pollo", "0-0", "Fabrizio Escolano", "FASE DE GRUPOS COPA TOTAL T17");
agregarResultado("Matias Varela", "0-1", "Gabriel Talarico", "FASE DE GRUPOS COPA TOTAL T17");
agregarResultado("Gabriel Talarico", "1-0", "Matias Varela", "FASE DE GRUPOS COPA TOTAL T17");
agregarResultado("Matheo Olivera", "5-1", "Nico Luchetti (R)", "FASE DE GRUPOS COPA TOTAL T17");
agregarResultado("Nico Luchetti (R)", "1-5", "Matheo Olivera", "FASE DE GRUPOS COPA TOTAL T17");
agregarResultado("Rodrigo Talarico", "2-2", "Bautista Coria", "FASE DE GRUPOS COPA TOTAL T17");
agregarResultado("Bautista Coria", "2-2", "Rodrigo Talarico", "FASE DE GRUPOS COPA TOTAL T17");
agregarResultado("Nico Luchetti (R)", "1-0", "Bautista Coria", "FASE DE GRUPOS COPA TOTAL T17");
agregarResultado("Bautista Coria", "0-1", "Nico Luchetti (R)", "FASE DE GRUPOS COPA TOTAL T17");
agregarResultado("Rodrigo Talarico", "6-1", "Matheo Olivera", "FASE DE GRUPOS COPA TOTAL T17");
agregarResultado("Matheo Olivera", "1-6", "Rodrigo Talarico", "FASE DE GRUPOS COPA TOTAL T17");
agregarResultado("Jhose", "4-2", "Bruno Alonso", "FASE DE GRUPOS COPA TOTAL T17");
agregarResultado("Bruno Alonso", "2-4", "Jhose", "FASE DE GRUPOS COPA TOTAL T17");
agregarResultado("Rodrigo Soca", "3-4", "Joaquin Sampadaro", "FASE DE GRUPOS COPA TOTAL T17");
agregarResultado("Joaquin Sampadaro", "4-3", "Rodrigo Soca", "FASE DE GRUPOS COPA TOTAL T17");
agregarResultado("Bruno Alonso", "1-1", "Joaquin Sampadaro", "FASE DE GRUPOS COPA TOTAL T17");
agregarResultado("Joaquin Sampadaro", "1-1", "Bruno Alonso", "FASE DE GRUPOS COPA TOTAL T17");
agregarResultado("Rodrigo Soca", "0-8", "Jhose", "FASE DE GRUPOS COPA TOTAL T17");
agregarResultado("Jhose", "8-0", "Rodrigo Soca", "FASE DE GRUPOS COPA TOTAL T17");
agregarResultado("Luciano Hufschmid", "4-1", "Ignacio Cejas", "FASE DE GRUPOS COPA TOTAL T17");
agregarResultado("Ignacio Cejas", "1-4", "Luciano Hufschmid", "FASE DE GRUPOS COPA TOTAL T17");
agregarResultado("Lucas Insua", "4-2", "Federico Moreno", "FASE DE GRUPOS COPA TOTAL T17");
agregarResultado("Federico Moreno", "2-4", "Lucas Insua", "FASE DE GRUPOS COPA TOTAL T17");
agregarResultado("Ignacio Cejas", "2-0", "Federico Moreno", "FASE DE GRUPOS COPA TOTAL T17");
agregarResultado("Federico Moreno", "0-2", "Ignacio Cejas", "FASE DE GRUPOS COPA TOTAL T17");
agregarResultado("Lucas Insua", "0-1", "Luciano Hufschmid", "FASE DE GRUPOS COPA TOTAL T17");
agregarResultado("Luciano Hufschmid", "1-0", "Lucas Insua", "FASE DE GRUPOS COPA TOTAL T17");
agregarResultado("Lucas Aguilera", "5-4", "Gonzalo Nuñez", "FASE DE GRUPOS COPA TOTAL T17");
agregarResultado("Gonzalo Nuñez", "4-5", "Lucas Aguilera", "FASE DE GRUPOS COPA TOTAL T17");
agregarResultado("Nico Avalos", "3-0", "Santi", "FASE DE GRUPOS COPA TOTAL T17");
agregarResultado("Santi", "0-3", "Nico Avalos", "FASE DE GRUPOS COPA TOTAL T17");
agregarResultado("Gonzalo Nuñez", "0-0", "Santi", "FASE DE GRUPOS COPA TOTAL T17");
agregarResultado("Santi", "0-0", "Gonzalo Nuñez", "FASE DE GRUPOS COPA TOTAL T17");
agregarResultado("Nico Avalos", "4-0", "Lucas Aguilera", "FASE DE GRUPOS COPA TOTAL T17");
agregarResultado("Lucas Aguilera", "0-4", "Nico Avalos", "FASE DE GRUPOS COPA TOTAL T17");
agregarResultado("Nacho Soto", "2-1", "Anubis", "FASE DE GRUPOS COPA TOTAL T17");
agregarResultado("Anubis", "1-2", "Nacho Soto", "FASE DE GRUPOS COPA TOTAL T17");
agregarResultado("Mario Talarico", "2-3", "Yago", "FASE DE GRUPOS COPA TOTAL T17");
agregarResultado("Yago", "3-2", "Mario Talarico", "FASE DE GRUPOS COPA TOTAL T17");
agregarResultado("Anubis", "2-2", "Yago", "FASE DE GRUPOS COPA TOTAL T17");
agregarResultado("Yago", "2-2", "Anubis", "FASE DE GRUPOS COPA TOTAL T17");
agregarResultado("Mario Talarico", "5-3", "Nacho Soto", "FASE DE GRUPOS COPA TOTAL T17");
agregarResultado("Nacho Soto", "3-5", "Mario Talarico", "FASE DE GRUPOS COPA TOTAL T17");
agregarResultado("Tomas Delgado", "4-2", "Renzo Badano", "FASE DE GRUPOS COPA TOTAL T17");
agregarResultado("Renzo Badano", "2-4", "Tomas Delgado", "FASE DE GRUPOS COPA TOTAL T17");
agregarResultado("Ian Gangai", "1-0", "Ramiro Ebel", "FASE DE GRUPOS COPA TOTAL T17");
agregarResultado("Ramiro Ebel", "0-1", "Ian Gangai", "FASE DE GRUPOS COPA TOTAL T17");
agregarResultado("Renzo Badano", "1-3", "Ramiro Ebel", "FASE DE GRUPOS COPA TOTAL T17");
agregarResultado("Ramiro Ebel", "3-1", "Renzo Badano", "FASE DE GRUPOS COPA TOTAL T17");
agregarResultado("Ian Gangai", "3-0", "Tomas Delgado", "FASE DE GRUPOS COPA TOTAL T17");
agregarResultado("Tomas Delgado", "0-3", "Ian Gangai", "FASE DE GRUPOS COPA TOTAL T17");
agregarResultado("Alexis Segovia", "0-3", "Joel Alcalde", "FASE DE GRUPOS COPA TOTAL T17");
agregarResultado("Joel Alcalde", "3-0", "Alexis Segovia", "FASE DE GRUPOS COPA TOTAL T17");
agregarResultado("Joel Marasco", "5-1", "Nico Luchetti (C)", "FASE DE GRUPOS COPA TOTAL T17");
agregarResultado("Nico Luchetti (C)", "1-5", "Joel Marasco", "FASE DE GRUPOS COPA TOTAL T17");
agregarResultado("Joel Alcalde", "3-2", "Nico Luchetti (C)", "FASE DE GRUPOS COPA TOTAL T17");
agregarResultado("Nico Luchetti (C)", "2-3", "Joel Alcalde", "FASE DE GRUPOS COPA TOTAL T17");
agregarResultado("Joel Marasco", "1-0", "Alexis Segovia", "FASE DE GRUPOS COPA TOTAL T17");
agregarResultado("Alexis Segovia", "0-1", "Joel Marasco", "FASE DE GRUPOS COPA TOTAL T17");
agregarResultado("Kevin Sivori", "2-2", "Azul Quispe", "FASE DE GRUPOS COPA TOTAL T17");
agregarResultado("Azul Quispe", "2-2", "Kevin Sivori", "FASE DE GRUPOS COPA TOTAL T17");
agregarResultado("Tomas Torcasio", "4-0", "Leandro Montes", "FASE DE GRUPOS COPA TOTAL T17");
agregarResultado("Leandro Montes", "0-4", "Tomas Torcasio", "FASE DE GRUPOS COPA TOTAL T17");
agregarResultado("Azul Quispe", "1-3", "Leandro Montes", "FASE DE GRUPOS COPA TOTAL T17");
agregarResultado("Leandro Montes", "3-1", "Azul Quispe", "FASE DE GRUPOS COPA TOTAL T17");
agregarResultado("Tomas Torcasio", "1-3", "Kevin Sivori", "FASE DE GRUPOS COPA TOTAL T17");
agregarResultado("Kevin Sivori", "3-1", "Tomas Torcasio", "FASE DE GRUPOS COPA TOTAL T17");
agregarResultado("Facundo Marchese", "3-3", "Benja", "FASE DE GRUPOS COPA TOTAL T17");
agregarResultado("Benja", "3-3", "Facundo Marchese", "FASE DE GRUPOS COPA TOTAL T17");
agregarResultado("Moreno Perez", "3-2", "Joaco Fernandez", "FASE DE GRUPOS COPA TOTAL T17");
agregarResultado("Joaco Fernandez", "2-3", "Moreno Perez", "FASE DE GRUPOS COPA TOTAL T17");
agregarResultado("Benja", "2-4", "Joaco Fernandez", "FASE DE GRUPOS COPA TOTAL T17");
agregarResultado("Joaco Fernandez", "4-2", "Benja", "FASE DE GRUPOS COPA TOTAL T17");
agregarResultado("Moreno Perez", "0-4", "Facundo Marchese", "FASE DE GRUPOS COPA TOTAL T17");
agregarResultado("Facundo Marchese", "4-0", "Moreno Perez", "FASE DE GRUPOS COPA TOTAL T17");
agregarResultado("Eze", "3-3", "Cami", "FASE DE GRUPOS COPA TOTAL T17");
agregarResultado("Cami", "3-3", "Eze", "FASE DE GRUPOS COPA TOTAL T17");
agregarResultado("Pancho Muzzio", "2-0", "Dani Bazan", "FASE DE GRUPOS COPA TOTAL T17");
agregarResultado("Dani Bazan", "0-2", "Pancho Muzzio", "FASE DE GRUPOS COPA TOTAL T17");
agregarResultado("Cami", "3-3", "Dani Bazan", "FASE DE GRUPOS COPA TOTAL T17");
agregarResultado("Dani Bazan", "3-3", "Cami", "FASE DE GRUPOS COPA TOTAL T17");
agregarResultado("Pancho Muzzio", "2-0", "Eze", "FASE DE GRUPOS COPA TOTAL T17");
agregarResultado("Eze", "0-2", "Pancho Muzzio", "FASE DE GRUPOS COPA TOTAL T17");
agregarResultado("Gabriel Talarico", "1-6", "Pollo", "FASE DE GRUPOS COPA TOTAL T17");
agregarResultado("Pollo", "6-1", "Gabriel Talarico", "FASE DE GRUPOS COPA TOTAL T17");
agregarResultado("Fabrizio Escolano", "3-0", "Matias Varela", "FASE DE GRUPOS COPA TOTAL T17");
agregarResultado("Matias Varela", "0-3", "Fabrizio Escolano", "FASE DE GRUPOS COPA TOTAL T17");
agregarResultado("Pollo", "1-0", "Matias Varela", "FASE DE GRUPOS COPA TOTAL T17");
agregarResultado("Matias Varela", "0-1", "Pollo", "FASE DE GRUPOS COPA TOTAL T17");
agregarResultado("Fabrizio Escolano", "5-1", "Gabriel Talarico", "FASE DE GRUPOS COPA TOTAL T17");
agregarResultado("Gabriel Talarico", "1-5", "Fabrizio Escolano", "FASE DE GRUPOS COPA TOTAL T17");
agregarResultado("Nico Luchetti (R)", "1-4", "Rodrigo Talarico", "FASE DE GRUPOS COPA TOTAL T17");
agregarResultado("Rodrigo Talarico", "4-1", "Nico Luchetti (R)", "FASE DE GRUPOS COPA TOTAL T17");
agregarResultado("Matheo Olivera", "0-1", "Bautista Coria", "FASE DE GRUPOS COPA TOTAL T17");
agregarResultado("Bautista Coria", "1-0", "Matheo Olivera", "FASE DE GRUPOS COPA TOTAL T17");
agregarResultado("Nico Luchetti (R)", "1-3", "Matheo Olivera", "FASE DE GRUPOS COPA TOTAL T17");
agregarResultado("Matheo Olivera", "3-1", "Nico Luchetti (R)", "FASE DE GRUPOS COPA TOTAL T17");
agregarResultado("Bautista Coria", "5-1", "Rodrigo Talarico", "FASE DE GRUPOS COPA TOTAL T17");
agregarResultado("Rodrigo Talarico", "1-5", "Bautista Coria", "FASE DE GRUPOS COPA TOTAL T17");
agregarResultado("Bruno Alonso", "4-1", "Rodrigo Soca", "FASE DE GRUPOS COPA TOTAL T17");
agregarResultado("Rodrigo Soca", "1-4", "Bruno Alonso", "FASE DE GRUPOS COPA TOTAL T17");
agregarResultado("Jhose", "1-5", "Joaquin Sampadaro", "FASE DE GRUPOS COPA TOTAL T17");
agregarResultado("Joaquin Sampadaro", "5-1", "Jhose", "FASE DE GRUPOS COPA TOTAL T17");
agregarResultado("Bruno Alonso", "4-5", "Jhose", "FASE DE GRUPOS COPA TOTAL T17");
agregarResultado("Jhose", "5-4", "Bruno Alonso", "FASE DE GRUPOS COPA TOTAL T17");
agregarResultado("Joaquin Sampadaro", "3-2", "Rodrigo Soca", "FASE DE GRUPOS COPA TOTAL T17");
agregarResultado("Rodrigo Soca", "2-3", "Joaquin Sampadaro", "FASE DE GRUPOS COPA TOTAL T17");
agregarResultado("Ignacio Cejas", "0-0", "Lucas Insua", "FASE DE GRUPOS COPA TOTAL T17");
agregarResultado("Lucas Insua", "0-0", "Ignacio Cejas", "FASE DE GRUPOS COPA TOTAL T17");
agregarResultado("Luciano Hufschmid", "2-0", "Federico Moreno", "FASE DE GRUPOS COPA TOTAL T17");
agregarResultado("Federico Moreno", "0-2", "Luciano Hufschmid", "FASE DE GRUPOS COPA TOTAL T17");
agregarResultado("Ignacio Cejas", "4-3", "Luciano Hufschmid", "FASE DE GRUPOS COPA TOTAL T17");
agregarResultado("Luciano Hufschmid", "3-4", "Ignacio Cejas", "FASE DE GRUPOS COPA TOTAL T17");
agregarResultado("Federico Moreno", "0-3", "Lucas Insua", "FASE DE GRUPOS COPA TOTAL T17");
agregarResultado("Lucas Insua", "3-0", "Federico Moreno", "FASE DE GRUPOS COPA TOTAL T17");
agregarResultado("Gonzalo Nuñez", "0-1", "Nico Avalos", "FASE DE GRUPOS COPA TOTAL T17");
agregarResultado("Nico Avalos", "1-0", "Gonzalo Nuñez", "FASE DE GRUPOS COPA TOTAL T17");
agregarResultado("Lucas Aguilera", "4-0", "Santi", "FASE DE GRUPOS COPA TOTAL T17");
agregarResultado("Santi", "0-4", "Lucas Aguilera", "FASE DE GRUPOS COPA TOTAL T17");
agregarResultado("Gonzalo Nuñez", "0-4", "Lucas Aguilera", "FASE DE GRUPOS COPA TOTAL T17");
agregarResultado("Lucas Aguilera", "4-0", "Gonzalo Nuñez", "FASE DE GRUPOS COPA TOTAL T17");
agregarResultado("Santi", "0-3", "Nico Avalos", "FASE DE GRUPOS COPA TOTAL T17");
agregarResultado("Nico Avalos", "3-0", "Santi", "FASE DE GRUPOS COPA TOTAL T17");
agregarResultado("Anubis", "2-0", "Mario Talarico", "FASE DE GRUPOS COPA TOTAL T17");
agregarResultado("Mario Talarico", "0-2", "Anubis", "FASE DE GRUPOS COPA TOTAL T17");
agregarResultado("Nacho Soto", "2-3", "Yago", "FASE DE GRUPOS COPA TOTAL T17");
agregarResultado("Yago", "3-2", "Nacho Soto", "FASE DE GRUPOS COPA TOTAL T17");
agregarResultado("Anubis", "6-4", "Nacho Soto", "FASE DE GRUPOS COPA TOTAL T17");
agregarResultado("Nacho Soto", "4-6", "Anubis", "FASE DE GRUPOS COPA TOTAL T17");
agregarResultado("Yago", "3-4", "Mario Talarico", "FASE DE GRUPOS COPA TOTAL T17");
agregarResultado("Mario Talarico", "4-3", "Yago", "FASE DE GRUPOS COPA TOTAL T17");
agregarResultado("Renzo Badano", "3-3", "Ian Gangai", "FASE DE GRUPOS COPA TOTAL T17");
agregarResultado("Ian Gangai", "3-3", "Renzo Badano", "FASE DE GRUPOS COPA TOTAL T17");
agregarResultado("Tomas Delgado", "0-1", "Ramiro Ebel", "FASE DE GRUPOS COPA TOTAL T17");
agregarResultado("Ramiro Ebel", "1-0", "Tomas Delgado", "FASE DE GRUPOS COPA TOTAL T17");
agregarResultado("Renzo Badano", "6-4", "Tomas Delgado", "FASE DE GRUPOS COPA TOTAL T17");
agregarResultado("Tomas Delgado", "4-6", "Renzo Badano", "FASE DE GRUPOS COPA TOTAL T17");
agregarResultado("Ramiro Ebel", "4-3", "Ian Gangai", "FASE DE GRUPOS COPA TOTAL T17");
agregarResultado("Ian Gangai", "3-4", "Ramiro Ebel", "FASE DE GRUPOS COPA TOTAL T17");
agregarResultado("Joel Alcalde", "2-1", "Joel Marasco", "FASE DE GRUPOS COPA TOTAL T17");
agregarResultado("Joel Marasco", "1-2", "Joel Alcalde", "FASE DE GRUPOS COPA TOTAL T17");
agregarResultado("Alexis Segovia", "0-4", "Nico Luchetti (C)", "FASE DE GRUPOS COPA TOTAL T17");
agregarResultado("Nico Luchetti (C)", "4-0", "Alexis Segovia", "FASE DE GRUPOS COPA TOTAL T17");
agregarResultado("Joel Alcalde", "6-0", "Alexis Segovia", "FASE DE GRUPOS COPA TOTAL T17");
agregarResultado("Alexis Segovia", "0-6", "Joel Alcalde", "FASE DE GRUPOS COPA TOTAL T17");
agregarResultado("Nico Luchetti (C)", "2-2", "Joel Marasco", "FASE DE GRUPOS COPA TOTAL T17");
agregarResultado("Joel Marasco", "2-2", "Nico Luchetti (C)", "FASE DE GRUPOS COPA TOTAL T17");
agregarResultado("Azul Quispe", "1-0", "Tomas Torcasio", "FASE DE GRUPOS COPA TOTAL T17");
agregarResultado("Tomas Torcasio", "0-1", "Azul Quispe", "FASE DE GRUPOS COPA TOTAL T17");
agregarResultado("Kevin Sivori", "0-1", "Leandro Montes", "FASE DE GRUPOS COPA TOTAL T17");
agregarResultado("Leandro Montes", "1-0", "Kevin Sivori", "FASE DE GRUPOS COPA TOTAL T17");
agregarResultado("Azul Quispe", "3-4", "Kevin Sivori", "FASE DE GRUPOS COPA TOTAL T17");
agregarResultado("Kevin Sivori", "4-3", "Azul Quispe", "FASE DE GRUPOS COPA TOTAL T17");
agregarResultado("Leandro Montes", "2-4", "Tomas Torcasio", "FASE DE GRUPOS COPA TOTAL T17");
agregarResultado("Tomas Torcasio", "4-2", "Leandro Montes", "FASE DE GRUPOS COPA TOTAL T17");
agregarResultado("Benja", "0-1", "Moreno Perez", "FASE DE GRUPOS COPA TOTAL T17");
agregarResultado("Moreno Perez", "1-0", "Benja", "FASE DE GRUPOS COPA TOTAL T17");
agregarResultado("Facundo Marchese", "4-0", "Joaco Fernandez", "FASE DE GRUPOS COPA TOTAL T17");
agregarResultado("Joaco Fernandez", "0-4", "Facundo Marchese", "FASE DE GRUPOS COPA TOTAL T17");
agregarResultado("Benja", "4-3", "Facundo Marchese", "FASE DE GRUPOS COPA TOTAL T17");
agregarResultado("Facundo Marchese", "3-4", "Benja", "FASE DE GRUPOS COPA TOTAL T17");
agregarResultado("Joaco Fernandez", "2-4", "Moreno Perez", "FASE DE GRUPOS COPA TOTAL T17");
agregarResultado("Moreno Perez", "4-2", "Joaco Fernandez", "FASE DE GRUPOS COPA TOTAL T17");
agregarResultado("Cami", "0-4", "Pancho Muzzio", "FASE DE GRUPOS COPA TOTAL T17");
agregarResultado("Pancho Muzzio", "4-0", "Cami", "FASE DE GRUPOS COPA TOTAL T17");
agregarResultado("Eze", "0-0", "Dani Bazan", "FASE DE GRUPOS COPA TOTAL T17");
agregarResultado("Dani Bazan", "0-0", "Eze", "FASE DE GRUPOS COPA TOTAL T17");
agregarResultado("Cami", "5-4", "Eze", "FASE DE GRUPOS COPA TOTAL T17");
agregarResultado("Eze", "4-5", "Cami", "FASE DE GRUPOS COPA TOTAL T17");
agregarResultado("Dani Bazan", "1-4", "Pancho Muzzio", "FASE DE GRUPOS COPA TOTAL T17");
agregarResultado("Pancho Muzzio", "4-1", "Dani Bazan", "FASE DE GRUPOS COPA TOTAL T17");
agregarResultado("Pollo", "1-0", "Fabrizio Escolano", "FASE DE GRUPOS COPA TOTAL T17");
agregarResultado("Fabrizio Escolano", "0-1", "Pollo", "FASE DE GRUPOS COPA TOTAL T17");
agregarResultado("Gabriel Talarico", "1-0", "Matias Varela", "FASE DE GRUPOS COPA TOTAL T17");
agregarResultado("Matias Varela", "0-1", "Gabriel Talarico", "FASE DE GRUPOS COPA TOTAL T17");
agregarResultado("Pollo", "6-4", "Gabriel Talarico", "FASE DE GRUPOS COPA TOTAL T17");
agregarResultado("Gabriel Talarico", "4-6", "Pollo", "FASE DE GRUPOS COPA TOTAL T17");
agregarResultado("Matias Varela", "0-3", "Fabrizio Escolano", "FASE DE GRUPOS COPA TOTAL T17");
agregarResultado("Fabrizio Escolano", "3-0", "Matias Varela", "FASE DE GRUPOS COPA TOTAL T17");
agregarResultado("Nico Avalos", "11-12", "Bruno Alonso", "OCTAVOS DE FINAL COPA TOTAL T17");
agregarResultado("Bruno Alonso", "12-11", "Nico Avalos", "OCTAVOS DE FINAL COPA TOTAL T17");
agregarResultado("Ian Gangai", "6-7", "Kevin Sivori", "OCTAVOS DE FINAL COPA TOTAL T17");
agregarResultado("Kevin Sivori", "7-6", "Ian Gangai", "OCTAVOS DE FINAL COPA TOTAL T17");
agregarResultado("Facundo Marchese", "8-11", "Ignacio Cejas", "OCTAVOS DE FINAL COPA TOTAL T17");
agregarResultado("Ignacio Cejas", "11-8", "Facundo Marchese", "OCTAVOS DE FINAL COPA TOTAL T17");
agregarResultado("Bautista Coria", "8-8", "Pollo", "OCTAVOS DE FINAL COPA TOTAL T17");
agregarResultado("Pollo", "8-8", "Bautista Coria", "OCTAVOS DE FINAL COPA TOTAL T17");
agregarResultado("Joel Alcalde", "5-11", "Luciano Hufschmid", "OCTAVOS DE FINAL COPA TOTAL T17");
agregarResultado("Luciano Hufschmid", "11-5", "Joel Alcalde", "OCTAVOS DE FINAL COPA TOTAL T17");
agregarResultado("Rodrigo Talarico", "10-6", "Lucas Aguilera", "OCTAVOS DE FINAL COPA TOTAL T17");
agregarResultado("Lucas Aguilera", "6-10", "Rodrigo Talarico", "OCTAVOS DE FINAL COPA TOTAL T17");
agregarResultado("Anubis", "2-11", "Pancho Muzzio", "OCTAVOS DE FINAL COPA TOTAL T17");
agregarResultado("Pancho Muzzio", "11-2", "Anubis", "OCTAVOS DE FINAL COPA TOTAL T17");
agregarResultado("Jhose", "11-10", "Fabrizio Escolano", "OCTAVOS DE FINAL COPA TOTAL T17");
agregarResultado("Fabrizio Escolano", "10-11", "Jhose", "OCTAVOS DE FINAL COPA TOTAL T17");
agregarResultado("Bautista Coria", "0-1", "Pollo", "DESEMPATE OCTAVOS DE FINAL COPA TOTAL T17");
agregarResultado("Pollo", "1-0", "Bautista Coria", "DESEMPATE OCTAVOS DE FINAL COPA TOTAL T17");
agregarResultado("Ignacio Cejas", "4-7", "Bruno Alonso", "CUARTOS DE FINAL COPA TOTAL T17");
agregarResultado("Bruno Alonso", "7-4", "Ignacio Cejas", "CUARTOS DE FINAL COPA TOTAL T17");
agregarResultado("Pollo", "8-1", "Kevin Sivori", "CUARTOS DE FINAL COPA TOTAL T17");
agregarResultado("Kevin Sivori", "1-8", "Pollo", "CUARTOS DE FINAL COPA TOTAL T17");
agregarResultado("Luciano Hufschmid", "3-5", "Rodrigo Talarico", "CUARTOS DE FINAL COPA TOTAL T17");
agregarResultado("Rodrigo Talarico", "5-3", "Luciano Hufschmid", "CUARTOS DE FINAL COPA TOTAL T17");
agregarResultado("Pancho Muzzio", "6-3", "Jhose", "CUARTOS DE FINAL COPA TOTAL T17");
agregarResultado("Jhose", "3-6", "Pancho Muzzio", "CUARTOS DE FINAL COPA TOTAL T17");
agregarResultado("Pancho Muzzio", "8-6", "Pollo", "SEMIFINAL COPA TOTAL T17");
agregarResultado("Pollo", "6-8", "Pancho Muzzio", "SEMIFINAL COPA TOTAL T17");
agregarResultado("Rodrigo Talarico", "8-7", "Bruno Alonso", "SEMIFINAL COPA TOTAL T17");
agregarResultado("Bruno Alonso", "7-8", "Rodrigo Talarico", "SEMIFINAL COPA TOTAL T17");
agregarResultado("Pancho Muzzio", "6-4", "Rodrigo Talarico", "FINAL COPA TOTAL T17");
agregarResultado("Rodrigo Talarico", "4-6", "Pancho Muzzio", "FINAL COPA TOTAL T17");
agregarResultado("Tomas Torcasio", "21-11", "Rodrigo Talarico", "FINAL COPA DUOS T17");
agregarResultado("Rodrigo Talarico", "11-21", "Tomas Torcasio", "FINAL COPA DUOS T17");
agregarResultado("Ian Gangai", "21-11", "Joel Alcalde", "FINAL COPA DUOS T17");
agregarResultado("Joel Alcalde", "11-21", "Ian Gangai", "FINAL COPA DUOS T17");
agregarResultado("Tomas Torcasio", "21-11", "Joel Alcalde", "FINAL COPA DUOS T17");
agregarResultado("Joel Alcalde", "11-21", "Tomas Torcasio", "FINAL COPA DUOS T17");
agregarResultado("Ian Gangai", "21-11", "Rodrigo Talarico", "FINAL COPA DUOS T17");
agregarResultado("Rodrigo Talarico", "11-21", "Ian Gangai", "FINAL COPA DUOS T17");
agregarResultado("Bautista Coria", "6-1", "Nico Luchetti (C)", "64AVOS DE FINAL COPA CAMPEONES T17");
agregarResultado("Nico Luchetti (C)", "1-6", "Bautista Coria", "64AVOS DE FINAL COPA CAMPEONES T17");
agregarResultado("Bautista Coria", "6-9", "Ian Gangai", "32AVOS DE FINAL COPA CAMPEONES T17");
agregarResultado("Ian Gangai", "9-6", "Bautista Coria", "32AVOS DE FINAL COPA CAMPEONES T17");
agregarResultado("Tomas Torcasio", "5-6", "Luciano Hufschmid", "32AVOS DE FINAL COPA CAMPEONES T17");
agregarResultado("Luciano Hufschmid", "6-5", "Tomas Torcasio", "32AVOS DE FINAL COPA CAMPEONES T17");
agregarResultado("Joaco Fernandez", "6-5", "Moreno Perez", "32AVOS DE FINAL COPA CAMPEONES T17");
agregarResultado("Moreno Perez", "5-6", "Joaco Fernandez", "32AVOS DE FINAL COPA CAMPEONES T17");
agregarResultado("Ian Gangai", "6-8", "Renzo Badano", "16AVOS DE FINAL COPA CAMPEONES T17");
agregarResultado("Renzo Badano", "8-6", "Ian Gangai", "16AVOS DE FINAL COPA CAMPEONES T17");
agregarResultado("Luciano Hufschmid", "11-4", "Joaco Fernandez", "16AVOS DE FINAL COPA CAMPEONES T17");
agregarResultado("Joaco Fernandez", "4-11", "Luciano Hufschmid", "16AVOS DE FINAL COPA CAMPEONES T17");
agregarResultado("Renzo Badano", "1-4", "Fabrizio Escolano", "OCTAVOS DE FINAL COPA CAMPEONES T17");
agregarResultado("Fabrizio Escolano", "4-1", "Renzo Badano", "OCTAVOS DE FINAL COPA CAMPEONES T17");
agregarResultado("Luciano Hufschmid", "3-7", "Bruno Alonso", "OCTAVOS DE FINAL COPA CAMPEONES T17");
agregarResultado("Bruno Alonso", "7-3", "Luciano Hufschmid", "OCTAVOS DE FINAL COPA CAMPEONES T17");
agregarResultado("Pancho Muzzio", "6-1", "Eze", "OCTAVOS DE FINAL COPA CAMPEONES T17");
agregarResultado("Eze", "1-6", "Pancho Muzzio", "OCTAVOS DE FINAL COPA CAMPEONES T17");
agregarResultado("Fabrizio Escolano", "8-5", "Rodrigo Soca", "CUARTOS DE FINAL COPA CAMPEONES T17");
agregarResultado("Rodrigo Soca", "5-8", "Fabrizio Escolano", "CUARTOS DE FINAL COPA CAMPEONES T17");
agregarResultado("Bruno Alonso", "7-8", "Pancho Muzzio", "CUARTOS DE FINAL COPA CAMPEONES T17");
agregarResultado("Pancho Muzzio", "8-7", "Bruno Alonso", "CUARTOS DE FINAL COPA CAMPEONES T17");
agregarResultado("Fabrizio Escolano", "6-4", "Rodrigo Talarico", "SEMIFINAL COPA CAMPEONES T17");
agregarResultado("Rodrigo Talarico", "4-6", "Fabrizio Escolano", "SEMIFINAL COPA CAMPEONES T17");
agregarResultado("Pancho Muzzio", "6-4", "Pollo", "SEMIFINAL COPA CAMPEONES T17");
agregarResultado("Pollo", "4-6", "Pancho Muzzio", "SEMIFINAL COPA CAMPEONES T17");
agregarResultado("Fabrizio Escolano", "8-7", "Pancho Muzzio", "FINAL COPA CAMPEONES T17");
agregarResultado("Pancho Muzzio", "7-8", "Fabrizio Escolano", "FINAL COPA CAMPEONES T17");
agregarResultado("Bruno Alonso", "14-9", "Matheo Olivera", "PROMOCIONES T17");
agregarResultado("Matheo Olivera", "9-14", "Bruno Alonso", "PROMOCIONES T17");
agregarResultado("Gabriel Talarico", "9-11", "Cami", "PROMOCIONES T17");
agregarResultado("Cami", "11-9", "Gabriel Talarico", "PROMOCIONES T17");
agregarResultado("Tomas Delgado", "8-15", "Nico Avalos", "OCTAVOS DE FINAL COPA A T18");
agregarResultado("Nico Avalos", "15-8", "Tomas Delgado", "OCTAVOS DE FINAL COPA A T18");
agregarResultado("Eze", "5-12", "Mario Talarico", "OCTAVOS DE FINAL COPA A T18");
agregarResultado("Mario Talarico", "12-5", "Eze", "OCTAVOS DE FINAL COPA A T18");
agregarResultado("Bruno Alonso", "11-6", "Lucas Insua", "OCTAVOS DE FINAL COPA A T18");
agregarResultado("Lucas Insua", "6-11", "Bruno Alonso", "OCTAVOS DE FINAL COPA A T18");
agregarResultado("Ian Gangai", "8-11", "Luciano Hufschmid", "OCTAVOS DE FINAL COPA A T18");
agregarResultado("Luciano Hufschmid", "11-8", "Ian Gangai", "OCTAVOS DE FINAL COPA A T18");
agregarResultado("Moreno Perez", "10-9", "Mario Talarico", "CUARTOS DE FINAL COPA A T18");
agregarResultado("Mario Talarico", "9-10", "Moreno Perez", "CUARTOS DE FINAL COPA A T18");
agregarResultado("Pollo", "16-14", "Luciano Hufschmid", "CUARTOS DE FINAL COPA A T18");
agregarResultado("Luciano Hufschmid", "14-16", "Pollo", "CUARTOS DE FINAL COPA A T18");
agregarResultado("Lucas Aguilera", "14-18", "Nico Avalos", "CUARTOS DE FINAL COPA A T18");
agregarResultado("Nico Avalos", "18-14", "Lucas Aguilera", "CUARTOS DE FINAL COPA A T18");
agregarResultado("Cami", "11-9", "Bruno Alonso", "CUARTOS DE FINAL COPA A T18");
agregarResultado("Bruno Alonso", "9-11", "Cami", "CUARTOS DE FINAL COPA A T18");
agregarResultado("Moreno Perez", "2-7", "Nico Avalos", "SEMIFINAL COPA A T18");
agregarResultado("Nico Avalos", "7-2", "Moreno Perez", "SEMIFINAL COPA A T18");
agregarResultado("Pollo", "5-6", "Cami", "SEMIFINAL COPA A T18");
agregarResultado("Cami", "6-5", "Pollo", "SEMIFINAL COPA A T18");
agregarResultado("Nico Avalos", "16-13", "Cami", "FINAL COPA A T18");
agregarResultado("Cami", "13-16", "Nico Avalos", "FINAL COPA A T18");
agregarResultado("Kevin Sivori", "9-6", "Jhose", "OCTAVOS DE FINAL COPA B T18");
agregarResultado("Jhose", "6-9", "Kevin Sivori", "OCTAVOS DE FINAL COPA B T18");
agregarResultado("Facundo Marchese", "8-1", "Nico Luchetti (C)", "OCTAVOS DE FINAL COPA B T18");
agregarResultado("Nico Luchetti (C)", "1-8", "Facundo Marchese", "OCTAVOS DE FINAL COPA B T18");
agregarResultado("Azul Quispe", "5-3", "Joaquin Sampadaro", "OCTAVOS DE FINAL COPA B T18");
agregarResultado("Joaquin Sampadaro", "3-5", "Azul Quispe", "OCTAVOS DE FINAL COPA B T18");
agregarResultado("Santi", "6-5", "Ignacio Cejas", "OCTAVOS DE FINAL COPA B T18");
agregarResultado("Ignacio Cejas", "5-6", "Santi", "OCTAVOS DE FINAL COPA B T18");
agregarResultado("Bautista Coria", "10-6", "Facundo Marchese", "CUARTOS DE FINAL COPA B T18");
agregarResultado("Facundo Marchese", "6-10", "Bautista Coria", "CUARTOS DE FINAL COPA B T18");
agregarResultado("Matheo Olivera", "0-9", "Kevin Sivori", "CUARTOS DE FINAL COPA B T18");
agregarResultado("Kevin Sivori", "9-0", "Matheo Olivera", "CUARTOS DE FINAL COPA B T18");
agregarResultado("Gabriel Talarico", "9-5", "Santi", "CUARTOS DE FINAL COPA B T18");
agregarResultado("Santi", "5-9", "Gabriel Talarico", "CUARTOS DE FINAL COPA B T18");
agregarResultado("Nacho Soto", "0-0", "Azul Quispe", "CUARTOS DE FINAL COPA B T18");
agregarResultado("Azul Quispe", "0-0", "Nacho Soto", "CUARTOS DE FINAL COPA B T18");
agregarResultado("Nacho Soto", "0-2", "Azul Quispe", "DESEMPATE CUARTOS DE FINAL COPA B T18");
agregarResultado("Azul Quispe", "2-0", "Nacho Soto", "DESEMPATE CUARTOS DE FINAL COPA B T18");
agregarResultado("Bautista Coria", "3-2", "Gabriel Talarico", "SEMIFINAL COPA B T18");
agregarResultado("Gabriel Talarico", "2-3", "Bautista Coria", "SEMIFINAL COPA B T18");
agregarResultado("Kevin Sivori", "10-14", "Azul Quispe", "SEMIFINAL COPA B T18");
agregarResultado("Azul Quispe", "14-10", "Kevin Sivori", "SEMIFINAL COPA B T18");
agregarResultado("Bautista Coria", "7-4", "Azul Quispe", "FINAL COPA B T18");
agregarResultado("Azul Quispe", "4-7", "Bautista Coria", "FINAL COPA B T18");
agregarResultado("Cami", "4-1", "Joaco Fernandez", "FASE DE GRUPOS COPA TOTAL T18");
agregarResultado("Joaco Fernandez", "1-4", "Cami", "FASE DE GRUPOS COPA TOTAL T18");
agregarResultado("Pancho Muzzio", "2-5", "Eze", "FASE DE GRUPOS COPA TOTAL T18");
agregarResultado("Eze", "5-2", "Pancho Muzzio", "FASE DE GRUPOS COPA TOTAL T18");
agregarResultado("Eze", "1-1", "Joaco Fernandez", "FASE DE GRUPOS COPA TOTAL T18");
agregarResultado("Joaco Fernandez", "1-1", "Eze", "FASE DE GRUPOS COPA TOTAL T18");
agregarResultado("Cami", "2-1", "Pancho Muzzio", "FASE DE GRUPOS COPA TOTAL T18");
agregarResultado("Pancho Muzzio", "1-2", "Cami", "FASE DE GRUPOS COPA TOTAL T18");
agregarResultado("Matheo Olivera", "1-0", "Felipe Galante", "FASE DE GRUPOS COPA TOTAL T18");
agregarResultado("Felipe Galante", "0-1", "Matheo Olivera", "FASE DE GRUPOS COPA TOTAL T18");
agregarResultado("Rodrigo Soca", "2-1", "Lucas Aguilera", "FASE DE GRUPOS COPA TOTAL T18");
agregarResultado("Lucas Aguilera", "1-2", "Rodrigo Soca", "FASE DE GRUPOS COPA TOTAL T18");
agregarResultado("Lucas Aguilera", "5-0", "Felipe Galante", "FASE DE GRUPOS COPA TOTAL T18");
agregarResultado("Felipe Galante", "0-5", "Lucas Aguilera", "FASE DE GRUPOS COPA TOTAL T18");
agregarResultado("Matheo Olivera", "2-5", "Rodrigo Soca", "FASE DE GRUPOS COPA TOTAL T18");
agregarResultado("Rodrigo Soca", "5-2", "Matheo Olivera", "FASE DE GRUPOS COPA TOTAL T18");
agregarResultado("Anubis", "2-5", "Azul Quispe", "FASE DE GRUPOS COPA TOTAL T18");
agregarResultado("Azul Quispe", "5-2", "Anubis", "FASE DE GRUPOS COPA TOTAL T18");
agregarResultado("Mario Talarico", "2-1", "Kevin Sivori", "FASE DE GRUPOS COPA TOTAL T18");
agregarResultado("Kevin Sivori", "1-2", "Mario Talarico", "FASE DE GRUPOS COPA TOTAL T18");
agregarResultado("Kevin Sivori", "1-6", "Azul Quispe", "FASE DE GRUPOS COPA TOTAL T18");
agregarResultado("Azul Quispe", "6-1", "Kevin Sivori", "FASE DE GRUPOS COPA TOTAL T18");
agregarResultado("Anubis", "2-2", "Mario Talarico", "FASE DE GRUPOS COPA TOTAL T18");
agregarResultado("Mario Talarico", "2-2", "Anubis", "FASE DE GRUPOS COPA TOTAL T18");
agregarResultado("Joel Alcalde", "1-1", "Joaquin Sampadaro", "FASE DE GRUPOS COPA TOTAL T18");
agregarResultado("Joaquin Sampadaro", "1-1", "Joel Alcalde", "FASE DE GRUPOS COPA TOTAL T18");
agregarResultado("Tomas Torcasio", "2-4", "Facundo Marchese", "FASE DE GRUPOS COPA TOTAL T18");
agregarResultado("Facundo Marchese", "4-2", "Tomas Torcasio", "FASE DE GRUPOS COPA TOTAL T18");
agregarResultado("Facundo Marchese", "1-2", "Joaquin Sampadaro", "FASE DE GRUPOS COPA TOTAL T18");
agregarResultado("Joaquin Sampadaro", "2-1", "Facundo Marchese", "FASE DE GRUPOS COPA TOTAL T18");
agregarResultado("Joel Alcalde", "3-7", "Tomas Torcasio", "FASE DE GRUPOS COPA TOTAL T18");
agregarResultado("Tomas Torcasio", "7-3", "Joel Alcalde", "FASE DE GRUPOS COPA TOTAL T18");
agregarResultado("Joel Marasco", "0-2", "Nico Luchetti (C)", "FASE DE GRUPOS COPA TOTAL T18");
agregarResultado("Nico Luchetti (C)", "2-0", "Joel Marasco", "FASE DE GRUPOS COPA TOTAL T18");
agregarResultado("Fabrizio Escolano", "3-2", "Ignacio Cejas", "FASE DE GRUPOS COPA TOTAL T18");
agregarResultado("Ignacio Cejas", "2-3", "Fabrizio Escolano", "FASE DE GRUPOS COPA TOTAL T18");
agregarResultado("Ignacio Cejas", "4-3", "Nico Luchetti (C)", "FASE DE GRUPOS COPA TOTAL T18");
agregarResultado("Nico Luchetti (C)", "3-4", "Ignacio Cejas", "FASE DE GRUPOS COPA TOTAL T18");
agregarResultado("Joel Marasco", "0-6", "Fabrizio Escolano", "FASE DE GRUPOS COPA TOTAL T18");
agregarResultado("Fabrizio Escolano", "6-0", "Joel Marasco", "FASE DE GRUPOS COPA TOTAL T18");
agregarResultado("Benja", "5-2", "Ramiro Ebel", "FASE DE GRUPOS COPA TOTAL T18");
agregarResultado("Ramiro Ebel", "2-5", "Benja", "FASE DE GRUPOS COPA TOTAL T18");
agregarResultado("Ian Gangai", "3-2", "Bruno Alonso", "FASE DE GRUPOS COPA TOTAL T18");
agregarResultado("Bruno Alonso", "2-3", "Ian Gangai", "FASE DE GRUPOS COPA TOTAL T18");
agregarResultado("Bruno Alonso", "4-5", "Ramiro Ebel", "FASE DE GRUPOS COPA TOTAL T18");
agregarResultado("Ramiro Ebel", "5-4", "Bruno Alonso", "FASE DE GRUPOS COPA TOTAL T18");
agregarResultado("Benja", "2-1", "Ian Gangai", "FASE DE GRUPOS COPA TOTAL T18");
agregarResultado("Ian Gangai", "1-2", "Benja", "FASE DE GRUPOS COPA TOTAL T18");
agregarResultado("Tomas Delgado", "3-2", "Dani Bazan", "FASE DE GRUPOS COPA TOTAL T18");
agregarResultado("Dani Bazan", "2-3", "Tomas Delgado", "FASE DE GRUPOS COPA TOTAL T18");
agregarResultado("Pollo", "5-1", "Jhose", "FASE DE GRUPOS COPA TOTAL T18");
agregarResultado("Jhose", "1-5", "Pollo", "FASE DE GRUPOS COPA TOTAL T18");
agregarResultado("Jhose", "6-5", "Dani Bazan", "FASE DE GRUPOS COPA TOTAL T18");
agregarResultado("Dani Bazan", "5-6", "Jhose", "FASE DE GRUPOS COPA TOTAL T18");
agregarResultado("Tomas Delgado", "3-3", "Pollo", "FASE DE GRUPOS COPA TOTAL T18");
agregarResultado("Pollo", "3-3", "Tomas Delgado", "FASE DE GRUPOS COPA TOTAL T18");
agregarResultado("Yago", "4-1", "Bautista Coria", "FASE DE GRUPOS COPA TOTAL T18");
agregarResultado("Bautista Coria", "1-4", "Yago", "FASE DE GRUPOS COPA TOTAL T18");
agregarResultado("Nico Avalos", "1-1", "Gabriel Talarico", "FASE DE GRUPOS COPA TOTAL T18");
agregarResultado("Gabriel Talarico", "1-1", "Nico Avalos", "FASE DE GRUPOS COPA TOTAL T18");
agregarResultado("Gabriel Talarico", "4-1", "Bautista Coria", "FASE DE GRUPOS COPA TOTAL T18");
agregarResultado("Bautista Coria", "1-4", "Gabriel Talarico", "FASE DE GRUPOS COPA TOTAL T18");
agregarResultado("Yago", "2-3", "Nico Avalos", "FASE DE GRUPOS COPA TOTAL T18");
agregarResultado("Nico Avalos", "3-2", "Yago", "FASE DE GRUPOS COPA TOTAL T18");
agregarResultado("Renzo Badano", "1-0", "Antonella Lopez", "FASE DE GRUPOS COPA TOTAL T18");
agregarResultado("Antonella Lopez", "0-1", "Renzo Badano", "FASE DE GRUPOS COPA TOTAL T18");
agregarResultado("Luciano Hufschmid", "3-5", "Lucas Insua", "FASE DE GRUPOS COPA TOTAL T18");
agregarResultado("Lucas Insua", "5-3", "Luciano Hufschmid", "FASE DE GRUPOS COPA TOTAL T18");
agregarResultado("Lucas Insua", "5-4", "Antonella Lopez", "FASE DE GRUPOS COPA TOTAL T18");
agregarResultado("Antonella Lopez", "4-5", "Lucas Insua", "FASE DE GRUPOS COPA TOTAL T18");
agregarResultado("Renzo Badano", "1-5", "Luciano Hufschmid", "FASE DE GRUPOS COPA TOTAL T18");
agregarResultado("Luciano Hufschmid", "5-1", "Renzo Badano", "FASE DE GRUPOS COPA TOTAL T18");
agregarResultado("Santi", "0-2", "Rodrigo Talarico", "FASE DE GRUPOS COPA TOTAL T18");
agregarResultado("Rodrigo Talarico", "2-0", "Santi", "FASE DE GRUPOS COPA TOTAL T18");
agregarResultado("Nacho Soto", "1-1", "Moreno Perez", "FASE DE GRUPOS COPA TOTAL T18");
agregarResultado("Moreno Perez", "1-1", "Nacho Soto", "FASE DE GRUPOS COPA TOTAL T18");
agregarResultado("Rodrigo Talarico", "0-3", "Nico Luchetti (R)", "FASE DE GRUPOS COPA TOTAL T18");
agregarResultado("Nico Luchetti (R)", "3-0", "Rodrigo Talarico", "FASE DE GRUPOS COPA TOTAL T18");
agregarResultado("Santi", "5-2", "Nacho Soto", "FASE DE GRUPOS COPA TOTAL T18");
agregarResultado("Nacho Soto", "2-5", "Santi", "FASE DE GRUPOS COPA TOTAL T18");
agregarResultado("Pancho Muzzio", "1-1", "Joaco Fernandez", "FASE DE GRUPOS COPA TOTAL T18");
agregarResultado("Joaco Fernandez", "1-1", "Pancho Muzzio", "FASE DE GRUPOS COPA TOTAL T18");
agregarResultado("Eze", "1-3", "Cami", "FASE DE GRUPOS COPA TOTAL T18");
agregarResultado("Cami", "3-1", "Eze", "FASE DE GRUPOS COPA TOTAL T18");
agregarResultado("Joaco Fernandez", "4-3", "Cami", "FASE DE GRUPOS COPA TOTAL T18");
agregarResultado("Cami", "3-4", "Joaco Fernandez", "FASE DE GRUPOS COPA TOTAL T18");
agregarResultado("Eze", "1-1", "Pancho Muzzio", "FASE DE GRUPOS COPA TOTAL T18");
agregarResultado("Pancho Muzzio", "1-1", "Eze", "FASE DE GRUPOS COPA TOTAL T18");
agregarResultado("Rodrigo Soca", "1-1", "Felipe Galante", "FASE DE GRUPOS COPA TOTAL T18");
agregarResultado("Felipe Galante", "1-1", "Rodrigo Soca", "FASE DE GRUPOS COPA TOTAL T18");
agregarResultado("Lucas Aguilera", "4-4", "Matheo Olivera", "FASE DE GRUPOS COPA TOTAL T18");
agregarResultado("Matheo Olivera", "4-4", "Lucas Aguilera", "FASE DE GRUPOS COPA TOTAL T18");
agregarResultado("Felipe Galante", "1-0", "Matheo Olivera", "FASE DE GRUPOS COPA TOTAL T18");
agregarResultado("Matheo Olivera", "0-1", "Felipe Galante", "FASE DE GRUPOS COPA TOTAL T18");
agregarResultado("Lucas Aguilera", "7-4", "Rodrigo Soca", "FASE DE GRUPOS COPA TOTAL T18");
agregarResultado("Rodrigo Soca", "4-7", "Lucas Aguilera", "FASE DE GRUPOS COPA TOTAL T18");
agregarResultado("Mario Talarico", "1-3", "Azul Quispe", "FASE DE GRUPOS COPA TOTAL T18");
agregarResultado("Azul Quispe", "3-1", "Mario Talarico", "FASE DE GRUPOS COPA TOTAL T18");
agregarResultado("Kevin Sivori", "1-0", "Anubis", "FASE DE GRUPOS COPA TOTAL T18");
agregarResultado("Anubis", "0-1", "Kevin Sivori", "FASE DE GRUPOS COPA TOTAL T18");
agregarResultado("Azul Quispe", "1-0", "Anubis", "FASE DE GRUPOS COPA TOTAL T18");
agregarResultado("Anubis", "0-1", "Azul Quispe", "FASE DE GRUPOS COPA TOTAL T18");
agregarResultado("Kevin Sivori", "4-1", "Mario Talarico", "FASE DE GRUPOS COPA TOTAL T18");
agregarResultado("Mario Talarico", "1-4", "Kevin Sivori", "FASE DE GRUPOS COPA TOTAL T18");
agregarResultado("Tomas Torcasio", "1-2", "Joaquin Sampadaro", "FASE DE GRUPOS COPA TOTAL T18");
agregarResultado("Joaquin Sampadaro", "2-1", "Tomas Torcasio", "FASE DE GRUPOS COPA TOTAL T18");
agregarResultado("Facundo Marchese", "3-1", "Joel Alcalde", "FASE DE GRUPOS COPA TOTAL T18");
agregarResultado("Joel Alcalde", "1-3", "Facundo Marchese", "FASE DE GRUPOS COPA TOTAL T18");
agregarResultado("Joaquin Sampadaro", "2-4", "Joel Alcalde", "FASE DE GRUPOS COPA TOTAL T18");
agregarResultado("Joel Alcalde", "4-2", "Joaquin Sampadaro", "FASE DE GRUPOS COPA TOTAL T18");
agregarResultado("Facundo Marchese", "6-0", "Tomas Torcasio", "FASE DE GRUPOS COPA TOTAL T18");
agregarResultado("Tomas Torcasio", "0-6", "Facundo Marchese", "FASE DE GRUPOS COPA TOTAL T18");
agregarResultado("Fabrizio Escolano", "1-1", "Nico Luchetti (C)", "FASE DE GRUPOS COPA TOTAL T18");
agregarResultado("Nico Luchetti (C)", "1-1", "Fabrizio Escolano", "FASE DE GRUPOS COPA TOTAL T18");
agregarResultado("Ignacio Cejas", "2-0", "Joel Marasco", "FASE DE GRUPOS COPA TOTAL T18");
agregarResultado("Joel Marasco", "0-2", "Ignacio Cejas", "FASE DE GRUPOS COPA TOTAL T18");
agregarResultado("Nico Luchetti (C)", "4-0", "Joel Marasco", "FASE DE GRUPOS COPA TOTAL T18");
agregarResultado("Joel Marasco", "0-4", "Nico Luchetti (C)", "FASE DE GRUPOS COPA TOTAL T18");
agregarResultado("Ignacio Cejas", "2-1", "Fabrizio Escolano", "FASE DE GRUPOS COPA TOTAL T18");
agregarResultado("Fabrizio Escolano", "1-2", "Ignacio Cejas", "FASE DE GRUPOS COPA TOTAL T18");
agregarResultado("Ian Gangai", "0-1", "Ramiro Ebel", "FASE DE GRUPOS COPA TOTAL T18");
agregarResultado("Ramiro Ebel", "1-0", "Ian Gangai", "FASE DE GRUPOS COPA TOTAL T18");
agregarResultado("Bruno Alonso", "1-1", "Benja", "FASE DE GRUPOS COPA TOTAL T18");
agregarResultado("Benja", "1-1", "Bruno Alonso", "FASE DE GRUPOS COPA TOTAL T18");
agregarResultado("Ramiro Ebel", "0-3", "Benja", "FASE DE GRUPOS COPA TOTAL T18");
agregarResultado("Benja", "3-0", "Ramiro Ebel", "FASE DE GRUPOS COPA TOTAL T18");
agregarResultado("Bruno Alonso", "5-4", "Ian Gangai", "FASE DE GRUPOS COPA TOTAL T18");
agregarResultado("Ian Gangai", "4-5", "Bruno Alonso", "FASE DE GRUPOS COPA TOTAL T18");
agregarResultado("Pollo", "3-1", "Dani Bazan", "FASE DE GRUPOS COPA TOTAL T18");
agregarResultado("Dani Bazan", "1-3", "Pollo", "FASE DE GRUPOS COPA TOTAL T18");
agregarResultado("Jhose", "0-4", "Tomas Delgado", "FASE DE GRUPOS COPA TOTAL T18");
agregarResultado("Tomas Delgado", "4-0", "Jhose", "FASE DE GRUPOS COPA TOTAL T18");
agregarResultado("Dani Bazan", "0-4", "Tomas Delgado", "FASE DE GRUPOS COPA TOTAL T18");
agregarResultado("Tomas Delgado", "4-0", "Dani Bazan", "FASE DE GRUPOS COPA TOTAL T18");
agregarResultado("Jhose", "3-3", "Pollo", "FASE DE GRUPOS COPA TOTAL T18");
agregarResultado("Pollo", "3-3", "Jhose", "FASE DE GRUPOS COPA TOTAL T18");
agregarResultado("Nico Avalos", "1-4", "Bautista Coria", "FASE DE GRUPOS COPA TOTAL T18");
agregarResultado("Bautista Coria", "4-1", "Nico Avalos", "FASE DE GRUPOS COPA TOTAL T18");
agregarResultado("Gabriel Talarico", "2-1", "Yago", "FASE DE GRUPOS COPA TOTAL T18");
agregarResultado("Yago", "1-2", "Gabriel Talarico", "FASE DE GRUPOS COPA TOTAL T18");
agregarResultado("Bautista Coria", "6-4", "Yago", "FASE DE GRUPOS COPA TOTAL T18");
agregarResultado("Yago", "4-6", "Bautista Coria", "FASE DE GRUPOS COPA TOTAL T18");
agregarResultado("Gabriel Talarico", "9-6", "Nico Avalos", "FASE DE GRUPOS COPA TOTAL T18");
agregarResultado("Nico Avalos", "6-9", "Gabriel Talarico", "FASE DE GRUPOS COPA TOTAL T18");
agregarResultado("Luciano Hufschmid", "1-1", "Antonella Lopez", "FASE DE GRUPOS COPA TOTAL T18");
agregarResultado("Antonella Lopez", "1-1", "Luciano Hufschmid", "FASE DE GRUPOS COPA TOTAL T18");
agregarResultado("Lucas Insua", "0-1", "Renzo Badano", "FASE DE GRUPOS COPA TOTAL T18");
agregarResultado("Renzo Badano", "1-0", "Lucas Insua", "FASE DE GRUPOS COPA TOTAL T18");
agregarResultado("Antonella Lopez", "1-2", "Renzo Badano", "FASE DE GRUPOS COPA TOTAL T18");
agregarResultado("Renzo Badano", "2-1", "Antonella Lopez", "FASE DE GRUPOS COPA TOTAL T18");
agregarResultado("Lucas Insua", "1-1", "Luciano Hufschmid", "FASE DE GRUPOS COPA TOTAL T18");
agregarResultado("Luciano Hufschmid", "1-1", "Lucas Insua", "FASE DE GRUPOS COPA TOTAL T18");
agregarResultado("Moreno Perez", "4-1", "Nico Luchetti (R)", "FASE DE GRUPOS COPA TOTAL T18");
agregarResultado("Nico Luchetti (R)", "1-4", "Moreno Perez", "FASE DE GRUPOS COPA TOTAL T18");
agregarResultado("Rodrigo Talarico", "1-1", "Nacho Soto", "FASE DE GRUPOS COPA TOTAL T18");
agregarResultado("Nacho Soto", "1-1", "Rodrigo Talarico", "FASE DE GRUPOS COPA TOTAL T18");
agregarResultado("Nacho Soto", "5-0", "Nico Luchetti (R)", "FASE DE GRUPOS COPA TOTAL T18");
agregarResultado("Nico Luchetti (R)", "0-5", "Nacho Soto", "FASE DE GRUPOS COPA TOTAL T18");
agregarResultado("Moreno Perez", "3-3", "Santi", "FASE DE GRUPOS COPA TOTAL T18");
agregarResultado("Santi", "3-3", "Moreno Perez", "FASE DE GRUPOS COPA TOTAL T18");
agregarResultado("Joaco Fernandez", "2-4", "Eze", "FASE DE GRUPOS COPA TOTAL T18");
agregarResultado("Eze", "4-2", "Joaco Fernandez", "FASE DE GRUPOS COPA TOTAL T18");
agregarResultado("Pancho Muzzio", "4-2", "Cami", "FASE DE GRUPOS COPA TOTAL T18");
agregarResultado("Cami", "2-4", "Pancho Muzzio", "FASE DE GRUPOS COPA TOTAL T18");
agregarResultado("Joaco Fernandez", "4-5", "Pancho Muzzio", "FASE DE GRUPOS COPA TOTAL T18");
agregarResultado("Pancho Muzzio", "5-4", "Joaco Fernandez", "FASE DE GRUPOS COPA TOTAL T18");
agregarResultado("Cami", "5-5", "Eze", "FASE DE GRUPOS COPA TOTAL T18");
agregarResultado("Eze", "5-5", "Cami", "FASE DE GRUPOS COPA TOTAL T18");
agregarResultado("Felipe Galante", "3-2", "Lucas Aguilera", "FASE DE GRUPOS COPA TOTAL T18");
agregarResultado("Lucas Aguilera", "2-3", "Felipe Galante", "FASE DE GRUPOS COPA TOTAL T18");
agregarResultado("Rodrigo Soca", "2-0", "Matheo Olivera", "FASE DE GRUPOS COPA TOTAL T18");
agregarResultado("Matheo Olivera", "0-2", "Rodrigo Soca", "FASE DE GRUPOS COPA TOTAL T18");
agregarResultado("Felipe Galante", "5-3", "Rodrigo Soca", "FASE DE GRUPOS COPA TOTAL T18");
agregarResultado("Rodrigo Soca", "3-5", "Felipe Galante", "FASE DE GRUPOS COPA TOTAL T18");
agregarResultado("Matheo Olivera", "7-5", "Lucas Aguilera", "FASE DE GRUPOS COPA TOTAL T18");
agregarResultado("Lucas Aguilera", "5-7", "Matheo Olivera", "FASE DE GRUPOS COPA TOTAL T18");
agregarResultado("Azul Quispe", "0-4", "Kevin Sivori", "FASE DE GRUPOS COPA TOTAL T18");
agregarResultado("Kevin Sivori", "4-0", "Azul Quispe", "FASE DE GRUPOS COPA TOTAL T18");
agregarResultado("Mario Talarico", "7-0", "Anubis", "FASE DE GRUPOS COPA TOTAL T18");
agregarResultado("Anubis", "0-7", "Mario Talarico", "FASE DE GRUPOS COPA TOTAL T18");
agregarResultado("Azul Quispe", "0-1", "Mario Talarico", "FASE DE GRUPOS COPA TOTAL T18");
agregarResultado("Mario Talarico", "1-0", "Azul Quispe", "FASE DE GRUPOS COPA TOTAL T18");
agregarResultado("Anubis", "0-4", "Kevin Sivori", "FASE DE GRUPOS COPA TOTAL T18");
agregarResultado("Kevin Sivori", "4-0", "Anubis", "FASE DE GRUPOS COPA TOTAL T18");
agregarResultado("Joaquin Sampadaro", "4-1", "Facundo Marchese", "FASE DE GRUPOS COPA TOTAL T18");
agregarResultado("Facundo Marchese", "1-4", "Joaquin Sampadaro", "FASE DE GRUPOS COPA TOTAL T18");
agregarResultado("Tomas Torcasio", "0-2", "Joel Alcalde", "FASE DE GRUPOS COPA TOTAL T18");
agregarResultado("Joel Alcalde", "2-0", "Tomas Torcasio", "FASE DE GRUPOS COPA TOTAL T18");
agregarResultado("Joaquin Sampadaro", "3-0", "Tomas Torcasio", "FASE DE GRUPOS COPA TOTAL T18");
agregarResultado("Tomas Torcasio", "0-3", "Joaquin Sampadaro", "FASE DE GRUPOS COPA TOTAL T18");
agregarResultado("Joel Alcalde", "1-3", "Facundo Marchese", "FASE DE GRUPOS COPA TOTAL T18");
agregarResultado("Facundo Marchese", "3-1", "Joel Alcalde", "FASE DE GRUPOS COPA TOTAL T18");
agregarResultado("Nico Luchetti (C)", "4-3", "Ignacio Cejas", "FASE DE GRUPOS COPA TOTAL T18");
agregarResultado("Ignacio Cejas", "3-4", "Nico Luchetti (C)", "FASE DE GRUPOS COPA TOTAL T18");
agregarResultado("Fabrizio Escolano", "2-0", "Joel Marasco", "FASE DE GRUPOS COPA TOTAL T18");
agregarResultado("Joel Marasco", "0-2", "Fabrizio Escolano", "FASE DE GRUPOS COPA TOTAL T18");
agregarResultado("Nico Luchetti (C)", "4-5", "Fabrizio Escolano", "FASE DE GRUPOS COPA TOTAL T18");
agregarResultado("Fabrizio Escolano", "5-4", "Nico Luchetti (C)", "FASE DE GRUPOS COPA TOTAL T18");
agregarResultado("Joel Marasco", "0-2", "Ignacio Cejas", "FASE DE GRUPOS COPA TOTAL T18");
agregarResultado("Ignacio Cejas", "2-0", "Joel Marasco", "FASE DE GRUPOS COPA TOTAL T18");
agregarResultado("Ramiro Ebel", "0-2", "Bruno Alonso", "FASE DE GRUPOS COPA TOTAL T18");
agregarResultado("Bruno Alonso", "2-0", "Ramiro Ebel", "FASE DE GRUPOS COPA TOTAL T18");
agregarResultado("Ian Gangai", "2-0", "Benja", "FASE DE GRUPOS COPA TOTAL T18");
agregarResultado("Benja", "0-2", "Ian Gangai", "FASE DE GRUPOS COPA TOTAL T18");
agregarResultado("Ramiro Ebel", "0-6", "Ian Gangai", "FASE DE GRUPOS COPA TOTAL T18");
agregarResultado("Ian Gangai", "6-0", "Ramiro Ebel", "FASE DE GRUPOS COPA TOTAL T18");
agregarResultado("Benja", "1-6", "Bruno Alonso", "FASE DE GRUPOS COPA TOTAL T18");
agregarResultado("Bruno Alonso", "6-1", "Benja", "FASE DE GRUPOS COPA TOTAL T18");
agregarResultado("Dani Bazan", "0-2", "Jhose", "FASE DE GRUPOS COPA TOTAL T18");
agregarResultado("Jhose", "2-0", "Dani Bazan", "FASE DE GRUPOS COPA TOTAL T18");
agregarResultado("Pollo", "2-1", "Tomas Delgado", "FASE DE GRUPOS COPA TOTAL T18");
agregarResultado("Tomas Delgado", "1-2", "Pollo", "FASE DE GRUPOS COPA TOTAL T18");
agregarResultado("Dani Bazan", "6-7", "Pollo", "FASE DE GRUPOS COPA TOTAL T18");
agregarResultado("Pollo", "7-6", "Dani Bazan", "FASE DE GRUPOS COPA TOTAL T18");
agregarResultado("Tomas Delgado", "6-2", "Jhose", "FASE DE GRUPOS COPA TOTAL T18");
agregarResultado("Jhose", "2-6", "Tomas Delgado", "FASE DE GRUPOS COPA TOTAL T18");
agregarResultado("Bautista Coria", "2-2", "Gabriel Talarico", "FASE DE GRUPOS COPA TOTAL T18");
agregarResultado("Gabriel Talarico", "2-2", "Bautista Coria", "FASE DE GRUPOS COPA TOTAL T18");
agregarResultado("Nico Avalos", "2-2", "Yago", "FASE DE GRUPOS COPA TOTAL T18");
agregarResultado("Yago", "2-2", "Nico Avalos", "FASE DE GRUPOS COPA TOTAL T18");
agregarResultado("Bautista Coria", "2-6", "Nico Avalos", "FASE DE GRUPOS COPA TOTAL T18");
agregarResultado("Nico Avalos", "6-2", "Bautista Coria", "FASE DE GRUPOS COPA TOTAL T18");
agregarResultado("Yago", "2-8", "Gabriel Talarico", "FASE DE GRUPOS COPA TOTAL T18");
agregarResultado("Gabriel Talarico", "8-2", "Yago", "FASE DE GRUPOS COPA TOTAL T18");
agregarResultado("Antonella Lopez", "0-2", "Lucas Insua", "FASE DE GRUPOS COPA TOTAL T18");
agregarResultado("Lucas Insua", "2-0", "Antonella Lopez", "FASE DE GRUPOS COPA TOTAL T18");
agregarResultado("Luciano Hufschmid", "3-2", "Renzo Badano", "FASE DE GRUPOS COPA TOTAL T18");
agregarResultado("Renzo Badano", "2-3", "Luciano Hufschmid", "FASE DE GRUPOS COPA TOTAL T18");
agregarResultado("Antonella Lopez", "6-3", "Luciano Hufschmid", "FASE DE GRUPOS COPA TOTAL T18");
agregarResultado("Luciano Hufschmid", "3-6", "Antonella Lopez", "FASE DE GRUPOS COPA TOTAL T18");
agregarResultado("Renzo Badano", "5-5", "Lucas Insua", "FASE DE GRUPOS COPA TOTAL T18");
agregarResultado("Lucas Insua", "5-5", "Renzo Badano", "FASE DE GRUPOS COPA TOTAL T18");
agregarResultado("Santi", "1-0", "Nico Luchetti (R)", "FASE DE GRUPOS COPA TOTAL T18");
agregarResultado("Nico Luchetti (R)", "0-1", "Santi", "FASE DE GRUPOS COPA TOTAL T18");
agregarResultado("Moreno Perez", "2-2", "Rodrigo Talarico", "FASE DE GRUPOS COPA TOTAL T18");
agregarResultado("Rodrigo Talarico", "2-2", "Moreno Perez", "FASE DE GRUPOS COPA TOTAL T18");
agregarResultado("Santi", "6-10", "Cami", "OCTAVOS DE FINAL COPA TOTAL T18");
agregarResultado("Cami", "10-6", "Santi", "OCTAVOS DE FINAL COPA TOTAL T18");
agregarResultado("Azul Quispe", "5-11", "Bruno Alonso", "OCTAVOS DE FINAL COPA TOTAL T18");
agregarResultado("Bruno Alonso", "11-5", "Azul Quispe", "OCTAVOS DE FINAL COPA TOTAL T18");
agregarResultado("Lucas Insua", "6-9", "Kevin Sivori", "OCTAVOS DE FINAL COPA TOTAL T18");
agregarResultado("Kevin Sivori", "9-6", "Lucas Insua", "OCTAVOS DE FINAL COPA TOTAL T18");
agregarResultado("Gabriel Talarico", "11-11", "Pollo", "OCTAVOS DE FINAL COPA TOTAL T18");
agregarResultado("Pollo", "11-11", "Gabriel Talarico", "OCTAVOS DE FINAL COPA TOTAL T18");
agregarResultado("Joaquin Sampadaro", "3-8", "Facundo Marchese", "OCTAVOS DE FINAL COPA TOTAL T18");
agregarResultado("Facundo Marchese", "8-3", "Joaquin Sampadaro", "OCTAVOS DE FINAL COPA TOTAL T18");
agregarResultado("Ignacio Cejas", "5-8", "Tomas Delgado", "OCTAVOS DE FINAL COPA TOTAL T18");
agregarResultado("Tomas Delgado", "8-5", "Ignacio Cejas", "OCTAVOS DE FINAL COPA TOTAL T18");
agregarResultado("Fabrizio Escolano", "12-5", "Rodrigo Soca", "OCTAVOS DE FINAL COPA TOTAL T18");
agregarResultado("Rodrigo Soca", "5-12", "Fabrizio Escolano", "OCTAVOS DE FINAL COPA TOTAL T18");
agregarResultado("Moreno Perez", "5-11", "Benja", "OCTAVOS DE FINAL COPA TOTAL T18");
agregarResultado("Benja", "11-5", "Moreno Perez", "OCTAVOS DE FINAL COPA TOTAL T18");
agregarResultado("Gabriel Talarico", "4-3", "Pollo", "DESEMPATE OCTAVOS DE FINAL COPA TOTAL T18");
agregarResultado("Pollo", "3-4", "Gabriel Talarico", "DESEMPATE OCTAVOS DE FINAL COPA TOTAL T18");
agregarResultado("Kevin Sivori", "9-9", "Bruno Alonso", "CUARTOS DE FINAL COPA TOTAL T18");
agregarResultado("Bruno Alonso", "9-9", "Kevin Sivori", "CUARTOS DE FINAL COPA TOTAL T18");
agregarResultado("Cami", "11-6", "Tomas Delgado", "CUARTOS DE FINAL COPA TOTAL T18");
agregarResultado("Tomas Delgado", "6-11", "Cami", "CUARTOS DE FINAL COPA TOTAL T18");
agregarResultado("Benja", "7-9", "Gabriel Talarico", "CUARTOS DE FINAL COPA TOTAL T18");
agregarResultado("Gabriel Talarico", "9-7", "Benja", "CUARTOS DE FINAL COPA TOTAL T18");
agregarResultado("Facundo Marchese", "6-9", "Fabrizio Escolano", "CUARTOS DE FINAL COPA TOTAL T18");
agregarResultado("Fabrizio Escolano", "9-6", "Facundo Marchese", "CUARTOS DE FINAL COPA TOTAL T18");
agregarResultado("Kevin Sivori", "4-4", "Bruno Alonso", "DESEMPATE CUARTOS DE FINAL COPA TOTAL T18");
agregarResultado("Bruno Alonso", "4-4", "Kevin Sivori", "DESEMPATE CUARTOS DE FINAL COPA TOTAL T18");
agregarResultado("Kevin Sivori", "1-3", "Bruno Alonso", "DESEMPATE 2 CUARTOS DE FINAL COPA TOTAL T18");
agregarResultado("Bruno Alonso", "3-1", "Kevin Sivori", "DESEMPATE 2 CUARTOS DE FINAL COPA TOTAL T18");
agregarResultado("Gabriel Talarico", "2-6", "Cami", "SEMIFINAL COPA TOTAL T18");
agregarResultado("Cami", "6-2", "Gabriel Talarico", "SEMIFINAL COPA TOTAL T18");
agregarResultado("Fabrizio Escolano", "6-7", "Bruno Alonso", "SEMIFINAL COPA TOTAL T18");
agregarResultado("Bruno Alonso", "7-6", "Fabrizio Escolano", "SEMIFINAL COPA TOTAL T18");
agregarResultado("Bruno Alonso", "9-13", "Cami", "FINAL COPA TOTAL T18");
agregarResultado("Cami", "13-9", "Bruno Alonso", "FINAL COPA TOTAL T18");
agregarResultado("Joaquin Sampadaro", "5-8", "Ramiro Ebel", "64AVOS DE FINAL COPA CAMPEONES T18");
agregarResultado("Ramiro Ebel", "8-5", "Joaquin Sampadaro", "64AVOS DE FINAL COPA CAMPEONES T18");
agregarResultado("Ramiro Ebel", "0-9", "Rodrigo Soca", "32AVOS DE FINAL COPA CAMPEONES T18");
agregarResultado("Rodrigo Soca", "9-0", "Ramiro Ebel", "32AVOS DE FINAL COPA CAMPEONES T18");
agregarResultado("Luciano Hufschmid", "7-8", "Fabrizio Escolano", "32AVOS DE FINAL COPA CAMPEONES T18");
agregarResultado("Fabrizio Escolano", "8-7", "Luciano Hufschmid", "32AVOS DE FINAL COPA CAMPEONES T18");
agregarResultado("Joel Alcalde", "7-10", "Eze", "32AVOS DE FINAL COPA CAMPEONES T18");
agregarResultado("Eze", "10-7", "Joel Alcalde", "32AVOS DE FINAL COPA CAMPEONES T18");
agregarResultado("Rodrigo Soca", "5-6", "Lucas Aguilera", "16AVOS DE FINAL COPA CAMPEONES T18");
agregarResultado("Lucas Aguilera", "6-5", "Rodrigo Soca", "16AVOS DE FINAL COPA CAMPEONES T18");
agregarResultado("Fabrizio Escolano", "12-5", "Eze", "16AVOS DE FINAL COPA CAMPEONES T18");
agregarResultado("Eze", "5-12", "Fabrizio Escolano", "16AVOS DE FINAL COPA CAMPEONES T18");
agregarResultado("Lucas Aguilera", "14-10", "Tomas Torcasio", "OCTAVOS DE FINAL COPA CAMPEONES T18");
agregarResultado("Tomas Torcasio", "10-14", "Lucas Aguilera", "OCTAVOS DE FINAL COPA CAMPEONES T18");
agregarResultado("Fabrizio Escolano", "9-11", "Ian Gangai", "OCTAVOS DE FINAL COPA CAMPEONES T18");
agregarResultado("Ian Gangai", "11-9", "Fabrizio Escolano", "OCTAVOS DE FINAL COPA CAMPEONES T18");
agregarResultado("Benja", "7-8", "Yago", "OCTAVOS DE FINAL COPA CAMPEONES T18");
agregarResultado("Yago", "8-7", "Benja", "OCTAVOS DE FINAL COPA CAMPEONES T18");
agregarResultado("Lucas Aguilera ", "2-7", "Nico Avalos", "CUARTOS DE FINAL COPA CAMPEONES T18");
agregarResultado("Nico Avalos", "7-2", "Lucas Aguilera ", "CUARTOS DE FINAL COPA CAMPEONES T18");
agregarResultado("Ian Gangai", "9-9", "Yago", "CUARTOS DE FINAL COPA CAMPEONES T18");
agregarResultado("Yago", "9-9", "Ian Gangai", "CUARTOS DE FINAL COPA CAMPEONES T18");
agregarResultado("Ian Gangai", "1-1", "Yago", "DESEMPATE CUARTOS DE FINAL COPA CAMPEONES T18");
agregarResultado("Yago", "1-1", "Ian Gangai", "DESEMPATE CUARTOS DE FINAL COPA CAMPEONES T18");
agregarResultado("Ian Gangai", "2-2", "Yago", "DESEMPATE 2 CUARTOS DE FINAL COPA CAMPEONES T18");
agregarResultado("Yago", "2-2", "Ian Gangai", "DESEMPATE 2 CUARTOS DE FINAL COPA CAMPEONES T18");
agregarResultado("Ian Gangai", "1-3", "Yago", "DESEMPATE 3 CUARTOS DE FINAL COPA CAMPEONES T18");
agregarResultado("Yago", "3-1", "Ian Gangai", "DESEMPATE 3 CUARTOS DE FINAL COPA CAMPEONES T18");
agregarResultado("Nico Avalos", "15-8", "Pancho Muzzio", "SEMIFINAL COPA CAMPEONES T18");
agregarResultado("Pancho Muzzio", "8-15", "Nico Avalos", "SEMIFINAL COPA CAMPEONES T18");
agregarResultado("Yago", "16-13", "Moreno Perez", "SEMIFINAL COPA CAMPEONES T18");
agregarResultado("Moreno Perez", "13-16", "Yago", "SEMIFINAL COPA CAMPEONES T18");
agregarResultado("Nico Avalos", "10-9", "Yago", "FINAL COPA CAMPEONES T18");
agregarResultado("Yago", "9-10", "Nico Avalos", "FINAL COPA CAMPEONES T18");
agregarResultado("Yago", "29-16", "Luciano Hufschmid", "FINAL COPA DUOS T18");
agregarResultado("Luciano Hufschmid", "16-29", "Yago", "FINAL COPA DUOS T18");
agregarResultado("Mario Talarico", "29-16", "Pancho Muzzio", "FINAL COPA DUOS T18");
agregarResultado("Pancho Muzzio", "16-29", "Mario Talarico", "FINAL COPA DUOS T18");
agregarResultado("Yago", "29-16", "Pancho Muzzio", "FINAL COPA DUOS T18");
agregarResultado("Pancho Muzzio", "16-29", "Yago", "FINAL COPA DUOS T18");
agregarResultado("Mario Talarico", "29-16", "Luciano Hufschmid", "FINAL COPA DUOS T18");
agregarResultado("Luciano Hufschmid", "16-29", "Mario Talarico", "FINAL COPA DUOS T18");
agregarResultado("Lucas Aguilera", "12-5", "Jhose", "PROMOCIONES T18");
agregarResultado("Jhose", "5-12", "Lucas Aguilera", "PROMOCIONES T18");
agregarResultado("Bruno Alonso", "8-4", "Kevin Sivori", "PROMOCIONES T18");
agregarResultado("Kevin Sivori", "4-8", "Bruno Alonso", "PROMOCIONES T18");
agregarResultado("Kevin Sivori", "8-7", "Nacho Soto", "AMISTOSO T18");
agregarResultado("Nacho Soto", "7-8", "Kevin Sivori", "AMISTOSO T18");
agregarResultado("Renzo Badano", "1-0", "Eze", "DESEMPATE GRUPOS COPA A T19");
agregarResultado("Eze", "0-1", "Renzo Badano", "DESEMPATE GRUPOS COPA A T19");
agregarResultado("Cami", "4-1", "Pollo", "DESEMPATE GRUPOS COPA A T19");
agregarResultado("Pollo", "1-4", "Cami", "DESEMPATE GRUPOS COPA A T19");
agregarResultado("Eze", "3-6", "Lucas Insua", "OCTAVOS DE FINAL COPA A T19");
agregarResultado("Lucas Insua", "6-3", "Eze", "OCTAVOS DE FINAL COPA A T19");
agregarResultado("Fabrizio Escolano", "6-6", "Benja", "OCTAVOS DE FINAL COPA A T19");
agregarResultado("Benja", "6-6", "Fabrizio Escolano", "OCTAVOS DE FINAL COPA A T19");
agregarResultado("Nico Avalos", "6-6", "Yago", "OCTAVOS DE FINAL COPA A T19");
agregarResultado("Yago", "6-6", "Nico Avalos", "OCTAVOS DE FINAL COPA A T19");
agregarResultado("Rodrigo Soca", "7-9", "Cami", "OCTAVOS DE FINAL COPA A T19");
agregarResultado("Cami", "9-7", "Rodrigo Soca", "OCTAVOS DE FINAL COPA A T19");
agregarResultado("Fabrizio Escolano", "0-0", "Benja", "DESEMPATE OCTAVOS DE FINAL COPA A T19");
agregarResultado("Benja", "0-0", "Fabrizio Escolano", "DESEMPATE OCTAVOS DE FINAL COPA A T19");
agregarResultado("Nico Avalos", "1-0", "Yago", "DESEMPATE OCTAVOS DE FINAL COPA A T19");
agregarResultado("Yago", "0-1", "Nico Avalos", "DESEMPATE OCTAVOS DE FINAL COPA A T19");
agregarResultado("Fabrizio Escolano", "4-2", "Benja", "DESEMPATE 2 OCTAVOS DE FINAL COPA A T19");
agregarResultado("Benja", "2-4", "Fabrizio Escolano", "DESEMPATE 2 OCTAVOS DE FINAL COPA A T19");
agregarResultado("Joel Alcalde", "4-8", "Lucas Insua", "CUARTOS DE FINAL COPA A T19");
agregarResultado("Lucas Insua", "8-4", "Joel Alcalde", "CUARTOS DE FINAL COPA A T19");
agregarResultado("Renzo Badano", "6-13", "Fabrizio Escolano", "CUARTOS DE FINAL COPA A T19");
agregarResultado("Fabrizio Escolano", "13-6", "Renzo Badano", "CUARTOS DE FINAL COPA A T19");
agregarResultado("Gabriel Talarico", "5-8", "Cami", "CUARTOS DE FINAL COPA A T19");
agregarResultado("Cami", "8-5", "Gabriel Talarico", "CUARTOS DE FINAL COPA A T19");
agregarResultado("Lucas Aguilera", "8-6", "Nico Avalos", "CUARTOS DE FINAL COPA A T19");
agregarResultado("Nico Avalos", "6-8", "Lucas Aguilera", "CUARTOS DE FINAL COPA A T19");
agregarResultado("Lucas Aguilera", "17-13", "Lucas Insua", "SEMIFINAL COPA A T19");
agregarResultado("Lucas Insua", "13-17", "Lucas Aguilera", "SEMIFINAL COPA A T19");
agregarResultado("Cami", "16-8", "Fabrizio Escolano", "SEMIFINAL COPA A T19");
agregarResultado("Fabrizio Escolano", "8-16", "Cami", "SEMIFINAL COPA A T19");
agregarResultado("Lucas Aguilera", "7-4", "Cami", "FINAL COPA A T19");
agregarResultado("Cami", "4-7", "Lucas Aguilera", "FINAL COPA A T19");
agregarResultado("Felipe Galante", "4-8", "Joel Marasco", "OCTAVOS DE FINAL COPA B T19");
agregarResultado("Joel Marasco", "8-4", "Felipe Galante", "OCTAVOS DE FINAL COPA B T19");
agregarResultado("Antonella Lopez", "4-7", "Azul Quispe", "OCTAVOS DE FINAL COPA B T19");
agregarResultado("Azul Quispe", "7-4", "Antonella Lopez", "OCTAVOS DE FINAL COPA B T19");
agregarResultado("Mario Talarico", "7-14", "Joaquin Sampadaro", "OCTAVOS DE FINAL COPA B T19");
agregarResultado("Joaquin Sampadaro", "14-7", "Mario Talarico", "OCTAVOS DE FINAL COPA B T19");
agregarResultado("Nacho Soto", "6-7", "Rodrigo Talarico", "OCTAVOS DE FINAL COPA B T19");
agregarResultado("Rodrigo Talarico", "7-6", "Nacho Soto", "OCTAVOS DE FINAL COPA B T19");
agregarResultado("Kevin Sivori", "7-7", "Rodrigo Talarico", "CUARTOS DE FINAL COPA B T19");
agregarResultado("Rodrigo Talarico", "7-7", "Kevin Sivori", "CUARTOS DE FINAL COPA B T19");
agregarResultado("Rodri Sebastian", "9-12", "Joaquin Sampadaro", "CUARTOS DE FINAL COPA B T19");
agregarResultado("Joaquin Sampadaro", "12-9", "Rodri Sebastian", "CUARTOS DE FINAL COPA B T19");
agregarResultado("Jhose", "10-6", "Joel Marasco", "CUARTOS DE FINAL COPA B T19");
agregarResultado("Joel Marasco", "6-10", "Jhose", "CUARTOS DE FINAL COPA B T19");
agregarResultado("Ignacio Cejas", "9-10", "Azul Quispe", "CUARTOS DE FINAL COPA B T19");
agregarResultado("Azul Quispe", "10-9", "Ignacio Cejas", "CUARTOS DE FINAL COPA B T19");
agregarResultado("Kevin Sivori", "1-1", "Rodrigo Talarico", "DESEMPATE CUARTOS DE FINAL COPA B T19");
agregarResultado("Rodrigo Talarico", "1-1", "Kevin Sivori", "DESEMPATE CUARTOS DE FINAL COPA B T19");
agregarResultado("Kevin Sivori", "3-3", "Rodrigo Talarico", "DESEMPATE 2 CUARTOS DE FINAL COPA B T19");
agregarResultado("Rodrigo Talarico", "3-3", "Kevin Sivori", "DESEMPATE 2 CUARTOS DE FINAL COPA B T19");
agregarResultado("Kevin Sivori", "0-3", "Rodrigo Talarico", "DESEMPATE 3 CUARTOS DE FINAL COPA B T19");
agregarResultado("Rodrigo Talarico", "3-0", "Kevin Sivori", "DESEMPATE 3 CUARTOS DE FINAL COPA B T19");
agregarResultado("Rodrigo Talarico", "14-18", "Jhose", "SEMIFINAL COPA B T19");
agregarResultado("Jhose", "18-14", "Rodrigo Talarico", "SEMIFINAL COPA B T19");
agregarResultado("Joaquin Sampadaro", "9-12", "Azul Quispe", "SEMIFINAL COPA B T19");
agregarResultado("Azul Quispe", "12-9", "Joaquin Sampadaro", "SEMIFINAL COPA B T19");
agregarResultado("Jhose", "7-5", "Azul Quispe", "FINAL COPA B T19");
agregarResultado("Azul Quispe", "5-7", "Jhose", "FINAL COPA B T19");
agregarResultado("Cami", "1-2", "Dani Bazan", "FASE DE GRUPOS COPA TOTAL T19");
agregarResultado("Dani Bazan", "2-1", "Cami", "FASE DE GRUPOS COPA TOTAL T19");
agregarResultado("Yago", "2-3", "Ignacio Cejas", "FASE DE GRUPOS COPA TOTAL T19");
agregarResultado("Ignacio Cejas", "3-2", "Yago", "FASE DE GRUPOS COPA TOTAL T19");
agregarResultado("Ignacio Cejas", "3-5", "Dani Bazan", "FASE DE GRUPOS COPA TOTAL T19");
agregarResultado("Dani Bazan", "5-3", "Ignacio Cejas", "FASE DE GRUPOS COPA TOTAL T19");
agregarResultado("Cami", "2-2", "Yago", "FASE DE GRUPOS COPA TOTAL T19");
agregarResultado("Yago", "2-2", "Cami", "FASE DE GRUPOS COPA TOTAL T19");
agregarResultado("Fabrizio Escolano", "3-4", "Felipe Galante", "FASE DE GRUPOS COPA TOTAL T19");
agregarResultado("Felipe Galante", "4-3", "Fabrizio Escolano", "FASE DE GRUPOS COPA TOTAL T19");
agregarResultado("Joel Alcalde", "4-4", "Renzo Badano", "FASE DE GRUPOS COPA TOTAL T19");
agregarResultado("Renzo Badano", "4-4", "Joel Alcalde", "FASE DE GRUPOS COPA TOTAL T19");
agregarResultado("Renzo Badano", "6-3", "Felipe Galante", "FASE DE GRUPOS COPA TOTAL T19");
agregarResultado("Felipe Galante", "3-6", "Renzo Badano", "FASE DE GRUPOS COPA TOTAL T19");
agregarResultado("Fabrizio Escolano", "3-3", "Joel Alcalde", "FASE DE GRUPOS COPA TOTAL T19");
agregarResultado("Joel Alcalde", "3-3", "Fabrizio Escolano", "FASE DE GRUPOS COPA TOTAL T19");
agregarResultado("Rodrigo Soca", "4-3", "Joel Marasco", "FASE DE GRUPOS COPA TOTAL T19");
agregarResultado("Joel Marasco", "3-4", "Rodrigo Soca", "FASE DE GRUPOS COPA TOTAL T19");
agregarResultado("Benja", "2-2", "Tomas Delgado", "FASE DE GRUPOS COPA TOTAL T19");
agregarResultado("Tomas Delgado", "2-2", "Benja", "FASE DE GRUPOS COPA TOTAL T19");
agregarResultado("Tomas Delgado", "1-1", "Joel Marasco", "FASE DE GRUPOS COPA TOTAL T19");
agregarResultado("Joel Marasco", "1-1", "Tomas Delgado", "FASE DE GRUPOS COPA TOTAL T19");
agregarResultado("Rodrigo Soca", "2-5", "Benja", "FASE DE GRUPOS COPA TOTAL T19");
agregarResultado("Benja", "5-2", "Rodrigo Soca", "FASE DE GRUPOS COPA TOTAL T19");
agregarResultado("Bruno Alonso", "6-2", "Anubis", "FASE DE GRUPOS COPA TOTAL T19");
agregarResultado("Anubis", "2-6", "Bruno Alonso", "FASE DE GRUPOS COPA TOTAL T19");
agregarResultado("Nacho Soto", "2-4", "Gabriel Talarico", "FASE DE GRUPOS COPA TOTAL T19");
agregarResultado("Gabriel Talarico", "4-2", "Nacho Soto", "FASE DE GRUPOS COPA TOTAL T19");
agregarResultado("Gabriel Talarico", "3-1", "Anubis", "FASE DE GRUPOS COPA TOTAL T19");
agregarResultado("Anubis", "1-3", "Gabriel Talarico", "FASE DE GRUPOS COPA TOTAL T19");
agregarResultado("Bruno Alonso", "3-3", "Nacho Soto", "FASE DE GRUPOS COPA TOTAL T19");
agregarResultado("Nacho Soto", "3-3", "Bruno Alonso", "FASE DE GRUPOS COPA TOTAL T19");
agregarResultado("Pancho Muzzio", "2-3", "Azul Quispe", "FASE DE GRUPOS COPA TOTAL T19");
agregarResultado("Azul Quispe", "3-2", "Pancho Muzzio", "FASE DE GRUPOS COPA TOTAL T19");
agregarResultado("Matheo Olivera", "0-5", "Lucas Aguilera", "FASE DE GRUPOS COPA TOTAL T19");
agregarResultado("Lucas Aguilera", "5-0", "Matheo Olivera", "FASE DE GRUPOS COPA TOTAL T19");
agregarResultado("Lucas Aguilera", "3-2", "Azul Quispe", "FASE DE GRUPOS COPA TOTAL T19");
agregarResultado("Azul Quispe", "2-3", "Lucas Aguilera", "FASE DE GRUPOS COPA TOTAL T19");
agregarResultado("Pancho Muzzio", "2-0", "Matheo Olivera", "FASE DE GRUPOS COPA TOTAL T19");
agregarResultado("Matheo Olivera", "0-2", "Pancho Muzzio", "FASE DE GRUPOS COPA TOTAL T19");
agregarResultado("Tomas Torcasio", "4-0", "Santi", "FASE DE GRUPOS COPA TOTAL T19");
agregarResultado("Santi", "0-4", "Tomas Torcasio", "FASE DE GRUPOS COPA TOTAL T19");
agregarResultado("Jhose", "2-6", "Lucas Insua", "FASE DE GRUPOS COPA TOTAL T19");
agregarResultado("Lucas Insua", "6-2", "Jhose", "FASE DE GRUPOS COPA TOTAL T19");
agregarResultado("Lucas Insua", "2-1", "Santi", "FASE DE GRUPOS COPA TOTAL T19");
agregarResultado("Santi", "1-2", "Lucas Insua", "FASE DE GRUPOS COPA TOTAL T19");
agregarResultado("Tomas Torcasio", "0-4", "Jhose", "FASE DE GRUPOS COPA TOTAL T19");
agregarResultado("Jhose", "4-0", "Tomas Torcasio", "FASE DE GRUPOS COPA TOTAL T19");
agregarResultado("Moreno Perez", "4-0", "Nico Luchetti (R)", "FASE DE GRUPOS COPA TOTAL T19");
agregarResultado("Nico Luchetti (R)", "0-4", "Moreno Perez", "FASE DE GRUPOS COPA TOTAL T19");
agregarResultado("Bautista Coria", "3-2", "Luciano Hufschmid", "FASE DE GRUPOS COPA TOTAL T19");
agregarResultado("Luciano Hufschmid", "2-3", "Bautista Coria", "FASE DE GRUPOS COPA TOTAL T19");
agregarResultado("Luciano Hufschmid", "5-0", "Nico Luchetti (R)", "FASE DE GRUPOS COPA TOTAL T19");
agregarResultado("Nico Luchetti (R)", "0-5", "Luciano Hufschmid", "FASE DE GRUPOS COPA TOTAL T19");
agregarResultado("Moreno Perez", "1-2", "Bautista Coria", "FASE DE GRUPOS COPA TOTAL T19");
agregarResultado("Bautista Coria", "2-1", "Moreno Perez", "FASE DE GRUPOS COPA TOTAL T19");
agregarResultado("Nico Avalos", "6-0", "Antonella Lopez", "FASE DE GRUPOS COPA TOTAL T19");
agregarResultado("Antonella Lopez", "0-6", "Nico Avalos", "FASE DE GRUPOS COPA TOTAL T19");
agregarResultado("Eze", "4-0", "Facundo Marchese", "FASE DE GRUPOS COPA TOTAL T19");
agregarResultado("Facundo Marchese", "0-4", "Eze", "FASE DE GRUPOS COPA TOTAL T19");
agregarResultado("Facundo Marchese", "0-0", "Antonella Lopez", "FASE DE GRUPOS COPA TOTAL T19");
agregarResultado("Antonella Lopez", "0-0", "Facundo Marchese", "FASE DE GRUPOS COPA TOTAL T19");
agregarResultado("Nico Avalos", "3-4", "Eze", "FASE DE GRUPOS COPA TOTAL T19");
agregarResultado("Eze", "4-3", "Nico Avalos", "FASE DE GRUPOS COPA TOTAL T19");
agregarResultado("Pollo", "2-0", "Nico Luchetti (C)", "FASE DE GRUPOS COPA TOTAL T19");
agregarResultado("Nico Luchetti (C)", "0-2", "Pollo", "FASE DE GRUPOS COPA TOTAL T19");
agregarResultado("Joaco Fernandez", "2-3", "Rodrigo Talarico", "FASE DE GRUPOS COPA TOTAL T19");
agregarResultado("Rodrigo Talarico", "3-2", "Joaco Fernandez", "FASE DE GRUPOS COPA TOTAL T19");
agregarResultado("Rodrigo Talarico", "3-0", "Nico Luchetti (C)", "FASE DE GRUPOS COPA TOTAL T19");
agregarResultado("Nico Luchetti (C)", "0-3", "Rodrigo Talarico", "FASE DE GRUPOS COPA TOTAL T19");
agregarResultado("Pollo", "1-2", "Joaco Fernandez", "FASE DE GRUPOS COPA TOTAL T19");
agregarResultado("Joaco Fernandez", "2-1", "Pollo", "FASE DE GRUPOS COPA TOTAL T19");
agregarResultado("Joaquin Sampadaro", "2-5", "Ian Gangai", "FASE DE GRUPOS COPA TOTAL T19");
agregarResultado("Ian Gangai", "5-2", "Joaquin Sampadaro", "FASE DE GRUPOS COPA TOTAL T19");
agregarResultado("Mario Talarico", "2-4", "Kevin Sivori", "FASE DE GRUPOS COPA TOTAL T19");
agregarResultado("Kevin Sivori", "4-2", "Mario Talarico", "FASE DE GRUPOS COPA TOTAL T19");
agregarResultado("Ian Gangai", "2-5", "Rodri Sebastian", "FASE DE GRUPOS COPA TOTAL T19");
agregarResultado("Rodri Sebastian", "5-2", "Ian Gangai", "FASE DE GRUPOS COPA TOTAL T19");
agregarResultado("Joaquin Sampadaro", "2-2", "Mario Talarico", "FASE DE GRUPOS COPA TOTAL T19");
agregarResultado("Mario Talarico", "2-2", "Joaquin Sampadaro", "FASE DE GRUPOS COPA TOTAL T19");
agregarResultado("Yago", "3-1", "Dani Bazan", "FASE DE GRUPOS COPA TOTAL T19");
agregarResultado("Dani Bazan", "1-3", "Yago", "FASE DE GRUPOS COPA TOTAL T19");
agregarResultado("Ignacio Cejas", "1-2", "Cami", "FASE DE GRUPOS COPA TOTAL T19");
agregarResultado("Cami", "2-1", "Ignacio Cejas", "FASE DE GRUPOS COPA TOTAL T19");
agregarResultado("Dani Bazan", "0-0", "Cami", "FASE DE GRUPOS COPA TOTAL T19");
agregarResultado("Cami", "0-0", "Dani Bazan", "FASE DE GRUPOS COPA TOTAL T19");
agregarResultado("Ignacio Cejas", "0-0", "Yago", "FASE DE GRUPOS COPA TOTAL T19");
agregarResultado("Yago", "0-0", "Ignacio Cejas", "FASE DE GRUPOS COPA TOTAL T19");
agregarResultado("Joel Alcalde", "4-3", "Felipe Galante", "FASE DE GRUPOS COPA TOTAL T19");
agregarResultado("Felipe Galante", "3-4", "Joel Alcalde", "FASE DE GRUPOS COPA TOTAL T19");
agregarResultado("Renzo Badano", "6-3", "Fabrizio Escolano", "FASE DE GRUPOS COPA TOTAL T19");
agregarResultado("Fabrizio Escolano", "3-6", "Renzo Badano", "FASE DE GRUPOS COPA TOTAL T19");
agregarResultado("Felipe Galante", "1-0", "Fabrizio Escolano", "FASE DE GRUPOS COPA TOTAL T19");
agregarResultado("Fabrizio Escolano", "0-1", "Felipe Galante", "FASE DE GRUPOS COPA TOTAL T19");
agregarResultado("Renzo Badano", "0-0", "Joel Alcalde", "FASE DE GRUPOS COPA TOTAL T19");
agregarResultado("Joel Alcalde", "0-0", "Renzo Badano", "FASE DE GRUPOS COPA TOTAL T19");
agregarResultado("Benja", "1-3", "Joel Marasco", "FASE DE GRUPOS COPA TOTAL T19");
agregarResultado("Joel Marasco", "3-1", "Benja", "FASE DE GRUPOS COPA TOTAL T19");
agregarResultado("Tomas Delgado", "1-4", "Rodrigo Soca", "FASE DE GRUPOS COPA TOTAL T19");
agregarResultado("Rodrigo Soca", "4-1", "Tomas Delgado", "FASE DE GRUPOS COPA TOTAL T19");
agregarResultado("Joel Marasco", "0-0", "Rodrigo Soca", "FASE DE GRUPOS COPA TOTAL T19");
agregarResultado("Rodrigo Soca", "0-0", "Joel Marasco", "FASE DE GRUPOS COPA TOTAL T19");
agregarResultado("Tomas Delgado", "0-0", "Benja", "FASE DE GRUPOS COPA TOTAL T19");
agregarResultado("Benja", "0-0", "Tomas Delgado", "FASE DE GRUPOS COPA TOTAL T19");
agregarResultado("Nacho Soto", "5-0", "Anubis", "FASE DE GRUPOS COPA TOTAL T19");
agregarResultado("Anubis", "0-5", "Nacho Soto", "FASE DE GRUPOS COPA TOTAL T19");
agregarResultado("Gabriel Talarico", "1-3", "Bruno Alonso", "FASE DE GRUPOS COPA TOTAL T19");
agregarResultado("Bruno Alonso", "3-1", "Gabriel Talarico", "FASE DE GRUPOS COPA TOTAL T19");
agregarResultado("Anubis", "0-0", "Bruno Alonso", "FASE DE GRUPOS COPA TOTAL T19");
agregarResultado("Bruno Alonso", "0-0", "Anubis", "FASE DE GRUPOS COPA TOTAL T19");
agregarResultado("Gabriel Talarico", "1-0", "Nacho Soto", "FASE DE GRUPOS COPA TOTAL T19");
agregarResultado("Nacho Soto", "0-1", "Gabriel Talarico", "FASE DE GRUPOS COPA TOTAL T19");
agregarResultado("Matheo Olivera", "0-1", "Azul Quispe", "FASE DE GRUPOS COPA TOTAL T19");
agregarResultado("Azul Quispe", "1-0", "Matheo Olivera", "FASE DE GRUPOS COPA TOTAL T19");
agregarResultado("Lucas Aguilera", "3-1", "Pancho Muzzio", "FASE DE GRUPOS COPA TOTAL T19");
agregarResultado("Pancho Muzzio", "1-3", "Lucas Aguilera", "FASE DE GRUPOS COPA TOTAL T19");
agregarResultado("Azul Quispe", "0-0", "Pancho Muzzio", "FASE DE GRUPOS COPA TOTAL T19");
agregarResultado("Pancho Muzzio", "0-0", "Azul Quispe", "FASE DE GRUPOS COPA TOTAL T19");
agregarResultado("Lucas Aguilera", "1-0", "Matheo Olivera", "FASE DE GRUPOS COPA TOTAL T19");
agregarResultado("Matheo Olivera", "0-1", "Lucas Aguilera", "FASE DE GRUPOS COPA TOTAL T19");
agregarResultado("Jhose", "1-0", "Santi", "FASE DE GRUPOS COPA TOTAL T19");
agregarResultado("Santi", "0-1", "Jhose", "FASE DE GRUPOS COPA TOTAL T19");
agregarResultado("Lucas Insua", "1-1", "Tomas Torcasio", "FASE DE GRUPOS COPA TOTAL T19");
agregarResultado("Tomas Torcasio", "1-1", "Lucas Insua", "FASE DE GRUPOS COPA TOTAL T19");
agregarResultado("Santi", "0-0", "Tomas Torcasio", "FASE DE GRUPOS COPA TOTAL T19");
agregarResultado("Tomas Torcasio", "0-0", "Santi", "FASE DE GRUPOS COPA TOTAL T19");
agregarResultado("Lucas Insua", "0-1", "Jhose", "FASE DE GRUPOS COPA TOTAL T19");
agregarResultado("Jhose", "1-0", "Lucas Insua", "FASE DE GRUPOS COPA TOTAL T19");
agregarResultado("Bautista Coria", "0-0", "Nico Luchetti (R)", "FASE DE GRUPOS COPA TOTAL T19");
agregarResultado("Nico Luchetti (R)", "0-0", "Bautista Coria", "FASE DE GRUPOS COPA TOTAL T19");
agregarResultado("Luciano Hufschmid", "1-1", "Moreno Perez", "FASE DE GRUPOS COPA TOTAL T19");
agregarResultado("Moreno Perez", "1-1", "Luciano Hufschmid", "FASE DE GRUPOS COPA TOTAL T19");
agregarResultado("Nico Luchetti (R)", "0-0", "Moreno Perez", "FASE DE GRUPOS COPA TOTAL T19");
agregarResultado("Moreno Perez", "0-0", "Nico Luchetti (R)", "FASE DE GRUPOS COPA TOTAL T19");
agregarResultado("Luciano Hufschmid", "0-0", "Bautista Coria", "FASE DE GRUPOS COPA TOTAL T19");
agregarResultado("Bautista Coria", "0-0", "Luciano Hufschmid", "FASE DE GRUPOS COPA TOTAL T19");
agregarResultado("Eze", "6-0", "Antonella Lopez", "FASE DE GRUPOS COPA TOTAL T19");
agregarResultado("Antonella Lopez", "0-6", "Eze", "FASE DE GRUPOS COPA TOTAL T19");
agregarResultado("Facundo Marchese", "0-0", "Nico Avalos", "FASE DE GRUPOS COPA TOTAL T19");
agregarResultado("Nico Avalos", "0-0", "Facundo Marchese", "FASE DE GRUPOS COPA TOTAL T19");
agregarResultado("Antonella Lopez", "1-1", "Nico Avalos", "FASE DE GRUPOS COPA TOTAL T19");
agregarResultado("Nico Avalos", "1-1", "Antonella Lopez", "FASE DE GRUPOS COPA TOTAL T19");
agregarResultado("Facundo Marchese", "0-0", "Eze", "FASE DE GRUPOS COPA TOTAL T19");
agregarResultado("Eze", "0-0", "Facundo Marchese", "FASE DE GRUPOS COPA TOTAL T19");
agregarResultado("Joaco Fernandez", "3-0", "Nico Luchetti (C)", "FASE DE GRUPOS COPA TOTAL T19");
agregarResultado("Nico Luchetti (C)", "0-3", "Joaco Fernandez", "FASE DE GRUPOS COPA TOTAL T19");
agregarResultado("Rodrigo Talarico", "2-1", "Pollo", "FASE DE GRUPOS COPA TOTAL T19");
agregarResultado("Pollo", "1-2", "Rodrigo Talarico", "FASE DE GRUPOS COPA TOTAL T19");
agregarResultado("Nico Luchetti (C)", "0-0", "Pollo", "FASE DE GRUPOS COPA TOTAL T19");
agregarResultado("Pollo", "0-0", "Nico Luchetti (C)", "FASE DE GRUPOS COPA TOTAL T19");
agregarResultado("Rodrigo Talarico", "1-1", "Joaco Fernandez", "FASE DE GRUPOS COPA TOTAL T19");
agregarResultado("Joaco Fernandez", "1-1", "Rodrigo Talarico", "FASE DE GRUPOS COPA TOTAL T19");
agregarResultado("Kevin Sivori", "2-3", "Rodri Sebastian", "FASE DE GRUPOS COPA TOTAL T19");
agregarResultado("Rodri Sebastian", "3-2", "Kevin Sivori", "FASE DE GRUPOS COPA TOTAL T19");
agregarResultado("Ian Gangai", "1-1", "Mario Talarico", "FASE DE GRUPOS COPA TOTAL T19");
agregarResultado("Mario Talarico", "1-1", "Ian Gangai", "FASE DE GRUPOS COPA TOTAL T19");
agregarResultado("Mario Talarico", "0-0", "Rodri Sebastian", "FASE DE GRUPOS COPA TOTAL T19");
agregarResultado("Rodri Sebastian", "0-0", "Mario Talarico", "FASE DE GRUPOS COPA TOTAL T19");
agregarResultado("Kevin Sivori", "0-0", "Joaquin Sampadaro", "FASE DE GRUPOS COPA TOTAL T19");
agregarResultado("Joaquin Sampadaro", "0-0", "Kevin Sivori", "FASE DE GRUPOS COPA TOTAL T19");
agregarResultado("Dani Bazan", "0-6", "Ignacio Cejas", "FASE DE GRUPOS COPA TOTAL T19");
agregarResultado("Ignacio Cejas", "6-0", "Dani Bazan", "FASE DE GRUPOS COPA TOTAL T19");
agregarResultado("Yago", "6-3", "Cami", "FASE DE GRUPOS COPA TOTAL T19");
agregarResultado("Cami", "3-6", "Yago", "FASE DE GRUPOS COPA TOTAL T19");
agregarResultado("Dani Bazan", "0-3", "Yago", "FASE DE GRUPOS COPA TOTAL T19");
agregarResultado("Yago", "3-0", "Dani Bazan", "FASE DE GRUPOS COPA TOTAL T19");
agregarResultado("Cami", "2-1", "Ignacio Cejas", "FASE DE GRUPOS COPA TOTAL T19");
agregarResultado("Ignacio Cejas", "1-2", "Cami", "FASE DE GRUPOS COPA TOTAL T19");
agregarResultado("Felipe Galante", "1-3", "Renzo Badano", "FASE DE GRUPOS COPA TOTAL T19");
agregarResultado("Renzo Badano", "3-1", "Felipe Galante", "FASE DE GRUPOS COPA TOTAL T19");
agregarResultado("Joel Alcalde", "2-5", "Fabrizio Escolano", "FASE DE GRUPOS COPA TOTAL T19");
agregarResultado("Fabrizio Escolano", "5-2", "Joel Alcalde", "FASE DE GRUPOS COPA TOTAL T19");
agregarResultado("Felipe Galante", "3-4", "Joel Alcalde", "FASE DE GRUPOS COPA TOTAL T19");
agregarResultado("Joel Alcalde", "4-3", "Felipe Galante", "FASE DE GRUPOS COPA TOTAL T19");
agregarResultado("Fabrizio Escolano", "7-2", "Renzo Badano", "FASE DE GRUPOS COPA TOTAL T19");
agregarResultado("Renzo Badano", "2-7", "Fabrizio Escolano", "FASE DE GRUPOS COPA TOTAL T19");
agregarResultado("Joel Marasco", "3-0", "Tomas Delgado", "FASE DE GRUPOS COPA TOTAL T19");
agregarResultado("Tomas Delgado", "0-3", "Joel Marasco", "FASE DE GRUPOS COPA TOTAL T19");
agregarResultado("Benja", "3-6", "Rodrigo Soca", "FASE DE GRUPOS COPA TOTAL T19");
agregarResultado("Rodrigo Soca", "6-3", "Benja", "FASE DE GRUPOS COPA TOTAL T19");
agregarResultado("Joel Marasco", "4-3", "Benja", "FASE DE GRUPOS COPA TOTAL T19");
agregarResultado("Benja", "3-4", "Joel Marasco", "FASE DE GRUPOS COPA TOTAL T19");
agregarResultado("Rodrigo Soca", "2-1", "Tomas Delgado", "FASE DE GRUPOS COPA TOTAL T19");
agregarResultado("Tomas Delgado", "1-2", "Rodrigo Soca", "FASE DE GRUPOS COPA TOTAL T19");
agregarResultado("Anubis", "0-8", "Gabriel Talarico", "FASE DE GRUPOS COPA TOTAL T19");
agregarResultado("Gabriel Talarico", "8-0", "Anubis", "FASE DE GRUPOS COPA TOTAL T19");
agregarResultado("Nacho Soto", "3-3", "Bruno Alonso", "FASE DE GRUPOS COPA TOTAL T19");
agregarResultado("Bruno Alonso", "3-3", "Nacho Soto", "FASE DE GRUPOS COPA TOTAL T19");
agregarResultado("Anubis", "0-3", "Nacho Soto", "FASE DE GRUPOS COPA TOTAL T19");
agregarResultado("Nacho Soto", "3-0", "Anubis", "FASE DE GRUPOS COPA TOTAL T19");
agregarResultado("Bruno Alonso", "1-7", "Gabriel Talarico", "FASE DE GRUPOS COPA TOTAL T19");
agregarResultado("Gabriel Talarico", "7-1", "Bruno Alonso", "FASE DE GRUPOS COPA TOTAL T19");
agregarResultado("Azul Quispe", "4-7", "Lucas Aguilera", "FASE DE GRUPOS COPA TOTAL T19");
agregarResultado("Lucas Aguilera", "7-4", "Azul Quispe", "FASE DE GRUPOS COPA TOTAL T19");
agregarResultado("Matheo Olivera", "4-2", "Pancho Muzzio", "FASE DE GRUPOS COPA TOTAL T19");
agregarResultado("Pancho Muzzio", "2-4", "Matheo Olivera", "FASE DE GRUPOS COPA TOTAL T19");
agregarResultado("Azul Quispe", "2-1", "Matheo Olivera", "FASE DE GRUPOS COPA TOTAL T19");
agregarResultado("Matheo Olivera", "1-2", "Azul Quispe", "FASE DE GRUPOS COPA TOTAL T19");
agregarResultado("Pancho Muzzio", "1-4", "Lucas Aguilera", "FASE DE GRUPOS COPA TOTAL T19");
agregarResultado("Lucas Aguilera", "4-1", "Pancho Muzzio", "FASE DE GRUPOS COPA TOTAL T19");
agregarResultado("Santi", "0-4", "Lucas Insua", "FASE DE GRUPOS COPA TOTAL T19");
agregarResultado("Lucas Insua", "4-0", "Santi", "FASE DE GRUPOS COPA TOTAL T19");
agregarResultado("Jhose", "9-3", "Tomas Torcasio", "FASE DE GRUPOS COPA TOTAL T19");
agregarResultado("Tomas Torcasio", "3-9", "Jhose", "FASE DE GRUPOS COPA TOTAL T19");
agregarResultado("Santi", "1-4", "Jhose", "FASE DE GRUPOS COPA TOTAL T19");
agregarResultado("Jhose", "4-1", "Santi", "FASE DE GRUPOS COPA TOTAL T19");
agregarResultado("Tomas Torcasio", "5-7", "Lucas Insua", "FASE DE GRUPOS COPA TOTAL T19");
agregarResultado("Lucas Insua", "7-5", "Tomas Torcasio", "FASE DE GRUPOS COPA TOTAL T19");
agregarResultado("Nico Luchetti (R)", "0-1", "Luciano Hufschmid", "FASE DE GRUPOS COPA TOTAL T19");
agregarResultado("Luciano Hufschmid", "1-0", "Nico Luchetti (R)", "FASE DE GRUPOS COPA TOTAL T19");
agregarResultado("Bautista Coria", "0-7", "Moreno Perez", "FASE DE GRUPOS COPA TOTAL T19");
agregarResultado("Moreno Perez", "7-0", "Bautista Coria", "FASE DE GRUPOS COPA TOTAL T19");
agregarResultado("Nico Luchetti (R)", "0-0", "Bautista Coria", "FASE DE GRUPOS COPA TOTAL T19");
agregarResultado("Bautista Coria", "0-0", "Nico Luchetti (R)", "FASE DE GRUPOS COPA TOTAL T19");
agregarResultado("Moreno Perez", "0-1", "Luciano Hufschmid", "FASE DE GRUPOS COPA TOTAL T19");
agregarResultado("Luciano Hufschmid", "1-0", "Moreno Perez", "FASE DE GRUPOS COPA TOTAL T19");
agregarResultado("Antonella Lopez", "5-0", "Facundo Marchese", "FASE DE GRUPOS COPA TOTAL T19");
agregarResultado("Facundo Marchese", "0-5", "Antonella Lopez", "FASE DE GRUPOS COPA TOTAL T19");
agregarResultado("Eze", "3-4", "Nico Avalos", "FASE DE GRUPOS COPA TOTAL T19");
agregarResultado("Nico Avalos", "4-3", "Eze", "FASE DE GRUPOS COPA TOTAL T19");
agregarResultado("Antonella Lopez", "1-4", "Eze", "FASE DE GRUPOS COPA TOTAL T19");
agregarResultado("Eze", "4-1", "Antonella Lopez", "FASE DE GRUPOS COPA TOTAL T19");
agregarResultado("Nico Avalos", "1-0", "Facundo Marchese", "FASE DE GRUPOS COPA TOTAL T19");
agregarResultado("Facundo Marchese", "0-1", "Nico Avalos", "FASE DE GRUPOS COPA TOTAL T19");
agregarResultado("Nico Luchetti (C)", "0-2", "Rodrigo Talarico", "FASE DE GRUPOS COPA TOTAL T19");
agregarResultado("Rodrigo Talarico", "2-0", "Nico Luchetti (C)", "FASE DE GRUPOS COPA TOTAL T19");
agregarResultado("Joaco Fernandez", "1-4", "Pollo", "FASE DE GRUPOS COPA TOTAL T19");
agregarResultado("Pollo", "4-1", "Joaco Fernandez", "FASE DE GRUPOS COPA TOTAL T19");
agregarResultado("Nico Luchetti (C)", "0-1", "Joaco Fernandez", "FASE DE GRUPOS COPA TOTAL T19");
agregarResultado("Joaco Fernandez", "1-0", "Nico Luchetti (C)", "FASE DE GRUPOS COPA TOTAL T19");
agregarResultado("Pollo", "2-1", "Rodrigo Talarico", "FASE DE GRUPOS COPA TOTAL T19");
agregarResultado("Rodrigo Talarico", "1-2", "Pollo", "FASE DE GRUPOS COPA TOTAL T19");
agregarResultado("Joaquin Sampadaro", "8-4", "Rodri Sebastian", "FASE DE GRUPOS COPA TOTAL T19");
agregarResultado("Rodri Sebastian", "4-8", "Joaquin Sampadaro", "FASE DE GRUPOS COPA TOTAL T19");
agregarResultado("Kevin Sivori", "6-1", "Ian Gangai", "FASE DE GRUPOS COPA TOTAL T19");
agregarResultado("Ian Gangai", "1-6", "Kevin Sivori", "FASE DE GRUPOS COPA TOTAL T19");
agregarResultado("Rodrigo Soca", "7-7", "Rodrigo Talarico", "OCTAVOS DE FINAL COPA TOTAL T19");
agregarResultado("Rodrigo Talarico", "7-7", "Rodrigo Soca", "OCTAVOS DE FINAL COPA TOTAL T19");
agregarResultado("Azul Quispe", "7-6", "Nico Avalos", "OCTAVOS DE FINAL COPA TOTAL T19");
agregarResultado("Nico Avalos", "6-7", "Azul Quispe", "OCTAVOS DE FINAL COPA TOTAL T19");
agregarResultado("Lucas Aguilera", "11-4", "Rodri Sebastian", "OCTAVOS DE FINAL COPA TOTAL T19");
agregarResultado("Rodri Sebastian", "4-11", "Lucas Aguilera", "OCTAVOS DE FINAL COPA TOTAL T19");
agregarResultado("Joel Marasco", "8-7", "Gabriel Talarico", "OCTAVOS DE FINAL COPA TOTAL T19");
agregarResultado("Gabriel Talarico", "7-8", "Joel Marasco", "OCTAVOS DE FINAL COPA TOTAL T19");
agregarResultado("Pollo", "5-7", "Luciano Hufschmid", "OCTAVOS DE FINAL COPA TOTAL T19");
agregarResultado("Luciano Hufschmid", "7-5", "Pollo", "OCTAVOS DE FINAL COPA TOTAL T19");
agregarResultado("Eze", "3-11", "Jhose", "OCTAVOS DE FINAL COPA TOTAL T19");
agregarResultado("Jhose", "11-3", "Eze", "OCTAVOS DE FINAL COPA TOTAL T19");
agregarResultado("Lucas Insua", "6-9", "Renzo Badano", "OCTAVOS DE FINAL COPA TOTAL T19");
agregarResultado("Renzo Badano", "9-6", "Lucas Insua", "OCTAVOS DE FINAL COPA TOTAL T19");
agregarResultado("Yago", "6-6", "Kevin Sivori", "OCTAVOS DE FINAL COPA TOTAL T19");
agregarResultado("Kevin Sivori", "6-6", "Yago", "OCTAVOS DE FINAL COPA TOTAL T19");
agregarResultado("Rodrigo Soca", "8-9", "Rodrigo Talarico", "DESEMPATE OCTAVOS DE FINAL COPA TOTAL T19");
agregarResultado("Rodrigo Talarico", "9-8", "Rodrigo Soca", "DESEMPATE OCTAVOS DE FINAL COPA TOTAL T19");
agregarResultado("Yago", "8-10", "Kevin Sivori", "DESEMPATE OCTAVOS DE FINAL COPA TOTAL T19");
agregarResultado("Kevin Sivori", "10-8", "Yago", "DESEMPATE OCTAVOS DE FINAL COPA TOTAL T19");
agregarResultado("Lucas Aguilera", "8-6", "Renzo Badano", "CUARTOS DE FINAL COPA TOTAL T19");
agregarResultado("Renzo Badano", "6-8", "Lucas Aguilera", "CUARTOS DE FINAL COPA TOTAL T19");
agregarResultado("Joel Marasco", "6-11", "Luciano Hufschmid", "CUARTOS DE FINAL COPA TOTAL T19");
agregarResultado("Luciano Hufschmid", "11-6", "Joel Marasco", "CUARTOS DE FINAL COPA TOTAL T19");
agregarResultado("Azul Quispe", "10-7", "Rodrigo Talarico", "CUARTOS DE FINAL COPA TOTAL T19");
agregarResultado("Rodrigo Talarico", "7-10", "Azul Quispe", "CUARTOS DE FINAL COPA TOTAL T19");
agregarResultado("Kevin Sivori", "7-10", "Jhose", "CUARTOS DE FINAL COPA TOTAL T19");
agregarResultado("Jhose", "10-7", "Kevin Sivori", "CUARTOS DE FINAL COPA TOTAL T19");
agregarResultado("Azul Quispe", "12-18", "Jhose", "SEMIFINAL COPA TOTAL T19");
agregarResultado("Jhose", "18-12", "Azul Quispe", "SEMIFINAL COPA TOTAL T19");
agregarResultado("Lucas Aguilera", "17-18", "Luciano Hufschmid", "SEMIFINAL COPA TOTAL T19");
agregarResultado("Luciano Hufschmid", "18-17", "Lucas Aguilera", "SEMIFINAL COPA TOTAL T19");
agregarResultado("Jhose", "7-14", "Luciano Hufschmid", "FINAL COPA TOTAL T19");
agregarResultado("Luciano Hufschmid", "14-7", "Jhose", "FINAL COPA TOTAL T19");
agregarResultado("Lucas Insua", "9-6", "Moreno Perez", "64AVOS DE FINAL COPA CAMPEONES T19");
agregarResultado("Moreno Perez", "6-9", "Lucas Insua", "64AVOS DE FINAL COPA CAMPEONES T19");
agregarResultado("Lucas Insua", "11-8", "Tomas Torcasio", "32AVOS DE FINAL COPA CAMPEONES T19");
agregarResultado("Tomas Torcasio", "8-11", "Lucas Insua", "32AVOS DE FINAL COPA CAMPEONES T19");
agregarResultado("Tomas Delgado", "1-6", "Pollo", "32AVOS DE FINAL COPA CAMPEONES T19");
agregarResultado("Pollo", "6-1", "Tomas Delgado", "32AVOS DE FINAL COPA CAMPEONES T19");
agregarResultado("Bautista Coria", "0-12", "Fabrizio Escolano", "32AVOS DE FINAL COPA CAMPEONES T19");
agregarResultado("Fabrizio Escolano", "12-0", "Bautista Coria", "32AVOS DE FINAL COPA CAMPEONES T19");
agregarResultado("Lucas Insua", "6-7", "Rodrigo Soca", "16AVOS DE FINAL COPA CAMPEONES T19");
agregarResultado("Rodrigo Soca", "7-6", "Lucas Insua", "16AVOS DE FINAL COPA CAMPEONES T19");
agregarResultado("Pollo", "5-6", "Fabrizio Escolano", "16AVOS DE FINAL COPA CAMPEONES T19");
agregarResultado("Fabrizio Escolano", "6-5", "Pollo", "16AVOS DE FINAL COPA CAMPEONES T19");
agregarResultado("Rodrigo Soca", "16-7", "Yago", "OCTAVOS DE FINAL COPA CAMPEONES T19");
agregarResultado("Yago", "7-16", "Rodrigo Soca", "OCTAVOS DE FINAL COPA CAMPEONES T19");
agregarResultado("Fabrizio Escolano", "13-6", "Mario Talarico", "OCTAVOS DE FINAL COPA CAMPEONES T19");
agregarResultado("Mario Talarico", "6-13", "Fabrizio Escolano", "OCTAVOS DE FINAL COPA CAMPEONES T19");
agregarResultado("Bruno Alonso", "7-5", "Gabriel Talarico", "OCTAVOS DE FINAL COPA CAMPEONES T19");
agregarResultado("Gabriel Talarico", "5-7", "Bruno Alonso", "OCTAVOS DE FINAL COPA CAMPEONES T19");
agregarResultado("Rodrigo Soca", "12-17", "Nico Avalos", "CUARTOS DE FINAL COPA CAMPEONES T19");
agregarResultado("Nico Avalos", "17-12", "Rodrigo Soca", "CUARTOS DE FINAL COPA CAMPEONES T19");
agregarResultado("Fabrizio Escolano", "8-18", "Bruno Alonso", "CUARTOS DE FINAL COPA CAMPEONES T19");
agregarResultado("Bruno Alonso", "18-8", "Fabrizio Escolano", "CUARTOS DE FINAL COPA CAMPEONES T19");
agregarResultado("Nico Avalos", "9-4", "Cami", "SEMIFINAL COPA CAMPEONES T19");
agregarResultado("Cami", "4-9", "Nico Avalos", "SEMIFINAL COPA CAMPEONES T19");
agregarResultado("Bruno Alonso", "7-9", "Ian Gangai", "SEMIFINAL COPA CAMPEONES T19");
agregarResultado("Ian Gangai", "9-7", "Bruno Alonso", "SEMIFINAL COPA CAMPEONES T19");
agregarResultado("Nico Avalos", "8-11", "Ian Gangai", "FINAL COPA CAMPEONES T19");
agregarResultado("Ian Gangai", "11-8", "Nico Avalos", "FINAL COPA CAMPEONES T19");
agregarResultado("Eze", "27-35", "Bruno Alonso", "SEMIFINAL COPA DUOS T19");
agregarResultado("Bruno Alonso", "35-27", "Eze", "SEMIFINAL COPA DUOS T19");
agregarResultado("Joaco Fernandez", "27-35", "Lucas Aguilera", "SEMIFINAL COPA DUOS T19");
agregarResultado("Lucas Aguilera", "35-27", "Joaco Fernandez", "SEMIFINAL COPA DUOS T19");
agregarResultado("Lucas Insua", "27-24", "Joaquin Sampadaro", "SEMIFINAL COPA DUOS T19");
agregarResultado("Joaquin Sampadaro", "24-27", "Lucas Insua", "SEMIFINAL COPA DUOS T19");
agregarResultado("Ian Gangai", "27-24", "Joel Alcalde", "SEMIFINAL COPA DUOS T19");
agregarResultado("Joel Alcalde", "24-27", "Ian Gangai", "SEMIFINAL COPA DUOS T19");
agregarResultado("Eze", "27-35", "Lucas Aguilera", "SEMIFINAL COPA DUOS T19");
agregarResultado("Lucas Aguilera", "35-27", "Eze", "SEMIFINAL COPA DUOS T19");
agregarResultado("Joaco Fernandez", "27-35", "Bruno Alonso", "SEMIFINAL COPA DUOS T19");
agregarResultado("Bruno Alonso", "35-27", "Joaco Fernandez", "SEMIFINAL COPA DUOS T19");
agregarResultado("Lucas Insua", "27-24", "Joel Alcalde", "SEMIFINAL COPA DUOS T19");
agregarResultado("Joel Alcalde", "24-27", "Lucas Insua", "SEMIFINAL COPA DUOS T19");
agregarResultado("Ian Gangai", "27-24", "Joaquin Sampadaro", "SEMIFINAL COPA DUOS T19");
agregarResultado("Joaquin Sampadaro", "24-27", "Ian Gangai", "SEMIFINAL COPA DUOS T19");
agregarResultado("Bruno Alonso", "14-20", "Lucas Insua", "FINAL COPA DUOS T19");
agregarResultado("Lucas Insua", "20-14", "Bruno Alonso", "FINAL COPA DUOS T19");
agregarResultado("Lucas Aguilera", "14-20", "Ian Gangai", "FINAL COPA DUOS T19");
agregarResultado("Ian Gangai", "20-14", "Lucas Aguilera", "FINAL COPA DUOS T19");
agregarResultado("Bruno Alonso", "14-20", "Ian Gangai", "FINAL COPA DUOS T19");
agregarResultado("Ian Gangai", "20-14", "Bruno Alonso", "FINAL COPA DUOS T19");
agregarResultado("Lucas Aguilera", "14-20", "Lucas Insua", "FINAL COPA DUOS T19");
agregarResultado("Lucas Insua", "20-14", "Lucas Aguilera", "FINAL COPA DUOS T19");
agregarResultado("Yago", "14-11", "Felipe Galante", "PROMOCIONES T19");
agregarResultado("Felipe Galante", "11-14", "Yago", "PROMOCIONES T19");
agregarResultado("Gabriel Talarico", "7-5", "Joaquin Sampadaro", "PROMOCIONES T19");
agregarResultado("Joaquin Sampadaro", "5-7", "Gabriel Talarico", "PROMOCIONES T19");
agregarResultado("Lucas Aguilera", "14-0", "Rodrigo Soca", "DESAFIO DE CAMPEONES T19");
agregarResultado("Rodrigo Soca", "0-14", "Lucas Aguilera", "DESAFIO DE CAMPEONES T19");
agregarResultado("Benja", "12-0", "Dani Bazan", "OCTAVOS DE FINAL COPA B T20");
agregarResultado("Dani Bazan", "0-12", "Benja", "OCTAVOS DE FINAL COPA B T20");
agregarResultado("Anubis", "0-11", "Ciro Guarch", "OCTAVOS DE FINAL COPA B T20");
agregarResultado("Ciro Guarch", "11-0", "Anubis", "OCTAVOS DE FINAL COPA B T20");
agregarResultado("Rodri Sebastian", "7-8", "Rodrigo Talarico", "OCTAVOS DE FINAL COPA B T20");
agregarResultado("Rodrigo Talarico", "8-7", "Rodri Sebastian", "OCTAVOS DE FINAL COPA B T20");
agregarResultado("Ignacio Cejas", "7-6", "Felipe Galante", "OCTAVOS DE FINAL COPA B T20");
agregarResultado("Felipe Galante", "6-7", "Ignacio Cejas", "OCTAVOS DE FINAL COPA B T20");
agregarResultado("Mario Talarico", "8-6", "Benja", "CUARTOS DE FINAL COPA B T20");
agregarResultado("Benja", "6-8", "Mario Talarico", "CUARTOS DE FINAL COPA B T20");
agregarResultado("Joaco Fernandez", "7-8", "Ciro Guarch", "CUARTOS DE FINAL COPA B T20");
agregarResultado("Ciro Guarch", "8-7", "Joaco Fernandez", "CUARTOS DE FINAL COPA B T20");
agregarResultado("Manu Solbes", "10-12", "Rodrigo Talarico", "CUARTOS DE FINAL COPA B T20");
agregarResultado("Rodrigo Talarico", "12-10", "Manu Solbes", "CUARTOS DE FINAL COPA B T20");
agregarResultado("Cristian Hantis", "7-7", "Ignacio Cejas", "CUARTOS DE FINAL COPA B T20");
agregarResultado("Ignacio Cejas", "7-7", "Cristian Hantis", "CUARTOS DE FINAL COPA B T20");
agregarResultado("Cristian Hantis", "9-8", "Ignacio Cejas", "DESEMPATE CUARTOS DE FINAL COPA B T20");
agregarResultado("Ignacio Cejas", "8-9", "Cristian Hantis", "DESEMPATE CUARTOS DE FINAL COPA B T20");
agregarResultado("Ciro Guarch", "9-6", "Cristian Hantis", "SEMIFINAL COPA B T20");
agregarResultado("Cristian Hantis", "6-9", "Ciro Guarch", "SEMIFINAL COPA B T20");
agregarResultado("Rodrigo Talarico", "10-11", "Mario Talarico", "SEMIFINAL COPA B T20");
agregarResultado("Mario Talarico", "11-10", "Rodrigo Talarico", "SEMIFINAL COPA B T20");
agregarResultado("Luciano Hufschmid", "15-10", "Pollo", "OCTAVOS DE FINAL COPA A T20");
agregarResultado("Pollo", "10-15", "Luciano Hufschmid", "OCTAVOS DE FINAL COPA A T20");
agregarResultado("Jhose", "9-13", "Fabrizio Escolano", "OCTAVOS DE FINAL COPA A T20");
agregarResultado("Fabrizio Escolano", "13-9", "Jhose", "OCTAVOS DE FINAL COPA A T20");
agregarResultado("Lucas Aguilera", "11-13", "Nico Avalos", "OCTAVOS DE FINAL COPA A T20");
agregarResultado("Nico Avalos", "13-11", "Lucas Aguilera", "OCTAVOS DE FINAL COPA A T20");
agregarResultado("Tomas Delgado", "13-15", "Rodrigo Soca", "OCTAVOS DE FINAL COPA A T20");
agregarResultado("Rodrigo Soca", "15-13", "Tomas Delgado", "OCTAVOS DE FINAL COPA A T20");
agregarResultado("Gabriel Talarico", "6-8", "Luciano Hufschmid", "CUARTOS DE FINAL COPA A T20");
agregarResultado("Luciano Hufschmid", "8-6", "Gabriel Talarico", "CUARTOS DE FINAL COPA A T20");
agregarResultado("Ian Gangai", "9-9", "Fabrizio Escolano", "CUARTOS DE FINAL COPA A T20");
agregarResultado("Fabrizio Escolano", "9-9", "Ian Gangai", "CUARTOS DE FINAL COPA A T20");
agregarResultado("Eze", "3-11", "Nico Avalos", "CUARTOS DE FINAL COPA A T20");
agregarResultado("Nico Avalos", "11-3", "Eze", "CUARTOS DE FINAL COPA A T20");
agregarResultado("Cami", "8-13", "Rodrigo Soca", "CUARTOS DE FINAL COPA A T20");
agregarResultado("Rodrigo Soca", "13-8", "Cami", "CUARTOS DE FINAL COPA A T20");
agregarResultado("Ian Gangai", "11-13", "Fabrizio Escolano", "DESEMPATE CUARTOS DE FINAL COPA A T20");
agregarResultado("Fabrizio Escolano", "13-11", "Ian Gangai", "DESEMPATE CUARTOS DE FINAL COPA A T20");
agregarResultado("Fabrizio Escolano", "11-7", "Nico Avalos", "SEMIFINALES COPA A T20");
agregarResultado("Nico Avalos", "7-11", "Fabrizio Escolano", "SEMIFINALES COPA A T20");
agregarResultado("Rodrigo Soca", "6-7", "Luciano Hufschmid", "SEMIFINALES COPA A T20");
agregarResultado("Luciano Hufschmid", "7-6", "Rodrigo Soca", "SEMIFINALES COPA A T20");
agregarResultado("Cami", "1-2", "Manu Solbes", "FASE DE GRUPOS COPA TOTAL T20");
agregarResultado("Manu Solbes", "2-1", "Cami", "FASE DE GRUPOS COPA TOTAL T20");
agregarResultado("Luciano Hufschmid", "1-1", "Bautista Coria", "FASE DE GRUPOS COPA TOTAL T20");
agregarResultado("Bautista Coria", "1-1", "Luciano Hufschmid", "FASE DE GRUPOS COPA TOTAL T20");
agregarResultado("Bautista Coria", "0-2", "Manu Solbes", "FASE DE GRUPOS COPA TOTAL T20");
agregarResultado("Manu Solbes", "2-0", "Bautista Coria", "FASE DE GRUPOS COPA TOTAL T20");
agregarResultado("Cami", "1-1", "Luciano Hufschmid", "FASE DE GRUPOS COPA TOTAL T20");
agregarResultado("Luciano Hufschmid", "1-1", "Cami", "FASE DE GRUPOS COPA TOTAL T20");
agregarResultado("Mario Talarico", "1-3", "Rodri Sebastian", "FASE DE GRUPOS COPA TOTAL T20");
agregarResultado("Rodri Sebastian", "3-1", "Mario Talarico", "FASE DE GRUPOS COPA TOTAL T20");
agregarResultado("Fabrizio Escolano", "1-0", "Joel Alcalde", "FASE DE GRUPOS COPA TOTAL T20");
agregarResultado("Joel Alcalde", "0-1", "Fabrizio Escolano", "FASE DE GRUPOS COPA TOTAL T20");
agregarResultado("Joel Alcalde", "3-4", "Rodri Sebastian", "FASE DE GRUPOS COPA TOTAL T20");
agregarResultado("Rodri Sebastian", "4-3", "Joel Alcalde", "FASE DE GRUPOS COPA TOTAL T20");
agregarResultado("Mario Talarico", "1-3", "Fabrizio Escolano", "FASE DE GRUPOS COPA TOTAL T20");
agregarResultado("Fabrizio Escolano", "3-1", "Mario Talarico", "FASE DE GRUPOS COPA TOTAL T20");
agregarResultado("Jhose", "1-1", "Antonella Lopez", "FASE DE GRUPOS COPA TOTAL T20");
agregarResultado("Antonella Lopez", "1-1", "Jhose", "FASE DE GRUPOS COPA TOTAL T20");
agregarResultado("Ian Gangai", "0-0", "Joaquin Sampadaro", "FASE DE GRUPOS COPA TOTAL T20");
agregarResultado("Joaquin Sampadaro", "0-0", "Ian Gangai", "FASE DE GRUPOS COPA TOTAL T20");
agregarResultado("Joaquin Sampadaro", "4-0", "Antonella Lopez", "FASE DE GRUPOS COPA TOTAL T20");
agregarResultado("Antonella Lopez", "0-4", "Joaquin Sampadaro", "FASE DE GRUPOS COPA TOTAL T20");
agregarResultado("Jhose", "2-0", "Ian Gangai", "FASE DE GRUPOS COPA TOTAL T20");
agregarResultado("Ian Gangai", "0-2", "Jhose", "FASE DE GRUPOS COPA TOTAL T20");
agregarResultado("Lucas Insua", "1-1", "Cristian Hantis", "FASE DE GRUPOS COPA TOTAL T20");
agregarResultado("Cristian Hantis", "1-1", "Lucas Insua", "FASE DE GRUPOS COPA TOTAL T20");
agregarResultado("Pollo", "1-1", "Benja", "FASE DE GRUPOS COPA TOTAL T20");
agregarResultado("Benja", "1-1", "Pollo", "FASE DE GRUPOS COPA TOTAL T20");
agregarResultado("Benja", "4-1", "Cristian Hantis", "FASE DE GRUPOS COPA TOTAL T20");
agregarResultado("Cristian Hantis", "1-4", "Benja", "FASE DE GRUPOS COPA TOTAL T20");
agregarResultado("Lucas Insua", "1-0", "Pollo", "FASE DE GRUPOS COPA TOTAL T20");
agregarResultado("Pollo", "0-1", "Lucas Insua", "FASE DE GRUPOS COPA TOTAL T20");
agregarResultado("Rodrigo Talarico", "1-0", "Matheo Olivera", "FASE DE GRUPOS COPA TOTAL T20");
agregarResultado("Matheo Olivera", "0-1", "Rodrigo Talarico", "FASE DE GRUPOS COPA TOTAL T20");
agregarResultado("Rodrigo Soca", "2-0", "Ignacio Cejas", "FASE DE GRUPOS COPA TOTAL T20");
agregarResultado("Ignacio Cejas", "0-2", "Rodrigo Soca", "FASE DE GRUPOS COPA TOTAL T20");
agregarResultado("Ignacio Cejas", "4-0", "Matheo Olivera", "FASE DE GRUPOS COPA TOTAL T20");
agregarResultado("Matheo Olivera", "0-4", "Ignacio Cejas", "FASE DE GRUPOS COPA TOTAL T20");
agregarResultado("Rodrigo Talarico", "3-1", "Rodrigo Soca", "FASE DE GRUPOS COPA TOTAL T20");
agregarResultado("Rodrigo Soca", "1-3", "Rodrigo Talarico", "FASE DE GRUPOS COPA TOTAL T20");
agregarResultado("Kevin Sivori", "1-3", "Ciro Guarch", "FASE DE GRUPOS COPA TOTAL T20");
agregarResultado("Ciro Guarch", "3-1", "Kevin Sivori", "FASE DE GRUPOS COPA TOTAL T20");
agregarResultado("Lucas Aguilera", "1-3", "Joaco Fernandez", "FASE DE GRUPOS COPA TOTAL T20");
agregarResultado("Joaco Fernandez", "3-1", "Lucas Aguilera", "FASE DE GRUPOS COPA TOTAL T20");
agregarResultado("Joaco Fernandez", "4-3", "Ciro Guarch", "FASE DE GRUPOS COPA TOTAL T20");
agregarResultado("Ciro Guarch", "3-4", "Joaco Fernandez", "FASE DE GRUPOS COPA TOTAL T20");
agregarResultado("Kevin Sivori", "0-4", "Lucas Aguilera", "FASE DE GRUPOS COPA TOTAL T20");
agregarResultado("Lucas Aguilera", "4-0", "Kevin Sivori", "FASE DE GRUPOS COPA TOTAL T20");
agregarResultado("Tomas Delgado", "1-0", "Joel Marasco", "FASE DE GRUPOS COPA TOTAL T20");
agregarResultado("Joel Marasco", "0-1", "Tomas Delgado", "FASE DE GRUPOS COPA TOTAL T20");
agregarResultado("Pancho Muzzio", "0-0", "Azul Quispe", "FASE DE GRUPOS COPA TOTAL T20");
agregarResultado("Azul Quispe", "0-0", "Pancho Muzzio", "FASE DE GRUPOS COPA TOTAL T20");
agregarResultado("Azul Quispe", "0-0", "Joel Marasco", "FASE DE GRUPOS COPA TOTAL T20");
agregarResultado("Joel Marasco", "0-0", "Azul Quispe", "FASE DE GRUPOS COPA TOTAL T20");
agregarResultado("Tomas Delgado", "2-3", "Pancho Muzzio", "FASE DE GRUPOS COPA TOTAL T20");
agregarResultado("Pancho Muzzio", "3-2", "Tomas Delgado", "FASE DE GRUPOS COPA TOTAL T20");
agregarResultado("Nico Avalos", "2-1", "Santi", "FASE DE GRUPOS COPA TOTAL T20");
agregarResultado("Santi", "1-2", "Nico Avalos", "FASE DE GRUPOS COPA TOTAL T20");
agregarResultado("Bruno Alonso", "1-7", "Eze", "FASE DE GRUPOS COPA TOTAL T20");
agregarResultado("Eze", "7-1", "Bruno Alonso", "FASE DE GRUPOS COPA TOTAL T20");
agregarResultado("Eze", "4-1", "Santi", "FASE DE GRUPOS COPA TOTAL T20");
agregarResultado("Santi", "1-4", "Eze", "FASE DE GRUPOS COPA TOTAL T20");
agregarResultado("Nico Avalos", "2-4", "Bruno Alonso", "FASE DE GRUPOS COPA TOTAL T20");
agregarResultado("Bruno Alonso", "4-2", "Nico Avalos", "FASE DE GRUPOS COPA TOTAL T20");
agregarResultado("Gabriel Talarico", "1-1", "Felipe Galante", "FASE DE GRUPOS COPA TOTAL T20");
agregarResultado("Felipe Galante", "1-1", "Gabriel Talarico", "FASE DE GRUPOS COPA TOTAL T20");
agregarResultado("Moreno Perez", "1-1", "Yago", "FASE DE GRUPOS COPA TOTAL T20");
agregarResultado("Yago", "1-1", "Moreno Perez", "FASE DE GRUPOS COPA TOTAL T20");
agregarResultado("Yago", "4-1", "Felipe Galante", "FASE DE GRUPOS COPA TOTAL T20");
agregarResultado("Felipe Galante", "1-4", "Yago", "FASE DE GRUPOS COPA TOTAL T20");
agregarResultado("Gabriel Talarico", "4-1", "Moreno Perez", "FASE DE GRUPOS COPA TOTAL T20");
agregarResultado("Moreno Perez", "1-4", "Gabriel Talarico", "FASE DE GRUPOS COPA TOTAL T20");
agregarResultado("Renzo Badano", "2-2", "Dani Bazan", "FASE DE GRUPOS COPA TOTAL T20");
agregarResultado("Dani Bazan", "2-2", "Renzo Badano", "FASE DE GRUPOS COPA TOTAL T20");
agregarResultado("Tomas Torcasio", "2-1", "Anubis", "FASE DE GRUPOS COPA TOTAL T20");
agregarResultado("Anubis", "1-2", "Tomas Torcasio", "FASE DE GRUPOS COPA TOTAL T20");
agregarResultado("Anubis", "6-5", "Dani Bazan", "FASE DE GRUPOS COPA TOTAL T20");
agregarResultado("Dani Bazan", "5-6", "Anubis", "FASE DE GRUPOS COPA TOTAL T20");
agregarResultado("Renzo Badano", "2-3", "Tomas Torcasio", "FASE DE GRUPOS COPA TOTAL T20");
agregarResultado("Tomas Torcasio", "3-2", "Renzo Badano", "FASE DE GRUPOS COPA TOTAL T20");
agregarResultado("Luciano Hufschmid", "1-7", "Manu Solbes", "FASE DE GRUPOS COPA TOTAL T20");
agregarResultado("Manu Solbes", "7-1", "Luciano Hufschmid", "FASE DE GRUPOS COPA TOTAL T20");
agregarResultado("Bautista Coria", "1-4", "Cami", "FASE DE GRUPOS COPA TOTAL T20");
agregarResultado("Cami", "4-1", "Bautista Coria", "FASE DE GRUPOS COPA TOTAL T20");
agregarResultado("Manu Solbes", "4-4", "Cami", "FASE DE GRUPOS COPA TOTAL T20");
agregarResultado("Cami", "4-4", "Manu Solbes", "FASE DE GRUPOS COPA TOTAL T20");
agregarResultado("Bautista Coria", "1-3", "Luciano Hufschmid", "FASE DE GRUPOS COPA TOTAL T20");
agregarResultado("Luciano Hufschmid", "3-1", "Bautista Coria", "FASE DE GRUPOS COPA TOTAL T20");
agregarResultado("Fabrizio Escolano", "4-2", "Rodri Sebastian", "FASE DE GRUPOS COPA TOTAL T20");
agregarResultado("Rodri Sebastian", "2-4", "Fabrizio Escolano", "FASE DE GRUPOS COPA TOTAL T20");
agregarResultado("Joel Alcalde", "3-1", "Mario Talarico", "FASE DE GRUPOS COPA TOTAL T20");
agregarResultado("Mario Talarico", "1-3", "Joel Alcalde", "FASE DE GRUPOS COPA TOTAL T20");
agregarResultado("Rodri Sebastian", "3-3", "Mario Talarico", "FASE DE GRUPOS COPA TOTAL T20");
agregarResultado("Mario Talarico", "3-3", "Rodri Sebastian", "FASE DE GRUPOS COPA TOTAL T20");
agregarResultado("Joel Alcalde", "6-0", "Fabrizio Escolano", "FASE DE GRUPOS COPA TOTAL T20");
agregarResultado("Fabrizio Escolano", "0-6", "Joel Alcalde", "FASE DE GRUPOS COPA TOTAL T20");
agregarResultado("Ian Gangai", "7-0", "Antonella Lopez", "FASE DE GRUPOS COPA TOTAL T20");
agregarResultado("Antonella Lopez", "0-7", "Ian Gangai", "FASE DE GRUPOS COPA TOTAL T20");
agregarResultado("Joaquin Sampadaro", "1-5", "Jhose", "FASE DE GRUPOS COPA TOTAL T20");
agregarResultado("Jhose", "5-1", "Joaquin Sampadaro", "FASE DE GRUPOS COPA TOTAL T20");
agregarResultado("Antonella Lopez", "0-4", "Jhose", "FASE DE GRUPOS COPA TOTAL T20");
agregarResultado("Jhose", "4-0", "Antonella Lopez", "FASE DE GRUPOS COPA TOTAL T20");
agregarResultado("Joaquin Sampadaro", "0-6", "Ian Gangai", "FASE DE GRUPOS COPA TOTAL T20");
agregarResultado("Ian Gangai", "6-0", "Joaquin Sampadaro", "FASE DE GRUPOS COPA TOTAL T20");
agregarResultado("Pollo", "4-1", "Cristian Hantis", "FASE DE GRUPOS COPA TOTAL T20");
agregarResultado("Cristian Hantis", "1-4", "Pollo", "FASE DE GRUPOS COPA TOTAL T20");
agregarResultado("Benja", "2-0", "Lucas Insua", "FASE DE GRUPOS COPA TOTAL T20");
agregarResultado("Lucas Insua", "0-2", "Benja", "FASE DE GRUPOS COPA TOTAL T20");
agregarResultado("Cristian Hantis", "9-2", "Lucas Insua", "FASE DE GRUPOS COPA TOTAL T20");
agregarResultado("Lucas Insua", "2-9", "Cristian Hantis", "FASE DE GRUPOS COPA TOTAL T20");
agregarResultado("Benja", "0-3", "Pollo", "FASE DE GRUPOS COPA TOTAL T20");
agregarResultado("Pollo", "3-0", "Benja", "FASE DE GRUPOS COPA TOTAL T20");
agregarResultado("Rodrigo Soca", "2-0", "Matheo Olivera", "FASE DE GRUPOS COPA TOTAL T20");
agregarResultado("Matheo Olivera", "0-2", "Rodrigo Soca", "FASE DE GRUPOS COPA TOTAL T20");
agregarResultado("Ignacio Cejas", "2-1", "Rodrigo Talarico", "FASE DE GRUPOS COPA TOTAL T20");
agregarResultado("Rodrigo Talarico", "1-2", "Ignacio Cejas", "FASE DE GRUPOS COPA TOTAL T20");
agregarResultado("Matheo Olivera", "0-2", "Rodrigo Talarico", "FASE DE GRUPOS COPA TOTAL T20");
agregarResultado("Rodrigo Talarico", "2-0", "Matheo Olivera", "FASE DE GRUPOS COPA TOTAL T20");
agregarResultado("Ignacio Cejas", "0-4", "Rodrigo Soca", "FASE DE GRUPOS COPA TOTAL T20");
agregarResultado("Rodrigo Soca", "4-0", "Ignacio Cejas", "FASE DE GRUPOS COPA TOTAL T20");
agregarResultado("Lucas Aguilera", "5-1", "Ciro Guarch", "FASE DE GRUPOS COPA TOTAL T20");
agregarResultado("Ciro Guarch", "1-5", "Lucas Aguilera", "FASE DE GRUPOS COPA TOTAL T20");
agregarResultado("Joaco Fernandez", "6-2", "Kevin Sivori", "FASE DE GRUPOS COPA TOTAL T20");
agregarResultado("Kevin Sivori", "2-6", "Joaco Fernandez", "FASE DE GRUPOS COPA TOTAL T20");
agregarResultado("Ciro Guarch", "1-2", "Kevin Sivori", "FASE DE GRUPOS COPA TOTAL T20");
agregarResultado("Kevin Sivori", "2-1", "Ciro Guarch", "FASE DE GRUPOS COPA TOTAL T20");
agregarResultado("Joaco Fernandez", "5-3", "Lucas Aguilera", "FASE DE GRUPOS COPA TOTAL T20");
agregarResultado("Lucas Aguilera", "3-5", "Joaco Fernandez", "FASE DE GRUPOS COPA TOTAL T20");
agregarResultado("Pancho Muzzio", "2-0", "Joel Marasco", "FASE DE GRUPOS COPA TOTAL T20");
agregarResultado("Joel Marasco", "0-2", "Pancho Muzzio", "FASE DE GRUPOS COPA TOTAL T20");
agregarResultado("Azul Quispe", "0-5", "Tomas Delgado", "FASE DE GRUPOS COPA TOTAL T20");
agregarResultado("Tomas Delgado", "5-0", "Azul Quispe", "FASE DE GRUPOS COPA TOTAL T20");
agregarResultado("Joel Marasco", "0-0", "Tomas Delgado", "FASE DE GRUPOS COPA TOTAL T20");
agregarResultado("Tomas Delgado", "0-0", "Joel Marasco", "FASE DE GRUPOS COPA TOTAL T20");
agregarResultado("Azul Quispe", "0-4", "Pancho Muzzio", "FASE DE GRUPOS COPA TOTAL T20");
agregarResultado("Pancho Muzzio", "4-0", "Azul Quispe", "FASE DE GRUPOS COPA TOTAL T20");
agregarResultado("Bruno Alonso", "1-4", "Santi", "FASE DE GRUPOS COPA TOTAL T20");
agregarResultado("Santi", "4-1", "Bruno Alonso", "FASE DE GRUPOS COPA TOTAL T20");
agregarResultado("Eze", "1-4", "Nico Avalos", "FASE DE GRUPOS COPA TOTAL T20");
agregarResultado("Nico Avalos", "4-1", "Eze", "FASE DE GRUPOS COPA TOTAL T20");
agregarResultado("Santi", "0-5", "Nico Avalos", "FASE DE GRUPOS COPA TOTAL T20");
agregarResultado("Nico Avalos", "5-0", "Santi", "FASE DE GRUPOS COPA TOTAL T20");
agregarResultado("Eze", "4-2", "Bruno Alonso", "FASE DE GRUPOS COPA TOTAL T20");
agregarResultado("Bruno Alonso", "2-4", "Eze", "FASE DE GRUPOS COPA TOTAL T20");
agregarResultado("Moreno Perez", "2-0", "Felipe Galante", "FASE DE GRUPOS COPA TOTAL T20");
agregarResultado("Felipe Galante", "0-2", "Moreno Perez", "FASE DE GRUPOS COPA TOTAL T20");
agregarResultado("Yago", "2-4", "Gabriel Talarico", "FASE DE GRUPOS COPA TOTAL T20");
agregarResultado("Gabriel Talarico", "4-2", "Yago", "FASE DE GRUPOS COPA TOTAL T20");
agregarResultado("Felipe Galante", "2-1", "Gabriel Talarico", "FASE DE GRUPOS COPA TOTAL T20");
agregarResultado("Gabriel Talarico", "1-2", "Felipe Galante", "FASE DE GRUPOS COPA TOTAL T20");
agregarResultado("Yago", "1-0", "Moreno Perez", "FASE DE GRUPOS COPA TOTAL T20");
agregarResultado("Moreno Perez", "0-1", "Yago", "FASE DE GRUPOS COPA TOTAL T20");
agregarResultado("Tomas Torcasio", "0-4", "Dani Bazan", "FASE DE GRUPOS COPA TOTAL T20");
agregarResultado("Dani Bazan", "4-0", "Tomas Torcasio", "FASE DE GRUPOS COPA TOTAL T20");
agregarResultado("Anubis", "1-1", "Renzo Badano", "FASE DE GRUPOS COPA TOTAL T20");
agregarResultado("Renzo Badano", "1-1", "Anubis", "FASE DE GRUPOS COPA TOTAL T20");
agregarResultado("Dani Bazan", "0-2", "Renzo Badano", "FASE DE GRUPOS COPA TOTAL T20");
agregarResultado("Renzo Badano", "2-0", "Dani Bazan", "FASE DE GRUPOS COPA TOTAL T20");
agregarResultado("Anubis", "1-3", "Tomas Torcasio", "FASE DE GRUPOS COPA TOTAL T20");
agregarResultado("Tomas Torcasio", "3-1", "Anubis", "FASE DE GRUPOS COPA TOTAL T20");
agregarResultado("Manu Solbes", "0-0", "Bautista Coria", "FASE DE GRUPOS COPA TOTAL T20");
agregarResultado("Bautista Coria", "0-0", "Manu Solbes", "FASE DE GRUPOS COPA TOTAL T20");
agregarResultado("Luciano Hufschmid", "4-6", "Cami", "FASE DE GRUPOS COPA TOTAL T20");
agregarResultado("Cami", "6-4", "Luciano Hufschmid", "FASE DE GRUPOS COPA TOTAL T20");
agregarResultado("Manu Solbes", "6-4", "Luciano Hufschmid", "FASE DE GRUPOS COPA TOTAL T20");
agregarResultado("Luciano Hufschmid", "4-6", "Manu Solbes", "FASE DE GRUPOS COPA TOTAL T20");
agregarResultado("Cami", "4-3", "Bautista Coria", "FASE DE GRUPOS COPA TOTAL T20");
agregarResultado("Bautista Coria", "3-4", "Cami", "FASE DE GRUPOS COPA TOTAL T20");
agregarResultado("Rodri Sebastian", "4-0", "Joel Alcalde", "FASE DE GRUPOS COPA TOTAL T20");
agregarResultado("Joel Alcalde", "0-4", "Rodri Sebastian", "FASE DE GRUPOS COPA TOTAL T20");
agregarResultado("Fabrizio Escolano", "1-6", "Mario Talarico", "FASE DE GRUPOS COPA TOTAL T20");
agregarResultado("Mario Talarico", "6-1", "Fabrizio Escolano", "FASE DE GRUPOS COPA TOTAL T20");
agregarResultado("Rodri Sebastian", "1-7", "Fabrizio Escolano", "FASE DE GRUPOS COPA TOTAL T20");
agregarResultado("Fabrizio Escolano", "7-1", "Rodri Sebastian", "FASE DE GRUPOS COPA TOTAL T20");
agregarResultado("Mario Talarico", "3-3", "Joel Alcalde", "FASE DE GRUPOS COPA TOTAL T20");
agregarResultado("Joel Alcalde", "3-3", "Mario Talarico", "FASE DE GRUPOS COPA TOTAL T20");
agregarResultado("Antonella Lopez", "0-1", "Joaquin Sampadaro", "FASE DE GRUPOS COPA TOTAL T20");
agregarResultado("Joaquin Sampadaro", "1-0", "Antonella Lopez", "FASE DE GRUPOS COPA TOTAL T20");
agregarResultado("Ian Gangai", "6-3", "Jhose", "FASE DE GRUPOS COPA TOTAL T20");
agregarResultado("Jhose", "3-6", "Ian Gangai", "FASE DE GRUPOS COPA TOTAL T20");
agregarResultado("Antonella Lopez", "0-2", "Ian Gangai", "FASE DE GRUPOS COPA TOTAL T20");
agregarResultado("Ian Gangai", "2-0", "Antonella Lopez", "FASE DE GRUPOS COPA TOTAL T20");
agregarResultado("Jhose", "4-4", "Joaquin Sampadaro", "FASE DE GRUPOS COPA TOTAL T20");
agregarResultado("Joaquin Sampadaro", "4-4", "Jhose", "FASE DE GRUPOS COPA TOTAL T20");
agregarResultado("Cristian Hantis", "3-4", "Benja", "FASE DE GRUPOS COPA TOTAL T20");
agregarResultado("Benja", "4-3", "Cristian Hantis", "FASE DE GRUPOS COPA TOTAL T20");
agregarResultado("Pollo", "0-0", "Lucas Insua", "FASE DE GRUPOS COPA TOTAL T20");
agregarResultado("Lucas Insua", "0-0", "Pollo", "FASE DE GRUPOS COPA TOTAL T20");
agregarResultado("Cristian Hantis", "0-4", "Pollo", "FASE DE GRUPOS COPA TOTAL T20");
agregarResultado("Pollo", "4-0", "Cristian Hantis", "FASE DE GRUPOS COPA TOTAL T20");
agregarResultado("Lucas Insua", "3-0", "Benja", "FASE DE GRUPOS COPA TOTAL T20");
agregarResultado("Benja", "0-3", "Lucas Insua", "FASE DE GRUPOS COPA TOTAL T20");
agregarResultado("Matheo Olivera", "0-6", "Ignacio Cejas", "FASE DE GRUPOS COPA TOTAL T20");
agregarResultado("Ignacio Cejas", "6-0", "Matheo Olivera", "FASE DE GRUPOS COPA TOTAL T20");
agregarResultado("Rodrigo Soca", "0-1", "Rodrigo Talarico", "FASE DE GRUPOS COPA TOTAL T20");
agregarResultado("Rodrigo Talarico", "1-0", "Rodrigo Soca", "FASE DE GRUPOS COPA TOTAL T20");
agregarResultado("Matheo Olivera", "0-3", "Rodrigo Soca", "FASE DE GRUPOS COPA TOTAL T20");
agregarResultado("Rodrigo Soca", "3-0", "Matheo Olivera", "FASE DE GRUPOS COPA TOTAL T20");
agregarResultado("Rodrigo Talarico", "1-1", "Ignacio Cejas", "FASE DE GRUPOS COPA TOTAL T20");
agregarResultado("Ignacio Cejas", "1-1", "Rodrigo Talarico", "FASE DE GRUPOS COPA TOTAL T20");
agregarResultado("Ciro Guarch", "2-3", "Joaco Fernandez", "FASE DE GRUPOS COPA TOTAL T20");
agregarResultado("Joaco Fernandez", "3-2", "Ciro Guarch", "FASE DE GRUPOS COPA TOTAL T20");
agregarResultado("Lucas Aguilera", "1-0", "Kevin Sivori", "FASE DE GRUPOS COPA TOTAL T20");
agregarResultado("Kevin Sivori", "0-1", "Lucas Aguilera", "FASE DE GRUPOS COPA TOTAL T20");
agregarResultado("Ciro Guarch", "2-4", "Lucas Aguilera", "FASE DE GRUPOS COPA TOTAL T20");
agregarResultado("Lucas Aguilera", "4-2", "Ciro Guarch", "FASE DE GRUPOS COPA TOTAL T20");
agregarResultado("Kevin Sivori", "0-1", "Joaco Fernandez", "FASE DE GRUPOS COPA TOTAL T20");
agregarResultado("Joaco Fernandez", "1-0", "Kevin Sivori", "FASE DE GRUPOS COPA TOTAL T20");
agregarResultado("Joel Marasco", "1-0", "Azul Quispe", "FASE DE GRUPOS COPA TOTAL T20");
agregarResultado("Azul Quispe", "0-1", "Joel Marasco", "FASE DE GRUPOS COPA TOTAL T20");
agregarResultado("Pancho Muzzio", "0-3", "Tomas Delgado", "FASE DE GRUPOS COPA TOTAL T20");
agregarResultado("Tomas Delgado", "3-0", "Pancho Muzzio", "FASE DE GRUPOS COPA TOTAL T20");
agregarResultado("Joel Marasco", "4-0", "Pancho Muzzio", "FASE DE GRUPOS COPA TOTAL T20");
agregarResultado("Pancho Muzzio", "0-4", "Joel Marasco", "FASE DE GRUPOS COPA TOTAL T20");
agregarResultado("Tomas Delgado", "4-0", "Azul Quispe", "FASE DE GRUPOS COPA TOTAL T20");
agregarResultado("Azul Quispe", "0-4", "Tomas Delgado", "FASE DE GRUPOS COPA TOTAL T20");
agregarResultado("Santi", "0-3", "Eze", "FASE DE GRUPOS COPA TOTAL T20");
agregarResultado("Eze", "3-0", "Santi", "FASE DE GRUPOS COPA TOTAL T20");
agregarResultado("Bruno Alonso", "1-1", "Nico Avalos", "FASE DE GRUPOS COPA TOTAL T20");
agregarResultado("Nico Avalos", "1-1", "Bruno Alonso", "FASE DE GRUPOS COPA TOTAL T20");
agregarResultado("Santi", "4-3", "Bruno Alonso", "FASE DE GRUPOS COPA TOTAL T20");
agregarResultado("Bruno Alonso", "3-4", "Santi", "FASE DE GRUPOS COPA TOTAL T20");
agregarResultado("Nico Avalos", "3-5", "Eze", "FASE DE GRUPOS COPA TOTAL T20");
agregarResultado("Eze", "5-3", "Nico Avalos", "FASE DE GRUPOS COPA TOTAL T20");
agregarResultado("Felipe Galante", "3-1", "Yago", "FASE DE GRUPOS COPA TOTAL T20");
agregarResultado("Yago", "1-3", "Felipe Galante", "FASE DE GRUPOS COPA TOTAL T20");
agregarResultado("Moreno Perez", "1-4", "Gabriel Talarico", "FASE DE GRUPOS COPA TOTAL T20");
agregarResultado("Gabriel Talarico", "4-1", "Moreno Perez", "FASE DE GRUPOS COPA TOTAL T20");
agregarResultado("Felipe Galante", "0-1", "Moreno Perez", "FASE DE GRUPOS COPA TOTAL T20");
agregarResultado("Moreno Perez", "1-0", "Felipe Galante", "FASE DE GRUPOS COPA TOTAL T20");
agregarResultado("Gabriel Talarico", "2-6", "Yago", "FASE DE GRUPOS COPA TOTAL T20");
agregarResultado("Yago", "6-2", "Gabriel Talarico", "FASE DE GRUPOS COPA TOTAL T20");
agregarResultado("Dani Bazan", "0-0", "Anubis", "FASE DE GRUPOS COPA TOTAL T20");
agregarResultado("Anubis", "0-0", "Dani Bazan", "FASE DE GRUPOS COPA TOTAL T20");
agregarResultado("Tomas Torcasio", "1-0", "Renzo Badano", "FASE DE GRUPOS COPA TOTAL T20");
agregarResultado("Renzo Badano", "0-1", "Tomas Torcasio", "FASE DE GRUPOS COPA TOTAL T20");
agregarResultado("Dani Bazan", "2-5", "Tomas Torcasio", "FASE DE GRUPOS COPA TOTAL T20");
agregarResultado("Tomas Torcasio", "5-2", "Dani Bazan", "FASE DE GRUPOS COPA TOTAL T20");
agregarResultado("Renzo Badano", "1-2", "Anubis", "FASE DE GRUPOS COPA TOTAL T20");
agregarResultado("Anubis", "2-1", "Renzo Badano", "FASE DE GRUPOS COPA TOTAL T20");
agregarResultado("Tomas Torcasio", "13-12", "Manu Solbes", "OCTAVOS DE FINAL COPA TOTAL T20");
agregarResultado("Manu Solbes", "12-13", "Tomas Torcasio", "OCTAVOS DE FINAL COPA TOTAL T20");
agregarResultado("Rodrigo Soca", "15-8", "Rodrigo Talarico", "OCTAVOS DE FINAL COPA TOTAL T20");
agregarResultado("Rodrigo Talarico", "8-15", "Rodrigo Soca", "OCTAVOS DE FINAL COPA TOTAL T20");
agregarResultado("Yago", "10-13", "Tomas Delgado", "OCTAVOS DE FINAL COPA TOTAL T20");
agregarResultado("Tomas Delgado", "13-10", "Yago", "OCTAVOS DE FINAL COPA TOTAL T20");
agregarResultado("Cami", "11-13", "Fabrizio Escolano", "OCTAVOS DE FINAL COPA TOTAL T20");
agregarResultado("Fabrizio Escolano", "13-11", "Cami", "OCTAVOS DE FINAL COPA TOTAL T20");
agregarResultado("Lucas Aguilera", "11-7", "Joaco Fernandez", "OCTAVOS DE FINAL COPA TOTAL T20");
agregarResultado("Joaco Fernandez", "7-11", "Lucas Aguilera", "OCTAVOS DE FINAL COPA TOTAL T20");
agregarResultado("Ian Gangai", "9-10", "Pollo", "OCTAVOS DE FINAL COPA TOTAL T20");
agregarResultado("Pollo", "10-9", "Ian Gangai", "OCTAVOS DE FINAL COPA TOTAL T20");
agregarResultado("Eze", "12-9", "Jhose", "OCTAVOS DE FINAL COPA TOTAL T20");
agregarResultado("Jhose", "9-12", "Eze", "OCTAVOS DE FINAL COPA TOTAL T20");
agregarResultado("Nico Avalos", "13-10", "Gabriel Talarico", "OCTAVOS DE FINAL COPA TOTAL T20");
agregarResultado("Gabriel Talarico", "10-13", "Nico Avalos", "OCTAVOS DE FINAL COPA TOTAL T20");
agregarResultado("Tomas Torcasio", "8-11", "Nico Avalos", "CUARTOS DE FINAL COPA TOTAL T20");
agregarResultado("Nico Avalos", "11-8", "Tomas Torcasio", "CUARTOS DE FINAL COPA TOTAL T20");
agregarResultado("Pollo", "9-10", "Lucas Aguilera", "CUARTOS DE FINAL COPA TOTAL T20");
agregarResultado("Lucas Aguilera", "10-9", "Pollo", "CUARTOS DE FINAL COPA TOTAL T20");
agregarResultado("Eze", "3-13", "Rodrigo Soca", "CUARTOS DE FINAL COPA TOTAL T20");
agregarResultado("Rodrigo Soca", "13-3", "Eze", "CUARTOS DE FINAL COPA TOTAL T20");
agregarResultado("Fabrizio Escolano", "9-10", "Tomas Delgado", "CUARTOS DE FINAL COPA TOTAL T20");
agregarResultado("Tomas Delgado", "10-9", "Fabrizio Escolano", "CUARTOS DE FINAL COPA TOTAL T20");
agregarResultado("Tomas Delgado", "7-12", "Lucas Aguilera", "SEMIFINALES COPA TOTAL T20");
agregarResultado("Lucas Aguilera", "12-7", "Tomas Delgado", "SEMIFINALES COPA TOTAL T20");
agregarResultado("Rodrigo Soca", "6-7", "Nico Avalos", "SEMIFINALES COPA TOTAL T20");
agregarResultado("Nico Avalos", "7-6", "Rodrigo Soca", "SEMIFINALES COPA TOTAL T20");
agregarResultado("Azul Quispe", "0-5", "Tomas Torcasio", "32AVOS DE FINAL COPA CAMPEONES T20");
agregarResultado("Tomas Torcasio", "5-0", "Azul Quispe", "32AVOS DE FINAL COPA CAMPEONES T20");
agregarResultado("Tomas Delgado", "8-6", "Bruno Alonso", "32AVOS DE FINAL COPA CAMPEONES T20");
agregarResultado("Bruno Alonso", "6-8", "Tomas Delgado", "32AVOS DE FINAL COPA CAMPEONES T20");
agregarResultado("Rodrigo Soca", "5-5", "Pollo", "32AVOS DE FINAL COPA CAMPEONES T20");
agregarResultado("Pollo", "5-5", "Rodrigo Soca", "32AVOS DE FINAL COPA CAMPEONES T20");
agregarResultado("Rodrigo Soca", "4-4", "Pollo", "DESEMPATE 32AVOS DE FINAL COPA CAMPEONES T20");
agregarResultado("Pollo", "4-4", "Rodrigo Soca", "DESEMPATE 32AVOS DE FINAL COPA CAMPEONES T20");
agregarResultado("Rodrigo Soca", "3-1", "Pollo", "DESEMPATE 2 32AVOS DE FINAL COPA CAMPEONES T20");
agregarResultado("Pollo", "1-3", "Rodrigo Soca", "DESEMPATE 2 32AVOS DE FINAL COPA CAMPEONES T20");
agregarResultado("Tomas Torcasio", "9-14", "Cami", "16AVOS DE FINAL COPA CAMPEONES T20");
agregarResultado("Cami", "14-9", "Tomas Torcasio", "16AVOS DE FINAL COPA CAMPEONES T20");
agregarResultado("Tomas Delgado", "7-7", "Pollo", "16AVOS DE FINAL COPA CAMPEONES T20");
agregarResultado("Pollo", "7-7", "Tomas Delgado", "16AVOS DE FINAL COPA CAMPEONES T20");
agregarResultado("Tomas Delgado", "10-9", "Pollo", "DESEMPATE 16AVOS DE FINAL COPA CAMPEONES T20");
agregarResultado("Pollo", "9-10", "Tomas Delgado", "DESEMPATE 16AVOS DE FINAL COPA CAMPEONES T20");
agregarResultado("Cami", "11-7", "Lucas Insua", "OCTAVOS DE FINAL COPA CAMPEONES T20");
agregarResultado("Lucas Insua", "7-11", "Cami", "OCTAVOS DE FINAL COPA CAMPEONES T20");
agregarResultado("Tomas Delgado", "13-9", "Ian Gangai", "OCTAVOS DE FINAL COPA CAMPEONES T20");
agregarResultado("Ian Gangai", "9-13", "Tomas Delgado", "OCTAVOS DE FINAL COPA CAMPEONES T20");
agregarResultado("Nico Avalos", "13-9", "Jhose", "OCTAVOS DE FINAL COPA CAMPEONES T20");
agregarResultado("Jhose", "9-13", "Nico Avalos", "OCTAVOS DE FINAL COPA CAMPEONES T20");
agregarResultado("Cami", "8-10", "Lucas Aguilera", "CUARTOS DE FINAL COPA CAMPEONES T20");
agregarResultado("Lucas Aguilera", "10-8", "Cami", "CUARTOS DE FINAL COPA CAMPEONES T20");
agregarResultado("Tomas Delgado", "10-11", "Nico Avalos", "CUARTOS DE FINAL COPA CAMPEONES T20");
agregarResultado("Nico Avalos", "11-10", "Tomas Delgado", "CUARTOS DE FINAL COPA CAMPEONES T20");
agregarResultado("Lucas Aguilera", "12-7", "Luciano Hufschmid", "SEMIFINAL COPA CAMPEONES T20");
agregarResultado("Luciano Hufschmid", "7-12", "Lucas Aguilera", "SEMIFINAL COPA CAMPEONES T20");
agregarResultado("Nico Avalos", "7-9", "Moreno Perez", "SEMIFINAL COPA CAMPEONES T20");
agregarResultado("Moreno Perez", "9-7", "Nico Avalos", "SEMIFINAL COPA CAMPEONES T20");
agregarResultado("Benja", "13-20", "Ciro Guarch", "SEMIFINALES COPA DUOS T20");
agregarResultado("Ciro Guarch", "20-13", "Benja", "SEMIFINALES COPA DUOS T20");
agregarResultado("Rodrigo Soca", "13-20", "Fabrizio Escolano", "SEMIFINALES COPA DUOS T20");
agregarResultado("Fabrizio Escolano", "20-13", "Rodrigo Soca", "SEMIFINALES COPA DUOS T20");
agregarResultado("Tomas Delgado", "21-13", "Nico Avalos", "SEMIFINALES COPA DUOS T20");
agregarResultado("Nico Avalos", "13-21", "Tomas Delgado", "SEMIFINALES COPA DUOS T20");
agregarResultado("Lucas Aguilera", "21-13", "Tomas Torcasio", "SEMIFINALES COPA DUOS T20");
agregarResultado("Tomas Torcasio", "13-21", "Lucas Aguilera", "SEMIFINALES COPA DUOS T20");
agregarResultado("Benja", "13-20", "Fabrizio Escolano", "SEMIFINALES COPA DUOS T20");
agregarResultado("Fabrizio Escolano", "20-13", "Benja", "SEMIFINALES COPA DUOS T20");
agregarResultado("Rodrigo Soca", "13-20", "Ciro Guarch", "SEMIFINALES COPA DUOS T20");
agregarResultado("Ciro Guarch", "20-13", "Rodrigo Soca", "SEMIFINALES COPA DUOS T20");
agregarResultado("Tomas Delgado", "21-13", "Tomas Torcasio", "SEMIFINALES COPA DUOS T20");
agregarResultado("Tomas Torcasio", "13-21", "Tomas Delgado", "SEMIFINALES COPA DUOS T20");
agregarResultado("Lucas Aguilera", "21-13", "Nico Avalos", "SEMIFINALES COPA DUOS T20");
agregarResultado("Nico Avalos", "13-21", "Lucas Aguilera", "SEMIFINALES COPA DUOS T20");
agregarResultado("Ciro Guarch", "2-9", "Mario Talarico", "FINAL COPA B T20");
agregarResultado("Mario Talarico", "9-2", "Ciro Guarch", "FINAL COPA B T20");
agregarResultado("Fabrizio Escolano", "3-3", "Luciano Hufschmid", "FINAL COPA A T20");
agregarResultado("Luciano Hufschmid", "3-3", "Fabrizio Escolano", "FINAL COPA A T20");
agregarResultado("Fabrizio Escolano", "3-3", "Luciano Hufschmid", "DESEMPATE FINAL COPA A T20");
agregarResultado("Luciano Hufschmid", "3-3", "Fabrizio Escolano", "DESEMPATE FINAL COPA A T20");
agregarResultado("Fabrizio Escolano", "4-3", "Luciano Hufschmid", "DESEMPATE 2 FINAL COPA A T20");
agregarResultado("Luciano Hufschmid", "3-4", "Fabrizio Escolano", "DESEMPATE 2 FINAL COPA A T20");
agregarResultado("Lucas Aguilera", "5-5", "Nico Avalos", "FINAL COPA TOTAL T20");
agregarResultado("Nico Avalos", "5-5", "Lucas Aguilera", "FINAL COPA TOTAL T20");
agregarResultado("Lucas Aguilera", "1-0", "Nico Avalos", "DESEMPATE FINAL COPA TOTAL T20");
agregarResultado("Nico Avalos", "0-1", "Lucas Aguilera", "DESEMPATE FINAL COPA TOTAL T20");
agregarResultado("Ciro Guarch", "5-10", "Tomas Delgado", "FINAL COPA DUOS T20");
agregarResultado("Tomas Delgado", "10-5", "Ciro Guarch", "FINAL COPA DUOS T20");
agregarResultado("Fabrizio Escolano", "5-10", "Lucas Aguilera", "FINAL COPA DUOS T20");
agregarResultado("Lucas Aguilera", "10-5", "Fabrizio Escolano", "FINAL COPA DUOS T20");
agregarResultado("Ciro Guarch", "5-10", "Lucas Aguilera", "FINAL COPA DUOS T20");
agregarResultado("Lucas Aguilera", "10-5", "Ciro Guarch", "FINAL COPA DUOS T20");
agregarResultado("Fabrizio Escolano", "5-10", "Tomas Delgado", "FINAL COPA DUOS T20");
agregarResultado("Tomas Delgado", "10-5", "Fabrizio Escolano", "FINAL COPA DUOS T20");
agregarResultado("Lucas Aguilera", "4-8", "Moreno Perez", "FINAL COPA CAMPEONES T20");
agregarResultado("Moreno Perez", "8-4", "Lucas Aguilera", "FINAL COPA CAMPEONES T20");
agregarResultado("Tomas Torcasio", "1-1", "Dani Bazan", "PROMOCION T20");
agregarResultado("Dani Bazan", "1-1", "Tomas Torcasio", "PROMOCION T20");
agregarResultado("Gabriel Talarico", "4-4", "Kevin Sivori", "PROMOCION T20");
agregarResultado("Kevin Sivori", "4-4", "Gabriel Talarico", "PROMOCION T20");
agregarResultado("Tomas Torcasio", "4-4", "Dani Bazan", "DESEMPATE PROMOCION T20");
agregarResultado("Dani Bazan", "4-4", "Tomas Torcasio", "DESEMPATE PROMOCION T20");
agregarResultado("Gabriel Talarico", "4-4", "Kevin Sivori", "DESEMPATE PROMOCION T20");
agregarResultado("Kevin Sivori", "4-4", "Gabriel Talarico", "DESEMPATE PROMOCION T20");
agregarResultado("Renzo Badano", "3-3", "Tomas Torcasio", "DESEMPATE PRIMERA DIVISION T20");
agregarResultado("Tomas Torcasio", "3-3", "Renzo Badano", "DESEMPATE PRIMERA DIVISION T20");
agregarResultado("Renzo Badano", "1-0", "Tomas Torcasio", "DESEMPATE 2 PRIMERA DIVISION T20");
agregarResultado("Tomas Torcasio", "0-1", "Renzo Badano", "DESEMPATE 2 PRIMERA DIVISION T20");
agregarResultado("Joel Alcalde", "13-8", "Pancho Muzzio", "FASE DE GRUPOS COPA TRIOS");
agregarResultado("Pancho Muzzio", "8-13", "Joel Alcalde", "FASE DE GRUPOS COPA TRIOS");
agregarResultado("Ignacio Cejas", "9-6", "Benja", "FASE DE GRUPOS COPA TRIOS");
agregarResultado("Benja", "6-9", "Ignacio Cejas", "FASE DE GRUPOS COPA TRIOS");
agregarResultado("Luciano Hufschmid", "4-0", "Joel Marasco", "FASE DE GRUPOS COPA TRIOS");
agregarResultado("Joel Marasco", "0-4", "Luciano Hufschmid", "FASE DE GRUPOS COPA TRIOS");
agregarResultado("Rodri Sebastian", "9-10", "Benja", "FASE DE GRUPOS COPA TRIOS");
agregarResultado("Benja", "10-9", "Rodri Sebastian", "FASE DE GRUPOS COPA TRIOS");
agregarResultado("Gabriel Talarico", "5-9", "Pancho Muzzio", "FASE DE GRUPOS COPA TRIOS");
agregarResultado("Pancho Muzzio", "9-5", "Gabriel Talarico", "FASE DE GRUPOS COPA TRIOS");
agregarResultado("Mario Talarico", "4-7", "Santi", "FASE DE GRUPOS COPA TRIOS");
agregarResultado("Santi", "7-4", "Mario Talarico", "FASE DE GRUPOS COPA TRIOS");
agregarResultado("Tomas Delgado", "12-18", "Pancho Muzzio", "FASE DE GRUPOS COPA TRIOS");
agregarResultado("Pancho Muzzio", "18-12", "Tomas Delgado", "FASE DE GRUPOS COPA TRIOS");
agregarResultado("Anubis", "8-12", "Santi", "FASE DE GRUPOS COPA TRIOS");
agregarResultado("Santi", "12-8", "Anubis", "FASE DE GRUPOS COPA TRIOS");
agregarResultado("Dani Bazan", "2-6", "Benja", "FASE DE GRUPOS COPA TRIOS");
agregarResultado("Benja", "6-2", "Dani Bazan", "FASE DE GRUPOS COPA TRIOS");
agregarResultado("Joaco Fernandez", "10-12", "Santi", "FASE DE GRUPOS COPA TRIOS");
agregarResultado("Santi", "12-10", "Joaco Fernandez", "FASE DE GRUPOS COPA TRIOS");
agregarResultado("Manu Solbes", "6-12", "Pancho Muzzio", "FASE DE GRUPOS COPA TRIOS");
agregarResultado("Pancho Muzzio", "12-6", "Manu Solbes", "FASE DE GRUPOS COPA TRIOS");
agregarResultado("Bautista Coria", "6-8", "Benja", "FASE DE GRUPOS COPA TRIOS");
agregarResultado("Benja", "8-6", "Bautista Coria", "FASE DE GRUPOS COPA TRIOS");
agregarResultado("Cami", "12-13", "Lucas Aguilera", "FASE DE GRUPOS COPA TRIOS");
agregarResultado("Lucas Aguilera", "13-12", "Cami", "FASE DE GRUPOS COPA TRIOS");
agregarResultado("Kevin Sivori", "6-10", "Pollo", "FASE DE GRUPOS COPA TRIOS");
agregarResultado("Pollo", "10-6", "Kevin Sivori", "FASE DE GRUPOS COPA TRIOS");
agregarResultado("Jhose", "4-7", "Rodrigo Talarico", "FASE DE GRUPOS COPA TRIOS");
agregarResultado("Rodrigo Talarico", "7-4", "Jhose", "FASE DE GRUPOS COPA TRIOS");
agregarResultado("Yago", "9-10", "Lucas Aguilera", "FASE DE GRUPOS COPA TRIOS");
agregarResultado("Lucas Aguilera", "10-9", "Yago", "FASE DE GRUPOS COPA TRIOS");
agregarResultado("Cristian Hantis", "8-9", "Pollo", "FASE DE GRUPOS COPA TRIOS");
agregarResultado("Pollo", "9-8", "Cristian Hantis", "FASE DE GRUPOS COPA TRIOS");
agregarResultado("Renzo Badano", "7-7", "Rodrigo Talarico", "FASE DE GRUPOS COPA TRIOS");
agregarResultado("Rodrigo Talarico", "7-7", "Renzo Badano", "FASE DE GRUPOS COPA TRIOS");
agregarResultado("Eze", "7-14", "Lucas Aguilera", "FASE DE GRUPOS COPA TRIOS");
agregarResultado("Lucas Aguilera", "14-7", "Eze", "FASE DE GRUPOS COPA TRIOS");
agregarResultado("Bruno Alonso", "6-5", "Rodrigo Talarico", "FASE DE GRUPOS COPA TRIOS");
agregarResultado("Rodrigo Talarico", "5-6", "Bruno Alonso", "FASE DE GRUPOS COPA TRIOS");
agregarResultado("Fabrizio Escolano", "13-15", "Pollo", "FASE DE GRUPOS COPA TRIOS");
agregarResultado("Pollo", "15-13", "Fabrizio Escolano", "FASE DE GRUPOS COPA TRIOS");
agregarResultado("Ian Gangai", "12-11", "Rodrigo Talarico", "FASE DE GRUPOS COPA TRIOS");
agregarResultado("Rodrigo Talarico", "11-12", "Ian Gangai", "FASE DE GRUPOS COPA TRIOS");
agregarResultado("Tomas Torcasio", "8-10", "Lucas Aguilera", "FASE DE GRUPOS COPA TRIOS");
agregarResultado("Lucas Aguilera", "10-8", "Tomas Torcasio", "FASE DE GRUPOS COPA TRIOS");
agregarResultado("Felipe Galante", "12-13", "Mario Talarico", "FASE DE GRUPOS COPA TRIOS");
agregarResultado("Mario Talarico", "13-12", "Felipe Galante", "FASE DE GRUPOS COPA TRIOS");
agregarResultado("Nico Avalos", "10-11", "Gabriel Talarico", "FASE DE GRUPOS COPA TRIOS");
agregarResultado("Gabriel Talarico", "11-10", "Nico Avalos", "FASE DE GRUPOS COPA TRIOS");
agregarResultado("Moreno Perez", "5-6", "Rodri Sebastian", "FASE DE GRUPOS COPA TRIOS");
agregarResultado("Rodri Sebastian", "6-5", "Moreno Perez", "FASE DE GRUPOS COPA TRIOS");
agregarResultado("Ignacio Cejas", "17-16", "Tomas Delgado", "FASE DE GRUPOS COPA TRIOS");
agregarResultado("Tomas Delgado", "16-17", "Ignacio Cejas", "FASE DE GRUPOS COPA TRIOS");
agregarResultado("Joel Alcalde", "8-15", "Dani Bazan", "FASE DE GRUPOS COPA TRIOS");
agregarResultado("Dani Bazan", "15-8", "Joel Alcalde", "FASE DE GRUPOS COPA TRIOS");
agregarResultado("Luciano Hufschmid", "5-4", "Anubis", "FASE DE GRUPOS COPA TRIOS");
agregarResultado("Anubis", "4-5", "Luciano Hufschmid", "FASE DE GRUPOS COPA TRIOS");
agregarResultado("Gabriel Talarico", "17-12", "Manu Solbes", "FASE DE GRUPOS COPA TRIOS");
agregarResultado("Manu Solbes", "12-17", "Gabriel Talarico", "FASE DE GRUPOS COPA TRIOS");
agregarResultado("Mario Talarico", "6-9", "Bautista Coria", "FASE DE GRUPOS COPA TRIOS");
agregarResultado("Bautista Coria", "9-6", "Mario Talarico", "FASE DE GRUPOS COPA TRIOS");
agregarResultado("Rodri Sebastian", "3-3", "Joaco Fernandez", "FASE DE GRUPOS COPA TRIOS");
agregarResultado("Joaco Fernandez", "3-3", "Rodri Sebastian", "FASE DE GRUPOS COPA TRIOS");
agregarResultado("Tomas Delgado", "18-9", "Nico Avalos", "FASE DE GRUPOS COPA TRIOS");
agregarResultado("Nico Avalos", "9-18", "Tomas Delgado", "FASE DE GRUPOS COPA TRIOS");
agregarResultado("Dani Bazan", "8-9", "Moreno Perez", "FASE DE GRUPOS COPA TRIOS");
agregarResultado("Moreno Perez", "9-8", "Dani Bazan", "FASE DE GRUPOS COPA TRIOS");
agregarResultado("Anubis", "6-5", "Felipe Galante", "FASE DE GRUPOS COPA TRIOS");
agregarResultado("Felipe Galante", "5-6", "Anubis", "FASE DE GRUPOS COPA TRIOS");
agregarResultado("Ciro Guarch", "12-13", "Yago", "FASE DE GRUPOS COPA TRIOS");
agregarResultado("Yago", "13-12", "Ciro Guarch", "FASE DE GRUPOS COPA TRIOS");
agregarResultado("Rodrigo Soca", "8-9", "Renzo Badano", "FASE DE GRUPOS COPA TRIOS");
agregarResultado("Renzo Badano", "9-8", "Rodrigo Soca", "FASE DE GRUPOS COPA TRIOS");
agregarResultado("Lucas Insua", "4-5", "Cristian Hantis", "FASE DE GRUPOS COPA TRIOS");
agregarResultado("Cristian Hantis", "5-4", "Lucas Insua", "FASE DE GRUPOS COPA TRIOS");
agregarResultado("Cami", "13-10", "Bruno Alonso", "FASE DE GRUPOS COPA TRIOS");
agregarResultado("Bruno Alonso", "10-13", "Cami", "FASE DE GRUPOS COPA TRIOS");
agregarResultado("Kevin Sivori", "11-5", "Eze", "FASE DE GRUPOS COPA TRIOS");
agregarResultado("Eze", "5-11", "Kevin Sivori", "FASE DE GRUPOS COPA TRIOS");
agregarResultado("Jhose", "11-0", "Joaquin Sampadaro", "FASE DE GRUPOS COPA TRIOS");
agregarResultado("Joaquin Sampadaro", "0-11", "Jhose", "FASE DE GRUPOS COPA TRIOS");
agregarResultado("Yago", "18-12", "Fabrizio Escolano", "FASE DE GRUPOS COPA TRIOS");
agregarResultado("Fabrizio Escolano", "12-18", "Yago", "FASE DE GRUPOS COPA TRIOS");
agregarResultado("Renzo Badano", "5-12", "Tomas Torcasio", "FASE DE GRUPOS COPA TRIOS");
agregarResultado("Tomas Torcasio", "12-5", "Renzo Badano", "FASE DE GRUPOS COPA TRIOS");
agregarResultado("Cristian Hantis", "4-8", "Ian Gangai", "FASE DE GRUPOS COPA TRIOS");
agregarResultado("Ian Gangai", "8-4", "Cristian Hantis", "FASE DE GRUPOS COPA TRIOS");
agregarResultado("Bruno Alonso", "11-15", "Lucas Insua", "FASE DE GRUPOS COPA TRIOS");
agregarResultado("Lucas Insua", "15-11", "Bruno Alonso", "FASE DE GRUPOS COPA TRIOS");
agregarResultado("Eze", "9-8", "Rodrigo Soca", "FASE DE GRUPOS COPA TRIOS");
agregarResultado("Rodrigo Soca", "8-9", "Eze", "FASE DE GRUPOS COPA TRIOS");
agregarResultado("Manu Solbes", "13-10", "Tomas Delgado", "FASE DE GRUPOS COPA TRIOS");
agregarResultado("Tomas Delgado", "10-13", "Manu Solbes", "FASE DE GRUPOS COPA TRIOS");
agregarResultado("Joaco Fernandez", "11-8", "Anubis", "FASE DE GRUPOS COPA TRIOS");
agregarResultado("Anubis", "8-11", "Joaco Fernandez", "FASE DE GRUPOS COPA TRIOS");
agregarResultado("Bautista Coria", "4-6", "Dani Bazan", "FASE DE GRUPOS COPA TRIOS");
agregarResultado("Dani Bazan", "6-4", "Bautista Coria", "FASE DE GRUPOS COPA TRIOS");
agregarResultado("Felipe Galante", "9-7", "Joaco Fernandez", "FASE DE GRUPOS COPA TRIOS");
agregarResultado("Joaco Fernandez", "7-9", "Felipe Galante", "FASE DE GRUPOS COPA TRIOS");
agregarResultado("Nico Avalos", "9-5", "Bautista Coria", "FASE DE GRUPOS COPA TRIOS");
agregarResultado("Bautista Coria", "5-9", "Nico Avalos", "FASE DE GRUPOS COPA TRIOS");
agregarResultado("Morneo Perez", "8-4", "Manu Solbes", "FASE DE GRUPOS COPA TRIOS");
agregarResultado("Manu Solbes", "4-8", "Morneo Perez", "FASE DE GRUPOS COPA TRIOS");
agregarResultado("Luciano Hufschmid", "15-14", "Moreno Perez", "FASE DE GRUPOS COPA TRIOS");
agregarResultado("Moreno Perez", "14-15", "Luciano Hufschmid", "FASE DE GRUPOS COPA TRIOS");
agregarResultado("Ignacio Cejas", "10-12", "Nico Avalos", "FASE DE GRUPOS COPA TRIOS");
agregarResultado("Nico Avalos", "12-10", "Ignacio Cejas", "FASE DE GRUPOS COPA TRIOS");
agregarResultado("Joel Alcalde", "9-9", "Felipe Galante", "FASE DE GRUPOS COPA TRIOS");
agregarResultado("Felipe Galante", "9-9", "Joel Alcalde", "FASE DE GRUPOS COPA TRIOS");
agregarResultado("Mario Talarico", "9-15", "Luciano Hufschmid", "FASE DE GRUPOS COPA TRIOS");
agregarResultado("Luciano Hufschmid", "15-9", "Mario Talarico", "FASE DE GRUPOS COPA TRIOS");
agregarResultado("Gabriel Talarico", "7-13", "Joel Alcalde", "FASE DE GRUPOS COPA TRIOS");
agregarResultado("Joel Alcalde", "13-7", "Gabriel Talarico", "FASE DE GRUPOS COPA TRIOS");
agregarResultado("Rodri Sebastian", "2-11", "Ignacio Cejas", "FASE DE GRUPOS COPA TRIOS");
agregarResultado("Ignacio Cejas", "11-2", "Rodri Sebastian", "FASE DE GRUPOS COPA TRIOS");
agregarResultado("Ian Gangai", "11-15", "Bruno Alonso", "FASE DE GRUPOS COPA TRIOS");
agregarResultado("Bruno Alonso", "15-11", "Ian Gangai", "FASE DE GRUPOS COPA TRIOS");
agregarResultado("Fabrizio Escolano", "11-11", "Eze", "FASE DE GRUPOS COPA TRIOS");
agregarResultado("Eze", "11-11", "Fabrizio Escolano", "FASE DE GRUPOS COPA TRIOS");
agregarResultado("Tomas Torcasio", "9-7", "Joaquin Sampadaro", "FASE DE GRUPOS COPA TRIOS");
agregarResultado("Joaquin Sampadaro", "7-9", "Tomas Torcasio", "FASE DE GRUPOS COPA TRIOS");
agregarResultado("Rodrigo Soca", "10-9", "Ian Gangai", "FASE DE GRUPOS COPA TRIOS");
agregarResultado("Ian Gangai", "9-10", "Rodrigo Soca", "FASE DE GRUPOS COPA TRIOS");
agregarResultado("Lucas Insua", "8-9", "Fabrizio Escolano", "FASE DE GRUPOS COPA TRIOS");
agregarResultado("Fabrizio Escolano", "9-8", "Lucas Insua", "FASE DE GRUPOS COPA TRIOS");
agregarResultado("Ciro Guarch", "2-8", "Tomas Torcasio", "FASE DE GRUPOS COPA TRIOS");
agregarResultado("Tomas Torcasio", "8-2", "Ciro Guarch", "FASE DE GRUPOS COPA TRIOS");
agregarResultado("Cami", "14-11", "Rodrigo Soca", "FASE DE GRUPOS COPA TRIOS");
agregarResultado("Rodrigo Soca", "11-14", "Cami", "FASE DE GRUPOS COPA TRIOS");
agregarResultado("Jhose", "9-10", "Lucas Insua", "FASE DE GRUPOS COPA TRIOS");
agregarResultado("Lucas Insua", "10-9", "Jhose", "FASE DE GRUPOS COPA TRIOS");
agregarResultado("Kevin Sivori", "8-8", "Ciro Guarch", "FASE DE GRUPOS COPA TRIOS");
agregarResultado("Ciro Guarch", "8-8", "Kevin Sivori", "FASE DE GRUPOS COPA TRIOS");
agregarResultado("Yago", "11-11", "Cami", "FASE DE GRUPOS COPA TRIOS");
agregarResultado("Cami", "11-11", "Yago", "FASE DE GRUPOS COPA TRIOS");
agregarResultado("Renzo Badano", "8-9", "Kevin Sivori", "FASE DE GRUPOS COPA TRIOS");
agregarResultado("Kevin Sivori", "9-8", "Renzo Badano", "FASE DE GRUPOS COPA TRIOS");
agregarResultado("Cristian Hantis", "8-7", "Jhose", "FASE DE GRUPOS COPA TRIOS");
agregarResultado("Jhose", "7-8", "Cristian Hantis", "FASE DE GRUPOS COPA TRIOS");
agregarResultado("Joel Alcalde", "14-14", "Eze", "CUARTOS DE FINAL COPA TRIOS");

agregarResultado("Eze", "14-14", "Joel Alcalde", "CUARTOS DE FINAL COPA TRIOS");

agregarResultado("Luciano Hufschmid", "6-7", "Bruno Alonso", "CUARTOS DE FINAL COPA TRIOS");

agregarResultado("Bruno Alonso", "7-6", "Luciano Hufschmid", "CUARTOS DE FINAL COPA TRIOS");

agregarResultado("Ignacio Cejas", "3-6", "Cami", "CUARTOS DE FINAL COPA TRIOS");

agregarResultado("Cami", "6-3", "Ignacio Cejas", "CUARTOS DE FINAL COPA TRIOS");

agregarResultado("Lucas Aguilera", "20-15", "Mario Talarico", "CUARTOS DE FINAL COPA TRIOS");

agregarResultado("Mario Talarico", "15-20", "Lucas Aguilera", "CUARTOS DE FINAL COPA TRIOS");

agregarResultado("Rodrigo Talarico", "6-9", "Rodri Sebastian", "CUARTOS DE FINAL COPA TRIOS");

agregarResultado("Rodri Sebastian", "9-6", "Rodrigo Talarico", "CUARTOS DE FINAL COPA TRIOS");

agregarResultado("Pollo", "4-4", "Gabriel Talarico", "CUARTOS DE FINAL COPA TRIOS");

agregarResultado("Gabriel Talarico", "4-4", "Pollo", "CUARTOS DE FINAL COPA TRIOS");

agregarResultado("Pancho Muzzio", "17-12", "Renzo Badano", "CUARTOS DE FINAL COPA TRIOS");

agregarResultado("Renzo Badano", "12-17", "Pancho Muzzio", "CUARTOS DE FINAL COPA TRIOS");

agregarResultado("Benja", "12-8", "Yago", "CUARTOS DE FINAL COPA TRIOS");

agregarResultado("Yago", "8-12", "Benja", "CUARTOS DE FINAL COPA TRIOS");

agregarResultado("Santi", "9-7", "Cristian Hantis", "CUARTOS DE FINAL COPA TRIOS");

agregarResultado("Cristian Hantis", "7-9", "Santi", "CUARTOS DE FINAL COPA TRIOS");

agregarResultado("Fabrizio Escolano", "17-12", "Moreno Perez", "CUARTOS DE FINAL COPA TRIOS");

agregarResultado("Moreno Perez", "12-17", "Fabrizio Escolano", "CUARTOS DE FINAL COPA TRIOS");

agregarResultado("Ian Gangai", "15-11", "Felipe Galante", "CUARTOS DE FINAL COPA TRIOS");

agregarResultado("Felipe Galante", "11-15", "Ian Gangai", "CUARTOS DE FINAL COPA TRIOS");

agregarResultado("Tomas Torcasio", "11-9", "Nico Avalos", "CUARTOS DE FINAL COPA TRIOS");

agregarResultado("Nico Avalos", "9-11", "Tomas Torcasio", "CUARTOS DE FINAL COPA TRIOS");

agregarResultado("Bruno Alonso", "11-11", "Benja", "SEMIFINAL COPA TRIOS");

agregarResultado("Benja", "11-11", "Bruno Alonso", "SEMIFINAL COPA TRIOS");

agregarResultado("Cami", "8-11", "Pancho Muzzio", "SEMIFINAL COPA TRIOS");

agregarResultado("Pancho Muzzio", "11-8", "Cami", "SEMIFINAL COPA TRIOS");

agregarResultado("Eze", "7-0", "Santi", "SEMIFINAL COPA TRIOS");

agregarResultado("Santi", "0-7", "Eze", "SEMIFINAL COPA TRIOS");

agregarResultado("Rodrigo Talarico", "9-10", "Ian Gangai", "SEMIFINAL COPA TRIOS");

agregarResultado("Ian Gangai", "10-9", "Rodrigo Talarico", "SEMIFINAL COPA TRIOS");

agregarResultado("Lucas Aguilera", "6-9", "Fabrizio Escolano", "SEMIFINAL COPA TRIOS");

agregarResultado("Fabrizio Escolano", "9-6", "Lucas Aguilera", "SEMIFINAL COPA TRIOS");

agregarResultado("Pollo", "6-9", "Tomas Torcasio", "SEMIFINAL COPA TRIOS");

agregarResultado("Tomas Torcasio", "9-6", "Pollo", "SEMIFINAL COPA TRIOS");

agregarResultado("Bruno Alonso", "9-9", "Tomas Torcasio", "FINAL COPA TRIOS");

agregarResultado("Tomas Torcasio", "9-9", "Bruno Alonso", "FINAL COPA TRIOS");

agregarResultado("Eze", "8-7", "Ian Gangai", "FINAL COPA TRIOS");

agregarResultado("Ian Gangai", "7-8", "Eze", "FINAL COPA TRIOS");

agregarResultado("Cami", "8-6", "Fabrizio Escolano", "FINAL COPA TRIOS");

agregarResultado("Fabrizio Escolano", "6-8", "Cami", "FINAL COPA TRIOS");

agregarResultado("Benja", "9-8", "Rodrigo Talarico", "3ER PUESTO COPA TRIOS");

agregarResultado("Rodrigo Talarico", "8-9", "Benja", "3ER PUESTO COPA TRIOS");

agregarResultado("Pancho Muzzio", "6-7", "Pollo", "3ER PUESTO COPA TRIOS");

agregarResultado("Pollo", "7-6", "Pancho Muzzio", "3ER PUESTO COPA TRIOS");

agregarResultado("Santi", "0-6", "Lucas Aguilera", "3ER PUESTO COPA TRIOS");

agregarResultado("Lucas Aguilera", "6-0", "Santi", "3ER PUESTO COPA TRIOS");

agregarResultado("Lucas Aguilera", "6-7", "Mario Talarico", "FECHA 1 PRODE PAGO T21 T21");

agregarResultado("Mario Talarico", "7-6", "Lucas Aguilera", "FECHA 1 PRODE PAGO T21 T21");

agregarResultado("Moreno Perez", "4-7", "Fabrizio Escolano", "FECHA 1 PRODE PAGO T21");

agregarResultado("Fabrizio Escolano", "7-4", "Moreno Perez", "FECHA 1 PRODE PAGO T21");

agregarResultado("Gabriel Talarico", "7-5", "Rodrigo Talarico", "FECHA 1 PRODE PAGO T21");

agregarResultado("Rodrigo Talarico", "5-7", "Gabriel Talarico", "FECHA 1 PRODE PAGO T21");

agregarResultado("Cami", "6-7", "Rodrigo Soca", "FECHA 1 PRODE PAGO T21");

agregarResultado("Rodrigo Soca", "7-6", "Cami", "FECHA 1 PRODE PAGO T21");

agregarResultado("Lucas Aguilera", "5-5", "Fabrizio Escolano", "FECHA 2 PRODE PAGO T21");

agregarResultado("Fabrizio Escolano", "5-5", "Lucas Aguilera", "FECHA 2 PRODE PAGO T21");

agregarResultado("Moreno Perez", "7-6", "Rodrigo Soca", "FECHA 2 PRODE PAGO T21");

agregarResultado("Rodrigo Soca", "6-7", "Moreno Perez", "FECHA 2 PRODE PAGO T21");

agregarResultado("Gabriel Talarico", "8-8", "Cami", "FECHA 2 PRODE PAGO T21");

agregarResultado("Cami", "8-8", "Gabriel Talarico", "FECHA 2 PRODE PAGO T21");

agregarResultado("Rodrigo Talarico", "6-3", "Mario Talarico", "FECHA 4 PRODE PAGO T21");

agregarResultado("Mario Talarico", "3-6", "Rodrigo Talarico", "FECHA 4 PRODE PAGO T21");

agregarResultado("Fabrizio Escolano", "7-9", "Rodrigo Soca", "FECHA 4 PRODE PAGO T21");

agregarResultado("Rodrigo Soca", "9-7", "Fabrizio Escolano", "FECHA 4 PRODE PAGO T21");

agregarResultado("Lucas Aguilera", "1-8", "Gabriel Talarico", "FECHA 4 PRODE PAGO T21");

agregarResultado("Gabriel Talarico", "8-1", "Lucas Aguilera", "FECHA 4 PRODE PAGO T21");

agregarResultado("Rodrigo Soca", "5-4", "Mario Talarico", "FECHA 5 PRODE PAGO T21");

agregarResultado("Mario Talarico", "4-5", "Rodrigo Soca", "FECHA 5 PRODE PAGO T21");

agregarResultado("Rodrigo Talarico", "5-5", "Cami", "FECHA 5 PRODE PAGO T21");

agregarResultado("Cami", "5-5", "Rodrigo Talarico", "FECHA 5 PRODE PAGO T21");

agregarResultado("Fabrizio Escolano", "9-7", "Gabriel Talarico", "FECHA 5 PRODE PAGO T21");

agregarResultado("Gabriel Talarico", "7-9", "Fabrizio Escolano", "FECHA 5 PRODE PAGO T21");

agregarResultado("Cami", "5-5", "Mario Talarico", "FECHA 6 PRODE PAGO T21");

agregarResultado("Mario Talarico", "5-5", "Cami", "FECHA 6 PRODE PAGO T21");

agregarResultado("Rodrigo Soca", "1-1", "Gabriel Talarico", "FECHA 6 PRODE PAGO T21");

agregarResultado("Gabriel Talarico", "1-1", "Rodrigo Soca", "FECHA 6 PRODE PAGO T21");

agregarResultado("Rodrigo Talarico", "1-5", "Moreno Perez", "FECHA 6 PRODE PAGO T21");

agregarResultado("Moreno Perez", "5-1", "Rodrigo Talarico", "FECHA 6 PRODE PAGO T21");

agregarResultado("Gabriel Talarico", "6-10", "Mario Talarico", "FECHA 7 PRODE PAGO T21");

agregarResultado("Mario Talarico", "10-6", "Gabriel Talarico", "FECHA 7 PRODE PAGO T21");

agregarResultado("Cami", "3-11", "Moreno Perez", "FECHA 7 PRODE PAGO T21");

agregarResultado("Moreno Perez", "11-3", "Cami", "FECHA 7 PRODE PAGO T21");

agregarResultado("Rodrigo Talarico", "5-4", "Lucas Aguilera", "FECHA 7 PRODE PAGO T21");

agregarResultado("Lucas Aguilera", "4-5", "Rodrigo Talarico", "FECHA 7 PRODE PAGO T21");

agregarResultado("Moreno Perez", "9-1", "Mario Talarico", "FECHA 8 PRODE PAGO T21");

agregarResultado("Mario Talarico", "1-9", "Moreno Perez", "FECHA 8 PRODE PAGO T21");

agregarResultado("Cami", "4-0", "Lucas Aguilera", "FECHA 8 PRODE PAGO T21");

agregarResultado("Lucas Aguilera", "0-4", "Cami", "FECHA 8 PRODE PAGO T21");

agregarResultado("Rodrigo Talarico", "8-7", "Fabrizio Escolano", "FECHA 8 PRODE PAGO T21");

agregarResultado("Fabrizio Escolano", "7-8", "Rodrigo Talarico", "FECHA 8 PRODE PAGO T21");

agregarResultado("Moreno Perez", "2-0", "Lucas Aguilera", "FECHA 9 PRODE PAGO T21");

agregarResultado("Lucas Aguilera", "0-2", "Moreno Perez", "FECHA 9 PRODE PAGO T21");

agregarResultado("Cami", "1-2", "Fabrizio Escolano", "FECHA 9 PRODE PAGO T21");

agregarResultado("Fabrizio Escolano", "2-1", "Cami", "FECHA 9 PRODE PAGO T21");

agregarResultado("Rodrigo Soca", "4-2", "Rodrigo Talarico", "FECHA 9 PRODE PAGO T21");

agregarResultado("Rodrigo Talarico", "2-4", "Rodrigo Soca", "FECHA 9 PRODE PAGO T21");

agregarResultado("Gabriel Talarico", "12-6", "Pancho Muzzio", "SEMIFINALES EUROCOPA T21");

agregarResultado("Pancho Muzzio", "6-12", "Gabriel Talarico", "SEMIFINALES EUROCOPA T21");

agregarResultado("Luciano Hufschmid", "9-14", "Fabrizio Escolano", "SEMIFINALES EUROCOPA T21");

agregarResultado("Fabrizio Escolano", "14-9", "Luciano Hufschmid", "SEMIFINALES EUROCOPA T21");

agregarResultado("Gabriel Talarico", "5-8", "Fabrizio Escolano", "FINAL EUROCOPA T21");

agregarResultado("Fabrizio Escolano", "8-5", "Gabriel Talarico", "FINAL EUROCOPA T21");

agregarResultado("Gabriel Talarico", "7-7", "Pollo", "FINAL COPA AMERICA T21");

agregarResultado("Pollo", "7-7", "Gabriel Talarico", "FINAL COPA AMERICA T21");

agregarResultado("Felipe Galante", "14-14", "Nico Avalos", "OCTAVOS DE FINAL COPA A T22");

agregarResultado("Nico Avalos", "14-14", "Felipe Galante", "OCTAVOS DE FINAL COPA A T22");

agregarResultado("Pancho Muzzio", "13-16", "Mario Talarico", "OCTAVOS DE FINAL COPA A T22");

agregarResultado("Mario Talarico", "16-13", "Pancho Muzzio", "OCTAVOS DE FINAL COPA A T22");

agregarResultado("Fabrizio Escolano", "14-15", "Rodrigo Soca", "OCTAVOS DE FINAL COPA A T22");

agregarResultado("Rodrigo Soca", "15-14", "Fabrizio Escolano", "OCTAVOS DE FINAL COPA A T22");

agregarResultado("Tomas Torcasio", "12-10", "Pollo", "OCTAVOS DE FINAL COPA A T22");

agregarResultado("Pollo", "10-12", "Tomas Torcasio", "OCTAVOS DE FINAL COPA A T22");

agregarResultado("Felipe Galante", "5-8", "Nico Avalos", "DESEMPATE OCTAVOS DE FINAL COPA A T22");

agregarResultado("Nico Avalos", "8-5", "Felipe Galante", "DESEMPATE OCTAVOS DE FINAL COPA A T22");

agregarResultado("Jhose", "8-8", "Nico Avalos", "CUARTOS DE FINAL COPA A T22");

agregarResultado("Nico Avalos", "8-8", "Jhose", "CUARTOS DE FINAL COPA A T22");

agregarResultado("Moreno Perez", "8-8", "Mario Talarico", "CUARTOS DE FINAL COPA A T22");

agregarResultado("Mario Talarico", "8-8", "Moreno Perez", "CUARTOS DE FINAL COPA A T22");

agregarResultado("Ian Gangai", "13-6", "Rodrigo Soca", "CUARTOS DE FINAL COPA A T22");

agregarResultado("Rodrigo Soca", "6-13", "Ian Gangai", "CUARTOS DE FINAL COPA A T22");

agregarResultado("Yago", "14-6", "Tomas Torcasio", "CUARTOS DE FINAL COPA A T22");

agregarResultado("Tomas Torcasio", "6-14", "Yago", "CUARTOS DE FINAL COPA A T22");

agregarResultado("Jhose", "0-3", "Nico Avalos", "DESEMPATE CUARTOS DE FINAL COPA A T22");

agregarResultado("Nico Avalos", "3-0", "Jhose", "DESEMPATE CUARTOS DE FINAL COPA A T22");

agregarResultado("Moreno Perez", "4-3", "Mario Talarico", "DESEMPATE CUARTOS DE FINAL COPA A T22");

agregarResultado("Mario Talarico", "3-4", "Moreno Perez", "DESEMPATE CUARTOS DE FINAL COPA A T22");

agregarResultado("Yago", "8-6", "Ian Gangai", "SEMIFINALES COPA A T22");

agregarResultado("Ian Gangai", "6-8", "Yago", "SEMIFINALES COPA A T22");

agregarResultado("Nico Avalos", "5-9", "Moreno Perez", "SEMIFINALES COPA A T22");

agregarResultado("Moreno Perez", "9-5", "Nico Avalos", "SEMIFINALES COPA A T22");

agregarResultado("Yago", "8-4", "Moreno Perez", "FINAL COPA A T22");

agregarResultado("Moreno Perez", "4-8", "Yago", "FINAL COPA A T22");

agregarResultado("Rodrigo Talarico", "4-1", "Ciro Guarch", "CUARTOS DE FINAL COPA B T22");

agregarResultado("Ciro Guarch", "1-4", "Rodrigo Talarico", "CUARTOS DE FINAL COPA B T22");

agregarResultado("Lucas Insua", "10-7", "Benja", "CUARTOS DE FINAL COPA B T22");

agregarResultado("Benja", "7-10", "Lucas Insua", "CUARTOS DE FINAL COPA B T22");

agregarResultado("Kevin Sivori", "8-0", "Cristian Hantis", "CUARTOS DE FINAL COPA B T22");

agregarResultado("Cristian Hantis", "0-8", "Kevin Sivori", "CUARTOS DE FINAL COPA B T22");

agregarResultado("Luciano Hufschmid", "6-14", "Veronica Lucchesi", "CUARTOS DE FINAL COPA B T22");

agregarResultado("Veronica Lucchesi", "14-6", "Luciano Hufschmid", "CUARTOS DE FINAL COPA B T22");

agregarResultado("Kevin Sivori", "9-13", "Veronica Lucchesi", "SEMIFINALES COPA B T22");

agregarResultado("Veronica Lucchesi", "13-9", "Kevin Sivori", "SEMIFINALES COPA B T22");

agregarResultado("Rodrigo Talarico", "8-6", "Lucas Insua", "SEMIFINALES COPA B T22");

agregarResultado("Lucas Insua", "6-8", "Rodrigo Talarico", "SEMIFINALES COPA B T22");

agregarResultado("Veronica Lucchesi", "6-11", "Rodrigo Talarico", "FINAL COPA B T22");

agregarResultado("Rodrigo Talarico", "11-6", "Veronica Lucchesi", "FINAL COPA B T22");

agregarResultado("Santi", "0-0", "Lucas Aguilera", "GRUPOS COPA TOTAL T22");

agregarResultado("Lucas Aguilera", "0-0", "Santi", "GRUPOS COPA TOTAL T22");

agregarResultado("Ignacio Cejas", "4-5", "Luciano Hufschmid", "GRUPOS COPA TOTAL T22");

agregarResultado("Luciano Hufschmid", "5-4", "Ignacio Cejas", "GRUPOS COPA TOTAL T22");

agregarResultado("Luciano Hufschmid", "4-2", "Lucas Aguilera", "GRUPOS COPA TOTAL T22");

agregarResultado("Lucas Aguilera", "2-4", "Luciano Hufschmid", "GRUPOS COPA TOTAL T22");

agregarResultado("Santi", "0-2", "Ignacio Cejas", "GRUPOS COPA TOTAL T22");

agregarResultado("Ignacio Cejas", "2-0", "Santi", "GRUPOS COPA TOTAL T22");

agregarResultado("Rodri Sebastian", "0-1", "Cami", "GRUPOS COPA TOTAL T22");

agregarResultado("Cami", "1-0", "Rodri Sebastian", "GRUPOS COPA TOTAL T22");

agregarResultado("Mario Talarico", "2-6", "Jhose", "GRUPOS COPA TOTAL T22");

agregarResultado("Jhose", "6-2", "Mario Talarico", "GRUPOS COPA TOTAL T22");

agregarResultado("Jhose", "0-4", "Cami", "GRUPOS COPA TOTAL T22");

agregarResultado("Cami", "4-0", "Jhose", "GRUPOS COPA TOTAL T22");

agregarResultado("Rodri Sebastian", "0-4", "Mario Talarico", "GRUPOS COPA TOTAL T22");

agregarResultado("Mario Talarico", "4-0", "Rodri Sebastian", "GRUPOS COPA TOTAL T22");

agregarResultado("Anubis", "3-6", "Ian Gangai", "GRUPOS COPA TOTAL T22");

agregarResultado("Ian Gangai", "6-3", "Anubis", "GRUPOS COPA TOTAL T22");

agregarResultado("Pancho Muzzio", "5-1", "Tomas Delgado", "GRUPOS COPA TOTAL T22");

agregarResultado("Tomas Delgado", "1-5", "Pancho Muzzio", "GRUPOS COPA TOTAL T22");

agregarResultado("Tomas Delgado", "2-4", "Ian Gangai", "GRUPOS COPA TOTAL T22");

agregarResultado("Ian Gangai", "4-2", "Tomas Delgado", "GRUPOS COPA TOTAL T22");

agregarResultado("Anubis", "0-1", "Pancho Muzzio", "GRUPOS COPA TOTAL T22");

agregarResultado("Pancho Muzzio", "1-0", "Anubis", "GRUPOS COPA TOTAL T22");

agregarResultado("Marto", "2-2", "Rodrigo Soca", "GRUPOS COPA TOTAL T22");

agregarResultado("Rodrigo Soca", "2-2", "Marto", "GRUPOS COPA TOTAL T22");

agregarResultado("Kevin Sivori", "4-4", "Tomas Torcasio", "GRUPOS COPA TOTAL T22");

agregarResultado("Tomas Torcasio", "4-4", "Kevin Sivori", "GRUPOS COPA TOTAL T22");

agregarResultado("Tomas Torcasio", "2-0", "Rodrigo Soca", "GRUPOS COPA TOTAL T22");

agregarResultado("Rodrigo Soca", "0-2", "Tomas Torcasio", "GRUPOS COPA TOTAL T22");

agregarResultado("Marto", "0-1", "Kevin Sivori", "GRUPOS COPA TOTAL T22");

agregarResultado("Kevin Sivori", "1-0", "Marto", "GRUPOS COPA TOTAL T22");

agregarResultado("Felipe Galante", "5-5", "Moreno Perez", "GRUPOS COPA TOTAL T22");

agregarResultado("Moreno Perez", "5-5", "Felipe Galante", "GRUPOS COPA TOTAL T22");

agregarResultado("Rodrigo Talarico", "2-5", "Lucas Insua", "GRUPOS COPA TOTAL T22");

agregarResultado("Lucas Insua", "5-2", "Rodrigo Talarico", "GRUPOS COPA TOTAL T22");

agregarResultado("Lucas Insua", "0-1", "Moreno Perez", "GRUPOS COPA TOTAL T22");

agregarResultado("Moreno Perez", "1-0", "Lucas Insua", "GRUPOS COPA TOTAL T22");

agregarResultado("Felipe Galante", "0-1", "Rodrigo Talarico", "GRUPOS COPA TOTAL T22");

agregarResultado("Rodrigo Talarico", "1-0", "Felipe Galante", "GRUPOS COPA TOTAL T22");

agregarResultado("Veronica Lucchesi", "4-3", "Gabriel Talarico", "GRUPOS COPA TOTAL T22");

agregarResultado("Gabriel Talarico", "3-4", "Veronica Lucchesi", "GRUPOS COPA TOTAL T22");

agregarResultado("Joel Alcalde", "1-4", "Bruno Alonso", "GRUPOS COPA TOTAL T22");

agregarResultado("Bruno Alonso", "4-1", "Joel Alcalde", "GRUPOS COPA TOTAL T22");

agregarResultado("Bruno Alonso", "0-4", "Gabriel Talarico", "GRUPOS COPA TOTAL T22");

agregarResultado("Gabriel Talarico", "4-0", "Bruno Alonso", "GRUPOS COPA TOTAL T22");

agregarResultado("Veronica Lucchesi", "2-0", "Joel Alcalde", "GRUPOS COPA TOTAL T22");

agregarResultado("Joel Alcalde", "0-2", "Veronica Lucchesi", "GRUPOS COPA TOTAL T22");

agregarResultado("Ciro Guarch", "8-7", "Fabrizio Escolano", "GRUPOS COPA TOTAL T22");

agregarResultado("Fabrizio Escolano", "7-8", "Ciro Guarch", "GRUPOS COPA TOTAL T22");

agregarResultado("Renzo Badano", "3-4", "Pollo", "GRUPOS COPA TOTAL T22");

agregarResultado("Pollo", "4-3", "Renzo Badano", "GRUPOS COPA TOTAL T22");

agregarResultado("Pollo", "6-1", "Fabrizio Escolano", "GRUPOS COPA TOTAL T22");

agregarResultado("Fabrizio Escolano", "1-6", "Pollo", "GRUPOS COPA TOTAL T22");

agregarResultado("Ciro Guarch", "0-0", "Renzo Badano", "GRUPOS COPA TOTAL T22");

agregarResultado("Renzo Badano", "0-0", "Ciro Guarch", "GRUPOS COPA TOTAL T22");

agregarResultado("Dani Bazan", "2-5", "Yago", "GRUPOS COPA TOTAL T22");

agregarResultado("Yago", "5-2", "Dani Bazan", "GRUPOS COPA TOTAL T22");

agregarResultado("Cristian Hantis", "0-4", "Benja", "GRUPOS COPA TOTAL T22");

agregarResultado("Benja", "4-0", "Cristian Hantis", "GRUPOS COPA TOTAL T22");

agregarResultado("Yago", "4-0", "Nico Avalos", "GRUPOS COPA TOTAL T22");

agregarResultado("Nico Avalos", "0-4", "Yago", "GRUPOS COPA TOTAL T22");

agregarResultado("Dani Bazan", "2-0", "Cristian Hantis", "GRUPOS COPA TOTAL T22");

agregarResultado("Cristian Hantis", "0-2", "Dani Bazan", "GRUPOS COPA TOTAL T22");

agregarResultado("Ignacio Cejas", "1-1", "Lucas Aguilera", "GRUPOS COPA TOTAL T22");

agregarResultado("Lucas Aguilera", "1-1", "Ignacio Cejas", "GRUPOS COPA TOTAL T22");

agregarResultado("Luciano Hufschmid", "4-1", "Santi", "GRUPOS COPA TOTAL T22");

agregarResultado("Santi", "1-4", "Luciano Hufschmid", "GRUPOS COPA TOTAL T22");

agregarResultado("Lucas Aguilera", "1-0", "Santi", "GRUPOS COPA TOTAL T22");

agregarResultado("Santi", "0-1", "Lucas Aguilera", "GRUPOS COPA TOTAL T22");

agregarResultado("Luciano Hufschmid", "1-0", "Ignacio Cejas", "GRUPOS COPA TOTAL T22");

agregarResultado("Ignacio Cejas", "0-1", "Luciano Hufschmid", "GRUPOS COPA TOTAL T22");

agregarResultado("Mario Talarico", "4-1", "Cami", "GRUPOS COPA TOTAL T22");

agregarResultado("Cami", "1-4", "Mario Talarico", "GRUPOS COPA TOTAL T22");

agregarResultado("Jhose", "1-0", "Rodri Sebastian", "GRUPOS COPA TOTAL T22");

agregarResultado("Rodri Sebastian", "0-1", "Jhose", "GRUPOS COPA TOTAL T22");

agregarResultado("Cami", "1-0", "Rodri Sebastian", "GRUPOS COPA TOTAL T22");

agregarResultado("Rodri Sebastian", "0-1", "Cami", "GRUPOS COPA TOTAL T22");

agregarResultado("Jhose", "0-0", "Mario Talarico", "GRUPOS COPA TOTAL T22");

agregarResultado("Mario Talarico", "0-0", "Jhose", "GRUPOS COPA TOTAL T22");

agregarResultado("Pancho Muzzio", "1-2", "Ian Gangai", "GRUPOS COPA TOTAL T22");

agregarResultado("Ian Gangai", "2-1", "Pancho Muzzio", "GRUPOS COPA TOTAL T22");

agregarResultado("Tomas Delgado", "1-5", "Anubis", "GRUPOS COPA TOTAL T22");

agregarResultado("Anubis", "5-1", "Tomas Delgado", "GRUPOS COPA TOTAL T22");

agregarResultado("Ian Gangai", "3-4", "Anubis", "GRUPOS COPA TOTAL T22");

agregarResultado("Anubis", "4-3", "Ian Gangai", "GRUPOS COPA TOTAL T22");

agregarResultado("Tomas Delgado", "0-2", "Pancho Muzzio", "GRUPOS COPA TOTAL T22");

agregarResultado("Pancho Muzzio", "2-0", "Tomas Delgado", "GRUPOS COPA TOTAL T22");

agregarResultado("Kevin Sivori", "2-4", "Rodrigo Soca", "GRUPOS COPA TOTAL T22");

agregarResultado("Rodrigo Soca", "4-2", "Kevin Sivori", "GRUPOS COPA TOTAL T22");

agregarResultado("Tomas Torcasio", "1-2", "Marto", "GRUPOS COPA TOTAL T22");

agregarResultado("Marto", "2-1", "Tomas Torcasio", "GRUPOS COPA TOTAL T22");

agregarResultado("Rodrigo Soca", "1-0", "Marto", "GRUPOS COPA TOTAL T22");

agregarResultado("Marto", "0-1", "Rodrigo Soca", "GRUPOS COPA TOTAL T22");

agregarResultado("Tomas Torcasio", "1-4", "Kevin Sivori", "GRUPOS COPA TOTAL T22");

agregarResultado("Kevin Sivori", "4-1", "Tomas Torcasio", "GRUPOS COPA TOTAL T22");

agregarResultado("Rodrigo Talarico", "7-1", "Moreno Perez", "GRUPOS COPA TOTAL T22");

agregarResultado("Moreno Perez", "1-7", "Rodrigo Talarico", "GRUPOS COPA TOTAL T22");

agregarResultado("Lucas Insua", "2-2", "Felipe Galante", "GRUPOS COPA TOTAL T22");

agregarResultado("Felipe Galante", "2-2", "Lucas Insua", "GRUPOS COPA TOTAL T22");

agregarResultado("Moreno Perez", "2-4", "Felipe Galante", "GRUPOS COPA TOTAL T22");

agregarResultado("Felipe Galante", "4-2", "Moreno Perez", "GRUPOS COPA TOTAL T22");

agregarResultado("Lucas Insua", "4-5", "Rodrigo Talarico", "GRUPOS COPA TOTAL T22");

agregarResultado("Rodrigo Talarico", "5-4", "Lucas Insua", "GRUPOS COPA TOTAL T22");

agregarResultado("Joel Alcalde", "2-2", "Gabriel Talarico", "GRUPOS COPA TOTAL T22");

agregarResultado("Gabriel Talarico", "2-2", "Joel Alcalde", "GRUPOS COPA TOTAL T22");

agregarResultado("Bruno Alonso", "1-2", "Veronica Lucchesi", "GRUPOS COPA TOTAL T22");

agregarResultado("Veronica Lucchesi", "2-1", "Bruno Alonso", "GRUPOS COPA TOTAL T22");

agregarResultado("Gabriel Talarico", "0-5", "Veronica Lucchesi", "GRUPOS COPA TOTAL T22");

agregarResultado("Veronica Lucchesi", "5-0", "Gabriel Talarico", "GRUPOS COPA TOTAL T22");

agregarResultado("Bruno Alonso", "0-2", "Joel Alcalde", "GRUPOS COPA TOTAL T22");

agregarResultado("Joel Alcalde", "2-0", "Bruno Alonso", "GRUPOS COPA TOTAL T22");

agregarResultado("Renzo Badano", "1-2", "Fabrizio Escolano", "GRUPOS COPA TOTAL T22");

agregarResultado("Fabrizio Escolano", "2-1", "Renzo Badano", "GRUPOS COPA TOTAL T22");

agregarResultado("Pollo", "2-0", "Ciro Guarch", "GRUPOS COPA TOTAL T22");

agregarResultado("Ciro Guarch", "0-2", "Pollo", "GRUPOS COPA TOTAL T22");

agregarResultado("Fabrizio Escolano", "1-0", "Ciro Guarch", "GRUPOS COPA TOTAL T22");

agregarResultado("Ciro Guarch", "0-1", "Fabrizio Escolano", "GRUPOS COPA TOTAL T22");

agregarResultado("Pollo", "2-0", "Renzo Badano", "GRUPOS COPA TOTAL T22");

agregarResultado("Renzo Badano", "0-2", "Pollo", "GRUPOS COPA TOTAL T22");

agregarResultado("Benja", "4-3", "Nico Avalos", "GRUPOS COPA TOTAL T22");

agregarResultado("Nico Avalos", "3-4", "Benja", "GRUPOS COPA TOTAL T22");

agregarResultado("Yago", "1-5", "Cristian Hantis", "GRUPOS COPA TOTAL T22");

agregarResultado("Cristian Hantis", "5-1", "Yago", "GRUPOS COPA TOTAL T22");

agregarResultado("Cristian Hantis", "2-1", "Nico Avalos", "GRUPOS COPA TOTAL T22");

agregarResultado("Nico Avalos", "1-2", "Cristian Hantis", "GRUPOS COPA TOTAL T22");

agregarResultado("Benja", "2-2", "Dani Bazan", "GRUPOS COPA TOTAL T22");

agregarResultado("Dani Bazan", "2-2", "Benja", "GRUPOS COPA TOTAL T22");

agregarResultado("Lucas Aguilera", "6-3", "Luciano Hufschmid", "GRUPOS COPA TOTAL T22");

agregarResultado("Luciano Hufschmid", "3-6", "Lucas Aguilera", "GRUPOS COPA TOTAL T22");

agregarResultado("Ignacio Cejas", "3-0", "Santi", "GRUPOS COPA TOTAL T22");

agregarResultado("Santi", "0-3", "Ignacio Cejas", "GRUPOS COPA TOTAL T22");

agregarResultado("Lucas Aguilera", "0-1", "Ignacio Cejas", "GRUPOS COPA TOTAL T22");

agregarResultado("Ignacio Cejas", "1-0", "Lucas Aguilera", "GRUPOS COPA TOTAL T22");

agregarResultado("Santi", "4-1", "Luciano Hufschmid", "GRUPOS COPA TOTAL T22");

agregarResultado("Luciano Hufschmid", "1-4", "Santi", "GRUPOS COPA TOTAL T22");

agregarResultado("Cami", "0-0", "Jhose", "GRUPOS COPA TOTAL T22");

agregarResultado("Jhose", "0-0", "Cami", "GRUPOS COPA TOTAL T22");

agregarResultado("Mario Talarico", "1-1", "Rodri Sebastian", "GRUPOS COPA TOTAL T22");

agregarResultado("Rodri Sebastian", "1-1", "Mario Talarico", "GRUPOS COPA TOTAL T22");

agregarResultado("Cami", "1-4", "Mario Talarico", "GRUPOS COPA TOTAL T22");

agregarResultado("Mario Talarico", "4-1", "Cami", "GRUPOS COPA TOTAL T22");

agregarResultado("Rodri Sebastian", "6-9", "Jhose", "GRUPOS COPA TOTAL T22");

agregarResultado("Jhose", "9-6", "Rodri Sebastian", "GRUPOS COPA TOTAL T22");

agregarResultado("Ian Gangai", "0-1", "Tomas Delgado", "GRUPOS COPA TOTAL T22");

agregarResultado("Tomas Delgado", "1-0", "Ian Gangai", "GRUPOS COPA TOTAL T22");

agregarResultado("Pancho Muzzio", "0-1", "Anubis", "GRUPOS COPA TOTAL T22");

agregarResultado("Anubis", "1-0", "Pancho Muzzio", "GRUPOS COPA TOTAL T22");

agregarResultado("Ian Gangai", "4-5", "Pancho Muzzio", "GRUPOS COPA TOTAL T22");

agregarResultado("Pancho Muzzio", "5-4", "Ian Gangai", "GRUPOS COPA TOTAL T22");

agregarResultado("Anubis", "1-1", "Tomas Delgado", "GRUPOS COPA TOTAL T22");

agregarResultado("Tomas Delgado", "1-1", "Anubis", "GRUPOS COPA TOTAL T22");

agregarResultado("Rodrigo Soca", "1-1", "Tomas Torcasio", "GRUPOS COPA TOTAL T22");

agregarResultado("Tomas Torcasio", "1-1", "Rodrigo Soca", "GRUPOS COPA TOTAL T22");

agregarResultado("Kevin Sivori", "4-4", "Marto", "GRUPOS COPA TOTAL T22");

agregarResultado("Marto", "4-4", "Kevin Sivori", "GRUPOS COPA TOTAL T22");

agregarResultado("Rodrigo Soca", "4-3", "Kevin Sivori", "GRUPOS COPA TOTAL T22");

agregarResultado("Kevin Sivori", "3-4", "Rodrigo Soca", "GRUPOS COPA TOTAL T22");

agregarResultado("Marto", "4-7", "Tomas Torcasio", "GRUPOS COPA TOTAL T22");

agregarResultado("Tomas Torcasio", "7-4", "Marto", "GRUPOS COPA TOTAL T22");

agregarResultado("Moreno Perez", "1-5", "Lucas Insua", "GRUPOS COPA TOTAL T22");

agregarResultado("Lucas Insua", "5-1", "Moreno Perez", "GRUPOS COPA TOTAL T22");

agregarResultado("Rodrigo Talarico", "5-1", "Felipe Galante", "GRUPOS COPA TOTAL T22");

agregarResultado("Felipe Galante", "1-5", "Rodrigo Talarico", "GRUPOS COPA TOTAL T22");

agregarResultado("Moreno Perez", "7-1", "Rodrigo Talarico", "GRUPOS COPA TOTAL T22");

agregarResultado("Rodrigo Talarico", "1-7", "Moreno Perez", "GRUPOS COPA TOTAL T22");

agregarResultado("Felipe Galante", "2-4", "Lucas Insua", "GRUPOS COPA TOTAL T22");

agregarResultado("Lucas Insua", "4-2", "Felipe Galante", "GRUPOS COPA TOTAL T22");

agregarResultado("Gabriel Talarico", "1-0", "Bruno Alonso", "GRUPOS COPA TOTAL T22");

agregarResultado("Bruno Alonso", "0-1", "Gabriel Talarico", "GRUPOS COPA TOTAL T22");

agregarResultado("Joel Alcalde", "0-2", "Veronica Lucchesi", "GRUPOS COPA TOTAL T22");

agregarResultado("Veronica Lucchesi", "2-0", "Joel Alcalde", "GRUPOS COPA TOTAL T22");

agregarResultado("Gabriel Talarico", "1-2", "Joel Alcalde", "GRUPOS COPA TOTAL T22");

agregarResultado("Joel Alcalde", "2-1", "Gabriel Talarico", "GRUPOS COPA TOTAL T22");

agregarResultado("Veronica Lucchesi", "5-2", "Bruno Alonso", "GRUPOS COPA TOTAL T22");

agregarResultado("Bruno Alonso", "2-5", "Veronica Lucchesi", "GRUPOS COPA TOTAL T22");

agregarResultado("Fabrizio Escolano", "4-0", "Pollo", "GRUPOS COPA TOTAL T22");

agregarResultado("Pollo", "0-4", "Fabrizio Escolano", "GRUPOS COPA TOTAL T22");

agregarResultado("Renzo Badano", "0-3", "Ciro Guarch", "GRUPOS COPA TOTAL T22");

agregarResultado("Ciro Guarch", "3-0", "Renzo Badano", "GRUPOS COPA TOTAL T22");

agregarResultado("Fabrizio Escolano", "1-3", "Renzo Badano", "GRUPOS COPA TOTAL T22");

agregarResultado("Renzo Badano", "3-1", "Fabrizio Escolano", "GRUPOS COPA TOTAL T22");

agregarResultado("Ciro Guarch", "0-2", "Pollo", "GRUPOS COPA TOTAL T22");

agregarResultado("Pollo", "2-0", "Ciro Guarch", "GRUPOS COPA TOTAL T22");

agregarResultado("Dani Bazan", "1-0", "Nico Avalos", "GRUPOS COPA TOTAL T22");

agregarResultado("Nico Avalos", "0-1", "Dani Bazan", "GRUPOS COPA TOTAL T22");

agregarResultado("Benja", "1-1", "Yago", "GRUPOS COPA TOTAL T22");

agregarResultado("Yago", "1-1", "Benja", "GRUPOS COPA TOTAL T22");

agregarResultado("Lucas Insua", "16-18", "Ignacio Cejas", "SEMIFINALES COPA DUOS 22");

agregarResultado("Ignacio Cejas", "18-16", "Lucas Insua", "SEMIFINALES COPA DUOS 22");

agregarResultado("Lucas Insua", "16-18", "Felipe Galante", "SEMIFINALES COPA DUOS 22");

agregarResultado("Felipe Galante", "18-16", "Lucas Insua", "SEMIFINALES COPA DUOS 22");

agregarResultado("Yago", "16-18", "Ignacio Cejas", "SEMIFINALES COPA DUOS 22");

agregarResultado("Ignacio Cejas", "18-16", "Yago", "SEMIFINALES COPA DUOS 22");

agregarResultado("Yago", "16-18", "Felipe Galante", "SEMIFINALES COPA DUOS 22");

agregarResultado("Felipe Galante", "18-16", "Yago", "SEMIFINALES COPA DUOS 22");

agregarResultado("Moreno Perez", "17-19", "Veronica Lucchesi", "SEMIFINALES COPA DUOS 22");

agregarResultado("Veronica Lucchesi", "19-17", "Moreno Perez", "SEMIFINALES COPA DUOS 22");

agregarResultado("Moreno Perez", "17-19", "Rodrigo Soca", "SEMIFINALES COPA DUOS 22");

agregarResultado("Rodrigo Soca", "19-17", "Moreno Perez", "SEMIFINALES COPA DUOS 22");

agregarResultado("Ian Gangai", "17-19", "Veronica Lucchesi", "SEMIFINALES COPA DUOS 22");

agregarResultado("Veronica Lucchesi", "19-17", "Ian Gangai", "SEMIFINALES COPA DUOS 22");

agregarResultado("Ian Gangai", "17-19", "Rodrigo Soca", "SEMIFINALES COPA DUOS 22");

agregarResultado("Rodrigo Soca", "19-17", "Ian Gangai", "SEMIFINALES COPA DUOS 22");

agregarResultado("Ignacio Cejas", "15-13", "Veronica Lucchesi", "FINAL COPA DUOS 22");

agregarResultado("Veronica Lucchesi", "13-15", "Ignacio Cejas", "FINAL COPA DUOS 22");

agregarResultado("Ignacio Cejas", "15-13", "Rodrigo Soca", "FINAL COPA DUOS 22");

agregarResultado("Rodrigo Soca", "13-15", "Ignacio Cejas", "FINAL COPA DUOS 22");

agregarResultado("Felipe Galante", "15-13", "Veronica Lucchesi", "FINAL COPA DUOS 22");

agregarResultado("Veronica Lucchesi", "13-15", "Felipe Galante", "FINAL COPA DUOS 22");

agregarResultado("Felipe Galante", "15-13", "Rodrigo Soca", "FINAL COPA DUOS 22");

agregarResultado("Rodrigo Soca", "13-15", "Felipe Galante", "FINAL COPA DUOS 22");

agregarResultado("Pancho Muzzio", "7-12", "Pollo", "32AVOS DE FINAL COPA CAMPEONES T22");

agregarResultado("Pollo", "12-7", "Pancho Muzzio", "32AVOS DE FINAL COPA CAMPEONES T22");

agregarResultado("Jhose", "7-13", "Luciano Hufschmid", "32AVOS DE FINAL COPA CAMPEONES T22");

agregarResultado("Luciano Hufschmid", "13-7", "Jhose", "32AVOS DE FINAL COPA CAMPEONES T22");

agregarResultado("Mario Talarico", "10-8", "Nico Avalos", "32AVOS DE FINAL COPA CAMPEONES T22");

agregarResultado("Nico Avalos", "8-10", "Mario Talarico", "32AVOS DE FINAL COPA CAMPEONES T22");

agregarResultado("Pollo", "4-2", "Cami", "16AVOS DE FINAL COPA CAMPEONES T22");

agregarResultado("Cami", "2-4", "Pollo", "16AVOS DE FINAL COPA CAMPEONES T22");

agregarResultado("Luciano Hufschmid", "5-5", "Mario Talarico", "16AVOS DE FINAL COPA CAMPEONES T22");

agregarResultado("Mario Talarico", "5-5", "Luciano Hufschmid", "16AVOS DE FINAL COPA CAMPEONES T22");

agregarResultado("Luciano Hufschmid", "3-0", "Mario Talarico", "DESEMPATE 16AVOS DE FINAL COPA CAMPEONES T22");

agregarResultado("Mario Talarico", "0-3", "Luciano Hufschmid", "DESEMPATE 16AVOS DE FINAL COPA CAMPEONES T22");

agregarResultado("Pollo", "10-15", "Tomas Delgado", "OCTAVOS DE FINAL COPA CAMPEONES T22");

agregarResultado("Tomas Delgado", "15-10", "Pollo", "OCTAVOS DE FINAL COPA CAMPEONES T22");

agregarResultado("Luciano Hufschmid", "10-13", "Moreno Perez", "OCTAVOS DE FINAL COPA CAMPEONES T22");

agregarResultado("Moreno Perez", "13-10", "Luciano Hufschmid", "OCTAVOS DE FINAL COPA CAMPEONES T22");

agregarResultado("Yago", "10-14", "Felipe Galante", "OCTAVOS DE FINAL COPA CAMPEONES T22");

agregarResultado("Felipe Galante", "14-10", "Yago", "OCTAVOS DE FINAL COPA CAMPEONES T22");

agregarResultado("Tomas Delgado", "8-9", "Fabrizio Escolano", "CUARTOS DE FINAL COPA CAMPEONES T22");

agregarResultado("Fabrizio Escolano", "9-8", "Tomas Delgado", "CUARTOS DE FINAL COPA CAMPEONES T22");

agregarResultado("Felipe Galante", "8-8", "Moreno Perez", "CUARTOS DE FINAL COPA CAMPEONES T22");

agregarResultado("Moreno Perez", "8-8", "Felipe Galante", "CUARTOS DE FINAL COPA CAMPEONES T22");

agregarResultado("Felipe Galante", "0-4", "Moreno Perez", "DESEMPATE CUARTOS DE FINAL COPA CAMPEONES T22");

agregarResultado("Moreno Perez", "4-0", "Felipe Galante", "DESEMPATE CUARTOS DE FINAL COPA CAMPEONES T22");

agregarResultado("Fabrizio Escolano", "6-0", "Lucas Aguilera", "SEMIFINAL COPA CAMPEONES T22");

agregarResultado("Lucas Aguilera", "0-6", "Fabrizio Escolano", "SEMIFINAL COPA CAMPEONES T22");

agregarResultado("Moreno Perez", "9-6", "Rodrigo Soca", "SEMIFINAL COPA CAMPEONES T22");

agregarResultado("Rodrigo Soca", "6-9", "Moreno Perez", "SEMIFINAL COPA CAMPEONES T22");

agregarResultado("Fabrizio Escolano", "10-4", "Moreno Perez", "FINAL COPA CAMPEONES T22");

agregarResultado("Moreno Perez", "4-10", "Fabrizio Escolano", "FINAL COPA CAMPEONES T22");

agregarResultado("Gabriel Talarico", "12-13", "Pollo", "SEMIFINAL SUPERCOPA EUROAMERICA T22");

agregarResultado("Pollo", "13-12", "Gabriel Talarico", "SEMIFINAL SUPERCOPA EUROAMERICA T22");

agregarResultado("Fabrizio Escolano", "6-6", "Rodrigo Soca", "SEMIFINAL SUPERCOPA EUROAMERICA T22");

agregarResultado("Rodrigo Soca", "6-6", "Fabrizio Escolano", "SEMIFINAL SUPERCOPA EUROAMERICA T22");

agregarResultado("Fabrizio Escolano", "5-7", "Rodrigo Soca", "DESEMPATE SEMIFINAL SUPERCOPA EUROAMERICA T22");

agregarResultado("Rodrigo Soca", "7-5", "Fabrizio Escolano", "DESEMPATE SEMIFINAL SUPERCOPA EUROAMERICA T22");

agregarResultado("Pollo", "7-7", "Rodrigo Soca", "FINAL SUPERCOPA EUROAMERICA T22");

agregarResultado("Rodrigo Soca", "7-7", "Pollo", "FINAL SUPERCOPA EUROAMERICA T22");

agregarResultado("Pollo", "4-3", "Rodrigo Soca", "DESEMPATE FINAL SUPERCOPA EUROAMERICA T22");

agregarResultado("Rodrigo Soca", "3-4", "Pollo", "DESEMPATE FINAL SUPERCOPA EUROAMERICA T22");

agregarResultado("Felipe Galante", "6-3", "Kevin Sivori", "PROMOCION T22");

agregarResultado("Kevin Sivori", "3-6", "Felipe Galante", "PROMOCION T22");

agregarResultado("Lucas Aguilera", "8-4", "Ignacio Cejas", "PROMOCION T22");

agregarResultado("Ignacio Cejas", "4-8", "Lucas Aguilera", "PROMOCION T22");

agregarResultado("Yago", "8-4", "Bruno Alonso", "OCTAVOS DE FINAL COPA A T23");

agregarResultado("Bruno Alonso", "4-8", "Yago", "OCTAVOS DE FINAL COPA A T23");

agregarResultado("Lucas Aguilera", "8-9", "Gabriel Talarico", "OCTAVOS DE FINAL COPA A T23");

agregarResultado("Gabriel Talarico", "9-8", "Lucas Aguilera", "OCTAVOS DE FINAL COPA A T23");

agregarResultado("Fabrizio Escolano", "5-5", "Cami", "OCTAVOS DE FINAL COPA A T23");

agregarResultado("Cami", "5-5", "Fabrizio Escolano", "OCTAVOS DE FINAL COPA A T23");

agregarResultado("Pancho Muzzio", "11-6", "Jhose", "OCTAVOS DE FINAL COPA A T23");

agregarResultado("Jhose", "6-11", "Pancho Muzzio", "OCTAVOS DE FINAL COPA A T23");

agregarResultado("Fabrizio Escolano", "2-3", "Cami", "DESEMPATE OCTAVOS DE FINAL COPA A T23");

agregarResultado("Cami", "3-2", "Fabrizio Escolano", "DESEMPATE OCTAVOS DE FINAL COPA A T23");

agregarResultado("Yago", "3-7", "Luciano Hufschmid", "CUARTOS DE FINAL COPA A T23");

agregarResultado("Luciano Hufschmid", "7-3", "Yago", "CUARTOS DE FINAL COPA A T23");

agregarResultado("Gabriel Talarico", "9-5", "Pollo", "CUARTOS DE FINAL COPA A T23");

agregarResultado("Pollo", "5-9", "Gabriel Talarico", "CUARTOS DE FINAL COPA A T23");

agregarResultado("Cami", "7-5", "Rodrigo Talarico", "CUARTOS DE FINAL COPA A T23");

agregarResultado("Rodrigo Talarico", "5-7", "Cami", "CUARTOS DE FINAL COPA A T23");

agregarResultado("Pancho Muzzio", "8-5", "Rodrigo Soca", "CUARTOS DE FINAL COPA A T23");

agregarResultado("Rodrigo Soca", "5-8", "Pancho Muzzio", "CUARTOS DE FINAL COPA A T23");

agregarResultado("Joel Alcalde", "3-6", "Veronica Lucchesi", "CUARTOS DE FINAL COPA B T23");

agregarResultado("Veronica Lucchesi", "6-3", "Joel Alcalde", "CUARTOS DE FINAL COPA B T23");

agregarResultado("Kevin Sivori", "3-4", "Ignacio Cejas", "CUARTOS DE FINAL COPA B T23");

agregarResultado("Ignacio Cejas", "4-3", "Kevin Sivori", "CUARTOS DE FINAL COPA B T23");

agregarResultado("Benja", "5-0", "Dani Bazan", "CUARTOS DE FINAL COPA B T23");

agregarResultado("Dani Bazan", "0-5", "Benja", "CUARTOS DE FINAL COPA B T23");

agregarResultado("Marto", "3-5", "Lucas Insua", "CUARTOS DE FINAL COPA B T23");

agregarResultado("Lucas Insua", "5-3", "Marto", "CUARTOS DE FINAL COPA B T23");

agregarResultado("Renzo Badano", "1-7", "Benja", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Benja", "7-1", "Renzo Badano", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Cami", "4-7", "Kevin Sivori", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Kevin Sivori", "7-4", "Cami", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Kevin Sivori", "1-3", "Benja", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Benja", "3-1", "Kevin Sivori", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Renzo Badano", "1-4", "Cami", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Cami", "4-1", "Renzo Badano", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Pancho Muzzio", "9-4", "Marto", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Marto", "4-9", "Pancho Muzzio", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Lucas Insua", "2-6", "Fabrizio Escolano", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Fabrizio Escolano", "6-2", "Lucas Insua", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Fabrizio Escolano", "7-1", "Marto", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Marto", "1-7", "Fabrizio Escolano", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Pancho Muzzio", "0-1", "Lucas Insua", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Lucas Insua", "1-0", "Pancho Muzzio", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Joel Alcalde", "8-2", "Santi", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Santi", "2-8", "Joel Alcalde", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Ian Gangai", "0-7", "Rodrigo Soca", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Rodrigo Soca", "7-0", "Ian Gangai", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Rodrigo Soca", "4-2", "Santi", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Santi", "2-4", "Rodrigo Soca", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Joel Alcalde", "1-0", "Ian Gangai", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Ian Gangai", "0-1", "Joel Alcalde", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Tomas Torcasio", "3-1", "Veronica Lucchesi", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Veronica Lucchesi", "1-3", "Tomas Torcasio", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Jhose", "6-4", "Moreno Perez", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Moreno Perez", "4-6", "Jhose", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Moreno Perez", "4-4", "Veronica Lucchesi", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Veronica Lucchesi", "4-4", "Moreno Perez", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Tomas Torcasio", "2-6", "Jhose", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Jhose", "6-2", "Tomas Torcasio", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Felipe Galante", "1-0", "Ciro Guarch", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Ciro Guarch", "0-1", "Felipe Galante", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Yago", "12-7", "Nico Avalos", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Nico Avalos", "7-12", "Yago", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Nico Avalos", "3-0", "Ciro Guarch", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Ciro Guarch", "0-3", "Nico Avalos", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Felipe Galante", "4-7", "Yago", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Yago", "7-4", "Felipe Galante", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Tomas Delgado", "0-2", "Dani Bazan", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Dani Bazan", "2-0", "Tomas Delgado", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Luciano Hufschmid", "10-6", "Pollo", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Pollo", "6-10", "Luciano Hufschmid", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Pollo", "5-4", "Dani Bazan", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Dani Bazan", "4-5", "Pollo", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Tomas Delgado", "0-6", "Luciano Hufschmid", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Luciano Hufschmid", "6-0", "Tomas Delgado", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Mario Talarico", "0-0", "Anubis", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Anubis", "0-0", "Mario Talarico", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Rodrigo Talarico", "5-10", "Lucas Aguilera", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Lucas Aguilera", "10-5", "Rodrigo Talarico", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Lucas Aguilera", "1-0", "Anubis", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Anubis", "0-1", "Lucas Aguilera", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Mario Talarico", "0-5", "Rodrigo Talarico", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Rodrigo Talarico", "5-0", "Mario Talarico", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Ignacio Cejas", "1-2", "Cristian Hantis", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Cristian Hantis", "2-1", "Ignacio Cejas", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Bruno Alonso", "2-4", "Gabriel Talarico", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Gabriel Talarico", "4-2", "Bruno Alonso", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Gabriel Talarico", "4-1", "Cristian Hantis", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Cristian Hantis", "1-4", "Gabriel Talarico", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Ignacio Cejas", "4-4", "Bruno Alonso", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Bruno Alonso", "4-4", "Ignacio Cejas", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Cami", "3-2", "Benja", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Benja", "2-3", "Cami", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Kevin Sivori", "2-3", "Renzo Badano", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Renzo Badano", "3-2", "Kevin Sivori", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Benja", "1-0", "Renzo Badano", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Renzo Badano", "0-1", "Benja", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Kevin Sivori", "0-3", "Cami", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Cami", "3-0", "Kevin Sivori", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Lucas Insua", "0-2", "Marto", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Marto", "2-0", "Lucas Insua", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Fabrizio Escolano", "2-2", "Pancho Muzzio", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Pancho Muzzio", "2-2", "Fabrizio Escolano", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Marto", "2-1", "Pancho Muzzio", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Pancho Muzzio", "1-2", "Marto", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Fabrizio Escolano", "0-4", "Lucas Insua", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Lucas Insua", "4-0", "Fabrizio Escolano", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Ian Gangai", "0-1", "Santi", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Santi", "1-0", "Ian Gangai", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Rodrigo Soca", "2-2", "Joel Alcalde", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Joel Alcalde", "2-2", "Rodrigo Soca", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Santi", "3-0", "Joel Alcalde", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Joel Alcalde", "0-3", "Santi", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Rodrigo Soca", "0-0", "Ian Gangai", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Ian Gangai", "0-0", "Rodrigo Soca", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Jhose", "0-2", "Veronica Lucchesi", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Veronica Lucchesi", "2-0", "Jhose", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Moreno Perez", "5-1", "Tomas Torcasio", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Tomas Torcasio", "1-5", "Moreno Perez", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Veronica Lucchesi", "0-0", "Tomas Torcasio", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Tomas Torcasio", "0-0", "Veronica Lucchesi", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Moreno Perez", "0-0", "Jhose", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Jhose", "0-0", "Moreno Perez", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Yago", "1-0", "Ciro Guarch", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Ciro Guarch", "0-1", "Yago", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Nico Avalos", "2-5", "Felipe Galante", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Felipe Galante", "5-2", "Nico Avalos", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Ciro Guarch", "0-0", "Felipe Galante", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Felipe Galante", "0-0", "Ciro Guarch", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Nico Avalos", "0-1", "Yago", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Yago", "1-0", "Nico Avalos", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Luciano Hufschmid", "2-4", "Dani Bazan", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Dani Bazan", "4-2", "Luciano Hufschmid", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Pollo", "5-0", "Tomas Delgado", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Tomas Delgado", "0-5", "Pollo", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Dani Bazan", "1-3", "Tomas Delgado", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Tomas Delgado", "3-1", "Dani Bazan", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Pollo", "3-4", "Luciano Hufschmid", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Luciano Hufschmid", "4-3", "Pollo", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Rodrigo Talarico", "6-0", "Anubis", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Anubis", "0-6", "Rodrigo Talarico", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Lucas Aguilera", "1-0", "Mario Talarico", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Mario Talarico", "0-1", "Lucas Aguilera", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Anubis", "4-1", "Mario Talarico", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Mario Talarico", "1-4", "Anubis", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Lucas Aguilera", "0-4", "Rodrigo Talarico", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Rodrigo Talarico", "4-0", "Lucas Aguilera", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Bruno Alonso", "4-1", "Cristian Hantis", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Cristian Hantis", "1-4", "Bruno Alonso", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Gabriel Talarico", "1-2", "Ignacio Cejas", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Ignacio Cejas", "2-1", "Gabriel Talarico", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Cristian Hantis", "0-0", "Ignacio Cejas", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Ignacio Cejas", "0-0", "Cristian Hantis", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Gabriel Talarico", "1-1", "Bruno Alonso", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Bruno Alonso", "1-1", "Gabriel Talarico", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Benja", "6-5", "Kevin Sivori", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Kevin Sivori", "5-6", "Benja", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Cami", "6-4", "Renzo Badano", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Renzo Badano", "4-6", "Cami", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Benja", "1-1", "Cami", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Cami", "1-1", "Benja", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Renzo Badano", "1-1", "Kevin Sivori", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Kevin Sivori", "1-1", "Renzo Badano", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Marto", "6-4", "Fabrizio Escolano", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Fabrizio Escolano", "4-6", "Marto", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Lucas Insua", "3-9", "Pancho Muzzio", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Pancho Muzzio", "9-3", "Lucas Insua", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Marto", "1-1", "Lucas Insua", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Lucas Insua", "1-1", "Marto", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Pancho Muzzio", "1-0", "Fabrizio Escolano", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Fabrizio Escolano", "0-1", "Pancho Muzzio", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Santi", "1-10", "Rodrigo Soca", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Rodrigo Soca", "10-1", "Santi", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Ian Gangai", "0-6", "Joel Alcalde", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Joel Alcalde", "6-0", "Ian Gangai", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Santi", "4-0", "Ian Gangai", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Ian Gangai", "0-4", "Santi", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Joel Alcalde", "0-1", "Rodrigo Soca", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Rodrigo Soca", "1-0", "Joel Alcalde", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Veronica Lucchesi", "2-0", "Moreno Perez", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Moreno Perez", "0-2", "Veronica Lucchesi", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Jhose", "5-1", "Tomas Torcasio", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Tomas Torcasio", "1-5", "Jhose", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Veronica Lucchesi", "0-3", "Jhose", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Jhose", "3-0", "Veronica Lucchesi", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Tomas Torcasio", "2-3", "Moreno Perez", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Moreno Perez", "3-2", "Tomas Torcasio", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Ciro Guarch", "0-4", "Nico Avalos", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Nico Avalos", "4-0", "Ciro Guarch", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Yago", "4-3", "Felipe Galante", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Felipe Galante", "3-4", "Yago", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Ciro Guarch", "0-1", "Yago", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Yago", "1-0", "Ciro Guarch", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Felipe Galante", "1-2", "Nico Avalos", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Nico Avalos", "2-1", "Felipe Galante", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Dani Bazan", "1-2", "Pollo", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Pollo", "2-1", "Dani Bazan", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Luciano Hufschmid", "3-4", "Tomas Delgado", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Tomas Delgado", "4-3", "Luciano Hufschmid", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Dani Bazan", "0-0", "Luciano Hufschmid", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Luciano Hufschmid", "0-0", "Dani Bazan", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Tomas Delgado", "4-1", "Pollo", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Pollo", "1-4", "Tomas Delgado", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Anubis", "4-7", "Lucas Aguilera", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Lucas Aguilera", "7-4", "Anubis", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Rodrigo Talarico", "6-0", "Mario Talarico", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Mario Talarico", "0-6", "Rodrigo Talarico", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Anubis", "1-1", "Rodrigo Talarico", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Rodrigo Talarico", "1-1", "Anubis", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Mario Talarico", "2-0", "Lucas Aguilera", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Lucas Aguilera", "0-2", "Mario Talarico", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Cristian Hantis", "3-5", "Gabriel Talarico", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Gabriel Talarico", "5-3", "Cristian Hantis", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Bruno Alonso", "0-4", "Ignacio Cejas", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Ignacio Cejas", "4-0", "Bruno Alonso", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Cristian Hantis", "4-1", "Bruno Alonso", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Bruno Alonso", "1-4", "Cristian Hantis", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Ignacio Cejas", "4-1", "Gabriel Talarico", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Gabriel Talarico", "1-4", "Ignacio Cejas", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Gabriel Talarico", "9-16", "Pollo", "32AVOS DE FINAL COPA CAMPEONES T23");

agregarResultado("Pollo", "16-9", "Gabriel Talarico", "32AVOS DE FINAL COPA CAMPEONES T23");

agregarResultado("Fabrizio Escolano", "15-11", "Pancho Muzzio", "32AVOS DE FINAL COPA CAMPEONES T23");

agregarResultado("Pancho Muzzio", "11-15", "Fabrizio Escolano", "32AVOS DE FINAL COPA CAMPEONES T23");

agregarResultado("Rodrigo Talarico", "16-13", "Moreno Perez", "32AVOS DE FINAL COPA CAMPEONES T23");

agregarResultado("Moreno Perez", "13-16", "Rodrigo Talarico", "32AVOS DE FINAL COPA CAMPEONES T23");

agregarResultado("Pollo", "6-10", "Cami", "16AVOS DE FINAL COPA CAMPEONES T23");

agregarResultado("Cami", "10-6", "Pollo", "16AVOS DE FINAL COPA CAMPEONES T23");

agregarResultado("Fabrizio Escolano", "4-11", "Rodrigo Talarico", "16AVOS DE FINAL COPA CAMPEONES T23");

agregarResultado("Rodrigo Talarico", "11-4", "Fabrizio Escolano", "16AVOS DE FINAL COPA CAMPEONES T23");

agregarResultado("Cami", "5-0", "Ignacio Cejas", "OCTAVOS DE FINAL COPA CAMPEONES T23");

agregarResultado("Ignacio Cejas", "0-5", "Cami", "OCTAVOS DE FINAL COPA CAMPEONES T23");

agregarResultado("Rodrigo Talarico", "8-5", "Felipe Galante", "OCTAVOS DE FINAL COPA CAMPEONES T23");

agregarResultado("Felipe Galante", "5-8", "Rodrigo Talarico", "OCTAVOS DE FINAL COPA CAMPEONES T23");

agregarResultado("Nico Avalos", "8-4", "Luciano Hufschmid", "OCTAVOS DE FINAL COPA CAMPEONES T23");

agregarResultado("Luciano Hufschmid", "4-8", "Nico Avalos", "OCTAVOS DE FINAL COPA CAMPEONES T23");

agregarResultado("Cami", "7-3", "Yago", "CUARTOS DE FINAL COPA CAMPEONES T23");

agregarResultado("Yago", "3-7", "Cami", "CUARTOS DE FINAL COPA CAMPEONES T23");

agregarResultado("Rodrigo Talarico", "5-3", "Nico Avalos", "CUARTOS DE FINAL COPA CAMPEONES T23");

agregarResultado("Nico Avalos", "3-5", "Rodrigo Talarico", "CUARTOS DE FINAL COPA CAMPEONES T23");

agregarResultado("Benja", "4-7", "Joel Alcalde", "OCTAVOS DE FINAL COPA TOTAL T23");

agregarResultado("Joel Alcalde", "7-4", "Benja", "OCTAVOS DE FINAL COPA TOTAL T23");

agregarResultado("Rodrigo Talarico", "8-8", "Nico Avalos", "OCTAVOS DE FINAL COPA TOTAL T23");

agregarResultado("Nico Avalos", "8-8", "Rodrigo Talarico", "OCTAVOS DE FINAL COPA TOTAL T23");

agregarResultado("Ignacio Cejas", "0-11", "Marto", "OCTAVOS DE FINAL COPA TOTAL T23");

agregarResultado("Marto", "11-0", "Ignacio Cejas", "OCTAVOS DE FINAL COPA TOTAL T23");

agregarResultado("Yago", "8-5", "Pollo", "OCTAVOS DE FINAL COPA TOTAL T23");

agregarResultado("Pollo", "5-8", "Yago", "OCTAVOS DE FINAL COPA TOTAL T23");

agregarResultado("Luciano Hufschmid", "4-5", "Cami", "OCTAVOS DE FINAL COPA TOTAL T23");

agregarResultado("Cami", "5-4", "Luciano Hufschmid", "OCTAVOS DE FINAL COPA TOTAL T23");

agregarResultado("Rodrigo Soca", "12-6", "Moreno Perez", "OCTAVOS DE FINAL COPA TOTAL T23");

agregarResultado("Moreno Perez", "6-12", "Rodrigo Soca", "OCTAVOS DE FINAL COPA TOTAL T23");

agregarResultado("Jhose", "6-8", "Lucas Aguilera", "OCTAVOS DE FINAL COPA TOTAL T23");

agregarResultado("Lucas Aguilera", "8-6", "Jhose", "OCTAVOS DE FINAL COPA TOTAL T23");

agregarResultado("Pancho Muzzio", "11-9", "Gabriel Talarico", "OCTAVOS DE FINAL COPA TOTAL T23");

agregarResultado("Gabriel Talarico", "9-11", "Pancho Muzzio", "OCTAVOS DE FINAL COPA TOTAL T23");

agregarResultado("Rodrigo Talarico", "2-2", "Nico Avalos", "DESEMPATE OCTAVOS COPA TOTAL T23");

agregarResultado("Nico Avalos", "2-2", "Rodrigo Talarico", "DESEMPATE OCTAVOS COPA TOTAL T23");

agregarResultado("Rodrigo Talarico", "4-4", "Nico Avalos", "DESEMPATE 2 OCTAVOS COPA TOTAL T23");

agregarResultado("Nico Avalos", "4-4", "Rodrigo Talarico", "DESEMPATE 2 OCTAVOS COPA TOTAL T23");

agregarResultado("Rodrigo Talarico", "1-0", "Nico Avalos", "DESEMPATE 3 OCTAVOS COPA TOTAL T23");

agregarResultado("Nico Avalos", "0-1", "Rodrigo Talarico", "DESEMPATE 3 OCTAVOS COPA TOTAL T23");

agregarResultado("Lucas Aguilera", "5-3", "Joel Alcalde", "CUARTOS DE FINAL COPA TOTAL T23");

agregarResultado("Joel Alcalde", "3-5", "Lucas Aguilera", "CUARTOS DE FINAL COPA TOTAL T23");

agregarResultado("Rodrigo Talarico", "5-8", "Pancho Muzzio", "CUARTOS DE FINAL COPA TOTAL T23");

agregarResultado("Pancho Muzzio", "8-5", "Rodrigo Talarico", "CUARTOS DE FINAL COPA TOTAL T23");

agregarResultado("Marto", "3-7", "Cami", "CUARTOS DE FINAL COPA TOTAL T23");

agregarResultado("Cami", "7-3", "Marto", "CUARTOS DE FINAL COPA TOTAL T23");

agregarResultado("Rodrigo Soca", "5-3", "Yago", "CUARTOS DE FINAL COPA TOTAL T23");

agregarResultado("Yago", "3-5", "Rodrigo Soca", "CUARTOS DE FINAL COPA TOTAL T23");

agregarResultado("Mario Talarico", "16-10", "Yago", "OCTAVOS DE FINAL COPA TOTAL T22");

agregarResultado("Yago", "10-16", "Mario Talarico", "OCTAVOS DE FINAL COPA TOTAL T22");

agregarResultado("Rodrigo Soca", "15-14", "Fabrizio Escolano", "OCTAVOS DE FINAL COPA TOTAL T22");

agregarResultado("Fabrizio Escolano", "14-15", "Rodrigo Soca", "OCTAVOS DE FINAL COPA TOTAL T22");

agregarResultado("Benja", "5-19", "Jhose", "OCTAVOS DE FINAL COPA TOTAL T22");

agregarResultado("Jhose", "19-5", "Benja", "OCTAVOS DE FINAL COPA TOTAL T22");

agregarResultado("Veronica Lucchesi", "12-15", "Ignacio Cejas", "OCTAVOS DE FINAL COPA TOTAL T22");

agregarResultado("Ignacio Cejas", "15-12", "Veronica Lucchesi", "OCTAVOS DE FINAL COPA TOTAL T22");

agregarResultado("Luciano Hufschmid", "10-14", "Kevin Sivori", "OCTAVOS DE FINAL COPA TOTAL T22");

agregarResultado("Kevin Sivori", "14-10", "Luciano Hufschmid", "OCTAVOS DE FINAL COPA TOTAL T22");

agregarResultado("Pancho Muzzio", "13-16", "Lucas Insua", "OCTAVOS DE FINAL COPA TOTAL T22");

agregarResultado("Lucas Insua", "16-13", "Pancho Muzzio", "OCTAVOS DE FINAL COPA TOTAL T22");

agregarResultado("Pollo", "10-12", "Gabriel Talarico", "OCTAVOS DE FINAL COPA TOTAL T22");

agregarResultado("Gabriel Talarico", "12-10", "Pollo", "OCTAVOS DE FINAL COPA TOTAL T22");

agregarResultado("Rodrigo Talarico", "20-0", "Anubis", "OCTAVOS DE FINAL COPA TOTAL T22");

agregarResultado("Anubis", "0-20", "Rodrigo Talarico", "OCTAVOS DE FINAL COPA TOTAL T22");

agregarResultado("Rodrigo Talarico", "4-10", "Lucas Insua", "CUARTOS DE FINAL COPA TOTAL T22");

agregarResultado("Lucas Insua", "10-4", "Rodrigo Talarico", "CUARTOS DE FINAL COPA TOTAL T22");

agregarResultado("Mario Talarico", "8-11", "Ignacio Cejas", "CUARTOS DE FINAL COPA TOTAL T22");

agregarResultado("Ignacio Cejas", "11-8", "Mario Talarico", "CUARTOS DE FINAL COPA TOTAL T22");

agregarResultado("Kevin Sivori", "8-3", "Gabriel Talarico", "CUARTOS DE FINAL COPA TOTAL T22");

agregarResultado("Gabriel Talarico", "3-8", "Kevin Sivori", "CUARTOS DE FINAL COPA TOTAL T22");

agregarResultado("Jhose", "8-6", "Rodrigo Soca", "CUARTOS DE FINAL COPA TOTAL T22");

agregarResultado("Rodrigo Soca", "6-8", "Jhose", "CUARTOS DE FINAL COPA TOTAL T22");

agregarResultado("Kevin Sivori", "9-3", "Jhose", "SEMIFINALES COPA TOTAL T22");

agregarResultado("Jhose", "3-9", "Kevin Sivori", "SEMIFINALES COPA TOTAL T22");

agregarResultado("Lucas Insua", "6-9", "Ignacio Cejas", "SEMIFINALES COPA TOTAL T22");

agregarResultado("Ignacio Cejas", "9-6", "Lucas Insua", "SEMIFINALES COPA TOTAL T22");

agregarResultado("Kevin Sivori", "9-6", "Ignacio Cejas", "FINAL COPA TOTAL T22");

agregarResultado("Ignacio Cejas", "6-9", "Kevin Sivori", "FINAL COPA TOTAL T22");

agregarResultado("Jhose", "11-4", "Veronica Lucchesi", "PROMOCION T23");

agregarResultado("Veronica Lucchesi", "4-11", "Jhose", "PROMOCION T23");

agregarResultado("Renzo Badano", "11-6", "Joel Alcalde", "PROMOCION T23");

agregarResultado("Joel Alcalde", "6-11", "Renzo Badano", "PROMOCION T23");

agregarResultado("Yago", "8-4", "Bruno Alonso", "OCTAVOS DE FINAL COPA A T23");

agregarResultado("Bruno Alonso", "4-8", "Yago", "OCTAVOS DE FINAL COPA A T23");

agregarResultado("Lucas Aguilera", "8-9", "Gabriel Talarico", "OCTAVOS DE FINAL COPA A T23");

agregarResultado("Gabriel Talarico", "9-8", "Lucas Aguilera", "OCTAVOS DE FINAL COPA A T23");

agregarResultado("Fabrizio Escolano", "5-5", "Cami", "OCTAVOS DE FINAL COPA A T23");

agregarResultado("Cami", "5-5", "Fabrizio Escolano", "OCTAVOS DE FINAL COPA A T23");

agregarResultado("Pancho Muzzio", "11-6", "Jhose", "OCTAVOS DE FINAL COPA A T23");

agregarResultado("Jhose", "6-11", "Pancho Muzzio", "OCTAVOS DE FINAL COPA A T23");

agregarResultado("Fabrizio Escolano", "2-3", "Cami", "DESEMPATE OCTAVOS DE FINAL COPA A T23");

agregarResultado("Cami", "3-2", "Fabrizio Escolano", "DESEMPATE OCTAVOS DE FINAL COPA A T23");

agregarResultado("Yago", "3-7", "Luciano Hufschmid", "CUARTOS DE FINAL COPA A T23");

agregarResultado("Luciano Hufschmid", "7-3", "Yago", "CUARTOS DE FINAL COPA A T23");

agregarResultado("Gabriel Talarico", "9-5", "Pollo", "CUARTOS DE FINAL COPA A T23");

agregarResultado("Pollo", "5-9", "Gabriel Talarico", "CUARTOS DE FINAL COPA A T23");

agregarResultado("Cami", "7-5", "Rodrigo Talarico", "CUARTOS DE FINAL COPA A T23");

agregarResultado("Rodrigo Talarico", "5-7", "Cami", "CUARTOS DE FINAL COPA A T23");

agregarResultado("Pancho Muzzio", "8-5", "Rodrigo Soca", "CUARTOS DE FINAL COPA A T23");

agregarResultado("Rodrigo Soca", "5-8", "Pancho Muzzio", "CUARTOS DE FINAL COPA A T23");

agregarResultado("Cami", "9-8", "Gabriel Talarico", "SEMIFINAL COPA A T23");

agregarResultado("Gabriel Talarico", "8-9", "Cami", "SEMIFINAL COPA A T23");

agregarResultado("Pancho Muzzio", "1-4", "Luciano Hufschmid", "SEMIFINAL COPA A T23");

agregarResultado("Luciano Hufschmid", "4-1", "Pancho Muzzio", "SEMIFINAL COPA A T23");

agregarResultado("Cami", "6-11", "Luciano Hufschmid", "FINAL COPA A T23");

agregarResultado("Luciano Hufschmid", "11-6", "Cami", "FINAL COPA A T23");

agregarResultado("Joel Alcalde", "3-6", "Veronica Lucchesi", "CUARTOS DE FINAL COPA B T23");

agregarResultado("Veronica Lucchesi", "6-3", "Joel Alcalde", "CUARTOS DE FINAL COPA B T23");

agregarResultado("Kevin Sivori", "3-4", "Ignacio Cejas", "CUARTOS DE FINAL COPA B T23");

agregarResultado("Ignacio Cejas", "4-3", "Kevin Sivori", "CUARTOS DE FINAL COPA B T23");

agregarResultado("Benja", "5-0", "Dani Bazan", "CUARTOS DE FINAL COPA B T23");

agregarResultado("Dani Bazan", "0-5", "Benja", "CUARTOS DE FINAL COPA B T23");

agregarResultado("Marto", "3-5", "Lucas Insua", "CUARTOS DE FINAL COPA B T23");

agregarResultado("Lucas Insua", "5-3", "Marto", "CUARTOS DE FINAL COPA B T23");

agregarResultado("Benja", "9-4", "Veronica Lucchesi", "SEMIFINAL COPA B T23");

agregarResultado("Veronica Lucchesi", "4-9", "Benja", "SEMIFINAL COPA B T23");

agregarResultado("Lucas Insua", "7-9", "Ignacio Cejas", "SEMIFINAL COPA B T23");

agregarResultado("Ignacio Cejas", "9-7", "Lucas Insua", "SEMIFINAL COPA B T23");

agregarResultado("Benja", "8-8", "Ignacio Cejas", "FINAL COPA B T23");

agregarResultado("Ignacio Cejas", "8-8", "Benja", "FINAL COPA B T23");

agregarResultado("Benja", "1-0", "Ignacio Cejas", "DESEMPATE FINAL COPA B T23");

agregarResultado("Ignacio Cejas", "0-1", "Benja", "DESEMPATE FINAL COPA B T23");

agregarResultado("Renzo Badano", "1-7", "Benja", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Benja", "7-1", "Renzo Badano", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Cami", "4-7", "Kevin Sivori", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Kevin Sivori", "7-4", "Cami", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Kevin Sivori", "1-3", "Benja", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Benja", "3-1", "Kevin Sivori", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Renzo Badano", "1-4", "Cami", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Cami", "4-1", "Renzo Badano", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Pancho Muzzio", "9-4", "Marto", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Marto", "4-9", "Pancho Muzzio", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Lucas Insua", "2-6", "Fabrizio Escolano", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Fabrizio Escolano", "6-2", "Lucas Insua", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Fabrizio Escolano", "7-1", "Marto", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Marto", "1-7", "Fabrizio Escolano", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Pancho Muzzio", "0-1", "Lucas Insua", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Lucas Insua", "1-0", "Pancho Muzzio", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Joel Alcalde", "8-2", "Santi", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Santi", "2-8", "Joel Alcalde", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Ian Gangai", "0-7", "Rodrigo Soca", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Rodrigo Soca", "7-0", "Ian Gangai", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Rodrigo Soca", "4-2", "Santi", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Santi", "2-4", "Rodrigo Soca", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Joel Alcalde", "1-0", "Ian Gangai", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Ian Gangai", "0-1", "Joel Alcalde", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Tomas Torcasio", "3-1", "Veronica Lucchesi", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Veronica Lucchesi", "1-3", "Tomas Torcasio", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Jhose", "6-4", "Moreno Perez", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Moreno Perez", "4-6", "Jhose", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Moreno Perez", "4-4", "Veronica Lucchesi", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Veronica Lucchesi", "4-4", "Moreno Perez", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Tomas Torcasio", "2-6", "Jhose", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Jhose", "6-2", "Tomas Torcasio", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Felipe Galante", "1-0", "Ciro Guarch", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Ciro Guarch", "0-1", "Felipe Galante", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Yago", "12-7", "Nico Avalos", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Nico Avalos", "7-12", "Yago", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Nico Avalos", "3-0", "Ciro Guarch", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Ciro Guarch", "0-3", "Nico Avalos", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Felipe Galante", "4-7", "Yago", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Yago", "7-4", "Felipe Galante", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Tomas Delgado", "0-2", "Dani Bazan", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Dani Bazan", "2-0", "Tomas Delgado", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Luciano Hufschmid", "10-6", "Pollo", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Pollo", "6-10", "Luciano Hufschmid", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Pollo", "5-4", "Dani Bazan", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Dani Bazan", "4-5", "Pollo", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Tomas Delgado", "0-6", "Luciano Hufschmid", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Luciano Hufschmid", "6-0", "Tomas Delgado", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Mario Talarico", "0-0", "Anubis", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Anubis", "0-0", "Mario Talarico", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Rodrigo Talarico", "5-10", "Lucas Aguilera", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Lucas Aguilera", "10-5", "Rodrigo Talarico", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Lucas Aguilera", "1-0", "Anubis", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Anubis", "0-1", "Lucas Aguilera", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Mario Talarico", "0-5", "Rodrigo Talarico", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Rodrigo Talarico", "5-0", "Mario Talarico", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Ignacio Cejas", "1-2", "Cristian Hantis", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Cristian Hantis", "2-1", "Ignacio Cejas", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Bruno Alonso", "2-4", "Gabriel Talarico", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Gabriel Talarico", "4-2", "Bruno Alonso", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Gabriel Talarico", "4-1", "Cristian Hantis", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Cristian Hantis", "1-4", "Gabriel Talarico", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Ignacio Cejas", "4-4", "Bruno Alonso", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Bruno Alonso", "4-4", "Ignacio Cejas", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Cami", "3-2", "Benja", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Benja", "2-3", "Cami", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Kevin Sivori", "2-3", "Renzo Badano", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Renzo Badano", "3-2", "Kevin Sivori", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Benja", "1-0", "Renzo Badano", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Renzo Badano", "0-1", "Benja", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Kevin Sivori", "0-3", "Cami", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Cami", "3-0", "Kevin Sivori", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Lucas Insua", "0-2", "Marto", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Marto", "2-0", "Lucas Insua", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Fabrizio Escolano", "2-2", "Pancho Muzzio", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Pancho Muzzio", "2-2", "Fabrizio Escolano", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Marto", "2-1", "Pancho Muzzio", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Pancho Muzzio", "1-2", "Marto", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Fabrizio Escolano", "0-4", "Lucas Insua", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Lucas Insua", "4-0", "Fabrizio Escolano", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Ian Gangai", "0-1", "Santi", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Santi", "1-0", "Ian Gangai", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Rodrigo Soca", "2-2", "Joel Alcalde", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Joel Alcalde", "2-2", "Rodrigo Soca", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Santi", "3-0", "Joel Alcalde", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Joel Alcalde", "0-3", "Santi", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Rodrigo Soca", "0-0", "Ian Gangai", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Ian Gangai", "0-0", "Rodrigo Soca", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Jhose", "0-2", "Veronica Lucchesi", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Veronica Lucchesi", "2-0", "Jhose", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Moreno Perez", "5-1", "Tomas Torcasio", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Tomas Torcasio", "1-5", "Moreno Perez", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Veronica Lucchesi", "0-0", "Tomas Torcasio", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Tomas Torcasio", "0-0", "Veronica Lucchesi", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Moreno Perez", "0-0", "Jhose", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Jhose", "0-0", "Moreno Perez", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Yago", "1-0", "Ciro Guarch", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Ciro Guarch", "0-1", "Yago", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Nico Avalos", "2-5", "Felipe Galante", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Felipe Galante", "5-2", "Nico Avalos", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Ciro Guarch", "0-0", "Felipe Galante", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Felipe Galante", "0-0", "Ciro Guarch", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Nico Avalos", "0-1", "Yago", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Yago", "1-0", "Nico Avalos", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Luciano Hufschmid", "2-4", "Dani Bazan", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Dani Bazan", "4-2", "Luciano Hufschmid", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Pollo", "5-0", "Tomas Delgado", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Tomas Delgado", "0-5", "Pollo", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Dani Bazan", "1-3", "Tomas Delgado", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Tomas Delgado", "3-1", "Dani Bazan", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Pollo", "3-4", "Luciano Hufschmid", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Luciano Hufschmid", "4-3", "Pollo", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Rodrigo Talarico", "6-0", "Anubis", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Anubis", "0-6", "Rodrigo Talarico", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Lucas Aguilera", "1-0", "Mario Talarico", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Mario Talarico", "0-1", "Lucas Aguilera", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Anubis", "4-1", "Mario Talarico", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Mario Talarico", "1-4", "Anubis", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Lucas Aguilera", "0-4", "Rodrigo Talarico", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Rodrigo Talarico", "4-0", "Lucas Aguilera", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Bruno Alonso", "4-1", "Cristian Hantis", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Cristian Hantis", "1-4", "Bruno Alonso", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Gabriel Talarico", "1-2", "Ignacio Cejas", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Ignacio Cejas", "2-1", "Gabriel Talarico", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Cristian Hantis", "0-0", "Ignacio Cejas", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Ignacio Cejas", "0-0", "Cristian Hantis", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Gabriel Talarico", "1-1", "Bruno Alonso", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Bruno Alonso", "1-1", "Gabriel Talarico", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Benja", "6-5", "Kevin Sivori", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Kevin Sivori", "5-6", "Benja", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Cami", "6-4", "Renzo Badano", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Renzo Badano", "4-6", "Cami", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Benja", "1-1", "Cami", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Cami", "1-1", "Benja", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Renzo Badano", "1-1", "Kevin Sivori", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Kevin Sivori", "1-1", "Renzo Badano", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Marto", "6-4", "Fabrizio Escolano", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Fabrizio Escolano", "4-6", "Marto", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Lucas Insua", "3-9", "Pancho Muzzio", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Pancho Muzzio", "9-3", "Lucas Insua", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Marto", "1-1", "Lucas Insua", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Lucas Insua", "1-1", "Marto", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Pancho Muzzio", "1-0", "Fabrizio Escolano", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Fabrizio Escolano", "0-1", "Pancho Muzzio", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Santi", "1-10", "Rodrigo Soca", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Rodrigo Soca", "10-1", "Santi", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Ian Gangai", "0-6", "Joel Alcalde", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Joel Alcalde", "6-0", "Ian Gangai", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Santi", "4-0", "Ian Gangai", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Ian Gangai", "0-4", "Santi", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Joel Alcalde", "0-1", "Rodrigo Soca", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Rodrigo Soca", "1-0", "Joel Alcalde", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Veronica Lucchesi", "2-0", "Moreno Perez", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Moreno Perez", "0-2", "Veronica Lucchesi", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Jhose", "5-1", "Tomas Torcasio", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Tomas Torcasio", "1-5", "Jhose", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Veronica Lucchesi", "0-3", "Jhose", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Jhose", "3-0", "Veronica Lucchesi", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Tomas Torcasio", "2-3", "Moreno Perez", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Moreno Perez", "3-2", "Tomas Torcasio", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Ciro Guarch", "0-4", "Nico Avalos", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Nico Avalos", "4-0", "Ciro Guarch", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Yago", "4-3", "Felipe Galante", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Felipe Galante", "3-4", "Yago", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Ciro Guarch", "0-1", "Yago", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Yago", "1-0", "Ciro Guarch", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Felipe Galante", "1-2", "Nico Avalos", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Nico Avalos", "2-1", "Felipe Galante", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Dani Bazan", "1-2", "Pollo", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Pollo", "2-1", "Dani Bazan", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Luciano Hufschmid", "3-4", "Tomas Delgado", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Tomas Delgado", "4-3", "Luciano Hufschmid", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Dani Bazan", "0-0", "Luciano Hufschmid", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Luciano Hufschmid", "0-0", "Dani Bazan", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Tomas Delgado", "4-1", "Pollo", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Pollo", "1-4", "Tomas Delgado", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Anubis", "4-7", "Lucas Aguilera", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Lucas Aguilera", "7-4", "Anubis", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Rodrigo Talarico", "6-0", "Mario Talarico", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Mario Talarico", "0-6", "Rodrigo Talarico", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Anubis", "1-1", "Rodrigo Talarico", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Rodrigo Talarico", "1-1", "Anubis", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Mario Talarico", "2-0", "Lucas Aguilera", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Lucas Aguilera", "0-2", "Mario Talarico", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Cristian Hantis", "3-5", "Gabriel Talarico", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Gabriel Talarico", "5-3", "Cristian Hantis", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Bruno Alonso", "0-4", "Ignacio Cejas", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Ignacio Cejas", "4-0", "Bruno Alonso", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Cristian Hantis", "4-1", "Bruno Alonso", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Bruno Alonso", "1-4", "Cristian Hantis", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Ignacio Cejas", "4-1", "Gabriel Talarico", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Gabriel Talarico", "1-4", "Ignacio Cejas", "FASE DE GRUPOS COPA TOTAL T23");

agregarResultado("Benja", "4-7", "Joel Alcalde", "OCTAVOS DE FINAL COPA TOTAL T23");

agregarResultado("Joel Alcalde", "7-4", "Benja", "OCTAVOS DE FINAL COPA TOTAL T23");

agregarResultado("Rodrigo Talarico", "8-8", "Nico Avalos", "OCTAVOS DE FINAL COPA TOTAL T23");

agregarResultado("Nico Avalos", "8-8", "Rodrigo Talarico", "OCTAVOS DE FINAL COPA TOTAL T23");

agregarResultado("Ignacio Cejas", "0-11", "Marto", "OCTAVOS DE FINAL COPA TOTAL T23");

agregarResultado("Marto", "11-0", "Ignacio Cejas", "OCTAVOS DE FINAL COPA TOTAL T23");

agregarResultado("Yago", "8-5", "Pollo", "OCTAVOS DE FINAL COPA TOTAL T23");

agregarResultado("Pollo", "5-8", "Yago", "OCTAVOS DE FINAL COPA TOTAL T23");

agregarResultado("Luciano Hufschmid", "4-5", "Cami", "OCTAVOS DE FINAL COPA TOTAL T23");

agregarResultado("Cami", "5-4", "Luciano Hufschmid", "OCTAVOS DE FINAL COPA TOTAL T23");

agregarResultado("Rodrigo Soca", "12-6", "Moreno Perez", "OCTAVOS DE FINAL COPA TOTAL T23");

agregarResultado("Moreno Perez", "6-12", "Rodrigo Soca", "OCTAVOS DE FINAL COPA TOTAL T23");

agregarResultado("Jhose", "6-8", "Lucas Aguilera", "OCTAVOS DE FINAL COPA TOTAL T23");

agregarResultado("Lucas Aguilera", "8-6", "Jhose", "OCTAVOS DE FINAL COPA TOTAL T23");

agregarResultado("Pancho Muzzio", "11-9", "Gabriel Talarico", "OCTAVOS DE FINAL COPA TOTAL T23");

agregarResultado("Gabriel Talarico", "9-11", "Pancho Muzzio", "OCTAVOS DE FINAL COPA TOTAL T23");

agregarResultado("Rodrigo Talarico", "2-2", "Nico Avalos", "DESEMPATE OCTAVOS COPA TOTAL T23");

agregarResultado("Nico Avalos", "2-2", "Rodrigo Talarico", "DESEMPATE OCTAVOS COPA TOTAL T23");

agregarResultado("Rodrigo Talarico", "4-4", "Nico Avalos", "DESEMPATE 2 OCTAVOS COPA TOTAL T23");

agregarResultado("Nico Avalos", "4-4", "Rodrigo Talarico", "DESEMPATE 2 OCTAVOS COPA TOTAL T23");

agregarResultado("Rodrigo Talarico", "1-0", "Nico Avalos", "DESEMPATE 3 OCTAVOS COPA TOTAL T23");

agregarResultado("Nico Avalos", "0-1", "Rodrigo Talarico", "DESEMPATE 3 OCTAVOS COPA TOTAL T23");

agregarResultado("Lucas Aguilera", "5-3", "Joel Alcalde", "CUARTOS DE FINAL COPA TOTAL T23");

agregarResultado("Joel Alcalde", "3-5", "Lucas Aguilera", "CUARTOS DE FINAL COPA TOTAL T23");

agregarResultado("Rodrigo Talarico", "5-8", "Pancho Muzzio", "CUARTOS DE FINAL COPA TOTAL T23");

agregarResultado("Pancho Muzzio", "8-5", "Rodrigo Talarico", "CUARTOS DE FINAL COPA TOTAL T23");

agregarResultado("Marto", "3-7", "Cami", "CUARTOS DE FINAL COPA TOTAL T23");

agregarResultado("Cami", "7-3", "Marto", "CUARTOS DE FINAL COPA TOTAL T23");

agregarResultado("Rodrigo Soca", "5-3", "Yago", "CUARTOS DE FINAL COPA TOTAL T23");

agregarResultado("Yago", "3-5", "Rodrigo Soca", "CUARTOS DE FINAL COPA TOTAL T23");

agregarResultado("Rodrigo Soca", "12-9", "Cami", "SEMIFINAL COPA TOTAL T23");

agregarResultado("Cami", "9-12", "Rodrigo Soca", "SEMIFINAL COPA TOTAL T23");

agregarResultado("Pancho Muzzio", "1-19", "Lucas Aguilera", "SEMIFINAL COPA TOTAL T23");

agregarResultado("Lucas Aguilera", "19-1", "Pancho Muzzio", "SEMIFINAL COPA TOTAL T23");

agregarResultado("Rodrigo Soca", "10-10", "Lucas Aguilera", "FINAL COPA TOTAL T23");

agregarResultado("Lucas Aguilera", "10-10", "Rodrigo Soca", "FINAL COPA TOTAL T23");

agregarResultado("Rodrigo Soca", "0-3", "Lucas Aguilera", "DESEMPATE COPA TOTAL T23");

agregarResultado("Lucas Aguilera", "3-0", "Rodrigo Soca", "DESEMPATE COPA TOTAL T23");

agregarResultado("Gabriel Talarico", "16-18", "Cami", "SEMIFINAL COPA DUOS T23");

agregarResultado("Cami", "18-16", "Gabriel Talarico", "SEMIFINAL COPA DUOS T23");

agregarResultado("Gabriel Talarico", "16-18", "Rodrigo Talarico", "SEMIFINAL COPA DUOS T23");

agregarResultado("Rodrigo Talarico", "18-16", "Gabriel Talarico", "SEMIFINAL COPA DUOS T23");

agregarResultado("Felipe Galante", "16-18", "Cami", "SEMIFINAL COPA DUOS T23");

agregarResultado("Cami", "18-16", "Felipe Galante", "SEMIFINAL COPA DUOS T23");

agregarResultado("Felipe Galante", "16-18", "Rodrigo Talarico", "SEMIFINAL COPA DUOS T23");

agregarResultado("Rodrigo Talarico", "18-16", "Felipe Galante", "SEMIFINAL COPA DUOS T23");

agregarResultado("Lucas Aguilera", "22-11", "Luciano Hufschmid", "SEMIFINAL COPA DUOS T23");

agregarResultado("Luciano Hufschmid", "11-22", "Lucas Aguilera", "SEMIFINAL COPA DUOS T23");

agregarResultado("Lucas Aguilera", "22-11", "Renzo Badano", "SEMIFINAL COPA DUOS T23");

agregarResultado("Renzo Badano", "11-22", "Lucas Aguilera", "SEMIFINAL COPA DUOS T23");

agregarResultado("Pancho Muzzio", "22-11", "Luciano Hufschmid", "SEMIFINAL COPA DUOS T23");

agregarResultado("Luciano Hufschmid", "11-22", "Pancho Muzzio", "SEMIFINAL COPA DUOS T23");

agregarResultado("Pancho Muzzio", "22-11", "Renzo Badano", "SEMIFINAL COPA DUOS T23");

agregarResultado("Renzo Badano", "11-22", "Pancho Muzzio", "SEMIFINAL COPA DUOS T23");

agregarResultado("Lucas Aguilera", "22-18", "Cami", "FINAL COPA DUOS T23");

agregarResultado("Cami", "18-22", "Lucas Aguilera", "FINAL COPA DUOS T23");

agregarResultado("Lucas Aguilera", "22-18", "Rodrigo Talarico", "FINAL COPA DUOS T23");

agregarResultado("Rodrigo Talarico", "18-22", "Lucas Aguilera", "FINAL COPA DUOS T23");

agregarResultado("Pancho Muzzio", "22-18", "Cami", "FINAL COPA DUOS T23");

agregarResultado("Cami", "18-22", "Pancho Muzzio", "FINAL COPA DUOS T23");

agregarResultado("Pancho Muzzio", "22-18", "Rodrigo Talarico", "FINAL COPA DUOS T23");

agregarResultado("Rodrigo Talarico", "18-22", "Pancho Muzzio", "FINAL COPA DUOS T23");

agregarResultado("Gabriel Talarico", "9-16", "Pollo", "32AVOS DE FINAL COPA CAMPEONES T23");

agregarResultado("Pollo", "16-9", "Gabriel Talarico", "32AVOS DE FINAL COPA CAMPEONES T23");

agregarResultado("Fabrizio Escolano", "15-11", "Pancho Muzzio", "32AVOS DE FINAL COPA CAMPEONES T23");

agregarResultado("Pancho Muzzio", "11-15", "Fabrizio Escolano", "32AVOS DE FINAL COPA CAMPEONES T23");

agregarResultado("Rodrigo Talarico", "16-13", "Moreno Perez", "32AVOS DE FINAL COPA CAMPEONES T23");

agregarResultado("Moreno Perez", "13-16", "Rodrigo Talarico", "32AVOS DE FINAL COPA CAMPEONES T23");

agregarResultado("Pollo", "6-10", "Cami", "16AVOS DE FINAL COPA CAMPEONES T23");

agregarResultado("Cami", "10-6", "Pollo", "16AVOS DE FINAL COPA CAMPEONES T23");

agregarResultado("Fabrizio Escolano", "4-11", "Rodrigo Talarico", "16AVOS DE FINAL COPA CAMPEONES T23");

agregarResultado("Rodrigo Talarico", "11-4", "Fabrizio Escolano", "16AVOS DE FINAL COPA CAMPEONES T23");

agregarResultado("Cami", "5-0", "Ignacio Cejas", "OCTAVOS DE FINAL COPA CAMPEONES T23");

agregarResultado("Ignacio Cejas", "0-5", "Cami", "OCTAVOS DE FINAL COPA CAMPEONES T23");

agregarResultado("Rodrigo Talarico", "8-5", "Felipe Galante", "OCTAVOS DE FINAL COPA CAMPEONES T23");

agregarResultado("Felipe Galante", "5-8", "Rodrigo Talarico", "OCTAVOS DE FINAL COPA CAMPEONES T23");

agregarResultado("Nico Avalos", "8-4", "Luciano Hufschmid", "OCTAVOS DE FINAL COPA CAMPEONES T23");

agregarResultado("Luciano Hufschmid", "4-8", "Nico Avalos", "OCTAVOS DE FINAL COPA CAMPEONES T23");

agregarResultado("Cami", "7-3", "Yago", "CUARTOS DE FINAL COPA CAMPEONES T23");

agregarResultado("Yago", "3-7", "Cami", "CUARTOS DE FINAL COPA CAMPEONES T23");

agregarResultado("Rodrigo Talarico", "5-3", "Nico Avalos", "CUARTOS DE FINAL COPA CAMPEONES T23");

agregarResultado("Nico Avalos", "3-5", "Rodrigo Talarico", "CUARTOS DE FINAL COPA CAMPEONES T23");

agregarResultado("Cami", "9-8", "Kevin Sivori", "SEMIFINAL COPA CAMPEONES T23");

agregarResultado("Kevin Sivori", "8-9", "Cami", "SEMIFINAL COPA CAMPEONES T23");

agregarResultado("Rodrigo Talarico", "9-7", "Bruno Alonso", "SEMIFINAL COPA CAMPEONES T23");

agregarResultado("Bruno Alonso", "7-9", "Rodrigo Talarico", "SEMIFINAL COPA CAMPEONES T23");

agregarResultado("Cami", "6-12", "Rodrigo Talarico", "FINAL COPA CAMPEONES T23");

agregarResultado("Rodrigo Talarico", "12-6", "Cami", "FINAL COPA CAMPEONES T23");

agregarResultado("Martin Bustos", "2-1", "Kevin Sivori", "FASE DE GRUPOS COPA TOTAL T24");

agregarResultado("Kevin Sivori", "1-2", "Martin Bustos", "FASE DE GRUPOS COPA TOTAL T24");

agregarResultado("Luciano Hufschmid", "0-2", "Lucas Aguilera", "FASE DE GRUPOS COPA TOTAL T24");

agregarResultado("Lucas Aguilera", "2-0", "Luciano Hufschmid", "FASE DE GRUPOS COPA TOTAL T24");

agregarResultado("Lucas Aguilera", "3-4", "Kevin Sivori", "FASE DE GRUPOS COPA TOTAL T24");

agregarResultado("Kevin Sivori", "4-3", "Lucas Aguilera", "FASE DE GRUPOS COPA TOTAL T24");

agregarResultado("Martin Bustos", "1-0", "Luciano Hufschmid", "FASE DE GRUPOS COPA TOTAL T24");

agregarResultado("Luciano Hufschmid", "0-1", "Martin Bustos", "FASE DE GRUPOS COPA TOTAL T24");

agregarResultado("Yago", "1-1", "Benja", "FASE DE GRUPOS COPA TOTAL T24");

agregarResultado("Benja", "1-1", "Yago", "FASE DE GRUPOS COPA TOTAL T24");

agregarResultado("Moreno Perez", "1-3", "Cundo", "FASE DE GRUPOS COPA TOTAL T24");

agregarResultado("Cundo", "3-1", "Moreno Perez", "FASE DE GRUPOS COPA TOTAL T24");

agregarResultado("Cundo", "0-0", "Benja", "FASE DE GRUPOS COPA TOTAL T24");

agregarResultado("Benja", "0-0", "Cundo", "FASE DE GRUPOS COPA TOTAL T24");

agregarResultado("Yago", "6-3", "Moreno Perez", "FASE DE GRUPOS COPA TOTAL T24");

agregarResultado("Moreno Perez", "3-6", "Yago", "FASE DE GRUPOS COPA TOTAL T24");

agregarResultado("Pancho Muzzio", "2-2", "Cami", "FASE DE GRUPOS COPA TOTAL T24");

agregarResultado("Cami", "2-2", "Pancho Muzzio", "FASE DE GRUPOS COPA TOTAL T24");

agregarResultado("Lucas Insua", "0-0", "Dani Bazan", "FASE DE GRUPOS COPA TOTAL T24");

agregarResultado("Dani Bazan", "0-0", "Lucas Insua", "FASE DE GRUPOS COPA TOTAL T24");

agregarResultado("Dani Bazan", "0-4", "Cami", "FASE DE GRUPOS COPA TOTAL T24");

agregarResultado("Cami", "4-0", "Dani Bazan", "FASE DE GRUPOS COPA TOTAL T24");

agregarResultado("Pancho Muzzio", "2-3", "Lucas Insua", "FASE DE GRUPOS COPA TOTAL T24");

agregarResultado("Lucas Insua", "3-2", "Pancho Muzzio", "FASE DE GRUPOS COPA TOTAL T24");

agregarResultado("Santi", "1-0", "Anubis", "FASE DE GRUPOS COPA TOTAL T24");

agregarResultado("Anubis", "0-1", "Santi", "FASE DE GRUPOS COPA TOTAL T24");

agregarResultado("Rodrigo Soca", "1-2", "Mario Talarico", "FASE DE GRUPOS COPA TOTAL T24");

agregarResultado("Mario Talarico", "2-1", "Rodrigo Soca", "FASE DE GRUPOS COPA TOTAL T24");

agregarResultado("Mario Talarico", "1-0", "Anubis", "FASE DE GRUPOS COPA TOTAL T24");

agregarResultado("Anubis", "0-1", "Mario Talarico", "FASE DE GRUPOS COPA TOTAL T24");

agregarResultado("Santi", "0-7", "Rodrigo Soca", "FASE DE GRUPOS COPA TOTAL T24");

agregarResultado("Rodrigo Soca", "7-0", "Santi", "FASE DE GRUPOS COPA TOTAL T24");

agregarResultado("Pollo", "0-0", "Bruno Alonso", "FASE DE GRUPOS COPA TOTAL T24");

agregarResultado("Bruno Alonso", "0-0", "Pollo", "FASE DE GRUPOS COPA TOTAL T24");

agregarResultado("Felipe Galante", "0-0", "Eze", "FASE DE GRUPOS COPA TOTAL T24");

agregarResultado("Eze", "0-0", "Felipe Galante", "FASE DE GRUPOS COPA TOTAL T24");

agregarResultado("Eze", "4-0", "Bruno Alonso", "FASE DE GRUPOS COPA TOTAL T24");

agregarResultado("Bruno Alonso", "0-4", "Eze", "FASE DE GRUPOS COPA TOTAL T24");

agregarResultado("Pollo", "1-0", "Felipe Galante", "FASE DE GRUPOS COPA TOTAL T24");

agregarResultado("Felipe Galante", "0-1", "Pollo", "FASE DE GRUPOS COPA TOTAL T24");

agregarResultado("Renzo Badano", "2-1", "Fabrizio Escolano", "FASE DE GRUPOS COPA TOTAL T24");

agregarResultado("Fabrizio Escolano", "1-2", "Renzo Badano", "FASE DE GRUPOS COPA TOTAL T24");

agregarResultado("Marto", "0-2", "Ignacio Cejas", "FASE DE GRUPOS COPA TOTAL T24");

agregarResultado("Ignacio Cejas", "2-0", "Marto", "FASE DE GRUPOS COPA TOTAL T24");

agregarResultado("Ignacio Cejas", "4-3", "Fabrizio Escolano", "FASE DE GRUPOS COPA TOTAL T24");

agregarResultado("Fabrizio Escolano", "3-4", "Ignacio Cejas", "FASE DE GRUPOS COPA TOTAL T24");

agregarResultado("Renzo Badano", "1-0", "Marto", "FASE DE GRUPOS COPA TOTAL T24");

agregarResultado("Marto", "0-1", "Renzo Badano", "FASE DE GRUPOS COPA TOTAL T24");

agregarResultado("Rodrigo Talarico", "1-1", "Cristian Serpico", "FASE DE GRUPOS COPA TOTAL T24");

agregarResultado("Cristian Serpico", "1-1", "Rodrigo Talarico", "FASE DE GRUPOS COPA TOTAL T24");

agregarResultado("Nico Avalos", "1-1", "Joel Alcalde", "FASE DE GRUPOS COPA TOTAL T24");

agregarResultado("Joel Alcalde", "1-1", "Nico Avalos", "FASE DE GRUPOS COPA TOTAL T24");

agregarResultado("Joel Alcalde", "1-0", "Cristian Serpico", "FASE DE GRUPOS COPA TOTAL T24");

agregarResultado("Cristian Serpico", "0-1", "Joel Alcalde", "FASE DE GRUPOS COPA TOTAL T24");

agregarResultado("Rodrigo Talarico", "0-4", "Nico Avalos", "FASE DE GRUPOS COPA TOTAL T24");

agregarResultado("Nico Avalos", "4-0", "Rodrigo Talarico", "FASE DE GRUPOS COPA TOTAL T24");

agregarResultado("Veronica Lucchesi", "0-0", "Cristian Hantis", "FASE DE GRUPOS COPA TOTAL T24");

agregarResultado("Cristian Hantis", "0-0", "Veronica Lucchesi", "FASE DE GRUPOS COPA TOTAL T24");

agregarResultado("Jhose", "3-2", "Gabriel Talarico", "FASE DE GRUPOS COPA TOTAL T24");

agregarResultado("Gabriel Talarico", "2-3", "Jhose", "FASE DE GRUPOS COPA TOTAL T24");

agregarResultado("Gabriel Talarico", "1-1", "Cristian Hantis", "FASE DE GRUPOS COPA TOTAL T24");

agregarResultado("Cristian Hantis", "1-1", "Gabriel Talarico", "FASE DE GRUPOS COPA TOTAL T24");

agregarResultado("Veronica Lucchesi", "4-2", "Jhose", "FASE DE GRUPOS COPA TOTAL T24");

agregarResultado("Jhose", "2-4", "Veronica Lucchesi", "FASE DE GRUPOS COPA TOTAL T24");

agregarResultado("Luciano Hufschmid", "2-2", "Kevin Sivori", "FASE DE GRUPOS COPA TOTAL T24");

agregarResultado("Kevin Sivori", "2-2", "Luciano Hufschmid", "FASE DE GRUPOS COPA TOTAL T24");

agregarResultado("Lucas Aguilera", "1-1", "Martin Bustos", "FASE DE GRUPOS COPA TOTAL T24");

agregarResultado("Martin Bustos", "1-1", "Lucas Aguilera", "FASE DE GRUPOS COPA TOTAL T24");

agregarResultado("Kevin Sivori", "4-2", "Martin Bustos", "FASE DE GRUPOS COPA TOTAL T24");

agregarResultado("Martin Bustos", "2-4", "Kevin Sivori", "FASE DE GRUPOS COPA TOTAL T24");

agregarResultado("Lucas Aguilera", "1-2", "Luciano Hufschmid", "FASE DE GRUPOS COPA TOTAL T24");

agregarResultado("Luciano Hufschmid", "2-1", "Lucas Aguilera", "FASE DE GRUPOS COPA TOTAL T24");

agregarResultado("Moreno Perez", "2-1", "Benja", "FASE DE GRUPOS COPA TOTAL T24");

agregarResultado("Benja", "1-2", "Moreno Perez", "FASE DE GRUPOS COPA TOTAL T24");

agregarResultado("Cundo", "1-1", "Yago", "FASE DE GRUPOS COPA TOTAL T24");

agregarResultado("Yago", "1-1", "Cundo", "FASE DE GRUPOS COPA TOTAL T24");

agregarResultado("Benja", "3-2", "Yago", "FASE DE GRUPOS COPA TOTAL T24");

agregarResultado("Yago", "2-3", "Benja", "FASE DE GRUPOS COPA TOTAL T24");

agregarResultado("Cundo", "2-1", "Moreno Perez", "FASE DE GRUPOS COPA TOTAL T24");

agregarResultado("Moreno Perez", "1-2", "Cundo", "FASE DE GRUPOS COPA TOTAL T24");

agregarResultado("Lucas Insua", "1-2", "Cami", "FASE DE GRUPOS COPA TOTAL T24");

agregarResultado("Cami", "2-1", "Lucas Insua", "FASE DE GRUPOS COPA TOTAL T24");

agregarResultado("Dani Bazan", "0-1", "Pancho Muzzio", "FASE DE GRUPOS COPA TOTAL T24");

agregarResultado("Pancho Muzzio", "1-0", "Dani Bazan", "FASE DE GRUPOS COPA TOTAL T24");

agregarResultado("Cami", "2-2", "Pancho Muzzio", "FASE DE GRUPOS COPA TOTAL T24");

agregarResultado("Pancho Muzzio", "2-2", "Cami", "FASE DE GRUPOS COPA TOTAL T24");

agregarResultado("Dani Bazan", "0-3", "Lucas Insua", "FASE DE GRUPOS COPA TOTAL T24");

agregarResultado("Lucas Insua", "3-0", "Dani Bazan", "FASE DE GRUPOS COPA TOTAL T24");

agregarResultado("Rodrigo Soca", "1-0", "Anubis", "FASE DE GRUPOS COPA TOTAL T24");

agregarResultado("Anubis", "0-1", "Rodrigo Soca", "FASE DE GRUPOS COPA TOTAL T24");

agregarResultado("Mario Talarico", "2-1", "Santi", "FASE DE GRUPOS COPA TOTAL T24");

agregarResultado("Santi", "1-2", "Mario Talarico", "FASE DE GRUPOS COPA TOTAL T24");

agregarResultado("Anubis", "0-1", "Santi", "FASE DE GRUPOS COPA TOTAL T24");

agregarResultado("Santi", "1-0", "Anubis", "FASE DE GRUPOS COPA TOTAL T24");

agregarResultado("Mario Talarico", "3-2", "Rodrigo Soca", "FASE DE GRUPOS COPA TOTAL T24");

agregarResultado("Rodrigo Soca", "2-3", "Mario Talarico", "FASE DE GRUPOS COPA TOTAL T24");

agregarResultado("Felipe Galante", "0-1", "Bruno Alonso", "FASE DE GRUPOS COPA TOTAL T24");

agregarResultado("Bruno Alonso", "1-0", "Felipe Galante", "FASE DE GRUPOS COPA TOTAL T24");

agregarResultado("Eze", "2-3", "Pollo", "FASE DE GRUPOS COPA TOTAL T24");

agregarResultado("Pollo", "3-2", "Eze", "FASE DE GRUPOS COPA TOTAL T24");

agregarResultado("Bruno Alonso", "1-6", "Pollo", "FASE DE GRUPOS COPA TOTAL T24");

agregarResultado("Pollo", "6-1", "Bruno Alonso", "FASE DE GRUPOS COPA TOTAL T24");

agregarResultado("Eze", "2-0", "Felipe Galante", "FASE DE GRUPOS COPA TOTAL T24");

agregarResultado("Felipe Galante", "0-2", "Eze", "FASE DE GRUPOS COPA TOTAL T24");

agregarResultado("Marto", "0-0", "Fabrizio Escolano", "FASE DE GRUPOS COPA TOTAL T24");

agregarResultado("Fabrizio Escolano", "0-0", "Marto", "FASE DE GRUPOS COPA TOTAL T24");

agregarResultado("Ignacio Cejas", "2-2", "Renzo Badano", "FASE DE GRUPOS COPA TOTAL T24");

agregarResultado("Renzo Badano", "2-2", "Ignacio Cejas", "FASE DE GRUPOS COPA TOTAL T24");

agregarResultado("Fabrizio Escolano", "0-2", "Renzo Badano", "FASE DE GRUPOS COPA TOTAL T24");

agregarResultado("Renzo Badano", "2-0", "Fabrizio Escolano", "FASE DE GRUPOS COPA TOTAL T24");

agregarResultado("Ignacio Cejas", "5-1", "Marto", "FASE DE GRUPOS COPA TOTAL T24");

agregarResultado("Marto", "1-5", "Ignacio Cejas", "FASE DE GRUPOS COPA TOTAL T24");

agregarResultado("Nico Avalos", "3-5", "Cristian Serpico", "FASE DE GRUPOS COPA TOTAL T24");

agregarResultado("Cristian Serpico", "5-3", "Nico Avalos", "FASE DE GRUPOS COPA TOTAL T24");

agregarResultado("Joel Alcalde", "2-5", "Rodrigo Talarico", "FASE DE GRUPOS COPA TOTAL T24");

agregarResultado("Rodrigo Talarico", "5-2", "Joel Alcalde", "FASE DE GRUPOS COPA TOTAL T24");

agregarResultado("Cristian Serpico", "1-2", "Rodrigo Talarico", "FASE DE GRUPOS COPA TOTAL T24");

agregarResultado("Rodrigo Talarico", "2-1", "Cristian Serpico", "FASE DE GRUPOS COPA TOTAL T24");

agregarResultado("Joel Alcalde", "2-2", "Nico Avalos", "FASE DE GRUPOS COPA TOTAL T24");

agregarResultado("Nico Avalos", "2-2", "Joel Alcalde", "FASE DE GRUPOS COPA TOTAL T24");

agregarResultado("Jhose", "1-1", "Cristian Hantis", "FASE DE GRUPOS COPA TOTAL T24");

agregarResultado("Cristian Hantis", "1-1", "Jhose", "FASE DE GRUPOS COPA TOTAL T24");

agregarResultado("Gabriel Talarico", "4-1", "Veronica Lucchesi", "FASE DE GRUPOS COPA TOTAL T24");

agregarResultado("Veronica Lucchesi", "1-4", "Gabriel Talarico", "FASE DE GRUPOS COPA TOTAL T24");

agregarResultado("Cristian Hantis", "0-2", "Veronica Lucchesi", "FASE DE GRUPOS COPA TOTAL T24");

agregarResultado("Veronica Lucchesi", "2-0", "Cristian Hantis", "FASE DE GRUPOS COPA TOTAL T24");

agregarResultado("Gabriel Talarico", "2-3", "Jhose", "FASE DE GRUPOS COPA TOTAL T24");

agregarResultado("Jhose", "3-2", "Gabriel Talarico", "FASE DE GRUPOS COPA TOTAL T24");

agregarResultado("Kevin Sivori", "0-0", "Lucas Aguilera", "FASE DE GRUPOS COPA TOTAL T24");

agregarResultado("Lucas Aguilera", "0-0", "Kevin Sivori", "FASE DE GRUPOS COPA TOTAL T24");

agregarResultado("Luciano Hufschmid", "1-3", "Martin Bustos", "FASE DE GRUPOS COPA TOTAL T24");

agregarResultado("Martin Bustos", "3-1", "Luciano Hufschmid", "FASE DE GRUPOS COPA TOTAL T24");

agregarResultado("Kevin Sivori", "0-3", "Luciano Hufschmid", "FASE DE GRUPOS COPA TOTAL T24");

agregarResultado("Luciano Hufschmid", "3-0", "Kevin Sivori", "FASE DE GRUPOS COPA TOTAL T24");

agregarResultado("Martin Bustos", "3-0", "Lucas Aguilera", "FASE DE GRUPOS COPA TOTAL T24");

agregarResultado("Lucas Aguilera", "0-3", "Martin Bustos", "FASE DE GRUPOS COPA TOTAL T24");

agregarResultado("Benja", "0-0", "Cundo", "FASE DE GRUPOS COPA TOTAL T24");

agregarResultado("Cundo", "0-0", "Benja", "FASE DE GRUPOS COPA TOTAL T24");

agregarResultado("Moreno Perez", "0-3", "Yago", "FASE DE GRUPOS COPA TOTAL T24");

agregarResultado("Yago", "3-0", "Moreno Perez", "FASE DE GRUPOS COPA TOTAL T24");

agregarResultado("Benja", "3-0", "Moreno Perez", "FASE DE GRUPOS COPA TOTAL T24");

agregarResultado("Moreno Perez", "0-3", "Benja", "FASE DE GRUPOS COPA TOTAL T24");

agregarResultado("Yago", "0-0", "Cundo", "FASE DE GRUPOS COPA TOTAL T24");

agregarResultado("Cundo", "0-0", "Yago", "FASE DE GRUPOS COPA TOTAL T24");

agregarResultado("Cami", "0-0", "Dani Bazan", "FASE DE GRUPOS COPA TOTAL T24");

agregarResultado("Dani Bazan", "0-0", "Cami", "FASE DE GRUPOS COPA TOTAL T24");

agregarResultado("Lucas Insua", "0-3", "Pancho Muzzio", "FASE DE GRUPOS COPA TOTAL T24");

agregarResultado("Pancho Muzzio", "3-0", "Lucas Insua", "FASE DE GRUPOS COPA TOTAL T24");

agregarResultado("Cami", "3-3", "Lucas Insua", "FASE DE GRUPOS COPA TOTAL T24");

agregarResultado("Lucas Insua", "3-3", "Cami", "FASE DE GRUPOS COPA TOTAL T24");

agregarResultado("Pancho Muzzio", "0-0", "Dani Bazan", "FASE DE GRUPOS COPA TOTAL T24");

agregarResultado("Dani Bazan", "0-0", "Pancho Muzzio", "FASE DE GRUPOS COPA TOTAL T24");

agregarResultado("Anubis", "0-0", "Mario Talarico", "FASE DE GRUPOS COPA TOTAL T24");

agregarResultado("Mario Talarico", "0-0", "Anubis", "FASE DE GRUPOS COPA TOTAL T24");

agregarResultado("Rodrigo Soca", "3-1", "Santi", "FASE DE GRUPOS COPA TOTAL T24");

agregarResultado("Santi", "1-3", "Rodrigo Soca", "FASE DE GRUPOS COPA TOTAL T24");

agregarResultado("Anubis", "0-0", "Rodrigo Soca", "FASE DE GRUPOS COPA TOTAL T24");

agregarResultado("Rodrigo Soca", "0-0", "Anubis", "FASE DE GRUPOS COPA TOTAL T24");

agregarResultado("Santi", "1-2", "Mario Talarico", "FASE DE GRUPOS COPA TOTAL T24");

agregarResultado("Mario Talarico", "2-1", "Santi", "FASE DE GRUPOS COPA TOTAL T24");

agregarResultado("Bruno Alonso", "1-1", "Eze", "FASE DE GRUPOS COPA TOTAL T24");

agregarResultado("Eze", "1-1", "Bruno Alonso", "FASE DE GRUPOS COPA TOTAL T24");

agregarResultado("Felipe Galante", "0-0", "Pollo", "FASE DE GRUPOS COPA TOTAL T24");

agregarResultado("Pollo", "0-0", "Felipe Galante", "FASE DE GRUPOS COPA TOTAL T24");

agregarResultado("Bruno Alonso", "0-0", "Felipe Galante", "FASE DE GRUPOS COPA TOTAL T24");

agregarResultado("Felipe Galante", "0-0", "Bruno Alonso", "FASE DE GRUPOS COPA TOTAL T24");

agregarResultado("Pollo", "3-1", "Eze", "FASE DE GRUPOS COPA TOTAL T24");

agregarResultado("Eze", "1-3", "Pollo", "FASE DE GRUPOS COPA TOTAL T24");

agregarResultado("Fabrizio Escolano", "1-1", "Ignacio Cejas", "FASE DE GRUPOS COPA TOTAL T24");

agregarResultado("Ignacio Cejas", "1-1", "Fabrizio Escolano", "FASE DE GRUPOS COPA TOTAL T24");

agregarResultado("Marto", "1-4", "Renzo Badano", "FASE DE GRUPOS COPA TOTAL T24");

agregarResultado("Renzo Badano", "4-1", "Marto", "FASE DE GRUPOS COPA TOTAL T24");

agregarResultado("Fabrizio Escolano", "1-0", "Marto", "FASE DE GRUPOS COPA TOTAL T24");

agregarResultado("Marto", "0-1", "Fabrizio Escolano", "FASE DE GRUPOS COPA TOTAL T24");

agregarResultado("Renzo Badano", "1-3", "Ignacio Cejas", "FASE DE GRUPOS COPA TOTAL T24");

agregarResultado("Ignacio Cejas", "3-1", "Renzo Badano", "FASE DE GRUPOS COPA TOTAL T24");

agregarResultado("Cristian Serpico", "1-3", "Joel Alcalde", "FASE DE GRUPOS COPA TOTAL T24");

agregarResultado("Joel Alcalde", "3-1", "Cristian Serpico", "FASE DE GRUPOS COPA TOTAL T24");

agregarResultado("Nico Avalos", "1-0", "Rodrigo Talarico", "FASE DE GRUPOS COPA TOTAL T24");

agregarResultado("Rodrigo Talarico", "0-1", "Nico Avalos", "FASE DE GRUPOS COPA TOTAL T24");

agregarResultado("Cristian Serpico", "0-0", "Nico Avalos", "FASE DE GRUPOS COPA TOTAL T24");

agregarResultado("Nico Avalos", "0-0", "Cristian Serpico", "FASE DE GRUPOS COPA TOTAL T24");

agregarResultado("Rodrigo Talarico", "0-1", "Joel Alcalde", "FASE DE GRUPOS COPA TOTAL T24");

agregarResultado("Joel Alcalde", "1-0", "Rodrigo Talarico", "FASE DE GRUPOS COPA TOTAL T24");

agregarResultado("Cristian Hantis", "0-1", "Gabriel Talarico", "FASE DE GRUPOS COPA TOTAL T24");

agregarResultado("Gabriel Talarico", "1-0", "Cristian Hantis", "FASE DE GRUPOS COPA TOTAL T24");

agregarResultado("Jhose", "0-4", "Veronica Lucchesi", "FASE DE GRUPOS COPA TOTAL T24");

agregarResultado("Veronica Lucchesi", "4-0", "Jhose", "FASE DE GRUPOS COPA TOTAL T24");

agregarResultado("Cristian Hantis", "0-0", "Jhose", "FASE DE GRUPOS COPA TOTAL T24");

agregarResultado("Jhose", "0-0", "Cristian Hantis", "FASE DE GRUPOS COPA TOTAL T24");

agregarResultado("Veronica Lucchesi", "3-1", "Gabriel Talarico", "FASE DE GRUPOS COPA TOTAL T24");

agregarResultado("Gabriel Talarico", "1-3", "Veronica Lucchesi", "FASE DE GRUPOS COPA TOTAL T24");

agregarResultado("Cami", "10-9", "Nico Avalos", "OCTAVOS DE FINAL COPA TOTAL T24");

agregarResultado("Nico Avalos", "9-10", "Cami", "OCTAVOS DE FINAL COPA TOTAL T24");

agregarResultado("Ignacio Cejas", "9-6", "Yago", "OCTAVOS DE FINAL COPA TOTAL T24");

agregarResultado("Yago", "6-9", "Ignacio Cejas", "OCTAVOS DE FINAL COPA TOTAL T24");

agregarResultado("Martin Bustos", "9-10", "Renzo Badano", "OCTAVOS DE FINAL COPA TOTAL T24");

agregarResultado("Renzo Badano", "10-9", "Martin Bustos", "OCTAVOS DE FINAL COPA TOTAL T24");

agregarResultado("Joel Alcalde", "4-7", "Kevin Sivori", "OCTAVOS DE FINAL COPA TOTAL T24");

agregarResultado("Kevin Sivori", "7-4", "Joel Alcalde", "OCTAVOS DE FINAL COPA TOTAL T24");

agregarResultado("Mario Talarico", "11-13", "Rodrigo Soca", "OCTAVOS DE FINAL COPA TOTAL T24");

agregarResultado("Rodrigo Soca", "13-11", "Mario Talarico", "OCTAVOS DE FINAL COPA TOTAL T24");

agregarResultado("Pollo", "13-6", "Eze", "OCTAVOS DE FINAL COPA TOTAL T24");

agregarResultado("Eze", "6-13", "Pollo", "OCTAVOS DE FINAL COPA TOTAL T24");

agregarResultado("Cundo", "7-5", "Pancho Muzzio", "OCTAVOS DE FINAL COPA TOTAL T24");

agregarResultado("Pancho Muzzio", "5-7", "Cundo", "OCTAVOS DE FINAL COPA TOTAL T24");

agregarResultado("Veronica Lucchesi", "10-9", "Jhose", "OCTAVOS DE FINAL COPA TOTAL T24");

agregarResultado("Jhose", "9-10", "Veronica Lucchesi", "OCTAVOS DE FINAL COPA TOTAL T24");

agregarResultado("Pollo", "11-5", "Cami", "CUARTOS DE FINAL COPA TOTAL T24");

agregarResultado("Cami", "5-11", "Pollo", "CUARTOS DE FINAL COPA TOTAL T24");

agregarResultado("Cundo", "7-5", "Renzo Badano", "CUARTOS DE FINAL COPA TOTAL T24");

agregarResultado("Renzo Badano", "5-7", "Cundo", "CUARTOS DE FINAL COPA TOTAL T24");

agregarResultado("Ignacio Cejas", "11-12", "Rodrigo Soca", "CUARTOS DE FINAL COPA TOTAL T24");

agregarResultado("Rodrigo Soca", "12-11", "Ignacio Cejas", "CUARTOS DE FINAL COPA TOTAL T24");

agregarResultado("Veronica Lucchesi", "8-14", "Kevin Sivori", "CUARTOS DE FINAL COPA TOTAL T24");

agregarResultado("Kevin Sivori", "14-8", "Veronica Lucchesi", "CUARTOS DE FINAL COPA TOTAL T24");

agregarResultado("Cundo", "9-7", "Pollo", "SEMIFINALES COPA TOTAL T24");

agregarResultado("Pollo", "7-9", "Cundo", "SEMIFINALES COPA TOTAL T24");

agregarResultado("Kevin Sivori", "11-12", "Rodrigo Soca", "SEMIFINALES COPA TOTAL T24");

agregarResultado("Rodrigo Soca", "12-11", "Kevin Sivori", "SEMIFINALES COPA TOTAL T24");

agregarResultado("Cundo", "7-6", "Rodrigo Soca", "FINAL COPA TOTAL T24");

agregarResultado("Rodrigo Soca", "6-7", "Cundo", "FINAL COPA TOTAL T24");

agregarResultado("Mario Talarico", "7-5", "Pancho Muzzio", "DESEMPATE GRUPO 1 COPA A T24");

agregarResultado("Pancho Muzzio", "5-7", "Mario Talarico", "DESEMPATE GRUPO 1 COPA A T24");

agregarResultado("Luciano Hufschmid", "2-5", "Rodrigo Talarico", "DESEMPATE GRUPO 1 COPA A T24");

agregarResultado("Rodrigo Talarico", "5-2", "Luciano Hufschmid", "DESEMPATE GRUPO 1 COPA A T24");

agregarResultado("Gabriel Talarico", "9-9", "Nico Avalos", "OCTAVOS DE FINAL COPA A T24");

agregarResultado("Nico Avalos", "9-9", "Gabriel Talarico", "OCTAVOS DE FINAL COPA A T24");

agregarResultado("Renzo Badano", "10-9", "Jhose", "OCTAVOS DE FINAL COPA A T24");

agregarResultado("Jhose", "9-10", "Renzo Badano", "OCTAVOS DE FINAL COPA A T24");

agregarResultado("Pancho Muzzio", "5-13", "Lucas Insua", "OCTAVOS DE FINAL COPA A T24");

agregarResultado("Lucas Insua", "13-5", "Pancho Muzzio", "OCTAVOS DE FINAL COPA A T24");

agregarResultado("Pollo", "13-11", "Rodrigo Talarico", "OCTAVOS DE FINAL COPA A T24");

agregarResultado("Rodrigo Talarico", "11-13", "Pollo", "OCTAVOS DE FINAL COPA A T24");

agregarResultado("Gabriel Talarico", "1-2", "Nico Avalos", "DESEMPATE OCTAVOS DE FINAL COPA A T24");

agregarResultado("Nico Avalos", "2-1", "Gabriel Talarico", "DESEMPATE OCTAVOS DE FINAL COPA A T24");

agregarResultado("Yago", "8-10", "Nico Avalos", "CUARTOS DE FINAL COPA A T24");

agregarResultado("Nico Avalos", "10-8", "Yago", "CUARTOS DE FINAL COPA A T24");

agregarResultado("Rodrigo Soca", "12-11", "Pollo", "CUARTOS DE FINAL COPA A T24");

agregarResultado("Pollo", "11-12", "Rodrigo Soca", "CUARTOS DE FINAL COPA A T24");

agregarResultado("Mario Talarico", "11-5", "Renzo Badano", "CUARTOS DE FINAL COPA A T24");

agregarResultado("Renzo Badano", "5-11", "Mario Talarico", "CUARTOS DE FINAL COPA A T24");

agregarResultado("Cami", "5-9", "Lucas Insua", "CUARTOS DE FINAL COPA A T24");

agregarResultado("Lucas Insua", "9-5", "Cami", "CUARTOS DE FINAL COPA A T24");

agregarResultado("Mario Talarico", "9-4", "Lucas Insua", "SEMIFINALES COPA A T24");

agregarResultado("Lucas Insua", "4-9", "Mario Talarico", "SEMIFINALES COPA A T24");

agregarResultado("Nico Avalos", "0-12", "Rodrigo Soca", "SEMIFINALES COPA A T24");

agregarResultado("Rodrigo Soca", "12-0", "Nico Avalos", "SEMIFINALES COPA A T24");

agregarResultado("Mario Talarico", "3-6", "Rodrigo Soca", "FINAL COPA A T24");

agregarResultado("Rodrigo Soca", "6-3", "Mario Talarico", "FINAL COPA A T24");

agregarResultado("Lucas Aguilera", "6-8", "Veronica Lucchesi", "CUARTOS DE FINAL COPA B T24");

agregarResultado("Veronica Lucchesi", "8-6", "Lucas Aguilera", "CUARTOS DE FINAL COPA B T24");

agregarResultado("Eze", "7-9", "Joel Alcalde", "CUARTOS DE FINAL COPA B T24");

agregarResultado("Joel Alcalde", "9-7", "Eze", "CUARTOS DE FINAL COPA B T24");

agregarResultado("Ignacio Cejas", "11-7", "Cundo", "CUARTOS DE FINAL COPA B T24");

agregarResultado("Cundo", "7-11", "Ignacio Cejas", "CUARTOS DE FINAL COPA B T24");

agregarResultado("Martin Bustos", "6-14", "Kevin Sivori", "CUARTOS DE FINAL COPA B T24");

agregarResultado("Kevin Sivori", "14-6", "Martin Bustos", "CUARTOS DE FINAL COPA B T24");

agregarResultado("Joel Alcalde", "0-10", "Veronica Lucchesi", "SEMIFINALES COPA B T24");

agregarResultado("Veronica Lucchesi", "10-0", "Joel Alcalde", "SEMIFINALES COPA B T24");

agregarResultado("Ignacio Cejas", "7-11", "Kevin Sivori", "SEMIFINALES COPA B T24");

agregarResultado("Kevin Sivori", "11-7", "Ignacio Cejas", "SEMIFINALES COPA B T24");

agregarResultado("Veronica Lucchesi", "8-6", "Kevin Sivori", "FINAL COPA B T24");

agregarResultado("Kevin Sivori", "6-8", "Veronica Lucchesi", "FINAL COPA B T24");

agregarResultado("Nico Avalos", "13-14", "Renzo Badano", "SEMIFINALES COPA DUOS T24");

agregarResultado("Renzo Badano", "14-13", "Nico Avalos", "SEMIFINALES COPA DUOS T24");

agregarResultado("Kevin Sivori", "13-14", "Pollo", "SEMIFINALES COPA DUOS T24");

agregarResultado("Pollo", "14-13", "Kevin Sivori", "SEMIFINALES COPA DUOS T24");

agregarResultado("Nico Avalos", "13-14", "Pollo", "SEMIFINALES COPA DUOS T24");

agregarResultado("Pollo", "14-13", "Nico Avalos", "SEMIFINALES COPA DUOS T24");

agregarResultado("Kevin Sivori", "13-14", "Renzo Badano", "SEMIFINALES COPA DUOS T24");

agregarResultado("Renzo Badano", "14-13", "Kevin Sivori", "SEMIFINALES COPA DUOS T24");

agregarResultado("Lucas Insua", "15-20", "Rodrigo Soca", "SEMIFINALES COPA DUOS T24");

agregarResultado("Rodrigo Soca", "20-15", "Lucas Insua", "SEMIFINALES COPA DUOS T24");

agregarResultado("Mario Talarico", "15-20", "Lucas Aguilera", "SEMIFINALES COPA DUOS T24");

agregarResultado("Lucas Aguilera", "20-15", "Mario Talarico", "SEMIFINALES COPA DUOS T24");

agregarResultado("Lucas Insua", "15-20", "Lucas Aguilera", "SEMIFINALES COPA DUOS T24");

agregarResultado("Lucas Aguilera", "20-15", "Lucas Insua", "SEMIFINALES COPA DUOS T24");

agregarResultado("Mario Talarico", "15-20", "Rodrigo Soca", "SEMIFINALES COPA DUOS T24");

agregarResultado("Rodrigo Soca", "20-15", "Mario Talarico", "SEMIFINALES COPA DUOS T24");

agregarResultado("Renzo Badano", "15-16", "Rodrigo Soca", "FINAL COPA DUOS T24");

agregarResultado("Rodrigo Soca", "16-15", "Renzo Badano", "FINAL COPA DUOS T24");

agregarResultado("Pollo", "15-16", "Lucas Aguilera", "FINAL COPA DUOS T24");

agregarResultado("Lucas Aguilera", "16-15", "Pollo", "FINAL COPA DUOS T24");

agregarResultado("Renzo Badano", "15-16", "Lucas Aguilera", "FINAL COPA DUOS T24");

agregarResultado("Lucas Aguilera", "16-15", "Renzo Badano", "FINAL COPA DUOS T24");

agregarResultado("Pollo", "15-16", "Rodrigo Soca", "FINAL COPA DUOS T24");

agregarResultado("Rodrigo Soca", "16-15", "Pollo", "FINAL COPA DUOS T24");

agregarResultado("Rodrigo Soca", "9-4", "Pollo", "32AVOS DE FINAL COPA CAMPEONES T24");

agregarResultado("Pollo", "4-9", "Rodrigo Soca", "32AVOS DE FINAL COPA CAMPEONES T24");

agregarResultado("Fabrizio Escolano", "4-6", "Moreno Perez", "32AVOS DE FINAL COPA CAMPEONES T24");

agregarResultado("Moreno Perez", "6-4", "Fabrizio Escolano", "32AVOS DE FINAL COPA CAMPEONES T24");

agregarResultado("Benja", "2-5", "Mario Talarico", "32AVOS DE FINAL COPA CAMPEONES T24");

agregarResultado("Mario Talarico", "5-2", "Benja", "32AVOS DE FINAL COPA CAMPEONES T24");

agregarResultado("Rodrigo Soca", "5-5", "Cami", "16AVOS DE FINAL COPA CAMPEONES T24");

agregarResultado("Cami", "5-5", "Rodrigo Soca", "16AVOS DE FINAL COPA CAMPEONES T24");

agregarResultado("Moreno Perez", "1-5", "Mario Talarico", "16AVOS DE FINAL COPA CAMPEONES T24");

agregarResultado("Mario Talarico", "5-1", "Moreno Perez", "16AVOS DE FINAL COPA CAMPEONES T24");

agregarResultado("Rodrigo Soca", "7-3", "Cami", "DESEMPATE 16AVOS DE FINAL COPA CAMPEONES T24");

agregarResultado("Cami", "3-7", "Rodrigo Soca", "DESEMPATE 16AVOS DE FINAL COPA CAMPEONES T24");

agregarResultado("Rodrigo Soca", "13-11", "Rodrigo Talarico", "OCTAVOS DE FINAL COPA CAMPEONES T24");

agregarResultado("Rodrigo Talarico", "11-13", "Rodrigo Soca", "OCTAVOS DE FINAL COPA CAMPEONES T24");

agregarResultado("Mario Talarico", "11-5", "Pancho Muzzio", "OCTAVOS DE FINAL COPA CAMPEONES T24");

agregarResultado("Pancho Muzzio", "5-11", "Mario Talarico", "OCTAVOS DE FINAL COPA CAMPEONES T24");

agregarResultado("Nico Avalos", "9-13", "Lucas Insua", "OCTAVOS DE FINAL COPA CAMPEONES T24");

agregarResultado("Lucas Insua", "13-9", "Nico Avalos", "OCTAVOS DE FINAL COPA CAMPEONES T24");

agregarResultado("Rodrigo Soca", "12-12", "Luciano Hufschmid", "CUARTOS DE FINAL COPA CAMPEONES T24");

agregarResultado("Luciano Hufschmid", "12-12", "Rodrigo Soca", "CUARTOS DE FINAL COPA CAMPEONES T24");

agregarResultado("Mario Talarico", "11-9", "Lucas Insua", "CUARTOS DE FINAL COPA CAMPEONES T24");

agregarResultado("Lucas Insua", "9-11", "Mario Talarico", "CUARTOS DE FINAL COPA CAMPEONES T24");

agregarResultado("Rodrigo Soca", "11-6", "Luciano Hufschmid", "DESEMPATE CUARTOS DE FINAL COPA CAMPEONES T24");

agregarResultado("Luciano Hufschmid", "6-11", "Rodrigo Soca", "DESEMPATE CUARTOS DE FINAL COPA CAMPEONES T24");

agregarResultado("Rodrigo Soca", "12-8", "Lucas Aguilera", "SEMIFINALES COPA CAMPEONES T24");

agregarResultado("Lucas Aguilera", "8-12", "Rodrigo Soca", "SEMIFINALES COPA CAMPEONES T24");

agregarResultado("Mario Talarico", "9-5", "Gabriel Talarico", "SEMIFINALES COPA CAMPEONES T24");

agregarResultado("Gabriel Talarico", "5-9", "Mario Talarico", "SEMIFINALES COPA CAMPEONES T24");

agregarResultado("Rodrigo Soca", "6-3", "Mario Talarico", "FINAL COPA CAMPEONES T24");

agregarResultado("Mario Talarico", "3-6", "Rodrigo Soca", "FINAL COPA CAMPEONES T24");

agregarResultado("Nico Avalos", "8-6", "Cristian Serpico", "PROMOCION T24");

agregarResultado("Cristian Serpico", "6-8", "Nico Avalos", "PROMOCION T24");

agregarResultado("Moreno Perez", "13-6", "Lucas Aguilera", "PROMOCION T24");

agregarResultado("Lucas Aguilera", "6-13", "Moreno Perez", "PROMOCION T24");

agregarResultado("Cristian Hantis", "1-1", "Cundo", "FASE DE GRUPOS COPA TOTAL T25");

agregarResultado("Cundo", "1-1", "Cristian Hantis", "FASE DE GRUPOS COPA TOTAL T25");

agregarResultado("Benja", "1-0", "Luciano Hufschmid", "FASE DE GRUPOS COPA TOTAL T25");

agregarResultado("Luciano Hufschmid", "0-1", "Benja", "FASE DE GRUPOS COPA TOTAL T25");

agregarResultado("Luciano Hufschmid", "5-2", "Cundo", "FASE DE GRUPOS COPA TOTAL T25");

agregarResultado("Cundo", "2-5", "Luciano Hufschmid", "FASE DE GRUPOS COPA TOTAL T25");

agregarResultado("Cristian Hantis", "1-5", "Benja", "FASE DE GRUPOS COPA TOTAL T25");

agregarResultado("Benja", "5-1", "Cristian Hantis", "FASE DE GRUPOS COPA TOTAL T25");

agregarResultado("Renzo Badano", "2-2", "Rodrigo Soca", "FASE DE GRUPOS COPA TOTAL T25");

agregarResultado("Rodrigo Soca", "2-2", "Renzo Badano", "FASE DE GRUPOS COPA TOTAL T25");

agregarResultado("Moreno Perez", "7-3", "Bruno Alonso", "FASE DE GRUPOS COPA TOTAL T25");

agregarResultado("Bruno Alonso", "3-7", "Moreno Perez", "FASE DE GRUPOS COPA TOTAL T25");

agregarResultado("Bruno Alonso", "5-5", "Rodrigo Soca", "FASE DE GRUPOS COPA TOTAL T25");

agregarResultado("Rodrigo Soca", "5-5", "Bruno Alonso", "FASE DE GRUPOS COPA TOTAL T25");

agregarResultado("Renzo Badano", "5-5", "Moreno Perez", "FASE DE GRUPOS COPA TOTAL T25");

agregarResultado("Moreno Perez", "5-5", "Renzo Badano", "FASE DE GRUPOS COPA TOTAL T25");

agregarResultado("Eze", "2-0", "Rodrigo Talarico", "FASE DE GRUPOS COPA TOTAL T25");

agregarResultado("Rodrigo Talarico", "0-2", "Eze", "FASE DE GRUPOS COPA TOTAL T25");

agregarResultado("Kevin Sivori", "3-1", "Pancho Muzzio", "FASE DE GRUPOS COPA TOTAL T25");

agregarResultado("Pancho Muzzio", "1-3", "Kevin Sivori", "FASE DE GRUPOS COPA TOTAL T25");

agregarResultado("Pancho Muzzio", "1-5", "Rodrigo Talarico", "FASE DE GRUPOS COPA TOTAL T25");

agregarResultado("Rodrigo Talarico", "5-1", "Pancho Muzzio", "FASE DE GRUPOS COPA TOTAL T25");

agregarResultado("Eze", "3-8", "Kevin Sivori", "FASE DE GRUPOS COPA TOTAL T25");

agregarResultado("Kevin Sivori", "8-3", "Eze", "FASE DE GRUPOS COPA TOTAL T25");

agregarResultado("Santi", "1-0", "Gabriel Talarico", "FASE DE GRUPOS COPA TOTAL T25");

agregarResultado("Gabriel Talarico", "0-1", "Santi", "FASE DE GRUPOS COPA TOTAL T25");

agregarResultado("Jhose", "2-0", "Yago", "FASE DE GRUPOS COPA TOTAL T25");

agregarResultado("Yago", "0-2", "Jhose", "FASE DE GRUPOS COPA TOTAL T25");

agregarResultado("Yago", "4-2", "Gabriel Talarico", "FASE DE GRUPOS COPA TOTAL T25");

agregarResultado("Gabriel Talarico", "2-4", "Yago", "FASE DE GRUPOS COPA TOTAL T25");

agregarResultado("Santi", "3-3", "Jhose", "FASE DE GRUPOS COPA TOTAL T25");

agregarResultado("Jhose", "3-3", "Santi", "FASE DE GRUPOS COPA TOTAL T25");

agregarResultado("Felipe Galante", "1-3", "Pollo", "FASE DE GRUPOS COPA TOTAL T25");

agregarResultado("Pollo", "3-1", "Felipe Galante", "FASE DE GRUPOS COPA TOTAL T25");

agregarResultado("Lucas Insua", "4-0", "Mario Talarico", "FASE DE GRUPOS COPA TOTAL T25");

agregarResultado("Mario Talarico", "0-4", "Lucas Insua", "FASE DE GRUPOS COPA TOTAL T25");

agregarResultado("Mario Talarico", "5-2", "Pollo", "FASE DE GRUPOS COPA TOTAL T25");

agregarResultado("Pollo", "2-5", "Mario Talarico", "FASE DE GRUPOS COPA TOTAL T25");

agregarResultado("Felipe Galante", "5-5", "Lucas Insua", "FASE DE GRUPOS COPA TOTAL T25");

agregarResultado("Lucas Insua", "5-5", "Felipe Galante", "FASE DE GRUPOS COPA TOTAL T25");

agregarResultado("Joel Alcalde", "1-6", "Cami", "FASE DE GRUPOS COPA TOTAL T25");

agregarResultado("Cami", "6-1", "Joel Alcalde", "FASE DE GRUPOS COPA TOTAL T25");

agregarResultado("Veronica Lucchesi", "0-2", "Nico Avalos", "FASE DE GRUPOS COPA TOTAL T25");

agregarResultado("Nico Avalos", "2-0", "Veronica Lucchesi", "FASE DE GRUPOS COPA TOTAL T25");

agregarResultado("Nico Avalos", "3-5", "Cami", "FASE DE GRUPOS COPA TOTAL T25");

agregarResultado("Cami", "5-3", "Nico Avalos", "FASE DE GRUPOS COPA TOTAL T25");

agregarResultado("Joel Alcalde", "5-5", "Veronica Lucchesi", "FASE DE GRUPOS COPA TOTAL T25");

agregarResultado("Veronica Lucchesi", "5-5", "Joel Alcalde", "FASE DE GRUPOS COPA TOTAL T25");

agregarResultado("Cristian Serpico", "3-3", "Fabrizio Escolano", "FASE DE GRUPOS COPA TOTAL T25");

agregarResultado("Fabrizio Escolano", "3-3", "Cristian Serpico", "FASE DE GRUPOS COPA TOTAL T25");

agregarResultado("Martin Bustos", "3-0", "Ignacio Cejas", "FASE DE GRUPOS COPA TOTAL T25");

agregarResultado("Ignacio Cejas", "0-3", "Martin Bustos", "FASE DE GRUPOS COPA TOTAL T25");

agregarResultado("Fabrizio Escolano", "5-5", "Lucas Aguilera", "FASE DE GRUPOS COPA TOTAL T25");

agregarResultado("Lucas Aguilera", "5-5", "Fabrizio Escolano", "FASE DE GRUPOS COPA TOTAL T25");

agregarResultado("Cristian Serpico", "2-6", "Martin Bustos", "FASE DE GRUPOS COPA TOTAL T25");

agregarResultado("Martin Bustos", "6-2", "Cristian Serpico", "FASE DE GRUPOS COPA TOTAL T25");

agregarResultado("Benja", "5-4", "Cundo", "FASE DE GRUPOS COPA TOTAL T25");

agregarResultado("Cundo", "4-5", "Benja", "FASE DE GRUPOS COPA TOTAL T25");

agregarResultado("Luciano Hufschmid", "3-4", "Cristian Hantis", "FASE DE GRUPOS COPA TOTAL T25");

agregarResultado("Cristian Hantis", "4-3", "Luciano Hufschmid", "FASE DE GRUPOS COPA TOTAL T25");

agregarResultado("Cundo", "4-1", "Cristian Hantis", "FASE DE GRUPOS COPA TOTAL T25");

agregarResultado("Cristian Hantis", "1-4", "Cundo", "FASE DE GRUPOS COPA TOTAL T25");

agregarResultado("Luciano Hufschmid", "0-4", "Benja", "FASE DE GRUPOS COPA TOTAL T25");

agregarResultado("Benja", "4-0", "Luciano Hufschmid", "FASE DE GRUPOS COPA TOTAL T25");

agregarResultado("Moreno Perez", "2-1", "Rodrigo Soca", "FASE DE GRUPOS COPA TOTAL T25");

agregarResultado("Rodrigo Soca", "1-2", "Moreno Perez", "FASE DE GRUPOS COPA TOTAL T25");

agregarResultado("Bruno Alonso", "4-5", "Renzo Badano", "FASE DE GRUPOS COPA TOTAL T25");

agregarResultado("Renzo Badano", "5-4", "Bruno Alonso", "FASE DE GRUPOS COPA TOTAL T25");

agregarResultado("Rodrigo Soca", "1-2", "Renzo Badano", "FASE DE GRUPOS COPA TOTAL T25");

agregarResultado("Renzo Badano", "2-1", "Rodrigo Soca", "FASE DE GRUPOS COPA TOTAL T25");

agregarResultado("Bruno Alonso", "2-6", "Moreno Perez", "FASE DE GRUPOS COPA TOTAL T25");

agregarResultado("Moreno Perez", "6-2", "Bruno Alonso", "FASE DE GRUPOS COPA TOTAL T25");

agregarResultado("Kevin Sivori", "3-2", "Rodrigo Talarico", "FASE DE GRUPOS COPA TOTAL T25");

agregarResultado("Rodrigo Talarico", "2-3", "Kevin Sivori", "FASE DE GRUPOS COPA TOTAL T25");

agregarResultado("Pancho Muzzio", "2-4", "Eze", "FASE DE GRUPOS COPA TOTAL T25");

agregarResultado("Eze", "4-2", "Pancho Muzzio", "FASE DE GRUPOS COPA TOTAL T25");

agregarResultado("Rodrigo Talarico", "3-1", "Eze", "FASE DE GRUPOS COPA TOTAL T25");

agregarResultado("Eze", "1-3", "Rodrigo Talarico", "FASE DE GRUPOS COPA TOTAL T25");

agregarResultado("Pancho Muzzio", "5-4", "Kevin Sivori", "FASE DE GRUPOS COPA TOTAL T25");

agregarResultado("Kevin Sivori", "4-5", "Pancho Muzzio", "FASE DE GRUPOS COPA TOTAL T25");

agregarResultado("Jhose", "2-4", "Gabriel Talarico", "FASE DE GRUPOS COPA TOTAL T25");

agregarResultado("Gabriel Talarico", "4-2", "Jhose", "FASE DE GRUPOS COPA TOTAL T25");

agregarResultado("Yago", "5-4", "Santi", "FASE DE GRUPOS COPA TOTAL T25");

agregarResultado("Santi", "4-5", "Yago", "FASE DE GRUPOS COPA TOTAL T25");

agregarResultado("Gabriel Talarico", "5-3", "Santi", "FASE DE GRUPOS COPA TOTAL T25");

agregarResultado("Santi", "3-5", "Gabriel Talarico", "FASE DE GRUPOS COPA TOTAL T25");

agregarResultado("Yago", "3-3", "Jhose", "FASE DE GRUPOS COPA TOTAL T25");

agregarResultado("Jhose", "3-3", "Yago", "FASE DE GRUPOS COPA TOTAL T25");

agregarResultado("Lucas Insua", "3-3", "Pollo", "FASE DE GRUPOS COPA TOTAL T25");

agregarResultado("Pollo", "3-3", "Lucas Insua", "FASE DE GRUPOS COPA TOTAL T25");

agregarResultado("Mario Talarico", "4-3", "Felipe Galante", "FASE DE GRUPOS COPA TOTAL T25");

agregarResultado("Felipe Galante", "3-4", "Mario Talarico", "FASE DE GRUPOS COPA TOTAL T25");

agregarResultado("Pollo", "0-3", "Felipe Galante", "FASE DE GRUPOS COPA TOTAL T25");

agregarResultado("Felipe Galante", "3-0", "Pollo", "FASE DE GRUPOS COPA TOTAL T25");

agregarResultado("Mario Talarico", "4-1", "Lucas Insua", "FASE DE GRUPOS COPA TOTAL T25");

agregarResultado("Lucas Insua", "1-4", "Mario Talarico", "FASE DE GRUPOS COPA TOTAL T25");

agregarResultado("Veronica Lucchesi", "7-3", "Cami", "FASE DE GRUPOS COPA TOTAL T25");

agregarResultado("Cami", "3-7", "Veronica Lucchesi", "FASE DE GRUPOS COPA TOTAL T25");

agregarResultado("Nico Avalos", "4-3", "Joel Alcalde", "FASE DE GRUPOS COPA TOTAL T25");

agregarResultado("Joel Alcalde", "3-4", "Nico Avalos", "FASE DE GRUPOS COPA TOTAL T25");

agregarResultado("Cami", "6-0", "Joel Alcalde", "FASE DE GRUPOS COPA TOTAL T25");

agregarResultado("Joel Alcalde", "0-6", "Cami", "FASE DE GRUPOS COPA TOTAL T25");

agregarResultado("Nico Avalos", "4-2", "Veronica Lucchesi", "FASE DE GRUPOS COPA TOTAL T25");

agregarResultado("Veronica Lucchesi", "2-4", "Nico Avalos", "FASE DE GRUPOS COPA TOTAL T25");

agregarResultado("Ignacio Cejas", "2-2", "Lucas Aguilera", "FASE DE GRUPOS COPA TOTAL T25");

agregarResultado("Lucas Aguilera", "2-2", "Ignacio Cejas", "FASE DE GRUPOS COPA TOTAL T25");

agregarResultado("Fabrizio Escolano", "2-10", "Martin Bustos", "FASE DE GRUPOS COPA TOTAL T25");

agregarResultado("Martin Bustos", "10-2", "Fabrizio Escolano", "FASE DE GRUPOS COPA TOTAL T25");

agregarResultado("Martin Bustos", "0-2", "Lucas Aguilera", "FASE DE GRUPOS COPA TOTAL T25");

agregarResultado("Lucas Aguilera", "2-0", "Martin Bustos", "FASE DE GRUPOS COPA TOTAL T25");

agregarResultado("Ignacio Cejas", "1-3", "Cristian Serpico", "FASE DE GRUPOS COPA TOTAL T25");

agregarResultado("Cristian Serpico", "3-1", "Ignacio Cejas", "FASE DE GRUPOS COPA TOTAL T25");

agregarResultado("Cundo", "1-0", "Luciano Hufschmid", "FASE DE GRUPOS COPA TOTAL T25");

agregarResultado("Luciano Hufschmid", "0-1", "Cundo", "FASE DE GRUPOS COPA TOTAL T25");

agregarResultado("Benja", "3-1", "Cristian Hantis", "FASE DE GRUPOS COPA TOTAL T25");

agregarResultado("Cristian Hantis", "1-3", "Benja", "FASE DE GRUPOS COPA TOTAL T25");

agregarResultado("Cundo", "1-2", "Benja", "FASE DE GRUPOS COPA TOTAL T25");

agregarResultado("Benja", "2-1", "Cundo", "FASE DE GRUPOS COPA TOTAL T25");

agregarResultado("Cristian Hantis", "2-0", "Luciano Hufschmid", "FASE DE GRUPOS COPA TOTAL T25");

agregarResultado("Luciano Hufschmid", "0-2", "Cristian Hantis", "FASE DE GRUPOS COPA TOTAL T25");

agregarResultado("Rodrigo Soca", "3-3", "Bruno Alonso", "FASE DE GRUPOS COPA TOTAL T25");

agregarResultado("Bruno Alonso", "3-3", "Rodrigo Soca", "FASE DE GRUPOS COPA TOTAL T25");

agregarResultado("Moreno Perez", "0-4", "Renzo Badano", "FASE DE GRUPOS COPA TOTAL T25");

agregarResultado("Renzo Badano", "4-0", "Moreno Perez", "FASE DE GRUPOS COPA TOTAL T25");

agregarResultado("Rodrigo Soca", "2-1", "Moreno Perez", "FASE DE GRUPOS COPA TOTAL T25");

agregarResultado("Moreno Perez", "1-2", "Rodrigo Soca", "FASE DE GRUPOS COPA TOTAL T25");

agregarResultado("Renzo Badano", "2-3", "Bruno Alonso", "FASE DE GRUPOS COPA TOTAL T25");

agregarResultado("Bruno Alonso", "3-2", "Renzo Badano", "FASE DE GRUPOS COPA TOTAL T25");

agregarResultado("Rodrigo Talarico", "2-1", "Pancho Muzzio", "FASE DE GRUPOS COPA TOTAL T25");

agregarResultado("Pancho Muzzio", "1-2", "Rodrigo Talarico", "FASE DE GRUPOS COPA TOTAL T25");

agregarResultado("Kevin Sivori", "1-6", "Eze", "FASE DE GRUPOS COPA TOTAL T25");

agregarResultado("Eze", "6-1", "Kevin Sivori", "FASE DE GRUPOS COPA TOTAL T25");

agregarResultado("Rodrigo Talarico", "7-3", "Kevin Sivori", "FASE DE GRUPOS COPA TOTAL T25");

agregarResultado("Kevin Sivori", "3-7", "Rodrigo Talarico", "FASE DE GRUPOS COPA TOTAL T25");

agregarResultado("Eze", "1-1", "Pancho Muzzio", "FASE DE GRUPOS COPA TOTAL T25");

agregarResultado("Pancho Muzzio", "1-1", "Eze", "FASE DE GRUPOS COPA TOTAL T25");

agregarResultado("Gabriel Talarico", "1-1", "Yago", "FASE DE GRUPOS COPA TOTAL T25");

agregarResultado("Yago", "1-1", "Gabriel Talarico", "FASE DE GRUPOS COPA TOTAL T25");

agregarResultado("Jhose", "1-0", "Santi", "FASE DE GRUPOS COPA TOTAL T25");

agregarResultado("Santi", "0-1", "Jhose", "FASE DE GRUPOS COPA TOTAL T25");

agregarResultado("Gabriel Talarico", "1-3", "Jhose", "FASE DE GRUPOS COPA TOTAL T25");

agregarResultado("Jhose", "3-1", "Gabriel Talarico", "FASE DE GRUPOS COPA TOTAL T25");

agregarResultado("Santi", "4-4", "Yago", "FASE DE GRUPOS COPA TOTAL T25");

agregarResultado("Yago", "4-4", "Santi", "FASE DE GRUPOS COPA TOTAL T25");

agregarResultado("Pollo", "4-1", "Mario Talarico", "FASE DE GRUPOS COPA TOTAL T25");

agregarResultado("Mario Talarico", "1-4", "Pollo", "FASE DE GRUPOS COPA TOTAL T25");

agregarResultado("Lucas Insua", "1-1", "Felipe Galante", "FASE DE GRUPOS COPA TOTAL T25");

agregarResultado("Felipe Galante", "1-1", "Lucas Insua", "FASE DE GRUPOS COPA TOTAL T25");

agregarResultado("Pollo", "4-3", "Lucas Insua", "FASE DE GRUPOS COPA TOTAL T25");

agregarResultado("Lucas Insua", "3-4", "Pollo", "FASE DE GRUPOS COPA TOTAL T25");

agregarResultado("Felipe Galante", "4-4", "Mario Talarico", "FASE DE GRUPOS COPA TOTAL T25");

agregarResultado("Mario Talarico", "4-4", "Felipe Galante", "FASE DE GRUPOS COPA TOTAL T25");

agregarResultado("Cami", "0-2", "Nico Avalos", "FASE DE GRUPOS COPA TOTAL T25");

agregarResultado("Nico Avalos", "2-0", "Cami", "FASE DE GRUPOS COPA TOTAL T25");

agregarResultado("Veronica Lucchesi", "3-0", "Joel Alcalde", "FASE DE GRUPOS COPA TOTAL T25");

agregarResultado("Joel Alcalde", "0-3", "Veronica Lucchesi", "FASE DE GRUPOS COPA TOTAL T25");

agregarResultado("Cami", "2-1", "Veronica Lucchesi", "FASE DE GRUPOS COPA TOTAL T25");

agregarResultado("Veronica Lucchesi", "1-2", "Cami", "FASE DE GRUPOS COPA TOTAL T25");

agregarResultado("Joel Alcalde", "0-7", "Nico Avalos", "FASE DE GRUPOS COPA TOTAL T25");

agregarResultado("Nico Avalos", "7-0", "Joel Alcalde", "FASE DE GRUPOS COPA TOTAL T25");

agregarResultado("Cristian Serpico", "3-2", "Lucas Aguilera", "FASE DE GRUPOS COPA TOTAL T25");

agregarResultado("Lucas Aguilera", "2-3", "Cristian Serpico", "FASE DE GRUPOS COPA TOTAL T25");

agregarResultado("Ignacio Cejas", "2-2", "Fabrizio Escolano", "FASE DE GRUPOS COPA TOTAL T25");

agregarResultado("Fabrizio Escolano", "2-2", "Ignacio Cejas", "FASE DE GRUPOS COPA TOTAL T25");

agregarResultado("Martin Bustos", "5-7", "Yago", "OCTAVOS DE FINAL COPA TOTAL T25");

agregarResultado("Yago", "7-5", "Martin Bustos", "OCTAVOS DE FINAL COPA TOTAL T25");

agregarResultado("Benja", "5-4", "Cristian Serpico", "OCTAVOS DE FINAL COPA TOTAL T25");

agregarResultado("Cristian Serpico", "4-5", "Benja", "OCTAVOS DE FINAL COPA TOTAL T25");

agregarResultado("Mario Talarico", "8-5", "Eze", "OCTAVOS DE FINAL COPA TOTAL T25");

agregarResultado("Eze", "5-8", "Mario Talarico", "OCTAVOS DE FINAL COPA TOTAL T25");

agregarResultado("Cami", "9-8", "Pollo", "OCTAVOS DE FINAL COPA TOTAL T25");

agregarResultado("Pollo", "8-9", "Cami", "OCTAVOS DE FINAL COPA TOTAL T25");

agregarResultado("Renzo Badano", "5-8", "Cundo", "OCTAVOS DE FINAL COPA TOTAL T25");

agregarResultado("Cundo", "8-5", "Renzo Badano", "OCTAVOS DE FINAL COPA TOTAL T25");

agregarResultado("Nico Avalos", "8-5", "Moreno Perez", "OCTAVOS DE FINAL COPA TOTAL T25");

agregarResultado("Moreno Perez", "5-8", "Nico Avalos", "OCTAVOS DE FINAL COPA TOTAL T25");

agregarResultado("Jhose", "3-5", "Kevin Sivori", "OCTAVOS DE FINAL COPA TOTAL T25");

agregarResultado("Kevin Sivori", "5-3", "Jhose", "OCTAVOS DE FINAL COPA TOTAL T25");

agregarResultado("Rodrigo Talarico", "5-16", "Veronica Lucchesi", "OCTAVOS DE FINAL COPA TOTAL T25");

agregarResultado("Veronica Lucchesi", "16-5", "Rodrigo Talarico", "OCTAVOS DE FINAL COPA TOTAL T25");

agregarResultado("Yago", "8-6", "Mario Talarico", "CUARTOS DE FINAL COPA TOTAL T25");

agregarResultado("Mario Talarico", "6-8", "Yago", "CUARTOS DE FINAL COPA TOTAL T25");

agregarResultado("Cami", "11-12", "Cundo", "CUARTOS DE FINAL COPA TOTAL T25");

agregarResultado("Cundo", "12-11", "Cami", "CUARTOS DE FINAL COPA TOTAL T25");

agregarResultado("Veronica Lucchesi", "9-12", "Benja", "CUARTOS DE FINAL COPA TOTAL T25");

agregarResultado("Benja", "12-9", "Veronica Lucchesi", "CUARTOS DE FINAL COPA TOTAL T25");

agregarResultado("Kevin Sivori", "10-10", "Nico Avalos", "CUARTOS DE FINAL COPA TOTAL T25");

agregarResultado("Nico Avalos", "10-10", "Kevin Sivori", "CUARTOS DE FINAL COPA TOTAL T25");

agregarResultado("Kevin Sivori", "1-1", "Nico Avalos", "DESEMPATE 1 CUARTOS DE FINAL COPA TOTAL T25");

agregarResultado("Nico Avalos", "1-1", "Kevin Sivori", "DESEMPATE 1 CUARTOS DE FINAL COPA TOTAL T25");

agregarResultado("Kevin Sivori", "3-2", "Nico Avalos", "DESEMPATE 2 CUARTOS DE FINAL COPA TOTAL T25");

agregarResultado("Nico Avalos", "2-3", "Kevin Sivori", "DESEMPATE 2 CUARTOS DE FINAL COPA TOTAL T25");

agregarResultado("Cundo", "19-10", "Kevin Sivori", "SEMIFINALES COPA TOTAL T25");

agregarResultado("Kevin Sivori", "10-19", "Cundo", "SEMIFINALES COPA TOTAL T25");

agregarResultado("Benja", "12-4", "Yago", "SEMIFINALES COPA TOTAL T25");

agregarResultado("Yago", "4-12", "Benja", "SEMIFINALES COPA TOTAL T25");

agregarResultado("Cundo", "9-7", "Benja", "FINAL COPA TOTAL T25");

agregarResultado("Benja", "7-9", "Cundo", "FINAL COPA TOTAL T25");

agregarResultado("Jhose", "3-8", "Pollo", "OCTAVOS DE FINAL COPA A T25");

agregarResultado("Pollo", "8-3", "Jhose", "OCTAVOS DE FINAL COPA A T25");

agregarResultado("Yago", "7-6", "Lucas Insua", "OCTAVOS DE FINAL COPA A T25");

agregarResultado("Lucas Insua", "6-7", "Yago", "OCTAVOS DE FINAL COPA A T25");

agregarResultado("Nico Avalos", "8-5", "Rodrigo Talarico", "OCTAVOS DE FINAL COPA A T25");

agregarResultado("Rodrigo Talarico", "5-8", "Nico Avalos", "OCTAVOS DE FINAL COPA A T25");

agregarResultado("Moreno Perez", "5-8", "Gabriel Talarico", "OCTAVOS DE FINAL COPA A T25");

agregarResultado("Gabriel Talarico", "8-5", "Moreno Perez", "OCTAVOS DE FINAL COPA A T25");

agregarResultado("Pollo", "7-9", "Veronica Lucchesi", "CUARTOS DE FINAL COPA A T25");

agregarResultado("Veronica Lucchesi", "9-7", "Pollo", "CUARTOS DE FINAL COPA A T25");

agregarResultado("Gabriel Talarico", "13-11", "Cami", "CUARTOS DE FINAL COPA A T25");

agregarResultado("Cami", "11-13", "Gabriel Talarico", "CUARTOS DE FINAL COPA A T25");

agregarResultado("Nico Avalos", "10-10", "Kevin Sivori", "CUARTOS DE FINAL COPA A T25");

agregarResultado("Kevin Sivori", "10-10", "Nico Avalos", "CUARTOS DE FINAL COPA A T25");

agregarResultado("Yago", "8-5", "Bruno Alonso", "CUARTOS DE FINAL COPA A T25");

agregarResultado("Bruno Alonso", "5-8", "Yago", "CUARTOS DE FINAL COPA A T25");

agregarResultado("Nico Avalos", "1-1", "Kevin Sivori", "DESEMPATE 1 CUARTOS DE FINAL COPA A T25");

agregarResultado("Kevin Sivori", "1-1", "Nico Avalos", "DESEMPATE 1 CUARTOS DE FINAL COPA A T25");

agregarResultado("Nico Avalos", "2-3", "Kevin Sivori", "DESEMPATE 2 CUARTOS DE FINAL COPA A T25");

agregarResultado("Kevin Sivori", "3-2", "Nico Avalos", "DESEMPATE 2 CUARTOS DE FINAL COPA A T25");

agregarResultado("Yago", "4-10", "Veronica Lucchesi", "SEMIFINALES COPA A T25");

agregarResultado("Veronica Lucchesi", "10-4", "Yago", "SEMIFINALES COPA A T25");

agregarResultado("Kevin Sivori", "10-7", "Gabriel Talarico", "SEMIFINALES COPA A T25");

agregarResultado("Gabriel Talarico", "7-10", "Kevin Sivori", "SEMIFINALES COPA A T25");

agregarResultado("Veronica Lucchesi", "14-8", "Kevin Sivori", "FINAL COPA A T25");

agregarResultado("Kevin Sivori", "8-14", "Veronica Lucchesi", "FINAL COPA A T25");

agregarResultado("Benja", "12-12", "Cundo", "CUARTOS DE FINAL COPA B T25");

agregarResultado("Cundo", "12-12", "Benja", "CUARTOS DE FINAL COPA B T25");

agregarResultado("Renzo Badano", "10-0", "Cristian Serpico", "CUARTOS DE FINAL COPA B T25");

agregarResultado("Cristian Serpico", "0-10", "Renzo Badano", "CUARTOS DE FINAL COPA B T25");

agregarResultado("Mario Talarico", "6-9", "Eze", "CUARTOS DE FINAL COPA B T25");

agregarResultado("Eze", "9-6", "Mario Talarico", "CUARTOS DE FINAL COPA B T25");

agregarResultado("Martin Bustos", "4-9", "Felipe Galante", "CUARTOS DE FINAL COPA B T25");

agregarResultado("Felipe Galante", "9-4", "Martin Bustos", "CUARTOS DE FINAL COPA B T25");

agregarResultado("Benja", "0-0", "Cundo", "DESEMPATE 1 CUARTOS DE FINAL COPA B T25");

agregarResultado("Cundo", "0-0", "Benja", "DESEMPATE 1 CUARTOS DE FINAL COPA B T25");

agregarResultado("Benja", "3-0", "Cundo", "DESEMPATE 2 CUARTOS DE FINAL COPA B T25");

agregarResultado("Cundo", "0-3", "Benja", "DESEMPATE 2 CUARTOS DE FINAL COPA B T25");

agregarResultado("Felipe Galante", "13-8", "Eze", "SEMIFINALES COPA B T25");

agregarResultado("Eze", "8-13", "Felipe Galante", "SEMIFINALES COPA B T25");

agregarResultado("Renzo Badano", "10-12", "Benja", "SEMIFINALES COPA B T25");

agregarResultado("Benja", "12-10", "Renzo Badano", "SEMIFINALES COPA B T25");

agregarResultado("Felipe Galante", "9-7", "Benja", "FINAL COPA B T25");

agregarResultado("Benja", "7-9", "Felipe Galante", "FINAL COPA B T25");

agregarResultado("Nico Avalos", "21-27", "Benja", "SEMIFINALES COPA DUOS T25");

agregarResultado("Benja", "27-21", "Nico Avalos", "SEMIFINALES COPA DUOS T25");

agregarResultado("Gabriel Talarico", "21-27", "Bruno Alonso", "SEMIFINALES COPA DUOS T25");

agregarResultado("Bruno Alonso", "27-21", "Gabriel Talarico", "SEMIFINALES COPA DUOS T25");

agregarResultado("Nico Avalos", "21-27", "Bruno Alonso", "SEMIFINALES COPA DUOS T25");

agregarResultado("Bruno Alonso", "27-21", "Nico Avalos", "SEMIFINALES COPA DUOS T25");

agregarResultado("Gabriel Talarico", "21-27", "Benja", "SEMIFINALES COPA DUOS T25");

agregarResultado("Benja", "27-21", "Gabriel Talarico", "SEMIFINALES COPA DUOS T25");

agregarResultado("Ignacio Cejas", "18-18", "Mario Talarico", "SEMIFINALES COPA DUOS T25");

agregarResultado("Mario Talarico", "18-18", "Ignacio Cejas", "SEMIFINALES COPA DUOS T25");

agregarResultado("Cami", "18-18", "Veronica Lucchesi", "SEMIFINALES COPA DUOS T25");

agregarResultado("Veronica Lucchesi", "18-18", "Cami", "SEMIFINALES COPA DUOS T25");

agregarResultado("Ignacio Cejas", "18-18", "Veronica Lucchesi", "SEMIFINALES COPA DUOS T25");

agregarResultado("Veronica Lucchesi", "18-18", "Ignacio Cejas", "SEMIFINALES COPA DUOS T25");

agregarResultado("Cami", "18-18", "Mario Talarico", "SEMIFINALES COPA DUOS T25");

agregarResultado("Mario Talarico", "18-18", "Cami", "SEMIFINALES COPA DUOS T25");

agregarResultado("Ignacio Cejas", "9-15", "Mario Talarico", "DESEMPATE SEMIFINALES COPA DUOS T25");

agregarResultado("Mario Talarico", "15-9", "Ignacio Cejas", "DESEMPATE SEMIFINALES COPA DUOS T25");

agregarResultado("Cami", "9-15", "Veronica Lucchesi", "DESEMPATE SEMIFINALES COPA DUOS T25");

agregarResultado("Veronica Lucchesi", "15-9", "Cami", "DESEMPATE SEMIFINALES COPA DUOS T25");

agregarResultado("Ignacio Cejas", "9-15", "Veronica Lucchesi", "DESEMPATE SEMIFINALES COPA DUOS T25");

agregarResultado("Veronica Lucchesi", "15-9", "Ignacio Cejas", "DESEMPATE SEMIFINALES COPA DUOS T25");

agregarResultado("Cami", "9-15", "Mario Talarico", "DESEMPATE SEMIFINALES COPA DUOS T25");

agregarResultado("Mario Talarico", "15-9", "Cami", "DESEMPATE SEMIFINALES COPA DUOS T25");

agregarResultado("Benja", "15-26", "Mario Talarico", "FINAL COPA DUOS T25");

agregarResultado("Mario Talarico", "26-15", "Benja", "FINAL COPA DUOS T25");

agregarResultado("Bruno Alonso", "15-26", "Veronica Lucchesi", "FINAL COPA DUOS T25");

agregarResultado("Veronica Lucchesi", "26-15", "Bruno Alonso", "FINAL COPA DUOS T25");

agregarResultado("Benja", "15-26", "Veronica Lucchesi", "FINAL COPA DUOS T25");

agregarResultado("Veronica Lucchesi", "26-15", "Benja", "FINAL COPA DUOS T25");

agregarResultado("Bruno Alonso", "15-26", "Mario Talarico", "FINAL COPA DUOS T25");

agregarResultado("Mario Talarico", "26-15", "Bruno Alonso", "FINAL COPA DUOS T25");

agregarResultado("Lucas Insua", "12-14", "Cami", "32AVOS DE FINAL COPA CAMPEONES T25");

agregarResultado("Cami", "14-12", "Lucas Insua", "32AVOS DE FINAL COPA CAMPEONES T25");

agregarResultado("Pollo", "8-7", "Jhose", "32AVOS DE FINAL COPA CAMPEONES T25");

agregarResultado("Jhose", "7-8", "Pollo", "32AVOS DE FINAL COPA CAMPEONES T25");

agregarResultado("Veronica Lucchesi", "12-6", "Gabriel Talarico", "32AVOS DE FINAL COPA CAMPEONES T25");

agregarResultado("Gabriel Talarico", "6-12", "Veronica Lucchesi", "32AVOS DE FINAL COPA CAMPEONES T25");

agregarResultado("Cami", "8-8", "Fabrizio Escolano", "16AVOS DE FINAL COPA CAMPEONES T25");

agregarResultado("Fabrizio Escolano", "8-8", "Cami", "16AVOS DE FINAL COPA CAMPEONES T25");

agregarResultado("Pollo", "8-6", "Veronica Lucchesi", "16AVOS DE FINAL COPA CAMPEONES T25");

agregarResultado("Veronica Lucchesi", "6-8", "Pollo", "16AVOS DE FINAL COPA CAMPEONES T25");

agregarResultado("Cami", "0-1", "Fabrizio Escolano", "DESEMPATE 16AVOS DE FINAL COPA CAMPEONES T25");

agregarResultado("Fabrizio Escolano", "1-0", "Cami", "DESEMPATE 16AVOS DE FINAL COPA CAMPEONES T25");

agregarResultado("Fabrizio Escolano", "9-8", "Mario Talarico", "OCTAVOS DE FINAL COPA CAMPEONES T25");

agregarResultado("Mario Talarico", "8-9", "Fabrizio Escolano", "OCTAVOS DE FINAL COPA CAMPEONES T25");

agregarResultado("Pollo", "8-3", "Lucas Aguilera", "OCTAVOS DE FINAL COPA CAMPEONES T25");

agregarResultado("Lucas Aguilera", "3-8", "Pollo", "OCTAVOS DE FINAL COPA CAMPEONES T25");

agregarResultado("Bruno Alonso", "6-5", "Kevin Sivori", "OCTAVOS DE FINAL COPA CAMPEONES T25");

agregarResultado("Kevin Sivori", "5-6", "Bruno Alonso", "OCTAVOS DE FINAL COPA CAMPEONES T25");

agregarResultado("Fabrizio Escolano", "10-5", "Rodrigo Soca", "CUARTOS DE FINAL COPA CAMPEONES T25");

agregarResultado("Rodrigo Soca", "5-10", "Fabrizio Escolano", "CUARTOS DE FINAL COPA CAMPEONES T25");

agregarResultado("Pollo", "7-5", "Bruno Alonso", "CUARTOS DE FINAL COPA CAMPEONES T25");

agregarResultado("Bruno Alonso", "5-7", "Pollo", "CUARTOS DE FINAL COPA CAMPEONES T25");

agregarResultado("Fabrizio Escolano", "13-19", "Cundo", "SEMIFINALES COPA CAMPEONES T25");

agregarResultado("Cundo", "19-13", "Fabrizio Escolano", "SEMIFINALES COPA CAMPEONES T25");

agregarResultado("Pollo", "8-8", "Rodrigo Talarico", "SEMIFINALES COPA CAMPEONES T25");

agregarResultado("Rodrigo Talarico", "8-8", "Pollo", "SEMIFINALES COPA CAMPEONES T25");

agregarResultado("Pollo", "5-6", "Rodrigo Talarico", "DESEMPATE SEMIFINALES COPA CAMPEONES T25");

agregarResultado("Rodrigo Talarico", "6-5", "Pollo", "DESEMPATE SEMIFINALES COPA CAMPEONES T25");

agregarResultado("Cundo", "9-6", "Rodrigo Talarico", "FINAL COPA CAMPEONES T25");

agregarResultado("Rodrigo Talarico", "6-9", "Cundo", "FINAL COPA CAMPEONES T25");

agregarResultado("Cristian Hantis", "5-9", "Cundo", "DESEMPATE LIGA B T25");

agregarResultado("Cundo", "9-5", "Cristian Hantis", "DESEMPATE LIGA B T25");

agregarResultado("Cami", "0-4", "Ignacio Cejas", "PROMOCION T25");

agregarResultado("Ignacio Cejas", "4-0", "Cami", "PROMOCION T25");

agregarResultado("Kevin Sivori", "2-5", "Cristian Hantis", "PROMOCION T25");

agregarResultado("Cristian Hantis", "5-2", "Kevin Sivori", "PROMOCION T25");




























colores();



function agregarDatos(pos, nombre, puntos, promedio, plenos, parciales, errores, extras) {
    // Buscar el elemento con la clase "card-team-name" que contiene el nombre

    var nombres = document.getElementsByClassName("card-team-name");
    for (var i = 0; i < nombres.length; i++) {
        if (nombres[i].innerText.trim() === nombre) {
            // Encontrado el nombre, ahora actualizar los datos
            var card = nombres[i].closest('.cardEquipo');
            card.querySelector('.posRanking').innerText = pos + "°";
            card.querySelector('.card-total-points').innerText = puntos + "pts";
            card.querySelector('.card-full').innerText = plenos;
            card.querySelector('.card-partial').innerText = parciales;
            card.querySelector('.card-errors').innerText = errores;
            card.querySelector('.card-extras').innerText = extras;
            card.querySelector('.card-average').innerText = promedio;
            return; // Salir del bucle, ya se ha encontrado y actualizado el nombre
        }
    }
    // Si el nombre no se encuentra en ninguna tarjeta, mostrar un mensaje de error
    console.error("El nombre '" + nombre + "' no se encontró en las tarjetas.");

}


agregarDatos("1", "Nico Avalos", "1990", "0,727073438", "316", "933", "1488", "109");
agregarDatos("2", "Fabrizio Escolano", "1943", "0,775958466", "295", "929", "1280", "129");
agregarDatos("3", "Rodrigo Talarico", "1852", "0,717551337", "285", "857", "1439", "140");
agregarDatos("4", "Gabriel Talarico", "1836", "0,741818182", "284", "828", "1363", "156");
agregarDatos("5", "Mario Talarico", "1813", "0,713779528", "313", "744", "1483", "130");
agregarDatos("6", "Kevin Sivori", "1787", "0,709126984", "259", "885", "1376", "125");
agregarDatos("7", "Rodrigo Soca", "1781", "0,76176219", "298", "802", "1238", "85");
agregarDatos("8", "Jhose", "1778", "0,717514124", "262", "870", "1346", "122");
agregarDatos("9", "Pancho Muzzio", "1768", "0,710040161", "267", "846", "1377", "121");
agregarDatos("10", "Luciano Hufschmid", "1733", "0,692645883", "260", "806", "1436", "147");
agregarDatos("11", "Bruno Alonso", "1668", "0,69068323", "242", "826", "1347", "116");
agregarDatos("12", "Moreno Perez", "1624", "0,725", "263", "731", "1246", "104");
agregarDatos("13", "Lucas Aguilera", "1471", "0,700142789", "235", "682", "1184", "84");
agregarDatos("14", "Eze", "1401", "0,667460696", "211", "707", "1181", "61");
agregarDatos("15", "Lucas Insua", "1400", "0,675675676", "227", "628", "1217", "91");
agregarDatos("16", "Ian Gangai", "1337", "0,729405346", "217", "598", "1018", "88");
agregarDatos("17", "Pollo", "1227", "0,690878378", "174", "619", "983", "86");
agregarDatos("18", "Matheo Olivera", "1216", "0,681232493", "198", "552", "1035", "70");
agregarDatos("19", "Joel Marasco", "1208", "0,652267819", "182", "598", "1072", "64");
agregarDatos("20", "Renzo Badano", "1198", "0,613729508", "172", "604", "1176", "78");
agregarDatos("21", "Benja", "1176", "0,629213483", "164", "607", "1098", "77");
agregarDatos("22", "Tomas Torcasio", "1160", "0,650953984", "174", "576", "1032", "62");
agregarDatos("23", "Tomas Delgado", "1156", "0,688095238", "175", "553", "952", "78");
agregarDatos("24", "Anubis", "1142", "0,53339561", "142", "620", "1379", "96");
agregarDatos("25", "Joel Alcalde", "1113", "0,571355236", "173", "528", "1247", "66");
agregarDatos("26", "Ignacio Cejas", "1081", "0,615253273", "152", "562", "1043", "63");
agregarDatos("27", "Cami", "1072", "0,729748128", "167", "500", "802", "71");
agregarDatos("28", "Santi", "989", "0,532866379", "155", "470", "1231", "54");
agregarDatos("29", "Yago", "964", "0,684173172", "154", "435", "820", "67");
agregarDatos("30", "Nico Luchetti (R)", "939", "0,612524462", "122", "516", "895", "57");
agregarDatos("31", "Rodri Sebastian", "912", "0,643613267", "118", "464", "835", "94");
agregarDatos("32", "Lautaro Scocier", "904", "0,683865684", "133", "436", "652", "69");
agregarDatos("33", "Dani Bazan", "900", "0,52173913", "133", "458", "1134", "43");
agregarDatos("34", "Santi", "840", "0,570652174", "131", "396", "945", "51");
agregarDatos("35", "Joaquin Sampadaro", "797", "0,586029412", "116", "397", "847", "52");
agregarDatos("36", "Veronica Lucchesi", "781", "0,761208577", "114", "378", "534", "61");
agregarDatos("37", "Nacho Soto", "778", "0,626913779", "106", "420", "715", "40");
agregarDatos("38", "Martin Bustos", "770", "0,582010582", "93", "452", "778", "39");
agregarDatos("39", "Nahuel Scocier", "764", "0,663568773", "117", "363", "596", "50");
agregarDatos("40", "Bautista Coria", "718", "0,592409241", "95", "362", "755", "71");
agregarDatos("41", "Natanael", "643", "0,553846154", "94", "330", "681", "31");
agregarDatos("42", "Valentina Scocier", "587", "0,550200803", "78", "314", "604", "39");
agregarDatos("43", "Azul Quispe", "571", "0,579695431", "86", "282", "617", "31");
agregarDatos("44", "Facundo Marchese", "571", "0,569292124", "85", "282", "636", "34");
agregarDatos("45", "Alexis Segovia", "562", "0,624444444", "83", "283", "534", "30");
agregarDatos("46", "Ramiro Vita", "524", "0,645833333", "81", "253", "434", "28");
agregarDatos("47", "Matias Varela", "459", "0,506602641", "56", "254", "523", "37");
agregarDatos("48", "Antonella Lopez", "363", "0,48015873", "49", "193", "514", "23");
agregarDatos("49", "Manu Solbes", "347", "4,180722892", "2", "13", "68", "12");
agregarDatos("50", "Joaco Fernandez", "346", "0,260346125", "120", "449", "760", "81");
agregarDatos("51", "Felipe Galante", "338", "0,251488095", "143", "374", "827", "60");
agregarDatos("52", "Kraiizer", "333", "0,438547486", "39", "197", "480", "19");
agregarDatos("53", "Cristian Hantis", "331", "0,522906793", "40", "174", "419", "37");
agregarDatos("54", "Veronica Lucchesi", "322", "0,755447942", "52", "156", "205", "10");
agregarDatos("55", "Diego", "294", "0,609302326", "48", "118", "264", "32");
agregarDatos("56", "Tomas Gonzalez", "288", "0,617169374", "38", "152", "241", "22");
agregarDatos("57", "Fede Gerez", "274", "0,542194093", "40", "137", "297", "17");
agregarDatos("58", "Axel", "269", "0,56979405", "35", "144", "258", "20");
agregarDatos("59", "Tomas Hon", "224", "0,62611276", "29", "124", "184", "13");
agregarDatos("60", "Ciro Guarch", "216", "0,624277457", "36", "78", "232", "30");
agregarDatos("61", "Juli Boetsch", "210", "0,641025641", "29", "113", "170", "10");
agregarDatos("62", "Facu Montes", "207", "0,544117647", "29", "93", "214", "27");
agregarDatos("63", "Marto", "191", "0,665505226", "19", "96", "172", "38");
agregarDatos("64", "Franco Przepiorka", "174", "0,648979592", "28", "75", "142", "15");
agregarDatos("65", "Koke", "161", "0,588014981", "16", "109", "142", "4");
agregarDatos("66", "Aylen Benedetti", "149", "0,542600897", "16", "73", "134", "28");
agregarDatos("67", "Cundo", "138", "0,522727273", "17", "83", "164", "4");
agregarDatos("68", "Nico Luchetti (C)", "102", "0,364285714", "13", "61", "206", "2");
agregarDatos("69", "Manu Solbes", "100", "0,763358779", "21", "35", "75", "2");
agregarDatos("70", "Helyy", "96", "0,55", "17", "37", "106", "8");
agregarDatos("71", "Fede Salatino", "95", "0,50617284", "9", "55", "98", "13");
agregarDatos("72", "Cristian Serpico", "91", "0,446078431", "14", "49", "141", "0");
agregarDatos("73", "Ramiro Ebel", "76", "0,472049689", "10", "45", "106", "1");
agregarDatos("74", "Valium", "76", "0,403614458", "9", "40", "117", "9");
agregarDatos("75", "Nahir Gomezz", "65", "0,493975904", "4", "29", "50", "24");
agregarDatos("76", "Nicolas Borea", "53", "0,788461538", "7", "20", "25", "12");
agregarDatos("77", "Agustin", "50", "0,534090909", "7", "26", "55", "3");
agregarDatos("78", "Tomas Perez", "44", "0,653846154", "4", "22", "26", "10");
agregarDatos("79", "Kisha", "40", "0,888888889", "5", "9", "13", "16");
agregarDatos("80", "Dante Dragon", "40", "0,481927711", "2", "16", "65", "18");
agregarDatos("81", "Nicolas Lucero", "36", "0,5", "1", "23", "28", "10");
agregarDatos("82", "Santino Mercado", "29", "0,538461538", "4", "16", "32", "1");
agregarDatos("83", "Facundo Di Paola", "28", "0,555555556", "2", "9", "16", "13");
agregarDatos("84", "Cristian", "20", "0,487804878", "2", "14", "25", "0");
agregarDatos("85", "Ramiro Caruso", "9", "0,15", "2", "3", "55", "0");
agregarDatos("86", "Franco Kin", "7", "0,134615385", "0", "7", "45", "0");


