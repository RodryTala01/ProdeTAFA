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
            row.cells[1].classList.add('highlight-green');
            row.cells[1].classList.remove('highlight-red');
            row.cells[2].classList.add('highlight-green');
            row.cells[2].classList.remove('highlight-red');
            row.cells[3].classList.add('highlight-green');
            row.cells[3].classList.remove('highlight-red');
            row.cells[4].classList.add('highlight-green');
            row.cells[4].classList.remove('highlight-red');
            row.cells[5].classList.add('highlight-green');
            row.cells[5].classList.remove('highlight-red');
            row.cells[6].classList.add('highlight-green');
            row.cells[6].classList.remove('highlight-red');
        } else {
            row.cells[0].classList.add('highlight-red');
            row.cells[0].classList.remove('highlight-green');
            row.cells[1].classList.add('highlight-red');
            row.cells[1].classList.remove('highlight-green');
            row.cells[2].classList.add('highlight-red');
            row.cells[2].classList.remove('highlight-green');
            row.cells[3].classList.add('highlight-red');
            row.cells[3].classList.remove('highlight-green');
            row.cells[4].classList.add('highlight-red');
            row.cells[4].classList.remove('highlight-green');
            row.cells[5].classList.add('highlight-red');
            row.cells[5].classList.remove('highlight-green');
            row.cells[6].classList.add('highlight-red');
            row.cells[6].classList.remove('highlight-green');
        }
        tbody.appendChild(row);
    });
}


agregarATablaEurocopa('Anubis', 40, 5, 11, 20, 14)
agregarATablaEurocopa('Bautista Coria', 43, 5, 12, 19, 16)
agregarATablaEurocopa('Benja', 34, 4, 10, 22, 12)
agregarATablaEurocopa('Bruno Alonso', 41, 4, 14, 18, 15)
agregarATablaEurocopa('Cami', 39, 6, 10, 20, 11)
agregarATablaEurocopa('Ciro Guarch', 30, 5, 8, 23, 7)
agregarATablaEurocopa('Cristian Hantis', 35, 5, 9, 22, 11)
agregarATablaEurocopa('Dani Bazan', 29, 1, 15, 20, 11)
agregarATablaEurocopa('Dante Dragon', 29, 1, 12, 23, 14)
agregarATablaEurocopa('Eze', 12, 1, 9, 26, 0)
agregarATablaEurocopa('Fabrizio Escolano', 40, 4, 12, 20, 16)
agregarATablaEurocopa('Felipe Galante', 35, 3, 13, 20, 13)
agregarATablaEurocopa('Gabriel Talarico', 44, 3, 16, 17, 19)
agregarATablaEurocopa('Ian Gangai', 39, 4, 12, 20, 15)
agregarATablaEurocopa('Ignacio Cejas', 30, 4, 9, 23, 9)
agregarATablaEurocopa('Jhose', 39, 3, 15, 18, 15)
agregarATablaEurocopa('Joaco Fernandez', 21, 2, 12, 22, 3)
agregarATablaEurocopa('Joel Alcalde', 35, 1, 15, 20, 17)
agregarATablaEurocopa('Kevin Sivori', 37, 5, 9, 22, 13)
agregarATablaEurocopa('Lucas Aguilera', 30, 2, 9, 25, 15)
agregarATablaEurocopa('Lucas Insua', 46, 6, 11, 19, 17)
agregarATablaEurocopa('Luciano Hufschmid', 39, 5, 8, 23, 16)
agregarATablaEurocopa('Manu Solbes', 31, 2, 13, 21, 12)
agregarATablaEurocopa('Mario Talarico', 36, 4, 10, 22, 14)
agregarATablaEurocopa('Marto', 39, 2, 17, 17, 16)
agregarATablaEurocopa('Moreno Perez', 35, 4, 9, 23, 14)
agregarATablaEurocopa('Nico Avalos', 35, 4, 5, 27, 18)
agregarATablaEurocopa('Nico Borea', 0, 0, 0, 36, 0)
agregarATablaEurocopa('Pancho Muzzio', 39, 5, 9, 22, 15)
agregarATablaEurocopa('Pollo', 34, 1, 13, 22, 18)
agregarATablaEurocopa('Renzo Badano', 36, 5, 12, 19, 9)
agregarATablaEurocopa('Rodri Sebastian', 25, 2, 7, 27, 12)
agregarATablaEurocopa('Rodrigo Soca', 33, 3, 14, 19, 10)
agregarATablaEurocopa('Rodrigo Talarico', 42, 5, 11, 18, 16)
agregarATablaEurocopa('Tomas Delgado', 36, 3, 12, 21, 15)
agregarATablaEurocopa('Tomas Torcasio', 36, 4, 13, 19, 11)
agregarATablaEurocopa('Verónica Lucchesi', 40, 4, 13, 21, 15)
agregarATablaEurocopa('Yago', 39, 2, 15, 19, 18)

ordenarTablaEurocopa();




