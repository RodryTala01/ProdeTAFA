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
    const tbody = document.querySelector('#tablaPosicionesEurocopa tbody');
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
        if (index < 16) {
            row.cells[0].classList.add('highlight-green');
            row.cells[0].classList.remove('highlight-red');
        } else {
            row.cells[0].classList.add('highlight-red');
            row.cells[0].classList.remove('highlight-green');
        }
        tbody.appendChild(row);
    });
}


agregarATablaEurocopa('Anubis', 24, 3, 10, 13, 5)
agregarATablaEurocopa('Bautista Coria', 29, 4, 10, 12, 7)
agregarATablaEurocopa('Benja', 22, 4, 8, 14, 2)
agregarATablaEurocopa('Bruno Alonso', 27, 2, 13, 11, 8)
agregarATablaEurocopa('Cami', 25, 4, 9, 13, 4)
agregarATablaEurocopa('Ciro Guarch', 18, 3, 7, 16, 2)
agregarATablaEurocopa('Cristian Hantis', 20, 3, 8, 15, 3)
agregarATablaEurocopa('Dani Bazan', 19, 1, 13, 12, 3)
agregarATablaEurocopa('Dante Dragon', 20, 1, 12, 13, 5)
agregarATablaEurocopa('Eze', 11, 1, 8, 17, 0)
agregarATablaEurocopa('Fabrizio Escolano', 27, 3, 11, 12, 7)
agregarATablaEurocopa('Felipe Galante', 23, 2, 11, 13, 6)
agregarATablaEurocopa('Gabriel Talarico', 28, 2, 13, 11, 9)
agregarATablaEurocopa('Ian Gangai', 22, 2, 10, 14, 6)
agregarATablaEurocopa('Ignacio Cejas', 17, 2, 8, 16, 3)
agregarATablaEurocopa('Jhose', 24, 2, 13, 11, 5)
agregarATablaEurocopa('Joaco Fernandez', 18, 1, 12, 13, 3)
agregarATablaEurocopa('Joel Alcalde', 18, 0, 13, 13, 5)
agregarATablaEurocopa('Kevin Sivori', 23, 4, 7, 15, 4)
agregarATablaEurocopa('Lucas Aguilera', 21, 2, 7, 17, 8)
agregarATablaEurocopa('Lucas Insua', 25, 3, 10, 13, 6)
agregarATablaEurocopa('Luciano Hufschmid', 19, 2, 7, 17, 6)
agregarATablaEurocopa('Manu Solbes', 22, 2, 13, 11, 3)
agregarATablaEurocopa('Mario Talarico', 20, 3, 9, 14, 2)
agregarATablaEurocopa('Marto', 24, 2, 13, 11, 5)
agregarATablaEurocopa('Moreno Perez', 18, 3, 8, 15, 1)
agregarATablaEurocopa('Nico Avalos', 18, 3, 4, 19, 5)
agregarATablaEurocopa('Nico Borea', 0, 0, 0, 26, 0)
agregarATablaEurocopa('Pancho Muzzio', 24, 4, 8, 14, 4)
agregarATablaEurocopa('Pollo', 21, 1, 12, 13, 6)
agregarATablaEurocopa('Renzo Badano', 23, 4, 11, 11, 0)
agregarATablaEurocopa('Rodri Sebastian', 13, 2, 5, 19, 2)
agregarATablaEurocopa('Rodrigo Soca', 22, 2, 12, 12, 4)
agregarATablaEurocopa('Rodrigo Talarico', 31, 5, 9, 10, 7)
agregarATablaEurocopa('Tomas Delgado', 25, 3, 10, 13, 6)
agregarATablaEurocopa('Tomas Torcasio', 23, 3, 11, 12, 3)
agregarATablaEurocopa('Verónica Lucchesi', 26, 3, 12, 13, 5)
agregarATablaEurocopa('Yago', 25, 1, 12, 13, 10)


ordenarTablaEurocopa();




