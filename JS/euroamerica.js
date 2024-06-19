
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
        if (!tbody) {
            console.error('Element not found: .tablaPosicionesEuroamerica tbody');
            return;
        }
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

    ordenarTablaEuroamerica();




agregarATablaEuroamerica('Anubis', 15, 2, 7, 3, 2)
agregarATablaEuroamerica('Bautista Coria', 13, 1, 7, 4, 3)
agregarATablaEuroamerica('Benja', 12, 2, 6, 4, 0)
agregarATablaEuroamerica('Bruno Alonso', 15, 1, 8, 3, 4)
agregarATablaEuroamerica('Cami', 14, 2, 6, 5, 2)
agregarATablaEuroamerica('Ciro Guarch', 10, 1, 5, 6, 2)
agregarATablaEuroamerica('Cristian Hantis', 17, 3, 5, 4, 3)
agregarATablaEuroamerica('Dani Bazan', 8, 0, 7, 5, 1)
agregarATablaEuroamerica('Dante Dragon', 9, 0, 8, 4, 1)
agregarATablaEuroamerica('Eze', 6, 0, 6, 6, 0)
agregarATablaEuroamerica('Fabrizio Escolano', 13, 1, 7, 4, 3)
agregarATablaEuroamerica('Felipe Galante', 13, 1, 6, 5, 4)
agregarATablaEuroamerica('Gabriel Talarico', 11, 0, 8, 4, 3)
agregarATablaEuroamerica('Ian Gangai', 6, 0, 6, 6, 0)
agregarATablaEuroamerica('Ignacio Cejas', 15, 2, 6, 4, 3)
agregarATablaEuroamerica('Jhose', 10, 0, 9, 3, 1)
agregarATablaEuroamerica('Joaco Fernandez', 11, 1, 7, 4, 1)
agregarATablaEuroamerica('Joel Alcalde', 12, 0, 9, 3, 3)
agregarATablaEuroamerica('Kevin Sivori', 11, 2, 5, 5, 0)
agregarATablaEuroamerica('Lucas Aguilera', 13, 1, 6, 5, 4)
agregarATablaEuroamerica('Lucas Insua', 12, 2, 6, 4, 0)
agregarATablaEuroamerica('Luciano Hufschmid', 7, 1, 4, 7, 0)
agregarATablaEuroamerica('Manu Solbes', 12, 1, 8, 3, 1)
agregarATablaEuroamerica('Mario Talarico', 9, 1, 6, 5, 0)
agregarATablaEuroamerica('Marto', 14, 1, 8, 3, 3)
agregarATablaEuroamerica('Moreno Perez', 8, 0, 7, 5, 1)
agregarATablaEuroamerica('Nico Avalos', 3, 0, 2, 10, 1)
agregarATablaEuroamerica('Nico Borea', 0, 0, 0, 12, 0)
agregarATablaEuroamerica('Pancho Muzzio', 15, 3, 6, 3, 0)
agregarATablaEuroamerica('Pollo', 9, 0, 9, 3, 0)
agregarATablaEuroamerica('Renzo Badano', 15, 3, 6, 3, 0)
agregarATablaEuroamerica('Rodri Sebastian', 8, 1, 5, 6, 0)
agregarATablaEuroamerica('Rodrigo Soca', 9, 1, 6, 5, 0)
agregarATablaEuroamerica('Rodrigo Talarico', 15, 2, 6, 2, 3)
agregarATablaEuroamerica('Tomas Delgado', 13, 1, 6, 5, 4)
agregarATablaEuroamerica('Tomas Torcasio', 8, 0, 7, 5, 1)
agregarATablaEuroamerica('Verónica Lucchesi', 9, 0, 8, 6, 1)
agregarATablaEuroamerica('Yago', 11, 0, 7, 5, 4)
  
ordenarTablaEuroamerica();

// Ordenar la tabla después de agregar todos los jugadores



