
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




agregarATablaEuroamerica('Anubis', 82, 10, 24, 44, 28)
agregarATablaEuroamerica('Bautista Coria', 97, 10, 32, 36, 35)
agregarATablaEuroamerica('Benja', 104, 13, 26, 39, 39)
agregarATablaEuroamerica('Bruno Alonso', 116, 13, 30, 35, 47)
agregarATablaEuroamerica('Cami', 108, 12, 27, 39, 45)
agregarATablaEuroamerica('Ciro Guarch', 77, 9, 25, 44, 25)
agregarATablaEuroamerica('Cristian Hantis', 66, 5, 24, 49, 27)
agregarATablaEuroamerica('Dani Bazan', 82, 12, 29, 37, 17)
agregarATablaEuroamerica('Dante Dragon', 40, 2, 16, 60, 18)
agregarATablaEuroamerica('Eze', 44, 4, 27, 47, 5)
agregarATablaEuroamerica('Fabrizio Escolano', 129, 18, 26, 34, 49)
agregarATablaEuroamerica('Felipe Galante', 60, 5, 22, 51, 23)
agregarATablaEuroamerica('Gabriel Talarico', 123, 12, 34, 32, 53)
agregarATablaEuroamerica('Ian Gangai', 82, 10, 25, 43, 27)
agregarATablaEuroamerica('Ignacio Cejas', 84, 8, 27, 43, 33)
agregarATablaEuroamerica('Jhose', 94, 8, 34, 36, 36)
agregarATablaEuroamerica('Joaco Fernandez', 70, 6, 31, 41, 21)
agregarATablaEuroamerica('Joel Alcalde', 91, 6, 33, 39, 40)
agregarATablaEuroamerica('Kevin Sivori', 102, 12, 23, 43, 43)
agregarATablaEuroamerica('Lucas Aguilera', 78, 7, 26, 45, 31)
agregarATablaEuroamerica('Lucas Insua', 106, 11, 33, 34, 40)
agregarATablaEuroamerica('Luciano Hufschmid', 101, 11, 24, 43, 44)
agregarATablaEuroamerica('Manu Solbes', 31, 2, 13, 63, 12)
agregarATablaEuroamerica('Mario Talarico', 88, 8, 25, 45, 39)
agregarATablaEuroamerica('Marto', 96, 8, 37, 33, 35)
agregarATablaEuroamerica('Moreno Perez', 105, 11, 31, 36, 41)
agregarATablaEuroamerica('Nico Avalos', 98, 12, 25, 41, 37)
agregarATablaEuroamerica('Nico Borea', 0, 0, 0, 78, 0)
agregarATablaEuroamerica('Pancho Muzzio', 99, 11, 27, 40, 39)
agregarATablaEuroamerica('Pollo', 114, 11, 30, 37, 51)
agregarATablaEuroamerica('Renzo Badano', 91, 8, 32, 38, 35)
agregarATablaEuroamerica('Rodri Sebastian', 48, 4, 16, 58, 20)
agregarATablaEuroamerica('Rodrigo Soca', 92, 12, 31, 35, 25)
agregarATablaEuroamerica('Rodrigo Talarico', 109, 10, 29, 39, 50)
agregarATablaEuroamerica('Tomas Delgado', 63, 4, 28, 46, 23)
agregarATablaEuroamerica('Tomas Torcasio', 68, 8, 27, 43, 17)
agregarATablaEuroamerica('Verónica Lucchesi', 112, 13, 29, 36, 44)
agregarATablaEuroamerica('Yago', 102, 11, 29, 38, 40)
  
ordenarTablaEuroamerica();

// Ordenar la tabla después de agregar todos los jugadores



