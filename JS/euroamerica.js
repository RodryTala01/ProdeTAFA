
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




agregarATablaEuroamerica('Anubis', 79, 10, 24, 32, 25)
agregarATablaEuroamerica('Bautista Coria', 80, 8, 29, 29, 27)
agregarATablaEuroamerica('Benja', 80, 9, 25, 32, 28)
agregarATablaEuroamerica('Bruno Alonso', 89, 9, 28, 29, 34)
agregarATablaEuroamerica('Cami', 87, 10, 25, 31, 32)
agregarATablaEuroamerica('Ciro Guarch', 65, 8, 22, 36, 19)
agregarATablaEuroamerica('Cristian Hantis', 63, 5, 24, 37, 24)
agregarATablaEuroamerica('Dani Bazan', 68, 8, 27, 31, 17)
agregarATablaEuroamerica('Dante Dragon', 40, 2, 16, 48, 18)
agregarATablaEuroamerica('Eze', 39, 4, 22, 40, 5)
agregarATablaEuroamerica('Fabrizio Escolano', 88, 12, 23, 31, 29)
agregarATablaEuroamerica('Felipe Galante', 56, 5, 22, 39, 19)
agregarATablaEuroamerica('Gabriel Talarico', 97, 9, 31, 26, 39)
agregarATablaEuroamerica('Ian Gangai', 77, 9, 25, 32, 25)
agregarATablaEuroamerica('Ignacio Cejas', 66, 7, 22, 37, 23)
agregarATablaEuroamerica('Jhose', 80, 7, 32, 27, 27)
agregarATablaEuroamerica('Joaco Fernandez', 54, 4, 29, 33, 13)
agregarATablaEuroamerica('Joel Alcalde', 75, 6, 29, 31, 28)
agregarATablaEuroamerica('Kevin Sivori', 73, 10, 19, 37, 24)
agregarATablaEuroamerica('Lucas Aguilera', 61, 5, 23, 38, 23)
agregarATablaEuroamerica('Lucas Insua', 86, 10, 28, 28, 28)
agregarATablaEuroamerica('Luciano Hufschmid', 83, 10, 21, 35, 32)
agregarATablaEuroamerica('Manu Solbes', 31, 2, 13, 51, 12)
agregarATablaEuroamerica('Mario Talarico', 81, 8, 24, 34, 33)
agregarATablaEuroamerica('Marto', 78, 7, 32, 27, 25)
agregarATablaEuroamerica('Moreno Perez', 78, 7, 27, 32, 30)
agregarATablaEuroamerica('Nico Avalos', 78, 10, 21, 35, 27)
agregarATablaEuroamerica('Nico Borea', 0, 0, 0, 66, 0)
agregarATablaEuroamerica('Pancho Muzzio', 78, 9, 25, 32, 26)
agregarATablaEuroamerica('Pollo', 82, 7, 27, 32, 34)
agregarATablaEuroamerica('Renzo Badano', 69, 6, 29, 31, 22)
agregarATablaEuroamerica('Rodri Sebastian', 46, 4, 16, 46, 18)
agregarATablaEuroamerica('Rodrigo Soca', 77, 9, 28, 29, 22)
agregarATablaEuroamerica('Rodrigo Talarico', 79, 7, 28, 31, 30)
agregarATablaEuroamerica('Tomas Delgado', 55, 3, 26, 37, 20)
agregarATablaEuroamerica('Tomas Torcasio', 66, 8, 27, 31, 15)
agregarATablaEuroamerica('Verónica Lucchesi', 86, 10, 27, 29, 29)
agregarATablaEuroamerica('Yago', 81, 7, 28, 31, 32)
  
ordenarTablaEuroamerica();

// Ordenar la tabla después de agregar todos los jugadores



