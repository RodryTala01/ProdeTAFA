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


agregarATablaEurocopa('Rodrigo Talarico', 14, 2, 6, 2, 2)
agregarATablaEurocopa('Anubis', 13, 2, 5, 3, 2)
agregarATablaEurocopa('Pancho Muzzio', 12, 2, 6, 2, 0)
agregarATablaEurocopa('Cristian Hantis', 12, 2, 4, 4, 2)
agregarATablaEurocopa('Bruno Alonso', 12, 1, 6, 3, 3)
agregarATablaEurocopa('Lucas Insua', 11, 2, 5, 3, 0)
agregarATablaEurocopa('Renzo Badano', 11, 2, 5, 3, 0)
agregarATablaEurocopa('Marto', 11, 1, 6, 3, 2)
agregarATablaEurocopa('Bautista Coria', 11, 1, 5, 4, 3)
agregarATablaEurocopa('Ignacio Cejas', 11, 1, 5, 4, 3)
agregarATablaEurocopa('Tomas Delgado', 11, 1, 5, 4, 3)
agregarATablaEurocopa('Felipe Galante', 11, 1, 4, 5, 4)
agregarATablaEurocopa('Kevin Sivori', 10, 2, 4, 4, 0)
agregarATablaEurocopa('Cami', 10, 1, 5, 4, 2)
agregarATablaEurocopa('Lucas Aguilera', 10, 1, 4, 5, 3)
agregarATablaEurocopa('Joel Alcalde', 10, 0, 7, 3, 3)
agregarATablaEurocopa('Manu Solbes', 9, 1, 6, 3, 0)
agregarATablaEurocopa('Fabrizio Escolano', 9, 0, 6, 4, 3)
agregarATablaEurocopa('Gabriel Talarico', 9, 0, 6, 4, 3)
agregarATablaEurocopa('Yago', 9, 0, 6, 4, 3)
agregarATablaEurocopa('Benja', 8, 1, 5, 4, 0)
agregarATablaEurocopa('Joaco Fernandez', 8, 0, 7, 3, 1)
agregarATablaEurocopa('Mario Talarico', 7, 1, 4, 5, 0)
agregarATablaEurocopa('Rodri Sebastian', 7, 1, 4, 5, 0)
agregarATablaEurocopa('Jhose', 7, 0, 7, 3, 0)
agregarATablaEurocopa('Pollo', 7, 0, 7, 3, 0)
agregarATablaEurocopa('Dani Bazan', 6, 0, 6, 4, 0)
agregarATablaEurocopa('Dante Dragon', 6, 0, 6, 4, 0)
agregarATablaEurocopa('Rodrigo Soca', 6, 0, 6, 4, 0)
agregarATablaEurocopa('Tomas Torcasio', 6, 0, 6, 4, 0)
agregarATablaEurocopa('Verónica Lucchesi', 6, 0, 6, 4, 0)
agregarATablaEurocopa('Moreno Perez', 6, 0, 5, 5, 1)
agregarATablaEurocopa('Ciro Guarch', 6, 0, 4, 6, 2)
agregarATablaEurocopa('Ian Gangai', 5, 0, 5, 5, 0)
agregarATablaEurocopa('Eze', 4, 0, 4, 6, 0)
agregarATablaEurocopa('Luciano Hufschmid', 3, 0, 3, 7, 0)
agregarATablaEurocopa('Nico Avalos', 0, 0, 0, 10, 0)
agregarATablaEurocopa('Nico Borea', 0, 0, 0, 10, 0)


ordenarTablaEurocopa();




