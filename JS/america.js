
function agregarDatosAmerica() {
    // Obtener el texto del textarea
    var texto = document.getElementById('inputTextoAdminAmerica').value.trim();

    // Dividir el texto en líneas
    var lineas = texto.split('\n');

    // Limpiar el div donde se mostrará el resultado
    var textoParaCopiar = document.getElementById('textoParaCopiarAmerica');
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

            // Construir la llamada a la función agregarATablaAmerica
            var llamada = `agregarATablaAmerica('${nombre}', ${numeros.join(', ')})`;

            // Crear un elemento div para mostrar la llamada
            var nuevoDiv = document.createElement('div');
            nuevoDiv.textContent = llamada;

            // Agregar el nuevo div al contenedor
            textoParaCopiar.appendChild(nuevoDiv);
        }
    });
}

// Función para copiar el texto generado (opcional)
function copiarTextoGeneradoAmerica() {
    var textoParaCopiar = document.getElementById('textoParaCopiarAmerica');
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



function agregarATablaAmerica(Jugador, PTS, Pleno, Parcial, Error, Extra) {
    const tbody = document.querySelector('#tablaPosicionesAmerica tbody');
    const rowCount = tbody.rows.length;
    const nextNumber = rowCount + 1;

    const newRow = document.createElement('tr');

    const numberCell = document.createElement('td');
    numberCell.textContent = nextNumber;
    if (nextNumber <= 8) {
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
    ptsCell.classList.add('ptsTablaPosicionesAmerica');
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

function ordenarTablaAmerica() {
    const tbody = document.querySelector('.tablaPosicionesAmerica tbody');
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
        if (index < 8) {
            row.cells[0].classList.add('highlight-green');
            row.cells[0].classList.remove('highlight-red');
        } else {
            row.cells[0].classList.add('highlight-red');
            row.cells[0].classList.remove('highlight-green');
        }
        tbody.appendChild(row);
    });
}



agregarATablaAmerica('Anubis', 25, 4, 9, 7, 4)
agregarATablaAmerica('Bautista Coria', 26, 2, 12, 6, 8)
agregarATablaAmerica('Benja', 28, 4, 9, 7, 7)
agregarATablaAmerica('Bruno Alonso', 27, 4, 10, 6, 5)
agregarATablaAmerica('Cami', 26, 4, 8, 8, 6)
agregarATablaAmerica('Ciro Guarch', 23, 2, 10, 8, 7)
agregarATablaAmerica('Cristian Hantis', 16, 0, 10, 10, 6)
agregarATablaAmerica('Dani Bazan', 23, 4, 8, 8, 3)
agregarATablaAmerica('Dante Dragon', 10, 1, 4, 15, 3)
agregarATablaAmerica('Eze', 15, 2, 9, 9, 0)
agregarATablaAmerica('Fabrizio Escolano', 27, 5, 7, 8, 5)
agregarATablaAmerica('Felipe Galante', 19, 2, 9, 9, 4)
agregarATablaAmerica('Gabriel Talarico', 31, 4, 11, 5, 8)
agregarATablaAmerica('Ian Gangai', 21, 2, 11, 7, 4)
agregarATablaAmerica('Ignacio Cejas', 22, 3, 8, 9, 5)
agregarATablaAmerica('Jhose', 28, 4, 11, 5, 5)
agregarATablaAmerica('Joaco Fernandez', 22, 1, 12, 7, 7)
agregarATablaAmerica('Joel Alcalde', 22, 3, 9, 8, 4)
agregarATablaAmerica('Kevin Sivori', 22, 4, 6, 10, 4)
agregarATablaAmerica('Lucas Aguilera', 21, 2, 10, 8, 5)
agregarATablaAmerica('Lucas Insua', 29, 4, 10, 6, 7)
agregarATablaAmerica('Luciano Hufschmid', 24, 4, 8, 8, 4)
agregarATablaAmerica('Manu Solbes', 0, 0, 0, 20, 0)
agregarATablaAmerica('Mario Talarico', 26, 3, 9, 8, 8)
agregarATablaAmerica('Marto', 26, 4, 9, 7, 5)
agregarATablaAmerica('Moreno Perez', 26, 2, 13, 5, 7)
agregarATablaAmerica('Nico Avalos', 28, 5, 10, 5, 3)
agregarATablaAmerica('Nico Borea', 0, 0, 0, 20, 0)
agregarATablaAmerica('Pancho Muzzio', 21, 2, 11, 7, 4)
agregarATablaAmerica('Pollo', 33, 5, 10, 5, 8)
agregarATablaAmerica('Renzo Badano', 22, 1, 12, 7, 7)
agregarATablaAmerica('Rodri Sebastian', 20, 2, 9, 9, 5)
agregarATablaAmerica('Rodrigo Soca', 31, 5, 8, 7, 8)
agregarATablaAmerica('Rodrigo Talarico', 22, 2, 10, 8, 6)
agregarATablaAmerica('Tomas Delgado', 11, 0, 8, 12, 3)
agregarATablaAmerica('Tomas Torcasio', 23, 4, 8, 8, 3)
agregarATablaAmerica('Verónica Lucchesi', 30, 5, 8, 7, 7)
agregarATablaAmerica('Yago', 28, 5, 7, 8, 6)

ordenarTablaAmerica();




// Ordenar la tabla después de agregar todos los jugadores



