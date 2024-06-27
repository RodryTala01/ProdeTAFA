
function agregarATablaProdePago(Participante, PTS, V, E, D, PF, PC, DIF) {
    const tbody = document.querySelector('#tablaPosicionesProdePago tbody');
    const rowCount = tbody.rows.length;
    const nextNumber = rowCount + 1;

    const newRow = document.createElement('tr');

    const numberCell = document.createElement('td');
    numberCell.textContent = nextNumber;
    if (nextNumber === 1) {
        numberCell.classList.add('highlight-green');
    } else { numberCell.classList.remove('highlight-green'); }
    newRow.appendChild(numberCell);

    const participanteCell = document.createElement('td');
    participanteCell.textContent = Participante;
    newRow.appendChild(participanteCell);

    const ptsCell = document.createElement('td');
    ptsCell.textContent = PTS;
    newRow.appendChild(ptsCell);

    const vCell = document.createElement('td');
    vCell.textContent = V;
    newRow.appendChild(vCell);

    const eCell = document.createElement('td');
    eCell.textContent = E;
    newRow.appendChild(eCell);

    const dCell = document.createElement('td');
    dCell.textContent = D;
    newRow.appendChild(dCell);

    const pfCell = document.createElement('td');
    pfCell.textContent = PF;
    newRow.appendChild(pfCell);

    const pcCell = document.createElement('td');
    pcCell.textContent = PC;
    newRow.appendChild(pcCell);

    const difCell = document.createElement('td');
    difCell.textContent = DIF;
    newRow.appendChild(difCell);

    tbody.appendChild(newRow);
}

function ordenarTablaProdePago() {
    const tbody = document.querySelector('#tablaPosicionesProdePago tbody');
    const rows = Array.from(tbody.rows);

    rows.sort((a, b) => {
        const pfA = parseInt(a.cells[6].textContent);
        const pfB = parseInt(b.cells[6].textContent);
        const difA = parseInt(a.cells[8].textContent);
        const difB = parseInt(b.cells[8].textContent);
        const ptsA = parseInt(a.cells[2].textContent);
        const ptsB = parseInt(b.cells[2].textContent);
        const participanteA = a.cells[1].textContent.toLowerCase();
        const participanteB = b.cells[1].textContent.toLowerCase();

        
        if (ptsA !== ptsB) return ptsB - ptsA;
        if (difA !== difB) return difB - difA;
        if (pfA !== pfB) return pfB - pfA;
        if (participanteA < participanteB) return -1;
        if (participanteA > participanteB) return 1;
        

        
       
        
        
        
        return 0;
    });

    rows.forEach((row, index) => {
        row.cells[0].textContent = index + 1;
        if (index === 0) {
            row.cells[0].classList.add('highlight-green');
        } else {
            row.cells[0].classList.remove('highlight-green');
        }
        tbody.appendChild(row);
    });
}




function seleccionarProdePago(seleccion) {
    var botonesFecha = document.querySelectorAll('.cajaFECHA'); // Selecciona todos los botones de fecha
    botonesFecha.forEach(function (btn) {
        btn.classList.remove('btnFechaActivo'); // Quita la clase 'btnFechaActivo' a todos los botones
    });
    document.getElementById("btn" + seleccion).classList.add('btnFechaActivo'); // Agrega la clase 'btnFechaActivo' al botón clicado


    

    var divsFechas = document.querySelectorAll('[id^="divProdePago"]'); // Selecciona todos los divs de fecha
    divsFechas.forEach(function (div) {
        if (div.id === "div" + seleccion) {
            div.style.display = "flex"; // Muestra el div correspondiente al ID
        } else {
            div.style.display = "none"; // Oculta los demás divs
        }
    });

    var texto = document.getElementById("subtituloProdePago");

    if (seleccion === "ProdePagoTabla") {
        texto.innerHTML = "Tabla de Posiciones";
    }
    if (seleccion === "ProdePagoFechas") {
        texto.innerHTML = "Fixture";
    }

}

function agregarDatosProdePago() {
    // Obtener el texto del textarea
    var texto = document.getElementById('inputTextoAdminProdePago').value.trim();

    // Dividir el texto en líneas
    var lineas = texto.split('\n');

    // Limpiar el div donde se mostrará el resultado
    var textoParaCopiar = document.getElementById('textoParaCopiarProdePago');
    textoParaCopiar.innerHTML = '';

    // Iterar sobre cada línea y procesar los datos
    lineas.forEach(function (linea) {
        // Usar una expresión regular para dividir por espacios o tabulaciones,
        // pero asegurándonos de manejar correctamente los nombres con espacios
        var datos = linea.match(/\S+/g);

        // Verificar que haya al menos 6 elementos (nombre + 5 números)
        if (datos && datos.length >= 8) {
            // El primer elemento es el nombre completo, los siguientes son los números
            var nombre = datos.slice(0, datos.length - 7).join(' '); // Unir los primeros elementos como nombre completo

            // Los siguientes elementos son los números
            var numeros = datos.slice(-7).map(function (num) {
                return isNaN(num) ? 'undefined' : num; // Si no es un número válido, reemplazar con 'undefined'
            });

            // Construir la llamada a la función agregarATablaProdePago
            var llamada = `agregarATablaProdePago('${nombre}', ${numeros.join(', ')})`;

            // Crear un elemento div para mostrar la llamada
            var nuevoDiv = document.createElement('div');
            nuevoDiv.textContent = llamada;

            // Agregar el nuevo div al contenedor
            textoParaCopiar.appendChild(nuevoDiv);
        }
    });
}

// Función para copiar el texto generado (opcional)
function copiarTextoGeneradoProdePago() {
    var textoParaCopiar = document.getElementById('textoParaCopiarProdePago');
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


agregarATablaProdePago('Mario Talarico', 9, 3, 0, 0, 23, 12, 11)
agregarATablaProdePago('Rodrigo Soca', 6, 2, 0, 1, 19, 15, 4)
agregarATablaProdePago('Gabriel Talarico', 5, 1, 2, 0, 17, 15, 2)
agregarATablaProdePago('Rodrigo Talarico', 4, 1, 1, 1, 19, 12, 7)
agregarATablaProdePago('Cami', 4, 1, 1, 1, 18, 15, 3)
agregarATablaProdePago('Fabrizio Escolano', 4, 1, 1, 1, 16, 15, 1)
agregarATablaProdePago('Manu Solbes', 3, 1, 0, 2, 9, 23, -14)
agregarATablaProdePago('Moreno Perez', 2, 0, 2, 1, 13, 15, -2)
agregarATablaProdePago('Lucas Aguilera', 1, 0, 1, 2, 13, 18, -5)
agregarATablaProdePago('Dante Dragon', 1, 0, 1, 2, 9, 16, -7)


ordenarTablaProdePago()



// Ordenar la tabla después de agregar todos los jugadores



