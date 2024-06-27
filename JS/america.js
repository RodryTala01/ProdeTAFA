
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



agregarATablaAmerica('Anubis', 14, 3, 5, 4, 0)
agregarATablaAmerica('Bautista Coria', 13, 2, 7, 3, 0)
agregarATablaAmerica('Benja', 17, 3, 6, 3, 2)
agregarATablaAmerica('Bruno Alonso', 15, 3, 5, 4, 1)
agregarATablaAmerica('Cami', 17, 4, 4, 4, 1)
agregarATablaAmerica('Ciro Guarch', 14, 2, 7, 3, 1)
agregarATablaAmerica('Cristian Hantis', 6, 0, 6, 6, 0)
agregarATablaAmerica('Dani Bazan', 15, 3, 4, 5, 2)
agregarATablaAmerica('Dante Dragon', 7, 1, 4, 7, 0)
agregarATablaAmerica('Eze', 11, 2, 5, 5, 0)
agregarATablaAmerica('Fabrizio Escolano', 11, 3, 2, 7, 0)
agregarATablaAmerica('Felipe Galante', 12, 2, 6, 4, 0)
agregarATablaAmerica('Gabriel Talarico', 17, 3, 6, 3, 2)
agregarATablaAmerica('Ian Gangai', 9, 1, 6, 5, 0)
agregarATablaAmerica('Ignacio Cejas', 13, 3, 4, 5, 0)
agregarATablaAmerica('Jhose', 15, 3, 6, 3, 0)
agregarATablaAmerica('Joaco Fernandez', 11, 1, 7, 4, 1)
agregarATablaAmerica('Joel Alcalde', 14, 3, 5, 4, 0)
agregarATablaAmerica('Kevin Sivori', 13, 3, 3, 6, 1)
agregarATablaAmerica('Lucas Aguilera', 13, 2, 6, 4, 1)
agregarATablaAmerica('Lucas Insua', 18, 4, 4, 4, 2)
agregarATablaAmerica('Luciano Hufschmid', 17, 4, 5, 3, 0)
agregarATablaAmerica('Manu Solbes', 0, 0, 0, 12, 0)
agregarATablaAmerica('Mario Talarico', 17, 3, 4, 5, 4)
agregarATablaAmerica('Marto', 15, 3, 5, 4, 1)
agregarATablaAmerica('Moreno Perez', 11, 1, 8, 3, 0)
agregarATablaAmerica('Nico Avalos', 17, 4, 5, 3, 0)
agregarATablaAmerica('Nico Borea', 0, 0, 0, 12, 0)
agregarATablaAmerica('Pancho Muzzio', 11, 2, 5, 5, 0)
agregarATablaAmerica('Pollo', 18, 4, 6, 2, 0)
agregarATablaAmerica('Renzo Badano', 11, 1, 7, 4, 1)
agregarATablaAmerica('Rodri Sebastian', 12, 2, 6, 4, 0)
agregarATablaAmerica('Rodrigo Soca', 21, 5, 3, 4, 3)
agregarATablaAmerica('Rodrigo Talarico', 12, 2, 5, 5, 1)
agregarATablaAmerica('Tomas Delgado', 5, 0, 5, 7, 0)
agregarATablaAmerica('Tomas Torcasio', 15, 4, 3, 5, 0)
agregarATablaAmerica('Verónica Lucchesi', 16, 4, 4, 4, 0)
agregarATablaAmerica('Yago', 21, 5, 3, 4, 3)


ordenarTablaAmerica();




// Ordenar la tabla después de agregar todos los jugadores



