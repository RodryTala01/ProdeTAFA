const vue = new Vue({
    el: '#app',
    data: {
        listaDatos: [],
        loaded: false
    },
    created() {
        this.getLista();
        // Ejecutar recargar() cada segundo
        setInterval(this.recargar, 50000);
    },
    methods: {
        recargar() {
            this.getLista();
        },
        getLista() {
            // id de la hoja de calculo
            const idSheets = '169rYxgQwzjatwq4iFgCTPn8y83IdvRH-Guy2PmTtnRk';
            //// nuestra      APIKey
            const apiKey = 'AIzaSyDS9VtkbPnvgTil44LtEiQ--DLIp5-GE2g';
            // rango de la hoja de calculo que queremos leer
            const values = 'A2:AE12';
            // fetch es un método nativo para hacer peticiones http
            // en el navegador 
            fetch("https://content-sheets.googleapis.com/v4/spreadsheets/" + idSheets + "/values/A2:AZ100?access_token=" + apiKey + "&key=" + apiKey)
                .then((lista) => {
                    return lista.json()
                }).then((valores) => {
                    this.listaDatos = valores.values;
                    // Agregar las filas de fecha entre las secciones de datos
                    this.addFechaRows();
                    // Establecer loaded como true una vez que los datos estén cargados
                    ocultarPelotaYTextoDeCarga()
                }).catch(err => {
                    console.log(err);
                })
        }, // fin funcion getLista()

        addFechaRows() {

            this.listaDatos.splice(0, 0, { fecha: 'Martes 27 de Febrero', colspan: 5 });

            this.listaDatos.splice(2, 0, { fecha: 'Miércoles 28 de Febrero', colspan: 5 });

            this.listaDatos.splice(5, 0, { fecha: 'Jueves 29 de Febrero', colspan: 5 });

            this.listaDatos.splice(10, 0, { fecha: 'Viernes 01 de Marzo', colspan: 5 });

            this.listaDatos.splice(13, 0, { fecha: 'Sábado 02 de Marzo', colspan: 5 });
        }
    } // fin methods
});

function ocultarPelotaYTextoDeCarga() {
    var containerPelota = document.getElementById("containerPelota");
    var textoCargando = document.getElementById("textoCargando");

    if (containerPelota && textoCargando) {
        containerPelota.style.display = "none";
        textoCargando.style.display = "none";
    }

    document.getElementById("app").style.display = "block";
}


