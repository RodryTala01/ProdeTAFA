const vue = new Vue({
    el: '#app',
    data: {
        listaDatos: [],
        loaded: false,
        listaGoles: []
    },
    created() {
        this.getLista();
        // this.getGoles2();
        // Ejecutar recargar() cada segundo
        setInterval(this.recargar, 50000);
    },
    methods: {
        recargar() {
            this.getLista();
            // this.getGoles2();
        },
        getLista() {
            // id de la hoja de calculo
            const idSheets = '169rYxgQwzjatwq4iFgCTPn8y83IdvRH-Guy2PmTtnRk';
            //// nuestra      APIKey
            const apiKey = 'AIzaSyDS9VtkbPnvgTil44LtEiQ--DLIp5-GE2g';
            // rango de la hoja de calculo que queremos leer
            const values = 'A2:AF13';
            // fetch es un método nativo para hacer peticiones http
            // en el navegador 
            fetch("https://content-sheets.googleapis.com/v4/spreadsheets/" + idSheets + "/values/"+ values +"?access_token=" + apiKey + "&key=" + apiKey)
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
        }, // fin funcion getLista(

        addFechaRows() {

            this.listaDatos.splice(0, 0, { fecha: 'Jueves 21 de Marzo', colspan: 5 });

            this.listaDatos.splice(4, 0, { fecha: 'Viernes 22 de Marzo', colspan: 5 });

            this.listaDatos.splice(9, 0, { fecha: 'Sábado 23 de Marzo', colspan: 5 });

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


