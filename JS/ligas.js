
function agregarDatosPrimera() {
    // Obtener el texto del textarea
    var texto = document.getElementById('inputTextoAdminPrimera').value.trim();

    // Dividir el texto en líneas
    var lineas = texto.split('\n');

    // Limpiar el div donde se mostrará el resultado
    var textoParaCopiar = document.getElementById('textoParaCopiarPrimera');
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

            // Construir la llamada a la función agregarATablaPrimera
            var llamada = `agregarATablaPrimera('${nombre}', ${numeros.join(', ')})`;

            // Crear un elemento div para mostrar la llamada
            var nuevoDiv = document.createElement('div');
            nuevoDiv.textContent = llamada;

            // Agregar el nuevo div al contenedor
            textoParaCopiar.appendChild(nuevoDiv);
        }
    });
}

// Función para copiar el texto generado (opcional)
function copiarTextoGeneradoPrimera() {
    var textoParaCopiar = document.getElementById('textoParaCopiarPrimera');
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


function agregarATablaPrimera(Jugador, PTS, Pleno, Parcial, Error, Extra) {
    const tbody = document.querySelector('#tablaPosicionesPrimera tbody');
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
    ptsCell.classList.add('ptsTablaPosicionesPrimera');
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


    function ordenarTablaPrimera() {
        const tbody = document.querySelector('.tablaPosicionesPrimera tbody');
        if (!tbody) {
            console.error('Element not found: .tablaPosicionesPrimera tbody');
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
            if (index == 0) {
                row.cells[0].classList.add('highlight-green');
            } 

            if (index > 0) {
                row.cells[0].classList.add('highlight-orange');
            }

            if (index > 13) {
                row.cells[0].classList.add('highlight-yellow');
            }
            if (index > 15) {
                row.cells[0].classList.add('highlight-red');
            }

            if (index > 6 && index < 14) {
                row.cells[0].classList.remove('highlight-red');
                row.cells[0].classList.remove('highlight-orange');
                row.cells[0].classList.remove('highlight-green');
                row.cells[0].classList.remove('highlight-yellow');
                row.cells[0].classList.remove('highlight-red');
            } 

            

            
            tbody.appendChild(row);
        });
}
    


function agregarDatosSegunda() {
    // Obtener el texto del textarea
    var texto = document.getElementById('inputTextoAdminSegunda').value.trim();

    // Dividir el texto en líneas
    var lineas = texto.split('\n');

    // Limpiar el div donde se mostrará el resultado
    var textoParaCopiar = document.getElementById('textoParaCopiarSegunda');
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

            // Construir la llamada a la función agregarATablaSegunda
            var llamada = `agregarATablaSegunda('${nombre}', ${numeros.join(', ')})`;

            // Crear un elemento div para mostrar la llamada
            var nuevoDiv = document.createElement('div');
            nuevoDiv.textContent = llamada;

            // Agregar el nuevo div al contenedor
            textoParaCopiar.appendChild(nuevoDiv);
        }
    });
}

// Función para copiar el texto generado (opcional)
function copiarTextoGeneradoSegunda() {
    var textoParaCopiar = document.getElementById('textoParaCopiarSegunda');
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


function agregarATablaSegunda(Jugador, PTS, Pleno, Parcial, Error, Extra) {
    const tbody = document.querySelector('#tablaPosicionesSegunda tbody');
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
    ptsCell.classList.add('ptsTablaPosicionesSegunda');
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


function ordenarTablaSegunda() {
    const tbody = document.querySelector('.tablaPosicionesSegunda tbody');
    if (!tbody) {
        console.error('Element not found: .tablaPosicionesSegunda tbody');
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
        if (index == 0) {
            row.cells[0].classList.add('highlight-green');
        }

        if (index > 0) {
            row.cells[0].classList.add('highlight-yellow');
        }

        if (index > 2) {
            row.cells[0].classList.remove('highlight-green');
            row.cells[0].classList.remove('highlight-yellow');
        }




        tbody.appendChild(row);
    });
}






//PRIMERA DIVISION


agregarATablaPrimera('Bruno Alonso', 0, 0, 0, 0, 0)
agregarATablaPrimera('Cami', 0, 0, 0, 0, 0)
agregarATablaPrimera('Fabrizio Escolano', 0, 0, 0, 0, 0)
agregarATablaPrimera('Felipe Galante', 0, 0, 0, 0, 0)
agregarATablaPrimera('Gabriel Talarico', 0, 0, 0, 0, 0)
agregarATablaPrimera('Ian Gangai', 0, 0, 0, 0, 0)
agregarATablaPrimera('Jhose', 0, 0, 0, 0, 0)
agregarATablaPrimera('Joel Alcalde', 0, 0, 0, 0, 0)
agregarATablaPrimera('Lucas Aguilera', 0, 0, 0, 0, 0)
agregarATablaPrimera('Mario Talarico', 0, 0, 0, 0, 0)
agregarATablaPrimera('Moreno Perez', 0, 0, 0, 0, 0)
agregarATablaPrimera('Nico Avalos', 0, 0, 0, 0, 0)
agregarATablaPrimera('Pancho Muzzio', 0, 0, 0, 0, 0)
agregarATablaPrimera('Pollo', 0, 0, 0, 0, 0)
agregarATablaPrimera('Renzo Badano', 0, 0, 0, 0, 0)
agregarATablaPrimera('Rodrigo Soca', 0, 0, 0, 0, 0)
agregarATablaPrimera('Tomás Delgado', 0, 0, 0, 0, 0)
agregarATablaPrimera('Tomás Torcasio', 0, 0, 0, 0, 0)


//SEGUNDA DIVISION


agregarATablaSegunda('Anubis', 0, 0, 0, 0, 0)
agregarATablaSegunda('Benja', 0, 0, 0, 0, 0)
agregarATablaSegunda('Ciro Guarch', 0, 0, 0, 0, 0)
agregarATablaSegunda('Cristian Hantis', 0, 0, 0, 0, 0)
agregarATablaSegunda('Dani Bazan', 0, 0, 0, 0, 0)
agregarATablaSegunda('Ignacio Cejas', 0, 0, 0, 0, 0)
agregarATablaSegunda('Kevin Sívori', 0, 0, 0, 0, 0)
agregarATablaSegunda('Lucas Insua', 0, 0, 0, 0, 0)
agregarATablaSegunda('Luciano Hufschmid', 0, 0, 0, 0, 0)
agregarATablaSegunda('Marto', 0, 0, 0, 0, 0)
agregarATablaSegunda('Rodri Sebastian', 0, 0, 0, 0, 0)
agregarATablaSegunda('Rodrigo Talarico', 0, 0, 0, 0, 0)
agregarATablaSegunda('Santi', 0, 0, 0, 0, 0)
agregarATablaSegunda('Verónica Lucchesi', 0, 0, 0, 0, 0)

  





ordenarTablaSegunda();
ordenarTablaPrimera();

// Ordenar la tabla después de agregar todos los jugadores



