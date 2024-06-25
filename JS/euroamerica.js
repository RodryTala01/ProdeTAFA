
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




agregarATablaEuroamerica('Anubis', 34, 5, 14, 15, 5)
agregarATablaEuroamerica('Bautista Coria', 37, 5, 15, 14, 7)
agregarATablaEuroamerica('Benja', 35, 7, 10, 17, 4)
agregarATablaEuroamerica('Bruno Alonso', 42, 4, 16, 14, 14)
agregarATablaEuroamerica('Cami', 43, 7, 12, 15, 10)
agregarATablaEuroamerica('Ciro Guarch', 29, 5, 11, 18, 3)
agregarATablaEuroamerica('Cristian Hantis', 24, 3, 12, 19, 3)
agregarATablaEuroamerica('Dani Bazan', 32, 4, 15, 15, 5)
agregarATablaEuroamerica('Dante Dragon', 27, 2, 16, 16, 5)
agregarATablaEuroamerica('Eze', 23, 2, 12, 20, 5)
agregarATablaEuroamerica('Fabrizio Escolano', 33, 5, 11, 18, 7)
agregarATablaEuroamerica('Felipe Galante', 33, 4, 15, 15, 6)
agregarATablaEuroamerica('Gabriel Talarico', 40, 4, 17, 13, 11)
agregarATablaEuroamerica('Ian Gangai', 29, 3, 14, 17, 6)
agregarATablaEuroamerica('Ignacio Cejas', 28, 5, 10, 19, 3)
agregarATablaEuroamerica('Jhose', 34, 4, 17, 13, 5)
agregarATablaEuroamerica('Joaco Fernandez', 26, 2, 16, 16, 4)
agregarATablaEuroamerica('Joel Alcalde', 27, 2, 16, 16, 5)
agregarATablaEuroamerica('Kevin Sivori', 34, 7, 8, 19, 5)
agregarATablaEuroamerica('Lucas Aguilera', 32, 4, 11, 19, 9)
agregarATablaEuroamerica('Lucas Insua', 36, 5, 13, 16, 8)
agregarATablaEuroamerica('Luciano Hufschmid', 29, 4, 11, 19, 6)
agregarATablaEuroamerica('Manu Solbes', 22, 2, 13, 19, 3)
agregarATablaEuroamerica('Mario Talarico', 33, 5, 12, 17, 6)
agregarATablaEuroamerica('Marto', 37, 5, 16, 13, 6)
agregarATablaEuroamerica('Moreno Perez', 26, 4, 13, 17, 1)
agregarATablaEuroamerica('Nico Avalos', 30, 6, 7, 21, 5)
agregarATablaEuroamerica('Nico Borea', 0, 0, 0, 34, 0)
agregarATablaEuroamerica('Pancho Muzzio', 33, 6, 11, 17, 4)
agregarATablaEuroamerica('Pollo', 35, 5, 14, 15, 6)
agregarATablaEuroamerica('Renzo Badano', 30, 4, 17, 13, 1)
agregarATablaEuroamerica('Rodri Sebastian', 19, 3, 8, 23, 2)
agregarATablaEuroamerica('Rodrigo Soca', 39, 6, 14, 14, 7)
agregarATablaEuroamerica('Rodrigo Talarico', 39, 6, 13, 13, 8)
agregarATablaEuroamerica('Tomas Delgado', 29, 3, 14, 17, 6)
agregarATablaEuroamerica('Tomas Torcasio', 36, 7, 12, 15, 3)
agregarATablaEuroamerica('Verónica Lucchesi', 40, 7, 14, 15, 5)
agregarATablaEuroamerica('Yago', 39, 4, 14, 16, 13)
  
ordenarTablaEuroamerica();

// Ordenar la tabla después de agregar todos los jugadores



