
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
                row.cells[1].classList.add('highlight-green');
                row.cells[2].classList.add('highlight-green');
                row.cells[3].classList.add('highlight-green');
                row.cells[4].classList.add('highlight-green');
                row.cells[5].classList.add('highlight-green');
                row.cells[6].classList.add('highlight-green');
            } else {
                row.cells[0].classList.remove('highlight-green');
            }

            if (index > 0) {
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


agregarATablaEuroamerica('Fabrizio Escolano', 135, 18, 28, 37, 53)
agregarATablaEuroamerica('Gabriel Talarico', 130, 14, 34, 35, 54)
agregarATablaEuroamerica('Bruno Alonso', 121, 13, 32, 38, 50)
agregarATablaEuroamerica('Pollo', 121, 12, 32, 39, 53)
agregarATablaEuroamerica('Verónica Lucchesi', 114, 13, 30, 40, 45)
agregarATablaEuroamerica('Rodrigo Talarico', 113, 10, 31, 42, 52)
agregarATablaEuroamerica('Cami', 108, 12, 27, 44, 45)
agregarATablaEuroamerica('Moreno Perez', 110, 11, 32, 40, 45)
agregarATablaEuroamerica('Lucas Insua', 109, 11, 35, 37, 41)
agregarATablaEuroamerica('Benja', 107, 14, 26, 43, 39)
agregarATablaEuroamerica('Luciano Hufschmid', 108, 13, 24, 46, 45)
agregarATablaEuroamerica('Kevin Sivori', 108, 13, 24, 46, 45)
agregarATablaEuroamerica('Pancho Muzzio', 104, 12, 29, 42, 39)
agregarATablaEuroamerica('Yago', 102, 11, 29, 43, 40)
agregarATablaEuroamerica('Bautista Coria', 100, 11, 32, 40, 35)
agregarATablaEuroamerica('Nico Avalos', 104, 13, 25, 45, 40)
agregarATablaEuroamerica('Marto', 97, 8, 37, 38, 36)
agregarATablaEuroamerica('Jhose', 97, 8, 36, 39, 37)
agregarATablaEuroamerica('Rodrigo Soca', 96, 13, 31, 39, 26)
agregarATablaEuroamerica('Joel Alcalde', 98, 7, 37, 39, 40)
agregarATablaEuroamerica('Renzo Badano', 91, 8, 32, 43, 35)
agregarATablaEuroamerica('Mario Talarico', 91, 8, 25, 50, 42)
agregarATablaEuroamerica('Dani Bazan', 92, 15, 30, 38, 17)
agregarATablaEuroamerica('Ignacio Cejas', 84, 8, 27, 48, 33)
agregarATablaEuroamerica('Ian Gangai', 84, 10, 26, 47, 28)
agregarATablaEuroamerica('Anubis', 82, 10, 24, 49, 28)
agregarATablaEuroamerica('Ciro Guarch', 78, 9, 26, 48, 25)
agregarATablaEuroamerica('Lucas Aguilera', 78, 7, 26, 50, 31)
agregarATablaEuroamerica('Joaco Fernandez', 73, 6, 33, 44, 22)
agregarATablaEuroamerica('Tomas Delgado', 70, 6, 29, 48, 23)
agregarATablaEuroamerica('Tomas Torcasio', 68, 8, 27, 48, 17)
agregarATablaEuroamerica('Cristian Hantis', 66, 5, 24, 54, 27)
agregarATablaEuroamerica('Felipe Galante', 60, 5, 22, 56, 23)
agregarATablaEuroamerica('Rodri Sebastian', 48, 4, 16, 63, 20)
agregarATablaEuroamerica('Eze', 44, 4, 27, 52, 5)
agregarATablaEuroamerica('Dante Dragon', 40, 2, 16, 65, 18)
agregarATablaEuroamerica('Manu Solbes', 31, 2, 13, 68, 12)
agregarATablaEuroamerica('Nico Borea', 0, 0, 0, 83, 0)
  
ordenarTablaEuroamerica();

// Ordenar la tabla después de agregar todos los jugadores



