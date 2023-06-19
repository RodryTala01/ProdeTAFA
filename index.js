
function mostrarFecha1() {
  fecha32avos = document.getElementById("fecha32avos");
  fecha1 = document.getElementById("fecha1");
  textoCaja = document.getElementById("textoCaja");
  cajaBotonesFechas = document.getElementById("cajaBotonesFechas");


  fecha32avos.style.display = "none";
  fecha1.style.display = "block";
}

function mostrarFecha32avos() {
  fecha32avos = document.getElementById("fecha32avos");
  fecha1 = document.getElementById("fecha1");
  textoCaja = document.getElementById("textoCaja");
  cajaBotonesFechas = document.getElementById("cajaBotonesFechas");


  fecha32avos.style.display = "block";
  fecha1.style.display = "none";
}

function noHayFecha() {
  Swal.fire({
    title: 'No hay fecha cargada',
    text: 'El admin todavía no cargó la fecha',
    icon: 'warning',
    confirmButtonText: 'Aceptar'
  });
}

function primeraDivision() {
  boton1 = document.getElementById("primeraDivision")
  boton2 = document.getElementById("segundaDivision")
  boton3 = document.getElementById("terceraDivision")
  tablaA = document.getElementById("tablaPosA")
  tablaB = document.getElementById("tablaPosB")
  tablaC = document.getElementById("tablaPosC")

  boton1.style.backgroundColor = "#0f5132";
  boton2.style.backgroundColor = "#198754";
  boton3.style.backgroundColor = "#198754";

  tablaA.style.display = "block";
  tablaB.style.display = "none";
  tablaC.style.display = "none";
}

function segundaDivision() {
  boton1 = document.getElementById("primeraDivision")
  boton2 = document.getElementById("segundaDivision")
  boton3 = document.getElementById("terceraDivision")
  tablaA = document.getElementById("tablaPosA")
  tablaB = document.getElementById("tablaPosB")
  tablaC = document.getElementById("tablaPosC")

  boton1.style.backgroundColor = "#198754";
  boton2.style.backgroundColor = "#0f5132";
  boton3.style.backgroundColor = "#198754";

  tablaA.style.display = "none";
  tablaB.style.display = "block";
  tablaC.style.display = "none";
}

function terceraDivision() {
  boton1 = document.getElementById("primeraDivision")
  boton2 = document.getElementById("segundaDivision")
  boton3 = document.getElementById("terceraDivision")
  tablaA = document.getElementById("tablaPosA")
  tablaB = document.getElementById("tablaPosB")
  tablaC = document.getElementById("tablaPosC")

  boton1.style.backgroundColor = "#198754";
  boton2.style.backgroundColor = "#198754";
  boton3.style.backgroundColor = "#0f5132";

  tablaA.style.display = "none";
  tablaB.style.display = "none";
  tablaC.style.display = "block";
}

function copaA() {
  boton1 = document.getElementById("copaA")
  boton2 = document.getElementById("copaB")
  boton3 = document.getElementById("copaC")
  tablaA = document.getElementById("tablaCopaA")
  tablaB = document.getElementById("tablaCopaB")
  tablaC = document.getElementById("tablaCopaC")

  boton1.style.backgroundColor = "#0f5132";
  boton2.style.backgroundColor = "#198754";
  boton3.style.backgroundColor = "#198754";

  tablaA.style.display = "block";
  tablaB.style.display = "none";
  tablaC.style.display = "none";
}

function copaB() {
  boton1 = document.getElementById("copaA")
  boton2 = document.getElementById("copaB")
  boton3 = document.getElementById("copaC")
  tablaA = document.getElementById("tablaCopaA")
  tablaB = document.getElementById("tablaCopaB")
  tablaC = document.getElementById("tablaCopaC")

  boton1.style.backgroundColor = "#198754";
  boton2.style.backgroundColor = "#0f5132";
  boton3.style.backgroundColor = "#198754";

  tablaA.style.display = "none";
  tablaB.style.display = "block";
  tablaC.style.display = "none";
}

function copaC() {
  boton1 = document.getElementById("copaA")
  boton2 = document.getElementById("copaB")
  boton3 = document.getElementById("copaC")
  tablaA = document.getElementById("tablaCopaA")
  tablaB = document.getElementById("tablaCopaB")
  tablaC = document.getElementById("tablaCopaC")

  boton1.style.backgroundColor = "#198754";
  boton2.style.backgroundColor = "#198754";
  boton3.style.backgroundColor = "#0f5132";

  tablaA.style.display = "none";
  tablaB.style.display = "none";
  tablaC.style.display = "block";
}