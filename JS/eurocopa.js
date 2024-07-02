function agregarDatosEurocopa() {
    // Obtener el texto del textarea
    var texto = document.getElementById('inputTextoAdminEurocopa').value.trim();

    // Dividir el texto en líneas
    var lineas = texto.split('\n');

    // Limpiar el div donde se mostrará el resultado
    var textoParaCopiar = document.getElementById('textoParaCopiarEurocopa');
    textoParaCopiar.innerHTML = '';

    // Iterar sobre cada línea y procesar los datos
    lineas.forEach(function (linea) {
        // Usar una expresión regular para dividir por espacios o tabulaciones,
        // pero asegurándonos de manejar correctamente los nombres con espacios
        var datos = linea.match(/\S+/g);

        // Verificar que haya al menos 6 elementos (nombre + 5 números)
        if (datos && datos.length >= 6) {
            // El primer elemento es el nombre completo, los siguientes son los números
            var nombre = datos.slice(0, datos.length - 5).join(' '); // Unir los primeros elementos como nombre completo

            // Los siguientes elementos son los números
            var numeros = datos.slice(-5).map(function (num) {
                return isNaN(num) ? 'undefined' : num; // Si no es un número válido, reemplazar con 'undefined'
            });

            // Construir la llamada a la función agregarATablaEurocopa
            var llamada = `agregarATablaEurocopa('${nombre}', ${numeros.join(', ')})`;

            // Crear un elemento div para mostrar la llamada
            var nuevoDiv = document.createElement('div');
            nuevoDiv.textContent = llamada;

            // Agregar el nuevo div al contenedor
            textoParaCopiar.appendChild(nuevoDiv);
        }
    });
}

// Función para copiar el texto generado (opcional)
function copiarTextoGeneradoEurocopa() {
    var textoParaCopiar = document.getElementById('textoParaCopiarEurocopa');
    var textoSeleccionado = window.getSelection();
    var rango = document.createRange();
    rango.selectNodeContents(textoParaCopiar);
    textoSeleccionado.removeAllRanges();
    textoSeleccionado.addRange(rango);

    try {
        // Intentar copiar el texto seleccionado
        document.execCommand('copy');
        alert('Texto copiado al portapapeles.');
    } catch (err) {
        console.error('No se pudo copiar el texto: ', err);
        alert('No se pudo copiar el texto. Por favor, selecciónalo manualmente y cópialo.');
    }

    // Limpiar la selección
    textoSeleccionado.removeAllRanges();
}


function agregarATablaEurocopa(Jugador, PTS, Pleno, Parcial, Error, Extra) {
    const tbody = document.querySelector('#tablaPosicionesEurocopaFase2 tbody');
    const rowCount = tbody.rows.length;
    const nextNumber = rowCount + 1;

    const newRow = document.createElement('tr');

    const numberCell = document.createElement('td');
    numberCell.textContent = nextNumber;
    if (nextNumber <= 16) {
        numberCell.classList.add('highlight-green');
    } else {
        numberCell.classList.add('highlight-red');
    }
    newRow.appendChild(numberCell);

    const nameCell = document.createElement('td');
    nameCell.textContent = Jugador;
    newRow.appendChild(nameCell);

    const ptsCell = document.createElement('td');
    ptsCell.textContent = PTS;
    ptsCell.classList.add('ptsTablaPosicionesEurocopa');
    newRow.appendChild(ptsCell);

    const plenoCell = document.createElement('td');
    plenoCell.textContent = Pleno;
    newRow.appendChild(plenoCell);

    const parcialCell = document.createElement('td');
    parcialCell.textContent = Parcial;
    newRow.appendChild(parcialCell);

    const errorCell = document.createElement('td');
    errorCell.textContent = Error;
    newRow.appendChild(errorCell);

    const extraCell = document.createElement('td');
    extraCell.textContent = Extra;
    newRow.appendChild(extraCell);

    tbody.appendChild(newRow);
}

