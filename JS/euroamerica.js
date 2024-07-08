
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

            if (index > 26) {
                row.cells[0].classList.add('highlight-red');
                row.cells[1].classList.add('highlight-red');
                row.cells[2].classList.add('highlight-red');
                row.cells[3].classList.add('highlight-red');
                row.cells[4].classList.add('highlight-red');
                row.cells[5].classList.add('highlight-red');
                row.cells[6].classList.add('highlight-red');
            } else {
                row.cells[0].classList.remove('highlight-red');
                row.cells[1].classList.remove('highlight-red');
                row.cells[2].classList.remove('highlight-red');
                row.cells[3].classList.remove('highlight-red');
                row.cells[4].classList.remove('highlight-red');
                row.cells[5].classList.remove('highlight-red');
                row.cells[6].classList.remove('highlight-red');
            }
            tbody.appendChild(row);
        });
    }

    ordenarTablaEuroamerica();




agregarATablaEuroamerica('Anubis', 82, 10, 24, 42, 28)
agregarATablaEuroamerica('Bautista Coria', 96, 10, 31, 35, 35)
agregarATablaEuroamerica('Benja', 97, 11, 26, 39, 38)
agregarATablaEuroamerica('Bruno Alonso', 108, 11, 30, 35, 45)
agregarATablaEuroamerica('Cami', 102, 11, 27, 38, 42)
agregarATablaEuroamerica('Ciro Guarch', 73, 9, 24, 43, 22)
agregarATablaEuroamerica('Cristian Hantis', 66, 5, 24, 47, 27)
agregarATablaEuroamerica('Dani Bazan', 81, 12, 28, 36, 17)
agregarATablaEuroamerica('Dante Dragon', 40, 2, 16, 58, 18)
agregarATablaEuroamerica('Eze', 42, 4, 25, 47, 5)
agregarATablaEuroamerica('Fabrizio Escolano', 119, 17, 25, 34, 43)
agregarATablaEuroamerica('Felipe Galante', 60, 5, 22, 49, 23)
agregarATablaEuroamerica('Gabriel Talarico', 118, 11, 34, 31, 51)
agregarATablaEuroamerica('Ian Gangai', 82, 10, 25, 41, 27)
agregarATablaEuroamerica('Ignacio Cejas', 79, 7, 26, 43, 32)
agregarATablaEuroamerica('Jhose', 92, 8, 33, 35, 35)
agregarATablaEuroamerica('Joaco Fernandez', 66, 5, 30, 41, 21)
agregarATablaEuroamerica('Joel Alcalde', 88, 6, 31, 39, 39)
agregarATablaEuroamerica('Kevin Sivori', 94, 11, 22, 43, 39)
agregarATablaEuroamerica('Lucas Aguilera', 78, 7, 26, 43, 31)
agregarATablaEuroamerica('Lucas Insua', 102, 11, 32, 33, 37)
agregarATablaEuroamerica('Luciano Hufschmid', 99, 11, 22, 43, 44)
agregarATablaEuroamerica('Manu Solbes', 31, 2, 13, 61, 12)
agregarATablaEuroamerica('Mario Talarico', 83, 8, 24, 44, 35)
agregarATablaEuroamerica('Marto', 93, 7, 37, 32, 35)
agregarATablaEuroamerica('Moreno Perez', 101, 10, 31, 35, 40)
agregarATablaEuroamerica('Nico Avalos', 92, 11, 24, 41, 35)
agregarATablaEuroamerica('Nico Borea', 0, 0, 0, 76, 0)
agregarATablaEuroamerica('Pancho Muzzio', 95, 10, 27, 39, 38)
agregarATablaEuroamerica('Pollo', 109, 10, 29, 37, 50)
agregarATablaEuroamerica('Renzo Badano', 87, 7, 32, 37, 34)
agregarATablaEuroamerica('Rodri Sebastian', 48, 4, 16, 56, 20)
agregarATablaEuroamerica('Rodrigo Soca', 87, 11, 30, 35, 24)
agregarATablaEuroamerica('Rodrigo Talarico', 97, 8, 29, 39, 44)
agregarATablaEuroamerica('Tomas Delgado', 59, 3, 28, 45, 22)
agregarATablaEuroamerica('Tomas Torcasio', 68, 8, 27, 41, 17)
agregarATablaEuroamerica('Verónica Lucchesi', 106, 12, 29, 35, 41)
agregarATablaEuroamerica('Yago', 95, 9, 29, 38, 39)
  
ordenarTablaEuroamerica();

// Ordenar la tabla después de agregar todos los jugadores



