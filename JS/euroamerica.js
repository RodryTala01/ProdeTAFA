
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




agregarATablaEuroamerica('Anubis', 70, 10, 21, 29, 19)
agregarATablaEuroamerica('Bautista Coria', 73, 7, 26, 27, 26)
agregarATablaEuroamerica('Benja', 69, 9, 21, 30, 21)
agregarATablaEuroamerica('Bruno Alonso', 81, 9, 26, 25, 28)
agregarATablaEuroamerica('Cami', 76, 10, 21, 29, 25)
agregarATablaEuroamerica('Ciro Guarch', 58, 7, 20, 33, 17)
agregarATablaEuroamerica('Cristian Hantis', 56, 5, 21, 34, 20)
agregarATablaEuroamerica('Dani Bazan', 57, 6, 25, 29, 14)
agregarATablaEuroamerica('Dante Dragon', 39, 2, 16, 42, 17)
agregarATablaEuroamerica('Eze', 36, 3, 22, 35, 5)
agregarATablaEuroamerica('Fabrizio Escolano', 74, 10, 21, 29, 23)
agregarATablaEuroamerica('Felipe Galante', 54, 5, 22, 33, 17)
agregarATablaEuroamerica('Gabriel Talarico', 85, 8, 29, 23, 32)
agregarATablaEuroamerica('Ian Gangai', 70, 8, 24, 28, 22)
agregarATablaEuroamerica('Ignacio Cejas', 57, 7, 19, 34, 17)
agregarATablaEuroamerica('Jhose', 73, 7, 29, 24, 23)
agregarATablaEuroamerica('Joaco Fernandez', 50, 4, 26, 30, 12)
agregarATablaEuroamerica('Joel Alcalde', 65, 5, 26, 29, 24)
agregarATablaEuroamerica('Kevin Sivori', 67, 10, 17, 33, 20)
agregarATablaEuroamerica('Lucas Aguilera', 51, 4, 19, 37, 20)
agregarATablaEuroamerica('Lucas Insua', 79, 10, 25, 25, 24)
agregarATablaEuroamerica('Luciano Hufschmid', 68, 9, 18, 33, 23)
agregarATablaEuroamerica('Manu Solbes', 31, 2, 13, 45, 12)
agregarATablaEuroamerica('Mario Talarico', 68, 7, 22, 31, 25)
agregarATablaEuroamerica('Marto', 70, 6, 29, 25, 23)
agregarATablaEuroamerica('Moreno Perez', 69, 7, 24, 29, 24)
agregarATablaEuroamerica('Nico Avalos', 70, 10, 17, 33, 23)
agregarATablaEuroamerica('Nico Borea', 0, 0, 0, 60, 0)
agregarATablaEuroamerica('Pancho Muzzio', 68, 8, 22, 30, 22)
agregarATablaEuroamerica('Pollo', 75, 7, 25, 28, 29)
agregarATablaEuroamerica('Renzo Badano', 62, 6, 25, 29, 19)
agregarATablaEuroamerica('Rodri Sebastian', 45, 4, 16, 40, 17)
agregarATablaEuroamerica('Rodrigo Soca', 70, 9, 24, 27, 19)
agregarATablaEuroamerica('Rodrigo Talarico', 71, 7, 25, 28, 25)
agregarATablaEuroamerica('Tomas Delgado', 50, 3, 23, 34, 18)
agregarATablaEuroamerica('Tomas Torcasio', 62, 8, 24, 28, 14)
agregarATablaEuroamerica('Verónica Lucchesi', 77, 10, 23, 27, 24)
agregarATablaEuroamerica('Yago', 72, 7, 25, 28, 26)
  
ordenarTablaEuroamerica();

// Ordenar la tabla después de agregar todos los jugadores



