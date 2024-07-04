
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




agregarATablaEuroamerica('Anubis', 82, 10, 24, 34, 28)
agregarATablaEuroamerica('Bautista Coria', 80, 8, 29, 31, 27)
agregarATablaEuroamerica('Benja', 80, 9, 25, 34, 28)
agregarATablaEuroamerica('Bruno Alonso', 92, 10, 28, 30, 34)
agregarATablaEuroamerica('Cami', 93, 11, 25, 32, 35)
agregarATablaEuroamerica('Ciro Guarch', 66, 8, 23, 37, 19)
agregarATablaEuroamerica('Cristian Hantis', 66, 5, 24, 39, 27)
agregarATablaEuroamerica('Dani Bazan', 71, 9, 27, 32, 17)
agregarATablaEuroamerica('Dante Dragon', 40, 2, 16, 50, 18)
agregarATablaEuroamerica('Eze', 40, 4, 23, 41, 5)
agregarATablaEuroamerica('Fabrizio Escolano', 98, 14, 23, 31, 33)
agregarATablaEuroamerica('Felipe Galante', 60, 5, 22, 41, 23)
agregarATablaEuroamerica('Gabriel Talarico', 97, 9, 31, 28, 39)
agregarATablaEuroamerica('Ian Gangai', 82, 10, 25, 33, 27)
agregarATablaEuroamerica('Ignacio Cejas', 69, 7, 23, 38, 25)
agregarATablaEuroamerica('Jhose', 85, 8, 32, 28, 29)
agregarATablaEuroamerica('Joaco Fernandez', 54, 4, 29, 35, 13)
agregarATablaEuroamerica('Joel Alcalde', 77, 6, 29, 33, 30)
agregarATablaEuroamerica('Kevin Sivori', 74, 10, 20, 38, 24)
agregarATablaEuroamerica('Lucas Aguilera', 66, 6, 23, 39, 25)
agregarATablaEuroamerica('Lucas Insua', 89, 11, 28, 29, 28)
agregarATablaEuroamerica('Luciano Hufschmid', 83, 10, 21, 37, 32)
agregarATablaEuroamerica('Manu Solbes', 31, 2, 13, 53, 12)
agregarATablaEuroamerica('Mario Talarico', 83, 8, 24, 36, 35)
agregarATablaEuroamerica('Marto', 78, 7, 32, 29, 25)
agregarATablaEuroamerica('Moreno Perez', 81, 8, 27, 33, 30)
agregarATablaEuroamerica('Nico Avalos', 78, 10, 21, 37, 27)
agregarATablaEuroamerica('Nico Borea', 0, 0, 0, 68, 0)
agregarATablaEuroamerica('Pancho Muzzio', 83, 10, 25, 33, 28)
agregarATablaEuroamerica('Pollo', 87, 7, 28, 33, 38)
agregarATablaEuroamerica('Renzo Badano', 70, 6, 30, 32, 22)
agregarATablaEuroamerica('Rodri Sebastian', 48, 4, 16, 48, 20)
agregarATablaEuroamerica('Rodrigo Soca', 77, 9, 28, 31, 22)
agregarATablaEuroamerica('Rodrigo Talarico', 79, 7, 28, 33, 30)
agregarATablaEuroamerica('Tomas Delgado', 57, 3, 26, 39, 22)
agregarATablaEuroamerica('Tomas Torcasio', 68, 8, 27, 33, 17)
agregarATablaEuroamerica('Verónica Lucchesi', 91, 11, 27, 30, 31)
agregarATablaEuroamerica('Yago', 81, 7, 28, 33, 32)
  
ordenarTablaEuroamerica();

// Ordenar la tabla después de agregar todos los jugadores



