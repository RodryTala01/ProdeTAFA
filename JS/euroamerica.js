
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




agregarATablaEuroamerica('Anubis', 54, 8, 16, 24, 14)
agregarATablaEuroamerica('Bautista Coria', 56, 7, 19, 22, 16)
agregarATablaEuroamerica('Benja', 51, 7, 16, 25, 14)
agregarATablaEuroamerica('Bruno Alonso', 61, 7, 19, 22, 21)
agregarATablaEuroamerica('Cami', 61, 10, 14, 24, 17)
agregarATablaEuroamerica('Ciro Guarch', 44, 7, 15, 26, 8)
agregarATablaEuroamerica('Cristian Hantis', 41, 5, 15, 28, 11)
agregarATablaEuroamerica('Dani Bazan', 44, 4, 19, 25, 13)
agregarATablaEuroamerica('Dante Dragon', 36, 2, 16, 30, 14)
agregarATablaEuroamerica('Eze', 28, 3, 14, 31, 5)
agregarATablaEuroamerica('Fabrizio Escolano', 51, 7, 14, 27, 16)
agregarATablaEuroamerica('Felipe Galante', 47, 5, 19, 24, 13)
agregarATablaEuroamerica('Gabriel Talarico', 61, 6, 22, 20, 21)
agregarATablaEuroamerica('Ian Gangai', 48, 5, 18, 25, 15)
agregarATablaEuroamerica('Ignacio Cejas', 43, 7, 13, 28, 9)
agregarATablaEuroamerica('Jhose', 54, 6, 21, 21, 15)
agregarATablaEuroamerica('Joaco Fernandez', 32, 3, 19, 26, 4)
agregarATablaEuroamerica('Joel Alcalde', 49, 4, 20, 24, 17)
agregarATablaEuroamerica('Kevin Sivori', 50, 8, 12, 28, 14)
agregarATablaEuroamerica('Lucas Aguilera', 43, 4, 15, 29, 16)
agregarATablaEuroamerica('Lucas Insua', 64, 10, 15, 23, 19)
agregarATablaEuroamerica('Luciano Hufschmid', 56, 9, 13, 26, 16)
agregarATablaEuroamerica('Manu Solbes', 31, 2, 13, 33, 12)
agregarATablaEuroamerica('Mario Talarico', 53, 7, 14, 27, 18)
agregarATablaEuroamerica('Marto', 54, 5, 22, 21, 17)
agregarATablaEuroamerica('Moreno Perez', 46, 5, 17, 26, 14)
agregarATablaEuroamerica('Nico Avalos', 52, 8, 10, 30, 18)
agregarATablaEuroamerica('Nico Borea', 0, 0, 0, 48, 0)
agregarATablaEuroamerica('Pancho Muzzio', 50, 7, 14, 27, 15)
agregarATablaEuroamerica('Pollo', 52, 5, 19, 24, 18)
agregarATablaEuroamerica('Renzo Badano', 47, 6, 19, 23, 10)
agregarATablaEuroamerica('Rodri Sebastian', 37, 4, 13, 31, 12)
agregarATablaEuroamerica('Rodrigo Soca', 54, 8, 17, 23, 13)
agregarATablaEuroamerica('Rodrigo Talarico', 54, 7, 16, 23, 17)
agregarATablaEuroamerica('Tomas Delgado', 41, 3, 17, 28, 15)
agregarATablaEuroamerica('Tomas Torcasio', 51, 8, 16, 24, 11)
agregarATablaEuroamerica('Verónica Lucchesi', 56, 8, 17, 25, 15)
agregarATablaEuroamerica('Yago', 60, 7, 18, 23, 21)
  
ordenarTablaEuroamerica();

// Ordenar la tabla después de agregar todos los jugadores



