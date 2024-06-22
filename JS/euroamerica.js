
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




agregarATablaEuroamerica('Anubis', 17, 2, 9, 10, 2)
agregarATablaEuroamerica('Bautista Coria', 25, 3, 9, 9, 7)
agregarATablaEuroamerica('Benja', 18, 3, 7, 11, 2)
agregarATablaEuroamerica('Bruno Alonso', 24, 2, 12, 7, 6)
agregarATablaEuroamerica('Cami', 20, 3, 7, 11, 4)
agregarATablaEuroamerica('Ciro Guarch', 15, 2, 7, 12, 2)
agregarATablaEuroamerica('Cristian Hantis', 18, 3, 6, 12, 3)
agregarATablaEuroamerica('Dani Bazan', 17, 1, 11, 9, 3)
agregarATablaEuroamerica('Dante Dragon', 19, 1, 11, 9, 5)
agregarATablaEuroamerica('Eze', 10, 1, 7, 13, 0)
agregarATablaEuroamerica('Fabrizio Escolano', 22, 2, 9, 10, 7)
agregarATablaEuroamerica('Felipe Galante', 21, 2, 9, 10, 6)
agregarATablaEuroamerica('Gabriel Talarico', 21, 1, 11, 9, 7)
agregarATablaEuroamerica('Ian Gangai', 18, 2, 8, 11, 4)
agregarATablaEuroamerica('Ignacio Cejas', 16, 2, 7, 12, 3)
agregarATablaEuroamerica('Jhose', 17, 1, 11, 9, 3)
agregarATablaEuroamerica('Joaco Fernandez', 16, 1, 10, 10, 3)
agregarATablaEuroamerica('Joel Alcalde', 16, 0, 11, 10, 5)
agregarATablaEuroamerica('Kevin Sivori', 17, 3, 6, 12, 2)
agregarATablaEuroamerica('Lucas Aguilera', 16, 1, 7, 13, 6)
agregarATablaEuroamerica('Lucas Insua', 19, 2, 9, 10, 4)
agregarATablaEuroamerica('Luciano Hufschmid', 16, 2, 6, 13, 4)
agregarATablaEuroamerica('Manu Solbes', 17, 1, 11, 9, 3)
agregarATablaEuroamerica('Mario Talarico', 19, 3, 8, 10, 2)
agregarATablaEuroamerica('Marto', 21, 2, 10, 9, 5)
agregarATablaEuroamerica('Moreno Perez', 11, 1, 7, 13, 1)
agregarATablaEuroamerica('Nico Avalos', 14, 2, 3, 16, 5)
agregarATablaEuroamerica('Nico Borea', 0, 0, 0, 21, 0)
agregarATablaEuroamerica('Pancho Muzzio', 21, 4, 7, 10, 2)
agregarATablaEuroamerica('Pollo', 17, 1, 10, 10, 4)
agregarATablaEuroamerica('Renzo Badano', 21, 4, 9, 8, 0)
agregarATablaEuroamerica('Rodri Sebastian', 13, 2, 5, 14, 2)
agregarATablaEuroamerica('Rodrigo Soca', 19, 2, 9, 10, 4)
agregarATablaEuroamerica('Rodrigo Talarico', 26, 4, 7, 8, 7)
agregarATablaEuroamerica('Tomas Delgado', 21, 2, 9, 10, 6)
agregarATablaEuroamerica('Tomas Torcasio', 13, 0, 10, 11, 3)
agregarATablaEuroamerica('Verónica Lucchesi', 19, 2, 10, 11, 3)
agregarATablaEuroamerica('Yago', 21, 1, 10, 10, 8)
  
ordenarTablaEuroamerica();

// Ordenar la tabla después de agregar todos los jugadores



