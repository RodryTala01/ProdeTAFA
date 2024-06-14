
function agregarDatosEuroamerica() {
    // Obtener el texto del textarea
    var texto = document.getElementById('inputTextoAdminEuroamerica').value.trim();

    // Dividir el texto en líneas
    var lineas = texto.split('\n');

    // Limpiar el div donde se mostrará el resultado
    var textoParaCopiar = document.getElementById('textoParaCopiarEuroamerica');
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

            // Construir la llamada a la función agregarATablaEuroamerica
            var llamada = `agregarATablaEuroamerica('${nombre}', ${numeros.join(', ')})`;

            // Crear un elemento div para mostrar la llamada
            var nuevoDiv = document.createElement('div');
            nuevoDiv.textContent = llamada;

            // Agregar el nuevo div al contenedor
            textoParaCopiar.appendChild(nuevoDiv);
        }
    });
}

// Función para copiar el texto generado (opcional)
function copiarTextoGeneradoEuroamerica() {
    var textoParaCopiar = document.getElementById('textoParaCopiarEuroamerica');
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


function agregarATablaEuroamerica(Jugador, PTS, Pleno, Parcial, Error, Extra) {
    const tbody = document.querySelector('#tablaPosicionesEuroamerica tbody');
    const rowCount = tbody.rows.length;
    const nextNumber = rowCount + 1;

    const newRow = document.createElement('tr');

    const numberCell = document.createElement('td');
    numberCell.textContent = nextNumber;
    if (nextNumber <= 1) {
        numberCell.classList.add('highlight-green');
    }
    newRow.appendChild(numberCell);

    const nameCell = document.createElement('td');
    nameCell.textContent = Jugador;
    newRow.appendChild(nameCell);

    const ptsCell = document.createElement('td');
    ptsCell.textContent = PTS;
    ptsCell.classList.add('ptsTablaPosicionesEuroamerica');
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

function ordenarTablaEuroamerica() {
    const tbody = document.querySelector('.tablaPosicionesEuroamerica tbody');
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
        if (index < 1) {
            row.cells[0].classList.add('highlight-green');
        } else {
            row.cells[0].classList.remove('highlight-green');
        }
        tbody.appendChild(row);
    });
}



agregarATablaEuroamerica('Anubis', 0, 0, 0, 0, 0)
agregarATablaEuroamerica('Bautista Coria', 0, 0, 0, 0, 0)
agregarATablaEuroamerica('Benja', 0, 0, 0, 0, 0)
agregarATablaEuroamerica('Bruno Alonso', 0, 0, 0, 0, 0)
agregarATablaEuroamerica('Cami', 0, 0, 0, 0, 0)
agregarATablaEuroamerica('Ciro Guarch', 0, 0, 0, 0, 0)
agregarATablaEuroamerica('Cristian Hantis', 0, 0, 0, 0, 0)
agregarATablaEuroamerica('Dani Bazan', 0, 0, 0, 0, 0)
agregarATablaEuroamerica('Dante Dragon', 0, 0, 0, 0, 0)
agregarATablaEuroamerica('Eze', 0, 0, 0, 0, 0)
agregarATablaEuroamerica('Fabrizio Escolano', 0, 0, 0, 0, 0)
agregarATablaEuroamerica('Felipe Galante', 0, 0, 0, 0, 0)
agregarATablaEuroamerica('Gabriel Talarico', 0, 0, 0, 0, 0)
agregarATablaEuroamerica('Ian Gangai', 0, 0, 0, 0, 0)
agregarATablaEuroamerica('Ignacio Cejas', 0, 0, 0, 0, 0)
agregarATablaEuroamerica('Jhose', 0, 0, 0, 0, 0)
agregarATablaEuroamerica('Joaco Fernandez', 0, 0, 0, 0, 0)
agregarATablaEuroamerica('Joel Alcalde', 0, 0, 0, 0, 0)
agregarATablaEuroamerica('Kevin Sivori', 0, 0, 0, 0, 0)
agregarATablaEuroamerica('Lucas Aguilera', 0, 0, 0, 0, 0)
agregarATablaEuroamerica('Lucas Insua', 0, 0, 0, 0, 0)
agregarATablaEuroamerica('Luciano Hufschmid', 0, 0, 0, 0, 0)
agregarATablaEuroamerica('Manu Solbes', 0, 0, 0, 0, 0)
agregarATablaEuroamerica('Mario Talarico', 0, 0, 0, 0, 0)
agregarATablaEuroamerica('Marto', 0, 0, 0, 0, 0)
agregarATablaEuroamerica('Moreno Perez', 0, 0, 0, 0, 0)
agregarATablaEuroamerica('Nico Avalos', 0, 0, 0, 0, 0)
agregarATablaEuroamerica('Nico Borea', 0, 0, 0, 0, 0)
agregarATablaEuroamerica('Pancho Muzzio', 0, 0, 0, 0, 0)
agregarATablaEuroamerica('Pollo', 0, 0, 0, 0, 0)
agregarATablaEuroamerica('Renzo Badano', 0, 0, 0, 0, 0)
agregarATablaEuroamerica('Rodri Sebastian', 0, 0, 0, 0, 0)
agregarATablaEuroamerica('Rodrigo Soca', 0, 0, 0, 0, 0)
agregarATablaEuroamerica('Rodrigo Talarico', 0, 0, 0, 0, 0)
agregarATablaEuroamerica('Tomas Delgado', 0, 0, 0, 0, 0)
agregarATablaEuroamerica('Tomas Torcasio', 0, 0, 0, 0, 0)
agregarATablaEuroamerica('Verónica Lucchesi', 0, 0, 0, 0, 0)
agregarATablaEuroamerica('Yago', 0, 0, 0, 0, 0)





    
ordenarTablaEuroamerica();

// Ordenar la tabla después de agregar todos los jugadores



