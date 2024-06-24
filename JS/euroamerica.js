
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




agregarATablaEuroamerica('Anubis', 28, 4, 14, 14, 2)
agregarATablaEuroamerica('Bautista Coria', 36, 5, 14, 13, 7)
agregarATablaEuroamerica('Benja', 32, 6, 10, 16, 4)
agregarATablaEuroamerica('Bruno Alonso', 38, 3, 16, 13, 13)
agregarATablaEuroamerica('Cami', 41, 7, 11, 14, 9)
agregarATablaEuroamerica('Ciro Guarch', 25, 4, 11, 17, 2)
agregarATablaEuroamerica('Cristian Hantis', 24, 3, 12, 17, 3)
agregarATablaEuroamerica('Dani Bazan', 29, 3, 15, 14, 5)
agregarATablaEuroamerica('Dante Dragon', 26, 2, 15, 15, 5)
agregarATablaEuroamerica('Eze', 22, 2, 11, 19, 5)
agregarATablaEuroamerica('Fabrizio Escolano', 30, 4, 11, 17, 7)
agregarATablaEuroamerica('Felipe Galante', 30, 3, 15, 14, 6)
agregarATablaEuroamerica('Gabriel Talarico', 39, 4, 16, 12, 11)
agregarATablaEuroamerica('Ian Gangai', 28, 3, 13, 16, 6)
agregarATablaEuroamerica('Ignacio Cejas', 25, 4, 10, 18, 3)
agregarATablaEuroamerica('Jhose', 32, 4, 15, 13, 5)
agregarATablaEuroamerica('Joaco Fernandez', 24, 2, 15, 15, 3)
agregarATablaEuroamerica('Joel Alcalde', 26, 2, 15, 15, 5)
agregarATablaEuroamerica('Kevin Sivori', 33, 7, 8, 17, 4)
agregarATablaEuroamerica('Lucas Aguilera', 30, 4, 10, 18, 8)
agregarATablaEuroamerica('Lucas Insua', 36, 5, 13, 14, 8)
agregarATablaEuroamerica('Luciano Hufschmid', 26, 3, 11, 18, 6)
agregarATablaEuroamerica('Manu Solbes', 22, 2, 13, 17, 3)
agregarATablaEuroamerica('Mario Talarico', 32, 5, 12, 15, 5)
agregarATablaEuroamerica('Marto', 35, 5, 15, 12, 5)
agregarATablaEuroamerica('Moreno Perez', 25, 4, 12, 16, 1)
agregarATablaEuroamerica('Nico Avalos', 27, 5, 7, 20, 5)
agregarATablaEuroamerica('Nico Borea', 0, 0, 0, 32, 0)
agregarATablaEuroamerica('Pancho Muzzio', 30, 5, 11, 16, 4)
agregarATablaEuroamerica('Pollo', 34, 5, 13, 14, 6)
agregarATablaEuroamerica('Renzo Badano', 28, 4, 16, 12, 0)
agregarATablaEuroamerica('Rodri Sebastian', 18, 3, 7, 22, 2)
agregarATablaEuroamerica('Rodrigo Soca', 35, 5, 14, 13, 6)
agregarATablaEuroamerica('Rodrigo Talarico', 35, 5, 13, 12, 7)
agregarATablaEuroamerica('Tomas Delgado', 29, 3, 14, 15, 6)
agregarATablaEuroamerica('Tomas Torcasio', 33, 6, 12, 14, 3)
agregarATablaEuroamerica('Verónica Lucchesi', 37, 6, 14, 14, 5)
agregarATablaEuroamerica('Yago', 38, 4, 14, 14, 12)
  
ordenarTablaEuroamerica();

// Ordenar la tabla después de agregar todos los jugadores