function ordenarTablaEurocopa() {
    const tbody = document.querySelector('.tablaPosicionesEurocopa tbody');
    const rows = Array.from(tbody.rows);

    rows.sort((a, b) => {
        const ptsA = parseInt(a.cells[2].textContent);
        const ptsB = parseInt(b.cells[2].textContent);
        const plenoA = parseInt(a.cells[3].textContent);
        const plenoB = parseInt(b.cells[3].textContent);
        const parcialA = parseInt(a.cells[4].textContent);
        const parcialB = parseInt(b.cells[4].textContent);
        const errorA = parseInt(a.cells[5].textContent);
        const errorB = parseInt(b.cells[5].textContent);
        const extraA = parseInt(a.cells[6].textContent);
        const extraB = parseInt(b.cells[6].textContent);
        const nameA = a.cells[1].textContent.toLowerCase();
        const nameB = b.cells[1].textContent.toLowerCase();

        if (ptsA !== ptsB) return ptsB - ptsA;
        if (plenoA !== plenoB) return plenoB - plenoA;
        if (parcialA !== parcialB) return parcialB - parcialA;
        if (errorA !== errorB) return errorA - errorB;
        if (extraA !== extraB) return extraB - extraA;
        if (nameA < nameB) return -1;
        if (nameA > nameB) return 1;
        return 0;
    });

    rows.forEach((row, index) => {
        row.cells[0].textContent = index + 1;
        if (index < 4) {
            row.cells[0].classList.add('highlight-green');
            row.cells[0].classList.remove('highlight-red');
        } else {
            row.cells[0].classList.add('highlight-red');
            row.cells[0].classList.remove('highlight-green');
        }

        if (index < 4) {
            row.cells[1].classList.add('highlight-green');
            row.cells[1].classList.remove('highlight-red');
        } else {
            row.cells[1].classList.add('highlight-red');
            row.cells[1].classList.remove('highlight-green');
        }

        if (index < 4) {
            row.cells[2].classList.add('highlight-green');
            row.cells[2].classList.remove('highlight-red');
        } else {
            row.cells[2].classList.add('highlight-red');
            row.cells[2].classList.remove('highlight-green');
        }

        if (index < 4) {
            row.cells[3].classList.add('highlight-green');
            row.cells[3].classList.remove('highlight-red');
        } else {
            row.cells[3].classList.add('highlight-red');
            row.cells[3].classList.remove('highlight-green');
        }

        if (index < 4) {
            row.cells[4].classList.add('highlight-green');
            row.cells[4].classList.remove('highlight-red');
        } else {
            row.cells[4].classList.add('highlight-red');
            row.cells[4].classList.remove('highlight-green');
        }

        if (index < 4) {
            row.cells[5].classList.add('highlight-green');
            row.cells[5].classList.remove('highlight-red');
        } else {
            row.cells[5].classList.add('highlight-red');
            row.cells[5].classList.remove('highlight-green');
        }

        if (index < 4) {
            row.cells[6].classList.add('highlight-green');
            row.cells[6].classList.remove('highlight-red');
        } else {
            row.cells[6].classList.add('highlight-red');
            row.cells[6].classList.remove('highlight-green');
        }


        tbody.appendChild(row);
    });
}

function seleccionarEurocopa(seleccion) {
    var botonesFecha = document.querySelectorAll('.cajaFECHA'); // Selecciona todos los botones de fecha
    botonesFecha.forEach(function (btn) {
        btn.classList.remove('btnFechaActivo'); // Quita la clase 'btnFechaActivo' a todos los botones
    });
    document.getElementById("btn" + seleccion).classList.add('btnFechaActivo'); // Agrega la clase 'btnFechaActivo' al botón clicado




    var divsFechas = document.querySelectorAll('[id^="tablaPosicionesEurocopaFase"]'); // Selecciona todos los divs de fecha
    divsFechas.forEach(function (div) {
        if (div.id === "tablaPosiciones" + seleccion) {
            div.style.display = "flex"; // Muestra el div correspondiente al ID
        } else {
            div.style.display = "none"; // Oculta los demás divs
        }
    });

}


agregarATablaEurocopa('Anubis', 9, 1, 2, 5, 4)
agregarATablaEurocopa('Bautista Coria', 8, 1, 3, 4, 2)
agregarATablaEurocopa('Bruno Alonso', 13, 1, 3, 4, 7)
agregarATablaEurocopa('Cami', 13, 0, 5, 3, 8)
agregarATablaEurocopa('Fabrizio Escolano', 15, 2, 3, 3, 6)
agregarATablaEurocopa('Gabriel Talarico', 19, 2, 3, 3, 10)
agregarATablaEurocopa('Ian Gangai', 14, 3, 1, 4, 4)
agregarATablaEurocopa('Jhose', 10, 0, 5, 3, 5)
agregarATablaEurocopa('Kevin Sivori', 12, 1, 3, 4, 6)
agregarATablaEurocopa('Lucas Insua', 8, 0, 5, 3, 3)
agregarATablaEurocopa('Luciano Hufschmid', 16, 1, 3, 4, 10)
agregarATablaEurocopa('Marto', 11, 1, 5, 2, 3)
agregarATablaEurocopa('Pancho Muzzio', 15, 2, 3, 3, 6)
agregarATablaEurocopa('Rodrigo Talarico', 14, 0, 6, 2, 8)
agregarATablaEurocopa('Verónica Lucchesi', 11, 1, 4, 3, 4)
agregarATablaEurocopa('Yago', 12, 0, 5, 3, 7)
ordenarTablaEurocopa();




