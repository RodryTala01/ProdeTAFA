
function mostrarFecha32avos() {
  fecha32avos = document.getElementById("fecha32avos");
  fecha1 = document.getElementById("fecha1");
  fecha16avos = document.getElementById("fecha16avos");
  fecha2 = document.getElementById("fecha2");

  fecha32avos.style.display = "block";
  fecha1.style.display = "none";
  fecha16avos.style.display = "none";
  fecha2.style.display = "none";
}

function mostrarFecha1() {
  fecha32avos = document.getElementById("fecha32avos");
  fecha1 = document.getElementById("fecha1");
  fecha16avos = document.getElementById("fecha16avos");
  fecha2 = document.getElementById("fecha2");


  fecha32avos.style.display = "none";
  fecha1.style.display = "block";
  fecha16avos.style.display = "none";
  fecha2.style.display = "none";
}


function mostrarFecha16avos() {
  fecha32avos = document.getElementById("fecha32avos");
  fecha1 = document.getElementById("fecha1");
  fecha16avos = document.getElementById("fecha16avos");
  fecha2 = document.getElementById("fecha2");


  fecha32avos.style.display = "none";
  fecha1.style.display = "none";
  fecha16avos.style.display = "block";
  fecha2.style.display = "none";
}

function mostrarFecha2() {
  fecha32avos = document.getElementById("fecha32avos");
  fecha1 = document.getElementById("fecha1");
  fecha16avos = document.getElementById("fecha16avos");
  fecha2 = document.getElementById("fecha2");


  fecha32avos.style.display = "none";
  fecha1.style.display = "none";
  fecha16avos.style.display = "none";
  fecha2.style.display = "block";
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

function temporadaLiga(divId, boton) {
    var divs = document.querySelectorAll('.col-md-8 > div');
    var botones = document.querySelectorAll('.botonTemps');
    
    for (var i = 0; i < divs.length; i++) {
      divs[i].style.display = 'none';
      botones[i+1].style.backgroundColor = "#198754";
    }

    var divToShow = document.getElementById(divId);
    if (divToShow) {
      divToShow.style.display = 'block';
      boton.style.backgroundColor = "#0f5132";
    }
  }

  function primeraDivisionT3() {
    boton1 = document.getElementById("primeraDivisionT3")
    boton2 = document.getElementById("segundaDivisionT3")
    tablaA = document.getElementById("tablaPosAT3")
    tablaB = document.getElementById("tablaPosBT3")
  
    boton1.style.backgroundColor = "#0f5132";
    boton2.style.backgroundColor = "#198754";
  
    tablaA.style.display = "block";
    tablaB.style.display = "none";
  }

  function segundaDivisionT3() {
    boton1 = document.getElementById("primeraDivisionT3")
    boton2 = document.getElementById("segundaDivisionT3")
    tablaA = document.getElementById("tablaPosAT3")
    tablaB = document.getElementById("tablaPosBT3")
  
    boton1.style.backgroundColor = "#198754";
    boton2.style.backgroundColor = "#0f5132";
  
    tablaA.style.display = "none";
    tablaB.style.display = "block";
  }

  function primeraDivisionT4() {
    boton1 = document.getElementById("primeraDivisionT4")
    boton2 = document.getElementById("segundaDivisionT4")
    tablaA = document.getElementById("tablaPosAT4")
    tablaB = document.getElementById("tablaPosBT4")
  
    boton1.style.backgroundColor = "#0f5132";
    boton2.style.backgroundColor = "#198754";
  
    tablaA.style.display = "block";
    tablaB.style.display = "none";
  }

  function segundaDivisionT4() {
    boton1 = document.getElementById("primeraDivisionT4")
    boton2 = document.getElementById("segundaDivisionT4")
    tablaA = document.getElementById("tablaPosAT4")
    tablaB = document.getElementById("tablaPosBT4")
  
    boton1.style.backgroundColor = "#198754";
    boton2.style.backgroundColor = "#0f5132";
  
    tablaA.style.display = "none";
    tablaB.style.display = "block";
  }

  function primeraDivisionT5() {
    boton1 = document.getElementById("primeraDivisionT5")
    boton2 = document.getElementById("segundaDivisionT5")
    tablaA = document.getElementById("tablaPosAT5")
    tablaB = document.getElementById("tablaPosBT5")
  
    boton1.style.backgroundColor = "#0f5132";
    boton2.style.backgroundColor = "#198754";
  
    tablaA.style.display = "block";
    tablaB.style.display = "none";
  }

  function segundaDivisionT5() {
    boton1 = document.getElementById("primeraDivisionT5")
    boton2 = document.getElementById("segundaDivisionT5")
    tablaA = document.getElementById("tablaPosAT5")
    tablaB = document.getElementById("tablaPosBT5")
  
    boton1.style.backgroundColor = "#198754";
    boton2.style.backgroundColor = "#0f5132";
  
    tablaA.style.display = "none";
    tablaB.style.display = "block";
  }